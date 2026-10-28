// "📖 Aventuras prontas" numa folha (1ª porta do Plano, ⋯ do Plano e o cartão do topo de
// Preparar › Aventuras). A galeria é a de sempre (ReadyAdventureGallery, "Adicionar à
// campanha" · "Já está" · "Abrir"); importar com o plano vazio preenche o plano.
import MesaSheet from '../shell/MesaSheet.jsx';
import ReadyAdventureGallery from '../ready/ReadyAdventureGallery.jsx';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function ReadySheet({ campaign, lang, onClose, onImported, onOpen }) {
  return (
    <MesaSheet title={t(lang, 'Aventuras prontas', 'Ready adventures')} icon="📖" size="tall" width="lg" lang={lang}
      onClose={onClose} className="ready-sheet"
      footer={<button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Fechar', 'Close')}</button>}>
      <p className="mesa-sheet-text">{t(lang,
        'Cada uma traz o mundo (lugares, personagens, facções, lendas e documentos), as salas com texto para ler em voz alta, testes, combates e tesouro, e dicas para a mesa. Os cartões chegam ocultos; a aventura chega como Rascunho. Com o plano vazio, o plano vem pronto.',
        'Each one brings the world (places, characters, factions, legends and handouts), rooms with read-aloud text, checks, combats and treasure, and tips for the table. Cards arrive hidden; the adventure arrives as a Draft. With an empty plan, the plan comes ready.')}</p>
      <ReadyAdventureGallery lang={lang} mode="import" campaignId={campaign.id} onImported={onImported} onOpen={onOpen} />
    </MesaSheet>
  );
}
