/* Rolagem múltipla: linhas pré-configuradas (d20 + vínculos + corrente de dados com papel),
   selecionadas, duplicadas, com vantagem/desvantagem por linha, arrastadas (ou enviadas)
   para a bandeja, que rola tudo junto e mostra "d20 / dano" lado a lado por linha.
   Lógica pura em multi-roll.js. As linhas ficam no aparelho, por ficha. */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Utils from '../../utils.js';
import { getActiveChar, subscribeActiveChar } from './active-char.js';
import { ABILITIES, ADV_NEXT, DICE, duplicateRow, modsFromChar, newRow, rollTray, rowFormula } from './multi-roll.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const ABIL_LABEL = { none: '—', str: 'FOR/STR', dex: 'DES/DEX', con: 'CON', int: 'INT', wis: 'SAB/WIS', cha: 'CAR/CHA' };
const abilShort = (k, lang) => (k === 'none' ? '—' : (lang === 'pt' ? ABIL_LABEL[k].split('/')[0] : (ABIL_LABEL[k].split('/')[1] || ABIL_LABEL[k])));
const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
const storeKey = (char) => `fh-multiroll:${char?.id ?? 'global'}`;
const load = (char) => { try { const v = JSON.parse(localStorage.getItem(storeKey(char)) || 'null'); return Array.isArray(v) ? v : null; } catch { return null; } };
const save = (char, rows) => { try { localStorage.setItem(storeKey(char), JSON.stringify(rows)); } catch { /* sem armazenamento */ } };

const starter = (lang) => [
  newRow({ name: L(lang, 'Machado de Batalha +3', 'Battle Axe +3'), abil: 'str', flat: 3, dice: [{ count: 1, die: 12, role: 'damage' }, { count: 1, die: 8, role: 'bonus' }] }),
  newRow({ name: L(lang, 'Besta', 'Crossbow'), abil: 'dex', dice: [{ count: 1, die: 8, role: 'damage' }] }),
];

