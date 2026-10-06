// Campos de ligação do Mundo: texto com @menção, relações, "fica em" e tags.
import { useMemo, useRef, useState } from 'react';
import {
  RELS, filterEntries, insertMention, kindIcon, mentionQueryAt, norm, parseMentions, relLabel, sortEntries, t,
} from './world-model.js';

// ------------------------------------------------------------------ @menção
/**
 * Textarea que sugere cartões ao digitar "@". O valor guarda @[Nome](id);
 * abaixo do campo aparece uma prévia com as menções destacadas.
 */
export function MentionTextarea({ value, onChange, entries, selfId, lang = 'pt', placeholder, rows = 5, id, label }) {
  const ref = useRef(null);
  const [q, setQ] = useState(null); // {start, query}
  const [hi, setHi] = useState(0);
  const options = useMemo(() => {
    if (!q) return [];
    const list = (entries || []).filter(e => e.id !== selfId);
    return (q.query ? filterEntries(list, { q: q.query }) : sortEntries(list)).slice(0, 7);
  }, [q, entries, selfId]);

  const sync = (el) => {
    const m = mentionQueryAt(el.value, el.selectionStart ?? el.value.length);
    setQ(m); setHi(0);
  };
  const choose = (entry) => {
    const el = ref.current;
    if (!el || !q) return;
    const caret = el.selectionStart ?? value.length;
    const r = insertMention(value, q.start, caret, entry.name, entry.id);
    onChange(r.text);
    setQ(null);
    requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(r.caret, r.caret); } catch { /* ok */ } });
  };
  const onKeyDown = (e) => {
    if (!q || !options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h - 1 + options.length) % options.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(options[hi]); }
    else if (e.key === 'Escape') { e.preventDefault(); setQ(null); }
  };
  const hasMentions = parseMentions(value).some(p => p.type === 'mention');

  return (
    <div className="wl-mention">
      {label && <label className="wl-label" htmlFor={id}>{label}</label>}
      <textarea
        id={id} ref={ref} rows={rows} value={value} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); sync(e.target); }}
        onKeyDown={onKeyDown}
        onClick={e => sync(e.target)}
        onBlur={() => setTimeout(() => setQ(null), 150)}
      />
      {q && options.length > 0 && (
        <ul className="wl-mention-pop" role="listbox">
          {options.map((o, i) => (
            <li key={o.id} role="option" aria-selected={i === hi}>
              <button type="button" className={i === hi ? 'is-hi' : ''} onMouseDown={e => { e.preventDefault(); choose(o); }}>
                <span aria-hidden="true">{kindIcon(o.kind)}</span> {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="wl-hint">{t(lang, 'Dica: digite @ para ligar outro cartão.', 'Tip: type @ to link another card.')}</div>
      {hasMentions && <MentionPreview text={value} entries={entries} />}
    </div>
  );
}

/** Texto com menções viradas em "links" (onOpen(id)); sem onOpen vira destaque. */
export function MentionText({ text, onOpen, entries }) {
  const known = entries ? new Set(entries.map(e => e.id)) : null;
  return (
    <>
      {parseMentions(text).map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.text}</span>;
        if (onOpen && (!known || known.has(p.id))) {
          return <button key={i} type="button" className="wl-mention-link" onClick={() => onOpen(p.id)}>{p.name}</button>;
        }
        return <span key={i} className="wl-mention-chip">{p.name}</span>;
      })}
    </>
  );
}

function MentionPreview({ text, entries }) {
  return <div className="wl-mention-preview"><MentionText text={text} entries={entries} /></div>;
}

// ------------------------------------------------------------------ escolher cartão
/** Busca + lista para escolher um cartão (sem <select> gigante). */
export function EntryPicker({ entries, value, onChange, exclude = [], kinds, lang = 'pt', placeholder, allowNone = true, autoFocus = false }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(autoFocus);
  const current = (entries || []).find(e => e.id === value);
  const list = useMemo(() => {
    let l = (entries || []).filter(e => !exclude.includes(e.id) && (!kinds || kinds.includes(e.kind)));
    l = q ? filterEntries(l, { q }) : sortEntries(l);
    return l.slice(0, 30);
  }, [entries, exclude, kinds, q]);
  if (!open) {
    return (
      <button type="button" className="wl-picker-btn" onClick={() => setOpen(true)}>
        {current ? <><span aria-hidden="true">{kindIcon(current.kind)}</span> {current.name}</> : <span className="wl-muted">{placeholder || t(lang, 'Escolher…', 'Choose…')}</span>}
        <span aria-hidden="true" className="wl-picker-caret">▾</span>
      </button>
    );
  }
  return (
    <div className="wl-picker">
      <input autoFocus type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t(lang, 'Buscar cartão…', 'Search card…')}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } if (e.key === 'Enter' && list[0]) { e.preventDefault(); onChange(list[0].id); setOpen(false); setQ(''); } }} />
      <ul className="wl-picker-list">
        {allowNone && (
          <li><button type="button" onClick={() => { onChange(null); setOpen(false); setQ(''); }}>— {t(lang, 'nenhum', 'none')} —</button></li>
        )}
        {list.map(e => (
          <li key={e.id}>
            <button type="button" className={e.id === value ? 'is-on' : ''} onClick={() => { onChange(e.id); setOpen(false); setQ(''); }}>
              <span aria-hidden="true">{kindIcon(e.kind)}</span> {e.name}
            </button>
          </li>
        ))}
        {!list.length && <li className="wl-muted wl-picker-empty">{t(lang, 'Nada encontrado.', 'Nothing found.')}</li>}
      </ul>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{t(lang, 'Fechar', 'Close')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ relações
export function RelationsEditor({ links, onChange, entries, selfId, lang = 'pt', onOpen }) {
  const [adding, setAdding] = useState(false);
  const [rel, setRel] = useState('ally');
  const byId = useMemo(() => new Map((entries || []).map(e => [e.id, e])), [entries]);
  const list = links || [];
  const update = (i, patch) => onChange(list.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i) => onChange(list.filter((_, j) => j !== i));
  const add = (to) => {
    if (!to) return;
    if (!list.some(l => l.to === to && l.rel === rel)) onChange([...list, { to, rel, note: '' }]);
    setAdding(false);
  };
  return (
    <div className="wl-rels">
      {list.length === 0 && !adding && <p className="wl-muted wl-small">{t(lang, 'Nenhuma relação ainda. Quem são os aliados, inimigos, parentes?', 'No relations yet. Who are the allies, enemies, family?')}</p>}
      {list.map((l, i) => {
        const target = byId.get(l.to);
        return (
          <div key={`${l.to}-${l.rel}-${i}`} className="wl-rel-row">
            <select value={l.rel} onChange={e => update(i, { rel: e.target.value })} aria-label={t(lang, 'Relação', 'Relation')}>
              {RELS.map(r => <option key={r} value={r}>{relLabel(r, lang)}</option>)}
            </select>
            {target
              ? <button type="button" className="wl-rel-target" onClick={() => onOpen?.(target.id)}><span aria-hidden="true">{kindIcon(target.kind)}</span> {target.name}</button>
              : <span className="wl-muted">{t(lang, '(cartão apagado)', '(deleted card)')}</span>}
            <input className="wl-rel-note" value={l.note || ''} maxLength={200} placeholder={t(lang, 'nota (opcional)', 'note (optional)')}
              onChange={e => update(i, { note: e.target.value })} />
            <button type="button" className="wl-x" onClick={() => remove(i)} aria-label={t(lang, 'Remover relação', 'Remove relation')}>×</button>
          </div>
        );
      })}
      {adding ? (
        <div className="wl-rel-add">
          <select value={rel} onChange={e => setRel(e.target.value)} aria-label={t(lang, 'Relação', 'Relation')}>
            {RELS.map(r => <option key={r} value={r}>{relLabel(r, lang)}</option>)}
          </select>
          <EntryPicker entries={entries} value={null} onChange={add} exclude={[selfId]} lang={lang} allowNone={false} autoFocus />
        </div>
      ) : (
        list.length < 40 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>＋ {t(lang, 'Relação', 'Relation')}</button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ tags
export function TagsInput({ value, onChange, lang = 'pt', suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const tags = value || [];
  const add = (raw) => {
    const tag = raw.replace(/^#/, '').trim().slice(0, 30);
    if (!tag || tags.length >= 12 || tags.some(x => norm(x) === norm(tag))) { setDraft(''); return; }
    onChange([...tags, tag]);
    setDraft('');
  };
  const sugg = suggestions.filter(s => !tags.some(x => norm(x) === norm(s)) && (!draft || norm(s).startsWith(norm(draft)))).slice(0, 6);
  return (
    <div className="wl-tags">
      <div className="wl-tags-row">
        {tags.map(tag => (
          <span key={tag} className="wl-tag wl-tag-edit">#{tag}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== tag))} aria-label={t(lang, `Remover ${tag}`, `Remove ${tag}`)}>×</button>
          </span>
        ))}
        {tags.length < 12 && (
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t(lang, 'nova tag…', 'new tag…')}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
              else if (e.key === 'Backspace' && !draft && tags.length) onChange(tags.slice(0, -1));
            }}
            onBlur={() => draft && add(draft)} />
        )}
      </div>
      {sugg.length > 0 && (
        <div className="wl-tags-sugg">
          {sugg.map(s => <button key={s} type="button" className="wl-tag" onMouseDown={e => { e.preventDefault(); add(s); }}>#{s}</button>)}
        </div>
      )}
    </div>
  );
}

export default RelationsEditor;
