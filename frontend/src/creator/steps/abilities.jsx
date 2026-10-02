/* Etapa "Atributos": gerar os 6 valores-base (conjunto padrão, compra de pontos ou rolagem). Lógica em ../ability-helpers.js. */
import Utils from '../../../utils.js';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, Callout, ChoiceGrid, ChoiceCard, L } from '../ui.jsx';
import {
  ABILITIES, ABILITY_NAMES, ABILITY_BLURBS, STANDARD_ARRAY, POINT_BUY_COST, POINT_BUY_TOTAL, POINT_MIN, POINT_MAX,
  STANDARD_ARRAY_BY_CLASS, abilityMethod, abilityPool, abilityAssign, pointBuyCost, nextPointCost, primaryAbilities,
  setMethodPatch, assignPatch, pointBuyPatch, rollPatch, suggestionPatch, abilitiesIssues,
} from '../ability-helpers.js';

const fmt = Utils.fmtMod;

function MethodPicker({ char, set, lang }) {
  const m = abilityMethod(char);
  const pick = (id) => { if (id !== m) set(setMethodPatch(char, id)); };
  return (
    <>
    <p className="text-sm" style={{ marginBottom: 8 }}>
      {L(lang, 'Escolha como gerar os números: ', 'Choose how to generate the numbers: ')}
      <Term id="standardArray" lang={lang}>{L(lang, 'conjunto padrão', 'standard array')}</Term>{', '}
      <Term id="pointBuy" lang={lang}>{L(lang, 'compra de pontos', 'point buy')}</Term>{L(lang, ' ou ', ' or ')}
      <Term id="abilityRoll" lang={lang}>{L(lang, 'rolagem', 'rolling')}</Term>.
      {L(lang, ' Na dúvida, fique com o conjunto padrão.', ' If unsure, keep the standard array.')}
    </p>
    <ChoiceGrid cols={3}>
      <ChoiceCard selected={m === 'standard'} onClick={() => pick('standard')} badge={L(lang, 'Recomendado', 'Recommended')}
        title={L(lang, 'Conjunto padrão', 'Standard array')}
        subtitle={L(lang, 'Você recebe 15, 14, 13, 12, 10 e 8 e escolhe onde vai cada um. Rápido e equilibrado.',
          'You get 15, 14, 13, 12, 10 and 8 and choose where each goes. Quick and balanced.')} />
      <ChoiceCard selected={m === 'pointbuy'} onClick={() => pick('pointbuy')}
        title={L(lang, 'Compra de pontos', 'Point buy')}
        subtitle={L(lang, '27 pontos para "comprar" valores de 8 a 15. Mais controle, um pouco mais de conta.',
          '27 points to "buy" scores from 8 to 15. More control, a bit more math.')} />
      <ChoiceCard selected={m === 'roll'} onClick={() => pick('roll')}
        title={L(lang, 'Rolar os dados', 'Roll the dice')}
        subtitle={L(lang, 'Sorte pura: 4d6 seis vezes. Só use se o mestre deixar.',
          'Pure luck: 4d6 six times. Only if your DM allows it.')} />
    </ChoiceGrid>
    </>
  );
}

function RollPanel({ char, set, lang }) {
  const rolls = char.creation?.abilityRolls || [];
  const assign = abilityAssign(char);
  const usedBy = (i) => ABILITIES.find(k => assign[k] === i);
  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <Callout kind="warn">
        {L(lang, 'Combine com o mestre antes: rolar pode deixar o herói bem mais forte ou mais fraco que o resto do grupo.',
          'Check with your DM first: rolling can make your hero much stronger or weaker than the rest of the group.')}
      </Callout>
      {rolls.length === 6 ? (
        <>
          <div className="cr-ab-rolls">
            {rolls.map((r, i) => {
              const low = r.dice.indexOf(Math.min(...r.dice));
              return (
                <div key={i} className={`cr-ab-roll ${usedBy(i) ? 'used' : ''}`}>
                  <div className="cr-ab-roll-total mono">{r.total}</div>
                  <div className="cr-ab-roll-dice mono text-xs">
                    {r.dice.map((d, j) => <span key={j} className={j === low ? 'dropped' : ''}>{d}</span>)}
                  </div>
                  {usedBy(i) && <div className="text-xs muted">{ABILITY_NAMES[usedBy(i)][lang]}</div>}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }}
            onClick={() => set(rollPatch(char))}>
            {L(lang, 'Rolar de novo (só se o mestre deixar)', 'Roll again (only if your DM allows)')}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => set(rollPatch(char))}>
          🎲 {L(lang, 'Rolar os dados', 'Roll the dice')}
        </button>
      )}
      <div className="text-xs muted" style={{ marginTop: 8 }}>
        {L(lang, 'Cada valor: rola 4 dados de 6 lados e soma os 3 maiores (o menor, riscado, é descartado).',
          'Each score: roll four 6-sided dice and add the 3 highest (the lowest, struck out, is dropped).')}
      </div>
    </div>
  );
}

