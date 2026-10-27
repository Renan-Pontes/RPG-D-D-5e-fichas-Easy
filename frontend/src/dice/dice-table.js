// O 🎲 do mestre na mesa (V10, especificação §5.4): "🔒 Só eu · 📺 Na tela".
//
// O rolador (components/DiceRoller.jsx) é um só para o app inteiro e não sabe em
// que campanha está. A casca da campanha do MESTRE (CampaignDetail) diz aqui qual
// é a campanha e a regra "Do mestre" do palco (`stage.prefs.dm`); fora dela o
// rolador continua rolando no aparelho, como sempre.
//   · 📺 Na tela → POST /api/dice/roll {campaignId, groups, modifier, adv, label,
//     table:true}: o servidor rola (dados preparados valem), grava o DiceLog e a
//     linha pública da Tela ("Mestre");
//   · 🔒 Só eu → o mesmo POST com table:false: DiceLog + a linha privada (fica no
//     registro dele, nunca na TV);
//   · sem resposta em 1,5 s (sem rede): rola no aparelho e avisa "não foi à Tela".
// A escolha fica lembrada por campanha (`forja:dm-dice-target:<id>`).
// Lógica pura aqui (sem React); testada em tests/dice-table.test.js.

export const TARGET_TIMEOUT_MS = 1500;
const MAX_GROUP = 20;
const MAX_DICE = 40;
const MAX_GROUPS = 6;
const SERVER_DICE = [4, 6, 8, 10, 12, 20, 100];

// "Para quê?" (o rótulo da rolagem na Tela)
export const PURPOSES = [
  ['attack', 'Ataque', 'Attack'],
  ['damage', 'Dano', 'Damage'],
  ['save', 'Salvaguarda', 'Save'],
  ['luck', 'Sorte', 'Luck'],
];
export function purposeLabel(key, lang = 'pt') {
  const p = PURPOSES.find(x => x[0] === key);
  return p ? (lang === 'en' ? p[2] : p[1]) : '';
}

let current = null;
const subs = new Set();

/** A casca do mestre abre/troca a campanha: {campaignId, dmDefault:'secret'|'shown'}. */
export function setDiceTable(ctx) {
  current = ctx && ctx.campaignId != null ? { ...ctx } : null;
  subs.forEach(fn => { try { fn(current); } catch { /* ok */ } });
}
/** Sai da campanha (só limpa se ainda é ela). */
export function clearDiceTable(campaignId) {
  if (current && String(current.campaignId) === String(campaignId)) setDiceTable(null);
}
export const getDiceTable = () => current;
export function subscribeDiceTable(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export const targetKey = (campaignId) => `forja:dm-dice-target:${campaignId}`;
/** 'shown' | 'secret': o lembrado no aparelho; senão a regra "Do mestre" do palco. */
export function readTarget(ctx, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!ctx) return 'secret';
  try {
    const v = storage?.getItem(targetKey(ctx.campaignId));
    if (v === 'shown' || v === 'secret') return v;
  } catch { /* sem armazenamento: a regra do palco */ }
  return ctx.dmDefault === 'shown' ? 'shown' : 'secret';
}
export function writeTarget(ctx, value, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!ctx) return;
  try { storage?.setItem(targetKey(ctx.campaignId), value); } catch { /* ok */ }
}

/**
 * A fórmula (dice-math parseFormula) nos grupos do servidor:
 * [{diceType:'d8', count, sign}] — ou null se o servidor não aceita (mais de 20
 * dados num grupo, mais de 40 no total, mais de 6 grupos, dado fora da lista).
 */
export function serverGroups(parsed) {
  const terms = parsed?.terms || [];
  if (!terms.length || terms.length > MAX_GROUPS) return null;
  let n = 0;
  const out = [];
  for (const t of terms) {
    if (!SERVER_DICE.includes(t.sides) || t.count < 1 || t.count > MAX_GROUP) return null;
    n += t.count;
    out.push({ diceType: `d${t.sides}`, count: t.count, sign: t.sign < 0 ? -1 : 1 });
  }
  return n > MAX_DICE ? null : out;
}

/** Corpo do POST /api/dice/roll para a fórmula. */
export function rollBody(ctx, parsed, { label = '', adv = 'normal', shown = false } = {}) {
  const groups = serverGroups(parsed);
  if (!ctx || !groups) return null;
  const single = groups.length === 1 && groups[0].count === 1 && groups[0].diceType === 'd20';
  const body = { campaignId: ctx.campaignId, groups, modifier: parsed.mod || 0, label: String(label || parsed.text || '').slice(0, 120), table: !!shown };
  if (single && (adv === 'adv' || adv === 'dis')) body.adv = adv;
  return body;
}

/** Os valores que o servidor rolou, na ordem, para o rolador desenhar (rollFormula `preset`). */
export function presetFromServer(res) {
  return (res?.results || []).map(r => Number(r.value)).filter(Number.isFinite);
}
