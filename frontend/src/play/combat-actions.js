// As ações rápidas do combate (V8) com a ponte para o servidor ainda não atualizado.
// O app novo chega à Vercel antes de o PythonAnywhere ser atualizado: rota nova
// que dá 404 em HTML (isOldServer) ou ação nova recusada com 400
// `invalid_action_type` caem no caminho de antes, nunca quebram a tela.
//   startEncounter  POST …/encounter (1 chamada)   → antigo: 1 POST por combatente
//   applyHp         damage/heal/temp_hp/hp_many    → antigo: damage/heal (+ PUT temp_hp)
//   undoHp          POST …/undo                     (só quando o servidor devolveu o opId)
//   sceneAsMap      POST …/map-from                 → antigo: baixa a imagem e reenvia
//   legacyStart     (só antigo) as respostas da iniciativa na ordem + o /start de antes
import { api } from '../api/client.js';
import { isOldServer } from '../api/errors.js';
import { initiativePayload } from '../checks/check-logic.js';
import { initiativeRows, legacyBodies, legacyReadds, openInitiativeCheck, pickInitiatives } from '../combat/encounter-setup.js';

const refused = (e) => e?.status === 400 && e?.data?.error === 'invalid_action_type';

/**
 * Monta o combate. `body`: encounterBody(); `legacy`: {groups, members, combatants, map,
 * image?, askTargets?} para o caminho de antes. → {combat, check?, legacy?: true}
 */
export async function startEncounter(campaignId, body, legacy = {}) {
  try {
    return await api.combatEncounter(campaignId, body);
  } catch (e) {
    if (!isOldServer(e)) throw e;
  }
  // Servidor antigo: Trocar = tirar os monstros um a um; casas livres somadas aqui.
  let combatants = legacy.combatants || [];
  if (body.mode === 'replace' && (body.monsters || []).length) {
    for (const c of combatants.filter(x => x.type === 'monster')) {
      // eslint-disable-next-line no-await-in-loop
      await api.removeCombatant(campaignId, c.id);
    }
    combatants = combatants.filter(x => x.type !== 'monster');
  }
  const bodies = legacyBodies({
    groups: legacy.groups || [], members: body.pcs ? (legacy.members || []) : [], combatants, map: legacy.map || {}, lang: body.lang,
  });
  let last = null;
  for (const b of bodies) {
    // eslint-disable-next-line no-await-in-loop
    last = await api.addCombatant(campaignId, b);
  }
  if (body.map && body.map !== 'none' && legacy.image) await legacySetMap(campaignId, legacy.image).catch(() => {});
  let check = null;
  if (body.askInitiative) {
    const r = await api.createCheck(campaignId, initiativePayload(body.lang, legacy.askTargets || [])).catch(() => null);
    check = r?.check || null;
  }
  if (body.start) last = await api.startCombat(campaignId);
  const combat = last?.combat || (await api.getCombat(campaignId))?.combat;
  return { combat, check, legacy: true };
}

/**
 * ▶ Iniciar / "Usar e começar" num servidor de antes do /encounter: as respostas do teste de
 * iniciativa aberto (`initiatives`, ou lidas do teste aberto agora) entram na ordem tirando e
 * pondo de novo cada personagem (o PUT antigo não reordena; o POST reordena a lista inteira),
 * o teste fecha e o combate começa. `combat`/`check` já lidos poupam os GETs. → {combat}
 */
export async function legacyStart(campaignId, { combat = null, check, initiatives = null } = {}) {
  const cb = combat || (await api.getCombat(campaignId))?.combat;
  let chk = check;
  if (chk === undefined) chk = openInitiativeCheck((await api.listChecks(campaignId).catch(() => null))?.checks || []);
  const list = initiatives || pickInitiatives(initiativeRows(cb, chk)).initiatives;
  for (const { id, body } of legacyReadds(cb, list)) {
    // eslint-disable-next-line no-await-in-loop
    await api.removeCombatant(campaignId, id);
    // eslint-disable-next-line no-await-in-loop
    await api.addCombatant(campaignId, body);
  }
  if (chk) await api.closeCheck(chk.id).catch(() => {});
  return api.startCombat(campaignId);
}

/**
 * PV de um ou mais alvos. `targets`: [{id, amount}] · `op`: 'damage'|'heal'|'temp'.
 * → {combat, result, opId?} (opId só volta do servidor novo: aí existe o ↶ Desfazer).
 */
export async function applyHp(campaignId, { op = 'damage', targets = [], damageType = 'bludgeoning', opId, combat = null }) {
  if (targets.length > 1) {
    try {
      return await api.combatAction(campaignId, { action: 'hp_many', op, damageType, targets, opId });
    } catch (e) {
      if (!refused(e)) throw e;
    }
    let last = null;
    for (const t of targets) {
      // eslint-disable-next-line no-await-in-loop
      last = await legacyOne(campaignId, { op, target: t, damageType, combat });
    }
    return { ...last, opId: undefined };
  }
  const [t] = targets;
  if (!t) return null;
  const action = op === 'heal' ? 'heal' : op === 'temp' ? 'temp_hp' : 'damage';
  try {
    return await api.combatAction(campaignId, { action, targetId: t.id, amount: t.amount, damageType, opId });
  } catch (e) {
    if (!(op === 'temp' && refused(e))) throw e;
  }
  return legacyOne(campaignId, { op, target: t, damageType, combat });
}

async function legacyOne(campaignId, { op, target, damageType, combat }) {
  if (op === 'temp') {
    // + Temp no servidor antigo: o PUT do combatente (PV temporário não soma: fica o maior)
    const cur = (combat?.combatants || []).find(c => c.id === target.id);
    const temp = Math.max(Number(cur?.temp_hp) || 0, target.amount);
    return api.updateCombatant(campaignId, target.id, { temp_hp: temp });
  }
  return api.combatAction(campaignId, op === 'heal'
    ? { action: 'heal', targetId: target.id, amount: target.amount }
    : { action: 'damage', targetId: target.id, amount: target.amount, damageType });
}

/** ↶ Desfazer: a foto de antes de volta. 409 `changed_since` → quem chama diz "Mudou depois". */
export function undoHp(campaignId, opId) {
  return api.combatUndo(campaignId, opId);
}

/**
 * A imagem da sala (ou do cartão) como mapa do combate. `image`: a data URL que a
 * tela já tem, usada só no servidor antigo (que precisa recebê-la de novo).
 */
export async function sceneAsMap(campaignId, ref, image = null) {
  try {
    return await api.combatMapFrom(campaignId, ref);
  } catch (e) {
    if (!isOldServer(e) || !image) throw e;
  }
  return legacySetMap(campaignId, image);
}

function legacySetMap(campaignId, image) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => api.setCombatMap(campaignId, { background_image: image, width_px: img.width, height_px: img.height }).then(resolve, reject);
    img.onerror = () => reject(new Error('image'));
    img.src = image;
  });
}
