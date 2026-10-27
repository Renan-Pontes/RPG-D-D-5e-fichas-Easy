// Lógica pura do "Atacar" sugerido (AttackResultCard). Sem React; testada em
// tests/attack-model.test.js.
//
// Fluxo: prévia do servidor (nada aplicado) → rascunho editável (d20 e dano,
// para dado físico) → o mestre toca em Aplicar → corpo do POST /action com
// EXATAMENTE os valores mostrados. Descartar só joga o rascunho fora.

const int = (v) => {
  if (v === '' || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

/** A parte entra na conta? Dano extra condicional só entra se o mestre marcar. */
export const partOn = (p) => !p?.conditional || !!p.on;

/**
 * AttackPreview (C2) → rascunho editável.
 * `conditions` (opcional): condição de cada parte do dano, alinhada com
 * preview.damage (ver damagePartConditions). Parte condicional começa DESLIGADA.
 */
export function draftFromPreview(p, { conditions = [] } = {}) {
  if (!p) return null;
  return {
    attackerId: p.attackerId,
    targetId: p.targetId,
    actionIndex: p.actionIndex ?? 0,
    actionName: p.actionName || '',
    bonus: Number(p.attackBonus) || 0,
    ac: Number(p.targetAC) || 0,
    d20: p.attackRoll != null ? String(p.attackRoll) : '',
    rolledD20: p.attackRoll ?? null,
    rolls: p.rolls || [],
    parts: (p.damage || []).map((d, i) => {
      const conditional = conditions[i] || null;
      return { dice: d.dice || '', type: d.type || '', amount: String(d.rolled ?? 0), rolled: d.rolled ?? 0, conditional, on: !conditional };
    }),
    hitOverride: null,          // null = segue a regra; true/false = palavra do mestre
    available: p.available !== false,
    unavailableReason: p.unavailableReason || null,
    rigged: !!p.rigged,
    previewCrit: !!p.crit,
    effectiveDamage: p.effectiveDamage,
    newHp: p.newHp,
    note: p.note || null,
  };
}

/**
 * Resultado do rascunho como está na tela:
 * {nat, total, hit, crit, natOne, damageTotal, valid, ruleHit}
 * Regra 5e: 20 natural acerta e é crítico; 1 natural erra; senão total ≥ CA.
 */
export function evaluateDraft(d) {
  if (!d) return null;
  const nat = int(d.d20);
  const valid = nat != null && nat >= 1 && nat <= 20;
  const total = valid ? nat + d.bonus : null;
  const crit = valid && nat === 20;
  const natOne = valid && nat === 1;
  const ruleHit = valid && (crit || (!natOne && total >= d.ac));
  const hit = d.hitOverride == null ? ruleHit : !!d.hitOverride;
  const amounts = (d.parts || []).filter(partOn).map(p => Math.max(0, int(p.amount) ?? 0));
  const damageTotal = amounts.reduce((a, b) => a + b, 0);
  const partsValid = (d.parts || []).filter(partOn).every(p => {
    const n = int(p.amount);
    return n != null && n >= 0 && n <= 9999;
  });
  return { nat, total, hit, crit, natOne, ruleHit, damageTotal, valid: valid && partsValid };
}

/** Os valores na tela mudaram em relação ao que o servidor rolou? */
export function isAdjusted(d) {
  if (!d) return false;
  if (int(d.d20) !== d.rolledD20) return true;
  if (d.hitOverride != null) return true;
  return (d.parts || []).some(p => int(p.amount) !== p.rolled);
}

/**
 * Os totais que o servidor calculou (resistências, PV novos) valem para a tela?
 * Só se nada foi ajustado e todas as partes roladas estão na conta.
 */
export function serverTotalsValid(d) {
  if (!d || isAdjusted(d)) return false;
  return (d.parts || []).every(partOn);
}

/** Dados do crítico: "1d6+2" → "2d6+2" (só para mostrar ao mestre). */
export function critDice(expr) {
  const m = String(expr || '').match(/^(\d+)d(\d+)(.*)$/);
  if (!m) return expr || '';
  return `${Number(m[1]) * 2}d${m[2]}${m[3]}`;
}

/**
 * Corpo do POST /combat/.../action para aplicar EXATAMENTE o que está na tela.
 * `force` quando a ação estava indisponível (recarga/usos) e o mestre aplicou mesmo assim.
 */
export function applyBody(d, { force = false } = {}) {
  const r = evaluateDraft(d);
  if (!r || !r.valid) return null;
  const body = {
    attackerId: d.attackerId,
    targetId: d.targetId,
    actionIndex: d.actionIndex,
    attackRoll: r.nat,
    hit: r.hit,
    crit: r.crit && r.hit,
    force: !!force || !d.available,
  };
  if (r.hit) {
    const parts = (d.parts || []).filter(partOn).map(p => ({ amount: Math.max(0, int(p.amount) ?? 0), type: p.type || 'bludgeoning' }));
    body.damage = parts.length ? parts : [{ amount: 0, type: 'bludgeoning' }];
  } else {
    body.damage = [{ amount: 0, type: (d.parts?.[0]?.type) || 'bludgeoning' }];
  }
  // Valor preparado (Ferramentas avançadas) só é gasto se o d20 mostrado é o dele.
  if (d.rigged && r.nat === d.rolledD20) body.consumeRig = true;
  return body;
}

/** Texto curto do resultado: "16 vs CA 12 — acerta, 6 perfurante". */
export function resultLine(d, { lang = 'pt', damageLabel = (t) => t } = {}) {
  const r = evaluateDraft(d);
  if (!r || r.nat == null) return '';
  const L = (pt, en) => (lang === 'en' ? en : pt);
  const head = `${r.total} ${L('vs CA', 'vs AC')} ${d.ac}`;
  if (!r.hit) return `${head} — ${r.natOne ? L('1 natural, erra', 'natural 1, miss') : L('erra', 'miss')}`;
  const dmg = (d.parts || []).filter(partOn).map(p => `${Math.max(0, int(p.amount) ?? 0)} ${damageLabel(p.type)}`.trim()).join(' + ');
  return `${head} — ${r.crit ? L('CRÍTICO', 'CRITICAL') : L('acerta', 'hit')}${dmg ? `, ${dmg}` : ''}`;
}

// ---------------------------------------------------------------------------
// Efeito com teste de resistência (sopro, magia em área): também é SUGESTÃO.
// Os alvos rolam (no app ou dado físico), o mestre confere e só então aplica.
// ---------------------------------------------------------------------------

/** Modificador de resistência do alvo (mesma regra do servidor: saves → atributo). */
export function saveModifier(target, ability) {
  const ab = String(ability || 'dex').toLowerCase();
  const stats = target?.stats || {};
  if (stats.saves && stats.saves[ab] != null && Number.isFinite(Number(stats.saves[ab]))) return Number(stats.saves[ab]);
  const score = stats.abilities?.[ab];
  if (score != null && Number.isFinite(Number(score))) return Math.floor((Number(score) - 10) / 2);
  return null; // desconhecido (o mestre digita o total)
}

/** Parte do dano que o alvo sofre: falhou = tudo; passou = metade (se a ação diz) ou nada. */
export function savePortion(full, success, half) {
  const n = Math.max(0, Number(full) || 0);
  if (!success) return n;
  return half ? Math.floor(n / 2) : 0;
}

/**
 * A salvaguarda de cada PJ PELA FICHA: {combatenteId: n} (o `saveMods` do POST
 * …/save-preview e do rascunho sem rede). O combatente do PJ guarda só os
 * atributos-base, sem o bônus de espécie nem a proficiência; a ficha da vaga
 * (campaign.members — o mestre recebe o `data` inteiro) dá o mesmo número dos
 * testes pedidos. Forma Selvagem fica de fora (a fera usa os atributos dela).
 * `modFor(char, {kind, key})` é o modifierFor de checks/check-logic.js (injeção).
 */
export function sheetSaveMods(targets, members, ability, modFor) {
  const sheets = new Map();
  for (const m of members || []) {
    if (m?.character?.id != null && m.character.data) sheets.set(String(m.character.id), m.character.data);
  }
  const key = String(ability || 'dex').toLowerCase();
  const out = {};
  for (const t of targets || []) {
    if (t?.type !== 'pc' || t.wild_shape || t.character_id == null) continue;
    const sheet = sheets.get(String(t.character_id));
    const n = sheet && typeof modFor === 'function' ? modFor(sheet, { kind: 'save', key }) : null;
    if (Number.isFinite(n)) out[t.id] = n;
  }
  return out;
}

/**
 * Rascunho do efeito. `roll(expr)` devolve o total rolado (injeção para teste);
 * `d20()` o d20 de cada alvo; `mods` a salvaguarda da ficha de cada PJ (sheetSaveMods).
 */
export function saveDraft(action, targets, { roll = () => 0, d20 = () => 10, mods = {} } = {}) {
  const save = action?.save || {};
  const ability = String(save.ability || 'dex').toLowerCase();
  const dc = Number(save.dc) || 10;
  const parts = [];
  if (action?.damage && String(action.damage) !== '0') {
    parts.push({ dice: String(action.damage), type: action.damageType || 'force', amount: String(roll(action.damage)) });
  }
  for (const ex of action?.extraDamage || []) {
    if (ex && ex.damage) parts.push({ dice: String(ex.damage), type: ex.damageType || action.damageType || 'force', amount: String(roll(ex.damage)) });
  }
  return {
    ability, dc, half: !!save.halfOnSave,
    conditions: [...(save.conditions || [])],
    parts,
    targets: (targets || []).map(t => {
      const mod = Number.isFinite(mods?.[t.id]) ? mods[t.id] : saveModifier(t, ability);
      const nat = d20();
      return { id: t.id, name: t.name, mod, d20: nat, total: mod == null ? '' : String(nat + mod), override: null };
    }),
  };
}

/**
 * Rascunho a partir da salvaguarda ROLADA NO SERVIDOR (V10, POST …/save-preview):
 * o mesmo formato de saveDraft, com o d20 de cada alvo. `server: true` diz ao
 * cartão que os dados vieram do servidor (sem rede, o cartão rola no aparelho).
 */
export function saveDraftFromPreview(p, action) {
  const save = action?.save || {};
  return {
    ability: String(p?.ability || save.ability || 'dex').toLowerCase(),
    dc: Number(p?.dc ?? save.dc) || 10,
    half: p?.half != null ? !!p.half : !!save.halfOnSave,
    conditions: [...(p?.conditions || save.conditions || [])],
    parts: (p?.damage || []).map(d => ({ dice: String(d.dice || ''), type: d.type || 'force', amount: String(d.rolled ?? 0) })),
    targets: (p?.targets || []).map(t => ({
      id: t.id, name: t.name, mod: t.modifier ?? null, d20: t.d20 ?? null,
      total: t.total == null ? '' : String(t.total), override: null,
    })),
    server: true,
  };
}

/**
 * Corpo do POST /action {action:'save_apply'} (V10): o efeito como está na tela,
 * numa chamada só (gasto da ação, dano por alvo e tipo, condições). O d20 de cada
 * alvo só vai se o total ainda é o rolado (o mestre digitou o dado físico → sem d20).
 * `show`: 1 linha-resumo na Tela ("Sopro de Fogo · DES CD 13 · Dagna 9 ✗ · …").
 */
export function saveApplyBody(d, { attackerId, actionIndex, consume = false, force = false, show = false } = {}) {
  const results = evaluateSave(d);
  return {
    action: 'save_apply', attackerId, actionIndex, consume: !!consume, force: !!force, show: !!show,
    targets: results.map((r, i) => {
      const t = d.targets[i] || {};
      const rolled = t.d20 != null && t.mod != null && r.total === t.d20 + t.mod && t.override == null;
      return { id: r.id, total: r.total, success: r.success, damage: r.damage, conditions: r.conditions,
        d20: rolled ? t.d20 : null };
    }),
  };
}

/** Resultado por alvo: {id, name, total, success, damage: [{amount, type}], conditions}. */
export function evaluateSave(d) {
  if (!d) return [];
  return d.targets.map(t => {
    const total = t.total === '' || t.total == null ? null : parseInt(t.total, 10);
    const known = Number.isFinite(total);
    const success = t.override != null ? !!t.override : (known ? total >= d.dc : false);
    const damage = d.parts.map(p => ({ amount: savePortion(parseInt(p.amount, 10) || 0, success, d.half), type: p.type }))
      .filter(p => p.amount > 0);
    return { id: t.id, name: t.name, total: known ? total : null, success, damage, conditions: success ? [] : d.conditions };
  });
}

/**
 * Chamadas para aplicar o efeito como está na tela, na ordem:
 * gasto da ação (recarga/usos/lendária) → dano por alvo e tipo → condições.
 */
export function saveApplyOps(d, { attackerId, actionIndex, consume = false, force = false } = {}) {
  const ops = [];
  if (consume) ops.push({ action: 'use_action', attackerId, actionIndex, force: !!force });
  for (const r of evaluateSave(d)) {
    for (const p of r.damage) ops.push({ action: 'damage', targetId: r.id, amount: p.amount, damageType: p.type });
    for (const c of r.conditions) ops.push({ action: 'add_condition', targetId: r.id, condition: c });
  }
  return ops;
}
