// Versão = ficha própria (docs/character-versions.md §7.2, F1).
//
// Para a mesma ficha jogar em várias mesas AO MESMO TEMPO sem backend novo, cada versão
// de campanha é uma ficha comum da conta (POST /characters) com três marcas em `data`:
//   versionOf       id da ficha-modelo de onde nasceu
//   versionKind     'campaign' (mesa normal) | 'oneshot' (aventura avulsa)
//   versionCampaign { id, name } da mesa para a qual foi criada (null até sentar)
// Combate, dados, descanso, TV e subida de nível já funcionam por ficha, então nada no
// servidor precisa saber de versões. Tudo aqui é puro (sem React, DOM nem rede).
import { sheetData, dataOf, storeOf, keyOf, TEMPLATE } from './versions.js';

export const FORK_KINDS = ['campaign', 'oneshot'];
const FORK_FIELDS = ['versionOf', 'versionKind', 'versionCampaign', 'versionCreatedAt'];

const numId = (v) => (v != null && /^\d+$/.test(String(v)) ? Number(v) : null);

/** Id do modelo de uma versão (ou null se a ficha não é versão). */
export const templateIdOf = (c) => numId(c?.versionOf);
export const isFork = (c) => templateIdOf(c) != null;

/**
 * Nova versão a partir do modelo. Sempre copia o MODELO (mesmo que a ficha esteja com
 * outra versão aberta no armazém antigo `data.versions`) e nunca leva o armazém junto.
 * Versão de versão aponta para o modelo de origem (a árvore tem um nível só).
 * Sai sem `id`: gravar cria a ficha nova.
 */
export function fork(source, { campaign = null, kind = 'campaign', at = new Date().toISOString() } = {}) {
  if (!source || numId(source.id) == null) throw new Error('fork_needs_saved_sheet');
  const base = source.versions ? (dataOf(source, TEMPLATE) || sheetData(source)) : sheetData(source);
  return build(source, base, { campaign, kind, at });
}

function build(source, base, { campaign, kind, at }) {
  const rootId = templateIdOf(source) ?? numId(source.id);
  const out = JSON.parse(JSON.stringify(base));
  delete out.versions;
  for (const k of FORK_FIELDS) delete out[k];
  out.name = out.name || source.name || '';
  if (out._avatarSame || !out.avatar) out.avatar = source.avatar || out.avatar;
  delete out._avatarSame;
  out.versionOf = rootId;
  out.versionKind = FORK_KINDS.includes(kind) ? kind : 'campaign';
  out.versionCampaign = campaign && campaign.id != null ? { id: campaign.id, name: String(campaign.name || '') } : null;
  out.versionCreatedAt = at;
  return out;
}

/** Marca a mesa em que a versão sentou (depois do join). */
export const seatFork = (c, campaign) => ({ ...c, versionCampaign: { id: campaign.id, name: String(campaign.name || '') } });

/** As versões de um modelo, na ordem em que foram criadas. */
export function forksOf(list, templateId) {
  const id = numId(templateId);
  return (list || []).filter(c => templateIdOf(c) === id)
    .sort((a, b) => String(a.versionCreatedAt || '').localeCompare(String(b.versionCreatedAt || '')) || (a.id - b.id));
}

/** Irmãs de uma ficha: o modelo + todas as versões dele (inclui a própria). */
export function familyOf(list, c) {
  const root = templateIdOf(c) ?? numId(c?.id);
  if (root == null) return [];
  const tpl = (list || []).find(x => numId(x.id) === root);
  return [tpl, ...forksOf(list, root)].filter(Boolean);
}

/**
 * Lista da tela inicial: cada versão logo depois do seu modelo, na ordem já dada à
 * lista. Versão cujo modelo não está na lista (filtrado ou excluído) fica onde estava.
 */
export function groupWithForks(list) {
  const items = list || [];
  const present = new Set(items.map(c => numId(c.id)).filter(v => v != null));
  const out = [];
  for (const c of items) {
    const root = templateIdOf(c);
    if (root != null && present.has(root)) continue;   // entra junto com o modelo
    out.push(c);
    if (root == null) out.push(...forksOf(items, c.id));
  }
  return out;
}

/** Nome curto da versão para selos e chips. */
export function forkLabel(c, lang = 'pt') {
  if (!isFork(c)) return '';
  const en = lang === 'en';
  if (c.versionKind === 'oneshot') return c.versionCampaign?.name ? `One-shot · ${c.versionCampaign.name}` : 'One-shot';
  return c.versionCampaign?.name || (en ? 'New version' : 'Versão nova');
}

/** Preferências deste aparelho guardadas por id de ficha (cinto e rolador múltiplo). */
export const devicePrefKeys = (id) => [`fh-belt:${id}`, `fh-multiroll4:${id}`];

/** Copia as preferências do aparelho para a ficha nova (F13). Nunca lança. */
export function copyDevicePrefs(fromId, toId, store = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!store || fromId == null || toId == null) return 0;
  let n = 0;
  const from = devicePrefKeys(fromId), to = devicePrefKeys(toId);
  from.forEach((k, i) => {
    try {
      const v = store.getItem(k);
      if (v != null && store.getItem(to[i]) == null) { store.setItem(to[i], v); n++; }
    } catch { /* armazenamento bloqueado: segue sem as preferências */ }
  });
  return n;
}

