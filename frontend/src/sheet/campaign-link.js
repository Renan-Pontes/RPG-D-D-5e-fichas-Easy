// Modal "Campanha" da ficha (CampaignLinkModal.jsx): atrelar a ficha a uma mesa em
// que a pessoa joga, desatrelar e trocar de campanha. Lógica pura (testes em
// tests/campaign-link.test.js); a tela só apresenta.
//
// Regra do servidor (API.md → "Uma campanha por vez"): a ficha fica em UMA
// campanha de cada vez. Atrelar com ela em outra → 409 character_in_other_campaign
// {campaignId, campaignName}; `move: true` tira de lá e põe aqui numa transação.
import { errorMessage, errorText } from '../api/errors.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Só fichas da conta (id do servidor) entram em campanha; as do aparelho não. */
export const isAccountSheet = (char) => typeof char?.id === 'number';

const nameOf = (s, lang) => String(s || '').trim() || L(lang, 'Sem nome', 'Unnamed');

/**
 * Mesas em que a ficha pode entrar: ATIVAS e em que a pessoa é JOGADORA (as que
 * ela mestra ficam de fora: o mestre não joga com ficha na própria mesa).
 * `exclude`: ids que não entram (a campanha atual, na troca). Em ordem de nome.
 */
export function playerTables(campaigns, exclude = []) {
  const skip = new Set((exclude || []).map(String));
  return (Array.isArray(campaigns) ? campaigns : [])
    .filter(c => c && c.role === 'player' && c.status !== 'closed' && !skip.has(String(c.id)))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt', { sensitivity: 'base' }));
}

/** Quantas campanhas a pessoa mestra (para explicar por que elas não aparecem). */
export const dmTableCount = (campaigns) => (Array.isArray(campaigns) ? campaigns : []).filter(c => c?.role === 'dm').length;

/**
 * A vaga da pessoa naquela mesa (GET /campaigns → myMembership):
 * 'free' (sem personagem) · 'this' (esta ficha) · 'other' (outra ficha, `name`) ·
 * 'unknown' (servidor antigo, sem o campo).
 */
export function seatState(campaign, charId) {
  const m = campaign?.myMembership;
  if (!m || m.id == null) return { kind: 'unknown', name: '' };
  if (m.characterId == null) return { kind: 'free', name: '' };
  if (String(m.characterId) === String(charId)) return { kind: 'this', name: '' };
  return { kind: 'other', name: String(m.characterName || '') };
}

export function seatLabel(seat, lang = 'pt') {
  switch (seat?.kind) {
    case 'free': return L(lang, 'Sua vaga está livre', 'Your seat is free');
    case 'this': return L(lang, 'Esta ficha já está aqui', 'This sheet is already here');
    case 'other': return seat.name
      ? L(lang, `Sua vaga tem ${seat.name}`, `Your seat has ${seat.name}`)
      : L(lang, 'Sua vaga tem outro personagem', 'Your seat has another character');
    default: return '';
  }
}

/**
 * 409 "esta ficha já está em outra campanha" (código novo ou o antigo
 * character_already_in_campaign) → {campaignId, campaignName}; senão null.
 */
export function otherCampaignFrom(err) {
  if (err?.status != null && err.status !== 409) return null;
  const d = err?.data || {};
  const code = d.error || d.detail;
  if (code !== 'character_in_other_campaign' && code !== 'character_already_in_campaign') return null;
  return { campaignId: d.campaignId ?? null, campaignName: String(d.campaignName || '') };
}

/** Texto de erro das ações do modal (encerrada, mestre na própria mesa, rede…). */
export function linkErrorText(err, lang = 'pt') {
  const code = err?.data?.error || err?.data?.detail;
  if (err?.status === 423 || code === 'campaign_closed') {
    return L(lang,
      'Esta campanha foi encerrada: ela é só para leitura, então nenhuma ficha entra nem sai dela.',
      'This campaign was closed: it is read-only, so no sheet can join or leave it.');
  }
  if (code === 'invite_invalid' || (err?.status === 404 && !code)) {
    return errorText('invite_invalid', lang);
  }
  return errorMessage(err, lang);
}

const quote = (s) => `“${s}”`;

/** Nomes entre aspas numa frase: “A” · “A” e “B” · “A”, “B” e “C”. Vazios saem. */
export function quoteList(names, lang = 'pt') {
  const q = (Array.isArray(names) ? names : [names]).map(n => String(n ?? '').trim()).filter(Boolean).map(quote);
  if (q.length < 2) return q[0] || '';
  return `${q.slice(0, -1).join(', ')} ${L(lang, 'e', 'and')} ${q[q.length - 1]}`;
}

