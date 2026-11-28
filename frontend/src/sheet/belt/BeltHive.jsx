import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, } from '../../../data/i18n.js';
import FhTitle from '../FhTitle.jsx';
import FhAdv3 from '../FhAdv3.jsx';
import { FhProfLegend, FhSkillRow, FhTap, FhTapToRoll } from '../FhChecks.jsx';
import BeltMultiRoll, { pairBeltSlots, rollBeltPairs } from '../../dice/BeltMultiRoll.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { HONEY_DICE, beltAbbr, BeltHex } from './BeltHex.jsx';
import { BeltQuickSlot } from './BeltQuickSlot.jsx';
import { AbilitySeals } from '../tabs/SheetSkillsSection.jsx';

export const BeltAbilities = ({ char, lang, roll, profB, beltStore = null }) => {
  // DES ⇄ CON e SAB ⇄ CAR: FOR e DES ficam sobre os dois d20 centrais (os mais usados)
  const top = ['str', 'con', 'dex'];
  const bottom = ['int', 'cha', 'wis'];
  const pt = lang === 'pt';
  const effectiveProfB = profB != null ? profB : Utils.profBonus(char.level);

  const [activeSlot, setActiveSlot] = useState(0);
  const activeSlotRef = useRef(0);
  activeSlotRef.current = activeSlot;
  const bindRef = useRef(() => {});     // bindTo desta renderização, para o pointerup da janela
  const beltToast = useSheetToast();
  const [dragLink, setDragLink] = useState(null);
  const dragLinkRef = useRef(null);
  dragLinkRef.current = dragLink;
  const lastTargetSlotRef = useRef(null);

  const getSlotAtPoint = (x, y) => {
    if (x == null || y == null) return null;
    const elements = document.querySelectorAll('.fh-belt-slot[data-quick-slot-index]');
    let closestIdx = null;
    let closestDist = Infinity;
    const hitMargin = 36;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left - hitMargin &&
        x <= rect.right + hitMargin &&
        y >= rect.top - hitMargin &&
        y <= rect.bottom + hitMargin
      ) {
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = Number(el.getAttribute('data-quick-slot-index'));
        }
      }
    }
    return closestIdx;
  };

  useEffect(() => {
    if (!dragLink) {
      lastTargetSlotRef.current = null;
      return;
    }

    const onPointerMove = (e) => {
      const targetIndex = getSlotAtPoint(e.clientX, e.clientY);
      if (targetIndex != null) lastTargetSlotRef.current = targetIndex;
      setDragLink((prev) => (prev ? {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        targetSlot: targetIndex,
      } : null));
    };

    const onPointerUp = (e) => {
      const current = dragLinkRef.current;
      const pointSlot = e && e.clientX != null ? getSlotAtPoint(e.clientX, e.clientY) : null;
      let targetIndex = pointSlot ?? lastTargetSlotRef.current ?? current?.targetSlot;
      // segurou o nome do atributo e soltou no lugar (sem arrastar): prende ao dado ATIVO
      if (current && current.fromHold && targetIndex == null && e && e.type !== 'pointercancel' && e.clientX != null
        && Math.hypot(e.clientX - current.originX, e.clientY - current.originY) < 12) targetIndex = activeSlotRef.current;
      if (current && targetIndex != null) {
        bindRef.current(targetIndex, current.ability);
        setActiveSlot(targetIndex);
        if (navigator.vibrate) navigator.vibrate(40);
      }
      setDragLink(null);
      lastTargetSlotRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
    };
  }, [dragLink != null]);

  const onStartAbilityDrag = (k, e, anchor) => {
    const startX = anchor?.startX ?? (anchor?.left != null ? anchor.left + anchor.width / 2 : e.clientX);
    const startY = anchor?.startY ?? (anchor?.top != null ? anchor.top + anchor.height * 0.45 : e.clientY);
    const radius = anchor?.radius ?? 17;
    const targetSlot = getSlotAtPoint(e.clientX, e.clientY);
    lastTargetSlotRef.current = targetSlot;
    setDragLink({
      ability: k,
      fromHold: !e.type,          // veio de segurar parado (o arrasto passa o evento de verdade)
      originX: e.clientX,
      originY: e.clientY,
      startX,
      startY,
      radius,
      currentX: e.clientX,
      currentY: e.clientY,
      targetSlot,
    });
  };

  // 4 hexágonos de dado no meio do cinto; os dois centrais são d20 com FOR e DES já atribuídos
  // e o BP ligado — cada um tem a sua cunha de BP no vão acima dele.
  // Cinto salvo por personagem (slots + as duas "cargas" I/II de cada metade)
  const beltKey = `fh-belt:${char?.id ?? 'local'}`;
  const beltSaved = useMemo(() => {
    try { return beltStore ? beltStore.load(beltKey) : JSON.parse(localStorage.getItem(beltKey) || 'null'); } catch { return null; }
  }, [beltKey, beltStore]);
  const [slots, setSlots] = useState(() => (Array.isArray(beltSaved?.slots) && beltSaved.slots.length === 4 ? beltSaved.slots : [
    { die: 6, count: 1, bound: null, advMode: 'normal', pb: false },
    { die: 20, count: 1, bound: 'str', advMode: 'normal', pb: true },
    { die: 20, count: 1, bound: 'dex', advMode: 'normal', pb: true },
    { die: 8, count: 1, bound: null, advMode: 'normal', pb: false },
  ]));
  // carga ativa (0 = I, 1 = II) e a carga guardada de cada metade do cinto
  const [loadouts, setLoadouts] = useState(() => beltSaved?.loadouts || { L: { active: 0, other: null }, R: { active: 0, other: null } });
  useEffect(() => {
    try {
      const val = { slots, loadouts };
      if (beltStore) beltStore.save(beltKey, val);
      else localStorage.setItem(beltKey, JSON.stringify(val));
    } catch { /* sem armazenamento */ }
  }, [beltKey, beltStore, slots, loadouts]);
  const swapLoadout = (side) => {
    const idxs = side === 'L' ? [0, 1] : [2, 3];
    const cur = idxs.map((i) => slots[i]);
    const lo = loadouts[side];
    const next = lo.other || cur.map((x) => ({ ...x }));   // primeira vez: II nasce como cópia de I
    setSlots((prev) => prev.map((x, i) => (idxs.includes(i) ? next[idxs.indexOf(i)] : x)));
    setLoadouts((prev) => ({ ...prev, [side]: { active: 1 - prev[side].active, other: cur } }));
    if (navigator.vibrate) navigator.vibrate(20);
  };
  const pbActive = slots.some((s) => s.pb);
  const togglePb = (idx) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, pb: !s.pb } : s)));
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const onShiftDie = (idx, delta) => {
    setActiveSlot(idx);
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const curDieIdx = Math.max(0, HONEY_DICE.indexOf(s.die));
      const nextIdx = (((curDieIdx + delta) % HONEY_DICE.length) + HONEY_DICE.length) % HONEY_DICE.length;
      const nextDie = HONEY_DICE[nextIdx];
      return {
        ...s,
        die: nextDie,
        advMode: nextDie === 20 ? (s.advMode || 'normal') : 'normal',
      };
    }));
  };

  const onShiftCount = (idx, delta) => {
    setActiveSlot(idx);
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      return { ...s, count: Math.max(1, Math.min(20, s.count + delta)) };
    }));
  };

  const onSetSlotAdvMode = (idx, modeOrFn) => {
    setActiveSlot(idx);
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      if (Number(s.die) !== 20) return { ...s, advMode: 'normal' };
      const cur = s.advMode || 'normal';
      const nextMode = typeof modeOrFn === 'function' ? modeOrFn(cur) : modeOrFn;
      return { ...s, advMode: nextMode };
    }));
  };

  // Prender (ou soltar) um atributo num dado do cinto: o aviso diz o que mudou e desfaz.
  // Antes a troca era silenciosa e não tinha volta.
  const bindTo = (idx, k) => {
    const before = slots;
    const s = before[idx];
    if (!s) return;
    const off = s.bound === k;
    setSlots(before.map((x, i) => (i === idx ? { ...x, bound: off ? null : k } : x)));
    const die = `${s.count || 1}d${s.die}`;
    const ab = `${beltAbbr(k, lang)} ${Utils.fmtMod(Utils.abilityMod(char, k))}`;
    beltToast?.show({
      ms: 5000,
      text: off
        ? (pt ? `${beltAbbr(k, lang)} solto do dado ${die}.` : `${beltAbbr(k, lang)} released from the ${die} die.`)
        : (pt ? `${ab} preso ao dado ${die} do cinto.` : `${ab} bound to the ${die} belt die.`),
      onAction: () => setSlots(before),
    });
  };
  bindRef.current = bindTo;
  const onBind = (k) => bindTo(activeSlot, k);

  const [beltMulti, setBeltMulti] = useState(null);
  const onRollSlot = (idx) => {
    const s = slots[idx];
    // Padrão: rola todos os hexágonos de dado com o MESMO atributo, em pares 1d20 + 1 dano
    // (2d20 + 2 danos = ataque múltiplo, um par por coluna).
    const group = s.bound ? slots.filter((x) => x.bound === s.bound) : [];
    if (group.length >= 2) {
      const abilMod = Utils.abilityMod(char, s.bound);
      const results = rollBeltPairs(pairBeltSlots(group), { abilMod, profB: effectiveProfB });
      setBeltMulti({ results, abil: beltAbbr(s.bound, lang) });
      return;
    }
    const isBound = !!s.bound;
    const boundMod = isBound ? Utils.abilityMod(char, s.bound) : 0;
    const totalMod = (isBound ? boundMod : 0) + (s.pb ? effectiveProfB : 0);
    const parts = [];
    if (s.bound) parts.push(`${beltAbbr(s.bound, lang)} ${Utils.fmtMod(boundMod)}`);
    if (s.pb) parts.push(`PB ${Utils.fmtMod(effectiveProfB)}`);
    const modText = parts.length ? ` (${parts.join(' + ')})` : '';
    const isD20 = Number(s.die) === 20;
    const advMode = isD20 ? (s.advMode || 'normal') : 'normal';
    const hasStance = isD20 && (advMode === 'adv' || advMode === 'dis');
    const rollCount = hasStance ? 1 : (s.count || 1);
    const advText = advMode === 'adv' ? (pt ? ' (com vantagem)' : ' (with advantage)')
                  : advMode === 'dis' ? (pt ? ' (com desvantagem)' : ' (with disadvantage)')
                  : '';
    roll({
      die: s.die,
      count: rollCount,
      mod: totalMod,
      label: pt
        ? `Cinto, dado ${idx + 1}: ${rollCount}d${s.die}${modText}${advText}`
        : `Belt, die ${idx + 1}: ${rollCount}d${s.die}${modText}${advText}`,
      advMode,
    });
  };

  return (
    <div className="fh-belt" data-fab-pass="">
      {beltMulti && (
        <BeltMultiRoll results={beltMulti.results} lang={lang} onClose={() => setBeltMulti(null)} />
      )}
      {dragLink && typeof document !== 'undefined' && createPortal(
        (() => {
          // Query the live spherical head badge so (cx, cy, r) is 100% physically locked with 0 offset
          const liveBadge = document.querySelector(`.fh-belt-badge[data-ability-badge="${dragLink.ability}"]`);
          const badgeRect = liveBadge?.getBoundingClientRect();
          const startX = badgeRect ? badgeRect.left + badgeRect.width / 2 : dragLink.startX;
          const startY = badgeRect ? badgeRect.top + badgeRect.height / 2 : dragLink.startY;
          const radius = badgeRect ? badgeRect.width / 2 : (dragLink.radius || 17);

          const dx = dragLink.currentX - startX;
          const dy = dragLink.currentY - startY;
          const dist = Math.hypot(dx, dy);
          // Tightly contours the round badge rim seamlessly and gaplessly
          const contourRadius = radius + 0.6;
          const offset = radius + 1.8; // starts cleanly outside the contour stroke
          const x0 = dist > offset ? startX + (dx / dist) * offset : startX;
          const y0 = dist > offset ? startY + (dy / dist) * offset : startY;
          const midX = (x0 + dragLink.currentX) / 2;
          const midY = (y0 + dragLink.currentY) / 2 - 20;

          return (
            <svg className="fh-belt-drag-overlay" aria-hidden="true">
              {/* Luminous Contour Ring tightly hugging the round badge rim gaplessly */}
              <circle
                className={`fh-drag-trail-contour tone-${dragLink.ability}`}
                cx={startX}
                cy={startY}
                r={contourRadius}
              />

              {/* Trailing dashed guide starting strictly outside the contour ring */}
              <path
                className={`fh-drag-trail-path tone-${dragLink.ability}`}
                d={`M ${x0} ${y0} Q ${midX} ${midY} ${dragLink.currentX} ${dragLink.currentY}`}
              />
              <g transform={`translate(${dragLink.currentX}, ${dragLink.currentY})`}>
                <circle className={`fh-drag-beacon-halo tone-${dragLink.ability}`} r="30" />
                <circle className="fh-drag-beacon-core" r="19" />
                <text className="fh-drag-beacon-text" textAnchor="middle" dy="1">
                  {beltAbbr(dragLink.ability, lang)}
                </text>
              </g>
            </svg>
          );
        })(),
        document.body
      )}
      <div className="fh-belt-hive-row is-top">
        {top.map((k) => (
          <BeltHex
            key={k}
            k={k}
            char={char}
            lang={lang}
            roll={roll}
            onBind={onBind}
            onStartDrag={onStartAbilityDrag}
            isBound={slots[activeSlot]?.bound === k}
            isAssigned={slots.some((s) => s.bound === k)}
          />
        ))}
        {/* Cunhas de BP nos vãos FOR|CON e CON|DES: tocar desce um contorno luminoso pelas
            frestas até o hexágono de dado logo abaixo (slot 1 e slot 2), somando o BP nele. */}
        {[1, 2].map((si) => (
          <button
            key={`pb${si}`}
            type="button"
            className={`fh-belt-pb-wedge is-${si === 1 ? 'left' : 'right'}${slots[si]?.pb ? ' is-on' : ''}`}
            aria-pressed={!!slots[si]?.pb}
            aria-label={pt
              ? `Bônus de proficiência +${effectiveProfB} no dado abaixo (${slots[si]?.pb ? 'ligado' : 'desligado'})`
              : `Proficiency bonus +${effectiveProfB} on the die below (${slots[si]?.pb ? 'on' : 'off'})`}
            title={pt ? `Bônus de proficiência (BP) +${effectiveProfB}: soma no dado abaixo` : `Proficiency bonus (PB) +${effectiveProfB}: adds to the die below`}
            onClick={(e) => { e.stopPropagation(); togglePb(si); }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`pbw-face-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" className="pbw-face-a" />
                  <stop offset=".55" className="pbw-face-b" />
                  <stop offset="1" className="pbw-face-c" />
                </linearGradient>
                <radialGradient id={`pbw-sheen-${si}`} cx=".5" cy=".18" r=".55">
                  <stop offset="0" stopColor="#fff" stopOpacity=".38" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* fresta: o vão sombreado em volta da peça */}
              <polygon className="pbw-slit" points="0,0 100,0 50,100" />
              {/* corpo chanfrado (cantos cortados) */}
              <polygon className="pbw-body" fill={`url(#pbw-face-${si})`} points="9,3 91,3 95.5,7.5 53,91 47,91 4.5,7.5" />
              {/* biséis: luz em cima e à esquerda, sombra à direita e no fundo */}
              <polyline className="pbw-bevel-hi" points="4.5,7.5 9,3 91,3 95.5,7.5" />
              <polyline className="pbw-bevel-lo" points="95.5,7.5 53,91 47,91" />
              <polyline className="pbw-bevel-mid" points="47,91 4.5,7.5" />
              <polygon className="pbw-face" fill={`url(#pbw-face-${si})`} points="14,9 86,9 50,79" />
              <polygon points="14,9 86,9 50,79" fill={`url(#pbw-sheen-${si})`} />
            </svg>
            <span>BP</span>
          </button>
        ))}
        {[1, 2].map((si) => slots[si]?.pb && (
          <svg key={`pbs${si}`} className={`fh-belt-pb-slits is-${si === 1 ? 'left' : 'right'}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {/* fio dourado no meio das frestas: em volta da cunha e descendo até o dado */}
            {/* 1) contorna a cunha partindo do meio da aresta de cima até o vértice */}
            <path pathLength="100" d="M 50,0 L 0,0 L 50,100" />
            <path pathLength="100" d="M 50,0 L 100,0 L 50,100" />
          </svg>
        ))}
        {/* 2) desce pela fresta entre os hexágonos de atributo até o vértice do dado */}
        {[1, 2].map((si) => slots[si]?.pb && (
          <span key={`pbd${si}`} className={`fh-belt-pb-drop is-${si === 1 ? 'left' : 'right'}`} aria-hidden="true" />
        ))}
      </div>
      <div className="fh-belt-hive-row is-mid">
        {slots.map((slot, idx) => (
          <BeltQuickSlot
            key={idx}
            slot={slot}
            index={idx}
            isActive={activeSlot === idx}
            isDragTarget={dragLink?.targetSlot === idx}
            onSelect={setActiveSlot}
            onShiftDie={onShiftDie}
            onShiftCount={onShiftCount}
            onSetAdvMode={onSetSlotAdvMode}
            onRoll={onRollSlot}
            char={char}
            lang={lang}
            pbActive={!!slot.pb}
            profB={effectiveProfB}
          />
        ))}
      </div>
      <div className="fh-belt-hive-row is-bottom">
        {bottom.map((k) => (
          <BeltHex
            key={k}
            k={k}
            char={char}
            lang={lang}
            roll={roll}
            onBind={onBind}
            onStartDrag={onStartAbilityDrag}
            isBound={slots[activeSlot]?.bound === k}
            isAssigned={slots.some((s) => s.bound === k)}
          />
        ))}
        {/* Cargas I/II: cunhas nos vãos de baixo (INT|CHA e CHA|SAB). Cada uma troca a
            configuração dos 2 dados daquele lado do cinto. */}
        {['L', 'R'].map((side) => (
          <button
            key={`lo${side}`}
            type="button"
            className={`fh-belt-pb-wedge is-loadout is-${side === 'L' ? 'left' : 'right'}${loadouts[side].active ? ' is-on' : ''}`}
            aria-label={pt
              ? `Carga ${loadouts[side].active ? 'II' : 'I'} dos dados da ${side === 'L' ? 'esquerda' : 'direita'}: toque para trocar`
              : `${side === 'L' ? 'Left' : 'Right'} dice loadout ${loadouts[side].active ? 'II' : 'I'}: tap to swap`}
            onClick={(e) => { e.stopPropagation(); swapLoadout(side); }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`low-face-${side}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" className="pbw-face-a" />
                  <stop offset=".55" className="pbw-face-b" />
                  <stop offset="1" className="pbw-face-c" />
                </linearGradient>
              </defs>
              <polygon className="pbw-body" fill={`url(#low-face-${side})`} points="9,97 91,97 95.5,92.5 53,9 47,9 4.5,92.5" />
              <polyline className="pbw-bevel-mid" points="4.5,92.5 47,9 53,9" />
              <polyline className="pbw-bevel-lo" points="53,9 95.5,92.5 91,97 9,97 4.5,92.5" />
              <polygon className="pbw-face" fill={`url(#low-face-${side})`} points="14,91 86,91 50,21" />
            </svg>
            <span>{loadouts[side].active ? 'II' : 'I'}</span>
          </button>
        ))}
      </div>
      <div className="fh-honey-help">
        <p>
          {pt
            ? <><FhTap lang={lang} /> numa metade do atributo para rolar <b>Teste</b> ou <b>Resistência</b>. <FhTap lang={lang} /> num dado do cinto para rolá-lo.</>
            : <><FhTap lang={lang} /> a half of an ability to roll its <b>Check</b> or <b>Save</b>. <FhTap lang={lang} /> a belt die to roll it.</>}
        </p>
        <details className="fh-honey-more">
          <summary>{pt ? 'Mais gestos' : 'More gestures'}</summary>
          <ul>
            <li>{pt ? <><b>BP</b> (bônus de proficiência): toque na cunha acima de um dado para somar o bônus nele.</> : <><b>PB</b> (proficiency bonus): tap the wedge above a die to add the bonus to it.</>}</li>
            <li>{pt ? <><b>I / II</b>: troca a carga (o par de dados) daquele lado do cinto.</> : <><b>I / II</b>: swaps the loadout (the pair of dice) on that side of the belt.</>}</li>
            <li>{pt ? <><b>d20</b>: arraste a silhueta para cima (vantagem) ou para baixo (desvantagem).</> : <><b>d20</b>: drag the silhouette up (advantage) or down (disadvantage).</>}</li>
            <li>{pt ? 'Dado: deslize para os lados para trocar o dado, para cima ou para baixo para a quantidade.' : 'Die: swipe sideways to change the die, up or down for the count.'}</li>
            <li>{pt ? <>O <b>nome do atributo</b> (a faixa colorida no alto): <FhTap lang={lang} /> para rolar o teste; segure para prendê-lo ao dado ativo do cinto, ou arraste até outro dado.</> : <>The <b>ability name</b> (the coloured band on top): <FhTap lang={lang} /> to roll its check; hold to bind it to the active belt die, or drag it onto another die.</>}</li>
            <li>{pt ? <>A <b>medalha do valor</b> (no meio): <FhTap lang={lang} /> para alternar Normal, Vantagem e Desvantagem na próxima rolagem daquele atributo.</> : <>The <b>score medal</b> (in the middle): <FhTap lang={lang} /> to cycle Normal, Advantage and Disadvantage for that ability's next roll.</>}</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

// Colmeia da aba Jogar: os mesmos hexágonos do cinto (BeltHex) em favo, sem a fileira de
// dados — atributos em cima e embaixo; no meio, encaixados nos vãos, os de ataque
// (corpo a corpo | à distância) e o de ataque mágico, se a ficha conjura.
export const noBind = () => {};
export const actionHexSpecs = (char, lang) => {
  const pt = lang === 'pt';
  const pb = Utils.profBonus(char);
  const half = (ab, mod, label) => {
    const abName = beltAbbr(ab, lang);
    return { ab, cls: `is-ab ab-${ab}`, cap: abName, mod, label,
      aria: `${label} ${Utils.fmtMod(mod)} (${abName} + ${pt ? 'prof.' : 'prof.'})` };
  };
  const out = [{
    key: 'weapon', abbr: pt ? 'ARMA' : 'WEAPON', name: pt ? 'Arma' : 'Weapon', tone: 'weapon', center: '⚔',
    halves: [
      half('str', Utils.abilityMod(char, 'str') + pb, pt ? 'Ataque com arma (FOR)' : 'Weapon attack (STR)'),
      half('dex', Utils.abilityMod(char, 'dex') + pb, pt ? 'Ataque com arma (DES)' : 'Weapon attack (DEX)'),
    ],
  }];
  const ab = Utils.spellcastingAbility(char);
  const sa = Utils.spellAttackBonus(char);
  if (ab && sa != null) {
    out.push({ key: 'spell', abbr: pt ? 'MAGIA' : 'SPELL', name: pt ? 'Magia' : 'Spell', tone: ab, center: '✦',
      halves: [half(ab, sa, pt ? 'Ataque mágico' : 'Spell attack')] });
  }
  return out;
};
export const AbilityHive = ({ char, lang, roll, stance = null, onStance = null, bites = null }) => {
  const actions = actionHexSpecs(char, lang);
  const abil = (k) => <BeltHex key={k} k={k} char={char} lang={lang} roll={roll} onBind={noBind} isBound={false} isAssigned={false} stance={stance} onStance={onStance} bites={bites} />;
  return (
    <div className="fh-belt is-hive-only" data-fab-pass="">
      <div className="fh-belt-hive-row is-top">{['str', 'con', 'dex'].map(abil)}</div>
      <div className={`fh-belt-hive-row is-mid${actions.length % 2 ? ' is-odd' : ''}`}>
        {actions.map(sp => <BeltHex key={sp.key} k={sp.key} spec={sp} char={char} lang={lang} roll={roll} stance={stance} onStance={onStance} bites={bites} />)}
      </div>
      <div className="fh-belt-hive-row is-bottom">{['int', 'cha', 'wis'].map(abil)}</div>
    </div>
  );
};

export const SheetAbilities = ({ char, lang, update, profB, roll, stance = null, onStance = null }) => {
  // "Próximo d20" (Desv. · Normal · Vant.) no título dos painéis que rolam, como na aba Jogar
  const adv3 = stance && onStance ? <FhAdv3 value={stance} onChange={onStance} lang={lang} /> : null;
  const pt = lang === 'pt';
  const [beltMode, setBeltMode] = useState(false);
  const profText = (level) => level === 2 ? (pt ? 'Especialista' : 'Expertise') : level ? (pt ? 'Treinado' : 'Proficient') : (pt ? 'Sem treino' : 'Not proficient');
  // Em campanha (ficha da conta) o servidor trava as proficiências: o losango só informa.
  const locked = !!char.inCampaign && typeof char.id === 'number';
  const lockedTitle = pt ? 'Em campanha o treino só muda pelo mestre ou pela subida de nível' : 'In a campaign, training changes only via the DM or leveling up';

  return (
    <div className={`fh-scope-content fh-scope-abilities${beltMode ? ' is-belt' : ''}`}>
      <section className="fh-panel">
        <FhTitle act={beltMode ? null : adv3} sub={<span><FhTapToRoll lang={lang} /></span>}>{pt ? 'Atributos' : 'Ability Scores'}</FhTitle>
        {/* Selos | Cinto de dados: duas vistas dos mesmos atributos (controle segmentado) */}
        <div className="fh-honey-toggle" role="group" aria-label={pt ? 'Vista dos atributos' : 'Ability view'}>
          <div className="fh-seg">
            <button type="button" className={`fh-seg-b${beltMode ? '' : ' is-on'}`} aria-pressed={!beltMode} onClick={() => setBeltMode(false)}>{pt ? 'Selos' : 'Seals'}</button>
            <button type="button" className={`fh-seg-b${beltMode ? ' is-on' : ''}`} aria-pressed={beltMode} onClick={() => { setBeltMode(true); onStance?.('normal'); }}>{pt ? 'Cinto de dados' : 'Dice belt'}</button>
          </div>
          <span className="fh-seg-sub">
            {beltMode
              ? (pt ? 'Teste e resistência em cada atributo, mais 4 dados de atalho.' : 'Check and save on each ability, plus 4 shortcut dice.')
              : (pt ? 'Um selo por atributo; as resistências ficam no painel Testes de Resistência.' : 'One seal per ability; saves sit in the Saving Throws panel.')}
          </span>
        </div>
        {beltMode
          ? <BeltAbilities char={char} lang={lang} roll={roll} profB={profB} />
          : <AbilitySeals char={char} lang={lang} roll={roll} rollLabel={k => t(k, lang)} />}
      </section>

      {!beltMode && (
        <section className="fh-panel">
          <FhTitle act={adv3} sub={<span><FhTapToRoll lang={lang} /></span>}>{pt ? 'Testes de Resistência' : 'Saving Throws'}</FhTitle>
          <div className="fh-skills" data-fab-pass="" style={{ '--fh-rows': Math.ceil(SRD.ABILITIES.length / 2) }}>
            {SRD.ABILITIES.map(k => {
              const bonus = Utils.saveBonus(char, k);
              const isProf = Utils.hasSaveProf(char, k);
              return (
                <FhSkillRow key={k} lang={lang} name={t(k, lang)} abbr={t(k + 'Sh', lang)} bonus={Utils.fmtMod(bonus)}
                  level={isProf ? 1 : 0} locked={locked}
                  profTitle={locked ? `${profText(isProf ? 1 : 0)}. ${lockedTitle}` : profText(isProf ? 1 : 0)}
                  profLabel={`${t(k, lang)}: ${profText(isProf ? 1 : 0)}`}
                  rollLabel={pt ? `${t(k, lang)}: rolar resistência ${Utils.fmtMod(bonus)}` : `${t(k, lang)}: roll save ${Utils.fmtMod(bonus)}`}
                  onToggle={() => update({ saveProfs: isProf ? (char.saveProfs || []).filter(x => x !== k) : [...(char.saveProfs || []), k] })}
                  onRoll={() => roll({ die: 20, mod: bonus, label: t(k, lang) + ' ' + t('saveRoll', lang), isSave: true })} />
              );
            })}
          </div>
          <FhProfLegend lang={lang} locked={locked} />
        </section>
      )}
    </div>
  );
};
