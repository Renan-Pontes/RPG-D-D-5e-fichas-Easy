// As ações da cena agora (V7), usadas pela Agora, pela folha Começar a sessão e pelos chips
// das cenas do plano. Cola entre a API e os avisos: a lógica fica em now-model.js.
//   beginScene      ▶ Começar esta cena (POST /stage/scene) com o aviso
//                   "Cena começou · Na tela: Ponte velha · ↶ Desfazer"
//   addScene         "Outra…" com o "Anteriormente em…" antes: só cria a cena no plano
//   addSceneAndBegin "＋ Cena agora" / "Outra…": cria a cena no plano e já começa
//   clearSceneNow    "Ainda não sei" / a última cena feita: nenhuma cena agora
//   setSceneDone     ✓ feita / ↺ não feita (o plano, só a chave das cenas)
//   loadRecap        o resumo salvo de uma sessão (1 GET, sob demanda)
//   announceRecap    o resumo acabou de ser salvo (RecapEditor): a Agora (J1/J2/J3) e a folha
//                    Começar sabem sem ler de novo (evento RECAP_EVENT)
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { freshSceneId, normalizePlan } from '../prep/next-session.js';
import { saveSessionPlan } from '../world/world-api.js';
import { STAGE_SENDING_EVENT, STAGE_SENT_EVENT, startSceneOnStage, undoSceneStart } from '../stage/stage-api.js';
import { flash } from './flash.js';
import { patchState } from './play-api.js';
import { legacyDoneId, sceneName } from './now-model.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const filled = (s) => typeof s === 'string' && s.trim().length > 0;
const LOG_KEY = (id) => `forja.play.logRoom.${id}`;

/** "Registrar na Crônica" a entrada na sala da cena ligada (lembrado no aparelho; padrão sim). */
export function readLogRoom(campaignId) {
  try { return localStorage.getItem(LOG_KEY(campaignId)) !== '0'; } catch { return true; }
}
export function writeLogRoom(campaignId, on) {
  try { localStorage.setItem(LOG_KEY(campaignId), on ? '1' : '0'); } catch { /* ok */ }
}

function emit(name, detail) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch { /* ok */ }
}

/** O que o servidor antigo precisa saber para mostrar a cena (o novo decide sozinho). */
function legacyShow(scene) {
  if (!scene || scene.showOnStart === false) return false;
  return !!(scene.nodeRef || filled(scene.read) || scene.show);
}

/**
 * ▶ Começar esta cena. `scene` = a cena do plano (para o nome e o servidor antigo).
 * opts: {show?, focus?, log?, quiet?, plan?, prevId?} → a resposta (com `undo`) ou null se
 * falhou. `plan` e `prevId` (a cena que estava "agora") servem ao servidor antigo: lá o
 * fallback só grava o nome, e a cena de antes é marcada feita daqui (o ↶ desmarca).
 */