export default function MultiRoll({ lang, onRolled }) {
  const char = useSyncExternalStore(subscribeActiveChar, getActiveChar, getActiveChar);
  const mods = useMemo(() => modsFromChar(char, Utils), [char]);
  const [rows, setRows] = useState(() => load(char) || starter(lang));
  const [sel, setSel] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [results, setResults] = useState(null);
  const [lastTray, setLastTray] = useState([]);
  const [over, setOver] = useState(false);
  const charId = char?.id;
  useEffect(() => { setRows(load(char) || starter(lang)); setSel(new Set()); setResults(null); }, [charId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { save(char, rows); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id, p) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));
  const toggleSel = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const dup = (ids) => setRows(rs => {
    const out = [];
    for (const r of rs) { out.push(r); if (ids.includes(r.id)) out.push(duplicateRow(r)); }
    return out;
  });
  const roll = (ids) => {
    const list = ids.map(id => rows.find(r => r.id === id)).filter(Boolean);
    if (!list.length) return;
    const res = rollTray(list, mods);
    setLastTray(ids);
    setResults(res);
    if (navigator.vibrate) navigator.vibrate(res.some(r => r.crit) ? [60, 40, 100] : 30);
    onRolled?.(res);
  };
  const dragIds = (row) => (sel.has(row.id) ? rows.filter(r => sel.has(r.id)).map(r => r.id) : [row.id]);

  const modsLine = char
    ? ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `${abilShort(k, lang)} ${fmt(mods[k] || 0)}`).join(' · ') + ` · ${L(lang, 'BP', 'PB')} ${fmt(mods.pb || 0)}`
    : L(lang, 'Abra uma ficha para vincular atributo e proficiência (sem ficha, valem 0).', 'Open a sheet to bind ability and proficiency (without one they count as 0).');

  return (
    <div className="mr">
      <div className="mr-who">
        {char ? <strong>{char.name}</strong> : null}
        <span className="mr-mods">{modsLine}</span>
      </div>

      <ul className="mr-rows no-zebra">
        {rows.map(row => {
          const isSel = sel.has(row.id);
          const isEd = editing === row.id;
          return (
            <li key={row.id} className={`mr-row${isSel ? ' is-sel' : ''}`} draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/x-mr', JSON.stringify(dragIds(row))); e.dataTransfer.effectAllowed = 'copy'; }}>
              <div className="mr-row-line">
                <span className="mr-grip" aria-hidden="true">⠿</span>
                <input type="checkbox" checked={isSel} onChange={() => toggleSel(row.id)}
                  aria-label={L(lang, `Selecionar ${row.name || 'linha'}`, `Select ${row.name || 'row'}`)} />
                <input className="mr-name" value={row.name} placeholder={L(lang, 'Nome da linha', 'Row name')}
                  onChange={e => patch(row.id, { name: e.target.value })} />
                <button type="button" className={`mr-adv is-${row.adv}`} onClick={() => patch(row.id, { adv: ADV_NEXT[row.adv] })}
                  title={L(lang, 'Normal → Vantagem → Desvantagem', 'Normal → Advantage → Disadvantage')}>
                  {row.adv === 'adv' ? L(lang, '▲ Vant.', '▲ Adv') : row.adv === 'dis' ? L(lang, '▼ Desv.', '▼ Dis') : L(lang, 'Normal', 'Normal')}
                </button>
                <button type="button" className="mr-icon" onClick={() => dup([row.id])} title={L(lang, 'Duplicar', 'Duplicate')} aria-label={L(lang, 'Duplicar', 'Duplicate')}>⧉</button>
                <button type="button" className={`mr-icon${isEd ? ' is-on' : ''}`} onClick={() => setEditing(isEd ? null : row.id)} title={L(lang, 'Editar', 'Edit')} aria-label={L(lang, 'Editar', 'Edit')}>✎</button>
                <button type="button" className="mr-icon is-danger" onClick={() => { setRows(rs => rs.filter(r => r.id !== row.id)); setSel(s => { const n = new Set(s); n.delete(row.id); return n; }); }}
                  title={L(lang, 'Apagar', 'Delete')} aria-label={L(lang, 'Apagar', 'Delete')}>✕</button>
              </div>
              <div className="mr-formula">{rowFormula(row, mods)}</div>
              {isEd && (
                <div className="mr-edit">
                  <label>{L(lang, 'Atributo', 'Ability')}
                    <select value={row.abil} onChange={e => patch(row.id, { abil: e.target.value })}>
                      {ABILITIES.map(k => <option key={k} value={k}>{abilShort(k, lang)}{k !== 'none' && char ? ` (${fmt(mods[k] || 0)})` : ''}</option>)}
                    </select>
                  </label>
                  <label className="mr-check"><input type="checkbox" checked={row.pb} onChange={e => patch(row.id, { pb: e.target.checked })} /> {L(lang, 'Proficiência', 'Proficiency')}</label>
                  <label>{L(lang, 'Fixo (arma mágica…)', 'Flat (magic weapon…)')}
                    <input type="number" value={row.flat} onChange={e => patch(row.id, { flat: parseInt(e.target.value, 10) || 0 })} />
                  </label>
                  <label className="mr-check"><input type="checkbox" checked={row.abilToDamage} onChange={e => patch(row.id, { abilToDamage: e.target.checked })} /> {L(lang, 'Atributo no dano', 'Ability to damage')}</label>
                  <div className="mr-chain">
                    {row.dice.map((d, i) => (
                      <div key={i} className="mr-die">
                        <input type="number" min={1} max={20} value={d.count}
                          onChange={e => patch(row.id, { dice: row.dice.map((x, j) => (j === i ? { ...x, count: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)) })} />
                        <select value={d.die} onChange={e => patch(row.id, { dice: row.dice.map((x, j) => (j === i ? { ...x, die: +e.target.value } : x)) })}>
                          {DICE.map(n => <option key={n} value={n}>d{n}</option>)}
                        </select>
                        <select value={d.role} onChange={e => patch(row.id, { dice: row.dice.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })}>
                          <option value="damage">{L(lang, 'Dano', 'Damage')}</option>
                          <option value="bonus">{L(lang, 'Bônus no d20', 'Bonus to d20')}</option>
                        </select>
                        <button type="button" className="mr-icon is-danger" onClick={() => patch(row.id, { dice: row.dice.filter((_, j) => j !== i) })} aria-label={L(lang, 'Tirar dado', 'Remove die')}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => patch(row.id, { dice: [...row.dice, { count: 1, die: 6, role: 'damage' }] })}>+ {L(lang, 'Dado', 'Die')}</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mr-actions">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => { const r = newRow(); setRows(rs => [...rs, r]); setEditing(r.id); }}>+ {L(lang, 'Linha', 'Row')}</button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={!sel.size} onClick={() => dup([...sel])}>⧉ {L(lang, 'Duplicar seleção', 'Duplicate selected')}</button>
        <button type="button" className="btn btn-sm btn-primary" disabled={!sel.size} onClick={() => roll(rows.filter(r => sel.has(r.id)).map(r => r.id))}>
          🎲 {L(lang, `Rolar seleção (${sel.size})`, `Roll selected (${sel.size})`)}
        </button>
      </div>

      <div className={`mr-tray${over ? ' is-over' : ''}${results ? ' has-results' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); try { roll(JSON.parse(e.dataTransfer.getData('text/x-mr') || '[]')); } catch { /* arrasto de fora */ } }}>
        {!results ? (
          <p className="mr-tray-hint">{L(lang, 'Arraste linhas para a bandeja (ou selecione e role): tudo rola junto.', 'Drag rows onto the tray (or select and roll): everything rolls at once.')}</p>
        ) : (
          <>
            <div className="mr-results">
              {results.map((r, i) => (
                <div key={i} className={`mr-res${r.crit ? ' is-crit' : ''}${r.fumble ? ' is-fumble' : ''}`}>
                  <div className="mr-res-head">
                    <span className="mr-res-name">{r.name || L(lang, `Linha ${i + 1}`, `Row ${i + 1}`)}</span>
                    {r.adv !== 'normal' && <span className={`mr-adv-tag is-${r.adv}`}>{r.adv === 'adv' ? '▲' : '▼'}</span>}
                    {r.crit && <span className="mr-flag">{L(lang, 'CRÍTICO', 'CRIT')}</span>}
                    {r.fumble && <span className="mr-flag is-fumble">{L(lang, 'FALHA', 'MISS')}</span>}
                  </div>
                  <div className="mr-res-nums">
                    <div className="mr-num is-atk" title={L(lang, 'd20 (mantido em destaque)', 'd20 (kept highlighted)')}>
                      <span className="mr-num-v">{r.atk}</span>
                      <span className="mr-num-k">
                        {r.d20.map((v, j) => <span key={j} className={v === r.kept && (r.d20.length === 1 || j === r.d20.indexOf(r.kept)) ? 'is-kept' : 'is-drop'}>{v}</span>)}
                        {r.mods.atk ? ` ${fmt(r.mods.atk)}` : ''}
                        {r.bonus.map((g, j) => <span key={`b${j}`} className="mr-bonus"> +{g.rolls.join('+')}<sub>d{g.die}</sub></span>)}
                      </span>
                    </div>
                    <span className="mr-slash" aria-hidden="true">/</span>
                    <div className="mr-num is-dmg">
                      <span className="mr-num-v">{r.dmg ?? '—'}</span>
                      <span className="mr-num-k">
                        {r.damage.map((g, j) => <span key={j}>{j ? ' + ' : ''}[{g.rolls.join(',')}]<sub>d{g.die}</sub></span>)}
                        {r.dmg != null && r.mods.dmg ? ` ${fmt(r.mods.dmg)}` : ''}
                        {r.crit && r.damage.length > 0 && <span className="mr-x2"> ×2 {L(lang, 'dados', 'dice')}</span>}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mr-tray-acts">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => roll(lastTray)}>↻ {L(lang, 'Rolar de novo', 'Roll again')}</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setResults(null)}>{L(lang, 'Limpar bandeja', 'Clear tray')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
