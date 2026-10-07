/* Etapa: truques da classe (ver ../README.md e ../spell-helpers.js). */
import { useState } from 'react';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import { StepIntro, Term, Callout, ChoiceCard, Counter, L } from '../ui.jsx';
import { schoolIcon, SCHOOL_EMOJI } from '../../art.js';
import ArtThumb from '../../components/ArtThumb.jsx';
import {
  spellPlan, hasClassCantrips, cantripIssues, availableCantrips, chosenCantrips, beginnerCantrips,
  grantedSpells, invalidChoices, withoutInvalid, toggleCantrip, fillRecommended, isCoreSpell, duplicateGrantIssues,
} from '../spell-helpers.js';

/** Título da magia com o emblema da escola (ícone ilustrado quando houver). */
export function SpellTitle({ sp, lang, prefix = '' }) {
  return (
    <span className="spell-title-art">
      <ArtThumb src={schoolIcon(sp.school)} emoji={SCHOOL_EMOJI[sp.school] || '✦'} size={26} round lang={lang}
        title={tName('school', sp.school, lang)} />
      <span>{prefix}{tName('spellName', sp.id, lang)}</span>
    </span>
  );
}

const ABILITY_NAMES = { int: ['Inteligência', 'Intelligence'], wis: ['Sabedoria', 'Wisdom'], cha: ['Carisma', 'Charisma'] };
export const abilityName = (ab, lang) => (ABILITY_NAMES[ab] ? ABILITY_NAMES[ab][lang === 'pt' ? 0 : 1] : '—');

// O label global do app (maiúsculas espaçadas, bloco) e o input (100% de largura,
// 44px) deixavam o filtro como um quadrado enorme: estilo próprio aqui.
const FILTER_LABEL = {
  display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer',
  fontFamily: 'var(--body)', fontSize: '0.9rem', letterSpacing: 'normal', textTransform: 'none', color: 'var(--ink-secondary)',
};
const FILTER_BOX = { width: 18, height: 18, minHeight: 0, padding: 0, margin: 0, flex: '0 0 auto' };

