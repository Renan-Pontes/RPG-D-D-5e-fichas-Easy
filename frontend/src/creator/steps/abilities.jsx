/* Etapa "Atributos": gerar os 6 valores-base (conjunto padrão, compra de pontos ou rolagem). Lógica em ../ability-helpers.js. */
import { useEffect, useState } from 'react';
import Utils from '../../../utils.js';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, Callout, ChoiceGrid, ChoiceCard, L } from '../ui.jsx';
import {
  ABILITIES, ABILITY_NAMES, ABILITY_BLURBS, STANDARD_ARRAY, POINT_BUY_COST, POINT_BUY_TOTAL, POINT_MIN, POINT_MAX,
  STANDARD_ARRAY_BY_CLASS, abilityMethod, abilityPool, abilityAssign, pointBuyCost, nextPointCost, primaryAbilities,
  setMethodPatch, assignPatch, pointBuyPatch, rollPatch, suggestionPatch, abilitiesIssues,
} from '../ability-helpers.js';
import { abilityList, classChangeNotice, dismissClassChange } from '../class-helpers.js';
import { classArt } from '../../art.js';
import { preloadDice3D, effectiveAnimMode } from '../../dice/DiceStage.jsx';
import { Echo } from '../journey-ui.jsx';
import RollReveal from '../RollReveal.jsx';
import Icon from '../../../components/Icons.jsx';
import DoorsPanel from '../DoorsPanel.jsx';
import '../journey-extra.css';

const fmt = Utils.fmtMod;
/** Os dados animam (3D ou 2D)? Com movimento reduzido ('static') ou desligado ('off'), o resultado aparece direto. */
const diceAnimate = () => { try { const m = effectiveAnimMode(); return m === '3d' || m === '2d'; } catch { return false; } };

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
  // A rolagem continua a mesma (rollPatch grava os 6×4d6); os dados 3D só revelam o que foi gravado.
  const [reveal, setReveal] = useState(null);
  const roll = () => {
    const p = rollPatch(char);
    set(p);
    if (diceAnimate()) setReveal({ id: Date.now(), rolls: p.creation.abilityRolls });
  };
  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      {reveal && <RollReveal key={reveal.id} rolls={reveal.rolls} lang={lang} onClose={() => setReveal(null)} />}
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
            onClick={roll}>
            {L(lang, 'Rolar de novo (só se o mestre deixar)', 'Roll again (only if your DM allows)')}
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={roll}>
          <Icon name="dice" size={16} /> {L(lang, 'Rolar os dados', 'Roll the dice')}
        </button>
      )}
      <div className="text-xs muted" style={{ marginTop: 8 }}>
        {L(lang, 'Cada valor: rola 4 dados de 6 lados e soma os 3 maiores (o menor, riscado, é descartado).',
          'Each score: roll four 6-sided dice and add the 3 highest (the lowest, struck out, is dropped).')}
      </div>
    </div>
  );
}

/** Valores do conjunto padrão: toque num valor (ele fica "na mão") e depois no atributo.
 * Tocar num valor já usado tira ele do atributo e deixa na mão para pôr em outro. */
function PoolChips({ char, set, lang, held, setHeld }) {
  const pool = abilityPool(char);
  const assign = abilityAssign(char);
  if (abilityMethod(char) !== 'standard') return null;
  const pick = (i) => {
    if (held === i) { setHeld(null); return; }
    const k = ABILITIES.find(a => assign[a] === i);
    if (k) set(assignPatch(char, k, null));
    setHeld(i);
  };
  return (
    <>
      <div className="cr-ab-pool" role="group" aria-label={L(lang, 'Valores para distribuir', 'Scores to assign')}>
        {pool.map((v, i) => {
          const k = ABILITIES.find(a => assign[a] === i);
          const where = k ? ABILITY_NAMES[k][lang] : '';
          return (
            <button key={i} type="button" className={`cr-ab-chip ${k ? 'used' : ''} ${held === i ? 'held' : ''}`} aria-pressed={held === i}
              onClick={() => pick(i)}
              aria-label={k
                ? L(lang, `${v}, em ${where}. Toque para tirar e pôr em outro atributo.`, `${v}, on ${where}. Tap to take it back and put it elsewhere.`)
                : L(lang, `${v}, livre. Toque e depois escolha o atributo.`, `${v}, free. Tap, then choose the ability.`)}>
              <span className="mono">{v}</span>
              <span className="text-xs">{held === i ? L(lang, 'na mão', 'held') : k ? where.slice(0, 3) : L(lang, 'livre', 'free')}</span>
            </button>
          );
        })}
      </div>
      <p className="cr-ab-held text-sm" role="status" aria-live="polite">
        {held != null && pool[held] != null
          ? L(lang, `${pool[held]} na mão: toque no atributo que vai recebê-lo.`, `${pool[held]} held: tap the ability that gets it.`)
          : ''}
      </p>
    </>
  );
}

