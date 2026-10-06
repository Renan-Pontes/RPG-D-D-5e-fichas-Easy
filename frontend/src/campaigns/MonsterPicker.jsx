import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BESTIARY, MONSTER_TYPES, monsterForCombat } from '../../data/bestiary.js';
import { CR_TABLE, estimateCr } from '../combat/cr-estimate.js';
import { loadCustomMonsters, saveCustomMonsters, deleteCustomMonster } from '../combat/custom-monsters.js';
import CustomMonsterEditor from '../combat/CustomMonsterEditor.jsx';
import MonsterImportPanel from '../combat/MonsterImportPanel.jsx';
import '../combat/monster-tools.css';
import { monsterTypeLabel, sizeLabel } from '../combat/monster-i18n.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import './combat-styles.css';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;
const CR_STEPS = CR_TABLE.map(r => r.numeric);
const crText = (n) => CR_TABLE.find(r => r.numeric === n)?.cr ?? String(n);

/**
 * Modal pra escolher monstro: catálogo (data/bestiary.js) + monstros do mestre
 * (importados / personalizados, guardados só neste navegador).
 * Visões: lista · importar JSON · editor de monstro personalizado.
 */
// showInitiative=false: contexto sem combate (Preparação), onde iniciativa não se aplica.
export default function MonsterPicker({ lang, onPick, onClose, levelingMode, confirmLabel, showInitiative = true }) {
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

  const all = useMemo(() => [...custom, ...BESTIARY], [custom]);

  const filtered = useMemo(() => {
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
    }).slice(0, 120);
  }, [all, query, typeFilter, crMin, crMax, onlyMine]);

  const selected = all.find(m => m.id === selectedId);
  const selectedEst = useMemo(() => (selected?.custom ? estimateCr(selected) : null), [selected]);

  const submit = () => {
    if (!selected) return;
    onPick(monsterForCombat(selected), Math.max(1, Math.min(10, parseInt(count) || 1)), parseInt(initiative) || 10);
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

  // Portal no <body>: o modal fica acima das abas/barras fixas da casca.
  return createPortal(
    <div className="modal-backdrop combat-modal-backdrop" onClick={onClose}>
      <div className={`modal monster-picker ${view === 'edit' ? 'is-wide' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
        <h2 style={{ marginTop: 0 }}>{title}</h2>

        {view === 'import' && (
          <MonsterImportPanel lang={lang} onCancel={() => setView('list')} onSave={saveMine} />
        )}

        {view === 'edit' && (
          <CustomMonsterEditor
            key={editBase?.id || 'blank'}
            lang={lang}
            base={editBase}
            xpMode={levelingMode === 'xp'}
            onCancel={() => setView('list')}
            onSave={(m) => saveMine([m])}
          />
        )}

        {view === 'list' && (
          <>
            <div className="mp-filters">
              <input className="input" placeholder={t(lang, 'Nome…', 'Name…')} value={query} onChange={e => setQuery(e.target.value)} autoFocus aria-label={t(lang, 'Nome', 'Name')} />
              <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label={t(lang, 'Tipo', 'Type')}>
                <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
                {[...MONSTER_TYPES].sort((a, b) => monsterTypeLabel(a, lang).localeCompare(monsterTypeLabel(b, lang), lang))
                  .map(ty => <option key={ty} value={ty}>{monsterTypeLabel(ty, lang)}</option>)}
              </select>
              <select className="input" value={crMin} onChange={e => setCrMin(e.target.value)} aria-label={t(lang, 'ND mínimo', 'Min CR')}>
                <option value="">{t(lang, 'ND mín.', 'Min CR')}</option>
                {CR_STEPS.map(c => <option key={c} value={c}>{t(lang, 'ND', 'CR')} ≥ {crText(c)}</option>)}
              </select>
              <select className="input" value={crMax} onChange={e => setCrMax(e.target.value)} aria-label={t(lang, 'ND máximo', 'Max CR')}>
                <option value="">{t(lang, 'ND máx.', 'Max CR')}</option>
                {CR_STEPS.map(c => <option key={c} value={c}>{t(lang, 'ND', 'CR')} ≤ {crText(c)}</option>)}
              </select>
            </div>

            <div className="mp-tools">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('import')}>⇪ {t(lang, 'Importar arquivo', 'Import file')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditBase(null); setView('edit'); }}>✚ {t(lang, 'Novo monstro', 'New monster')}</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!selected} onClick={() => { setEditBase(selected); setView('edit'); }}>
                ✎ {selected?.custom ? t(lang, 'Editar', 'Edit') : t(lang, 'Personalizar', 'Customize')}
              </button>
              {custom.length > 0 && (
                <label className="me-check" style={{ marginLeft: 'auto' }}>
                  <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />
                  {t(lang, `Só os meus (${custom.length})`, `Mine only (${custom.length})`)}
                </label>
              )}
            </div>

            <div className="monster-grid">
              {filtered.map(m => (
                <div
                  key={m.id}
                  className={`monster-row ${selectedId === m.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(m.id); } }}
                >
                  <div className="mp-row">
                    <div>
                      <strong>{m.name?.[lang] || m.name?.en || m.id}</strong>
                      {m.custom && <span className="mp-badge local">{t(lang, 'meu', 'mine')}</span>}
                      <span style={{ marginLeft: 6, color: 'var(--ink-secondary)', fontSize: '0.85em' }}>
                        {t(lang, 'ND', 'CR')} {m.cr} · {monsterTypeLabel(m.type, lang)}
                      </span>
                    </div>
                    {m.custom && (
                      <button type="button" className="btn btn-ghost btn-icon danger" aria-label={t(lang, 'Apagar', 'Delete')}
                        onClick={e => { e.stopPropagation(); removeMine(m.id); }}>×</button>
                    )}
                  </div>
                  <div className="muted small">
                    {t(lang, 'CA', 'AC')} {m.ac} · {t(lang, 'PV', 'HP')} {m.hp} · {sizeLabel(m.size, lang)}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nada encontrado.', 'Nothing found.')}</p>}
            </div>

            <div className="mp-footer">
              {selected && (
                <>
                  <strong>{selected.name?.[lang] || selected.name?.en}</strong>
                  {selectedEst && selectedEst.cr !== selected.cr && (
                    <span className="muted small">({t(lang, 'estimado', 'estimated')} {selectedEst.cr})</span>
                  )}
                  <span>×</span>
                  <input type="number" min={1} max={10} value={count} onChange={e => setCount(e.target.value)} className="input" aria-label={t(lang, 'Quantidade', 'Count')} />
                  {showInitiative && (
                    <>
                      <span style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Inic.', 'Init')}</span>
                      <input type="number" value={initiative} onChange={e => setInitiative(e.target.value)} className="input" aria-label={t(lang, 'Iniciativa', 'Initiative')} />
                    </>
                  )}
                </>
              )}
              <span className="mp-spacer" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!selected} onClick={submit}>
                {confirmLabel || t(lang, 'Adicionar ao combate', 'Add to combat')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
