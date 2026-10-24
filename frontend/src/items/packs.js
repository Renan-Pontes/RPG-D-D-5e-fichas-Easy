/* Pacotes de equipamento no inventário da ficha (lógica pura, testada em
 * tests/packs.test.js). O pacote entra na ficha como um item só ("Pacote de
 * Aventureiro" ×1); abrir/consumir troca o pacote pelo que vem dentro
 * (data/equipment-packs.js, pela regra da ficha), somando com itens iguais que
 * a ficha já tenha (mesmo sourceId ou mesmo nome).
 *
 * Fichas do servidor (conta e campanha) abrem pelo backend
 * (POST /api/characters/<id>/inventory/open-pack → backend/api/packs.py), que
 * faz a mesma conta com os mesmos dados: scripts/sync-rules.mjs copia
 * packsForBackend() para backend/api/progression/catalog.json. Mudou algo
 * aqui? Mude também packs.py e rode `node scripts/sync-rules.mjs`. */
import { ITEMS_BY_ID } from '../../data/items.js';
import { PACKS, PACK_GEAR } from '../../data/equipment-packs.js';

// Regra da ficha como no motor da ficha (utils.js is2024, progression/*, servidor):
// 2024 só com rulesVersion '2024'; ficha antiga, de antes do campo existir, é 2014.
const ruleOf = (r) => (r === '2024' ? '2024' : '2014');
const rv = (char) => ruleOf(char?.rulesVersion);
const pick = (lang, o) => (typeof o === 'string' ? o : ((lang === 'en' ? o?.en : o?.pt) || o?.pt || o?.en || ''));

/** Nome → chave de comparação: minúsculas, sem acento nem apóstrofo, hífen vira espaço. */
export const itemKey = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’`]/g, '')
  .replace(/[-_]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Para reconhecer o pacote pelo nome, também sem "×2" e sem "(10 po)" no fim. */
export const packNameKey = (s) => itemKey(String(s ?? '')
  .replace(/(?:\s*×|\s+[xX])\s*\d+\s*$/, '')
  .replace(/\s*\([^)]*\)\s*$/, ''));

// sourceId do pacote no catálogo (data/items.js) → chave do pacote.
const CATALOG_PACK = Object.fromEntries(Object.entries(PACKS).filter(([, p]) => p.catalogId).map(([k, p]) => [p.catalogId, k]));

let NAMES = null;
/** Índice nome normalizado → pacote. Ordem de prioridade: nome no catálogo
 * ("Mochila de Aventureiro" é o dungeoneersPack de data/items.js), nome da
 * criação ("Pacote de Aventureiro" = Explorer's Pack, start-data.js) e, por
 * fim, as variações "pacote/kit/mochila de|do <palavra>" e "<word>'s pack". */
function packNames() {
  if (NAMES) return NAMES;
  NAMES = new Map();
  const add = (name, key) => { const k = packNameKey(name); if (k && !NAMES.has(k)) NAMES.set(k, key); };
  for (const [key, p] of Object.entries(PACKS)) {
    const cat = p.catalogId && ITEMS_BY_ID[p.catalogId];
    if (cat) { add(cat.name?.pt, key); add(cat.name?.en, key); }
  }
  for (const [key, p] of Object.entries(PACKS)) { add(p.name.pt, key); add(p.name.en, key); }
  for (const [key, p] of Object.entries(PACKS)) {
    for (const w of p.words) for (const pre of ['pacote', 'kit', 'mochila']) for (const de of ['de', 'do']) add(`${pre} ${de} ${w}`, key);
    add(`${p.en}s pack`, key);
    add(`${p.en} pack`, key);
  }
  return NAMES;
}

/** Chave do pacote ('explorer', 'priest'…) se o item for um pacote; senão null. */
export function packKeyOf(item) {
  if (!item || typeof item !== 'object') return null;
  if (typeof item.pack === 'string' && PACKS[item.pack]) return item.pack;
  if (item.sourceId && CATALOG_PACK[item.sourceId]) return CATALOG_PACK[item.sourceId];
  // Arma, armadura, poção e item mágico nunca são pacote (ex.: "Mochila Útil").
  if (item.type && item.type !== 'gear') return null;
  const names = typeof item.name === 'string' ? [item.name] : [item.name?.pt, item.name?.en];
  for (const n of names) {
    const key = packNames().get(packNameKey(n));
    if (key) return key;
  }
  return null;
}
export const isPack = (item) => !!packKeyOf(item);

/** Uma coisa de PACK_GEAR resolvida na regra: nome, tipo, peso, arte e nomes que somam. */
function gearDef(gk, rules) {
  const g = PACK_GEAR[gk];
  const cat = g.id ? ITEMS_BY_ID[g.id] : null;
  const name = g.name || { pt: cat?.name?.pt || gk, en: cat?.name?.en || gk };
  const weight = g.weight && typeof g.weight === 'object' ? g.weight[rules] : g.weight;
  const match = [...new Set([name.pt, name.en, ...(g.aliases || [])].map(itemKey).filter(Boolean))];
  return {
    gear: gk,
    ...(cat ? { sourceId: cat.sourceId } : {}),
    type: cat?.type || 'gear',
    name: { pt: name.pt, en: name.en },
    ...(weight != null ? { weight } : {}),
    ...(g.artId ? { artId: g.artId } : {}),
    ...(cat?.description ? { description: cat.description } : {}),
    match,
  };
}

/** Itens de dentro do pacote na regra ('2014' | '2024'; outro valor = 2014), com a quantidade de cada um. */
export function packItems(key, rulesVersion) {
  const r = ruleOf(rulesVersion);
  return (PACKS[key]?.contents?.[r] || []).map(([gk, qty = 1]) => ({ ...gearDef(gk, r), qty }));
}

/** Para a confirmação: { key, name, rules, lines: ['Mochila', '10 × Tocha'…] } ou null. */
export function packPreview(char, item, lang = 'pt') {
  const key = packKeyOf(item);
  if (!key) return null;
  const r = rv(char);
  const lines = packItems(key, r).map(c => (c.qty > 1 ? `${c.qty} × ${pick(lang, c.name)}` : pick(lang, c.name)));
  return { key, name: pick(lang, PACKS[key].name), rules: r, lines };
}

/** Quantidade do item (antigo sem qty = 1). */
const qtyOf = (it) => {
  if (it?.qty == null || it.qty === '') return 1;
  const n = Math.trunc(Number(it.qty));
  return Number.isFinite(n) ? n : 1;
};

/** Item da ficha igual a esta coisa do pacote? Mesmo sourceId, ou mesmo nome (pt, en ou apelido). */
function sameItem(e, c) {
  if (!e || typeof e !== 'object' || packKeyOf(e)) return false;
  if (e.weapon || e.armor || e.magic) return false;
  if (e.sourceId && c.sourceId) return e.sourceId === c.sourceId;
  return c.match.includes(itemKey(pick('pt', e.name))) || c.match.includes(itemKey(pick('en', e.name)));
}

const newId = (i) => `item-${Date.now().toString(36)}-${i}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Abre um pacote do inventário: devolve o patch { equipment } ou null (não é
 * pacote / não está na ficha). `item` é o objeto de char.equipment (ou um com o
 * mesmo id).
 *  - um pacote só: sai da lista e os itens entram no lugar dele; com ×2, fica ×1
 *    e os itens entram logo depois;
 *  - ×0 (consumido antes, quando consumir só tirava 1): abrir ainda entrega o conteúdo;
 *  - item igual já na ficha: soma a quantidade nele (mesmo que esteja ×0);
 *  - itens novos herdam `from` do pacote (a criação troca o pacote inteiro se a
 *    classe/antecedente mudar) e as notas do pacote passam para o primeiro item
 *    (a mochila ou o baú), para não se perderem.
 */
