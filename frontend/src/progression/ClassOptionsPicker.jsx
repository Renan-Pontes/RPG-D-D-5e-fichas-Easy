/* Seletor de opções de classe (invocações, metamagia, manobras…).
 * Usado na subida de nível e para resolver pendências pelo painel de progressão.
 * value: { adds: [{pool, id, detail?}], swaps: [{pool, from, to}] } */
import { errorMessage } from '../api/errors.js';
import { useMemo, useState } from 'react';
import { Modal } from '../../components/Shared.jsx';
import { validateClassOptions } from './engine.js';
import { classEntries, classView } from './multiclass.js';
import { optionPool, optionSlots, picksOf, classOptionsData } from './options.js';
import { poolOptions, pickLabel } from './options-catalog.js';
import { tName } from '../../data/i18n.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

/** A ficha vista como `classId` (nível e subclasse dela). */
export function viewFor(char, classId) {
  const entry = classEntries(char).find(e => e.id === classId);
  return entry ? classView(char, entry) : null;
}

/** Pools com vagas abertas e pools que permitem troca agora. */
export function openPools(char, classId, value = { adds: [] }, { levelUp = false } = {}) {
  const view = viewFor(char, classId);
  const data = classOptionsData(classId);
  if (!view || !data) return { open: [], swappable: [] };
  const adds = value.adds.map(a => ({ ...a, classId }));
  const slots = optionSlots({ ...view, classOptions: [...(char.classOptions || []), ...adds] }, classId, view.level || 1);
  const open = [];
  for (const [pool, slot] of Object.entries(slots)) {
    const used = picksOf(char, classId, pool).length + adds.filter(a => a.pool === pool).length;
    const alreadyAdded = adds.some(a => a.pool === pool);
    if (slot.total - used > 0 || alreadyAdded) open.push({ pool, room: slot.total - used, total: slot.total });
  }
  // Troca: pools de troca livre sempre; os demais só ao subir de nível (e nos níveis permitidos).
  const swappable = Object.entries(data.pools || {})
    .filter(([pool, def]) => (def.freeSwap || (levelUp && def.swapOnLevelUp && (!def.swapLevels || def.swapLevels.includes(view.level))))
      && picksOf(char, classId, pool).length)
    .map(([pool]) => pool);
  return { open, swappable };
}

const Badge = ({ children }) => <span className="text-xs muted" style={{ marginLeft: 6, border: '1px solid var(--stroke-faint)', borderRadius: 4, padding: '0 4px' }}>{children}</span>;

