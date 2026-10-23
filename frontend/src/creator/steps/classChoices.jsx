/* Etapa Escolhas da classe (nível 1): Maestria, Estilo de Luta, Ordem, Invocação… (ver ../README.md). */
import { useRef, useState } from 'react';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, Counter, L } from '../ui.jsx';
import { optionArt, classArt } from '../../art.js';
import {
  choiceGroups, groupOptions, toggleGroupPick, setGroupPicks, setPickDetail, recommendedIds, isAutoGroup,
  POOL_INTRO, classChoiceIssues, hasClassChoices, masteryPack,
} from '../class-helpers.js';
import { findOption, optionPool } from '../../progression/options.js';
import { SHARED } from '../../../data/class-options/shared.js';
import { toolName } from '../start-data.js';
import { DecisionPanel, useDecision, useConsidering } from '../journey-ui.jsx';
import { optionTale, classOptionLines } from '../chronicle.js';

const k = (lang) => (lang === 'pt' ? 'pt' : 'en');

/** Tela estreita (celular): o painel da escolha fica longe do cartão tocado. */
const isNarrow = () => {
  try { return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 720px)').matches; } catch { return false; }
};

// ---------------------------------------------------------------------------
// O peso da escolha nos grupos de vaga única (Estilo de Luta, Ordem, Invocação…)
// ---------------------------------------------------------------------------
const ARMOR_WORD = { light: { pt: 'leve', en: 'light' }, medium: { pt: 'média', en: 'medium' }, heavy: { pt: 'pesada', en: 'heavy' } };
const WEAPON_WORD = { simple: { pt: 'simples', en: 'Simple' }, martial: { pt: 'marciais', en: 'Martial' } };
const andJoin = (a, lang) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} ${lang === 'pt' ? 'e' : 'and'} ${a[a.length - 1]}` : a[0] || '');

/** Primeira frase curta da descrição de uma opção. */
function shortDesc(o, lang) {
  const d = String(o?.desc?.[k(lang)] || '').trim();
  const first = d.split(/(?<=[.!?])\s/)[0] || d;
  if (first.length <= 80) return first;
  const cut = first.slice(0, 78);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 50)).replace(/[\s,;:.]+$/, '')}…`;
}

/** O que a opção concede, em linhas simples ({pt,en}). */
function optionGains(char, o) {
  const g = o?.grants || {}, out = [];
  const armor = (g.armor || []).map(a => String(a).toLowerCase());
  const kinds = armor.filter(a => ARMOR_WORD[a]);
  if (kinds.length) out.push({ pt: `Treino em armadura ${andJoin(kinds.map(a => ARMOR_WORD[a].pt), 'pt')}`, en: `${andJoin(kinds.map(a => ARMOR_WORD[a].en), 'en')} armor training`.replace(/^./, c => c.toUpperCase()) });
  if (armor.includes('shield') || armor.includes('shields')) out.push({ pt: 'Treino com escudo', en: 'Shield training' });
  const weapons = (g.weapons || []).map(w => String(w).toLowerCase()).filter(w => WEAPON_WORD[w]);
  if (weapons.length) out.push({ pt: `Armas ${andJoin(weapons.map(w => WEAPON_WORD[w].pt), 'pt')}`, en: `${andJoin(weapons.map(w => WEAPON_WORD[w].en), 'en')} weapons` });
  for (const id of [...(g.cantrips || []), ...(g.spells || [])]) out.push({ pt: `Magia: ${tName('spellName', id, 'pt')}`, en: `Spell: ${tName('spellName', id, 'en')}` });
  for (const id of g.skills || []) out.push({ pt: `Perícia: ${tName('skill', id, 'pt')}`, en: `Skill: ${tName('skill', id, 'en')}` });
  for (const id of g.tools || []) out.push({ pt: `Treino: ${toolName(id, 'pt')}`, en: `Training: ${toolName(id, 'en')}` });
  for (const [pool, n] of Object.entries(o?.choices || {})) {
    const name = optionPool(char.className, pool)?.name;
    if (name && n) out.push({ pt: `+${n} em "${name.pt}", escolhido nesta etapa`, en: `+${n} in "${name.en}", picked in this step` });
  }
  return out;
}

