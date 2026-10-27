import { useEffect, useId, useMemo, useRef, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import { BESTIARY, MONSTER_TYPES, monsterForCombat } from '../../data/bestiary.js';
import { CR_TABLE, estimateCr } from '../combat/cr-estimate.js';
import { loadCustomMonsters, saveCustomMonsters, deleteCustomMonster } from '../combat/custom-monsters.js';
import CustomMonsterEditor from '../combat/CustomMonsterEditor.jsx';
import MonsterImportPanel from '../combat/MonsterImportPanel.jsx';
import '../combat/monster-tools.css';
import { monsterTypeLabel, sizeLabel } from '../combat/monster-i18n.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import './combat-styles.css';
import { monsterArt, monsterEmoji } from '../art.js';
import ArtThumb from '../components/ArtThumb.jsx';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;
const CR_STEPS = CR_TABLE.map(r => r.numeric);
const PAGE_SIZE = 120;
const crText = (n) => CR_TABLE.find(r => r.numeric === n)?.cr ?? String(n);

/**
 * Folha da mesa (MesaSheet "full") para escolher monstro: catálogo
 * (data/bestiary.js) + monstros do mestre (importados / personalizados,
 * guardados só neste navegador). Visões: lista · importar JSON · editor de
 * monstro personalizado. Na lista, o rodapé preso tem o escolhido, a
 * quantidade, a iniciativa e "Adicionar ao combate"; no importar e no editor,
 * Voltar/Salvar ficam presos embaixo. Também atende o Preparar.
 *
 * `members` (campaign.members, opcional): o gancho do Raio-X — a linha "× grupo" (o monstro
 * contra o dano principal e as salvaguardas da mesa) nos resultados da busca e no escolhido.
 * As contas do Raio-X só carregam quando a folha abre com uma mesa.
 */
// showInitiative=false: contexto sem combate (Preparação), onde iniciativa não se aplica.
export default function MonsterPicker({ lang, onPick, onClose, levelingMode, confirmLabel, showInitiative = true, members = null }) {
  const [view, setView] = useState('list'); // 'list' | 'import' | 'edit'
  const [editBase, setEditBase] = useState(null);
  const [custom, setCustom] = useState(() => loadCustomMonsters());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [crMin, setCrMin] = useState('');
  const [crMax, setCrMax] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [count, setCount] = useState(1);
  const [initiative, setInitiative] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editDirty, setEditDirty] = useState(false);
  const [importDirty, setImportDirty] = useState(false);
  // filtros recolhidos no celular (a busca fica sempre à vista); abertos no desktop
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try { return window.matchMedia('(min-width: 768px)').matches; } catch { return false; }
  });
  const ids = useId();
  // foco na busca só com mouse: no celular o teclado cobriria a lista ao abrir
  const [finePointer] = useState(() => { try { return window.matchMedia('(pointer: fine)').matches; } catch { return false; } });

  const all = useMemo(() => [...custom, ...BESTIARY], [custom]);

  // "× grupo": versus.js e as fichas em números (party-metrics) chegam por import dinâmico;
  // se chegarem logo depois de um toque, esperam 600 ms (nada mexe debaixo do dedo).
  const [vs, setVs] = useState(null);
  const touchedAt = useRef(0);
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    return () => document.removeEventListener('pointerdown', mark, true);
  }, []);
  useEffect(() => {
    if (!(members || []).some(m => m.role !== 'dm' && m.character?.data)) return undefined;
    let alive = true;
    let timer = null;
    Promise.all([import('../group/party-metrics.js'), import('../group/versus.js')]).then(([PM, V]) => {
      if (!alive) return;
      const facts = PM.partyFacts(PM.partyMembers(members), lang);
      if (!facts.length) return;
      const apply = () => { if (alive) setVs({ facts, versus: V.versus, cache: new Map() }); };
      const wait = touchedAt.current + 600 - Date.now();
      if (wait > 0) timer = setTimeout(apply, wait); else apply();
    }).catch(() => { /* sem a linha "× grupo": a folha funciona igual */ });
    return () => { alive = false; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const vsLine = (m) => {
    if (!vs) return '';
    if (!vs.cache.has(m.id)) vs.cache.set(m.id, vs.versus(m, vs.facts, lang).line);
    return vs.cache.get(m.id);
  };

  const allFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lo = crMin === '' ? -Infinity : parseFloat(crMin);
    const hi = crMax === '' ? Infinity : parseFloat(crMax);
    return all.filter(m => {
      if (onlyMine && !m.custom) return false;
      if (typeFilter && m.type !== typeFilter) return false;
      const cr = Number(m.crNum) || 0;
      if (cr < Math.min(lo, hi) || cr > Math.max(lo, hi)) return false;
      if (q) {
        const name = ((m.name?.pt || '') + ' ' + (m.name?.en || '') + ' ' + (m.id || '')).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [all, query, typeFilter, crMin, crMax, onlyMine]);
  // Paginação igual ao seletor de itens: filtro novo volta para a 1ª página.
  useEffect(() => { setLimit(PAGE_SIZE); }, [query, typeFilter, crMin, crMax, onlyMine]);
  const filtered = allFiltered.slice(0, limit);
  const remaining = allFiltered.length - filtered.length;

  const selected = all.find(m => m.id === selectedId);
  const selectedEst = useMemo(() => (selected?.custom ? estimateCr(selected) : null), [selected]);

  const submit = () => {
    if (!selected) return;
    onPick(monsterForCombat(selected), Math.max(1, Math.min(10, parseInt(count) || 1)), (() => { const n = parseInt(initiative, 10); return Number.isFinite(n) ? n : 10; })());
  };

  const saveMine = (list) => {
    const next = saveCustomMonsters(list);
    setCustom(next);
    setSelectedId(list[0]?.id || null);
    setOnlyMine(false);
    setView('list');
  };

  const removeMine = async (id) => {
    if (!await confirmDialog({ lang, danger: true, message: t(lang, 'Apagar este monstro da sua lista?', 'Delete this monster from your list?'), confirmLabel: t(lang, 'Apagar', 'Delete') })) return;
    setCustom(deleteCustomMonster(id));
    if (selectedId === id) setSelectedId(null);
  };

  const title = view === 'import' ? t(lang, 'Importar monstro (arquivo)', 'Import monster (file)')
    : view === 'edit' ? t(lang, 'Monstro personalizado', 'Custom monster')
      : t(lang, 'Escolher monstro', 'Pick a monster');
  const nFilters = [typeFilter, crMin, crMax, onlyMine ? '1' : ''].filter(Boolean).length;
  const qtyNum = Math.max(1, Math.min(10, parseInt(count) || 1));
  const selName = selected ? (selected.name?.[lang] || selected.name?.en || selected.id) : '';

  // Rodapé preso da lista: o escolhido (+ Personalizar), × quantidade, Inic., Cancelar e Adicionar.
  const listFooter = (
    <div className="mp-foot">
      <div className="mp-foot-sel">
        {selected ? (
          <>
            <ArtThumb src={monsterArt(selected.baseId || selected.id)} emoji={monsterEmoji(selected.type)} size={40} lang={lang} />
            <span className="mp-foot-text">
              <strong className="mp-foot-name">{selName}</strong>
              <span className="mp-foot-meta">
                {t(lang, 'ND', 'CR')} {selected.cr}
                {selectedEst && selectedEst.cr !== selected.cr && ` (${t(lang, 'estimado', 'estimated')} ${selectedEst.cr})`}
                {' · '}{t(lang, 'CA', 'AC')} {selected.ac} · {t(lang, 'PV', 'HP')} {selected.hp}
              </span>
            </span>
            <button type="button" className="mesa-btn mp-custom" onClick={() => { setEditBase(selected); setView('edit'); }}>
              ✎ {selected.custom ? t(lang, 'Editar', 'Edit') : t(lang, 'Personalizar', 'Customize')}
            </button>
          </>
        ) : (
          <p className="mp-foot-empty">{t(lang, 'Escolha um monstro na lista.', 'Pick a monster from the list.')}</p>
        )}
      </div>
      {selected && (
        <div className="mp-foot-nums">
          <div className="mp-qty" role="group" aria-labelledby={`${ids}-qty`}>
            <label className="mp-num-label" id={`${ids}-qty`} htmlFor={`${ids}-qtyin`} aria-label={t(lang, 'Quantidade', 'Quantity')}>{t(lang, 'Qtd', 'Qty')}</label>
            <button type="button" className="mp-step" disabled={qtyNum <= 1} aria-label={t(lang, 'Menos um', 'One less')}
              onClick={() => setCount(String(Math.max(1, qtyNum - 1)))}>−</button>
            <input id={`${ids}-qtyin`} type="number" min={1} max={10} inputMode="numeric" value={count}
              onChange={e => setCount(e.target.value)} className="input mp-num" />
            <button type="button" className="mp-step" disabled={qtyNum >= 10} aria-label={t(lang, 'Mais um', 'One more')}
              onClick={() => setCount(String(Math.min(10, qtyNum + 1)))}>+</button>
          </div>
          {showInitiative && (
            <div className="mp-init">
              <label className="mp-num-label" htmlFor={`${ids}-init`}>{t(lang, 'Inic.', 'Init')}</label>
              <input id={`${ids}-init`} type="number" inputMode="numeric" value={initiative}
                onChange={e => setInitiative(e.target.value)} className="input mp-num" aria-label={t(lang, 'Iniciativa', 'Initiative')} />
            </div>
          )}
        </div>
      )}
      <div className="mp-foot-btns">
        <button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
        <button type="button" className="mesa-btn mesa-btn-lg is-primary mp-add" disabled={!selected} onClick={submit}>
          {confirmLabel || t(lang, 'Adicionar ao combate', 'Add to combat')}{selected && qtyNum > 1 ? ` (${qtyNum})` : ''}
        </button>
      </div>
    </div>
  );

  // Folha da mesa (portal na camada da mesa): fica acima das abas/barras fixas da casca.
  return (
    <MesaSheet title={title} icon={view === 'list' ? '🐉' : view === 'import' ? '⇪' : '✎'} size="full" width="lg" lang={lang}
      onClose={onClose} dirty={(view === 'edit' && editDirty) || (view === 'import' && importDirty)}
      dirtyText={t(lang, 'O monstro ainda não foi salvo na sua lista.', 'The monster has not been saved to your list yet.')}
      className={`mp-sheet is-${view}`} bodyClassName="mp-sheet-body" footer={view === 'list' ? listFooter : null}
      initialFocus={view === 'list' && finePointer ? `#${CSS.escape(`${ids}-q`)}` : undefined}>
      {view === 'import' && (
        <MonsterImportPanel lang={lang} onCancel={() => { setImportDirty(false); setView('list'); }} onDirty={setImportDirty}
          onSave={(list) => { setImportDirty(false); saveMine(list); }} />
      )}

      {view === 'edit' && (
        <CustomMonsterEditor
          key={editBase?.id || 'blank'}
          lang={lang}
          base={editBase}
          xpMode={levelingMode === 'xp'}
          onDirty={setEditDirty}
          onCancel={() => { setEditDirty(false); setView('list'); }}
          onSave={(m) => { setEditDirty(false); saveMine([m]); }}
        />
      )}

      {view === 'list' && (
        <>
          <div className="mp-search">
            <label className="mp-num-label" htmlFor={`${ids}-q`}>{t(lang, 'Buscar pelo nome', 'Search by name')}</label>
            <div className="mp-search-row">
              <input id={`${ids}-q`} type="search" className="input" placeholder={t(lang, 'Ex.: goblin, dragão…', 'E.g. goblin, dragon…')}
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape' && query) { e.stopPropagation(); setQuery(''); } }} />
              <button type="button" className={`mesa-btn mp-filter-btn ${nFilters ? 'has-filters' : ''}`} aria-expanded={filtersOpen}
                aria-controls={`${ids}-filters`} onClick={() => setFiltersOpen(o => !o)}>
                {t(lang, 'Filtros', 'Filters')}{nFilters ? ` (${nFilters})` : ''} <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="mp-filters" id={`${ids}-filters`}>
              <div className="mp-field">
                <label className="mp-num-label" htmlFor={`${ids}-type`}>{t(lang, 'Tipo', 'Type')}</label>
                <select id={`${ids}-type`} className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
                  {[...MONSTER_TYPES].sort((a, b) => monsterTypeLabel(a, lang).localeCompare(monsterTypeLabel(b, lang), lang))
                    .map(ty => <option key={ty} value={ty}>{monsterTypeLabel(ty, lang)}</option>)}
                </select>
              </div>
              <div className="mp-field">
                <label className="mp-num-label" htmlFor={`${ids}-crmin`}>{t(lang, 'ND mínimo', 'Min CR')}</label>
                <select id={`${ids}-crmin`} className="input" value={crMin} onChange={e => setCrMin(e.target.value)}>
                  <option value="">{t(lang, 'Qualquer', 'Any')}</option>
                  {CR_STEPS.map(c => <option key={c} value={c}>{t(lang, 'ND', 'CR')} ≥ {crText(c)}</option>)}
                </select>
              </div>
              <div className="mp-field">
                <label className="mp-num-label" htmlFor={`${ids}-crmax`}>{t(lang, 'ND máximo', 'Max CR')}</label>
                <select id={`${ids}-crmax`} className="input" value={crMax} onChange={e => setCrMax(e.target.value)}>
                  <option value="">{t(lang, 'Qualquer', 'Any')}</option>
                  {CR_STEPS.map(c => <option key={c} value={c}>{t(lang, 'ND', 'CR')} ≤ {crText(c)}</option>)}
                </select>
              </div>
              {custom.length > 0 && (
                <label className="mp-check">
                  <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />
                  <span>{t(lang, `Só os meus (${custom.length})`, `Mine only (${custom.length})`)}</span>
                </label>
              )}
            </div>
          )}

          <div className="mp-tools">
            <button type="button" className="mesa-btn" onClick={() => setView('import')}>⇪ {t(lang, 'Importar arquivo', 'Import file')}</button>
            <button type="button" className="mesa-btn" onClick={() => { setEditBase(null); setView('edit'); }}>✚ {t(lang, 'Novo monstro', 'New monster')}</button>
          </div>

          <p className="mp-count" aria-live="polite">
            {t(lang, `${allFiltered.length} monstro${allFiltered.length === 1 ? '' : 's'}`, `${allFiltered.length} monster${allFiltered.length === 1 ? '' : 's'}`)}
            {custom.length > 0 && !onlyMine && <span className="mp-count-mine"> · {t(lang, `${custom.length} seu${custom.length === 1 ? '' : 's'} (só neste navegador)`, `${custom.length} yours (this browser only)`)}</span>}
          </p>
          <ul className="mp-list">
            {filtered.map(m => {
              const on = selectedId === m.id;
              const nm = m.name?.[lang] || m.name?.en || m.id;
              return (
                <li key={m.id} className={`mp-item ${on ? 'is-selected' : ''}`}>
                  <button type="button" className="mp-pick" aria-pressed={on} onClick={() => setSelectedId(m.id)}>
                    <ArtThumb src={monsterArt(m.baseId || m.id)} emoji={monsterEmoji(m.type)} size={44} lang={lang} />
                    <span className="mp-pick-main">
                      <span className="mp-pick-title">
                        <strong>{nm}</strong>
                        {m.custom && <span className="mp-badge local">{t(lang, 'meu', 'mine')}</span>}
                      </span>
                      <span className="mp-pick-sub">{t(lang, 'ND', 'CR')} {m.cr} · {monsterTypeLabel(m.type, lang)}</span>
                      <span className="mp-pick-sub">{t(lang, 'CA', 'AC')} {m.ac} · {t(lang, 'PV', 'HP')} {m.hp} · {sizeLabel(m.size, lang)}</span>
                      {(on || query.trim()) && vsLine(m) && <span className="mp-pick-vs">× {t(lang, 'grupo', 'party')}: {vsLine(m)}</span>}
                    </span>
                    {on && <span className="mp-pick-check" aria-hidden="true">✓</span>}
                  </button>
                  {m.custom && (
                    <button type="button" className="mesa-icon-btn mp-del" aria-label={t(lang, `Apagar ${nm} da sua lista`, `Delete ${nm} from your list`)}
                      onClick={() => removeMine(m.id)}>×</button>
                  )}
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 && <p className="mp-empty">{t(lang, 'Nada encontrado.', 'Nothing found.')}</p>}
          {remaining > 0 && (
            <button type="button" className="mesa-btn mp-more" onClick={() => setLimit(l => l + PAGE_SIZE)}>
              {t(lang, `Mostrar mais (${remaining} restantes)`, `Show more (${remaining} left)`)}
            </button>
          )}
        </>
      )}
    </MesaSheet>
  );
}
