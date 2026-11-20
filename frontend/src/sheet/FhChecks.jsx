/* Testes da ficha no visual "Ficha Forjada" (src/sheet/ficha.css). Só apresentação:
 * os dados, os rótulos de rolagem e os handlers vêm de components/Sheet.jsx.
 *
 * FhHex: selo hexagonal de atributo (sigla, modificador e valor). É um <button>, que
 * rola pelo toque e pelo teclado. O hexágono é desenhado no ::before (filete dourado)
 * e no miolo .fh-hex-in: o clip-path fica só nesses dois, não no botão, para o anel
 * de foco continuar visível. */
import Icon from '../../components/Icons.jsx';

export function FhHex({ abbr, mod, score, label, onClick }) {
  return (
    <button type="button" className="fh-hex" onClick={onClick} aria-label={label}>
      <span className="fh-hex-in">
        <span className="fh-hex-abbr">{abbr}</span>
        <span className="fh-hex-mod">{mod}</span>
        <span className="fh-hex-score">{score}</span>
      </span>
    </button>
  );
}

/* FhSkillRow: linha de salvaguarda ou de perícia com DOIS botões irmãos (botão dentro
 * de botão é HTML inválido): o losango alterna o treino (aria-pressed e title, como a
 * bolinha antiga) e o resto da linha rola o teste.
 * level: 0 sem treino, 1 treinado, 2 especialista.
 * - locked: em campanha o servidor trava o treino. O losango continua um botão (o toque
 *   explica o motivo pelo title e o aviso da ficha), mas com aria-disabled e sem brilho.
 * - sem onToggle (ferramentas): o losango é só desenho, não é botão.
 * - adv: 'adv' quando a perícia rola com vantagem por padrão (Sentidos Aguçados): marca ▲.
 * - rollLabel: nome acessível do botão de rolar (diz o bônus e o valor passivo por extenso). */
export function FhSkillRow({ name, abbr, bonus, passive, level = 0, profTitle, profLabel, onToggle, onRoll, lang = 'pt', locked = false, adv, advTitle, rollLabel }) {
  const profCls = `fh-prof${level === 2 ? ' expert' : level ? ' prof' : ''}`;
  return (
    <div className={`fh-skill${level ? ' is-prof' : ''}${locked ? ' is-locked' : ''}`}>
      {onToggle ? (
        <button
          type="button"
          className={`${profCls}${locked ? ' is-locked' : ''}`}
          onClick={onToggle}
          aria-pressed={level > 0}
          aria-disabled={locked || undefined}
          aria-label={profLabel}
          title={profTitle}
        />
      ) : (
        <span className={`${profCls} is-static`} title={profTitle} aria-hidden="true" />
      )}
      <button type="button" className="fh-skill-roll" onClick={onRoll} aria-label={rollLabel} data-roll-adv={adv || undefined}>
        <span className="fh-skill-name">
          <span className="fh-skill-name-txt">{name}</span>
          {abbr && <span className="fh-skill-abil-inline">({abbr})</span>}
        </span>
        <span className="fh-skill-scores">
          {adv === 'adv' && <span className="fh-skill-adv" title={advTitle || (lang === 'pt' ? 'Rola com vantagem' : 'Rolls with advantage')} aria-hidden="true">▲</span>}
          {/* ▼: a perícia rola com desvantagem por padrão (Furtividade com armadura pesada) */}
          {adv === 'dis' && <span className="fh-skill-adv is-dis" title={advTitle || (lang === 'pt' ? 'Rola com desvantagem' : 'Rolls with disadvantage')} aria-hidden="true">▼</span>}
          {passive != null && (
            <>
              <span className="fh-skill-pass" title={lang === 'pt' ? `Valor passivo: ${passive}` : `Passive score: ${passive}`}>
                <strong className="fh-score-num">{passive}</strong>
              </span>
              <span className="fh-score-divider" aria-hidden="true">/</span>
            </>
          )}
          <span className="fh-skill-mod" title={lang === 'pt' ? `Bônus do teste: d20 ${bonus}` : `Check bonus: d20 ${bonus}`}>
            <strong className="fh-score-num">{bonus}</strong>
          </span>
        </span>
      </button>
    </div>
  );
}

/* FhTap: o verbo das dicas de uso ("toque" / "clique"). Os dois vão no HTML e o CSS
 * mostra um só: "clique" onde há mouse de verdade, (hover: hover) e (pointer: fine). */
export function FhTap({ lang }) {
  const pt = lang === 'pt';
  return (
    <>
      <span className="fh-tap-touch">{pt ? 'toque' : 'tap'}</span>
      <span className="fh-tap-mouse">{pt ? 'clique' : 'click'}</span>
    </>
  );
}

/* "toque para rolar" / "clique para rolar", para os subtítulos dos painéis */
export function FhTapToRoll({ lang, short = false }) {
  const pt = lang === 'pt';
  return <><FhTap lang={lang} />{pt ? (short ? ' p/ rolar' : ' para rolar') : ' to roll'}</>;
}

/* Legenda dos losangos, no pé do painel: o ciclo do treino não é óbvio só pelo desenho.
 * locked (em campanha): no lugar do convite a tocar, diz quem muda o treino. */
export function FhProfLegend({ lang, expert = false, locked = false }) {
  const pt = lang === 'pt';
  return (
    <div className="fh-prof-legend">
      <span><i className="fh-prof-mark" aria-hidden="true" />{pt ? 'sem treino' : 'not proficient'}</span>
      <span><i className="fh-prof-mark prof" aria-hidden="true" />{pt ? 'treinado' : 'proficient'}</span>
      {expert && <span><i className="fh-prof-mark expert" aria-hidden="true" />{pt ? 'especialista' : 'expertise'}</span>}
      {locked
        ? <span className="fh-prof-legend-tip is-locked"><Icon name="lock" size={12} aria-hidden="true" />{pt ? 'em campanha, o mestre altera o treino' : 'in a campaign, the DM changes training'}</span>
        : <span className="fh-prof-legend-tip"><FhTap lang={lang} />{pt ? ' no losango para trocar' : ' the diamond to change'}</span>}
    </div>
  );
}