/** Painel de uma opção de vaga única: o que ela dá e as outras de que você abre mão. */
function optionInfo(char, group, all, rec, id) {
  const o = all.find(x => x.id === id);
  if (!o) return null;
  const sealed = group.picks[0]?.id || null;
  // Outras opções (2–3): a selada primeiro, depois as recomendadas e as demais elegíveis.
  const others = [];
  const add = (x) => { if (x && x.id !== id && !others.includes(x) && others.length < 3) others.push(x); };
  add(all.find(x => x.id === sealed));
  all.filter(x => rec.has(x.id)).forEach(add);
  all.filter(x => x.eligible).forEach(add);
  // Linha da crônica: a frase da opção, ou a frase nova que o grupo ganharia com ela.
  let tale = { pt: optionTale(id, 'pt'), en: optionTale(id, 'en') };
  if (!tale.pt) {
    try {
      const base = { ...char, ...setGroupPicks(char, group, []) };
      const view = { ...char, ...setGroupPicks(char, group, [id]) };
      const line = (lang) => { const before = classOptionLines(base, lang); return classOptionLines(view, lang).find(x => !before.includes(x)) || ''; };
      tale = { pt: line('pt'), en: line('en') };
    } catch { /* sem frase */ }
  }
  return {
    art: optionArt(id) || classArt(char.className), kicker: group.name, name: o.name, pitch: o.desc || null,
    gains: optionGains(char, o),
    losesTitle: { pt: 'Do que você abre mão', en: 'What you give up' },
    loses: others.map(x => ({ pt: `${x.name.pt}${shortDesc(x, 'pt') ? ` — ${shortDesc(x, 'pt')}` : ''}`, en: `${x.name.en}${shortDesc(x, 'en') ? ` — ${shortDesc(x, 'en')}` : ''}` })),
    tale: tale.pt ? tale : null,
  };
}

/** Termo do glossário para o nome do grupo, quando houver. */
const POOL_TERM = { weaponMastery: 'weaponMastery', fightingStyle: 'fightingStyle', invocation: 'invocation', expertise: 'expertise', tool: 'tool', musicalInstrument: 'tool', artisanTool: 'tool' };

function Group({ char, set, lang, group }) {
  const [query, setQuery] = useState('');
  const pool = group.pools[0];
  const auto = isAutoGroup(char, group);
  const rec = new Set(recommendedIds(char, group));
  const all = groupOptions(char, group);
  const q = query.trim().toLowerCase();
  const shown = all
    .filter(o => !q || o.name.pt.toLowerCase().includes(q) || o.name.en.toLowerCase().includes(q))
    .sort((a, b) => (Number(rec.has(b.id)) - Number(rec.has(a.id))) || (Number(b.eligible) - Number(a.eligible)));
  const full = group.picks.length >= group.total;
  const term = POOL_TERM[pool];
  const [showAll, setShowAll] = useState(false);
  // Maestria: lista longa (dezenas de armas). Mostra as recomendadas e as escolhidas; o resto em "Ver todas".
  const isMastery = pool === 'weaponMastery';
  const collapsible = isMastery && rec.size > 0 && all.length > 12;
  const visible = collapsible && !showAll && !q ? shown.filter(o => rec.has(o.id) || o.chosen) : shown;
  const packId = isMastery ? masteryPack(char)?.id : null;
  const masteryName = (o) => SHARED.masteryProperties?.[o.mastery]?.name?.[k(lang)];
  // "Simples corpo a corpo, 1d6" (fim da descrição da opção).
  const weaponKind = (o) => String(o.desc?.[k(lang)] || '').split(lang === 'pt' ? ' Arma: ' : ' Weapon: ')[1]?.replace(/\.$/, '') || '';
  const detailPicks = group.picks
    .map(p => ({ p, o: !optionPool(char.className, p.pool)?.kind ? findOption(char.className, p.pool, p.id) : null }))
    .filter(x => x.o?.detail);

  // Vaga única (Estilo de Luta, Ordem, Invocação…): escolha grande, com prévia e selo.
  // Várias vagas (maestrias, instrumentos…) e listas de magias/perícias/idiomas
  // (ex.: Truque do Taumaturgo, igual à etapa Truques): toque imediato, com um brilho rápido.
  const single = group.total === 1 && !optionPool(char.className, pool)?.kind;
  const decisionKey = `opt:${group.key}`;
  const { propose, cancel } = useDecision();
  const considering = useConsidering(decisionKey);
  const sealedId = single ? group.picks[0]?.id || null : null;
  const panelRef = useRef(null);
  const [glint, setGlint] = useState(null);
  const pick = (o) => {
    if (!single) {
      set(toggleGroupPick(char, group, o.id));
      setGlint(o.chosen ? null : o.id);
      return;
    }
    if (o.id === sealedId) {
      // Tocar a já selada: com outra em análise, volta para ela; sem nada em análise, desmarca (como antes).
      if (considering) cancel();
      else set(toggleGroupPick(char, group, o.id));
      return;
    }
    const sealed = all.find(x => x.id === sealedId);
    propose({
      key: decisionKey, id: o.id, current: sealedId, currentName: sealed ? sealed.name : null,
      // O mesmo toggleGroupPick do clique, com o grupo recalculado na hora de selar.
      patch: (c) => toggleGroupPick(c, choiceGroups(c).find(g => g.key === group.key) || group, o.id),
    });
    setTimeout(() => {
      try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: isNarrow() ? 'start' : 'nearest' }); } catch { /* sem rolagem */ }
    }, 60);
  };
  const shownId = single ? considering || sealedId : null;

  return (
    <section className="cr-choice-group">
      <div className="cr-choice-head">
        <h3>{term ? <Term id={term} lang={lang}>{group.name[k(lang)]}</Term> : group.name[k(lang)]}</h3>
        <Counter n={group.picks.length} of={group.total} />
      </div>
      {POOL_INTRO[pool] && <p className="cr-intro-text">{POOL_INTRO[pool][k(lang)]}</p>}
      {auto ? (
        <Callout kind="ok">
          {L(lang, 'Escolhido automaticamente: ', 'Picked automatically: ')}
          {group.picks.map(p => all.find(o => o.id === p.id)?.name[k(lang)] || p.id).join(', ') || '—'}
        </Callout>
      ) : (
        <>
          {rec.size > 0 && isMastery && (
            <Callout kind="info">
              {L(lang,
                `"Recomendado" = armas que vêm no pacote de equipamento ${packId ? `"Opção ${packId}" ` : ''}da sua classe (você escolhe o pacote na etapa Equipamento). Se escolher outro pacote, volte aqui e troque. Fora da criação, você pode trocar uma maestria depois de cada Descanso Longo.`,
                `"Recommended" = weapons in your class's ${packId ? `"Option ${packId}" ` : ''}equipment pack (you pick the pack in the Equipment step). If you pick another pack, come back and swap. After creation, you can swap one mastery after each Long Rest.`)}
            </Callout>
          )}
          {all.length > 12 && (
            <input className="cr-choice-search" placeholder={L(lang, 'Buscar…', 'Search…')} value={query} onChange={e => setQuery(e.target.value)} />
          )}
          <ChoiceGrid>
            {visible.map(o => {
              const blocked = !o.chosen && (!o.eligible || (full && group.total > 1));
              const why = !o.eligible && o.issues?.length ? o.issues.map(x => x[k(lang)]).join(' · ') : (o.prereq?.text ? `${L(lang, 'Requisito', 'Prerequisite')}: ${o.prereq.text[k(lang)]}` : '');
              return (
                <ChoiceCard key={o.id} selected={o.chosen} disabled={blocked}
                  considering={single && considering === o.id}
                  className={!single && glint === o.id && o.chosen ? 'cr-glint' : ''}
                  onClick={() => pick(o)}
                  title={o.name[k(lang)]}
                  thumb={optionArt(o.id)}
                  badge={rec.has(o.id) ? L(lang, 'Recomendado', 'Recommended') : (o.meta || null)}
                  subtitle={isMastery && masteryName(o)
                    ? `${L(lang, 'Maestria', 'Mastery')}: ${masteryName(o)}${weaponKind(o) ? ` · ${weaponKind(o)}` : ''}`
                    : (o.desc?.[k(lang)] || null)}
                  details={isMastery ? o.desc?.[k(lang)] : null}>
                  {why && <div className="text-xs muted" style={{ marginTop: 4 }}>{why}</div>}
                </ChoiceCard>
              );
            })}
          </ChoiceGrid>
          {shownId && (
            <div ref={panelRef} style={{ scrollMarginTop: 140 }}>
              <DecisionPanel char={char} lang={lang} decisionKey={decisionKey} sealedId={sealedId} info={optionInfo(char, group, all, rec, shownId)} />
            </div>
          )}
          {collapsible && !q && (
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowAll(v => !v)}>
              {showAll
                ? L(lang, 'Mostrar só as recomendadas', 'Show only recommended')
                : L(lang, `Ver todas as armas (${all.length})`, `See all weapons (${all.length})`)}
            </button>
          )}
          {detailPicks.map(({ p, o }) => (
            <label key={p.pool + p.id} className="cr-choice-detail">
              <span>{o.name[k(lang)]}: {o.detail[k(lang)]}</span>
              <input value={p.detail || ''} maxLength={120} onChange={e => set(setPickDetail(char, p.pool, p.id, e.target.value))} />
            </label>
          ))}
        </>
      )}
    </section>
  );
}

