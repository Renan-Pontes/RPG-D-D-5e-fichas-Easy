import { useState, useRef } from 'react';
import Utils from '../../../utils.js';
import { t } from '../../../data/i18n.js';
import { FhHex } from '../FhChecks.jsx';
import { halfMark } from '../FhStatus.jsx';
import { stop } from '../sheet-shared.jsx';

export const HONEY_DICE = [4, 6, 8, 10, 12, 20, 100];
export const HONEY_ABILITY_META = {
  str: { zone: 'physical', tone: 'strength' },
  dex: { zone: 'physical', tone: 'dexterity' },
  con: { zone: 'physical', tone: 'constitution' },
  int: { zone: 'mental', tone: 'intelligence' },
  wis: { zone: 'mental', tone: 'wisdom' },
  cha: { zone: 'mental', tone: 'charisma' },
};

export const isActionKey = (e) => e.key === 'Enter' || e.key === ' ';
// Sigla do atributo no idioma da ficha (data/i18n.js: FOR/DES/CON/INT/SAB/CAR · STR/DEX/…)
export const beltAbbr = (k, lang) => String(t(k + 'Sh', lang) || k).toUpperCase();


// Tocar (ou clicar) → rola. Antes era "segurar 220 ms e soltar": quem tocava e não via
// rolagem achava que o hexágono estava quebrado. Arrastar (rolar a página) continua
// cancelando; segurar ainda "carrega" a metade (.is-charging-roll), só como retorno visual.
const BELT_HOLD_MS = 220;
const BELT_BIND_HOLD_MS = 340;   // segurar o nome do atributo para prendê-lo a um dado do cinto
export const beltHoldToRoll = (fn) => {
  let t0 = 0; let x0 = 0; let y0 = 0; let moved = false; let timer = null; let el = null; let fired = false;
  const clear = () => { clearTimeout(timer); timer = null; el?.classList.remove('is-charging-roll'); };
  return {
    onPointerDown: (e) => {
      t0 = Date.now(); x0 = e.clientX; y0 = e.clientY; moved = false; el = e.currentTarget;
      el.setPointerCapture?.(e.pointerId);
      timer = setTimeout(() => { el?.classList.add('is-charging-roll'); }, BELT_HOLD_MS);
    },
    onPointerMove: (e) => { if (t0 && Math.hypot(e.clientX - x0, e.clientY - y0) > 12) { moved = true; clear(); } },
    onPointerUp: () => {
      const tapped = !!t0 && !moved;
      t0 = 0; clear(); fired = tapped;
      if (tapped) fn();
    },
    onPointerCancel: () => { t0 = 0; clear(); },
    // No toque, o "click" sintético vem depois do pointerup e cai na tela de rolagem que
    // acabou de abrir, fechando-a na hora. Cancelar o touchend da rolagem evita esse clique.
    onTouchEnd: (e) => { if (fired) { e.preventDefault(); fired = false; } },
    onContextMenu: (e) => e.preventDefault(),
  };
};
// spec (opcional): hexágono de ação com a mesma peça e os mesmos gestos do de atributo —
// { abbr, tone, center, halves: [{ mod, label, cls, aria }] }. Sem spec, é o atributo k.
// stance/onStance (só a colmeia da aba Jogar): a vantagem/desvantagem é a MESMA do seletor
// "Próximo d20" do painel — o botão do meio vira um atalho dele e `roll` (rollD20) é quem
// aplica e devolve para Normal. Sem eles (cinto da aba Atributos), o hexágono guarda a sua.
export const BeltHex = ({ k, char, lang, roll, onBind, isBound, isAssigned, onStartDrag, spec = null, stance = null, onStance = null, bites = null }) => {
  const [ownAdv, setOwnAdv] = useState('normal'); // 'normal' | 'adv' | 'dis'
  const shared = typeof onStance === 'function';
  const advMode = shared ? (stance || 'normal') : ownAdv;
  const setAdvMode = (v) => {
    const next = typeof v === 'function' ? v(advMode) : v;
    if (shared) onStance(next); else setOwnAdv(next);
  };
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const gestureRef = useRef({ startY: 0, moved: false, pointerId: null });
  const hexRef = useRef(null);
  const hoodGestureRef = useRef({ startX: 0, startY: 0, moved: false, timer: null, pointerId: null });
  const hoodFiredRef = useRef(false);   // o toque no capuz rolou: cancela o clique sintético do toque

  const pt = lang === 'pt';
  const isAbility = !spec;
  const score = spec ? spec.center : Utils.abilityWithRace(char, k);
  const checkMod = isAbility ? Utils.abilityMod(char, k) : 0;
  const saveMod = isAbility ? Utils.saveBonus(char, k) : 0;
  const isProf = isAbility && Utils.hasSaveProf(char, k);

  // A vantagem/desvantagem do botão do meio vale para UMA rolagem: depois dela o hexágono
  // volta para Normal (antes ficava armado, só com a cor da borda avisando).
  const onRollHalf = (mod, label, isSave = false, extra = null) => {
    // postura do painel: rollD20 (SheetPlay) lê, aplica e zera — uma regra só para a aba
    if (shared) { roll({ die: 20, mod, label, isSave, ...(extra || {}) }); return; }
    roll({ die: 20, mod, label, advMode, isSave, ...(extra || {}) });
    if (advMode !== 'normal') setAdvMode('normal');
  };

  // Knob ONLY handles stance swiping tap (up = adv, down = dis, tap = normal).
  // It NEVER initiates ability-to-belt drag, ensuring pure stance control.
  const onBadgePointerDown = (e) => {
    e.stopPropagation();
    const pointerId = e.pointerId;
    gestureRef.current = {
      startY: e.clientY,
      moved: false,
      pointerId,
    };
    setIsPulling(true);
    e.currentTarget.setPointerCapture?.(pointerId);
  };

  const getBadgeAnchor = () => {
    const badgeEl = hexRef.current ? hexRef.current.querySelector('.fh-belt-badge') : null;
    if (badgeEl) {
      const rect = badgeEl.getBoundingClientRect();
      return {
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        radius: rect.width / 2,
      };
    }
    const rect = hexRef.current ? hexRef.current.getBoundingClientRect() : null;
    return rect ? {
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height * 0.45,
      radius: 17,
    } : null;
  };

  const onBadgePointerMove = (e) => {
    e.stopPropagation();
    const g = gestureRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;

    if (Math.abs(dy) > 4) {
      g.moved = true;
      setPullY(Math.max(-8, Math.min(8, dy)));
    }
  };

  const onBadgePointerUp = (e) => {
    e.stopPropagation();
    const g = gestureRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;
    const moved = g.moved;

    try { e.currentTarget.releasePointerCapture?.(g.pointerId); } catch (_) {}
    gestureRef.current = { startY: 0, moved: false, pointerId: null };
    setIsPulling(false);
    setPullY(0);

    if (moved) {
      if (dy < -4) {
        setAdvMode('adv');
      } else if (dy > 4) {
        setAdvMode('dis');
      } else {
        setAdvMode('normal');
      }
    } else {
      // Toque/clique no botão: Normal → Vantagem → Desvantagem → Normal (o clique do mouse
      // não desliza; antes ele só alternava vantagem e a desvantagem ficava fora de alcance)
      setAdvMode(m => (m === 'normal' ? 'adv' : m === 'adv' ? 'dis' : 'normal'));
    }
  };

  const onBadgePointerCancel = (e) => {
    e.stopPropagation();
    try { e.currentTarget.releasePointerCapture?.(gestureRef.current.pointerId); } catch (_) {}
    gestureRef.current = { startY: 0, moved: false, pointerId: null };
    setIsPulling(false);
    setPullY(0);
  };

  // Ability score assignment starts tracking user input when user presses and holds
  // "the hood" of the hexad (.fh-belt-header) or drags from it!
  const onHoodPointerDown = (e) => {
    e.stopPropagation();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;

    const target = e.currentTarget;
    const timer = setTimeout(() => {
      // Segurar (>= 340 ms, DESIGN.md 6.2) começa o vínculo do atributo com um dado do cinto:
      // soltar no lugar prende ao dado ativo; arrastar leva a outro dado. Um toque curto ROLA.
      hoodGestureRef.current = { ...hoodGestureRef.current, moved: true, timer: null, pointerId: null };
      try { target.releasePointerCapture?.(pointerId); } catch (_) {}
      if (navigator.vibrate) navigator.vibrate(15);
      onStartDrag?.(k, { clientX: startX, clientY: startY }, getBadgeAnchor());
    }, BELT_BIND_HOLD_MS);

    hoodGestureRef.current = { startX, startY, moved: false, timer, pointerId };
    try { e.currentTarget.setPointerCapture?.(pointerId); } catch (_) {}
  };

  const onHoodPointerMove = (e) => {
    const h = hoodGestureRef.current;
    if (!h.pointerId) return;
    const dist = Math.hypot(e.clientX - h.startX, e.clientY - h.startY);
    if (dist > 10 && onStartDrag) {
      if (h.timer) clearTimeout(h.timer);
      h.moved = true;
      const pid = h.pointerId;
      hoodGestureRef.current = { startX: 0, startY: 0, moved: true, timer: null, pointerId: null };
      try { e.currentTarget.releasePointerCapture?.(pid); } catch (_) {}
      onStartDrag(k, e, getBadgeAnchor());
    }
  };

  const onHoodPointerUp = (e) => {
    const h = hoodGestureRef.current;
    if (h.timer) clearTimeout(h.timer);
    const wasMoved = h.moved;
    const pid = h.pointerId;
    hoodGestureRef.current = { startX: 0, startY: 0, moved: false, timer: null, pointerId: null };
    if (pid) {
      try { e.currentTarget.releasePointerCapture?.(pid); } catch (_) {}
    }
    // Toque curto (sem segurar nem arrastar): rola o teste do atributo, como o mesmo capuz
    // na aba Jogar. Antes o toque trocava em silêncio o atributo do dado ativo do cinto.
    if (!wasMoved && pid) {
      hoodFiredRef.current = true;
      onRollHalf(checkMod, checkLabel, false, { isCheck: true });
    }
  };

  const onHoodPointerCancel = (e) => {
    const h = hoodGestureRef.current;
    if (h.timer) clearTimeout(h.timer);
    if (h.pointerId) {
      try { e.currentTarget.releasePointerCapture?.(h.pointerId); } catch (_) {}
    }
    hoodGestureRef.current = { startX: 0, startY: 0, moved: false, timer: null, pointerId: null };
  };

  const onBadgeKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAdvMode('adv');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAdvMode('dis');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdvMode('normal');
    } else if (isActionKey(e)) {
      e.preventDefault();
      if (e.shiftKey) {
        onBind(k);
      } else {
        setAdvMode((m) => (m === 'normal' ? 'adv' : m === 'adv' ? 'dis' : 'normal'));
      }
    }
  };

  const meta = HONEY_ABILITY_META[k] || { zone: 'physical', tone: 'strength' };
  const abbr = spec ? spec.abbr : beltAbbr(k, lang);
  // nome dito pelo botão do meio: "Força 17" no atributo, "Arma"/"Magia" no hexágono de ação
  const knobName = spec ? (spec.name || spec.abbr) : `${t(k, lang)} ${score}`;
  const stanceMark = advMode === 'adv' ? '▲' : advMode === 'dis' ? '▼' : '';
  const advTxt = advMode === 'adv' ? (pt ? ' (com vantagem)' : ' (with advantage)') : advMode === 'dis' ? (pt ? ' (com desvantagem)' : ' (with disadvantage)') : '';
  // Rótulos da rolagem: "Teste de Força" / "Resistência de Força" (antes "Força Teste de habilidade")
  const checkLabel = isAbility ? (pt ? `Teste de ${t(k, lang)}` : `${t(k, lang)} check`) : '';
  const saveLabel = isAbility ? (pt ? `Resistência de ${t(k, lang)}` : `${t(k, lang)} save`) : '';
  // `cap`: a legenda sob o número diz qual metade é o teste e qual é a resistência (no toque
  // não existe o balão do title); ◆ marca a resistência com proficiência. A legenda é curta ("RES.") porque
  // "◆ RESIST." era cortado pelo hexágono em telas de 360 px; o nome inteiro está no aria-label.
  const halves = spec ? spec.halves : [
    { cls: 'is-check', mod: checkMod, label: checkLabel, isCheck: true, cap: pt ? 'teste' : 'check',
      aria: pt ? `${t(k, lang)}: teste ${Utils.fmtMod(checkMod)}` : `${t(k, lang)}: check ${Utils.fmtMod(checkMod)}` },
    { cls: `is-save${isProf ? ' is-prof' : ''}`, mod: saveMod, isSave: true, label: saveLabel, prof: isProf, cap: pt ? 'res.' : 'save',
      aria: pt ? `${t(k, lang)}: resistência ${Utils.fmtMod(saveMod)}${isProf ? ' (proficiente)' : ''}` : `${t(k, lang)}: save ${Utils.fmtMod(saveMod)}${isProf ? ' (proficient)' : ''}` },
  ];

  const boundStyle = isAssigned ? {
    '--slot-bound-neon': 'var(--slot-bound-neon, #edcb7a)',
    '--slot-bound-glow': 'var(--slot-bound-glow, rgba(237, 203, 122, 0.8))',
  } : undefined;

  return (
    <div
      className={`fh-belt-hex-wrap is-${spec ? 'action' : meta.zone} tone-${spec ? spec.tone : k}${isBound ? ' is-bound' : ''}${isAssigned ? ' is-assigned' : ''} adv-${advMode}`}
      style={boundStyle}
    >
      {/* Glowing Edge Feedback SVG */}
      <svg
        className={`fh-belt-glow-svg adv-${advMode}`}
        viewBox="0 0 100 115.47"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {advMode === 'adv' && (
          <g className="fh-glow-group-adv">
            <path className="fh-edge-shadow-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
            <path className="fh-edge-stroke-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
            <path className="fh-edge-shine-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
          </g>
        )}
        {advMode === 'dis' && (
          <g className="fh-glow-group-dis">
            <path className="fh-edge-shadow-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
            <path className="fh-edge-stroke-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
            <path className="fh-edge-shine-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
          </g>
        )}
      </svg>

      {/* Pointy-topped hexagon attribute tile */}
      <article
        ref={hexRef}
        className="fh-belt-hex"
      >
        {/* Top Header / Hood: Press & hold (>= 110ms) or drag to assign ability to belt slot; tap to toggle bind */}
        {spec ? (
          <div className="fh-belt-header is-static"><span className="fh-honey-abbr">{abbr}</span></div>
        ) : !onStartDrag ? (
          /* Colmeia sem cinto (aba Jogar): o capuz não vincula nada; tocar no nome do
             atributo rola o teste dele, como as metades embaixo. */
          <button
            type="button"
            className="fh-belt-header is-roll"
            onClick={() => onRollHalf(checkMod, checkLabel, false, { isCheck: true })}
            aria-label={pt
              ? `${t(k, lang)}: rolar teste ${Utils.fmtMod(checkMod)}${advTxt}`
              : `${t(k, lang)}: roll check ${Utils.fmtMod(checkMod)}${advTxt}`}
            title={pt ? `${t(k, lang)}: rolar teste ${Utils.fmtMod(checkMod)}` : `${t(k, lang)}: roll check ${Utils.fmtMod(checkMod)}`}
          >
            <span className="fh-honey-abbr">{abbr}</span>
          </button>
        ) : <button
          type="button"
          className="fh-belt-header"
          onPointerDown={onHoodPointerDown}
          onPointerMove={onHoodPointerMove}
          onPointerUp={onHoodPointerUp}
          onPointerCancel={onHoodPointerCancel}
          onTouchEnd={(e) => { if (hoodFiredRef.current) { e.preventDefault(); hoodFiredRef.current = false; } }}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (!isActionKey(e)) return;
            e.preventDefault();
            if (e.shiftKey) onBind?.(k); else onRollHalf(checkMod, checkLabel, false, { isCheck: true });
          }}
          aria-label={pt
            ? `${t(k, lang)}: rolar teste ${Utils.fmtMod(checkMod)}${advTxt}. Segure ou arraste para prender a um dado do cinto`
            : `${t(k, lang)}: roll check ${Utils.fmtMod(checkMod)}${advTxt}. Hold or drag to bind to a belt die`}
          title={pt
            ? `${t(k, lang)}: toque para rolar o teste ${Utils.fmtMod(checkMod)} · segure ou arraste para prender a um dado do cinto`
            : `${t(k, lang)}: tap to roll the check ${Utils.fmtMod(checkMod)} · hold or drag to bind to a belt die`}
        >
          <span className="fh-honey-abbr">{abbr}</span>
        </button>}

        {/* Vertical Slider Track recessed into the hexad face */}
        <div className="fh-belt-badge-track" aria-hidden="true" />

        {/* Repurposed Ability Score Badge: Round slider knob with vertical drag hint */}
        <button
          type="button"
          className={`fh-belt-badge adv-${advMode}${isPulling ? ' is-pulling' : ''}`}
          data-ability-badge={k}
          style={pullY !== 0 ? { transform: `translate(-50%, calc(-50% + ${pullY}px))` } : undefined}
          onPointerDown={onBadgePointerDown}
          onPointerMove={onBadgePointerMove}
          onPointerUp={onBadgePointerUp}
          onPointerCancel={onBadgePointerCancel}
          onKeyDown={onBadgeKeyDown}
          tabIndex={0}
          role="slider"
          aria-valuenow={advMode === 'adv' ? 1 : advMode === 'dis' ? -1 : 0}
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuetext={advMode === 'adv' ? (pt ? 'Vantagem' : 'Advantage') : advMode === 'dis' ? (pt ? 'Desvantagem' : 'Disadvantage') : 'Normal'}
          aria-label={pt
            ? `${knobName}. Próximo d20: toque para alternar Normal, Vantagem, Desvantagem (ou deslize para cima ou para baixo)`
            : `${knobName}. Next d20: tap to cycle Normal, Advantage, Disadvantage (or swipe up or down)`}
          title={pt
            ? `${knobName} · Próximo d20: toque para alternar Normal → Vantagem → Desvantagem`
            : `${knobName} · Next d20: tap to cycle Normal → Advantage → Disadvantage`}
        >
          <span className="fh-badge-arrow is-up" aria-hidden="true">▲</span>
          <span className="fh-honey-score">{score}</span>
          <span className="fh-badge-arrow is-down" aria-hidden="true">▼</span>
        </button>

        <div className={`fh-honey-halves${halves.length === 1 ? ' is-single' : ''}`}>
          {halves.map((hf, i) => {
            // marca de estado ativo (src/sheet/FhStatus.jsx): ▼ desvantagem, ✕ falha automática. Só aviso.
            const bite = bites ? halfMark(bites, { ability: k, isCheck: !!hf.isCheck, isSave: !!hf.isSave, isAttack: !!spec }, lang) : null;
            return (
            <button
              key={i}
              type="button"
              className={`fh-honey-half ${hf.cls}`}
              {...beltHoldToRoll(() => onRollHalf(hf.mod, hf.label, !!hf.isSave, hf.isCheck ? { isCheck: true } : spec ? { isAttack: true } : null))}
              onKeyDown={(e) => {
                if (!isActionKey(e)) return;
                e.preventDefault();
                onRollHalf(hf.mod, hf.label, !!hf.isSave, hf.isCheck ? { isCheck: true } : spec ? { isAttack: true } : null);
              }}
              aria-label={`${hf.aria}${advTxt}${bite ? `. ${bite.aria}` : ''}`}
              title={bite ? `${hf.aria} · ${bite.aria}` : hf.aria}
            >
              <span className="fh-honey-val">{Utils.fmtMod(hf.mod)}{stanceMark && <span className={`fh-honey-stance is-${advMode}`} aria-hidden="true">{stanceMark}</span>}</span>
              {/* a marca vai na legenda, nunca em cima do número */}
              {(hf.cap || bite) && <span className={`fh-honey-cap${bite ? ` has-bite is-${bite.kind}` : ''}`}>{bite && <span className="fh-half-bite" aria-hidden="true">{bite.glyph}</span>}{hf.prof && <span className="fh-honey-prof" aria-hidden="true">◆ </span>}{hf.cap}</span>}
            </button>
            );
          })}
        </div>
      </article>
    </div>
  );
};

