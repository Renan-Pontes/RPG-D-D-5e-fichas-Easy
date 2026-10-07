/* Rótulos e conversões do formulário de item (lógica pura, testável em node).
 * O item guarda tudo em inglês/libras (mesmo formato de data/items.js); a tela
 * mostra em pt (kg) ou en (lb). */
import { damageTypeLabel } from '../combat/monster-i18n.js';

const pick = (lang, pt, en) => (lang === 'pt' ? pt : en);

const TYPE_LABEL = {
  weapon: ['Arma', 'Weapon'], armor: ['Armadura', 'Armor'], shield: ['Escudo', 'Shield'],
  gear: ['Equipamento', 'Gear'], potion: ['Poção', 'Potion'], magic: ['Item mágico', 'Magic item'],
};
export const RARITIES = [
  ['common', 'Comum', 'Common'], ['uncommon', 'Incomum', 'Uncommon'], ['rare', 'Raro', 'Rare'],
  ['very rare', 'Muito raro', 'Very rare'], ['legendary', 'Lendário', 'Legendary'], ['artifact', 'Artefato', 'Artifact'],
];
// Mesmos nomes da criação de personagem (creator/equipment-helpers.js).
const PROP_LABEL = {
  finesse: ['Acuidade', 'Finesse'], light: ['Leve', 'Light'], thrown: ['Arremesso', 'Thrown'],
  'two-handed': ['Duas Mãos', 'Two-Handed'], versatile: ['Versátil', 'Versatile'], heavy: ['Pesada', 'Heavy'],
  reach: ['Alcance', 'Reach'], ammo: ['Munição', 'Ammunition'], ammunition: ['Munição', 'Ammunition'],
  loading: ['Recarga', 'Loading'], special: ['Especial', 'Special'],
};
/** Propriedades de arma que o formulário oferece como botões (as demais são preservadas). */
export const WEAPON_PROPS = ['finesse', 'light', 'thrown', 'two-handed', 'versatile', 'heavy', 'reach', 'ammo', 'loading', 'special'];

export const typeLabel = (type, lang) => (TYPE_LABEL[type] || [type, type])[lang === 'pt' ? 0 : 1];
/** Tipo de dano na língua da tela ("piercing" → "perfurante"). */
export const dmgTypeLabel = (type, lang) => damageTypeLabel(type, lang);
/** Propriedade de arma na língua da tela ("finesse" → "Acuidade"). */
export const weaponPropLabel = (prop, lang) => {
  const row = PROP_LABEL[String(prop || '').toLowerCase()];
  return row ? pick(lang, row[0], row[1]) : (prop || '');
};
/** Raridade na língua da tela ("very rare" / "very-rare" → "Muito raro"). */
export const rarityLabel = (rarity, lang) => {
  const norm = String(rarity || '').replace(/-/g, ' ').toLowerCase();
  const r = RARITIES.find(([id]) => id === norm);
  return r ? pick(lang, r[1], r[2]) : rarity;
};

// 1 lb ≈ 0,45 kg (a conversão de mesa do livro em português).
const LB_TO_KG = 0.45;
const round1 = (n) => Math.round(n * 10) / 10;
export const lbToKg = (lb) => round1(lb * LB_TO_KG);
export const kgToLb = (kg) => round1(kg / LB_TO_KG);

/** Peso guardado em libras → "0,9 kg (2 lb)" em pt, "2 lb" em en. */
export const weightLabel = (lb, lang) => {
  if (lb == null || lb === '') return '';
  return lang === 'pt' ? `${String(lbToKg(lb)).replace('.', ',')} kg (${lb} lb)` : `${lb} lb`;
};

const text = (v, lang) => (typeof v === 'string' ? v : v?.[lang] || v?.en || v?.pt || '');

/** Item salvo → estado do formulário. Em pt o peso aparece em kg. */
export const toForm = (item, lang) => {
  const lb = item?.weight;
  const shown = lb == null || lb === '' ? '' : String(lang === 'pt' ? lbToKg(+lb) : lb);
  return {
    lang,
    name: item?.name ? text(item.name, lang) : '',
    type: item?.type || 'gear',
    weight: shown,
    // Peso original: se o campo não mudar, volta exatamente o mesmo valor em libras.
    weightOrig: { shown, lb: lb ?? '' },
    cost: item?.cost ?? '',
    description: text(item?.description, lang),
    damage: item?.weapon?.damage || '',
    dmgType: item?.weapon?.dmgType || 'slashing',
    props: [...(item?.weapon?.props || [])],
    // Campos da arma que o formulário não edita (alcance, maestria, números 2024): preservados.
    weaponExtra: (({ damage, dmgType, props, ...rest }) => rest)(item?.weapon || {}),
    ac: item?.armor?.ac ?? '',
    armorType: item?.armor?.type || (item?.type === 'shield' ? 'shield' : 'light'),
    isMagic: !!item?.magic || item?.type === 'magic',
    rarity: String(item?.magic?.rarity || 'uncommon').replace(/-/g, ' '),
    attunement: !!item?.magic?.attunement,
    // Sintonização restrita ({by}) e campos do SRD que o formulário não edita
    // (categoria, bônus, cargas, cura…): preservados ao salvar.
    attunementBy: item?.magic?.attunement && typeof item.magic.attunement === 'object' ? item.magic.attunement : null,
    magicExtra: (({ rarity, attunement, effect, ...rest }) => rest)(item?.magic || {}),
    refs: Object.fromEntries(['sourceId', 'base'].filter(k => typeof item?.[k] === 'string').map(k => [k, item[k]])),
    effect: text(item?.magic?.effect, lang),
  };
};

/** Peso digitado (kg em pt, lb em en) → libras, ou null se vazio/inválido. */
export function formWeightLb(f) {
  const raw = String(f.weight ?? '').trim().replace(',', '.');
  if (raw === '') return null;
  if (f.weightOrig && raw === String(f.weightOrig.shown) && f.weightOrig.lb !== '') return +f.weightOrig.lb;
  const n = +raw;
  if (!Number.isFinite(n) || n < 0) return null;
  return f.lang === 'pt' ? kgToLb(n) : n;
}

/** Estado do formulário → item (só inclui os blocos preenchidos). */
export const formToItem = (f) => {
  const both = (s) => (s.trim() ? { pt: s.trim(), en: s.trim() } : undefined);
  const item = { ...(f.refs || {}), name: f.name.trim(), type: f.type };
  const lb = formWeightLb(f);
  if (lb != null) item.weight = lb;
  if (f.cost !== '' && +f.cost >= 0) item.cost = +f.cost;
  if (both(f.description)) item.description = both(f.description);
  if (f.type === 'weapon' && f.damage.trim()) {
    const props = (Array.isArray(f.props) ? f.props : String(f.props || '').split(',')).map(p => p.trim()).filter(Boolean);
    item.weapon = { ...(f.weaponExtra || {}), damage: f.damage.trim(), dmgType: f.dmgType, props };
  }
  if ((f.type === 'armor' || f.type === 'shield') && f.ac !== '') {
    item.armor = { ac: Math.max(0, Math.min(30, parseInt(f.ac) || 0)), type: f.type === 'shield' ? 'shield' : f.armorType };
  }
  if (f.isMagic || f.type === 'magic') {
    item.magic = {
      ...(f.magicExtra || {}),
      rarity: f.rarity,
      attunement: f.attunement ? (f.attunementBy || true) : false,
      effect: both(f.effect) || {},
    };
  }
  return item;
};
