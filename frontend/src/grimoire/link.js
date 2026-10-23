/* Abrir o Grimório por dentro do app (popup da ficha, mesa). Um link #grimorio… comum
 * cria a entrada no histórico sem dizer de onde veio, e o Grimório tem de tratá-la como
 * um link de fora: o "Voltar" então limpava o hash e deixava uma entrada morta (o 1º
 * voltar do celular não fazia nada). Aqui a entrada nova leva a marca grimLink — a
 * anterior é a tela de onde a pessoa veio — e o app é avisado como um link avisaria. */
export const GRIM_LINK = 'grimLink';

export function openGrimoireLink(hash) {
  try {
    history.pushState({ [GRIM_LINK]: 1 }, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  } catch {
    return false; // sem histórico (ex.: sandbox): o link segue o caminho normal
  }
}

/** Clique num <a href="#grimorio…">: só o clique simples vira navegação interna
 * (Ctrl/⌘/meio continuam abrindo outra aba). Devolve true se tratou o clique. */
export function onGrimoireLinkClick(e, hash) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  e.preventDefault();
  if (!openGrimoireLink(hash)) { window.location.hash = hash; }
  return true;
}
