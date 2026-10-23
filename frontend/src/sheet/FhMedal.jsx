/* Medalhão da defesa da ficha (visual "Ficha Forjada", src/sheet/ficha.css):
 * forma dourada em SVG (escudo, círculo ou losango) com o valor no meio, o rótulo e
 * uma linha de apoio embaixo.
 * - O contorno usa o degradê #fh-gilt-stroke de <FhMedalDefs/>, desenhado uma vez só
 *   por ficha (o mesmo id repetido em cada medalhão seria id duplicado).
 * - Com `onClick` o medalhão é um <button> (iniciativa: rola ao tocar e pelo teclado);
 *   sem ele, um <div>. A dica do Grimório (`hint`) só em medalhão sem onClick: botão
 *   dentro de botão é HTML inválido. `children` entra no fim (aviso de armadura). */
const SHAPES = {
  shield: <path d="M32 2 L60 12 V34 C60 52 46 63 32 68 C18 63 4 52 4 34 V12 Z" />,
  circle: <circle cx="32" cy="35" r="27" />,
  diamond: <path d="M32 8 L58 35 L32 62 L6 35 Z" />,
};

export function FhMedalDefs() {
  // width/height 0 em vez de display: none (com display: none o degradê some no Firefox)
  return (
    <svg className="fh-svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fh-gilt-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7dc93" />
          <stop offset=".3" stopColor="#8c6427" />
          <stop offset=".5" stopColor="#ecc777" />
          <stop offset=".75" stopColor="#7b5721" />
          <stop offset="1" stopColor="#f2d38a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function FhMedal({ shape = 'circle', value, unit, label, hint, sub, onClick, title, children }) {
  const roll = typeof onClick === 'function';
  const Tag = roll ? 'button' : 'div';
  const Part = roll ? 'span' : 'div'; // dentro de <button>, só conteúdo de frase
  const long = String(value ?? '').length >= 3; // "10,5" m, "+10": fonte menor para caber na forma
  return (
    <Tag className={`fh-medal${roll ? ' is-roll' : ''}`} title={title} {...(roll ? { type: 'button', onClick } : {})}>
      <Part className={`fh-medal-shape is-${shape}${long ? ' is-long' : ''}`}>
        <svg viewBox="0 0 64 70" aria-hidden="true" focusable="false">{SHAPES[shape]}</svg>
        <span className="fh-medal-val">{value}{unit && <small>{unit}</small>}</span>
      </Part>
      <Part className="fh-medal-label">{label}{hint}</Part>
      {sub && <Part className="fh-medal-sub">{sub}</Part>}
      {children}
    </Tag>
  );
}
