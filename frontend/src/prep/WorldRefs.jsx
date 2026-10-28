import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import MesaSheet from '../shell/MesaSheet.jsx';
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

/** Pílula de um cartão (nome, tipo e oculto escritos para o leitor de tela) com o × de 44 px. */
function WorldPill({ entry, lang, onOpen, onRemove }) {
  const vis = VISIBILITY[entry.visibility] || VISIBILITY.hidden;
  return (
    <span className={`pw-pill v-${entry.visibility}`}>
      <button type="button" className="pw-pill-main" onClick={onOpen ? () => onOpen(entry) : undefined} disabled={!onOpen}
        aria-label={`${entry.name} · ${kindLabel(entry.kind, lang)} · ${visLabel(entry.visibility, lang)}${onOpen ? ` · ${t(lang, 'abrir no Mundo', 'open in World')}` : ''}`}>
        <span aria-hidden="true">{kindIcon(entry.kind)}{entry.visibility === 'hidden' ? vis.icon : ''}</span>
        <span>{entry.name}</span>
      </button>
      {onRemove && (
        <button type="button" className="pw-pill-x" onClick={() => onRemove(entry)} aria-label={t(lang, `Tirar ${entry.name}`, `Remove ${entry.name}`)}>×</button>
      )}
    </span>
  );
}

/**
 * Campo "cartões do Mundo": mostra os escolhidos e abre um seletor (folha) com a busca
 * no topo, filtro por tipo e criação rápida (o cartão novo nasce OCULTO no Mundo).
 * `kinds` pode juntar tipos (À mão na sessão toda: pessoas, facções e lugares); quem
 * chama decide em que lista cada id entra (onToggle recebe o id).
 * `rail` (com `pills`, no celular): as pílulas numa linha só que rola de lado, com o "＋"
 * embaixo; `onOverflow(bool)` diz se alguma ficou fora, para quem chama oferecer "Ver todas".
 */
export default function WorldRefs({
  entries, ids, kinds = null, lang, max = 20, onToggle, onCreate, onOpen, emptyText, addLabel, compact = false, readOnly = false, pills = false,
  rail = false, onOverflow,
}) {
  const [open, setOpen] = useState(false);
  const chosen = useMemo(() => pickEntries(ids, entries), [ids, entries]);
  const chipsRef = useRef(null);
  const inRail = pills && rail;
  useLayoutEffect(() => {
    if (!onOverflow) return undefined;
    const el = chipsRef.current;
    if (!el || !inRail) { onOverflow(false); return undefined; }
    const check = () => onOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inRail, chosen.length, onOverflow]);
  const loading = entries == null;
  const add = !readOnly && (
    <button type="button" className="mesa-btn pw-add" disabled={loading} onClick={() => setOpen(true)}>
      {loading ? t(lang, 'Carregando o Mundo…', 'Loading the World…') : `＋ ${addLabel || t(lang, 'Escolher do Mundo', 'Pick from the World')}`}
    </button>
  );
  return (
    <div className={`pw-refs ${compact ? 'is-compact' : ''} ${pills ? 'is-pills' : ''}`}>
      {chosen.length > 0 && (
        <div className={`pw-chips ${inRail ? 'is-rail' : ''}`} ref={chipsRef}>
          {chosen.map(e => (pills
            ? <WorldPill key={e.id} entry={e} lang={lang} onOpen={onOpen} onRemove={readOnly ? null : () => onToggle(e.id)} />
            : <WorldChip key={e.id} entry={e} lang={lang} onOpen={onOpen} onRemove={readOnly ? null : () => onToggle(e.id)} />))}
          {pills && !inRail && add}
        </div>
      )}
      {!loading && chosen.length === 0 && emptyText && <p className="muted small pw-empty">{emptyText}</p>}
      {(!pills || inRail || chosen.length === 0) && add}
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
  const allowed = kinds ? WORLD_KINDS.filter(k => kinds.includes(k.id)) : WORLD_KINDS;
  const list = useMemo(() => searchEntries(entries, q, kind ? [kind] : kinds), [entries, q, kind, kinds]);
  const full = ids.length >= max;
  const createKind = kind || (kinds?.[0]) || 'npc';
  const exact = list.some(e => e.name.trim().toLowerCase() === q.trim().toLowerCase());

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

  // Folha (sobe de baixo no celular): a busca e os tipos ficam presos no topo do corpo,
  // a lista rola embaixo e o "Pronto" fica no rodapé — o campo nunca vai para o pé da tela.
  return (
    <MesaSheet title={t(lang, 'Do seu Mundo', 'From your World')} icon="🌍" size="tall" width="md" lang={lang}
      onClose={onClose} className="pw-sheet" initialFocus=".pw-search"
      footer={<button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={onClose}>{t(lang, 'Pronto', 'Done')}</button>}>
      <div className="pw-top">
        <input className="input pw-search" value={q} maxLength={120} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim() && !exact && onCreate && list.length === 0) { e.preventDefault(); create(); } }}
          placeholder={t(lang, 'Buscar pelo nome… ou digite um nome novo', 'Search by name… or type a new name')}
          aria-label={t(lang, 'Buscar no Mundo', 'Search the World')} />
        {allowed.length > 1 && (
          <div className="pw-kinds" role="group" aria-label={t(lang, 'Tipo', 'Type')}>
            <button type="button" className={`mesa-chip ${!kind ? 'active' : ''}`} aria-pressed={!kind} onClick={() => setKind('')}>{t(lang, 'Todos', 'All')}</button>
            {allowed.map(k => (
              <button type="button" key={k.id} className={`mesa-chip ${kind === k.id ? 'active' : ''}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                {k.icon} {t(lang, k.ptPl, k.enPl)}
              </button>
            ))}
          </div>
        )}
        {onCreate && q.trim() && !exact && (
          <div className="pw-create-row">
            <button type="button" className="mesa-btn is-primary pw-create" disabled={busy || full} onClick={create}>
              {busy ? '…' : t(lang, `＋ Criar “${q.trim()}” como ${kindLabel(createKind, lang)}`, `＋ Create “${q.trim()}” as ${kindLabel(createKind, lang)}`)}
            </button>
            <p className="muted small">{t(lang, 'O cartão novo nasce oculto: os jogadores só veem quando você revelar.', 'The new card starts hidden: players only see it when you reveal it.')}</p>
          </div>
        )}
        {full && <p className="muted small">{t(lang, `Limite de ${max} cartões aqui.`, `Limit of ${max} cards here.`)}</p>}
        {error && <p className="prep-error" role="alert">{error}</p>}
      </div>
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
    </MesaSheet>
  );
}
