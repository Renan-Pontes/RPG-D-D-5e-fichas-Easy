/* Rolagem múltipla em emblemas (celular, tela cheia).
   - Barra de atalhos: dados (silhueta + cor por dado), atributos (ícone + cor), BP e ±.
   - Linha = arranjo: arraste/toque para pôr emblemas; solte um emblema SOBRE outro para
     acoplar (ex.: FOR sobre 2d6 → o dano dos 2d6 soma a FOR); arraste um emblema da linha
     sobre outro para acoplar, ou para um espaço vazio da linha para desacoplar.
   - Deslize ↑/↓ antes de arrastar: soma ou subtrai. Toque no emblema da linha: tira um.
   - 🔒 à esquerda: o que entrar depois da trava é temporário e some depois de rolar.
   - Ao rolar, os dados giram e travam; depois os estáticos se fundem nos dados e cada
     grupo vira um único emblema com o resultado (teste ⚔ / dano 💥).
   Lógica pura em multi-roll.js. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Utils from '../../utils.js';
import { getActiveChar, subscribeActiveChar } from './active-char.js';
import {
  ABILS, ADV_NEXT, DICE, addBadgeTo, coupleBadges, critExtra, dropOnBadge, dropTemps, duplicateRow,
  evalRow, evalUnits, modsFromChar, newRow, removeOne, rollDice, staticValue, toggleLock, uncouple,
} from './multi-roll.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const fmt = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const KEY = (char) => `fh-multiroll3:${char?.id ?? 'global'}`;
const load = (char) => { try { const v = JSON.parse(localStorage.getItem(KEY(char)) || 'null'); return Array.isArray(v) ? v : null; } catch { return null; } };
const save = (char, rows) => { try { localStorage.setItem(KEY(char), JSON.stringify(rows)); } catch { /* sem armazenamento */ } };
const SPIN_MS = 70, FIRST_LOCK = 420, STEP_LOCK = 300, ROW_STAGGER = 140;

// Cores e ícones (sempre os mesmos em toda a ficha da rolagem)
export const DIE_COLOR = { 4: '#f87171', 6: '#fb923c', 8: '#facc15', 10: '#4ade80', 12: '#38bdf8', 20: '#c084fc', 100: '#f472b6' };
export const ABIL_META = {
  str: { icon: '💪', pt: 'FOR', en: 'STR', color: '#ef4444' },
  dex: { icon: '🏹', pt: 'DES', en: 'DEX', color: '#22c55e' },
  con: { icon: '❤️', pt: 'CON', en: 'CON', color: '#f97316' },
  int: { icon: '📘', pt: 'INT', en: 'INT', color: '#3b82f6' },
  wis: { icon: '👁️', pt: 'SAB', en: 'WIS', color: '#a3e635' },
  cha: { icon: '🎭', pt: 'CAR', en: 'CHA', color: '#e879f9' },
};
const PB_COLOR = '#facc15';
const FLAT_COLOR = '#e8dcc0';

// Silhuetas dos dados (viewBox 0 0 100 100)
const SHAPES = {
  4: <polygon points="50,8 92,86 8,86" />,
  6: <rect x="14" y="14" width="72" height="72" rx="8" />,
  8: <polygon points="50,4 94,50 50,96 6,50" />,
  10: <polygon points="50,4 92,40 50,96 8,40" />,
  12: <polygon points="50,4 95,36 78,92 22,92 5,36" />,
  20: <><polygon points="50,3 93,27 93,73 50,97 7,73 7,27" /><polygon points="50,22 76,66 24,66" className="facet" /></>,
  100: <><circle cx="50" cy="50" r="44" /><circle cx="50" cy="50" r="22" className="facet" /></>,
};
const DieIcon = ({ die }) => (
  <svg className="mr-die-svg" viewBox="0 0 100 100" aria-hidden="true">{SHAPES[die] || SHAPES[6]}</svg>
);