export function openPack(char, item, lang = 'pt') {
  const list = Array.isArray(char?.equipment) ? char.equipment : [];
  let idx = list.indexOf(item);
  if (idx < 0 && item?.id) idx = list.findIndex(e => e && typeof e === 'object' && e.id === item.id);
  if (idx < 0) return null;
  const pack = list[idx];
  const key = packKeyOf(pack);
  if (!key) return null;
  const out = list.map(e => (e && typeof e === 'object' ? { ...e } : e));
  const left = qtyOf(pack) - 1;
  const packNotes = left > 0 ? '' : String(pack.notes || '').trim();
  const added = [];
  packItems(key, rv(char)).forEach((c, i) => {
    const notes = i === 0 ? packNotes : '';
    const j = out.findIndex((e, k) => k !== idx && sameItem(e, c));
    if (j >= 0) {
      out[j].qty = Math.max(0, qtyOf(out[j])) + c.qty;
      if (notes) out[j].notes = [String(out[j].notes || '').trim(), notes].filter(Boolean).join(' · ');
      return;
    }
    added.push({
      id: newId(i),
      ...(c.sourceId ? { sourceId: c.sourceId } : {}),
      name: pick(lang, c.name),
      type: c.type,
      qty: c.qty,
      equipped: false,
      broken: false,
      attunement: false,
      attuned: false,
      notes,
      ...(c.weight != null ? { weight: c.weight } : {}),
      ...(c.artId ? { artId: c.artId } : {}),
      ...(c.description ? { description: c.description } : {}),
      ...(pack.from ? { from: pack.from } : {}),
    });
  });
  if (left > 0) {
    out[idx] = { ...out[idx], qty: left };
    out.splice(idx + 1, 0, ...added);
  } else {
    out.splice(idx, 1, ...added);
  }
  return { equipment: out };
}

/** Dados para o servidor (catalog.json['packs'], via scripts/sync-rules.mjs). */
export function packsForBackend() {
  const gear = {};
  for (const gk of Object.keys(PACK_GEAR)) {
    const d14 = gearDef(gk, '2014');
    const d24 = gearDef(gk, '2024');
    const { gear: _g, weight: _w, ...rest } = d24;
    const weight = Object.fromEntries([['2014', d14.weight], ['2024', d24.weight]].filter(([, w]) => w != null));
    gear[gk] = { ...rest, ...(Object.keys(weight).length ? { weight } : {}) };
  }
  const contents = {};
  for (const rules of ['2014', '2024']) {
    contents[rules] = Object.fromEntries(Object.entries(PACKS).map(([k, p]) => [k, p.contents[rules].map(([gk, qty = 1]) => [gk, qty])]));
  }
  return { names: Object.fromEntries(packNames()), catalogIds: CATALOG_PACK, gear, contents };
}
