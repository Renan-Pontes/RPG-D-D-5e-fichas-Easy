/* Escolhe um item do catálogo SRD, do catálogo da campanha ou cadastra um novo. */
import { useMemo, useState } from 'react';
import { ITEMS, ITEM_TYPES, instantiate } from '../../data/items.js';
import ItemForm, { typeLabel } from './ItemForm.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const nameOf = (it, lang) => (typeof it.name === 'string' ? it.name : it.name?.[lang] || it.name?.en || '?');

const statLine = (it, lang) => [
  it.weapon && `⚔ ${it.weapon.damage} ${it.weapon.dmgType}`,
  it.armor && `🛡 CA ${it.armor.ac}`,
  it.magic && `✨ ${it.magic.rarity}${it.magic.attunement ? t(lang, ' · sintonia', ' · attunement') : ''}`,
].filter(Boolean).join(' · ');

/**
 * props:
 *  - title, confirmLabel
 *  - campaignItems?: [{id, item}]  → mostra a aba "Campanha"
 *  - onSaveToCatalog?: async (item) → mostra "salvar no catálogo" no cadastro
 *  - onPick: async (instance) → recebe a instância pronta (com id e qty)
 */
export default function ItemPickerModal({ lang, title, confirmLabel, campaignItems, onSaveToCatalog, onPick, onClose }) {
  const [tab, setTab] = useState(campaignItems?.length ? 'campaign' : 'srd');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const source = tab === 'campaign'
    ? (campaignItems || []).map(ci => ({ ...ci.item, sourceId: `campaign-${ci.id}` }))
    : ITEMS;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter(it => (!type || it.type === type) &&
      (!q || `${nameOf(it, 'pt')} ${nameOf(it, 'en')}`.toLowerCase().includes(q))).slice(0, 100);
  }, [source, query, type]);

  const pick = async (src) => {
    setBusy(true); setError('');
    try {
      await onPick(instantiate(src, { qty: Math.max(1, parseInt(qty) || 1), name: nameOf(src, lang) }));
      onClose();
    } catch (e) {
      setError(e?.data?.error || e?.message || 'failed');
    } finally { setBusy(false); }
  };

  const tabs = [
    ...(campaignItems ? [['campaign', t(lang, 'Campanha', 'Campaign')]] : []),
    ['srd', t(lang, 'Catálogo SRD', 'SRD catalog')],
    ['new', t(lang, 'Cadastrar novo', 'Create new')],
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal monster-picker" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <div className="row gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          {tabs.map(([id, label]) => (
            <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTab(id); setSelected(null); }}>{label}</button>
          ))}
        </div>

        {tab === 'new' ? (
          <ItemForm
            lang={lang}
            submitLabel={confirmLabel}
            onCancel={onClose}
            extra={onSaveToCatalog && (
              <label className="row gap-2" style={{ alignItems: 'center', margin: 0 }}>
                <input type="checkbox" checked={saveToCatalog} onChange={e => setSaveToCatalog(e.target.checked)} style={{ width: 'auto', minHeight: 'auto' }} />
                {t(lang, 'Salvar também no catálogo da campanha', 'Also save to the campaign catalog')}
              </label>
            )}
            onSubmit={async (item) => {
              if (onSaveToCatalog && saveToCatalog) await onSaveToCatalog(item);
              await onPick(instantiate({ ...item, sourceId: 'custom' }, { qty: 1, name: item.name }));
              onClose();
            }}
          />
        ) : (
          <>
            <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <input className="input" placeholder={t(lang, 'Buscar…', 'Search…')} value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 2 }} />
              <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ flex: 1 }}>
                <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
                {ITEM_TYPES.map(ty => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
              </select>
            </div>
            {tab === 'campaign' && !filtered.length && (
              <p className="muted small">{t(lang, 'Nenhum item cadastrado na campanha ainda. Use "Cadastrar novo" ou a aba Itens da campanha.', 'No campaign items yet. Use "Create new" or the campaign Items tab.')}</p>
            )}
            <div className="monster-grid">
              {filtered.map(it => (
                <div key={it.sourceId} className={`monster-row ${selected?.sourceId === it.sourceId ? 'selected' : ''}`} onClick={() => setSelected(it)}>
                  <div><strong>{nameOf(it, lang)}</strong> <span className="muted small">· {typeLabel(it.type, lang)}</span></div>
                  <div className="muted small">{statLine(it, lang)}</div>
                </div>
              ))}
            </div>
            <div className="row gap-2" style={{ alignItems: 'center', marginTop: 12 }}>
              <span className="muted small">{t(lang, 'Qtd', 'Qty')}:</span>
              <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="input" style={{ width: 80 }} />
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button className="btn btn-primary btn-sm" disabled={!selected || busy} onClick={() => pick(selected)}>{busy ? '…' : confirmLabel}</button>
            </div>
          </>
        )}
        {error && <div className="text-sm" style={{ color: 'var(--blood-bright)', marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
