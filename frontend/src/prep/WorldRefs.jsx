import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import './next-session.css';
import { WORLD_KINDS, entryImage, kindArt, kindIcon, kindLabel, pickEntries, searchEntries, visLabel, VISIBILITY } from './prep-world.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const fallbackArt = (kind) => (e) => {
  const img = e.currentTarget;
  const art = kindArt(kind);
  if (!img.src.endsWith(art)) img.src = art; else img.style.visibility = 'hidden';
};

/** Miniatura de um cartão do Mundo (imagem ou arte padrão, nome, selo de visibilidade). */
export function WorldChip({ entry, lang, onOpen, onRemove, children }) {
  const vis = VISIBILITY[entry.visibility] || VISIBILITY.hidden;
  return (
    <div className={`pw-chip v-${entry.visibility}`}>
      <button type="button" className="pw-chip-main" onClick={onOpen ? () => onOpen(entry) : undefined} disabled={!onOpen}
        title={onOpen ? t(lang, 'Abrir no Mundo', 'Open in World') : undefined}>
        <img src={entryImage(entry, API_BASE)} alt="" loading="lazy" onError={fallbackArt(entry.kind)} />
        <span className="pw-chip-text">
          <strong>{entry.name}</strong>
          <span className="pw-chip-sub">
            <span aria-hidden="true">{kindIcon(entry.kind)}</span> {kindLabel(entry.kind, lang)}
            <span className="pw-vis" title={visLabel(entry.visibility, lang)} aria-label={visLabel(entry.visibility, lang)}> · {vis.icon}</span>
          </span>
        </span>
      </button>
      {children}
      {onRemove && (
        <button type="button" className="btn btn-ghost btn-icon pw-chip-x" onClick={() => onRemove(entry)}
          aria-label={t(lang, `Tirar ${entry.name}`, `Remove ${entry.name}`)}>×</button>
      )}
    </div>
  );
}

/**
 * Campo "cartões do Mundo": mostra os escolhidos e abre um seletor com busca,
 * filtro por tipo e criação rápida (o cartão novo nasce OCULTO no Mundo).
 */
export default function WorldRefs({
  entries, ids, kinds = null, lang, max = 20, onToggle, onCreate, onOpen, emptyText, addLabel, compact = false,
}) {
  const [open, setOpen] = useState(false);
  const chosen = useMemo(() => pickEntries(ids, entries), [ids, entries]);
  const loading = entries == null;
  return (
    <div className={`pw-refs ${compact ? 'is-compact' : ''}`}>
      {chosen.length > 0 && (
        <div className="pw-chips">
          {chosen.map(e => <WorldChip key={e.id} entry={e} lang={lang} onOpen={onOpen} onRemove={() => onToggle(e.id)} />)}
        </div>
      )}
      {!loading && chosen.length === 0 && emptyText && <p className="muted small pw-empty">{emptyText}</p>}
      <button type="button" className="btn btn-ghost btn-sm pw-add" disabled={loading} onClick={() => setOpen(true)}>
        {loading ? t(lang, 'Carregando o Mundo…', 'Loading the World…') : `＋ ${addLabel || t(lang, 'Escolher do Mundo', 'Pick from the World')}`}
      </button>
      {open && (
        <WorldPickerModal entries={entries || []} ids={ids} kinds={kinds} lang={lang} max={max}
          onToggle={onToggle} onCreate={onCreate} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function WorldPickerModal({ entries, ids, kinds, lang, max, onToggle, onCreate, onClose }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState(kinds?.length === 1 ? kinds[0] : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const allowed = kinds ? WORLD_KINDS.filter(k => kinds.includes(k.id)) : WORLD_KINDS;
  const list = useMemo(() => searchEntries(entries, q, kind ? [kind] : kinds), [entries, q, kind, kinds]);
  const full = ids.length >= max;
  const createKind = kind || (kinds?.[0]) || 'npc';
  const exact = list.some(e => e.name.trim().toLowerCase() === q.trim().toLowerCase());

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const create = async () => {
    const name = q.trim();
    if (!name || !onCreate) return;
    setBusy(true); setError('');
    try {
      const entry = await onCreate(createKind, name);
      if (entry && !ids.includes(entry.id)) onToggle(entry.id);
      setQ('');
    } catch (e) { setError(errorMessage(e, lang)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pw-modal" role="dialog" aria-modal="true" aria-label={t(lang, 'Escolher cartões do Mundo', 'Pick World cards')} onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
        <h3>🌍 {t(lang, 'Do seu Mundo', 'From your World')}</h3>
        <input ref={inputRef} className="input" value={q} maxLength={120} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim() && !exact && onCreate && list.length === 0) { e.preventDefault(); create(); } }}
          placeholder={t(lang, 'Buscar pelo nome… ou digite um nome novo', 'Search by name… or type a new name')}
          aria-label={t(lang, 'Buscar no Mundo', 'Search the World')} />
        {allowed.length > 1 && (
          <div className="pw-kinds" role="group" aria-label={t(lang, 'Tipo', 'Type')}>
            <button type="button" className={!kind ? 'on' : ''} aria-pressed={!kind} onClick={() => setKind('')}>{t(lang, 'Todos', 'All')}</button>
            {allowed.map(k => (
              <button type="button" key={k.id} className={kind === k.id ? 'on' : ''} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                {k.icon} {t(lang, k.ptPl, k.enPl)}
              </button>
            ))}
          </div>
        )}
        {full && <p className="muted small">{t(lang, `Limite de ${max} cartões aqui.`, `Limit of ${max} cards here.`)}</p>}
        <ul className="pw-list">
          {list.map(e => {
            const on = ids.includes(e.id);
            return (
              <li key={e.id}>
                <button type="button" className={`pw-row ${on ? 'on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => onToggle(e.id)}>
                  <img src={entryImage(e, API_BASE)} alt="" loading="lazy" onError={fallbackArt(e.kind)} />
                  <span className="pw-chip-text">
                    <strong>{e.name}</strong>
                    <span className="pw-chip-sub">{kindIcon(e.kind)} {kindLabel(e.kind, lang)} · {VISIBILITY[e.visibility]?.icon} {visLabel(e.visibility, lang)}</span>
                    {e.summary && <span className="pw-row-summary">{e.summary}</span>}
                  </span>
                  <span className="pw-check" aria-hidden="true">{on ? '✓' : '+'}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {list.length === 0 && !q.trim() && (
          <p className="muted pw-empty">{t(lang,
            'Seu mundo ainda está em silêncio. Digite um nome acima para criar o primeiro cartão — só o nome já basta.',
            'Your world is still silent. Type a name above to create the first card — the name alone is enough.')}</p>
        )}
        {onCreate && q.trim() && !exact && (
          <button type="button" className="btn btn-primary btn-sm pw-create" disabled={busy || full} onClick={create}>
            {busy ? '…' : t(lang, `＋ Criar “${q.trim()}” como ${kindLabel(createKind, lang)}`, `＋ Create “${q.trim()}” as ${kindLabel(createKind, lang)}`)}
          </button>
        )}
        {onCreate && q.trim() && !exact && (
          <p className="muted small">{t(lang, 'O cartão novo nasce oculto: os jogadores só veem quando você revelar.', 'The new card starts hidden: players only see it when you reveal it.')}</p>
        )}
        {error && <p className="prep-error" role="alert">{error}</p>}
        <div className="prep-modal-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>{t(lang, 'Pronto', 'Done')}</button>
        </div>
      </div>
    </div>
  );
}
