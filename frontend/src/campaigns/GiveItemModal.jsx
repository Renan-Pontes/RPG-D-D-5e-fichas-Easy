import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ItemPickerModal from '../items/ItemPickerModal.jsx';
import { flash } from '../play/flash.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

/**
 * Modal pro DM dar item a um personagem da campanha: catálogo da campanha,
 * catálogo SRD ou cadastro novo (opcionalmente salvo no catálogo da campanha).
 */
// notify=false: quem chama mostra a própria confirmação.
export default function GiveItemModal({ campaign, character, lang, onClose, onGiven, notify = true }) {
  const [campaignItems, setCampaignItems] = useState(null);

  useEffect(() => {
    if (!campaign) { setCampaignItems([]); return; }
    api.campaignItems(campaign.id).then(r => setCampaignItems(r.items || [])).catch(() => setCampaignItems([]));
  }, [campaign?.id]);

  if (campaignItems === null) return null;
  return (
    <ItemPickerModal
      lang={lang}
      title={<>🎁 {t(lang, 'Dar item', 'Give item')} <span className="muted small" style={{ marginLeft: 6 }}>→ {character.name}</span></>}
      confirmLabel={t(lang, 'Dar', 'Give')}
      campaignItems={campaign ? campaignItems : undefined}
      onSaveToCatalog={campaign ? (item) => api.createCampaignItem(campaign.id, item) : undefined}
      onPick={async (instance) => {
        await api.invAdd(character.id, { item: instance });
        // Confirmação visível (o modal costuma fechar logo em seguida).
        const qty = instance?.qty > 1 ? `${instance.qty}× ` : '';
        const raw = instance?.name;
        const itemName = (raw && typeof raw === 'object' ? (raw[lang] || raw.pt || raw.en) : raw) || t(lang, 'o item', 'the item');
        if (notify) flash(t(lang, `${character.name} recebeu ${qty}${itemName}`, `${character.name} received ${qty}${itemName}`));
        onGiven?.(instance);
      }}
      onClose={onClose}
    />
  );
}