export const renderDieShape = (die) => {
  switch (Number(die)) {
    case 4:
      return (
        <g className="fh-die-shape is-d4">
          {/* Equilateral triangle with centroid at (50, 50) */}
          <polygon points="50,10 88,70 12,70" className="fh-die-poly-base" />
          <polygon points="50,26 72,62 28,62" className="fh-die-crease-facet" />
          <line x1="50" y1="10" x2="50" y2="26" className="fh-die-crease" />
          <line x1="88" y1="70" x2="72" y2="62" className="fh-die-crease" />
          <line x1="12" y1="70" x2="28" y2="62" className="fh-die-crease" />
        </g>
      );
    case 6:
      return (
        <g className="fh-die-shape is-d6">
          {/* Regular hexagon centered at (50, 50) */}
          <polygon points="50,8 86.4,29 86.4,71 50,92 13.6,71 13.6,29" className="fh-die-poly-base" />
          <polygon points="50,24 72.5,37 72.5,63 50,76 27.5,63 27.5,37" className="fh-die-crease-facet" />
          <line x1="50" y1="8" x2="50" y2="24" className="fh-die-crease" />
          <line x1="86.4" y1="29" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="86.4" y1="71" x2="72.5" y2="63" className="fh-die-crease" />
          <line x1="50" y1="92" x2="50" y2="76" className="fh-die-crease" />
          <line x1="13.6" y1="71" x2="27.5" y2="63" className="fh-die-crease" />
          <line x1="13.6" y1="29" x2="27.5" y2="37" className="fh-die-crease" />
        </g>
      );
    case 8:
      return (
        <g className="fh-die-shape is-d8">
          {/* Symmetrical diamond centered at (50, 50) */}
          <polygon points="50,6 94,50 50,94 6,50" className="fh-die-poly-base" />
          <polygon points="50,24 76,50 50,76 24,50" className="fh-die-crease-facet" />
          <line x1="50" y1="6" x2="50" y2="24" className="fh-die-crease" />
          <line x1="94" y1="50" x2="76" y2="50" className="fh-die-crease" />
          <line x1="50" y1="94" x2="50" y2="76" className="fh-die-crease" />
          <line x1="6" y1="50" x2="24" y2="50" className="fh-die-crease" />
        </g>
      );
    case 10:
    case 100:
      return (
        <g className="fh-die-shape is-d10">
          {/* Pentagonal Trapezohedron centered at (50, 50) */}
          <polygon points="50,6 92,34 74,82 50,94 26,82 8,34" className="fh-die-poly-base" />
          <polygon points="50,22 76,38 64,72 50,78 36,72 24,38" className="fh-die-crease-facet" />
          <line x1="50" y1="6" x2="50" y2="22" className="fh-die-crease" />
          <line x1="92" y1="34" x2="76" y2="38" className="fh-die-crease" />
          <line x1="74" y1="82" x2="64" y2="72" className="fh-die-crease" />
          <line x1="50" y1="94" x2="50" y2="78" className="fh-die-crease" />
          <line x1="26" y1="82" x2="36" y2="72" className="fh-die-crease" />
          <line x1="8" y1="34" x2="24" y2="38" className="fh-die-crease" />
        </g>
      );
    case 12:
      return (
        <g className="fh-die-shape is-d12">
          {/* Regular pentagon centered at (50, 50) */}
          <polygon points="50,8 90,37 74.7,84 25.3,84 10,37" className="fh-die-poly-base" />
          <polygon points="50,24 74.7,42 65.3,71 34.7,71 25.3,42" className="fh-die-crease-facet" />
          <line x1="50" y1="8" x2="50" y2="24" className="fh-die-crease" />
          <line x1="90" y1="37" x2="74.7" y2="42" className="fh-die-crease" />
          <line x1="74.7" y1="84" x2="65.3" y2="71" className="fh-die-crease" />
          <line x1="25.3" y1="84" x2="34.7" y2="71" className="fh-die-crease" />
          <line x1="10" y1="37" x2="25.3" y2="42" className="fh-die-crease" />
        </g>
      );
    case 20:
    default:
      return (
        <g className="fh-die-shape is-d20">
          {/* Regular hexagon outer silhouette centered at (50, 50) */}
          <polygon points="50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28" className="fh-die-poly-base" />
          {/* Central triangular face with centroid at (50, 50) */}
          <polygon points="27.5,37 72.5,37 50,76" className="fh-die-crease-facet" />
          <line x1="50" y1="6" x2="27.5" y2="37" className="fh-die-crease" />
          <line x1="50" y1="6" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="88.1" y1="28" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="88.1" y1="72" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="88.1" y1="72" x2="50" y2="76" className="fh-die-crease" />
          <line x1="50" y1="94" x2="50" y2="76" className="fh-die-crease" />
          <line x1="11.9" y1="72" x2="50" y2="76" className="fh-die-crease" />
          <line x1="11.9" y1="72" x2="27.5" y2="37" className="fh-die-crease" />
          <line x1="11.9" y1="28" x2="27.5" y2="37" className="fh-die-crease" />
        </g>
      );
  }
};
