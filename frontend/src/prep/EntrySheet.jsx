// O editor do cartão do Mundo aberto do Plano (§3.2: "tocar num chip abre o editor do
// cartão numa folha, sem sair do Preparar"): o mesmo EntryEditor do Mundo (salva sozinho,
// conflito de versão, revelar, 📺), na camada da mesa — por cima da folha da Cena quando o
// chip foi tocado lá. O invólucro é um diálogo modal: o Esc fecha só o editor (a folha da
// Cena embaixo não fecha junto).
import { createPortal } from 'react-dom';
import EntryEditor from '../world/EntryEditor.jsx';
import { mesaLayer } from '../shell/MesaSheet.jsx';
import '../world/world-styles.css';
import './scene-sheet.css';

export default function EntrySheet({ entryId, campaign, world, plan, lang, onClose, onSaved, onDeleted, onOpenEntry, onOpenMap }) {
  const layer = mesaLayer();
  const el = (
    <div className="ns-entry-layer" role="dialog" aria-modal="true" aria-label={lang === 'en' ? 'Card' : 'Cartão'}>
      <div className="wl-editor-scrim" onClick={onClose} aria-hidden="true" />
      <EntryEditor key={entryId} entryId={entryId} campaign={campaign} entries={world || []} plan={plan} lang={lang}
        onClose={onClose} onSaved={onSaved} onDeleted={onDeleted} onOpenEntry={onOpenEntry} onOpenMap={onOpenMap} onShow />
    </div>
  );
  return layer ? createPortal(el, layer) : el;
}
