// Versões da ficha por campanha ("campanhas como versões do mesmo personagem").
// Lógica pura (testes em tests/versions.test.js); a tela é VersionsModal.jsx.
//
// Modelo:
//   - MODELO (template): a ficha como foi criada, fora de qualquer campanha.
//   - VERSÃO de campanha: cópia COMPLETA e independente da ficha, uma por campanha.
//   - estado da versão: 'active' (em jogo) · 'left' (saiu; guardada) · 'archived'
//     (campanha encerrada ou apagada; só leitura).
//
// Armazenamento de transição (o servidor ainda não tem a tabela CharacterVersion —
// ver docs/character-versions.md): a ficha do servidor é a CÓPIA DE TRABALHO da
// versão em uso, e as outras ficam guardadas em `char.versions`:
//   { current: 'template' | '<campaignId>',
//     template:     { data, savedAt } | null,     // null enquanto o modelo é a cópia de trabalho
//     templatePrev: { data, savedAt } | null,     // um "desfazer" de promover
//     campaigns: { [id]: { name, state, data | null, savedAt, leftAt } } }
// Trocar de versão = guardar a cópia de trabalho e trazer a outra (como um checkout).

export const TEMPLATE = 'template';
export const STATES = ['active', 'left', 'archived'];

// Campos que o servidor acrescenta à ficha (não fazem parte dos dados dela).
const SERVER_FIELDS = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'inCampaign', 'campaignIds', 'campaignLeveling', 'tableSlot'];

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const now = () => new Date().toISOString();
export const keyOf = (id) => (id === TEMPLATE || id == null ? TEMPLATE : String(id));

/** O armazém de versões da ficha, sempre no formato completo (nunca muta `char`). */
export function storeOf(char) {
  const s = char?.versions && typeof char.versions === 'object' ? char.versions : {};
  const campaigns = {};
  for (const [id, v] of Object.entries(s.campaigns && typeof s.campaigns === 'object' ? s.campaigns : {})) {
    if (!v || typeof v !== 'object') continue;
    campaigns[String(id)] = {
      name: String(v.name || ''),
      state: STATES.includes(v.state) ? v.state : 'active',
      data: v.data && typeof v.data === 'object' ? v.data : null,
      savedAt: v.savedAt || null,
      leftAt: v.leftAt || null,
    };
  }
  const current = s.current != null && campaigns[String(s.current)] ? String(s.current) : TEMPLATE;
  return {
    current,
    template: s.template?.data ? { data: s.template.data, savedAt: s.template.savedAt || null } : null,
    templatePrev: s.templatePrev?.data ? { data: s.templatePrev.data, savedAt: s.templatePrev.savedAt || null } : null,
    campaigns,
  };
}

