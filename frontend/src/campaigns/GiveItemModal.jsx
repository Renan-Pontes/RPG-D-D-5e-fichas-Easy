import { useState, useMemo } from 'react';
import { ITEMS, ITEM_TYPES, instantiate } from '../../data/items.js';
import { api } from '../api/client.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

/**
 * Modal pro DM dar item a um personagem da campanha.
 * Aceita selecionar do catálogo ou criar custom.
 */
export default function GiveItemModal({ character, lang, onClose, onGiven }) {
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [selectedSrc, setSelectedSrc] = useState(null);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState('gear');
  const [customDescription, setCustomDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter(it => {
      if (type && it.type !== type) return false;
      if (q) {
        const hay = ((it.name?.pt || '') + ' ' + (it.name?.en || '') + ' ' + it.sourceId).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).slice(0, 80);
  }, [type, query]);

  const give = async () => {
    setError(''); setBusy(true);
    try {
      let item;
      if (custom) {
        if (!customName.trim()) { setError(lang === 'pt' ? 'Nome obrigatório' : 'Name required'); setBusy(false); return; }
        item = {
          name: customName.trim(),
          type: customType,
          qty: parseInt(qty) || 1,
          description: customDescription ? { [lang]: customDescription, en: customDescription } : undefined,
        };
      } else {
        if (!selectedSrc) { setError(lang === 'pt' ? 'Selecione um item' : 'Pick an item'); setBusy(false); return; }
        item = instantiate(selectedSrc, { qty: parseInt(qty) || 1 });
        // Localiza o name no idioma do usuário
        item.name = selectedSrc.name?.[lang] || selectedSrc.name?.en || item.name;
      }
      await api.invAdd(character.id, { item });
      onGiven?.();
      onClose();
    } catch (e) {
      setError(e?.data?.error || e?.message || 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal monster-picker" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>
          🎁 {t(lang, 'Dar item', 'Give item')}
          <span className="muted small" style={{ marginLeft: 6 }}>→ {character.name}</span>
        </h2>

        <div className="row gap-2" style={{ marginBottom: 8 }}>
          <button className={`btn btn-sm ${!custom ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCustom(false)}>
            {t(lang, 'Catálogo', 'Catalog')}
          </button>
          <button className={`btn btn-sm ${custom ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCustom(true)}>
            {t(lang, 'Custom', 'Custom')}
          </button>
        </div>

        {!custom ? (
          <>
            <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <input className="input" placeholder={t(lang, 'Buscar...', 'Search...')} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                <option value="">{t(lang, 'Todos tipos', 'All types')}</option>
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="monster-grid">
              {filtered.map(it => (
                <div key={it.sourceId}
                  className={`monster-row ${selectedSrc?.sourceId === it.sourceId ? 'selected' : ''}`}
                  onClick={() => setSelectedSrc(it)}>
                  <div>
                    <strong>{it.name?.[lang] || it.name?.en}</strong>
                    <span className="muted small" style={{ marginLeft: 6 }}>· {it.type}</span>
                  </div>
                  <div className="muted small">
                    {it.weapon ? `⚔ ${it.weapon.damage} ${it.weapon.dmgType}` : null}
                    {it.armor ? `🛡 CA ${it.armor.ac} ${it.armor.type}` : null}
                    {it.magic ? `✨ ${it.magic.rarity}${it.magic.attunement ? ' · sintonia' : ''}` : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="col gap-2">
            <label className="dm-text-field">
              <span>{t(lang, 'Nome do item', 'Item name')}</span>
              <input className="input" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus />
            </label>
            <label className="dm-text-field">
              <span>{t(lang, 'Tipo', 'Type')}</span>
              <select className="input" value={customType} onChange={e => setCustomType(e.target.value)}>
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="dm-text-field">
              <span>{t(lang, 'Descrição', 'Description')}</span>
              <textarea className="input" rows={3} value={customDescription} onChange={e => setCustomDescription(e.target.value)} />
            </label>
          </div>
        )}

        <div className="row gap-2" style={{ alignItems: 'center', marginTop: 12 }}>
          <span className="muted small">{t(lang, 'Qtd', 'Qty')}:</span>
          <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="input" style={{ width: 80 }} />
          {error && <div style={{ color: '#ff9999', flex: 1 }}>{error}</div>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button className="btn btn-primary btn-sm" onClick={give} disabled={busy}>
            {busy ? '…' : t(lang, 'Dar', 'Give')}
          </button>
        </div>
      </div>
    </div>
  );
}
