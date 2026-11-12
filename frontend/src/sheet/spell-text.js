// Texto integral das magias do SRD 5.2.1 (EN + PT), carregado sob demanda num chunk
// próprio na primeira vez que alguém abre uma magia. Fora do SRD 2024 (magias 2014 e
// de suplementos) a ficha continua com o resumo de data/srd.js.
import { useEffect, useState } from 'react';
import MECH from '../../data/spell-mechanics.json';

let cache = null;
let pending = null;
// Fichas de 2014: texto integral do SRD 5.1 (só inglês; o pt fica com o resumo da ficha)
let cache51 = null;
let pending51 = null;
export function loadSpellText51() {
  if (cache51) return Promise.resolve(cache51);
  if (!pending51) {
    pending51 = import('../../data/srd51-spells-text.json')
      .then((m) => { const t = m.default || m; cache51 = {}; for (const [id, en] of Object.entries(t)) cache51[id] = { en, pt: '' }; return cache51; })
      .catch(() => { pending51 = null; return {}; });
  }
  return pending51;
}
const ALIAS51 = { spareDying: 'spareTheDying', identifySpell: 'identify', expediteRetreat: 'expeditiousRetreat', commandSpell: 'command' };

export function loadSpellText() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = Promise.all([import('../../data/srd2024-spells.json'), import('../../data/srd2024-spells-pt.json')])
      .then(([en, pt]) => {
        const ptMap = pt.default || pt;
        const out = {};
        for (const s of (en.default || en)) out[s.id] = { en: s.desc?.en || '', pt: ptMap[s.id]?.desc || '' };
        cache = out;
        return out;
      })
      .catch(() => { pending = null; return {}; });
  }
  return pending;
}

/** Texto integral da magia (ou null enquanto carrega / fora do SRD). `legacy` = ficha de
 *  2014: usa o SRD 5.1 (a mesma magia mudou de texto no SRD 5.2.1). */
export function useSpellText(id, enabled = true, legacy = false) {
  const [map, setMap] = useState(legacy ? cache51 : cache);
  useEffect(() => {
    if (!enabled || (legacy ? cache51 : cache)) { if (legacy ? cache51 : cache) setMap(legacy ? cache51 : cache); return undefined; }
    let alive = true;
    (legacy ? loadSpellText51() : loadSpellText()).then(m => { if (alive) setMap(m); });
    return () => { alive = false; };
  }, [enabled, legacy]);
  return map ? map[legacy ? (ALIAS51[id] || id) : id] || null : null;
}

/** Mecânica resumida (tirada do texto do SRD): save, ataque, dados base e por círculo. */
export const spellMechanics = (id) => MECH[id] || null;

/**
 * Dados da magia num círculo de espaço: "8d6" → "10d6" no 5º para Bola de Fogo.
 * → { base: '8d6', at: '10d6', plus: '+2d6' } ou null quando a escala não é de dados.
 */
export function scaledDice(id, spellLevel, slotLevel) {
  const m = MECH[id];
  if (!m?.inc) return null;
  const steps = Math.max(0, slotLevel - spellLevel);
  const [n, d] = m.inc;
  const plus = steps ? `+${n * steps}d${d}` : '';
  if (m.base) return { base: `${m.base[0]}d${m.base[1]}`, at: `${m.base[0] + n * steps}d${d}`, plus };
  return { base: '', at: '', plus };
}

/** Só a frase "Usando um espaço de círculo superior…" do texto integral. */
export function higherLevelText(text) {
  if (!text) return '';
  const m = text.match(/(Using a Higher-Level Spell Slot\.?|At Higher Levels\.?|Usando um Espaço de Magia de Círculo Superior\.?)([\s\S]*)$/i);
  return m ? m[2].replace(/\s+/g, ' ').trim() : '';
}
