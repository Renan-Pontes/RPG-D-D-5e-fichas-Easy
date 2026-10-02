/* Etapa "Bônus de atributo": 2024 = +2/+1 ou +1/+1/+1 do antecedente; 2014 = bônus da raça (fixos + escolhas flexíveis).
 * Grava em char.raceBonus (nome antigo do campo; em 2024 é o bônus do ANTECEDENTE). Lógica em ../ability-helpers.js. */
import { useEffect } from 'react';
import Utils from '../../../utils.js';
import { hpExplain, initiativeExplain } from '../creation.js';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, Callout, ChoiceGrid, ChoiceCard, Counter, L } from '../ui.jsx';
import {
  ABILITIES, ABILITY_NAMES, SCORE_CAP, bonusMode, bonusChoice, baseBonus, expectedRaceBonus, bonusPatch,
  syncRaceBonusPatch, raceBonusInSync, recommendedBonus, abilityBonusIssues, quickSummary, classAbilityRank,
} from '../ability-helpers.js';

const fmt = Utils.fmtMod;
const names = (keys, lang) => keys.map(k => ABILITY_NAMES[k][lang]).join(', ');

function PickButton({ on, disabled, onClick, children, label }) {
  return (
    <button type="button" className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`} disabled={disabled}
      aria-pressed={on} aria-label={label} onClick={onClick} style={{ minWidth: 44 }}>
      {children}
    </button>
  );
}

/** Tabela dos 6 atributos com valor-base, bônus e final; `controls(k)` desenha os botões de escolha. */
function AbilityTable({ char, lang, total, controls }) {
  return ABILITIES.map(k => {
    const base = (char.abilities || {})[k] || 0;
    const bonus = total[k] || 0;
    const final = base + bonus;
    return (
      <div key={k} className="stat-row">
        <div className="stat-name">
          {ABILITY_NAMES[k][lang]}
          <small>
            {L(lang, 'Base', 'Base')} {base}{bonus ? ` + ${bonus}` : ''}
            {final > SCORE_CAP && <strong style={{ color: 'var(--blood-bright)' }}> · {L(lang, 'máximo 20', 'max 20')}</strong>}
          </small>
        </div>
        <div className="stat-controls">{controls ? controls(k) : null}</div>
        <div className="stat-final">
          <div className="stat-final-num">{final}</div>
          <div className="stat-final-mod">{fmt(Utils.mod(final))}</div>
        </div>
      </div>
    );
  });
}

function Summary({ char, lang }) {
  const s = quickSummary(char);
  return (
    <div className="card" style={{ padding: 12, marginTop: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{L(lang, 'Como seu herói fica', 'How your hero turns out')}</div>
      <div className="cr-ab-summary">
        <div>
          <div className="cr-ab-summary-num mono">{s.hp ?? '—'}</div>
          <div className="text-xs"><Term id="hitPoints" lang={lang}>{L(lang, 'PV no nível 1', 'HP at level 1')}</Term></div>
        </div>
        <div>
          <div className="cr-ab-summary-num mono">{s.ac}</div>
          <div className="text-xs"><Term id="armorClass" lang={lang}>{L(lang, 'CA sem armadura', 'AC without armor')}</Term></div>
        </div>
        <div>
          <div className="cr-ab-summary-num mono">{fmt(s.initiative)}</div>
          <div className="text-xs"><Term id="initiative" lang={lang}>{L(lang, 'Iniciativa', 'Initiative')}</Term></div>
        </div>
      </div>
      <div className="text-xs muted" style={{ marginTop: 8 }}>
        {L(lang, 'PV', 'HP')}: {hpExplain(char, lang)}. {L(lang, 'Iniciativa', 'Initiative')}: {initiativeExplain(char, lang)}.{' '}
        {L(lang, 'A armadura (escolhida no equipamento) pode subir a CA.', 'Armor (picked in equipment) can raise AC.')}
      </div>
    </div>
  );
}

function ChooseBonus({ char, set, lang, mode }) {
  const { pattern, picks } = bonusChoice(char, mode);
  const base = baseBonus(char);
  const rec = recommendedBonus(char, mode);
  const save = (next) => set(bonusPatch(char, next));
  const fits = (k, n) => ((char.abilities || {})[k] || 0) + (base[k] || 0) + n <= SCORE_CAP;
  const recText = rec && Object.entries(rec.picks).sort((a, c) => c[1] - a[1]).map(([k, v]) => `+${v} ${ABILITY_NAMES[k][lang]}`).join(', ');
  const top = classAbilityRank(char.className)[0];
  const same = (a, c) => ABILITIES.every(k => (a[k] || 0) === (c[k] || 0));
  const recSame = rec && same(rec.picks, picks) && rec.pattern === pattern;

  const setPattern = (p) => {
    if (p === pattern) return;
    // "+1, +1 e +1" com exatamente 3 opções: já marca as três.
    const auto = p === '1-1-1' && mode.from.length === 3 ? Object.fromEntries(mode.from.map(k => [k, 1])) : {};
    save({ pattern: p, picks: auto });
  };
  const pick2 = (k) => {
    const next = Object.fromEntries(Object.entries(picks).filter(([a, v]) => v !== 2 && a !== k));
    next[k] = 2;
    save({ pattern, picks: next });
  };
  const pick1 = (k) => {
    const next = Object.fromEntries(Object.entries(picks).filter(([a, v]) => v !== 1 && a !== k));
    next[k] = 1;
    save({ pattern, picks: next });
  };
  const max = mode.kind === 'other' ? mode.count : 3;
  const toggle1 = (k) => {
    const next = { ...picks };
    if (next[k]) delete next[k];
    else { if (Object.keys(next).length >= max) return; next[k] = 1; }
    save({ pattern, picks: next });
  };

  const controls = (k) => {
    if (!mode.from.includes(k)) return null;
    const name = ABILITY_NAMES[k][lang];
    if (mode.kind === 'other' || pattern === '1-1-1') {
      const on = picks[k] === 1;
      const full = Object.keys(picks).length >= max;
      return <PickButton on={on} disabled={!on && (full || !fits(k, 1))} onClick={() => toggle1(k)} label={`+1 ${name}`}>+1</PickButton>;
    }
    if (pattern === '2-1') {
      return (
        <>
          <PickButton on={picks[k] === 2} disabled={!fits(k, 2)} onClick={() => pick2(k)} label={`+2 ${name}`}>+2</PickButton>
          <PickButton on={picks[k] === 1} disabled={!fits(k, 1)} onClick={() => pick1(k)} label={`+1 ${name}`}>+1</PickButton>
        </>
      );
    }
    return null;
  };

  const used = Object.values(picks).reduce((s, v) => s + v, 0);
  const need = mode.kind === 'other' ? mode.count : 3;

  return (
    <>
      {mode.kind !== 'other' && (
        <ChoiceGrid>
          <ChoiceCard selected={pattern === '2-1'} onClick={() => setPattern('2-1')} title={L(lang, '+2 e +1', '+2 and +1')}
            badge={L(lang, 'Recomendado', 'Recommended')}
            subtitle={L(lang, 'Um atributo sobe 2 e outro sobe 1. Bom para reforçar o principal da sua classe.',
              'One ability goes up by 2 and another by 1. Good for boosting your class\'s main ability.')} />
          <ChoiceCard selected={pattern === '1-1-1'} onClick={() => setPattern('1-1-1')} title={L(lang, '+1, +1 e +1', '+1, +1 and +1')}
            subtitle={mode.from.length === 3
              ? L(lang, 'Os três atributos sobem 1. Mais equilibrado.', 'All three abilities go up by 1. More balanced.')
              : L(lang, 'Três atributos diferentes sobem 1. Mais equilibrado.', 'Three different abilities go up by 1. More balanced.')} />
        </ChoiceGrid>
      )}

      {rec && char.className && (
        <Callout kind={recSame ? 'ok' : 'info'}>
          {L(lang, `Recomendado para ${tName('class', char.className, lang)}: ${recText}.`, `Recommended for ${tName('class', char.className, lang)}: ${recText}.`)}
          {mode.from.includes(top)
            ? L(lang, ` ${ABILITY_NAMES[top].pt} é o atributo mais importante da sua classe.`, ` ${ABILITY_NAMES[top].en} is your class's most important ability.`)
            : L(lang, ' O atributo principal da sua classe não está nesta lista; o bônus vai no próximo mais útil.', ' Your class\'s main ability isn\'t on this list; the bonus goes to the next most useful one.')}
          {!recSame && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => save(rec)}>
                ✦ {L(lang, 'Usar a recomendação', 'Use the recommendation')}
              </button>
            </div>
          )}
        </Callout>
      )}

      <div className="row gap-3" style={{ margin: '8px 0', alignItems: 'center' }}>
        <span className="text-sm">{L(lang, 'Bônus distribuído', 'Bonus assigned')}</span>
        <Counter n={used} of={need} />
      </div>

      <AbilityTable char={char} lang={lang} total={expectedRaceBonus(char)} controls={controls} />
    </>
  );
}