/**
 * Pode sentar esta ficha nesta mesa? (F9) Nunca a mesma ficha duas vezes, nem duas
 * versões do mesmo modelo na mesma mesa. `seatedIds` = ids das fichas já na mesa.
 */
export function seatConflict(list, c, seatedIds) {
  const seated = new Set((seatedIds || []).map(numId).filter(v => v != null));
  if (seated.has(numId(c?.id))) return 'same_sheet';
  const fam = familyOf(list, c).map(x => numId(x.id));
  return fam.some(id => id !== numId(c?.id) && seated.has(id)) ? 'same_family' : null;
}

// ── Arquivo (F6): one-shot encerrado vira só leitura; o jogador pode desarquivar ──
export const FORK_STATE_FIELDS = ['versionArchivedAt', 'versionRestartedAt'];
export const isArchivedFork = (c) => isFork(c) && !!c.versionArchivedAt;
export const archiveFork = (c, at = new Date().toISOString()) => ({ ...c, versionArchivedAt: at });
export const unarchiveFork = (c) => { const n = { ...c }; delete n.versionArchivedAt; return n; };

/**
 * One-shot cuja mesa sumiu da lista de campanhas da ficha (encerrada ou saiu) deve virar
 * arquivo. `campaigns` = resposta de characterCampaigns (null = ainda não carregou).
 */
export function shouldAutoArchive(c, campaigns) {
  if (!isFork(c) || c.versionKind !== 'oneshot' || c.versionArchivedAt) return false;
  const at = c.versionCampaign?.id;
  if (at == null || !Array.isArray(campaigns)) return false;
  return !campaigns.some(x => String(x.id) === String(at));
}

/** Ficha arquivada aberta só para leitura (mesmo formato da prévia de versões.js). */
export function archivedPreview(c, lang = 'pt') {
  return { ...c, id: `a:${c.id}`, versionPreview: { of: c.id, key: 'fork', state: 'archived', name: forkLabel(c, lang), fork: true } };
}

// ── Recomeçar a partir do modelo (F14): mesma ficha (mesmo id, mesma mesa), dados do modelo ──
export function restartFromTemplate(c, template, at = new Date().toISOString()) {
  if (!isFork(c)) throw new Error('not_a_version');
  if (!template || numId(template.id) !== templateIdOf(c)) throw new Error('wrong_template');
  const next = fork(template, { campaign: c.versionCampaign, kind: c.versionKind, at: c.versionCreatedAt || at });
  return { ...next, id: c.id, versionRestartedAt: at };
}

// ── Separar uma versão do armazém antigo em ficha própria (F5) ──
/** Versões do armazém antigo que podem virar ficha própria agora (não a que está em uso). */
export function splittable(char) {
  if (!char || numId(char.id) == null || isFork(char) || !char.versions) return [];
  const store = storeOf(char);
  return Object.entries(store.campaigns).filter(([k]) => k !== store.current).map(([k, v]) => ({ key: k, name: v.name, state: v.state }));
}

/** Dados da nova ficha separada a partir da versão `key` (sem id; gravar cria). */
export function splitFromStore(char, key, at = new Date().toISOString()) {
  const k = keyOf(key);
  const v = storeOf(char).campaigns[k];
  if (!v) throw new Error('version_not_found');
  if (storeOf(char).current === k) throw new Error('version_in_use');
  const out = build(char, dataOf(char, k), { campaign: { id: /^\d+$/.test(k) ? Number(k) : k, name: v.name }, kind: 'campaign', at });
  if (v.state === 'archived') out.versionArchivedAt = v.leftAt || at;
  return out;
}

// ── Plano (F10, F16): quanto da cota as versões usam ──
/**
 * Aviso para o painel de versões. `my` = loadMyPlan() (null = sem dado: não avisa).
 * Devolve { text, atLimit }.
 */
export function forkPlanNote(my, list, c, lang = 'pt') {
  const en = lang === 'en';
  const fam = familyOf(list, c).filter(isFork).length;
  const used = my?.usage?.characters, max = my?.limits?.characters;
  if (used == null || max == null) {
    return { text: en ? 'Each version counts as one character on your plan.' : 'Cada versão conta como uma ficha do seu plano.', atLimit: false };
  }
  const atLimit = used >= max;
  const famTxt = fam ? (en ? ` · ${fam} ${fam === 1 ? 'is a version' : 'are versions'} of this character` : ` · ${fam} ${fam === 1 ? 'é versão' : 'são versões'} deste personagem`) : '';
  const base = en ? `Each version counts as one character on your plan: ${used} of ${max} in use${famTxt}.` : `Cada versão conta como uma ficha do seu plano: ${used} de ${max} em uso${famTxt}.`;
  const tail = atLimit ? (en ? ' The plan is full: a new version needs a free slot (or a seat from the GM at the table).' : ' O plano está cheio: uma versão nova precisa de vaga livre (ou de uma vaga do mestre na mesa).') : '';
  return { text: base + tail, atLimit };
}
