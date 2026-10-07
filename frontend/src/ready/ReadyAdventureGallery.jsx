import { useEffect, useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { readyApi, levelLabel, metaLine, readyErrorText, importedNote } from './ready-logic.js';
import './ready.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * Galeria das aventuras prontas da Forja (originais, para iniciantes).
 *
 * Dois modos:
 *  - mode="pick"   (assistente de nova campanha): cartões como rádio; a campanha
 *                  ainda não existe, quem importa é o assistente depois de criá-la.
 *                  props: selected, onSelect(id)
 *  - mode="import" (Preparar › Aventuras): cada cartão tem "Adicionar à campanha";
 *                  as já importadas mostram "Abrir".
 *                  props: campaignId, onImported(result), onOpen(adventureId)
 */
export default function ReadyAdventureGallery({ lang = 'pt', mode = 'pick', selected = null, onSelect, campaignId, onImported, onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    const load = mode === 'import' && campaignId ? readyApi.status(campaignId, lang) : readyApi.catalog(lang);
    load.then(r => { if (alive) setItems(r.adventures || []); })
      .catch(e => { if (alive) { setItems([]); setError(errorMessage(e, lang)); } });
    return () => { alive = false; };
  }, [mode, campaignId, lang]);

  const add = async (adv) => {
    if (busyId) return;
    setBusyId(adv.id); setError(''); setNote('');
    try {
      const r = await readyApi.importInto(campaignId, adv.id, lang);
      setItems(list => (list || []).map(a => (a.id === adv.id ? { ...a, imported: true, adventureId: r.adventureId } : a)));
      setNote(importedNote(r, lang));
      onImported?.(r);
    } catch (e) {
      const code = e?.data?.error;
      if (code === 'already_imported') {
        setItems(list => (list || []).map(a => (a.id === adv.id ? { ...a, imported: true, adventureId: e.data.adventureId } : a)));
      }
      setError(readyErrorText(code, lang) || errorMessage(e, lang));
    } finally { setBusyId(null); }
  };

  const toggleMore = (id) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (items === null) return <p className="muted ready-loading">{t(lang, 'Abrindo a estante de aventuras…', 'Opening the adventure shelf…')}</p>;

  const pick = mode === 'pick';
  return (
    <div className="ready">
      <div className="ready-grid" role={pick ? 'radiogroup' : 'list'} aria-label={t(lang, 'Aventuras prontas', 'Ready adventures')}>
        {items.map(a => {
          const active = pick && selected === a.id;
          const more = open.has(a.id);
          const body = (
            <>
              <div className="ready-art" aria-hidden="true">
                <img src={a.art} alt="" loading="lazy" onError={(e) => {
                  const img = e.currentTarget;
                  if (a.artFallback && !img.dataset.fallback) { img.dataset.fallback = '1'; img.src = a.artFallback; } else img.style.display = 'none';
                }} />
                <span className="ready-level">{levelLabel(a.levels, lang)}</span>
              </div>
              <div className="ready-body">
                <span className="ready-theme">{a.theme}</span>
                <strong className="ready-name">{a.name}</strong>
                <span className="ready-tagline">{a.tagline}</span>
                <span className={`ready-pitch ${more ? 'is-open' : ''}`}>{a.pitch}</span>
                <span className="ready-meta">{metaLine(a, lang)}</span>
              </div>
            </>
          );
          if (pick) {
            return (
              <button type="button" key={a.id} role="radio" aria-checked={active}
                className={`ready-card is-pick ${active ? 'active' : ''}`} onClick={() => onSelect?.(a.id)}>
                {body}
              </button>
            );
          }
          return (
            <article key={a.id} role="listitem" className={`ready-card ${a.imported ? 'is-imported' : ''}`}>
              {body}
              <div className="ready-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleMore(a.id)} aria-expanded={more}>
                  {more ? t(lang, 'Menos', 'Less') : t(lang, 'Ler mais', 'Read more')}
                </button>
                <span className="ready-spacer" />
                {a.imported ? (
                  <>
                    <span className="ready-here">{t(lang, 'Já está na campanha', 'Already in the campaign')}</span>
                    {a.adventureId && onOpen && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpen(a.adventureId)}>{t(lang, 'Abrir', 'Open')}</button>
                    )}
                  </>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" disabled={!!busyId} onClick={() => add(a)}>
                    {busyId === a.id ? t(lang, 'Trazendo para a mesa…', 'Bringing it to the table…') : t(lang, 'Adicionar à campanha', 'Add to campaign')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {pick && (
        <p className="ready-fine muted">{t(lang,
          'Aventuras originais da Forja, para iniciantes. Os cartões do Mundo chegam ocultos: os jogadores só veem o que você revelar.',
          'Original Forja adventures, for beginners. World cards arrive hidden: players only see what you reveal.')}</p>
      )}
      {note && <p className="ready-note" role="status">{note}</p>}
      {error && <p className="ready-error" role="alert">{error}</p>}
    </div>
  );
}
