/* Textos das gemas de recurso da ficha (visual "Ficha Forjada", src/sheet/ficha.css):
 * espaços de magia, usos da Forma Selvagem e recursos de classe. Só apresentação: quem
 * gasta, recupera e trava continua sendo o botão de sempre (.slot-pip). */

// "Nv 1" virou "1º círculo" (só o texto do rótulo da linha)
export const slotCircleLabel = (lvl, lang) => (lang === 'pt' ? `${lvl}º círculo` : `Level ${lvl}`);

// Nome acessível de cada gema (o desenho não tem texto): "1º círculo: 2 de 4, livre"
export const gemLabel = (what, i, max, used, lang) => (lang === 'pt'
  ? `${what}: ${i + 1} de ${max}, ${used ? 'gasto' : 'livre'}`
  : `${what}: ${i + 1} of ${max}, ${used ? 'spent' : 'available'}`);

// Espaços de magia gastam da direita para a esquerda: as `used` gemas da ponta direita
// são as gastas. Um toque numa gema acesa gasta um espaço; numa apagada, devolve um
// (desfaz um toque errado). Só em campanha elas travam: lá o gasto é pelo "Conjurar".
export const slotSpent = (i, max, used) => i >= max - used;
export const slotTap = (used, max, spent) => Math.max(0, Math.min(max, (used || 0) + (spent ? -1 : 1)));
export const slotTapTitle = (spent, lang) => (spent
  ? (lang === 'pt' ? 'Gasto: toque para devolver' : 'Spent: tap to get it back')
  : (lang === 'pt' ? 'Livre: toque para gastar' : 'Available: tap to spend'));

// Por que a gema travada não responde ao toque (em campanha o gasto é pelo "Conjurar";
// o texto de fora de campanha vale para os recursos de classe)
export const lockedSlotTitle = (inCampaign, lang) => {
  if (inCampaign) return lang === 'pt' ? 'Em campanha: gaste pelo “Conjurar” das magias' : 'In campaign: spend it with “Cast” on a spell';
  return lang === 'pt' ? 'Gasto: volta no descanso (ou no modo trapaça)' : 'Spent: comes back on a rest (or in cheat mode)';
};
