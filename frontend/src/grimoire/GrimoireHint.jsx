/* Botão "?" que abre a regra do Grimório por cima da ficha.
 * Leve: o conteúdo (GrimoirePopup + dados) só carrega no primeiro clique. */
import { lazy, Suspense, useState } from 'react';
import './hint.css';

const GrimoirePopup = lazy(() => import('./GrimoirePopup.jsx'));

export default function GrimoireHint({ id, lang, label }) {
  const [open, setOpen] = useState(false);
  const title = label || (lang === 'pt' ? 'O que é isso? (Grimório)' : 'What is this? (Grimoire)');
  return (
    <>
      <button type="button" className="grim-hint no-print" onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={title} aria-label={title}>?</button>
      {open && (
        <Suspense fallback={null}>
          <GrimoirePopup id={id} lang={lang} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
