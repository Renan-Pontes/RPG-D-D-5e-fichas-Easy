// Linha do tempo dos traços (aba Características): tudo o que a ficha ganhou, em ordem de
// NÍVEL DO PERSONAGEM. Puro (sem React).
//
//  • Classe/subclasse: o nível de classe vira nível do personagem pela ordem em que a
//    multiclasse subiu (`seq` = classSequence: a classe de cada nível, do 1 em diante).
//  • Espécie: cada traço no próprio nível (Legado Infernal do tiefling: magias no 3 e no 5);
//    sem nível, no 1.
//  • Talentos: no nível exato em que o jogador trocou o Aumento no Valor de Atributo pelo
//    talento (`feats[].level`); os de antecedente e de espécie, no 1.
//  • Aumento no Valor de Atributo: vira o que foi escolhido naquele nível (`levelChoices`):
//    talento → some (o talento já está lá); +2 em atributos → mostra os pontos; sem escolha
//    → fica como pendente.

export const ASI_ID = 'abilityScoreImprovement';
const KIND_ORDER = { species: 0, background: 1, class: 2, asi: 3, feat: 4 };

/** Nível do personagem em que a classe chegou a `classLevel` (null = ainda não chegou). */
export function charLevelOf(seq, classId, classLevel) {
  let n = 0;
  for (let i = 0; i < (seq || []).length; i++) {
    if (seq[i] === classId && ++n === classLevel) return i + 1;
  }
  return null;
}

/**
 * entries: [{ level, kind, key, item, later }] em ordem; kinds: species | background |
 * class | asi | feat. `item` = { name:{pt,en}, desc:{pt,en}, picks? } (formato do FhFeatureItem).
 */
export function buildTimeline({ level = 1, seq = [], classItems = [], speciesTraits = [], feats = [], background = null, levelChoices = {}, asiText = null }) {
  const out = [];
  const both = (v) => (v && typeof v === 'object' ? { pt: v.pt ?? v.en ?? '', en: v.en ?? v.pt ?? '' } : { pt: v || '', en: v || '' });
  speciesTraits.forEach((tr, i) => {
    const lv = Math.max(1, +tr.level || 1);
    out.push({ level: lv, kind: 'species', key: `sp:${i}`, item: { name: both(tr.name), desc: both(tr.desc) }, later: lv > level });
  });
  if (background) out.push({ level: 1, kind: 'background', key: 'bg', item: { name: both(background.name), desc: both(background.desc) }, later: false });
  for (const it of classItems) {
    const lv = charLevelOf(seq, it.classId, it.level) ?? (seq.length ? null : it.level);
    if (lv == null) continue;
    if (it.id === ASI_ID) {
      const ch = levelChoices?.[lv];
      if (ch?.type === 'feat') continue;                      // o talento entra pelo `feats`
      if (ch?.type === 'asi') {
        out.push({ level: lv, kind: 'asi', key: `asi:${lv}`, classId: it.classId, item: { ...it, desc: both(asiText ? asiText(ch.asi) : '') }, later: false, done: true });
        continue;
      }
      out.push({ level: lv, kind: 'asi', key: `asi:${lv}`, classId: it.classId, item: it, later: lv > level, pending: lv <= level });
      continue;
    }
    out.push({ level: lv, kind: 'class', key: `c:${it.key || it.id}:${lv}`, classId: it.classId, item: it, later: lv > level });
  }
  feats.forEach((f, i) => {
    const lv = f.origin === 'background' || f.origin === 'species' ? 1 : Math.max(1, +f.level || 1);
    out.push({ level: lv, kind: 'feat', key: `f:${i}`, feat: f, later: lv > level });
  });
  return out.sort((a, b) => a.level - b.level || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** Agrupa por nível: [{ level, entries }]. */
export function byLevel(entries) {
  const m = new Map();
  for (const e of entries) { if (!m.has(e.level)) m.set(e.level, []); m.get(e.level).push(e); }
  return [...m.entries()].map(([lv, list]) => ({ level: lv, entries: list }));
}
