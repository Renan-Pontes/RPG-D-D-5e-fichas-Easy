/* Aba do mestre: catálogo de itens da campanha (cadastrar, editar, remover). */
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ItemForm, { typeLabel } from './ItemForm.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const text = (v, lang) => (typeof v === 'string' ? v : v?.[lang] || v?.en || '');

export default function CampaignItemsTab({ campaign, lang }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | {id, item}
  const [error, setError] = useState('');

  const load = () => api.campaignItems(campaign.id)
    .then(r => setItems(r.items || []))
    .catch(e => setError(e?.data?.error || e?.message || 'failed'));
  useEffect(() => { load(); }, [campaign.id]);

  const save = async (item) => {
    if (editing === 'new') await api.createCampaignItem(campaign.id, item);
    else await api.updateCampaignItem(campaign.id, editing.id, item);
    setEditing(null);
    await load();
  };

  const remove = async (row) => {
    if (!window.confirm(t(lang, `Remover "${row.item.name}" do catálogo? (Não tira dos inventários.)`, `Remove "${row.item.name}" from the catalog? (Inventories keep it.)`))) return;
    await api.deleteCampaignItem(campaign.id, row.id);
    await load();
  };

  if (editing) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>{editing === 'new' ? t(lang, 'Novo item', 'New item') : t(lang, 'Editar item', 'Edit item')}</h3>
        <ItemForm lang={lang} initial={editing === 'new' ? null : editing.item} submitLabel={t(lang, 'Salvar', 'Save')} onSubmit={save} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="muted small" style={{ margin: 0 }}>
          {t(lang, 'Itens da campanha (só o mestre vê). Entregue pelo "Dar item" em Membros.', 'Campaign items (DM only). Hand them out with "Give item" under Members.')}
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t(lang, 'Cadastrar item', 'Add item')}</button>
      </div>
      {error && <p style={{ color: 'var(--blood-bright)' }}>{error}</p>}
      {items && !items.length && <p className="muted">{t(lang, 'Nenhum item cadastrado.', 'No items yet.')}</p>}
      {(items || []).map(row => (
        <div key={row.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <strong>{row.item.name}</strong> <span className="muted small">· {typeLabel(row.item.type, lang)}</span>
              <div className="muted small">
                {[row.item.weapon && `⚔ ${row.item.weapon.damage} ${row.item.weapon.dmgType}`,
                  row.item.armor && `🛡 CA ${row.item.armor.ac}`,
                  row.item.magic && `✨ ${row.item.magic.rarity}${row.item.magic.attunement ? t(lang, ' · sintonia', ' · attunement') : ''}`,
                  row.item.cost != null && `${row.item.cost} PO`].filter(Boolean).join(' · ')}
              </div>
              {row.item.magic?.effect && text(row.item.magic.effect, lang) && <div className="text-sm" style={{ color: 'var(--gold)' }}>{text(row.item.magic.effect, lang)}</div>}
              {row.item.description && <div className="text-sm muted">{text(row.item.description, lang)}</div>}
            </div>
            <div className="row gap-1">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(row)}>{t(lang, 'Editar', 'Edit')}</button>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(row)}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