function PoolSection({ char, classId, pool, room, total, lang, value, onChange }) {
  const [query, setQuery] = useState('');
  const view = viewFor(char, classId);
  const def = optionPool(classId, pool);
  const adds = value.adds.filter(a => a.pool === pool);
  const pending = value.adds.map(a => ({ ...a, classId }));
  const options = useMemo(() => poolOptions(view, classId, pool, pending, view.level || 1), [view, classId, pool, value]);
  const q = query.trim().toLowerCase();
  const shown = options.filter(o => !q || o.name.pt.toLowerCase().includes(q) || o.name.en.toLowerCase().includes(q));
  const setAdds = (next) => onChange({ ...value, adds: [...value.adds.filter(a => a.pool !== pool), ...next] });
  const toggle = (o) => {
    const i = adds.findIndex(a => a.id === o.id);
    if (i >= 0) setAdds(adds.filter((_, j) => j !== i));
    else if (room > 0 && o.eligible) setAdds([...adds, { pool, id: o.id }]);
  };
  const setDetail = (id, detail) => setAdds(adds.map(a => (a.id === id ? { ...a, detail } : a)));

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <strong style={{ fontFamily: 'var(--display)', color: 'var(--gold)' }}>{def.name[lang]}</strong>
        <span className="text-sm muted">{t(lang, 'Escolhidas', 'Chosen')}: {adds.length}/{adds.length + Math.max(0, room)} · {t(lang, 'total', 'total')} {total}</span>
      </div>
      {options.length > 12 && (
        <input placeholder={t(lang, 'Buscar…', 'Search…')} value={query} onChange={e => setQuery(e.target.value)} style={{ marginBottom: 8 }} />
      )}
      {!options.length && <div className="text-sm muted">{t(lang, 'Nenhuma opção disponível ainda para esta lista.', 'No options available for this list yet.')}</div>}
      <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
        {shown.map(o => {
          const on = adds.some(a => a.id === o.id);
          const blocked = !on && (!o.eligible || room <= 0);
          const detail = adds.find(a => a.id === o.id)?.detail || '';
          return (
            <div key={o.id} className="option" style={{ padding: 10, opacity: blocked ? 0.5 : 1, borderColor: on ? 'var(--gold)' : 'var(--stroke-faint)', cursor: blocked ? 'default' : 'pointer' }}
              onClick={() => !blocked || on ? toggle(o) : null}>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <input type="checkbox" readOnly checked={on} disabled={blocked} style={{ width: 16, height: 16, minHeight: 0 }} />
                <span style={{ fontFamily: 'var(--display)' }}>{o.name[lang]}</span>
                {o.meta && <Badge>{o.meta}</Badge>}
                {o.source && <Badge>{o.source}</Badge>}
                {o.taken > 0 && !on && <Badge>{t(lang, 'já escolhida', 'taken')}</Badge>}
              </div>
              {o.desc && <div className="text-sm" style={{ color: 'var(--ink-secondary)', marginTop: 4 }}>{o.desc[lang]}</div>}
              {o.prereq?.text && <div className="text-xs muted" style={{ marginTop: 2 }}>{t(lang, 'Requisito', 'Prerequisite')}: {o.prereq.text[lang]}</div>}
              {o.issues?.length > 0 && <div className="text-xs" style={{ color: 'var(--blood-bright)', marginTop: 2 }}>{o.issues.map(x => x[lang]).join(' · ')}</div>}
              {on && o.detail && (
                <input value={detail} maxLength={120} placeholder={o.detail[lang]} onClick={e => e.stopPropagation()}
                  onChange={e => setDetail(o.id, e.target.value)} style={{ marginTop: 6 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SwapSection({ char, classId, pool, lang, value, onChange }) {
  const view = viewFor(char, classId);
  const def = optionPool(classId, pool);
  const current = value.swaps.find(s => s.pool === pool) || { pool, from: '', to: '' };
  const mine = picksOf(char, classId, pool);
  const pending = value.adds.map(a => ({ ...a, classId }));
  const candidates = poolOptions(view, classId, pool, pending, view.level || 1).filter(o => o.eligible && o.id !== current.from);
  const set = (patch) => {
    const next = { ...current, ...patch };
    const others = value.swaps.filter(s => s.pool !== pool);
    onChange({ ...value, swaps: next.from && next.to ? [...others, next] : others, _draft: { ...(value._draft || {}), [pool]: next } });
  };
  const draft = value._draft?.[pool] || current;
  return (
    <details style={{ marginBottom: 12 }}>
      <summary className="text-sm">{t(lang, `Trocar uma opção de ${def.name.pt} (opcional)`, `Swap one ${def.name.en} option (optional)`)}</summary>
      <div className="row gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <select value={draft.from} onChange={e => set({ from: e.target.value, to: '' })}>
          <option value="">{t(lang, 'Sai…', 'Remove…')}</option>
          {mine.map(p => <option key={p.id + (p.detail || '')} value={p.id}>{pickLabel(classId, p, lang)}</option>)}
        </select>
        <select value={draft.to} disabled={!draft.from} onChange={e => set({ to: e.target.value })}>
          <option value="">{t(lang, 'Entra…', 'Add…')}</option>
          {candidates.map(o => <option key={o.id} value={o.id}>{o.name[lang]}</option>)}
        </select>
      </div>
    </details>
  );
}

export default function ClassOptionsPicker({ char, classId, lang, value, onChange, levelUp = false }) {
  const { open, swappable } = openPools(char, classId, value, { levelUp });
  if (!open.length && !swappable.length) return null;
  return (
    <>
      <h3 style={{ marginBottom: 4 }}>{t(lang, `Escolhas de ${tName('class', classId, 'pt')}`, `${tName('class', classId, 'en')} choices`)}</h3>
      <div className="muted text-sm" style={{ marginBottom: 10 }}>
        {t(lang, 'O que ficar sem escolher aparece como pendência no painel de progressão.', 'Anything left unchosen shows up as pending in the progression panel.')}
      </div>
      {swappable.map(pool => <SwapSection key={`swap-${pool}`} char={char} classId={classId} pool={pool} lang={lang} value={value} onChange={onChange} />)}
      {open.map(o => <PoolSection key={o.pool} char={char} classId={classId} {...o} lang={lang} value={value} onChange={onChange} />)}
    </>
  );
}

/** Janela avulsa: resolve pendências ou troca opções de troca livre. */
export function ClassOptionsModal({ char, classId, lang, onConfirm, onClose }) {
  const [value, setValue] = useState({ adds: [], swaps: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const picks = { adds: value.adds, swaps: value.swaps };
  const empty = !picks.adds.length && !picks.swaps.length;
  const check = empty ? { valid: false, issues: [] } : validateClassOptions(char, classId, picks);
  const confirm = async () => {
    setBusy(true); setError('');
    try { await onConfirm(classId, picks); onClose(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', marginBottom: 14 }}>
        <ClassOptionsPicker char={char} classId={classId} lang={lang} value={value} onChange={setValue} />
      </div>
      {!empty && !check.valid && <div className="text-xs" style={{ color: 'var(--blood-bright)', marginBottom: 8 }}>{check.issues.join(' · ')}</div>}
      {error && <div className="text-sm" style={{ color: 'var(--blood-bright)', marginBottom: 8 }}>{error}</div>}
      <div className="row gap-2">
        <button className="btn btn-ghost" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !check.valid} onClick={confirm}>{t(lang, 'Salvar escolhas', 'Save choices')}</button>
      </div>
    </Modal>
  );
}