function AbilityRow({ char, set, lang, k, primary, held = null, setHeld }) {
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
          {/* Valor na mão: um toque põe aqui (a lista continua para quem prefere escolher por ela). */}
          {held != null && pool[held] != null && (
            <button type="button" className="btn btn-primary btn-sm cr-ab-put"
              onClick={() => { set(assignPatch(char, k, held)); setHeld?.(null); }}
              aria-label={L(lang, `Pôr ${pool[held]} em ${name}`, `Put ${pool[held]} on ${name}`)}>
              {L(lang, `Pôr ${pool[held]}`, `Put ${pool[held]}`)}
            </button>
          )}
          <select className={held != null ? 'cr-ab-select is-behind' : 'cr-ab-select'} aria-label={L(lang, `Valor de ${name}`, `${name} score`)} value={assign[k] ?? ''} disabled={!pool.length}
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
  // Dados 3D: carrega o palco quando o jogador escolhe rolar (só se for animar em 3D), para a primeira rolagem não esperar.
  useEffect(() => { try { if (m === 'roll' && effectiveAnimMode() === '3d') preloadDice3D().catch(() => {}); } catch { /* sem 3D: o palco cai para 2D */ } }, [m]);
  const changedFrom = classChangeNotice(char);
  // Valor "na mão" (índice do conjunto padrão), esperando o toque num atributo.
  const [held, setHeld] = useState(null);
  useEffect(() => { setHeld(null); }, [m]);
  const missing = m !== 'pointbuy' && ABILITIES.some(a => abilityAssign(char)[a] == null);

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

      {char.className && primary.length > 0 && (
        <Echo art={classArt(char.className)} lang={lang}>
          {L(lang, `${className}. Seu caminho pede ${abilityList(primary, 'pt')}: é o `, `${className}. Your path calls for ${abilityList(primary, 'en')}: that's the `)}
          <Term id="primaryAbility" lang={lang}>{L(lang, 'atributo principal', 'primary ability')}</Term>
          {L(lang, ', então ponha ali o seu valor mais alto.', ', so put your highest score there.')}
        </Echo>
      )}

      {changedFrom && char.className && (
        <Callout kind="warn">
          {L(lang,
            `Você trocou de classe (${tName('class', changedFrom, 'pt')} → ${className}). Os atributos abaixo foram pensados para a classe anterior: toque em "Sugestão para minha classe" para refazer, ou confira se ainda servem.`,
            `You changed class (${tName('class', changedFrom, 'en')} → ${className}). The scores below were meant for your previous class: tap "Suggestion for my class" to redo them, or check they still work.`)}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => set(dismissClassChange(char))}>{L(lang, 'Entendi', 'Got it')}</button>
          </div>
        </Callout>
      )}

      <MethodPicker char={char} set={set} lang={lang} />

      {char.className && (
        <button type="button" className={`btn cr-ab-suggest ${missing && canSuggest ? 'btn-primary' : 'btn-ghost'}`} disabled={!canSuggest}
          onClick={() => { const p = suggestionPatch(char); if (p) { set(p); setHeld(null); } }}>
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
          {L(lang, `Toque num valor e depois no atributo (ou use a lista de cada atributo). Cada valor (${STANDARD_ARRAY.join(', ')}) entra uma vez; escolher um já usado troca os dois de lugar.`,
            `Tap a score, then the ability (or use each ability's list). Each score (${STANDARD_ARRAY.join(', ')}) is used once; picking one already in use swaps the two.`)}
        </div>
      )}
      <PoolChips char={char} set={set} lang={lang} held={held} setHeld={setHeld} />
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

      {ABILITIES.map(k => <AbilityRow key={k} char={char} set={set} lang={lang} k={k} primary={primary.includes(k)} held={m === 'standard' ? held : null} setHeld={setHeld} />)}

      <Callout>
        {L(lang, 'Como ler o modificador: 8–9 = −1 · 10–11 = +0 · 12–13 = +1 · 14–15 = +2 · 16–17 = +3. Quanto maior, mais fácil acertar nos testes daquele atributo.',
          'Reading the modifier: 8–9 = −1 · 10–11 = +0 · 12–13 = +1 · 14–15 = +2 · 16–17 = +3. The higher it is, the easier rolls with that ability get.')}
      </Callout>

      <DoorsPanel char={char} lang={lang} />
    </div>
  );
}

export default {
  id: 'abilities',
  title: { pt: 'Atributos', en: 'Abilities' },
  issues: abilitiesIssues,
  Comp,
};
