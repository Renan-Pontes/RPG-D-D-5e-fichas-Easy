/* Escolhe um item das regras básicas (SRD), do catálogo da campanha ou cadastra um novo.
 * Dois desenhos com a mesma lógica (useItemPicker):
 *  - o modal de sempre (ficha do jogador, tesouro das salas);
 *  - `sheet`: a folha da mesa (MesaSheet) do "Dar item" do mestre — ✕ e Esc,
 *    abas num segmentado de 44, filtros recolhíveis, lista de 56 px e rodapé
 *    preso "Qtd · Cancelar · Dar" com o item escolhido logo acima. */
import { errorMessage } from '../api/errors.js';
import { useEffect, useId, useMemo, useState } from 'react';
import { ITEMS, ITEM_TYPES, instantiate } from '../../data/items.js';
import ItemForm from './ItemForm.jsx';
import { RARITIES, dmgTypeLabel, rarityLabel, typeLabel, weaponPropLabel, weightLabel } from './item-model.js';
import { itemArt, itemEmoji } from '../art.js';
import ArtThumb from '../components/ArtThumb.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
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
 *  - sheet?: true → folha da mesa (MesaSheet); `icon` e `eyebrow` vão no cabeçalho
 */
export default function ItemPickerModal(props) {
  return props.sheet ? <ItemPickerSheet {...props} /> : <ItemPickerClassic {...props} />;
}

/** Estado e ações do seletor (iguais nos dois desenhos). */
function useItemPicker({ lang, campaignItems, onSaveToCatalog, onPick, onClose }) {
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
  const submitNew = async (item) => {
    if (onSaveToCatalog && saveToCatalog) await onSaveToCatalog(item);
    await onPick(instantiate({ ...item, sourceId: 'custom' }, { qty: 1, name: item.name }));
    onClose();
  };
  const switchTab = (id) => { setTab(id); setSelected(null); };

  const tabs = [
    ...(campaignItems ? [['campaign', t(lang, 'Campanha', 'Campaign')]] : []),
    ['srd', t(lang, 'Regras básicas', 'Basic rules')],
    ['new', t(lang, 'Cadastrar novo', 'Create new')],
  ];
  return {
    tab, switchTab, tabs, query, setQuery, type, setType, category, setCategory, rarity, setRarity,
    allFiltered, filtered, remaining, more: () => setLimit(l => l + PAGE_SIZE),
    selected, setSelected, qty, setQty, saveToCatalog, setSaveToCatalog, busy, error, pick, submitNew,
  };
}

function SaveToCatalog({ lang, P, className = 'row gap-2', style = { alignItems: 'center', margin: 0 } }) {
  return (
    <label className={className} style={style}>
      <input type="checkbox" checked={P.saveToCatalog} onChange={e => P.setSaveToCatalog(e.target.checked)} style={{ width: 'auto', minHeight: 'auto' }} />
      {t(lang, 'Salvar também no catálogo da campanha', 'Also save to the campaign catalog')}
    </label>
  );
}

