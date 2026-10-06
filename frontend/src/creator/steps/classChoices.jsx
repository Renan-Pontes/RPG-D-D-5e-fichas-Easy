/* Etapa Escolhas da classe (nível 1): Maestria, Estilo de Luta, Ordem, Invocação… (ver ../README.md). */
import { useState } from 'react';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, Counter, L } from '../ui.jsx';
import { optionArt } from '../../art.js';
import {
  choiceGroups, groupOptions, toggleGroupPick, setPickDetail, recommendedIds, isAutoGroup,
  POOL_INTRO, classChoiceIssues, hasClassChoices, masteryPack,
} from '../class-helpers.js';
import { findOption, optionPool } from '../../progression/options.js';
import { SHARED } from '../../../data/class-options/shared.js';

const k = (lang) => (lang === 'pt' ? 'pt' : 'en');

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
                  onClick={() => set(toggleGroupPick(char, group, o.id))}
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