/**
 * Confirmações (sempre claras sobre o que acontece com a ficha e com a vaga).
 * → {title, text, ok}
 */
export function attachConfirm({ charName, table, seat, lang = 'pt' }) {
  const who = nameOf(charName, lang);
  const where = quote(nameOf(table, lang));
  const other = seat?.kind === 'other' ? (seat.name || L(lang, 'o outro personagem', 'the other character')) : '';
  return {
    title: L(lang, `Atrelar ${who} a ${where}?`, `Link ${who} to ${where}?`),
    text: other
      ? L(lang,
        `Sua vaga nesta mesa já tem ${other}. ${other} sai da mesa (a ficha continua com você) e ${who} entra no lugar. Em campanha, nível, PV máximo, atributos e itens passam a ser cuidados pelo mestre.`,
        `Your seat at this table already has ${other}. ${other} leaves the table (the sheet stays with you) and ${who} takes the seat. In a campaign, level, max HP, abilities and items are handled by the GM.`)
      : L(lang,
        `${who} entra na mesa. Em campanha, nível, PV máximo, atributos e itens passam a ser cuidados pelo mestre.`,
        `${who} joins the table. In a campaign, level, max HP, abilities and items are handled by the GM.`),
    ok: L(lang, 'Atrelar', 'Link'),
  };
}

export function detachConfirm({ charName, from, sponsored = false, lang = 'pt' }) {
  const who = nameOf(charName, lang);
  const where = quote(nameOf(from, lang));
  const seat = sponsored
    ? L(lang, ' Ela usava uma vaga da mesa do mestre: fora dela, passa a contar no limite do seu plano.',
      " It was using one of the GM's table seats: outside it, it counts toward your plan's limit.")
    : '';
  return {
    title: L(lang, `Desatrelar ${who} de ${where}?`, `Unlink ${who} from ${where}?`),
    text: L(lang,
      `Você continua na campanha, sem personagem. ${who} volta a ser uma ficha pessoal: você edita tudo de novo e sobe de nível pela Progressão.${seat}`,
      `You stay in the campaign, without a character. ${who} becomes a personal sheet again: you can edit everything and level up through Progression.${seat}`),
    ok: L(lang, 'Desatrelar', 'Unlink'),
  };
}

/** `from`: o nome da campanha de onde a ficha sai, ou a lista (ficha antiga em 2: sai de todas). */
export function switchConfirm({ charName, from, to, seat, lang = 'pt' }) {
  const who = nameOf(charName, lang);
  const a = quoteList(from, lang) || L(lang, 'a campanha atual', 'the current campaign');
  const b = quote(nameOf(to, lang));
  const other = seat?.kind === 'other' ? (seat.name || L(lang, 'o outro personagem', 'the other character')) : '';
  const swap = other
    ? L(lang, ` Em ${b}, ${other} sai da sua vaga (a ficha continua com você).`, ` At ${b}, ${other} leaves your seat (the sheet stays with you).`)
    : '';
  return {
    title: L(lang, `Trocar ${who} de campanha?`, `Move ${who} to another campaign?`),
    text: L(lang,
      `${who} sai de ${a} (você continua lá, sem personagem) e entra em ${b}. Uma ficha fica em uma campanha por vez.${swap}`,
      `${who} leaves ${a} (you stay there, without a character) and joins ${b}. A sheet is in one campaign at a time.${swap}`),
    ok: L(lang, 'Trocar de campanha', 'Move sheet'),
  };
}

/** Toast de sucesso de cada ação. */
export function linkToast(kind, { charName, table, lang = 'pt' } = {}) {
  const who = nameOf(charName, lang);
  const where = String(table || '').trim();
  if (kind === 'detach') {
    return where
      ? L(lang, `${who} saiu de ${where}. A ficha é pessoal de novo.`, `${who} left ${where}. The sheet is personal again.`)
      : L(lang, `${who} saiu da campanha. A ficha é pessoal de novo.`, `${who} left the campaign. The sheet is personal again.`);
  }
  if (kind === 'switch') {
    return L(lang, `${who} agora joga em ${where || 'outra campanha'}.`, `${who} now plays in ${where || 'another campaign'}.`);
  }
  return L(lang, `${who} agora está em ${where || 'uma campanha'}.`, `${who} is now in ${where || 'a campaign'}.`);
}

/** Membership da pessoa a partir do GET /campaigns/:id (servidor sem myMembership). */
export function findMyMembership(campaign, userId) {
  if (userId == null) return null;
  return (campaign?.members || []).find(m => m && m.role !== 'dm' && String(m.user?.id) === String(userId)) || null;
}
