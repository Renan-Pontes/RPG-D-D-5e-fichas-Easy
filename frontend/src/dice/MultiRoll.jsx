/* Rolagem múltipla em "emblemas" (pensada para o celular, tela cheia):
   - Barra de atalhos embaixo: dados, modificador de cada atributo da ficha, BP e um
     emblema ± (deslize para cima/baixo para mudar o número).
   - Cada linha é um arranjo vazio: arraste emblemas para ela (ou toque no emblema para
     pô-lo na linha ativa). Antes de arrastar, deslize o emblema para cima (+) ou para
     baixo (−) para escolher se soma ou subtrai. Iguais empilham (2×d6).
   - Selecione linhas e role: os dados giram e travam da esquerda para a direita, e a
     própria linha vira o resultado (teste | dano). No 20 natural, o dano gira de novo
     com os dados extras.
   Lógica pura em multi-roll.js. Linhas guardadas no aparelho, por ficha. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Utils from '../../utils.js';
import { getActiveChar, subscribeActiveChar } from './active-char.js';
import { ABILS, ADV_NEXT, DICE, addBadge, critExtra, duplicateRow, evalRow, modsFromChar, newRow, removeOne, rollDice, staticValue } from './multi-roll.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const AB = { str: ['FOR', 'STR'], dex: ['DES', 'DEX'], con: ['CON', 'CON'], int: ['INT', 'INT'], wis: ['SAB', 'WIS'], cha: ['CAR', 'CHA'] };
const abName = (k, lang) => AB[k][lang === 'pt' ? 0 : 1];
const fmt = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const KEY = (char) => `fh-multiroll2:${char?.id ?? 'global'}`;
const load = (char) => { try { const v = JSON.parse(localStorage.getItem(KEY(char)) || 'null'); return Array.isArray(v) ? v : null; } catch { return null; } };
const save = (char, rows) => { try { localStorage.setItem(KEY(char), JSON.stringify(rows)); } catch { /* sem armazenamento */ } };
const starter = () => [newRow(), newRow()];
const SPIN_MS = 70, FIRST_LOCK = 420, STEP_LOCK = 300, ROW_STAGGER = 140;

