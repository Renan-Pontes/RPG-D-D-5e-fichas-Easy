/* Testes da ficha no visual "Ficha Forjada" (src/sheet/ficha.css). Só apresentação:
 * os dados, os rótulos de rolagem e os handlers vêm de components/Sheet.jsx.
 *
 * FhHex: selo hexagonal de atributo (sigla, modificador e valor). É um <button>, que
 * rola pelo toque e pelo teclado. O hexágono é desenhado no ::before (filete dourado)
 * e no miolo .fh-hex-in: o clip-path fica só nesses dois, não no botão, para o anel
 * de foco continuar visível. */
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
 * level: 0 sem treino, 1 treinado, 2 especialista. */
export function FhSkillRow({ name, abbr, bonus, level = 0, profTitle, profLabel, onToggle, onRoll }) {
  return (
    <div className={`fh-skill${level ? ' is-prof' : ''}`}>
      <button
        type="button"
        className={`fh-prof${level === 2 ? ' expert' : level ? ' prof' : ''}`}
        onClick={onToggle}
        aria-pressed={level > 0}
        aria-label={profLabel}
        title={profTitle}
      />
      <button type="button" className="fh-skill-roll" onClick={onRoll}>
        <span className="fh-skill-name">{name}</span>
        <span className="fh-skill-abil">{abbr}</span>
        <span className="fh-skill-mod">{bonus}</span>
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

/* Legenda dos losangos, no pé do painel: o ciclo do treino não é óbvio só pelo desenho. */
export function FhProfLegend({ lang, expert = false }) {
  const pt = lang === 'pt';
  return (
    <div className="fh-prof-legend">
      <span><i className="fh-prof-mark" aria-hidden="true" />{pt ? 'sem treino' : 'not proficient'}</span>
      <span><i className="fh-prof-mark prof" aria-hidden="true" />{pt ? 'treinado' : 'proficient'}</span>
      {expert && <span><i className="fh-prof-mark expert" aria-hidden="true" />{pt ? 'especialista' : 'expertise'}</span>}
      <span className="fh-prof-legend-tip"><FhTap lang={lang} />{pt ? ' no losango para trocar' : ' the diamond to change'}</span>
    </div>
  );
}
