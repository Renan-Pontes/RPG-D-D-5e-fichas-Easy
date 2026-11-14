/* Texto de regra com estrutura: parágrafos, subtítulos, listas, tabelas e fichas de criatura.
 * Os textos do catálogo chegam como texto corrido com quebras de linha:
 *   "#### Cantrips" ou "TOOLS REQUIRED"   → subtítulo
 *   "• O objeto emite luz…"               → item de lista
 *   "| d6 | Effect |"                     → linha de tabela (a linha curta antes vira legenda)
 *   "Homunculus Servant" + "Tiny construct" → ficha de criatura até o fim do texto
 *   "Healing. The drinker…"               → nome em negrito no começo do parágrafo
 * parseRich() é puro (testado em tests/rich-text.test.js); RichText desenha e passa cada
 * trecho pelo DiceText, então "2d4" continua rolável. CSS: src/sheet/ficha.css (.rt-). */
import { Fragment, lazy, Suspense, useState } from 'react';
import { DiceText } from '../dice/dice-text.jsx';

import { parseRich, splitLead, statblockToMonster } from './rich-text.js';

export { parseRich, splitLead };

// O mesmo bloco de criatura do combate do mestre (src/combat/MonsterStatblock.jsx), carregado
// só quando alguém abre a criatura. O CSS dele já vem com a ficha (components/Sheet.jsx).
const MonsterStatblock = lazy(() => import('../combat/MonsterStatblock.jsx'));

/** Criatura dentro de uma magia ou traço (Espírito Aberrante, Homúnculo…): um botão com nome e
 *  tipo que abre/fecha o bloco de criatura completo ali mesmo. */
function CreatureFold({ b, lang, onRoll }) {
  const [open, setOpen] = useState(false);
  const pt = lang === 'pt';
  return (
    <div className={`rt-creature${open ? ' is-open' : ''}`}>
      <button type="button" className="rt-creature-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="rt-creature-glyph" aria-hidden="true">❖</span>
        <span className="rt-creature-text">
          <span className="rt-creature-name">{b.name}</span>
          <span className="rt-creature-meta">{b.meta}</span>
        </span>
        <span className="rt-creature-hint">{open ? (pt ? 'fechar' : 'close') : (pt ? 'ver ficha' : 'stat block')}</span>
        <span className="rt-creature-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <Suspense fallback={<Statblock b={b} lang={lang} onRoll={onRoll} />}>
          <MonsterStatblock monster={statblockToMonster(b)} lang={lang} onRoll={onRoll} className="rt-creature-sb" />
        </Suspense>
      )}
    </div>
  );
}

function Inline({ text, lang, onRoll, lead = true }) {
  const parts = lead ? splitLead(text) : null;
  if (parts) return <><strong className="rt-lead">{parts[0]}</strong> <Md text={parts[1]} lang={lang} onRoll={onRoll} /></>;
  return <Md text={text} lang={lang} onRoll={onRoll} />;
}
// **negrito** e *itálico* do markdown; o resto vai para o DiceText (dados roláveis).
function Md({ text, lang, onRoll }) {
  const bits = String(text).split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/);
  return bits.map((b, i) => {
    if (/^\*\*[^*]+\*\*$/.test(b)) return <strong key={i}><DiceText text={b.slice(2, -2)} lang={lang} onRoll={onRoll} /></strong>;
    if (/^\*[^*].*\*$/.test(b)) return <em key={i}><DiceText text={b.slice(1, -1)} lang={lang} onRoll={onRoll} /></em>;
    return b ? <DiceText key={i} text={b} lang={lang} onRoll={onRoll} /> : null;
  });
}

