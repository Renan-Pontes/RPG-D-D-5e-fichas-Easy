/* Escolhe um item das regras básicas (SRD), do catálogo da campanha ou cadastra um novo. */
import { errorMessage } from '../api/errors.js';
import { useEffect, useMemo, useState } from 'react';
import { ITEMS, ITEM_TYPES, instantiate } from '../../data/items.js';
import ItemForm from './ItemForm.jsx';
import { RARITIES, dmgTypeLabel, rarityLabel, typeLabel, weaponPropLabel, weightLabel } from './item-model.js';
import { itemArt, itemEmoji } from '../art.js';
import ArtThumb from '../components/ArtThumb.jsx';
import { MAGIC_CATEGORIES, PAGE_SIZE, filterItems, magicCategoryLabel } from './item-filter.js';
import './items-styles.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const textOf = (v, lang) => (typeof v === 'string' ? v : v?.[lang] || v?.en || v?.pt || '');
const nameOf = (it, lang) => (typeof it.name === 'string' ? it.name : it.name?.[lang] || it.name?.en || '?');

const statLine = (it, lang) => [
  it.weapon && `⚔ ${it.weapon.damage} ${dmgTypeLabel(it.weapon.dmgType, lang)}`,
  it.weapon?.props?.length && it.weapon.props.map(p => weaponPropLabel(p, lang)).join(', '),
  it.armor && `🛡 ${t(lang, 'CA', 'AC')} ${it.armor.ac}`,
  it.magic && `✨ ${rarityLabel(it.magic.rarity, lang)}${it.magic.attunement ? t(lang, ' · sintonia', ' · attunement') : ''}`,
  it.weight != null && it.weight !== '' && weightLabel(it.weight, lang),
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
  const [category, setCategory] = useState('');
  const [rarity, setRarity] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Itens da campanha guardam o sourceId original (quando copiados do SRD) em artId, para a ilustração.
  const source = useMemo(() => (tab === 'campaign'
    ? (campaignItems || []).map(ci => ({ ...ci.item, artId: ci.item.artId || ci.item.sourceId, sourceId: `campaign-${ci.id}` }))
    : ITEMS), [tab, campaignItems]);
  const allFiltered = useMemo(
    () => filterItems(source, { query, type, category, rarity }),
    [source, query, type, category, rarity],
  );
  // Filtro mudou: volta para a primeira página.
  useEffect(() => { setLimit(PAGE_SIZE); }, [tab, query, type, category, rarity]);
  const filtered = allFiltered.slice(0, limit);
  const remaining = allFiltered.length - filtered.length;

  const pick = async (src) => {
    setBusy(true); setError('');
    try {
      const art = src.artId && src.artId !== src.sourceId ? { artId: src.artId } : {};
      await onPick(instantiate(src, { qty: Math.max(1, parseInt(qty) || 1), name: nameOf(src, lang), ...art }));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const tabs = [
    ...(campaignItems ? [['campaign', t(lang, 'Campanha', 'Campaign')]] : []),
    ['srd', t(lang, 'Regras básicas', 'Basic rules')],
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
              <input aria-label={t(lang, 'Buscar…', 'Search…')} className="input" placeholder={t(lang, 'Buscar…', 'Search…')} value={query} onChange={e => setQuery(e.target.value)} style={{ flex: '2 1 180px', minWidth: 0 }} />
              <select className="input" aria-label={t(lang, 'Tipo', 'Type')} value={type} onChange={e => setType(e.target.value)} style={{ flex: '1 1 150px', minWidth: 0 }}>
                <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
                {ITEM_TYPES.map(ty => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
              </select>
            </div>
            <div className="row gap-2 ip-filters" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <select className="input" aria-label={t(lang, 'Categoria mágica', 'Magic category')} value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 1 }}>
                <option value="">{t(lang, 'Todas as categorias', 'All categories')}</option>
                {MAGIC_CATEGORIES.map(c => <option key={c} value={c}>{magicCategoryLabel(c, lang)}</option>)}
              </select>
              <select className="input" aria-label={t(lang, 'Raridade', 'Rarity')} value={rarity} onChange={e => setRarity(e.target.value)} style={{ flex: 1 }}>
                <option value="">{t(lang, 'Qualquer raridade', 'Any rarity')}</option>
                <option value="mundane">{t(lang, 'Comum (não mágico)', 'Mundane (non-magic)')}</option>
                {RARITIES.map(([id, pt, en]) => <option key={id} value={id}>{t(lang, pt, en)}</option>)}
              </select>
            </div>
            <div className="muted small" aria-live="polite">
              {t(lang, `${allFiltered.length} ${allFiltered.length === 1 ? 'item' : 'itens'}`, `${allFiltered.length} item${allFiltered.length === 1 ? '' : 's'}`)}
            </div>
            {tab === 'campaign' && !filtered.length && (
              <p className="muted small">{t(lang, 'Nenhum item cadastrado na campanha ainda. Use "Cadastrar novo" ou a aba Itens da campanha.', 'No campaign items yet. Use "Create new" or the campaign Items tab.')}</p>
            )}
            <div className="monster-grid">
              {filtered.map(it => (
                <div key={it.sourceId} role="button" tabIndex={0}
                  className={`monster-row art-row ${selected?.sourceId === it.sourceId ? 'selected' : ''}`}
                  onClick={() => setSelected(it)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(it); } }}>
                  <ArtThumb src={itemArt(it)} emoji={itemEmoji(it)} size={44} lang={lang} />
                  <div className="art-row-text">
                    <div><strong>{nameOf(it, lang)}</strong> <span className="muted small">· {typeLabel(it.type, lang)}</span></div>
                    <div className="muted small">{statLine(it, lang)}</div>
                  </div>
                </div>
              ))}
              {remaining > 0 && (
                <button type="button" className="btn btn-ghost btn-sm ip-more" onClick={() => setLimit(l => l + PAGE_SIZE)}>
                  {t(lang, `Mostrar mais (${remaining} restantes)`, `Show more (${remaining} left)`)}
                </button>
              )}
            </div>
            {selected && (
              <div className="item-detail ip-detail">
                <ArtThumb src={itemArt(selected)} emoji={itemEmoji(selected)} size={96} lang={lang} />
                <div className="item-detail-text">
                  <strong>{nameOf(selected, lang)}</strong>
                  {selected.magic?.effect && (selected.magic.effect[lang] || selected.magic.effect.en) && (
                    <div className="small" style={{ color: 'var(--gold)' }}>✨ {selected.magic.effect[lang] || selected.magic.effect.en}</div>
                  )}
                  {selected.description && (
                    <div className="small muted item-desc ip-desc">{textOf(selected.description, lang)}</div>
                  )}
                </div>
              </div>
            )}
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
