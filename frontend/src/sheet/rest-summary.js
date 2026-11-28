import Utils from '../../utils.js';
import { restResources } from '../progression/resources.js';
import { exhaustionLevel } from './hp-logic.js';

export function buildRestSummary(char, type, lang = 'pt') {
  const pt = lang === 'pt';
  const maxHp = char?.maxHp || 0;
  const curHp = char?.currentHp || 0;
  const hpHeal = type === 'long' ? Math.max(0, maxHp - curHp) : 0;

  const pact = Utils.pactSlots ? Utils.pactSlots(char) : [];
  const used = char?.spellSlotsUsed || [];
  let slotsRestored = 0;
  if (type === 'long') {
    slotsRestored = used.reduce((s, n) => s + Math.max(0, n || 0), 0);
  } else {
    if (char?.className === 'warlock' && !Utils.isMulticlass(char)) {
      slotsRestored = used.reduce((s, n) => s + Math.max(0, n || 0), 0);
    } else {
      slotsRestored = pact.reduce((s, p, i) => s + Math.min(p || 0, used[i] || 0), 0);
    }
  }

  let hitDiceRestored = 0;
  if (type === 'long' && (char?.hitDiceUsed || 0) > 0) {
    hitDiceRestored = char?.rulesVersion === '2024'
      ? (char.hitDiceUsed || 0)
      : Math.min(char.hitDiceUsed || 0, Math.max(1, Math.floor((char?.level || 1) / 2)));
  }

  const prevRes = char?.resourcesUsed || {};
  const nextRes = restResources(char, type).resourcesUsed || {};
  let resourcesRestored = 0;
  for (const [k, v] of Object.entries(prevRes)) {
    if ((v || 0) > (nextRes[k] || 0)) resourcesRestored += 1;
  }

  const exhaustionDrop = type === 'long' && exhaustionLevel(char) > 0 ? 1 : 0;
  const freeShort = Object.keys(char?.freeCastsShort || {}).length;
  const freeLong = type === 'long' ? Object.keys(char?.freeCasts || {}).length : 0;

  const lines = [];
  if (hpHeal > 0) lines.push(pt ? `+${hpHeal} PV (máximo ${maxHp})` : `+${hpHeal} HP (full ${maxHp})`);
  if (slotsRestored > 0) lines.push(pt ? `${slotsRestored} espaço${slotsRestored > 1 ? 's' : ''} de magia` : `${slotsRestored} spell slot${slotsRestored > 1 ? 's' : ''}`);
  if (hitDiceRestored > 0) lines.push(pt ? `${hitDiceRestored} Dado${hitDiceRestored > 1 ? 's' : ''} de Vida` : `${hitDiceRestored} Hit Di${hitDiceRestored > 1 ? 'ce' : 'e'}`);
  if (resourcesRestored > 0) lines.push(pt ? `${resourcesRestored} recurso${resourcesRestored > 1 ? 's' : ''} de classe/talento` : `${resourcesRestored} class/feat resource${resourcesRestored > 1 ? 's' : ''}`);
  if (freeShort + freeLong > 0) lines.push(pt ? `${freeShort + freeLong} uso(s) grátis de magia` : `${freeShort + freeLong} free spell cast(s)`);
  if (exhaustionDrop > 0) lines.push(pt ? 'Exaustão −1' : 'Exhaustion −1');

  return { lines, hpHeal, slotsRestored, hitDiceRestored, resourcesRestored, exhaustionDrop };
}
