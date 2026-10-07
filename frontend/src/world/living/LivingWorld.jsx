// Mundo vivo (mestre), no topo do Atlas: a carta celeste do mundo, a frase de
// quanto a mesa já conhece, as páginas em branco do cronista, os ecos da mesa
// e os rumores da taverna. Tudo discreto, recolhível e desligável em
// ⚙ Ajustes › Mundo vivo.
import { useMemo, useState } from 'react';
import SkyAtlas from './SkyAtlas.jsx';
import BlankPages from './BlankPages.jsx';
import EchoesPanel from './EchoesPanel.jsx';
import TavernRumors from './TavernRumors.jsx';
import { knownPhrase } from './living-logic.js';
import './living.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const SKY_KEY = 'forja:lv-sky-open';

// Padrão: aberto no computador, recolhido no celular (para o Atlas aparecer logo).
function readSkyOpen() {
  let small = false;
  try { small = window.matchMedia('(max-width: 480px)').matches; } catch { /* ok */ }
  try {
    const v = localStorage.getItem(SKY_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* ok */ }
  return !small;
}

export default function LivingWorld({ entries, lang = 'pt', campaignId, echoes, onOpen, onCreate, selectedId }) {
  const [skyOpen, setSkyOpen] = useState(readSkyOpen);
  const known = useMemo(() => knownPhrase(entries, lang), [entries, lang]);
  if (!entries || !entries.length) return null;
  const toggleSky = () => {
    const next = !skyOpen;
    setSkyOpen(next);
    try { localStorage.setItem(SKY_KEY, next ? '1' : '0'); } catch { /* ok */ }
  };

  return (
    <section className="lv-living" aria-label={t(lang, 'Mundo vivo', 'Living world')}>
      <div className="lv-head">
        <button type="button" className="lv-fold lv-fold-sky" aria-expanded={skyOpen} onClick={toggleSky}>
          <span className="lv-fold-ico" aria-hidden="true">✦</span>
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
    </section>
  );
}