/** Emblema (barra, linha e resultado). `value` substitui o número estático. */
function Badge({ b, lang, mods, value, sub, state = '', tag = null, ...rest }) {
  const neg = b.kind === 'flat' ? b.value < 0 : b.sign < 0;
  const color = b.kind === 'die' ? DIE_COLOR[b.die] : b.kind === 'abil' ? ABIL_META[b.abil].color : b.kind === 'pb' ? PB_COLOR : FLAT_COLOR;
  const style = { '--bc': color };
  const count = b.count > 1 ? `${b.count}×` : '';
  return (
    <button type="button" style={style} className={`mr-b is-${b.kind}${neg ? ' is-neg' : ''}${b.temp ? ' is-temp' : ''}${state}`} {...rest}>
      {b.kind === 'die' && (
        <span className="mr-b-die">
          <DieIcon die={b.die} />
          <span className="mr-b-dv">{value ?? ""}</span>
        </span>
      )}
      {b.kind === 'die' && <span className="mr-b-k">{neg ? '−' : ''}{count}d{b.die}</span>}
      {b.kind === 'abil' && <><span className="mr-b-ico" aria-hidden="true">{ABIL_META[b.abil].icon}</span><span className="mr-b-k">{neg ? '−' : ''}{count}{ABIL_META[b.abil][lang === 'pt' ? 'pt' : 'en']}</span><span className="mr-b-v">{fmt(value ?? staticValue(b, mods))}</span></>}
      {b.kind === 'pb' && <><span className="mr-b-ico" aria-hidden="true">⭐</span><span className="mr-b-k">{neg ? '−' : ''}{count}{L(lang, 'BP', 'PB')}</span><span className="mr-b-v">{fmt(value ?? staticValue(b, mods))}</span></>}
      {b.kind === 'flat' && <><span className="mr-b-ico" aria-hidden="true">±</span><span className="mr-b-v">{fmt(value ?? b.value)}</span></>}
      {sub && <span className="mr-b-sub">{sub}</span>}
      {b.temp && <span className="mr-b-temp" aria-label={L(lang, 'temporário', 'temporary')}>⏳</span>}
      {tag}
    </button>
  );
}

