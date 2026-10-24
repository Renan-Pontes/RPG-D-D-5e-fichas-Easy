// Registro de edições da ficha (data.editLog) — funções puras da visão do mestre.
// Quem escreve é o servidor (backend/api/edit_log.py): o PUT do dono numa ficha em
// campanha anota {at, by, byId, field, added, removed} (ou {from, to}) por campo
// registrado, começando pelos idiomas. Servidor antigo / ficha sem registro: lista
// vazia, e a seção "Registro de edições" simplesmente não aparece.
import Utils from '../../utils.js';

const FIELD_LABEL = {
  languages: { pt: 'Idiomas', en: 'Languages' },
};

const texts = (v) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' || typeof x === 'number').map(String) : []);

/** Entradas válidas do registro, da mais recente para a mais antiga. */
export function editLogEntries(data) {
  const log = data && typeof data === 'object' ? data.editLog : null;
  if (!Array.isArray(log)) return [];
  return log
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e && typeof e === 'object' && typeof e.field === 'string' && e.field)
    .reverse()
    .map(({ e, i }) => ({ ...e, seq: i }));
}

/** Nome do campo registrado ("Idiomas"); campo novo sem rótulo sai pelo id. */
export const editLogFieldLabel = (field, lang) => FIELD_LABEL[field]?.[lang] || FIELD_LABEL[field]?.pt || field;

// Valor legível: idiomas pelo rótulo do catálogo (personalizado sai como foi digitado).
const valueLabel = (field, v, lang) => (field === 'languages' ? Utils.languageLabel(v, lang) : String(v));

/** "24/10/2026, 14:05" (pt) ou "10/24/26, 2:05 PM" (en); '' se a data não vale. */
export function formatEditLogDate(at, lang) {
  const d = new Date(at);
  if (!at || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Uma entrada pronta para a tela: { key, when, field, by, added[], removed[], change }.
 * `change` = {from, to} para campos simples (null nos de lista).
 */
export function describeEditLogEntry(e, lang) {
  const scalar = e && ('from' in e || 'to' in e) && !Array.isArray(e.added) && !Array.isArray(e.removed);
  const show = (v) => (v == null || v === '' ? '—' : valueLabel(e.field, v, lang));
  return {
    key: `${e.seq ?? ''}-${e.at || ''}`,
    when: formatEditLogDate(e.at, lang),
    field: editLogFieldLabel(e.field, lang),
    by: typeof e.by === 'string' ? e.by : '',
    added: texts(e.added).map(v => valueLabel(e.field, v, lang)),
    removed: texts(e.removed).map(v => valueLabel(e.field, v, lang)),
    change: scalar ? { from: show(e.from), to: show(e.to) } : null,
  };
}
