/* Textos das gemas de recurso da ficha (visual "Ficha Forjada", src/sheet/ficha.css):
 * espaços de magia, usos da Forma Selvagem e recursos de classe. Só apresentação: quem
 * gasta, recupera e trava continua sendo o botão de sempre (.slot-pip). */

// "Nv 1" virou "1º círculo" (só o texto do rótulo da linha)
export const slotCircleLabel = (lvl, lang) => (lang === 'pt' ? `${lvl}º círculo` : `Level ${lvl}`);

// Nome acessível de cada gema (o desenho não tem texto): "1º círculo: 2 de 4, livre"
export const gemLabel = (what, i, max, used, lang) => (lang === 'pt'
  ? `${what}: ${i + 1} de ${max}, ${used ? 'gasto' : 'livre'}`
  : `${what}: ${i + 1} of ${max}, ${used ? 'spent' : 'available'}`);

// Por que a gema travada não responde ao toque (a regra é a de hoje: em campanha o gasto
// é pelo "Conjurar"; fora dela, o espaço gasto só volta no descanso ou no modo trapaça)
export const lockedSlotTitle = (inCampaign, lang) => {
  if (inCampaign) return lang === 'pt' ? 'Em campanha: gaste pelo “Conjurar” das magias' : 'In campaign: spend it with “Cast” on a spell';
  return lang === 'pt' ? 'Gasto: volta no descanso (ou no modo trapaça)' : 'Spent: comes back on a rest (or in cheat mode)';
};
