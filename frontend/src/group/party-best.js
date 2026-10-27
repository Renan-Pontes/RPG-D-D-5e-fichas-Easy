// O pedaço do Raio-X que os ganchos da mesa usam a toda hora (folha Pedir teste: "melhor:
// Pipo +7 · 65%"): só a ficha (Utils.skillBonus / saveBonus) e as chances — sem o resto
// das contas (party-metrics.js, que traz as etiquetas das magias e só carrega no Raio-X).
// party-metrics.js reexporta tudo daqui. Testado em tests/spotlights.test.js.
import Utils from '../../utils.js';

export const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || String(n || '');
/** Chance de passar num teste de bônus `b` contra a CD (o 1 natural não falha teste). */
export const chance = (b, dc) => clamp(0.05, 1, (21 + b - dc) / 20);
/** "Pelo menos 1 passa se todos tentarem": 1 − Π(1 − chance). */
export const groupChance = (bonuses, dc) => 1 - bonuses.reduce((p, b) => p * (1 - chance(b, dc)), 1);
export const pct = (p) => Math.round(p * 100);
const safe = (fn, fb = null) => { try { const v = fn(); return v ?? fb; } catch { return fb; } };

/**
 * O melhor da mesa numa perícia (`kind` 'skill') ou salvaguarda ('save') e a chance dele na
 * CD. Aceita os membros da campanha (members[].character.data, que o mestre recebe) ou a
 * lista de partyMembers ({id, name, data}). null sem ninguém com ficha.
 */
export function bestAt(list, kind, key, dc = 15) {
  const rows = (list || []).map(x => (x?.character
    ? (x.role === 'dm' || !x.character.data ? null : { id: x.character.id, name: x.character.name || x.character.data.name || '?', data: x.character.data })
    : x)).filter(x => x?.data);
  if (!rows.length) return null;
  const vals = rows.map(p => ({
    id: p.id, name: p.name,
    b: safe(() => (kind === 'save' ? Utils.saveBonus(p.data, key) : Utils.skillBonus(p.data, key)), 0) || 0,
  }));
  const best = Math.max(...vals.map(v => v.b));
  const who = vals.filter(v => v.b === best);
  return { best, who: who.map(v => v.name), whoIds: who.map(v => v.id), p: pct(chance(best, dc)), group: pct(groupChance(vals.map(v => v.b), dc)), dc };
}
