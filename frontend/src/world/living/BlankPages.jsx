// Páginas em branco: o cronista nota lacunas do mundo e pergunta (no máximo
// duas de cada vez). "Escrever esta página" cria o cartão já pré-preenchido e
// OCULTO (ou abre o cartão quando a pergunta é sobre ele); "Agora não" guarda
// a dispensa só neste aparelho.
import { useMemo, useState } from 'react';
import { blankPages } from './living-logic.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

function readDismissed(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeDismissed(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list.slice(-80))); } catch { /* sem storage: só nesta visita */ }
}

export default function BlankPages({ entries, lang = 'pt', campaignId, onCreate, onOpen }) {
  const storeKey = `forja:blank-pages:${campaignId}`;
  const [dismissed, setDismissed] = useState(() => readDismissed(storeKey));
  const [busy, setBusy] = useState(null);
  const pages = useMemo(() => blankPages(entries, lang, { dismissed, seed: campaignId }), [entries, lang, dismissed, campaignId]);
  if (!pages.length) return null;

  const later = (key) => {
    const next = [...dismissed, key];
    setDismissed(next);
    writeDismissed(storeKey, next);
  };
  const write = async (p) => {
    if (p.cta.type === 'open') { onOpen?.(p.cta.id); return; }
    setBusy(p.key);
    try {
      const made = await onCreate?.(p.cta.fields);
      if (made) later(p.key);
    } finally { setBusy(null); }
  };

  return (
    <section className="lv-pages" aria-label={t(lang, 'Páginas em branco', 'Blank pages')}>
      <div className="lv-eyebrow" role="heading" aria-level={3}>{t(lang, 'Páginas em branco', 'Blank pages')}</div>
      <ul className="lv-pages-list">
        {pages.map(p => (
          <li key={p.key} className="lv-page">
            <span className="lv-page-ico" aria-hidden="true">{p.icon}</span>
            <p className="lv-page-q">{p.text}</p>
            <div className="lv-page-acts">
              <button type="button" className="lv-btn lv-btn-ink" disabled={busy === p.key} onClick={() => write(p)}>
                <span aria-hidden="true">✒</span> {busy === p.key ? t(lang, 'Escrevendo…', 'Writing…') : t(lang, 'Escrever esta página', 'Write this page')}
              </button>
              <button type="button" className="lv-btn lv-btn-quiet" onClick={() => later(p.key)}>{t(lang, 'Agora não', 'Not now')}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
