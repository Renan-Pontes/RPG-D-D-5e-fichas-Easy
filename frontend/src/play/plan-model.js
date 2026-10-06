// Plano da sessão visto de Jogar › Cena (lógica pura, sem React).
// O plano é o mesmo de Preparar › Próxima sessão (src/prep/next-session.js);
// aqui só se lê e se marca "aconteceu"/"descoberta" — revelar no cartão é
// sempre uma pergunta ao mestre. Testado em tests/play-plan.test.js.
import { normalizePlan } from '../prep/next-session.js';

const filled = (s) => typeof s === 'string' && s.trim().length > 0;

/**
 * Visão compacta do plano para a mesa.
 *   entries   — lista leve do Mundo (para nomes de NPCs/pistas ligadas)
 *   nodeName  — (adventureId, nodeId) → nome da sala | null
 */
export function playPlanView(rawPlan, { entries = [], nodeName = () => null } = {}) {
  const plan = normalizePlan(rawPlan);
  const byId = new Map((entries || []).map(e => [Number(e.id), e]));
  const scenes = plan.scenes
    .filter(s => filled(s.text) || s.nodeRef)
    .map(s => ({
      id: s.id, text: s.text, done: s.done,
      room: s.nodeRef ? (nodeName(s.nodeRef.adventureId, s.nodeRef.nodeId) || null) : null,
    }));
  const clues = plan.secrets
    .filter(s => filled(s.text) || s.ref)
    .map(s => {
      const e = s.ref ? byId.get(Number(s.ref.entryId)) : null;
      return { id: s.id, text: s.text, discovered: s.discovered, entryName: e?.name || null, linked: !!s.ref };
    });
  const names = (ids) => ids.map(id => byId.get(id)).filter(Boolean).map(e => ({ id: e.id, name: e.name, kind: e.kind }));
  const view = {
    strongStart: plan.strongStart.trim(),
    scenes,
    clues,
    npcs: names(plan.npcIds),
    places: names(plan.placeIds),
    monsters: plan.monsters.trim(),
    rewards: plan.rewards.trim(),
  };
  view.hasContent = !!(view.strongStart || scenes.length || clues.length || view.npcs.length || view.places.length || view.monsters || view.rewards);
  view.progress = {
    scenesDone: scenes.filter(s => s.done).length, scenes: scenes.length,
    cluesFound: clues.filter(c => c.discovered).length, clues: clues.length,
  };
  return view;
}

/** Primeira cena que ainda não aconteceu (sugestão para o campo "Cena"). */
export function nextScene(view) {
  return (view?.scenes || []).find(s => !s.done) || null;
}

/** Texto da cena para o campo "Cena" do topo (máx. 120, igual ao campo). */
export function sceneFieldText(scene) {
  const base = scene?.room || String(scene?.text || '').split('\n')[0];
  return String(base || '').trim().slice(0, 120);
}