/** Lista de magias escolhíveis com busca, filtro "bons para começar" e cartões. Magias de suplementos ficam recolhidas. */
export function SpellPicker({ char, lang, spells, selected, onToggle, full, suggested, extra }) {
  const [query, setQuery] = useState('');
  const [onlySuggested, setOnlySuggested] = useState(false);
  const q = query.trim().toLowerCase();
  const visible = spells
    .filter(sp => !onlySuggested || suggested.has(sp.id) || selected.has(sp.id))
    .filter(sp => !q || `${tName('spellName', sp.id, 'pt')} ${tName('spellName', sp.id, 'en')}`.toLowerCase().includes(q))
    // Sugeridas primeiro, depois em ordem alfabética.
    .sort((a, b) => (suggested.has(b.id) - suggested.has(a.id)) || tName('spellName', a.id, lang).localeCompare(tName('spellName', b.id, lang)));
  const core = visible.filter(sp => isCoreSpell(sp, char));
  const other = visible.filter(sp => !isCoreSpell(sp, char));

  const card = (sp) => {
    const on = selected.has(sp.id);
    const meta = Utils.spellMeta(sp, lang);
    const isCore = isCoreSpell(sp, char);
    return (
      <ChoiceCard key={sp.id} selected={on} disabled={!on && full} onClick={() => onToggle(sp.id)}
        title={<SpellTitle sp={sp} lang={lang} />}
        badge={suggested.has(sp.id) ? L(lang, 'Bom para começar', 'Good to start') : (!isCore && sp.source ? sp.source : null)}
        subtitle={[tName('school', sp.school, lang), meta.castingTime, meta.range,
          sp.concentration ? L(lang, 'Concentração', 'Concentration') : null, sp.ritual ? 'Ritual' : null].filter(Boolean).join(' · ')}>
        <div className={`text-sm ${on ? '' : 'spell-desc-clamp'}`} style={{ color: 'var(--ink-secondary)', marginTop: 6, textAlign: 'left' }}>
          {sp.desc?.[lang] || sp.desc?.pt}
        </div>
        {extra ? extra(sp, on) : null}
      </ChoiceCard>
    );
  };
  const groups = (list) => {
    const levels = [...new Set(list.map(sp => sp.level))].sort((a, b) => a - b);
    return levels.map(lvl => (
      <div key={lvl}>
        {levels.length > 1 && <h4 className="cr-spell-level">{lvl === 0 ? t('cantrips', lang) : L(lang, `${lvl}º círculo`, `Level ${lvl}`)}</h4>}
        <div className="options-list cols-2">{list.filter(sp => sp.level === lvl).map(card)}</div>
      </div>
    ));
  };

  return (
    <>
      <div className="cr-spell-toolbar">
        <input type="search" aria-label={L(lang, 'Buscar magia', 'Search spell')} placeholder={L(lang, 'Buscar pelo nome…', 'Search by name…')}
          value={query} onChange={e => setQuery(e.target.value)} />
        {suggested.size > 0 && (
          <label className="cr-spell-filter" style={FILTER_LABEL}>
            <input type="checkbox" style={FILTER_BOX} checked={onlySuggested} onChange={e => setOnlySuggested(e.target.checked)} />
            <span>{L(lang, 'Mostrar só as boas para começar', 'Only show beginner-friendly')}</span>
          </label>
        )}
      </div>
      {groups(core)}
      {other.length > 0 && (
        // Aberto quando já há escolha de outro livro ou a busca só achou magias de lá.
        <details style={{ marginTop: 16 }} open={other.some(sp => selected.has(sp.id)) || (!!q && !core.length)}>
          <summary>{L(lang, `Outros livros (${other.length}) — confirme com o mestre`, `Other books (${other.length}) — check with your DM`)}</summary>
          <p className="muted text-sm" style={{ margin: '8px 0' }}>
            {L(lang, 'Estas magias não estão no livro básico. Use só se o mestre aceitar.', 'These spells are not in the core book. Use them only if your DM agrees.')}
          </p>
          {groups(other)}
        </details>
      )}
      {!visible.length && <div className="muted text-sm" style={{ padding: 12 }}>{L(lang, 'Nenhuma magia encontrada.', 'No spells found.')}</div>}
    </>
  );
}

/** Aviso: o mesmo truque/magia vem de duas origens (classe, talento, espécie) — trave e diga onde trocar. */
export function DuplicateCallout({ char, lang, cantrips }) {
  const issues = duplicateGrantIssues(char, cantrips ? 'cantrip' : 'spell');
  if (!issues.length) return null;
  return (
    <Callout kind="warn">
      <b>{L(lang, 'Escolha repetida:', 'Repeated pick:')}</b>
      <ul className="cr-spell-granted">{issues.map((i, k) => <li key={k}>{i[lang] || i.pt}</li>)}</ul>
      <span className="muted text-sm">{L(lang, 'Use "Voltar" para ir até essa etapa.', 'Use "Back" to go to that step.')}</span>
    </Callout>
  );
}

/** "Você também já tem…": magias de talento, espécie e recursos da classe (não ocupam vaga). */
export function GrantedCallout({ char, lang, cantrips }) {
  const granted = grantedSpells(char).filter(g => (g.level === 0) === cantrips);
  if (!granted.length) return null;
  return (
    <Callout kind="ok">
      <b>{cantrips ? L(lang, 'Truques que você já tem de graça', 'Cantrips you already get for free') : L(lang, 'Magias que você já tem de graça', 'Spells you already get for free')}</b>
      {' — '}{L(lang, 'não contam no limite e não aparecem na lista abaixo:', "they don't count toward the limit and aren't in the list below:")}
      <ul className="cr-spell-granted">
        {granted.map(g => (
          <li key={g.id}>
            {tName('spellName', g.id, lang)} <span className="muted">— {L(lang, 'já vem de', 'comes from')} {g.from?.[lang] || g.from?.pt}</span>
            {g.source !== 'class' && g.level > 0 && (
              <span className="muted"> · {L(lang, '1× por descanso longo sem gastar espaço', 'once per long rest without a slot')}</span>
            )}
          </li>
        ))}
      </ul>
    </Callout>
  );
}

