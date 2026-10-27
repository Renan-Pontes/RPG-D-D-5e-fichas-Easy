// Servidor ainda sem o palco (o front sai na Vercel no merge; o PythonAnywhere é
// atualizado à mão depois): o que o `screen-card` antigo sabe fazer. Sem React nem CSS,
// testado em tests/old-server.test.js.

/** O op do palco no formato do `screen-card` antigo: o cartão, null (tirar) ou undefined (não existe lá). */
export function legacyScreenCard(body) {
  const t = body?.target || {};
  if (body?.op === 'back' || body?.op === 'clear') return null;
  if (body?.op !== 'show') return undefined;
  if (t.kind === 'card' && t.entryId != null) return { type: 'entry', entryId: t.entryId, ...(t.secretIds ? { secretIds: t.secretIds } : {}) };
  if (t.kind === 'recap') return { type: 'recap', title: t.title || '', text: t.text || '' };
  if (t.kind === 'scene' && t.advId != null && t.nodeId != null) return { type: 'scene', adventureId: t.advId, nodeId: t.nodeId };
  return undefined;
}