export default function MultiRoll({ lang }) {
  const char = useSyncExternalStore(subscribeActiveChar, getActiveChar, getActiveChar);
  const mods = useMemo(() => modsFromChar(char, Utils), [char]);
  const [rows, setRows] = useState(() => load(char) || [newRow(), newRow()]);
  const [sel, setSel] = useState(() => new Set());
  const [active, setActive] = useState(null);
  const [signs, setSigns] = useState({});
  const [flat, setFlat] = useState(1);
  const [ghost, setGhost] = useState(null);
  const [hover, setHover] = useState(null);       // { row, idx|null } | 'new'
  const [play, setPlay] = useState({});           // rowId → { snap, rolls, extra, locked, extraLocked, phase }
  const [, setTick] = useState(0);
  const drag = useRef(null);
  const charId = char?.id;
  useEffect(() => { setRows(load(char) || [newRow(), newRow()]); setSel(new Set()); setPlay({}); }, [charId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { save(char, rows); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeId = active && rows.some(r => r.id === active) ? active : rows[0]?.id;

  const spinning = Object.values(play).some(p => p.phase === 'spin' || p.phase === 'crit');
  useEffect(() => {
    if (!spinning) return undefined;
    const t = setInterval(() => setTick(x => x + 1), SPIN_MS);
    return () => clearInterval(t);
  }, [spinning]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const setRow = (id, fn) => {
    setRows(rs => rs.map(r => (r.id === id ? fn(r) : r)));
    setPlay(p => { if (!p[id] || p[id].phase !== 'done') return p; const n = { ...p }; delete n[id]; return n; });
  };

  // ── alvo sob o dedo: emblema (acoplar), linha (pôr/desacoplar) ou "nova linha" ──
  const targetAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const badge = el.closest('[data-mr-badge]');
    if (badge) return { row: badge.getAttribute('data-mr-rowid'), idx: Number(badge.getAttribute('data-mr-badge')) };
    const row = el.closest('[data-mr-row]');
    if (row) return { row: row.getAttribute('data-mr-row'), idx: null };
    if (el.closest('[data-mr-new]')) return 'new';
    return null;
  };

  const protoOf = (b, d) => (b.kind === 'flat' ? { kind: 'flat', value: flat } : { kind: b.kind, die: b.die, abil: b.abil, sign: d?.sign || signs[b.key] || 1 });
  const begin = (e, payload) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { ...payload, x0: e.clientX, y0: e.clientY, mode: null, flat0: flat, sign: payload.b ? (signs[payload.b.key] || 1) : 1 };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.mode) {
      if (d.b && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.2) d.mode = d.b.kind === 'flat' ? 'scrub' : 'flip';
      else if (Math.hypot(dx, dy) > 14) d.mode = 'drag';
    }
    if (d.mode === 'scrub') {
      setFlat(Math.max(-30, Math.min(30, d.flat0 + Math.round(-dy / 14))) || 0);
      if (Math.abs(dx) > 40) d.mode = 'drag';
    } else if (d.mode === 'flip') {
      if (Math.abs(dx) > 30 || Math.abs(dy) > 70) d.mode = 'drag';
      else if (!d.signed) { d.signed = true; d.sign = dy < 0 ? 1 : -1; setSigns(s => ({ ...s, [d.b.key]: d.sign })); }
    }
    if (d.mode === 'drag') {
      const shown = d.b ? { ...protoOf(d.b, d), count: 1 } : rows.find(r => r.id === d.fromRow)?.badges[d.fromIdx];
      setGhost({ x: e.clientX, y: e.clientY, b: shown });
      setHover(targetAt(e.clientX, e.clientY));
    }
  };
  const finish = () => { drag.current = null; setGhost(null); setHover(null); };
  const onUp = (e) => {
    const d = drag.current;
    if (!d) return;
    const t = d.mode === 'drag' ? targetAt(e.clientX, e.clientY) : null;
    if (d.b) {
      const proto = protoOf(d.b, d);
      if (d.mode === 'drag') {
        if (t === 'new') { const r = addBadgeTo(newRow(), proto); setRows(rs => [...rs, r]); setActive(r.id); }
        else if (t && t.idx != null) { setRow(t.row, r => dropOnBadge(r, t.idx, proto)); setActive(t.row); }
        else if (t) { setRow(t.row, r => addBadgeTo(r, proto)); setActive(t.row); }
      } else if (!d.mode) {
        setRow(activeId, r => addBadgeTo(r, proto));
      }
      if (d.b.kind !== 'flat') setSigns(s => ({ ...s, [d.b.key]: 1 }));
    } else if (d.fromRow) {
      // emblema da linha: toque tira um; arrasto acopla (sobre outro) ou desacopla (vazio)
      if (!d.mode) setRow(d.fromRow, r => removeOne(r, d.fromIdx));
      else if (d.mode === 'drag' && t && t !== 'new' && t.row === d.fromRow) {
        if (t.idx != null && t.idx !== d.fromIdx) setRow(d.fromRow, r => coupleBadges(r, d.fromIdx, t.idx));
        else if (t.idx == null) setRow(d.fromRow, r => uncouple(r, d.fromIdx));
      }
    }
    finish();
  };

  // ── rolar ──
  const roll = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const ids = rows.filter(r => sel.has(r.id) && r.badges.length).map(r => r.id);
    const list = ids.length ? ids : (rows.find(r => r.id === activeId)?.badges.length ? [activeId] : []);
    const next = {};
    list.forEach((id, ri) => {
      const snap = rows.find(r => r.id === id);
      const rolls = rollDice(snap);
      const order = Object.keys(rolls).map(Number);
      next[id] = { snap, rolls, extra: {}, locked: new Set(), phase: order.length ? 'spin' : 'done' };
      const finishRow = () => setRows(rs => rs.map(r => (r.id === id ? dropTemps(r) : r))); // temporários somem
      if (!order.length) finishRow();
      order.forEach((idx, k) => {
        timers.current.push(setTimeout(() => setPlay(p => {
          const cur = p[id]; if (!cur) return p;
          const locked = new Set(cur.locked); locked.add(idx);
          if (locked.size < order.length) return { ...p, [id]: { ...cur, locked } };
          const ev = evalRow(snap, mods, cur.rolls);
          const extra = ev.crit ? critExtra(snap) : {};
          const eo = Object.keys(extra).map(Number);
          if (eo.length) {
            eo.forEach((ix, j) => timers.current.push(setTimeout(() => setPlay(q => {
              const c = q[id]; if (!c) return q;
              const el = new Set(c.extraLocked || []); el.add(ix);
              const doneNow = el.size === eo.length;
              if (doneNow) finishRow();
              return { ...q, [id]: { ...c, extraLocked: el, phase: doneNow ? 'done' : 'crit' } };
            }), 700 + j * STEP_LOCK)));
            if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
            return { ...p, [id]: { ...cur, locked, phase: 'crit', extra, extraLocked: new Set() } };
          }
          finishRow();
          if (navigator.vibrate) navigator.vibrate(30);
          return { ...p, [id]: { ...cur, locked, phase: 'done' } };
        }), ri * ROW_STAGGER + FIRST_LOCK + k * STEP_LOCK));
      });
    });
    setPlay(p => ({ ...p, ...next }));
  };

  const palette = [
    ...DICE.map(d => ({ key: `d${d}`, kind: 'die', die: d, sign: 1, count: 1 })),
    ...ABILS.map(k => ({ key: `a${k}`, kind: 'abil', abil: k, sign: 1, count: 1 })),
    { key: 'pb', kind: 'pb', sign: 1, count: 1 },
    { key: 'flat', kind: 'flat' },
  ];
  const rnd = (die) => 1 + Math.floor(Math.random() * die);

  // emblemas da linha agrupados por acoplamento (colchete em volta do grupo)
  const renderArray = (row, pl) => {
    const bs = pl ? pl.snap.badges : row.badges;
    const done = pl?.phase === 'done';
    if (done) {
      const units = evalUnits(pl.snap, mods, pl.rolls, pl.extra);
      const dmgUnits = units.filter(u => u.kind === 'damage');
      return (
        <>
          {units.map((u, k) => {
            const base = u.die ? { kind: 'die', die: u.die, sign: 1, count: 1 } : { kind: 'flat', value: u.value };
            const natCls = u.nat === 20 ? ' is-nat20' : u.nat === 1 ? ' is-nat1' : '';
            return (
              <Badge key={`u${k}`} b={base} lang={lang} mods={mods} value={u.value}
                state={` is-result is-${u.kind}${natCls}`}
                tag={<span className="mr-b-role">{u.kind === 'check' ? '⚔' : u.kind === 'damage' ? '💥' : 'Σ'}</span>}
                title={u.idxs.map(i => bs[i]).filter(Boolean).map(b => (b.kind === 'die' ? `${b.count}d${b.die}` : b.kind === 'abil' ? b.abil.toUpperCase() : b.kind === 'pb' ? 'PB' : fmt(b.value))).join(' + ')} />
            );
          })}
          {dmgUnits.length > 1 && (
            <Badge b={{ kind: 'flat', value: 0 }} lang={lang} mods={mods} value={dmgUnits.reduce((s, u) => s + u.value, 0)}
              state=" is-result is-damage is-total" tag={<span className="mr-b-role">Σ💥</span>} />
          )}
        </>
      );
    }
    const out = [];
    let i = 0;
    while (i < bs.length) {
      const g = bs[i].group;
      const members = [];
      do { members.push(i); i++; } while (g && i < bs.length && bs[i].group === g);
      const nodes = members.map(idx => {
        const b = bs[idx];
        let value; let sub; let state = '';
        const isHover = hover && hover !== 'new' && hover.row === row.id && hover.idx === idx;
        if (pl && b.kind === 'die') {
          const rolled = pl.rolls[idx];
          if (rolled) {
            const extra = pl.extra?.[idx];
            if (!pl.locked.has(idx)) { value = rnd(b.die * Math.max(1, b.count)); state = ' is-spin'; }
            else {
              const isD20 = b.die === 20 && b.sign > 0 && idx === bs.findIndex(x => x.kind === 'die' && x.die === 20 && x.sign > 0);
              if (isD20 && pl.snap.adv !== 'normal') { value = pl.snap.adv === 'adv' ? Math.max(...rolled) : Math.min(...rolled); sub = rolled.join('·'); }
              else { value = rolled.reduce((s, v) => s + v, 0); if (rolled.length > 1) sub = rolled.join('+'); }
              if (isD20 && value === 20) state = ' is-nat20'; else if (isD20 && value === 1) state = ' is-nat1';
              if (extra) {
                if (!(pl.extraLocked || new Set()).has(idx)) { value = `${value}+${rnd(b.die)}`; state += ' is-spin'; }
                else { value += extra.reduce((s, v) => s + v, 0); sub = `${rolled.join('+')} | +${extra.join('+')}`; }
              }
              state += ' is-locked';
            }
          }
        }
        return (
          <Badge key={idx} b={b} lang={lang} mods={mods} value={value} sub={sub} state={`${state}${isHover ? ' is-target' : ''}`}
            data-mr-badge={idx} data-mr-rowid={row.id}
            onPointerDown={pl ? undefined : (e) => { setActive(row.id); begin(e, { fromRow: row.id, fromIdx: idx }); }}
            title={L(lang, 'Toque: tirar · Arraste sobre outro: acoplar · Arraste para o vazio: desacoplar', 'Tap: remove · Drag onto another: couple · Drag to empty space: uncouple')} />
        );
      });
      out.push(members.length > 1 || g
        ? <span key={`g${members[0]}`} className="mr-grp" title={L(lang, 'Acoplados: somam juntos', 'Coupled: added together')}>{nodes}</span>
        : nodes[0]);
    }
    return out;
  };

  return (
    <div className="mr2" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={finish}>
      <div className="mr2-rows">
        {rows.map((row, ri) => {
          const pl = play[row.id];
          const ev = pl?.phase === 'done' ? evalRow(pl.snap, mods, pl.rolls, pl.extra) : null;
          const isSel = sel.has(row.id);
          const hoverRow = hover && hover !== 'new' && hover.row === row.id && hover.idx == null;
          return (
            <div key={row.id} data-mr-row={row.id}
              className={`mr2-row${isSel ? ' is-sel' : ''}${row.id === activeId ? ' is-active' : ''}${hoverRow ? ' is-hover' : ''}${ev?.crit ? ' is-crit' : ''}${ev?.fumble ? ' is-fumble' : ''}`}
              onClick={() => setActive(row.id)}>
              <div className="mr2-row-top">
                <button type="button" className={`mr2-sel${isSel ? ' is-on' : ''}`} aria-pressed={isSel} aria-label={L(lang, 'Selecionar linha', 'Select row')}
                  onClick={(e) => { e.stopPropagation(); setSel(s => { const n = new Set(s); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; }); }} />
                <input className="mr2-name" value={row.name} placeholder={L(lang, `Linha ${ri + 1}`, `Row ${ri + 1}`)}
                  onFocus={() => setActive(row.id)} onChange={e => setRow(row.id, r => ({ ...r, name: e.target.value }))} />
                {ev?.crit && <em className="mr2-flag">{L(lang, 'CRÍTICO', 'CRIT')}</em>}
                {row.badges.some(b => b.kind === 'die' && b.die === 20) && (
                  <button type="button" className={`mr2-adv is-${row.adv}`} title={L(lang, 'Normal / Vantagem / Desvantagem', 'Normal / Advantage / Disadvantage')}
                    onClick={(e) => { e.stopPropagation(); setRow(row.id, r => ({ ...r, adv: ADV_NEXT[r.adv] })); }}>
                    {row.adv === 'adv' ? '▲' : row.adv === 'dis' ? '▼' : '='}
                  </button>
                )}
                <button type="button" className="mr2-mini" aria-label={L(lang, 'Duplicar', 'Duplicate')}
                  onClick={(e) => { e.stopPropagation(); setRows(rs => { const i = rs.findIndex(r => r.id === row.id); return [...rs.slice(0, i + 1), duplicateRow(row), ...rs.slice(i + 1)]; }); }}>⧉</button>
                <button type="button" className="mr2-mini is-danger" aria-label={L(lang, 'Apagar linha', 'Delete row')}
                  onClick={(e) => { e.stopPropagation(); setRows(rs => rs.filter(r => r.id !== row.id)); }}>✕</button>
              </div>
              <div className="mr2-array">
                <button type="button" className={`mr2-lock${row.locked ? ' is-on' : ''}`} aria-pressed={!!row.locked}
                  title={row.locked
                    ? L(lang, 'Travada: o que entrar agora é só desta rolagem', 'Locked: anything added now is for this roll only')
                    : L(lang, 'Travar: o que entrar depois some depois de rolar', 'Lock: anything added afterwards vanishes after rolling')}
                  onClick={(e) => { e.stopPropagation(); setRow(row.id, toggleLock); }}>{row.locked ? '🔒' : '🔓'}</button>
                {(pl ? pl.snap.badges : row.badges).length === 0 && <span className="mr2-empty">{L(lang, 'arraste emblemas aqui', 'drag badges here')}</span>}
                {renderArray(row, pl)}
              </div>
            </div>
          );
        })}
        <button type="button" data-mr-new className={`mr2-new${hover === 'new' ? ' is-hover' : ''}`}
          onClick={() => { const r = newRow(); setRows(rs => [...rs, r]); setActive(r.id); }}>
          + {L(lang, 'Nova linha (ou solte um emblema aqui)', 'New row (or drop a badge here)')}
        </button>
      </div>

      <div className="mr2-bar">
        <div className="mr2-rollbar">
          <span className="mr2-hint">{L(lang,
            'Toque: linha ativa · ↑↓ antes de arrastar: soma/subtrai · solte sobre um emblema: acopla · 🔒: o resto é temporário',
            'Tap: active row · ↑↓ before dragging: add/subtract · drop on a badge: couple · 🔒: the rest is temporary')}</span>
          <button type="button" className="btn btn-primary mr2-roll" onClick={roll} disabled={spinning}>🎲 {L(lang, 'Rolar', 'Roll')}{sel.size ? ` (${sel.size})` : ''}</button>
        </div>
        <div className="mr2-palette">
          {palette.map(b => {
            const s = signs[b.key] || 1;
            const shown = b.kind === 'flat' ? { kind: 'flat', value: flat } : { ...b, sign: s };
            return (
              <Badge key={b.key} b={shown} lang={lang} mods={mods} state=" is-src"
                onPointerDown={(e) => begin(e, { b })}
                onWheel={b.kind === 'flat' ? (e) => setFlat(v => Math.max(-30, Math.min(30, v + (e.deltaY < 0 ? 1 : -1)))) : undefined}
                aria-label={b.kind === 'flat' ? L(lang, `Número fixo ${fmt(flat)}: deslize para mudar`, `Flat ${fmt(flat)}: swipe to change`) : undefined} />
            );
          })}
        </div>
      </div>

      {ghost?.b && (
        <div className="mr2-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <Badge b={ghost.b.kind === 'flat' && ghost.b.value == null ? { kind: 'flat', value: flat } : ghost.b} lang={lang} mods={mods} tabIndex={-1} />
        </div>
      )}
    </div>
  );
}
