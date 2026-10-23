/* Condições que mudam a aparência da ficha (visual "Ficha Forjada", src/sheet/ficha.css).
 * Só design: nada muda número, rolagem nem deslocamento. Tudo vem de char.conditions,
 * que já é gravado (e do PV 0, que já aparece como "Caído").
 * - condClasses: classes da raiz .ficha (c-poisoned, c-prone…, is-down). O CSS usa
 *   para mexer só na <img> do retrato (elemento-folha) e nas camadas abaixo.
 * - FhConditionFx: brilho colorido nas bordas da tela (envenenado, amedrontado,
 *   paralisado/atordoado). Camadas fixas, aria-hidden e sem toque, irmãs no topo da
 *   ficha: nada de filter/transform/z-index em contêiner, porque os modais da ficha
 *   não são portais.
 * - FhConditionArt: camadas por cima do retrato do topo (correntes, brilho rosa,
 *   pedra, tom azulado, "Zz"). Ficam dentro de .fh-hero-art, que já é aria-hidden. */

const KNOWN = new Set([
  'blinded', 'charmed', 'deafened', 'exhausted', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious',
]);

export function condClasses(char) {
  const out = (char.conditions || []).filter(c => KNOWN.has(c)).map(c => `c-${c}`);
  if (char.currentHp === 0) out.push('is-down'); // PV 0: o retrato "apaga" como inconsciente
  return out;
}

// Condição → camada na borda da tela (paralisado e atordoado dividem a mesma)
const SCREEN = { poisoned: 'poison', frightened: 'fear', paralyzed: 'still', stunned: 'still' };

export function FhConditionFx({ conditions }) {
  const on = new Set(conditions || []);
  const kinds = [...new Set(Object.keys(SCREEN).filter(c => on.has(c)).map(c => SCREEN[c]))];
  return kinds.map(k => <div key={k} className={`fh-cfx fh-cfx-${k}`} aria-hidden="true" />);
}

// Correntes (as da demo): impedido mostra as três; agarrado, uma só
const CHAINS = ['M-10 60 L410 250', 'M-10 240 L410 40', 'M80 -10 L330 310'];

export function FhConditionArt({ conditions, down }) {
  const on = new Set(conditions || []);
  const chains = on.has('restrained') ? CHAINS : on.has('grappled') ? CHAINS.slice(0, 1) : [];
  return (
    <>
      {(on.has('paralyzed') || on.has('stunned')) && <span className="fh-cart fh-cart-still" />}
      {on.has('petrified') && <span className="fh-cart fh-cart-stone" />}
      {on.has('charmed') && <span className="fh-cart fh-cart-charm" />}
      {chains.length > 0 && (
        <svg className="fh-cart fh-cart-chains" viewBox="0 0 400 300" preserveAspectRatio="none" focusable="false">
          {chains.map(d => (
            <g key={d}>
              <path className="fh-chain-back" d={d} />
              <path className="fh-chain-link" d={d} />
              <path className="fh-chain-shine" d={d} />
            </g>
          ))}
        </svg>
      )}
      {(on.has('unconscious') || down) && <span className="fh-cart fh-cart-zz">Z<small>z</small><small>z</small></span>}
    </>
  );
}
