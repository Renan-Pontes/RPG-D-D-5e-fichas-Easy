// API do palco da Tela (V3). É o ÚNICO lugar do app que fala com o palco e com
// o `screen-card` antigo (tests/stage-api-calls.test.js confere): os 9 pontos de
// "mostrar" (Jogar › Tela, Agora, Mundo, editor do cartão, mapa do Mundo,
// Conduzir, Crônica, 📺 do cabeçalho e Testes) passam por aqui e todos dão o
// mesmo aviso: "Enviando…" → "Na tela ✓ · ↶ Desfazer" (ou "Não enviado ·
// Tentar de novo").
//
//   POST /api/campaigns/:id/stage {op, target?, focus?, caption?} → {stage, changed}
//     show (target) · back (✕ tira a frente) · clear (🧹 frente + teste) · undo (↶)
//     dark {on} (◐/◑) · bg {bg:'auto'|'map'} · prefs {prefs}
//   POST /api/checks/:id/screen {show}   o teste na Tela (sobreposição)
//
// Cada resposta boa avisa a casca (evento `forja:stage`), para Jogar › Tela e o
// 📺 do cabeçalho mostrarem o palco novo sem esperar o próximo poll.
import { request } from '../api/client.js';
import { errorText } from '../api/errors.js';
import { flash } from '../play/flash.js';

const cid = (id) => encodeURIComponent(id);
const L = (lang, pt, en) => (lang === 'en' ? en : pt);
export const STAGE_EVENT = 'forja:stage';
// "Enviando…" na barra da mesa (V4): sai antes de cada envio dos 9 lugares.
export const STAGE_SENDING_EVENT = 'forja:stage-sending';

function emit(campaignId, stage) {
  if (!stage || typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(STAGE_EVENT, { detail: { campaignId, stage } })); } catch { /* ok */ }
}

/** Um op do palco. → {stage, changed} */
export async function stageOp(campaignId, body) {
  const r = await request(`/api/campaigns/${cid(campaignId)}/stage`, { method: 'POST', body });
  emit(campaignId, r?.stage);
  return r;
}

/**
 * Mostra algo na Tela. target:
 *   {kind:'card', entryId, secretIds?} · {kind:'image', ref:{entryId}|{mapOf}|{advId,nodeId}}
 *   {kind:'scene', sceneId} | {kind:'scene', advId, nodeId} · {kind:'text', text} · {kind:'recap', title, text}
 * opts: {focus:false} guarda para depois do combate; {caption} legenda do "só a imagem".
 */
export function showOnStage(campaignId, target, { focus = true, caption } = {}) {
  const body = { op: 'show', target };
  if (focus === false) body.focus = false;
  if (caption) body.caption = caption;
  return stageOp(campaignId, body);
}
export const stageBack = (campaignId) => stageOp(campaignId, { op: 'back' });
export const stageClear = (campaignId) => stageOp(campaignId, { op: 'clear' });
export const stageUndo = (campaignId) => stageOp(campaignId, { op: 'undo' });
export const stageDark = (campaignId, on = true) => stageOp(campaignId, { op: 'dark', on });
export const stageBg = (campaignId, bg) => stageOp(campaignId, { op: 'bg', bg });
export const stagePrefs = (campaignId, prefs) => stageOp(campaignId, { op: 'prefs', prefs });

/** O teste na Tela (sobreposição). → {check} */
export function showCheckOnStage(checkId, show) {
  return request(`/api/checks/${checkId}/screen`, { method: 'POST', body: { show } });
}

/**
 * Compatibilidade: o POST /screen-card antigo (o servidor o traduz para o palco).
 * card: {type:'entry', entryId, secretIds?} | {type:'recap', title, text} | {type:'scene', adventureId, nodeId} | null.
 * Prefira showOnStage.
 */
export function setScreenCard(campaignId, card) {
  return request(`/api/campaigns/${cid(campaignId)}/screen-card`, { method: 'POST', body: card ? card : { card: null } });
}

/** O que a TV pública lê (sem login). */
export function getScreen(token) {
  return request(`/api/screen/${encodeURIComponent(token)}`);
}

export function rotateScreenToken(campaignId) {
  return request(`/api/campaigns/${cid(campaignId)}/rotate-screen-token`, { method: 'POST' });
}

const STAGE_ERRORS = {
  entry_hidden: ['Cartão oculto: escolha "Só a imagem" ou revele antes.', 'Hidden card: pick "Image only" or reveal it first.'],
  handout_private: ['Documento só para alguns jogadores: não vai à Tela.', "Handout for some players only: it can't go on screen."],
  no_image: ['Este cartão não tem imagem.', 'This card has no image.'],
  empty_text: ['Escreva o texto antes de mostrar.', 'Write the text before showing it.'],
  text_too_long: ['Texto longo demais (máx. 1000 caracteres).', 'Text too long (max 1000 characters).'],
  caption_too_long: ['Legenda longa demais (máx. 140 caracteres).', 'Caption too long (max 140 characters).'],
  empty_recap: ['Escreva o resumo antes de mostrar.', 'Write the recap before showing it.'],
  scene_not_found: ['Essa cena não existe mais.', 'That scene no longer exists.'],
  entry_not_found: ['Esse cartão não existe mais.', 'That card no longer exists.'],
  empty_scene: ['A cena ainda não tem nome.', "The scene doesn't have a name yet."],
};

/** Texto do erro do palco (cai no texto geral do app). */
export function stageErrorText(e, lang = 'pt') {
  const code = e?.data?.error;
  const pair = STAGE_ERRORS[code];
  if (pair) return L(lang, pair[0], pair[1]);
  const shared = errorText(code, lang === 'en' ? 'en' : 'pt');
  if (shared) return shared;
  return L(lang, 'Não enviado. Confira a conexão.', 'Not sent. Check the connection.');
}

/**
 * Envia para a Tela com o aviso padrão dos 9 lugares:
 *   "Enviando…" → "Na tela ✓ · <nome>" + [↶ Desfazer] (6 s)
 *   falhou → "Não enviado · <motivo>" + [Tentar de novo]
 * `send()` faz a chamada; `undo()` (padrão: ↶ do palco) desfaz; `done` troca o
 * "Na tela ✓" (ex.: "Fora da Tela ✓" ao tirar).
 * → a resposta, ou null se falhou.
 */
export async function sendToStage(campaignId, send, { lang = 'pt', name = '', undo, onDone, done } = {}) {
  flash(L(lang, 'Enviando…', 'Sending…'), { ms: 8000 });
  try { window.dispatchEvent(new CustomEvent(STAGE_SENDING_EVENT, { detail: { campaignId } })); } catch { /* ok */ }
  try {
    const r = await send();
    const undoFn = undo || (() => stageUndo(campaignId));
    flash(`${done || L(lang, 'Na tela ✓', 'On screen ✓')}${name ? ` · ${name}` : ''}`, {
      action: r?.changed === false && !undo ? null : {
        label: L(lang, '↶ Desfazer', '↶ Undo'),
        onClick: async () => {
          try { await undoFn(); onDone?.(); } catch (e) { flash(stageErrorText(e, lang), { error: true }); }
        },
      },
    });
    onDone?.(r);
    return r;
  } catch (e) {
    const status = e?.status;
    const retry = !status || status >= 500;
    flash(`${L(lang, 'Não enviado', 'Not sent')} · ${stageErrorText(e, lang)}`, {
      error: true,
      action: retry ? { label: L(lang, 'Tentar de novo', 'Try again'), onClick: () => sendToStage(campaignId, send, { lang, name, undo, onDone, done }) } : null,
    });
    return null;
  }
}
