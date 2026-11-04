// Lógica pura dos pedidos de teste (mestre → mesa). Sem React; testável em node.
import Utils from '../../utils.js';
import { t as tr, tName } from '../../data/i18n.js';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// Atalhos de um toque do mestre (mais usados primeiro).
export const QUICK_SKILLS = ['perception', 'stealth', 'insight', 'investigation', 'athletics', 'acrobatics', 'survival', 'persuasion', 'arcana'];
export const QUICK_SAVES = ['dex', 'con', 'wis', 'str', 'int', 'cha'];

const ABBR = {
  pt: { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' },
  en: { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' },
};

export function abilityAbbr(key, lang) {
  return (ABBR[lang] || ABBR.en)[key] || key.toUpperCase();
}

// Iniciativa pedida à mesa (V8, especificação §4.6): `kind:'custom', key:'initiative'`.
// Não é 'ability' de propósito: o app de jogador de antes não acha bônus para
// 'custom' (modifierFor → null) e pede o TOTAL digitado, em vez de somar o −5 de
// um atributo "initiative" que não existe. Este app soma Utils.initiative da ficha.
export const INITIATIVE_KEY = 'initiative';
export const isInitiativeCheck = (check) => check?.kind === 'custom' && check?.key === INITIATIVE_KEY;

/** Rótulo legível do pedido: "Percepção", "Resistência de DES", "Força", "Iniciativa". */
export function checkLabel({ kind, key }, lang = 'pt') {
  if (kind === 'skill') return tName('skill', key, lang);
  if (kind === 'save') return lang === 'pt' ? `Resistência de ${abilityAbbr(key, lang)}` : `${abilityAbbr(key, lang)} save`;
  if (kind === 'ability') return tr(key, lang);
  if (kind === 'custom' && key === INITIATIVE_KEY) return lang === 'en' ? 'Initiative' : 'Iniciativa';
  return key || '';
}

/** Modificador da ficha para o teste pedido (null se não der pra calcular). */
export function modifierFor(char, { kind, key } = {}) {
  if (!char || !char.abilities) return null;
  try {
    if (kind === 'skill') return Utils.skillBonus(char, key);
    if (kind === 'save') return Utils.saveBonus(char, key);
    if (kind === 'ability') return Utils.abilityMod(char, key);
    if (kind === 'custom' && key === INITIATIVE_KEY) return Utils.initiative(char);
  } catch { /* ficha incompleta */ }
  return null;
}

/** O corpo do POST do pedido de iniciativa ("⚡ Pedir à mesa"; `targets` = userIds, [] = todos). */
export function initiativePayload(lang = 'pt', targets = []) {
  return buildCheckPayload({ kind: 'custom', key: INITIATIVE_KEY, targets }, lang);
}

/** Monta o corpo do POST de um pedido. */
export function buildCheckPayload({ kind, key, label, dc, dcHidden, advantage, targets }, lang = 'pt') {
  const dcNum = dc === '' || dc == null ? null : parseInt(dc, 10);
  return {
    kind,
    key: key || '',
    label: (label || checkLabel({ kind, key }, lang)).slice(0, 120),
    dc: Number.isNaN(dcNum) ? null : dcNum,
    dcHidden: !!dcHidden && dcNum != null && !Number.isNaN(dcNum),
    advantage: advantage || 'normal',
    targetUserIds: targets && targets.length ? targets : [],
  };
}

/**
 * Jogadores cujo personagem está a 0 PV (fazendo testes contra a morte, ou morto), pela
 * ficha que o GET do mestre traz (o combate grava o PV dele na ficha). → [{userId, name}]
 */
export function downPlayers(members) {
  return (members || [])
    .filter(m => m && m.role !== 'dm' && m.user?.id != null && m.character)
    .filter(m => {
      const d = m.character.data || m.character.summary || {};
      const hp = Number(d.currentHp);
      return d.currentHp != null && d.currentHp !== '' && Number.isFinite(hp) && hp <= 0;
    })
    .map(m => ({ userId: m.user.id, name: m.character.name || m.user.displayName || '' }));
}

/**
 * Para quem vai o pedido de teste (onda 3, E1.5c): "Todos" deixa de fora quem está a 0 PV —
 * ele não procura armadilha nem percebe nada —, e o mestre pode incluí-lo à mão
 * (`includeDown`, ou marcando o nome dele). A iniciativa vai a todos (o caído tem a vez dele
 * para os testes contra a morte). `players` = as vagas de jogador da campanha.
 * → {targets: [userId] (vazio = todos), left: [nomes de quem ficou de fora]}
 */
export function groupTargets(players, { targets = [], kind = '', key = '', includeDown = false } = {}) {
  if (targets.length) return { targets, left: [] };
  if (includeDown || (kind === 'custom' && key === INITIATIVE_KEY)) return { targets: [], left: [] };
  const down = downPlayers(players);
  if (!down.length) return { targets: [], left: [] };
  const out = new Set(down.map(d => d.userId));
  const alive = (players || []).filter(m => m && m.role !== 'dm' && m.user?.id != null && !out.has(m.user.id));
  if (!alive.length) return { targets: [], left: [] };   // todos caídos: o mestre decide (vai a todos)
  return { targets: alive.map(m => m.user.id), left: down.map(d => d.name) };
}

/** "Pipo" · "Pipo e Kaelor" · "Pipo, Kaelor e Dagna" (en: "and"). */
export function namesList(names, lang = 'pt') {
  const list = (names || []).filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'e'} ${list[list.length - 1]}`;
}

/** Resumo para o mestre: "2/3 responderam · 1 passou · 1 falhou". */
export function summarize(check) {
  const targets = check?.targets || [];
  const answered = targets.filter(t => t.response).length;
  return {
    total: targets.length,
    answered,
    waiting: targets.length - answered,
    passed: targets.filter(t => t.outcome === 'pass').length,
    failed: targets.filter(t => t.outcome === 'fail').length,
  };
}

/** Grupos para o DiceStage a partir de uma resposta rolada no servidor. */
export function responseDiceGroups(response) {
  if (!response?.rolls?.length) return [];
  return [{ die: 20, rolls: response.rolls.map(r => ({ value: r.value, kept: r.kept !== false })) }];
}