function Table({ head, rows, caption, lang, onRoll, className = '' }) {
  return (
    <div className={`rt-table-wrap ${className}`}>
      <table className="rt-table">
        {caption && <caption>{caption}</caption>}
        {head && <thead><tr>{head.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}><Inline text={c} lang={lang} onRoll={onRoll} lead={j > 0} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Statblock({ b, lang, onRoll }) {
  const abil2 = b.abil2 && b.abil2.map(c => /^(\S+)\s+(\d+)\s+([+−-]\d+)(?:\s+([+−-]\d+))?/.exec(c)).filter(Boolean);
  return (
    <section className="rt-sb" aria-label={b.name}>
      <header className="rt-sb-head">
        <h5 className="rt-sb-name">{b.name}</h5>
        <p className="rt-sb-meta">{b.meta}</p>
      </header>
      {b.props.map((p, i) => p.table
        ? <Table key={i} head={p.table[0]} rows={p.table.slice(1)} lang={lang} onRoll={onRoll} />
        : (
          <p key={i} className={p.label ? 'rt-sb-prop' : 'rt-sb-entry'}>
            {p.label ? <><strong>{p.label}</strong> <DiceText text={p.text} lang={lang} onRoll={onRoll} /></>
              : p.lead ? <><strong className="rt-lead">{p.lead}</strong> <Md text={p.text} lang={lang} onRoll={onRoll} /></>
                : <Md text={p.text} lang={lang} onRoll={onRoll} />}
          </p>
        ))}
      {b.abil && (
        <div className="rt-sb-abil" role="table" aria-label={lang === 'pt' ? 'Atributos' : 'Ability scores'}>
          {b.abil.head.map((h, i) => (
            <div key={i} className="rt-sb-ab" role="row">
              <span className="rt-sb-ab-k" role="columnheader">{h}</span>
              <span className="rt-sb-ab-v" role="cell">{b.abil.rows[0]?.[i] ?? ''}</span>
            </div>
          ))}
        </div>
      )}
      {abil2?.length > 0 && (
        <div className="rt-sb-abil">
          {abil2.map((m, i) => (
            <div key={i} className="rt-sb-ab">
              <span className="rt-sb-ab-k">{m[1].toUpperCase()}</span>
              <span className="rt-sb-ab-v">{m[2]} ({m[3]})</span>
              {m[4] && <span className="rt-sb-ab-s">{lang === 'pt' ? 'salv.' : 'save'} {m[4]}</span>}
            </div>
          ))}
        </div>
      )}
      {b.sections.map((s, i) => (
        <Fragment key={i}>
          <h6 className="rt-sb-section">{s.name}</h6>
          {s.entries.map((e, j) => e.table
            ? <Table key={j} head={e.table[0]} rows={e.table.slice(1)} lang={lang} onRoll={onRoll} />
            : <p key={j} className="rt-sb-entry">{e.lead && <><strong className="rt-lead">{e.lead}</strong> </>}<Md text={e.text} lang={lang} onRoll={onRoll} /></p>)}
        </Fragment>
      ))}
    </section>
  );
}

/** Texto de regra formatado. `className` vai no contêiner. */
export function RichText({ text, lang = 'pt', onRoll, className = '' }) {
  if (text == null || text === '') return null;
  const blocks = parseRich(text);
  return (
    <div className={`rt ${className}`}>
      {blocks.map((b, i) => {
        if (b.t === 'h') return <h5 key={i} className="rt-h">{b.text}</h5>;
        if (b.t === 'eyebrow') return <p key={i} className="rt-eyebrow">{b.text}</p>;
        if (b.t === 'ul') return <ul key={i} className="rt-ul">{b.items.map((it, j) => <li key={j}><Inline text={it} lang={lang} onRoll={onRoll} /></li>)}</ul>;
        if (b.t === 'table') return <Table key={i} {...b} lang={lang} onRoll={onRoll} />;
        if (b.t === 'sb') return <CreatureFold key={i} b={b} lang={lang} onRoll={onRoll} />;
        return <p key={i} className="rt-p"><Inline text={b.text} lang={lang} onRoll={onRoll} /></p>;
      })}
    </div>
  );
}

export default RichText;
