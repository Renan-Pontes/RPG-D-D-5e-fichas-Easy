// Sobrevivência (PHB 2014 cap. 8 "The Environment" / PHB 2024 "Rules Glossary" e DMG):
// fórmulas exatas, puras. O painel está em src/sheet/HpTracker.jsx.
//
//  Comida      — 1 lb por dia; aguenta 3 + mod. CON dias sem comer (mín. 1). Ao fim de
//                cada dia além disso: 1 nível de exaustão automático. Meia ração = meio dia.
//  Água        — 1 galão por dia (2 no calor). Só metade: TR de CON CD 15 ou 1 nível de
//                exaustão ao fim do dia; menos que metade: 1 nível automático.
//  Fôlego      — segura a respiração 1 + mod. CON minutos (mín. 30 s). Sem ar, aguenta
//                mod. CON rodadas (mín. 1) e no começo do turno seguinte cai a 0 PV.
//  Água gélida — (DMG) fica imerso minutos = valor de CON sem efeito; depois, a cada
//                minuto, TR de CON CD 10 ou 1 nível de exaustão. Resistência ou imunidade a
//                frio (ou adaptação natural) passa automático.
// Exaustão zera a contagem? Não: comer/beber normal zera os dias; a exaustão sai no descanso longo.

const int = (v, d = 0) => (Number.isFinite(+v) ? Math.trunc(+v) : d);

/** Dias que aguenta sem comida. */
export const foodDays = (conMod) => Math.max(1, 3 + int(conMod));

/** Segurar o fôlego, em rodadas de 6 s (mín. 30 s = 5 rodadas). */
export function breath(conMod) {
  const minutes = Math.max(0.5, 1 + int(conMod));
  return { minutes, rounds: Math.round(minutes * 10), suffocating: Math.max(1, int(conMod)) };
}

/** Minutos na água gélida antes do primeiro teste. `resist` = resistência/imunidade a frio. */
export const frigidMinutes = (conScore, resist = false) => (resist ? Infinity : Math.max(1, int(conScore, 10)));

/** Estado guardado na ficha: { food: dias sem comer, water: dias sem água suficiente }. */
export function survivalOf(char) {
  const s = char?.survival || {};
  return { food: Math.max(0, +s.food || 0), water: Math.max(0, int(s.water)) };
}

/**
 * Leitura do estado: { nourished, foodLeft, foodOver, waterOver }.
 * foodOver/waterOver = quantos dias já renderam exaustão (pela regra).
 */
export function survivalStatus(char, conMod) {
  const s = survivalOf(char);
  const lim = foodDays(conMod);
  return {
    nourished: s.food === 0 && s.water === 0,
    foodLimit: lim,
    foodLeft: Math.max(0, lim - s.food),
    foodOver: Math.max(0, Math.floor(s.food) - lim),
    waterOver: s.water,
  };
}

/** Avança (+1) ou volta (−1) um dia; `half` = meia ração (meio dia sem comer). */
export function stepDays(char, key, delta) {
  const s = survivalOf(char);
  const next = Math.max(0, Math.round((s[key] + delta) * 2) / 2);
  return { survival: { ...s, [key]: key === 'water' ? Math.round(next) : next } };
}

/** Rodadas/minutos legíveis. */
export function breathLabel(conMod, lang = 'pt') {
  const b = breath(conMod);
  const en = lang === 'en';
  const m = b.minutes < 1 ? '30 s' : `${b.minutes} min`;
  return en ? `${m} (${b.rounds} rounds), then ${b.suffocating} round${b.suffocating > 1 ? 's' : ''}` : `${m} (${b.rounds} rodadas), depois ${b.suffocating} rodada${b.suffocating > 1 ? 's' : ''}`;
}