export async function beginScene(campaign, scene, opts = {}) {
  const { lang = 'pt', show, focus, log, quiet = false, onDone, plan = null, prevId } = opts;
  if (!campaign?.id || !scene?.id) return null;
  const body = { sceneId: scene.id, log: log ?? readLogRoom(campaign.id) };
  if (typeof show === 'boolean') body.show = show;
  if (focus === false) body.focus = false;
  emit(STAGE_SENDING_EVENT, { campaignId: campaign.id });
  try {
    const r = await startSceneOnStage(campaign.id, body, {
      name: sceneName(scene), prevScene: campaign.state?.scene || '', show: show ?? legacyShow(scene),
    });
    const doneId = r?.legacy && plan ? legacyDoneId(plan, campaign.state, scene.id, prevId) : null;
    if (doneId) {
      try {
        r.plan = await setSceneDone(campaign, plan, doneId, true);
        r.doneId = doneId;
        r.undo = { ...r.undo, doneId };
      } catch { /* a cena começou; o ✓ da de antes fica para o chip */ }
    }
    const name = r?.scene || sceneName(scene);
    // a entrada na sala da cena ligada foi para a Crônica (o ↶ tira junto)
    const logged = r?.undo?.room?.diaryId ? L(lang, ' · Registrado na Crônica', ' · Logged to the Chronicle') : '';
    const label = (r?.shown ? L(lang, `Cena começou · Na tela: ${name}`, `Scene started · On screen: ${name}`) : L(lang, `Cena começou: ${name}`, `Scene started: ${name}`)) + logged;
    emit(STAGE_SENT_EVENT, { campaignId: campaign.id, ok: true, label: r?.shown ? L(lang, 'Na tela ✓', 'On screen ✓') : L(lang, 'Cena começou ✓', 'Scene started ✓'), name });
    if (!quiet) {
      flash(label, {
        action: r?.undo ? {
          label: L(lang, '↶ Desfazer', '↶ Undo'),
          onClick: async () => {
            try {
              await undoSceneStart(campaign.id, r.undo);
              if (r.undo.legacy && r.undo.doneId) await setSceneDone(campaign, r.plan || plan, r.undo.doneId, false);
              onDone?.();
            } catch (e) { flash(`${L(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); }
          },
        } : null,
      });
    }
    onDone?.(r);
    return r;
  } catch (e) {
    emit(STAGE_SENT_EVENT, { campaignId: campaign.id, ok: false });
    const retry = !e?.status || e.status >= 500;
    flash(`${L(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, {
      error: true,
      action: retry ? { label: L(lang, 'Tentar de novo', 'Try again'), onClick: () => beginScene(campaign, scene, opts) } : null,
    });
    return null;
  }
}

/** Cria a cena (só o nome) no fim do plano, sem começar. → {plan, scene} ou null (com o aviso). */
export async function addScene(campaign, plan, name, { lang = 'pt' } = {}) {
  const text = String(name || '').trim().slice(0, 1000);
  if (!text) return null;
  const cur = normalizePlan(plan);
  const id = freshSceneId(cur.scenes);
  try {
    const saved = normalizePlan(await saveSessionPlan(campaign.id, { scenes: [...cur.scenes, { id, text, nodeRef: null, done: false }] }));
    return { plan: saved, scene: saved.scenes.find(s => s.id === id) || { id, text } };
  } catch (e) {
    flash(`${L(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true });
    return null;
  }
}

/** Cria a cena (só o nome) no fim do plano e já começa. → a resposta do começo, ou null. */
export async function addSceneAndBegin(campaign, plan, name, opts = {}) {
  const made = await addScene(campaign, plan, name, opts);
  return made ? beginScene(campaign, made.scene, { ...opts, plan: made.plan }) : null;
}

/** Nenhuma cena agora (a cena da sessão anterior não sobra na capa). */
export async function clearSceneNow(campaign) {
  const patch = { scene: '' };
  // o sceneId só existe num servidor que o aceita (o antigo recusaria a chave)
  if (campaign?.state && 'sceneId' in campaign.state) patch.sceneId = null;
  return patchState(campaign.id, patch);
}

/** ✓ Cena feita / ↺ não feita: grava a lista das cenas (o servidor junta os bolsos pelo id). → plano */
export async function setSceneDone(campaign, plan, sceneId, done) {
  const cur = normalizePlan(plan);
  const scenes = cur.scenes.map(s => (s.id === sceneId ? { ...s, done: !!done } : s));
  return normalizePlan(await saveSessionPlan(campaign.id, { scenes }));
}

/**
 * O resumo salvo ("Resumo da sessão", subtype 'summary') da sessão `session`: {has, title,
 * text, id}. Sem número, o mais novo. 1 GET (só os resumos), sob demanda.
 */
export const RECAP_EVENT = 'forja:recap';
export function announceRecap(campaignId, session, recap) {
  try { window.dispatchEvent(new CustomEvent(RECAP_EVENT, { detail: { campaignId, session, recap } })); } catch { /* ok */ }
}

export async function loadRecap(campaignId, session) {
  const r = await api.listDiary(campaignId, { subtype: 'summary', limit: 20 });
  const list = (r.entries || []).filter(e => e.subtype === 'summary');
  const hit = session ? list.find(e => Number(e.session) === Number(session)) : list[0];
  return hit ? { has: true, id: hit.id, title: hit.title || '', text: hit.body || '' } : { has: false };
}