function Comp({ char, set, lang }) {
  const mode = bonusMode(char);
  const inSync = raceBonusInSync(char);
  // Origem mudou (antecedente/raça) depois da última visita: alinha char.raceBonus ao esperado.
  useEffect(() => { if (!inSync && mode.kind !== 'needBackground' && mode.kind !== 'needRace') set(syncRaceBonusPatch(char)); }, [inSync]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mode.kind === 'needBackground' || mode.kind === 'needRace') {
    return (
      <div>
        <StepIntro title={L(lang, 'Bônus de atributo', 'Ability bonus')} />
        <Callout kind="warn">{abilityBonusIssues(char)[0][lang]}</Callout>
      </div>
    );
  }

  const is2024 = char.rulesVersion === '2024';
  const srcName = is2024 ? mode.source.name[lang] : tName('race', mode.source.id, lang);
  const fixed = baseBonus(char);
  const fixedList = ABILITIES.filter(k => fixed[k]).map(k => `+${fixed[k]} ${ABILITY_NAMES[k][lang]}`).join(', ');

  return (
    <div>
      {is2024 ? (
        <StepIntro title={L(lang, 'Bônus do antecedente', 'Background bonus')}>
          <p>
            {L(lang, 'Seu ', 'Your ')}<Term id="background" lang={lang}>{L(lang, 'antecedente', 'background')}</Term>
            {L(lang, ` (${srcName}) deixa subir ${names(mode.from, 'pt')}. Escolha +2 em um e +1 em outro, ou +1 nos três.`,
              ` (${srcName}) lets ${names(mode.from, 'en')} go up. Pick +2 to one and +1 to another, or +1 to all three.`)}
          </p>
          <p className="text-sm">
            {L(lang, 'Isso é permanente e é o único bônus de atributo no nível 1: em 2024 a espécie não muda atributos.',
              'This is permanent and the only ability bonus at level 1: in 2024 your species doesn\'t change abilities.')}
          </p>
        </StepIntro>
      ) : (
        <StepIntro title={L(lang, 'Bônus da raça', 'Racial bonus')}>
          <p>
            {L(lang, `Nas regras de 2014 sua raça (${srcName}) aumenta alguns `, `In the 2014 rules your race (${srcName}) raises some `)}
            <Term id="abilityScores" lang={lang}>{L(lang, 'atributos', 'ability scores')}</Term>
            {L(lang, '. Os bônus fixos já estão somados abaixo.', '. Fixed bonuses are already added below.')}
          </p>
          {mode.kind === 'other' && (
            <p className="text-sm">{L(lang, `Além disso, escolha ${mode.count} atributos diferentes (fora ${names(ABILITIES.filter(k => !mode.from.includes(k)), 'pt')}) para ganhar +1 cada.`,
              `Also pick ${mode.count} different abilities (not ${names(ABILITIES.filter(k => !mode.from.includes(k)), 'en')}) to get +1 each.`)}</p>
          )}
          {mode.kind === 'flex' && (
            <p className="text-sm">{L(lang, 'Esta raça deixa você escolher: +2 em um atributo e +1 em outro, ou +1 em três atributos diferentes.',
              'This race lets you choose: +2 to one ability and +1 to another, or +1 to three different abilities.')}</p>
          )}
        </StepIntro>
      )}

      {mode.kind === 'fixed' ? (
        <>
          <Callout kind="ok">
            {fixedList
              ? L(lang, `Já aplicado: ${fixedList}.`, `Already applied: ${fixedList}.`)
              : L(lang, 'Esta raça não dá bônus fixo de atributo.', 'This race gives no fixed ability bonus.')}
            {mode.speciesHasAsi && L(lang, ' Os bônus à sua escolha foram definidos na etapa de escolhas da espécie.', ' Your chosen bonuses were set in the species choices step.')}
          </Callout>
          <AbilityTable char={char} lang={lang} total={expectedRaceBonus(char)} />
        </>
      ) : (
        <>
          {!is2024 && fixedList && <Callout kind="ok">{L(lang, `Já aplicado: ${fixedList}.`, `Already applied: ${fixedList}.`)}</Callout>}
          <ChooseBonus char={char} set={set} lang={lang} mode={mode} />
        </>
      )}

      <Summary char={char} lang={lang} />
    </div>
  );
}

export default {
  id: 'abilityBonus',
  title: { pt: 'Bônus de atributo', en: 'Ability bonus' },
  issues: abilityBonusIssues,
  Comp,
};