/** Aviso com as escolhas inválidas e um botão para tirá-las. */
export function InvalidCallout({ char, set, lang, kind }) {
  const bad = invalidChoices(char, kind);
  if (!bad.length) return null;
  const why = (x) => {
    if (x.reason === 'list') return L(lang, `não é da lista de magias da classe ${tName('class', char.className, 'pt')}`, `not on the ${tName('class', char.className, 'en')} list`);
    if (x.reason === 'level') return L(lang, `${x.level}º círculo, alto demais por enquanto`, `level ${x.level}, too high for now`);
    if (x.reason === 'granted') return L(lang, `você já ganha de ${x.from?.pt}`, `you already get it from ${x.from?.en}`);
    return L(lang, 'não existe nesta regra', "doesn't exist in these rules");
  };
  return (
    <Callout kind="warn">
      <b>{L(lang, 'Estas escolhas não valem para o seu personagem:', "These picks don't work for your character:")}</b>
      <ul className="cr-spell-granted">
        {bad.map(x => <li key={x.id}>{tName('spellName', x.id, lang)} <span className="muted">— {why(x)}</span></li>)}
      </ul>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ spells: withoutInvalid(char, kind) })}>
        {L(lang, 'Tirar da seleção', 'Remove them')}
      </button>
    </Callout>
  );
}

function CantripsStep({ char, set, lang }) {
  const plan = spellPlan(char);
  const cls = tName('class', char.className, lang);
  const bad = new Set(invalidChoices(char, 'cantrip').map(x => x.id));
  const chosen = chosenCantrips(char);
  const n = chosen.filter(id => !bad.has(id)).length;
  const toggle = (id) => { const next = toggleCantrip(char, id); if (next) set({ spells: next }); };

  return (
    <div>
      <StepIntro title={L(lang, 'Truques', 'Cantrips')}>
        {lang === 'pt' ? (
          <>
            <p><Term id="cantrip" lang={lang}>Truques</Term> são magias pequenas que você pode usar quantas vezes quiser, sem gastar nada — como criar luz ou lançar uma faísca de fogo.</p>
            <p>Como {cls}, você escolhe <b>{plan.cantrips}</b> da <Term id="spellList" lang={lang}>lista de magias</Term> da sua classe. Dica: pegue pelo menos um que cause dano, para ter sempre um ataque mágico.</p>
          </>
        ) : (
          <>
            <p><Term id="cantrip" lang={lang}>Cantrips</Term> are small spells you can cast as often as you like, at no cost — like making light or hurling a spark of fire.</p>
            <p>As a {cls}, you pick <b>{plan.cantrips}</b> from your class's <Term id="spellList" lang={lang}>spell list</Term>. Tip: take at least one that deals damage, so you always have a magic attack.</p>
          </>
        )}
      </StepIntro>

      <GrantedCallout char={char} lang={lang} cantrips />
      <DuplicateCallout char={char} lang={lang} cantrips />
      <InvalidCallout char={char} set={set} lang={lang} kind="cantrip" />

      <div className="cr-spell-head">
        <span>{L(lang, 'Truques escolhidos', 'Cantrips chosen')} <Counter n={n} of={plan.cantrips} /></span>
        <button type="button" className="btn btn-sm btn-ghost" disabled={n >= plan.cantrips}
          onClick={() => set({ spells: fillRecommended(char, 'cantrip') })}>
          {L(lang, 'Escolher por mim', 'Pick for me')}
        </button>
      </div>

      <SpellPicker char={char} lang={lang} spells={availableCantrips(char)} selected={new Set(chosen)}
        onToggle={toggle} full={n >= plan.cantrips} suggested={new Set(beginnerCantrips(char))} />
    </div>
  );
}

export default {
  id: 'cantrips',
  title: { pt: 'Truques', en: 'Cantrips' },
  // Só para quem tem truques de classe no nível atual (Paladino/Patrulheiro não têm).
  applies: (char) => hasClassCantrips(char),
  issues: (char) => cantripIssues(char),
  Comp: CantripsStep,
};
