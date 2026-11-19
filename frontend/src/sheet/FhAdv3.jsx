/* Seletor "Desv. · Normal · Vant." da aba Jogar (visual "Ficha Forjada", src/sheet/ficha.css:
 * .fh-adv3). Fica à vista no painel e diz em palavras como o PRÓXIMO d20 daquele painel vai
 * rolar; depois da rolagem quem usa devolve para Normal (nada fica armado sem o jogador ver).
 * Substitui, nos medalhões e nos botões de Ataque, o gesto escondido de deslizar para
 * cima/baixo, que marcava vantagem só com cor e impedia rolar a página a partir deles.
 * Tocar de novo na opção ligada volta para Normal. */
export default function FhAdv3({ value = 'normal', onChange, lang = 'pt' }) {
  const pt = lang === 'pt';
  const opts = [
    ['dis', pt ? 'Desv.' : 'Dis.', '▼', pt ? 'Desvantagem' : 'Disadvantage'],
    ['normal', 'Normal', '', 'Normal'],
    ['adv', pt ? 'Vant.' : 'Adv.', '▲', pt ? 'Vantagem' : 'Advantage'],
  ];
  return (
    <span className={`fh-adv3 is-${value}`} role="group" aria-label={pt ? 'Como rolar o próximo d20' : 'How to roll the next d20'}>
      <span className="fh-adv3-k" aria-hidden="true">{pt ? 'Próximo d20' : 'Next d20'}</span>
      <span className="fh-adv3-set">
        {opts.map(([v, short, glyph, full]) => (
          <button key={v} type="button" className={`fh-adv3-b is-${v}${value === v ? ' is-on' : ''}`}
            aria-pressed={value === v} aria-label={full} title={full}
            onClick={() => onChange(value === v ? 'normal' : v)}>
            {glyph && <span className="fh-adv3-g" aria-hidden="true">{glyph}</span>}{short}
          </button>
        ))}
      </span>
    </span>
  );
}