function ClassChoicesStep({ char, set, lang }) {
  const groups = choiceGroups(char).filter(g => !g.step);
  const later = choiceGroups(char).filter(g => g.step);
  return (
    <div>
      <StepIntro title={L(lang, `Escolhas de ${tName('class', char.className, 'pt')}`, `${tName('class', char.className, 'en')} choices`)}>
        {L(lang,
          'Sua classe pede algumas escolhas já no nível 1. Elas mudam o que você faz em combate. Na dúvida, fique com as marcadas como "Recomendado".',
          'Your class asks for a few choices right at level 1. They change what you do in combat. If unsure, go with the ones marked "Recommended".')}
      </StepIntro>
      {groups.map(g => <Group key={g.key} char={char} set={set} lang={lang} group={g} />)}
      {later.length > 0 && (
        <Callout kind="info">
          {later.map(g => (g.step === 'skills'
            ? L(lang, `"${g.name.pt}" fica para a etapa Antecedente, quando você já souber todas as suas perícias.`, `"${g.name.en}" comes in the Background step, once you know all your skills.`)
            : L(lang, `"${g.name.pt}" fica para a etapa de idiomas.`, `"${g.name.en}" is picked in the languages step.`))).join(' ')}
        </Callout>
      )}
    </div>
  );
}

export default {
  id: 'classChoices',
  title: { pt: 'Escolhas da classe', en: 'Class choices' },
  applies: (char) => !!char.className && hasClassChoices(char),
  issues: classChoiceIssues,
  Comp: ClassChoicesStep,
};
