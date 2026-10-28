// As ações da cena agora (V7), usadas pela Agora, pela folha Começar a sessão e pelos chips
// das cenas do plano. Cola entre a API e os avisos: a lógica fica em now-model.js.
//   beginScene      ▶ Começar esta cena (POST /stage/scene) com o aviso
//                   "Cena começou · Na tela: Ponte velha · ↶ Desfazer"
//   addSceneAndBegin "＋ Cena agora" / "Outra…": cria a cena no plano e já começa
//   clearSceneNow    "Ainda não sei" / a última cena feita: nenhuma cena agora
//   setSceneDone     ✓ feita / ↺ não feita (o plano, só a chave das cenas)
//   loadRecap        o resumo salvo de uma sessão (1 GET, sob demanda)
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { freshSceneId, normalizePlan } from '../prep/next-session.js';
import { saveSessionPlan } from '../world/world-api.js';
import { STAGE_SENDING_EVENT, STAGE_SENT_EVENT, startSceneOnStage, undoSceneStart } from '../stage/stage-api.js';
import { flash } from './flash.js';
import { patchState } from './play-api.js';
import { sceneName } from './now-model.js';

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
 * opts: {show?, focus?, log?, quiet?} → a resposta (com `undo`) ou null se falhou.
 */
export async function beginScene(campaign, scene, { lang = 'pt', show, focus, log, quiet = false, onDone } = {}) {
  if (!campaign?.id || !scene?.id) return null;
  const body = { sceneId: scene.id, log: log ?? readLogRoom(campaign.id) };
  if (typeof show === 'boolean') body.show = show;
  if (focus === false) body.focus = false;
  emit(STAGE_SENDING_EVENT, { campaignId: campaign.id });
  try {
    const r = await startSceneOnStage(campaign.id, body, {
      name: sceneName(scene), prevScene: campaign.state?.scene || '', show: show ?? legacyShow(scene),
    });
    const name = r?.scene || sceneName(scene);
    const label = r?.shown ? L(lang, `Cena começou · Na tela: ${name}`, `Scene started · On screen: ${name}`) : L(lang, `Cena começou: ${name}`, `Scene started: ${name}`);
    emit(STAGE_SENT_EVENT, { campaignId: campaign.id, ok: true, label: r?.shown ? L(lang, 'Na tela ✓', 'On screen ✓') : L(lang, 'Cena começou ✓', 'Scene started ✓'), name });
    if (!quiet) {
      flash(label, {
        action: r?.undo ? {
          label: L(lang, '↶ Desfazer', '↶ Undo'),
          onClick: async () => {
            try { await undoSceneStart(campaign.id, r.undo); onDone?.(); }
            catch (e) { flash(`${L(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); }
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
      action: retry ? { label: L(lang, 'Tentar de novo', 'Try again'), onClick: () => beginScene(campaign, scene, { lang, show, focus, log, quiet, onDone }) } : null,
    });
    return null;
  }
}

/** Cria a cena (só o nome) no fim do plano e já começa. → a resposta do começo, ou null. */
export async function addSceneAndBegin(campaign, plan, name, opts = {}) {
  const text = String(name || '').trim().slice(0, 1000);
  if (!text) return null;
  const cur = normalizePlan(plan);
  const id = freshSceneId(cur.scenes);
  let saved;
  try {
    saved = normalizePlan(await saveSessionPlan(campaign.id, { scenes: [...cur.scenes, { id, text, nodeRef: null, done: false }] }));
  } catch (e) {
    flash(`${L(opts.lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, opts.lang)}`, { error: true });
    return null;
  }
  const scene = saved.scenes.find(s => s.id === id) || { id, text };
  return beginScene(campaign, scene, opts);
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
export async function loadRecap(campaignId, session) {
  const r = await api.listDiary(campaignId, { subtype: 'summary', limit: 20 });
  const list = (r.entries || []).filter(e => e.subtype === 'summary');
  const hit = session ? list.find(e => Number(e.session) === Number(session)) : list[0];
  return hit ? { has: true, id: hit.id, title: hit.title || '', text: hit.body || '' } : { has: false };
}
