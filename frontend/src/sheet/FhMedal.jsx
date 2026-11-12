/* Medalhão da ficha (visual "Ficha Forjada", src/sheet/ficha.css): defesa na aba Jogar,
 * atributo/CD/ataque de magia na aba Magias. Forma dourada em SVG (escudo, círculo,
 * losango ou hexágono) com o valor no meio, o rótulo e uma linha de apoio embaixo.
 * - O contorno usa o degradê #fh-gilt-stroke de <FhMedalDefs/>, desenhado uma vez só
 *   por ficha (o mesmo id repetido em cada medalhão seria id duplicado).
 * - Com `onClick` o medalhão é um <button> (iniciativa: rola ao tocar e pelo teclado);
 *   sem ele, um <div>. A dica do Grimório (`hint`) só em medalhão sem onClick: botão
 *   dentro de botão é HTML inválido. `children` entra no fim (aviso de armadura). */
const SHAPES = {
  shield: <path d="M32 2 L60 12 V34 C60 52 46 63 32 68 C18 63 4 52 4 34 V12 Z" />,
  circle: <circle cx="32" cy="35" r="27" />,
  diamond: <path d="M32 8 L58 35 L32 62 L6 35 Z" />,
  hex: <path d="M32 4 L59 19.5 V50.5 L32 66 L5 50.5 V19.5 Z" />, // atributo de conjuração (como os selos de atributo)
  // silhuetas dos medalhões do cabeçalho (cada uma diz o que mede)
  speed: <path d="M6 15 H43 L60 35 L43 55 H6 Z" />, // seta em movimento: Deslocamento
  d20: <><path d="M32 3 L60 19 V51 L32 67 L4 51 V19 Z" /><path className="fh-facet" d="M32.0 3.0 L32.0 13.0 M57.1 19.0 L50.2 24.0 M57.1 51.0 L50.2 46.0 M32.0 67.0 L32.0 57.0 M6.9 51.0 L13.8 46.0 M6.9 19.0 L13.8 24.0 M32.0 13.0 L50.2 24.0 L50.2 46.0 L32.0 57.0 L13.8 46.0 L13.8 24.0 Z" /></>, // d20: Iniciativa (rola)
  eye: <path d="M2 35 C15 12 49 12 62 35 C49 58 15 58 2 35 Z" />, // olho: Percepção passiva
  lens: <><path d="M44.5 47.5 L49.5 42.5 L62 55 Q63 60 57 60 Z" /><circle cx="28" cy="31" r="23" /></>, // lupa: Investigação passiva
  flame: <path d="M32 3 C41 17 57 27 57 44 C57 58 46 67 32 67 C18 67 7 58 7 44 C7 27 23 17 32 3 Z" />, // chama interior: Intuição passiva
  star: <path d="M32.0 5.0 L41.2 12.8 L53.2 13.8 L54.2 25.8 L62.0 35.0 L54.2 44.2 L53.2 56.2 L41.2 57.2 L32.0 65.0 L22.8 57.2 L10.8 56.2 L9.8 44.2 L2.0 35.0 L9.8 25.8 L10.8 13.8 L22.8 12.8 Z" />, // estrela de mérito: Bônus de Proficiência
  heart: <path d="M32 66 C11 50 3 38 3 25 C3 13 11 5 21 5 C27 5 30 8 32 12 C34 8 37 5 43 5 C53 5 61 13 61 25 C61 38 53 50 32 66 Z" />, // Pontos de Vida
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