/** Só os dados da ficha (sem o armazém e sem os campos do servidor). */
export function sheetData(char) {
  const out = {};
  for (const [k, v] of Object.entries(char || {})) {
    if (k === 'versions' || SERVER_FIELDS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Cópia guardada da ficha. O retrato pesa (data URL): quando é o mesmo da cópia de
 * trabalho que fica, guarda só a marca `_avatarSame` e o retrato volta no checkout.
 */
function pack(data, keptAvatar) {
  const d = clone(data);
  if (d.avatar && d.avatar === keptAvatar) { delete d.avatar; d._avatarSame = true; }
  return { data: d, savedAt: now() };
}

function unpack(snap, fallbackAvatar) {
  const d = clone(snap?.data || {});
  if (d._avatarSame) { delete d._avatarSame; if (fallbackAvatar) d.avatar = fallbackAvatar; }
  return d;
}

/** Remonta a ficha: campos do servidor + dados + armazém. */
function assemble(char, data, store) {
  const out = {};
  for (const k of SERVER_FIELDS) if (char && k in char) out[k] = char[k];
  return { ...out, ...data, versions: store };
}

/** A ficha conhece esta versão? */
export const hasVersion = (char, key) => keyOf(key) === TEMPLATE || !!storeOf(char).campaigns[keyOf(key)];

/** Dados (completos) de uma versão, esteja ela em uso ou guardada. */
export function dataOf(char, key) {
  const k = keyOf(key);
  const store = storeOf(char);
  const working = sheetData(char);
  if (k === store.current) return clone(working);
  if (k === TEMPLATE) return store.template ? unpack(store.template, working.avatar) : clone(working);
  const v = store.campaigns[k];
  if (!v) return null;
  if (v.data) return unpack(v, working.avatar);
  return dataOf(char, TEMPLATE);   // versão ainda sem cópia: nasce igual ao modelo
}

/** Registra uma campanha na lista (sem copiar nada ainda). */
export function register(char, campaign, state = 'active') {
  const store = storeOf(char);
  const k = keyOf(campaign.id);
  const prev = store.campaigns[k];
  store.campaigns[k] = {
    name: String(campaign.name || prev?.name || ''),
    state: prev?.state || state,
    data: prev?.data || null,
    savedAt: prev?.savedAt || null,
    leftAt: prev?.leftAt || null,
  };
  return assemble(char, sheetData(char), store);
}

/**
 * Checkout: guarda a cópia de trabalho na versão em uso e traz `key` para a ficha.
 * Versão de campanha nova (sem cópia) nasce como cópia do MODELO daquele momento.
 */
export function checkout(char, key) {
  const k = keyOf(key);
  const store = storeOf(char);
  if (k === store.current) return assemble(char, sheetData(char), store);
  if (k !== TEMPLATE && !store.campaigns[k]) throw new Error('unknown_version');
  const working = sheetData(char);
  const incoming = dataOf(char, k);
  // guarda a que sai
  if (store.current === TEMPLATE) store.template = pack(working, incoming.avatar);
  else store.campaigns[store.current] = { ...store.campaigns[store.current], ...pack(working, incoming.avatar) };
  // a que entra vira a cópia de trabalho (sua cópia guardada deixa de existir)
  if (k === TEMPLATE) store.template = null;
  else store.campaigns[k] = { ...store.campaigns[k], data: null, savedAt: null };
  store.current = k;
  return assemble(char, incoming, store);
}

/** Sair da campanha: a versão fica guardada ('left'); se estava em uso, volta o modelo. */
export function leave(char, campaignId) {
  const k = keyOf(campaignId);
  let next = storeOf(char).current === k ? checkout(char, TEMPLATE) : char;
  const store = storeOf(next);
  if (!store.campaigns[k]) return next;
  if (store.campaigns[k].state === 'active') store.campaigns[k] = { ...store.campaigns[k], state: 'left', leftAt: now() };
  next = assemble(next, sheetData(next), store);
  return next;
}

/** Voltar: reusa a MESMA versão, como foi deixada (não recopia o modelo). */
export function rejoin(char, campaignId) {
  const k = keyOf(campaignId);
  const store = storeOf(char);
  const v = store.campaigns[k];
  if (!v) throw new Error('unknown_version');
  if (v.state === 'archived') throw new Error('archived');
  store.campaigns[k] = { ...v, state: 'active', leftAt: null };
  return assemble(char, sheetData(char), store);
}

/** Campanha encerrada ou apagada: a versão vira arquivo (só leitura). */
export function archive(char, campaignId) {
  const k = keyOf(campaignId);
  let next = storeOf(char).current === k ? checkout(char, TEMPLATE) : char;
  const store = storeOf(next);
  if (!store.campaigns[k] || store.campaigns[k].state === 'archived') return next;
  store.campaigns[k] = { ...store.campaigns[k], state: 'archived', leftAt: store.campaigns[k].leftAt || now() };
  return assemble(next, sheetData(next), store);
}

/** Excluir: apaga a versão para sempre. Só vale para 'left' ou 'archived'. */
export function exclude(char, campaignId) {
  const k = keyOf(campaignId);
  const store = storeOf(char);
  const v = store.campaigns[k];
  if (!v) return char;
  if (v.state === 'active' || store.current === k) throw new Error('version_active');
  delete store.campaigns[k];
  return assemble(char, sheetData(char), store);
}

/**
 * Tirar do armazém uma versão que virou ficha própria (src/sheet/forks.js::splitFromStore).
 * Diferente de `exclude`, vale para qualquer estado menos a versão em uso: os dados não
 * se perdem, já estão na ficha nova.
 */
export function release(char, campaignId) {
  const k = keyOf(campaignId);
  const store = storeOf(char);
  if (!store.campaigns[k]) return char;
  if (store.current === k) throw new Error('version_in_use');
  delete store.campaigns[k];
  return assemble(char, sheetData(char), store);
}

/** Promover a modelo: o modelo passa a ser uma cópia desta versão (guarda o antigo p/ desfazer). */
export function promote(char, key) {
  const k = keyOf(key);
  if (k === TEMPLATE) return char;
  const store = storeOf(char);
  if (!store.campaigns[k]) throw new Error('unknown_version');
  const working = sheetData(char);
  const source = dataOf(char, k);
  const oldTemplate = dataOf(char, TEMPLATE);
  if (store.current === TEMPLATE) {
    // o modelo é a cópia de trabalho: troca os dados da ficha
    store.templatePrev = pack(oldTemplate, source.avatar);
    return assemble(char, source, store);
  }
  store.templatePrev = pack(oldTemplate, working.avatar);
  store.template = pack(source, working.avatar);
  return assemble(char, working, store);
}

export const canUndoPromote = (char) => !!storeOf(char).templatePrev;

/** Desfaz a última promoção (uma vez). */
export function undoPromote(char) {
  const store = storeOf(char);
  if (!store.templatePrev) return char;
  const working = sheetData(char);
  const prev = unpack(store.templatePrev, working.avatar);
  store.templatePrev = null;
  if (store.current === TEMPLATE) return assemble(char, prev, store);
  store.template = pack(prev, working.avatar);
  return assemble(char, working, store);
}

/**
 * Acerta o armazém com o servidor.
 *   links: campanhas em que a ficha está AGORA (GET /characters/<id>/campaigns)
 *   campaigns: campanhas da pessoa (GET /campaigns), ou null se não deu para ler
 * Regras: campanha nova em `links` entra como 'active'; a que está em `links` é a versão
 * em uso; campanha encerrada ou que sumiu da lista vira 'archived'.
 * → { char, changed }
 */
export function reconcile(char, links = [], campaigns = null) {
  let next = char;
  const before = JSON.stringify(storeOf(char));
  for (const l of links || []) {
    if (l?.id == null) continue;
    next = register(next, l, 'active');
    const s = storeOf(next);
    const k = keyOf(l.id);
    if (s.campaigns[k].state === 'left') { s.campaigns[k] = { ...s.campaigns[k], state: 'active', leftAt: null }; next = assemble(next, sheetData(next), s); }
  }
  const linked = (links || []).map(l => keyOf(l.id));
  let store = storeOf(next);
  // a versão em uso é de uma campanha, mas a ficha não está mais lá (saiu pela faixa
  // da campanha ou o mestre tirou): a versão fica guardada como 'left' e o modelo volta
  if (store.current !== TEMPLATE && !linked.length) {
    next = leave(next, store.current);
    store = storeOf(next);
  }
  // ficha atrelada a uma campanha que não é a "em uso": a cópia de trabalho É a daquela campanha
  if (linked.length && !linked.includes(store.current)) {
    const k = linked[0];
    const working = sheetData(next);
    if (store.current === TEMPLATE) {
      // a ficha entrou na campanha com os dados do modelo → o modelo guarda a sua cópia
      if (!store.template) store.template = pack(working, working.avatar);
    } else {
      // trocou de mesa por fora das versões: a que saía guarda o que tinha (nada se perde)
      store.campaigns[store.current] = { ...store.campaigns[store.current], ...pack(working, working.avatar) };
    }
    store.campaigns[k] = { ...store.campaigns[k], data: null, savedAt: null };
    store.current = k;
    next = assemble(next, sheetData(next), store);
  }
  if (Array.isArray(campaigns)) {
    const byId = new Map(campaigns.map(c => [keyOf(c.id), c]));
    for (const k of Object.keys(storeOf(next).campaigns)) {
      const c = byId.get(k);
      if (!c || c.status === 'closed') {
        if (linked.includes(k) && c) continue;   // ainda atrelada: o servidor decide ao soltar
        next = archive(next, k);
      } else if (c.name && c.name !== storeOf(next).campaigns[k].name) {
        store = storeOf(next); store.campaigns[k] = { ...store.campaigns[k], name: c.name }; next = assemble(next, sheetData(next), store);
      }
    }
  }
  return { char: next, changed: JSON.stringify(storeOf(next)) !== before };
}

/** Linhas da lista: modelo primeiro, depois as campanhas (ativas, saiu, arquivo). */
export function rows(char) {
  const store = storeOf(char);
  const preview = (d) => ({ level: d?.level || 1, hp: d?.currentHp ?? d?.maxHp ?? null, maxHp: d?.maxHp ?? null, className: d?.className || '' });
  const out = [{ key: TEMPLATE, kind: 'template', state: 'template', name: '', current: store.current === TEMPLATE, ...preview(dataOf(char, TEMPLATE)) }];
  const order = { active: 0, left: 1, archived: 2 };
  const list = Object.entries(store.campaigns).map(([k, v]) => ({
    key: k, kind: 'campaign', state: v.state, name: v.name, current: store.current === k, leftAt: v.leftAt, ...preview(dataOf(char, k)),
  }));
  list.sort((a, b) => (order[a.state] - order[b.state]) || a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }));
  return out.concat(list);
}

/** Pode editar esta versão? (só a que está em uso, e só se não for arquivo) */
export function isReadOnly(char, key) {
  const k = keyOf(key);
  const store = storeOf(char);
  if (k === TEMPLATE) return false;
  const v = store.campaigns[k];
  return !v || v.state !== 'active';
}

/**
 * Ficha "só leitura" de uma versão guardada, para olhar sem trocar. O id vira texto
 * (`v:<id>:<key>`) para nenhuma chamada ao servidor tratá-la como ficha da conta.
 */
export function previewChar(char, key) {
  const k = keyOf(key);
  const d = dataOf(char, k);
  if (!d) return null;
  const v = storeOf(char).campaigns[k];
  return { ...d, id: `v:${char.id}:${k}`, versionPreview: { of: char.id, key: k, state: v?.state || 'template', name: v?.name || '' } };
}

/** "#ficha=12@34" → { id: 12, key: '34' } ("#ficha=12" → key null). */
export function parseSheetHash(hash) {
  const m = /^#ficha=(\d+)(?:@([\w-]+))?$/.exec(String(hash || ''));
  return m ? { id: Number(m[1]), key: m[2] ? keyOf(m[2]) : null } : null;
}
export const sheetHash = (id, key) => `#ficha=${id}${key && keyOf(key) !== TEMPLATE ? `@${keyOf(key)}` : ''}`;