function PoolChips({ char, lang }) {
  const pool = abilityPool(char);
  const assign = abilityAssign(char);
  if (abilityMethod(char) !== 'standard') return null;
  return (
    <div className="cr-ab-pool" aria-label={L(lang, 'Valores para distribuir', 'Scores to assign')}>
      {pool.map((v, i) => {
        const k = ABILITIES.find(a => assign[a] === i);
        return (
          <span key={i} className={`cr-ab-chip ${k ? 'used' : ''}`}>
            <span className="mono">{v}</span>
            <span className="text-xs">{k ? ABILITY_NAMES[k][lang].slice(0, 3) : L(lang, 'livre', 'free')}</span>
          </span>
        );
      })}
    </div>
  );
}

function AbilityRow({ char, set, lang, k, primary }) {
  const m = abilityMethod(char);
  const pool = abilityPool(char);
  const assign = abilityAssign(char);
  const assigned = m === 'pointbuy' || assign[k] != null;
  const value = (char.abilities || {})[k] ?? POINT_MIN;
  const name = ABILITY_NAMES[k][lang];
  const next = nextPointCost(value);
  const left = POINT_BUY_TOTAL - pointBuyCost(char.abilities);
  return (
    <div className="stat-row">
      <div className="stat-name">
        {name}
        {primary && <span className="cr-badge">{L(lang, 'Principal da classe', 'Class main ability')}</span>}
        <small>{ABILITY_BLURBS[k][lang]}</small>
        {m === 'pointbuy' && (
          <small>
            {next == null
              ? L(lang, 'No máximo (15).', 'At the maximum (15).')
              : L(lang, `Próximo ponto custa ${next}.`, `Next point costs ${next}.`)}
          </small>
        )}
      </div>
      {m === 'pointbuy' ? (
        <div className="stat-controls">
          <button type="button" className="stat-btn" disabled={value <= POINT_MIN} onClick={() => { const p = pointBuyPatch(char, k, -1); if (p) set(p); }}
            aria-label={L(lang, `Diminuir ${name}`, `Decrease ${name}`)}>−</button>
          <span className="stat-value mono">{value}</span>
          <button type="button" className="stat-btn" disabled={next == null || next > left} onClick={() => { const p = pointBuyPatch(char, k, 1); if (p) set(p); }}
            aria-label={L(lang, `Aumentar ${name}`, `Increase ${name}`)}>+</button>
        </div>
      ) : (
        <div className="stat-controls">
          <select aria-label={L(lang, `Valor de ${name}`, `${name} score`)} value={assign[k] ?? ''} disabled={!pool.length}
            onChange={(e) => set(assignPatch(char, k, e.target.value === '' ? null : +e.target.value))}>
            <option value="">{L(lang, '— escolher —', '— choose —')}</option>
            {pool.map((v, i) => {
              const other = ABILITIES.find(a => a !== k && assign[a] === i);
              return (
                <option key={i} value={i}>
                  {v} ({fmt(Utils.mod(v))}){other ? L(lang, ` — troca com ${ABILITY_NAMES[other].pt}`, ` — swap with ${ABILITY_NAMES[other].en}`) : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div className="stat-final">
        <div className="stat-final-num">{assigned ? value : '—'}</div>
        <div className="stat-final-mod">{assigned ? fmt(Utils.mod(value)) : ''}</div>
      </div>
    </div>
  );
}

function Comp({ char, set, lang }) {
  const m = abilityMethod(char);
  const primary = primaryAbilities(char);
  const canSuggest = !!STANDARD_ARRAY_BY_CLASS[char.className] && (m !== 'roll' || (char.creation?.abilityRolls || []).length === 6);
  const className = char.className ? tName('class', char.className, lang) : '';
  const left = POINT_BUY_TOTAL - pointBuyCost(char.abilities);
  const bonusNote = char.rulesVersion === '2024'
    ? L(lang, 'Na próxima etapa seu antecedente ainda soma +3 em atributos.', 'In the next step your background still adds +3 to abilities.')
    : L(lang, 'Na próxima etapa entram os bônus da sua raça.', 'In the next step your race bonuses are added.');

  return (
    <div>
      <StepIntro title={L(lang, 'Atributos: os números do herói', 'Abilities: your hero\'s numbers')}>
        <p>
          {L(lang, 'Seu herói é medido por seis ', 'Your hero is measured by six ')}
          <Term id="abilityScores" lang={lang}>{L(lang, 'atributos', 'ability scores')}</Term>
          {L(lang, '. Cada valor gera um ', '. Each score gives a ')}
          <Term id="modifier" lang={lang}>{L(lang, 'modificador', 'modifier')}</Term>
          {L(lang, ' (o número pequeno, como +2), que você soma quando rola o dado. Ponha os valores mais altos no que sua classe mais usa.',
            ' (the small number, like +2) that you add when you roll. Put the highest scores in what your class uses most.')}
        </p>
        <p className="text-sm">{bonusNote}</p>
      </StepIntro>

      <MethodPicker char={char} set={set} lang={lang} />

      {char.className && (
        <button type="button" className="btn btn-sm btn-ghost" disabled={!canSuggest}
          style={{ width: '100%', margin: '12px 0', borderColor: 'var(--gold)', color: 'var(--gold)' }}
          onClick={() => { const p = suggestionPatch(char); if (p) set(p); }}>
          ✦ {L(lang, `Sugestão para minha classe (${className})`, `Suggestion for my class (${className})`)}
        </button>
      )}
      {!char.className && (
        <Callout>{L(lang, 'Escolha uma classe para ver qual atributo ela mais usa e receber uma sugestão pronta.',
          'Pick a class to see which ability it uses most and get a ready-made suggestion.')}</Callout>
      )}

      {m === 'roll' && <RollPanel char={char} set={set} lang={lang} />}
      {m === 'standard' && (
        <div className="text-sm muted" style={{ marginBottom: 8 }}>
          {L(lang, `Use cada valor (${STANDARD_ARRAY.join(', ')}) uma vez. Escolher um valor já usado troca os dois de lugar.`,
            `Use each score (${STANDARD_ARRAY.join(', ')}) once. Picking a value already in use swaps the two.`)}
        </div>
      )}
      <PoolChips char={char} lang={lang} />
      {m === 'pointbuy' && (
        <>
          <div className="pointbuy-pool">
            <span className="pool-label">{L(lang, 'Pontos restantes', 'Points left')}</span>
            <span className="pool-value mono">{left}/{POINT_BUY_TOTAL}</span>
          </div>
          <div className="text-xs muted" style={{ marginBottom: 8 }}>
            {L(lang, 'Custo total de cada valor: ', 'Total cost of each score: ')}
            {Object.entries(POINT_BUY_COST).map(([v, c]) => `${v}=${c}`).join(' · ')}
            {L(lang, `. Todos começam em ${POINT_MIN}; o máximo é ${POINT_MAX}.`, `. All start at ${POINT_MIN}; the maximum is ${POINT_MAX}.`)}
          </div>
        </>
      )}

      {ABILITIES.map(k => <AbilityRow key={k} char={char} set={set} lang={lang} k={k} primary={primary.includes(k)} />)}

      <Callout>
        {L(lang, 'Como ler o modificador: 8–9 = −1 · 10–11 = +0 · 12–13 = +1 · 14–15 = +2 · 16–17 = +3. Quanto maior, mais fácil acertar nos testes daquele atributo.',
          'Reading the modifier: 8–9 = −1 · 10–11 = +0 · 12–13 = +1 · 14–15 = +2 · 16–17 = +3. The higher it is, the easier rolls with that ability get.')}
      </Callout>
    </div>
  );
}

export default {
  id: 'abilities',
  title: { pt: 'Atributos', en: 'Abilities' },
  issues: abilitiesIssues,
  Comp,
};