export default function MultiRoll({ lang }) {
  const char = useSyncExternalStore(subscribeActiveChar, getActiveChar, getActiveChar);
  const mods = useMemo(() => modsFromChar(char, Utils), [char]);
  const [rows, setRows] = useState(() => load(char) || starter());
  const [sel, setSel] = useState(() => new Set());
  const [active, setActive] = useState(null);
  const [signs, setSigns] = useState({});          // sinal escolhido por emblema da barra
  const [flat, setFlat] = useState(1);              // valor do emblema ±
  const [ghost, setGhost] = useState(null);         // emblema seguindo o dedo
  const [hover, setHover] = useState(null);         // linha sob o dedo
  const [play, setPlay] = useState({});             // rowId → { rolls, extra, locked:Set, phase }
  const [, setTick] = useState(0);
  const drag = useRef(null);
  const charId = char?.id;
  useEffect(() => { setRows(load(char) || starter()); setSel(new Set()); setPlay({}); }, [charId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { save(char, rows); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeId = active && rows.some(r => r.id === active) ? active : rows[0]?.id;

  // giro: enquanto algum dado não travou, redesenha números aleatórios
  const spinning = Object.values(play).some(p => p.phase === 'spin' || p.phase === 'crit');
  useEffect(() => {
    if (!spinning) return undefined;
    const t = setInterval(() => setTick(x => x + 1), SPIN_MS);
    return () => clearInterval(t);
  }, [spinning]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const setRow = (id, fn) => setRows(rs => rs.map(r => (r.id === id ? fn(r) : r)));
  const dropOn = (rowId, proto) => {
    if (!rowId) {
      const r = addBadge(newRow(), proto);
      setRows(rs => [...rs, r]); setActive(r.id); return;
    }
    setRow(rowId, r => addBadge(r, proto));
    setActive(rowId);
    setPlay(p => { const n = { ...p }; delete n[rowId]; return n; });
  };

  // ── gestos da barra de atalhos (ponteiro: dedo e mouse iguais) ──
  const protoOf = (b, d) => (b.kind === 'flat' ? { kind: 'flat', value: flat } : { ...b, sign: d?.sign || signs[b.key] || 1 });
  const onDown = (e, b) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { b, x0: e.clientX, y0: e.clientY, mode: null, flat0: flat, sign: signs[b.key] || 1 };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.mode) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.2) d.mode = d.b.kind === 'flat' ? 'scrub' : 'flip';
      else if (Math.hypot(dx, dy) > 14) d.mode = 'drag';
    }
    if (d.mode === 'scrub') {
      setFlat(Math.max(-30, Math.min(30, d.flat0 + Math.round(-dy / 14))) || 0);
      if (Math.abs(dx) > 40) d.mode = 'drag';
    } else if (d.mode === 'flip') {
      // o sinal fica decidido pelo primeiro gesto vertical; sair dele começa o arrasto
      if (Math.abs(dx) > 30 || Math.abs(dy) > 70) d.mode = 'drag';
      else if (!d.signed) { d.signed = true; d.sign = dy < 0 ? 1 : -1; setSigns(s => ({ ...s, [d.b.key]: d.sign })); }
    }
    if (d.mode === 'drag') {
      setGhost({ x: e.clientX, y: e.clientY, b: d.b });
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-mr-row]');
      setHover(el ? el.getAttribute('data-mr-row') : (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-mr-new]') ? 'new' : null));
    }
  };
  const onUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const proto = protoOf(d.b, d);
    if (d.mode === 'drag') {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest('[data-mr-row]');
      if (row) dropOn(row.getAttribute('data-mr-row'), proto);
      else if (el?.closest('[data-mr-new]')) dropOn(null, proto);
      if (d.b.kind !== 'flat') setSigns(s => ({ ...s, [d.b.key]: 1 }));
    } else if (!d.mode) {
      dropOn(activeId, proto); // toque: vai para a linha ativa
      if (d.b.kind !== 'flat') setSigns(s => ({ ...s, [d.b.key]: 1 }));
    }
    setGhost(null); setHover(null);
  };

  // ── rolar: gira e trava da esquerda para a direita; crítico → dano gira de novo ──
  const roll = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const ids = rows.filter(r => sel.has(r.id) && r.badges.length).map(r => r.id);
    const list = ids.length ? ids : (rows.find(r => r.id === activeId)?.badges.length ? [activeId] : []);
    const next = {};
    list.forEach((id, ri) => {
      const row = rows.find(r => r.id === id);
      const rolls = rollDice(row);
      const order = Object.keys(rolls).map(Number);
      next[id] = { rolls, extra: {}, locked: new Set(), phase: 'spin' };
      order.forEach((idx, k) => {
        timers.current.push(setTimeout(() => setPlay(p => {
          const cur = p[id]; if (!cur) return p;
          const locked = new Set(cur.locked); locked.add(idx);
          let phase = cur.phase;
          if (locked.size === order.length) {
            const ev = evalRow(row, mods, cur.rolls);
            if (ev.crit && Object.keys(critExtra(row, () => 0)).length) {
              phase = 'crit';
              const extra = critExtra(row);
              const eo = Object.keys(extra).map(Number);
              eo.forEach((ix, j) => timers.current.push(setTimeout(() => setPlay(q => {
                const c = q[id]; if (!c) return q;
                const el = new Set(c.extraLocked || []); el.add(ix);
                return { ...q, [id]: { ...c, extraLocked: el, phase: el.size === eo.length ? 'done' : 'crit' } };
              }), 700 + j * STEP_LOCK)));
              if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
              return { ...p, [id]: { ...cur, locked, phase, extra, extraLocked: new Set() } };
            }
            phase = 'done';
            if (navigator.vibrate) navigator.vibrate(30);
          }
          return { ...p, [id]: { ...cur, locked, phase } };
        }), ri * ROW_STAGGER + FIRST_LOCK + k * STEP_LOCK));
      });
      if (!order.length) next[id].phase = 'done';
    });
    setPlay(p => ({ ...p, ...next }));
  };

  const palette = [
    ...DICE.map(d => ({ key: `d${d}`, kind: 'die', die: d, label: `d${d}` })),
    ...ABILS.map(k => ({ key: `a${k}`, kind: 'abil', abil: k, label: abName(k, lang), val: mods[k] })),
    { key: 'pb', kind: 'pb', label: L(lang, 'BP', 'PB'), val: mods.pb },
    { key: 'flat', kind: 'flat', label: '±' },
  ];

  const rnd = (die) => 1 + Math.floor(Math.random() * die);
  const badgeView = (row, b, i, pl) => {
    const sign = b.kind === 'flat' ? (b.value < 0 ? -1 : 1) : b.sign;
    let face = null;
    let sub = null;
    let state = '';
    if (b.kind === 'die') {
      const rolled = pl?.rolls?.[i];
      const extra = pl?.extra?.[i];
      if (rolled) {
        const locked = pl.locked.has(i);
        const extraSpin = extra && !(pl.extraLocked || new Set()).has(i);
        if (!locked) { face = rnd(b.die); state = ' is-spin'; }
        else {
          const isAdvD20 = b.die === 20 && row.adv !== 'normal' && i === row.badges.findIndex(x => x.kind === 'die' && x.die === 20 && x.sign > 0);
          if (isAdvD20) {
            const keep = row.adv === 'adv' ? Math.max(...rolled) : Math.min(...rolled);
            face = keep; sub = rolled.join('·');
            if (keep === 20) state = ' is-nat20'; else if (keep === 1) state = ' is-nat1';
          } else {
            face = rolled.reduce((s, v) => s + v, 0) + (extra && !extraSpin ? extra.reduce((s, v) => s + v, 0) : 0);
            if (rolled.length > 1) sub = rolled.join('+');
            if (b.die === 20 && rolled.length === 1) { if (rolled[0] === 20) state = ' is-nat20'; else if (rolled[0] === 1) state = ' is-nat1'; }
          }
          if (extraSpin) { face = `${face}+${rnd(b.die * extra.length)}`; state += ' is-spin'; }
          else if (extra) { sub = `${rolled.join('+')} +${extra.join('+')}`; state += ' is-crit-die'; }
          state += ' is-locked';
        }
      }
    }
    const label = b.kind === 'die' ? `${b.count > 1 ? `${b.count}×` : ''}d${b.die}`
      : b.kind === 'abil' ? `${b.count > 1 ? `${b.count}×` : ''}${abName(b.abil, lang)}`
        : b.kind === 'pb' ? `${b.count > 1 ? `${b.count}×` : ''}${L(lang, 'BP', 'PB')}` : '';
    const val = b.kind === 'die' ? face : staticValue(b, mods);
    return (
      <button key={i} type="button" className={`mr-b is-${b.kind}${sign < 0 ? ' is-neg' : ''}${state}`}
        onClick={(e) => { e.stopPropagation(); if (!pl) setRow(row.id, r => removeOne(r, i)); }}
        title={pl ? '' : L(lang, 'Toque para tirar', 'Tap to remove')}>
        {b.kind !== 'flat' && <span className="mr-b-k">{sign < 0 ? '−' : ''}{label}</span>}
        <span className="mr-b-v">{b.kind === 'die' ? (val ?? '·') : fmt(val)}</span>
        {sub && <span className="mr-b-sub">{sub}</span>}
      </button>
    );
  };

  return (
    <div className="mr2" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; setGhost(null); setHover(null); }}>
      <div className="mr2-rows">
        {rows.map((row, ri) => {
          const pl = play[row.id];
          const done = pl && pl.phase === 'done';
          const ev = pl && (pl.phase === 'done' || pl.phase === 'crit') ? evalRow(row, mods, pl.rolls, pl.phase === 'done' ? pl.extra : {}) : null;
          const isSel = sel.has(row.id);
          return (
            <div key={row.id} data-mr-row={row.id}
              className={`mr2-row${isSel ? ' is-sel' : ''}${row.id === activeId ? ' is-active' : ''}${hover === row.id ? ' is-hover' : ''}${ev?.crit ? ' is-crit' : ''}${ev?.fumble ? ' is-fumble' : ''}`}
              onClick={() => setActive(row.id)}>
              <div className="mr2-row-top">
                <button type="button" className={`mr2-sel${isSel ? ' is-on' : ''}`} aria-pressed={isSel}
                  aria-label={L(lang, 'Selecionar linha', 'Select row')}
                  onClick={(e) => { e.stopPropagation(); setSel(s => { const n = new Set(s); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; }); }} />
                <input className="mr2-name" value={row.name} placeholder={L(lang, `Linha ${ri + 1}`, `Row ${ri + 1}`)}
                  onFocus={() => setActive(row.id)} onChange={e => setRow(row.id, r => ({ ...r, name: e.target.value }))} />
                {row.badges.some(b => b.kind === 'die' && b.die === 20) && (
                  <button type="button" className={`mr2-adv is-${row.adv}`} onClick={(e) => { e.stopPropagation(); setRow(row.id, r => ({ ...r, adv: ADV_NEXT[r.adv] })); }}>
                    {row.adv === 'adv' ? '▲' : row.adv === 'dis' ? '▼' : '='}
                  </button>
                )}
                <button type="button" className="mr2-mini" aria-label={L(lang, 'Duplicar', 'Duplicate')}
                  onClick={(e) => { e.stopPropagation(); setRows(rs => { const i = rs.findIndex(r => r.id === row.id); const c = duplicateRow(row); return [...rs.slice(0, i + 1), c, ...rs.slice(i + 1)]; }); }}>⧉</button>
                <button type="button" className="mr2-mini is-danger" aria-label={L(lang, 'Apagar linha', 'Delete row')}
                  onClick={(e) => { e.stopPropagation(); setRows(rs => rs.filter(r => r.id !== row.id)); }}>✕</button>
              </div>
              <div className="mr2-array">
                {row.badges.length === 0 && <span className="mr2-empty">{L(lang, 'arraste emblemas aqui', 'drag badges here')}</span>}
                {row.badges.map((b, i) => badgeView(row, b, i, pl))}
                {ev && (
                  <span className={`mr2-out${done ? ' is-in' : ''}`}>
                    {ev.check != null ? (
                      <>
                        <b className="mr2-chk">{ev.check}</b>
                        {ev.damage != null && <><i>|</i><b className="mr2-dmg">{pl.phase === 'crit' ? '…' : ev.damage}</b></>}
                      </>
                    ) : <b className="mr2-sum">{ev.total}</b>}
                    {ev.crit && <em className="mr2-flag">{L(lang, 'CRÍTICO', 'CRIT')}</em>}
                  </span>
                )}
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
          <span className="mr2-hint">{sel.size
            ? L(lang, `${sel.size} linha(s) selecionada(s)`, `${sel.size} row(s) selected`)
            : L(lang, 'Toque = linha ativa · ↑↓ antes de arrastar = soma/subtrai', 'Tap = active row · ↑↓ before dragging = add/subtract')}</span>
          <button type="button" className="btn btn-primary mr2-roll" onClick={roll} disabled={spinning}>🎲 {L(lang, 'Rolar', 'Roll')}</button>
        </div>
        <div className="mr2-palette">
          {palette.map(b => {
            const s = b.kind === 'flat' ? (flat < 0 ? -1 : 1) : (signs[b.key] || 1);
            return (
              <button key={b.key} type="button" className={`mr-b is-${b.kind} is-src${s < 0 ? ' is-neg' : ''}`}
                onPointerDown={(e) => onDown(e, b)}
                onWheel={b.kind === 'flat' ? (e) => setFlat(v => Math.max(-30, Math.min(30, v + (e.deltaY < 0 ? 1 : -1)))) : undefined}
                aria-label={b.kind === 'flat' ? L(lang, `Número fixo ${fmt(flat)}: deslize para mudar`, `Flat number ${fmt(flat)}: swipe to change`) : b.label}>
                {b.kind === 'flat' ? (
                  <><span className="mr-b-k">±</span><span className="mr-b-v">{fmt(flat)}</span></>
                ) : (
                  <>
                    <span className="mr-b-k">{s < 0 ? '−' : ''}{b.label}</span>
                    {b.val != null && <span className="mr-b-v">{fmt(b.val)}</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {ghost && (
        <div className={`mr2-ghost mr-b is-${ghost.b.kind}${(ghost.b.kind === 'flat' ? flat : (signs[ghost.b.key] || 1)) < 0 ? ' is-neg' : ''}`}
          style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <span className="mr-b-k">{ghost.b.kind === 'flat' ? '±' : `${(drag.current?.sign || signs[ghost.b.key] || 1) < 0 ? '−' : '+'}${ghost.b.label}`}</span>
          {ghost.b.kind === 'flat' && <span className="mr-b-v">{fmt(flat)}</span>}
        </div>
      )}
    </div>
  );
}
