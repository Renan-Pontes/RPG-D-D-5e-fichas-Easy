import { useMemo, useState } from 'react';
import { MONSTERS, MONSTER_TYPES } from '../../data/monsters.js';
import SRD from '../../data/srd.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

/**
 * Modal pra escolher monstro do catálogo. Combina MONSTERS (humanoides etc)
 * + SRD.BEASTS (que já é usado pra Wild Shape).
 */
export default function MonsterPicker({ lang, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [crFilter, setCrFilter] = useState('');
  const [count, setCount] = useState(1);
  const [initiative, setInitiative] = useState(10);
  const [selectedId, setSelectedId] = useState(null);

  const all = useMemo(() => {
    // Combina monsters + beasts num único catálogo
    const beastsAsMonsters = (SRD.BEASTS || []).map(b => ({
      id: b.id,
      name: { pt: b.id, en: b.id },
      cr: b.cr, crNum: b.crNum,
      type: 'beast',
      size: b.size, alignment: 'U',
      speed: { walk: b.speed, fly: b.fly, swim: b.swim, climb: b.climb },
      ac: b.ac, hp: b.hp,
      abilities: { str: b.str, dex: b.dex, con: b.con, int: b.int, wis: b.wis, cha: b.cha },
      traits: b.traits,
      actions: (b.actions || []).map(a => ({
        name: a.name, type: 'melee', atk: 0, damage: '1d4', damageType: 'bludgeoning',
        desc: a.desc,
      })),
    }));
    return [...MONSTERS, ...beastsAsMonsters];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(m => {
      if (typeFilter && m.type !== typeFilter) return false;
      if (crFilter !== '') {
        const cr = parseFloat(crFilter);
        if (Number.isFinite(cr) && m.crNum !== cr) return false;
      }
      if (q) {
        const name = ((m.name?.pt || '') + ' ' + (m.name?.en || '') + ' ' + (m.id || '')).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    }).slice(0, 80);
  }, [all, query, typeFilter, crFilter]);

  const selected = filtered.find(m => m.id === selectedId);

  const submit = () => {
    if (!selected) return;
    onPick(selected, Math.max(1, Math.min(10, parseInt(count) || 1)), parseInt(initiative) || 10);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal monster-picker" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t(lang, 'Escolher monstro', 'Pick a monster')}</h2>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <input className="input" placeholder={t(lang, 'Nome…', 'Name…')} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">{t(lang, 'Todos os tipos', 'All types')}</option>
            {MONSTER_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="input" value={crFilter} onChange={e => setCrFilter(e.target.value)}>
            <option value="">{t(lang, 'Todo CR', 'Any CR')}</option>
            {[0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(c => (
              <option key={c} value={c}>CR {c < 1 ? `1/${1/c}` : c}</option>
            ))}
          </select>
        </div>

        <div className="monster-grid">
          {filtered.map(m => (
            <div
              key={m.id}
              className={`monster-row ${selectedId === m.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(m.id)}
            >
              <div>
                <strong>{m.name?.[lang] || m.name?.en || m.id}</strong>
                <span style={{ marginLeft: 6, color: 'var(--ink-secondary)', fontSize: '0.85em' }}>
                  CR {m.cr} · {m.type}
                </span>
              </div>
              <div className="muted small">
                CA {m.ac} · HP {m.hp} · {m.size}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nada encontrado.', 'Nothing found.')}</p>}
        </div>

        <div className="row gap-2" style={{ alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {selected && (
            <>
              <strong>{selected.name?.[lang] || selected.name?.en}</strong>
              <span>×</span>
              <input type="number" min={1} max={10} value={count} onChange={e => setCount(e.target.value)} className="input" style={{ width: 60 }} />
              <span style={{ color: 'var(--ink-secondary)' }}>Init</span>
              <input type="number" value={initiative} onChange={e => setInitiative(e.target.value)} className="input" style={{ width: 70 }} />
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button className="btn btn-primary btn-sm" disabled={!selected} onClick={submit}>
            {t(lang, 'Adicionar ao combate', 'Add to combat')}
          </button>
        </div>
      </div>
    </div>
  );
}
