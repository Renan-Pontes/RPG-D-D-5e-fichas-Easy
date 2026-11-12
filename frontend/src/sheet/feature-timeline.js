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
const KIND_ORDER = { species: 0, background: 1, multiclass: 2, class: 3, choice: 4, asi: 5, feat: 6 };

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
export function buildTimeline({ level = 1, seq = [], classItems = [], speciesTraits = [], feats = [], background = null, levelChoices = {}, asiText = null, pending = [], multiclass = [], extras = [] }) {
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
  // Decisões pendentes da engine (invocações, dádiva, metamagia, subclasse, ASI quando a
  // classe não traz o traço de ASI). `level` = nível do personagem.
  const asiAt = new Set(out.filter(e => e.kind === 'asi').map(e => e.level));
  pending.filter(c => !(c.type === 'asiOrFeat' && asiAt.has(c.level))).forEach((c, i) => {
    out.push({ level: c.level, kind: 'choice', key: `pc:${i}`, classId: c.classId, choice: c, pending: true, later: false,
      item: { name: both({ pt: c.reason, en: c.reasonEn || c.reason }), desc: both('') } });
  });
  // ASI já escolhido em nível sem traço de ASI na lista da classe (regras 2014): também
  // aparece, para a linha do tempo mostrar toda escolha feita (e poder trocá-la).
  for (const [k, ch] of Object.entries(levelChoices || {})) {
    const lv = +k;
    if (ch?.type !== 'asi' || !lv || out.some(e => e.kind === 'asi' && e.level === lv)) continue;
    out.push({ level: lv, kind: 'asi', key: `asi:${lv}`, item: { id: ASI_ID, name: both({ pt: 'Aumento no Valor de Atributo', en: 'Ability Score Improvement' }), desc: both(asiText ? asiText(ch.asi) : '') }, later: lv > level, done: true });
  }
  // Proficiências ao entrar numa classe por multiclasse: no nível em que entrou.
  multiclass.forEach(m => {
    const lv = charLevelOf(seq, m.classId, 1);
    if (lv != null) out.push({ level: lv, kind: 'multiclass', key: `mc:${m.classId}`, classId: m.classId, item: { name: both(m.name), desc: both(m.text) }, later: false });
  });
  // Outros itens já com nível do personagem (truques automáticos da subclasse…).
  extras.forEach((x, i) => out.push({ later: x.level > level, ...x, key: x.key || `x:${i}`, item: { ...x.item, name: both(x.item.name), desc: both(x.item.desc) } }));
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

// ── Tiers de jogo (PHB 2014 cap. 1 "Tiers of Play"; DMG cap. 1; PHB 2024 "Level Advancement") ──
export const TIERS = [
  { tier: 1, from: 1, to: 4, pt: 'Heróis Locais', en: 'Local Heroes' },
  { tier: 2, from: 5, to: 10, pt: 'Heróis do Reino', en: 'Heroes of the Realm' },
  { tier: 3, from: 11, to: 16, pt: 'Mestres do Reino', en: 'Masters of the Realm' },
  { tier: 4, from: 17, to: 20, pt: 'Mestres do Mundo', en: 'Masters of the World' },
];
/** Tier de um nível (1–20; fora disso, o mais próximo). */
export const tierOf = (level) => TIERS.find(t => level <= t.to) || TIERS[TIERS.length - 1];

/** Agrupa os grupos de nível (byLevel) por tier: [{ ...tier, levels: [{ level, entries }] }]. */
export function byTier(groups) {
  const out = [];
  for (const g of groups) {
    const t = tierOf(g.level);
    let row = out[out.length - 1];
    if (!row || row.tier !== t.tier) { row = { ...t, levels: [] }; out.push(row); }
    row.levels.push(g);
  }
  return out;
}

/**
 * Classes do personagem ao chegar no nível `level`: [{ id, level, up }], na ordem em que
 * entraram; `up` = a classe escolhida para subir neste nível. Além do que já subiu: [].
 */
export function classesAt(seq, level) {
  const s = (seq || []).slice(0, level);
  if (s.length < level) return [];
  const out = [];
  s.forEach(id => { const r = out.find(x => x.id === id); if (r) r.level++; else out.push({ id, level: 1, up: false }); });
  const last = out.find(x => x.id === s[level - 1]);
  if (last) last.up = true;
  return out;
}