/** O modal de sempre (ficha do jogador e tesouro das salas): o mesmo desenho de antes. */
function ItemPickerClassic(props) {
  const { lang, title, confirmLabel, onSaveToCatalog, onClose } = props;
  const P = useItemPicker(props);
  const { tab, selected } = P;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal monster-picker" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <div className="row gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          {P.tabs.map(([id, label]) => (
            <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => P.switchTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'new' ? (
          <ItemForm
            lang={lang}
            submitLabel={confirmLabel}
            onCancel={onClose}
            extra={onSaveToCatalog && <SaveToCatalog lang={lang} P={P} />}
            onSubmit={P.submitNew}
          />
        ) : (
          <>
            <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <input aria-label={t(lang, 'Buscar…', 'Search…')} className="input" placeholder={t(lang, 'Buscar…', 'Search…')} value={P.query} onChange={e => P.setQuery(e.target.value)} style={{ flex: '2 1 180px', minWidth: 0 }} />
              <select className="input" aria-label={t(lang, 'Tipo', 'Type')} value={P.type} onChange={e => P.setType(e.target.value)} style={{ flex: '1 1 150px', minWidth: 0 }}>
                <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
                {ITEM_TYPES.map(ty => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
              </select>
            </div>
            <div className="row gap-2 ip-filters" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <select className="input" aria-label={t(lang, 'Categoria mágica', 'Magic category')} value={P.category} onChange={e => P.setCategory(e.target.value)} style={{ flex: 1 }}>
                <option value="">{t(lang, 'Todas as categorias', 'All categories')}</option>
                {MAGIC_CATEGORIES.map(c => <option key={c} value={c}>{magicCategoryLabel(c, lang)}</option>)}
              </select>
              <select className="input" aria-label={t(lang, 'Raridade', 'Rarity')} value={P.rarity} onChange={e => P.setRarity(e.target.value)} style={{ flex: 1 }}>
                <option value="">{t(lang, 'Qualquer raridade', 'Any rarity')}</option>
                <option value="mundane">{t(lang, 'Comum (não mágico)', 'Mundane (non-magic)')}</option>
                {RARITIES.map(([id, pt, en]) => <option key={id} value={id}>{t(lang, pt, en)}</option>)}
              </select>
            </div>
            <div className="muted small" aria-live="polite">
              {t(lang, `${P.allFiltered.length} ${P.allFiltered.length === 1 ? 'item' : 'itens'}`, `${P.allFiltered.length} item${P.allFiltered.length === 1 ? '' : 's'}`)}
            </div>
            {tab === 'campaign' && !P.filtered.length && (
              <p className="muted small">{t(lang, 'Nenhum item cadastrado na campanha ainda. Use "Cadastrar novo" ou a aba Itens da campanha.', 'No campaign items yet. Use "Create new" or the campaign Items tab.')}</p>
            )}
            <div className="monster-grid">
              {P.filtered.map(it => (
                <div key={it.sourceId} role="button" tabIndex={0}
                  className={`monster-row art-row ${selected?.sourceId === it.sourceId ? 'selected' : ''}`}
                  onClick={() => P.setSelected(it)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); P.setSelected(it); } }}>
                  <ArtThumb src={itemArt(it)} emoji={itemEmoji(it)} size={44} lang={lang} />
                  <div className="art-row-text">
                    <div><strong>{nameOf(it, lang)}</strong> <span className="muted small">· {typeLabel(it.type, lang)}</span></div>
                    <div className="muted small">{statLine(it, lang)}</div>
                  </div>
                </div>
              ))}
              {P.remaining > 0 && (
                <button type="button" className="btn btn-ghost btn-sm ip-more" onClick={P.more}>
                  {t(lang, `Mostrar mais (${P.remaining} restantes)`, `Show more (${P.remaining} left)`)}
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
              <input type="number" min={1} value={P.qty} onChange={e => P.setQty(e.target.value)} className="input" style={{ width: 80 }} />
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button className="btn btn-primary btn-sm" disabled={!selected || P.busy} onClick={() => P.pick(selected)}>{P.busy ? '…' : confirmLabel}</button>
            </div>
          </>
        )}
        {P.error && <div className="text-sm" style={{ color: 'var(--blood-bright)', marginTop: 8 }}>{P.error}</div>}
      </div>
    </div>
  );
}

/** A folha da mesa (Dar item do mestre). */
function ItemPickerSheet(props) {
  const { lang, title, icon, eyebrow, confirmLabel, onSaveToCatalog, onClose } = props;
  const P = useItemPicker(props);
  const { tab, selected } = P;
  const ids = useId();
  // filtros recolhidos no celular (a busca fica sempre à vista); abertos no desktop
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try { return window.matchMedia('(min-width: 768px)').matches; } catch { return false; }
  });
  const [detailOpen, setDetailOpen] = useState(false);
  // "Cadastrar novo" com algo digitado: Esc, ✕ e toque fora perguntam antes
  const [newDirty, setNewDirty] = useState(false);
  const nFilters = [P.type, P.category, P.rarity].filter(Boolean).length;
  const qtyNum = Math.max(1, parseInt(P.qty) || 1);
  const isNew = tab === 'new';

  const footer = isNew ? null : (
    <div className="ip-foot">
      {selected && detailOpen && (
        <div className="ip-foot-detail" id={`${ids}-detail`}>
          <ArtThumb src={itemArt(selected)} emoji={itemEmoji(selected)} size={56} lang={lang} />
          <div className="ip-foot-detail-text">
            <strong>{nameOf(selected, lang)}</strong>
            <span className="ip-foot-meta">{[typeLabel(selected.type, lang), statLine(selected, lang)].filter(Boolean).join(' · ')}</span>
            {selected.magic?.effect && (selected.magic.effect[lang] || selected.magic.effect.en) && (
              <p className="ip-foot-effect">✨ {selected.magic.effect[lang] || selected.magic.effect.en}</p>
            )}
            {selected.description && <p className="ip-foot-desc">{textOf(selected.description, lang)}</p>}
          </div>
        </div>
      )}
      <div className="ip-foot-grid">
        <div className="ip-foot-sel">
          {selected ? (
            <button type="button" className="ip-sel" aria-expanded={detailOpen} aria-controls={`${ids}-detail`}
              onClick={() => setDetailOpen(o => !o)}>
              <ArtThumb src={itemArt(selected)} emoji={itemEmoji(selected)} size={36} lang={lang} />
              <span className="ip-sel-text">
                <span className="ip-sel-name">{nameOf(selected, lang)}</span>
                <span className="ip-sel-hint">{t(lang, 'Detalhes', 'Details')} <span aria-hidden="true">{detailOpen ? '▾' : '▴'}</span></span>
              </span>
            </button>
          ) : (
            <p className="ip-sel-empty">{t(lang, 'Escolha um item na lista.', 'Pick an item from the list.')}</p>
          )}
        </div>
        <div className="ip-qty" role="group" aria-labelledby={`${ids}-qty`}>
          <label className="ip-qty-label" id={`${ids}-qty`} htmlFor={`${ids}-qtyin`}>{t(lang, 'Qtd', 'Qty')}</label>
          <button type="button" className="ip-step" disabled={qtyNum <= 1}
            aria-label={t(lang, 'Diminuir quantidade', 'Decrease quantity')} onClick={() => P.setQty(Math.max(1, qtyNum - 1))}>−</button>
          <input id={`${ids}-qtyin`} type="number" min={1} inputMode="numeric" className="input ip-qty-in"
            value={P.qty} onChange={e => P.setQty(e.target.value)} />
          <button type="button" className="ip-step"
            aria-label={t(lang, 'Aumentar quantidade', 'Increase quantity')} onClick={() => P.setQty(qtyNum + 1)}>+</button>
        </div>
        {P.error && <div className="ip-error" role="alert">{P.error}</div>}
        <div className="ip-foot-btns">
          <button type="button" className="mesa-btn" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary ip-give" disabled={!selected || P.busy} onClick={() => P.pick(selected)}>
            {P.busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <MesaSheet title={title} icon={icon} eyebrow={eyebrow} size="full" width="lg" lang={lang} onClose={onClose}
      dirty={isNew && newDirty} className="ip-sheet" bodyClassName={`ip-sheet-body ${isNew ? 'is-form' : ''}`} footer={footer}>
      <div className="mesa-seg ip-tabs" role="tablist" aria-label={t(lang, 'De onde vem o item', 'Where the item comes from')}>
        {P.tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={`mesa-seg-btn ${tab === id ? 'active' : ''}`} onClick={() => P.switchTab(id)}>{label}</button>
        ))}
      </div>

      {isNew ? (
        <>
          {P.error && <div className="ip-error" role="alert">{P.error}</div>}
          <ItemForm
            lang={lang}
            sheet
            submitLabel={confirmLabel}
            onCancel={onClose}
            onDirtyChange={setNewDirty}
            extra={onSaveToCatalog && <SaveToCatalog lang={lang} P={P} className="item-form-check" style={null} />}
            onSubmit={P.submitNew}
          />
        </>
      ) : (
        <>
          <div className="ip-search">
            <label className="ip-label" htmlFor={`${ids}-q`}>{t(lang, 'Buscar pelo nome', 'Search by name')}</label>
            <div className="ip-search-row">
              <input id={`${ids}-q`} type="search" className="input" placeholder={t(lang, 'Ex.: poção, espada…', 'E.g. potion, sword…')}
                value={P.query} onChange={e => P.setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape' && P.query) { e.stopPropagation(); P.setQuery(''); } }} />
              <button type="button" className={`mesa-btn ip-filter-btn ${nFilters ? 'has-filters' : ''}`} aria-expanded={filtersOpen}
                aria-controls={`${ids}-filters`} onClick={() => setFiltersOpen(o => !o)}>
                {t(lang, 'Filtros', 'Filters')}{nFilters ? ` (${nFilters})` : ''}
                <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
              </button>
            </div>
          </div>
          {filtersOpen && (
            <div className="ip-filter-grid" id={`${ids}-filters`}>
              <div className="ip-field">
                <label className="ip-label" htmlFor={`${ids}-type`}>{t(lang, 'Tipo', 'Type')}</label>
                <select id={`${ids}-type`} className="input" value={P.type} onChange={e => P.setType(e.target.value)}>
                  <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
                  {ITEM_TYPES.map(ty => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
                </select>
              </div>
              <div className="ip-field">
                <label className="ip-label" htmlFor={`${ids}-cat`}>{t(lang, 'Categoria mágica', 'Magic category')}</label>
                <select id={`${ids}-cat`} className="input" value={P.category} onChange={e => P.setCategory(e.target.value)}>
                  <option value="">{t(lang, 'Todas as categorias', 'All categories')}</option>
                  {MAGIC_CATEGORIES.map(c => <option key={c} value={c}>{magicCategoryLabel(c, lang)}</option>)}
                </select>
              </div>
              <div className="ip-field">
                <label className="ip-label" htmlFor={`${ids}-rar`}>{t(lang, 'Raridade', 'Rarity')}</label>
                <select id={`${ids}-rar`} className="input" value={P.rarity} onChange={e => P.setRarity(e.target.value)}>
                  <option value="">{t(lang, 'Qualquer raridade', 'Any rarity')}</option>
                  <option value="mundane">{t(lang, 'Comum (não mágico)', 'Mundane (non-magic)')}</option>
                  {RARITIES.map(([id, pt, en]) => <option key={id} value={id}>{t(lang, pt, en)}</option>)}
                </select>
              </div>
            </div>
          )}
          <p className="ip-count" aria-live="polite">
            {t(lang, `${P.allFiltered.length} ${P.allFiltered.length === 1 ? 'item' : 'itens'}`, `${P.allFiltered.length} item${P.allFiltered.length === 1 ? '' : 's'}`)}
          </p>
          {tab === 'campaign' && !P.filtered.length && (
            <p className="ip-empty">{t(lang, 'Nenhum item cadastrado na campanha ainda. Use "Cadastrar novo" ou a aba Itens da campanha.', 'No campaign items yet. Use "Create new" or the campaign Items tab.')}</p>
          )}
          <ul className="ip-list">
            {P.filtered.map(it => {
              const on = selected?.sourceId === it.sourceId;
              const sub = statLine(it, lang);
              return (
                <li key={it.sourceId}>
                  <button type="button" className={`ip-row ${on ? 'is-selected' : ''}`} aria-pressed={on}
                    onClick={() => P.setSelected(it)}>
                    <ArtThumb src={itemArt(it)} emoji={itemEmoji(it)} size={44} lang={lang} />
                    <span className="ip-row-main">
                      <span className="ip-row-title"><strong>{nameOf(it, lang)}</strong> <span className="ip-row-type">· {typeLabel(it.type, lang)}</span></span>
                      {sub && <span className="ip-row-sub">{sub}</span>}
                    </span>
                    {on && <span className="ip-row-check" aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {P.remaining > 0 && (
            <button type="button" className="mesa-btn ip-more-btn" onClick={P.more}>
              {t(lang, `Mostrar mais (${P.remaining} restantes)`, `Show more (${P.remaining} left)`)}
            </button>
          )}
        </>
      )}
    </MesaSheet>
  );
}
