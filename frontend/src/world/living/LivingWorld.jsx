// Mundo vivo (mestre), no topo do Atlas: a carta celeste do mundo, a frase de
// quanto a mesa já conhece, as páginas em branco do cronista, os ecos da mesa
// e os rumores da taverna. Tudo discreto, recolhível e desligável em
// ⚙ Ajustes › Mundo vivo.
//
// Uma linha só "✦ Mundo vivo · 2 páginas em branco · 3 ecos · boato do dia" abre e
// fecha o painel inteiro (plano F9): fechada por padrão no celular (≤ 767 px, para a
// lista aparecer logo), aberta no PC; a escolha fica lembrada no aparelho.
import { useMemo, useState } from 'react';
import SkyAtlas from './SkyAtlas.jsx';
import BlankPages, { readDismissed } from './BlankPages.jsx';
import EchoesPanel from './EchoesPanel.jsx';
import TavernRumors from './TavernRumors.jsx';
import { blankPages, echoLinesFrom, knownPhrase, livingSummary } from './living-logic.js';
import './living.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const SKY_KEY = 'forja:lv-sky-open';
const OPEN_KEY = 'forja:lv-open';

const mq = (q) => { try { return window.matchMedia(q).matches; } catch { return false; } };
function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* ok */ }
  return fallback;
}
const writePref = (key, v) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* ok */ } };

export default function LivingWorld({ entries, lang = 'pt', campaignId, echoes, onOpen, onCreate, selectedId }) {
  // Padrão: o painel fechado no celular e o céu recolhido em tela pequena.
  const [open, setOpen] = useState(() => readPref(OPEN_KEY, !mq('(max-width: 767px)')));
  const [skyOpen, setSkyOpen] = useState(() => readPref(SKY_KEY, !mq('(max-width: 480px)')));
  const known = useMemo(() => knownPhrase(entries, lang), [entries, lang]);
  // O que tem dentro, para a linha fechada (relido a cada abrir/fechar: "Agora não" muda)
  const summary = useMemo(() => livingSummary({
    pages: onCreate ? blankPages(entries, lang, { dismissed: readDismissed(`forja:blank-pages:${campaignId}`), seed: campaignId }).length : 0,
    echoes: echoLinesFrom(echoes, entries, lang, 6).length,
    rumor: !!onCreate,
  }, lang), [entries, lang, echoes, onCreate, campaignId, open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!entries || !entries.length) return null;
  const toggle = () => { const next = !open; setOpen(next); writePref(OPEN_KEY, next); };
  const toggleSky = () => { const next = !skyOpen; setSkyOpen(next); writePref(SKY_KEY, next); };

  return (
    <section className={`lv-living${open ? ' is-open' : ' is-closed'}`} aria-label={t(lang, 'Mundo vivo', 'Living world')}>
      <button type="button" className="lv-line" aria-expanded={open} onClick={toggle}>
        <span className="lv-fold-ico" aria-hidden="true">✦</span>
        <span className="lv-line-text">
          <span className="lv-line-title">{t(lang, 'Mundo vivo', 'Living world')}</span>
          {summary.length > 0 && <span className="lv-line-sum"> · {summary.join(' · ')}</span>}
        </span>
        <span className="lv-fold-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <>
          <div className="lv-head">
            <button type="button" className="lv-fold lv-fold-sky" aria-expanded={skyOpen} onClick={toggleSky}>
              <span className="lv-fold-ico" aria-hidden="true">✧</span>
              <span className="lv-fold-title">{t(lang, 'O céu do seu mundo', 'Your world\'s sky')}</span>
              <span className="lv-fold-caret" aria-hidden="true">▾</span>
            </button>
            {known && <p className="lv-known">{known}</p>}
          </div>
          {skyOpen && <SkyAtlas entries={entries} lang={lang} onOpen={onOpen} selectedId={selectedId} />}
          <div className="lv-side">
            {onCreate && <BlankPages entries={entries} lang={lang} campaignId={campaignId} onCreate={onCreate} onOpen={onOpen} />}
            <EchoesPanel echoes={echoes} entries={entries} lang={lang} onOpen={onOpen} />
            {onCreate && <TavernRumors lang={lang} campaignId={campaignId} onCreate={onCreate} />}
          </div>
        </>
      )}
    </section>
  );
}
