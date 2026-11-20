/* Estados que mudam a aparência da ficha (visual "Ficha Forjada"; estilos em
 * ./condition-fx.css, regras em ./condition-rules.js). Só design: nada muda número,
 * rolagem nem deslocamento. Tudo vem do que a ficha já grava: char.conditions,
 * exaustão, PV/testes contra a morte, PV temporários, Inspiração e Forma Selvagem.
 *
 * Linguagem (uma cor + um símbolo por família, sempre com o nome escrito):
 * - condClasses: classes da raiz .ficha (c-<condição>, is-down/is-dying/is-dead/is-stable,
 *   is-bloodied/is-near, is-wild, exh-N, pf-<estado que manda no retrato>). O CSS usa só
 *   para folhas (a <img> do retrato, o nome em folha de ouro) e para as camadas abaixo.
 * - FhConditionArt: retrato. No máximo DUAS camadas (os dois estados mais graves), o filtro
 *   da imagem é só o do primeiro; os demais viram selos pequenos ao lado da placa com o
 *   nome do estado que manda. Dentro de .fh-hero-art (aria-hidden, sem toque).
 * - FhConditionFx: bordas da tela. UMA cor só (a do estado que manda), em duas tiras fixas
 *   estreitas; os demais viram selos no topo da tira (desktop).
 * - FhVitalFx: no painel Vitalidade (onde o jogador olha no celular), moldura dupla na cor da
 *   família + FRISO com o motivo dela (elos, gelo, gotas, espinhos, estrelas…) nas bordas de
 *   cima e de baixo + o brasão do estado no topo, e o clarão de "aplicou"/"limpou".
 * - FhStatusStrip: faixa fixa sob as abas (celular/tablet) com os estados ativos; só existe
 *   quando algum deles tem aonde levar (stripList).
 * - FhHeartMark: selo do estado que manda no canto do coração de PV; rachadura a 0 PV; anel
 *   azul no momento em que chegam PV temporários.
 * - FhInspBurst: clarão dourado atrás do selo de Inspiração no momento em que ela chega.
 *
 * Restrições: os modais da ficha não são portais, então NADA de filter/transform/z-index em
 * contêiner com conteúdo interativo. Tudo aqui é folha ou camada irmã aria-hidden e
 * pointer-events: none; as animações mexem só em opacity/transform, têm número finito de
 * ciclos (nada fica pulsando com a ficha parada na mesa) e somem com prefers-reduced-motion. */
import { useEffect, useRef, useState } from 'react';
import { conditionIcon } from '../art.js';
import { FAMILY, hpFlags, statusList, statusLabel, stripList, artStack, condClasses } from './condition-rules.js';
import './condition-fx.css';

// ── Entrou / saiu: quem acabou de entrar ganha .is-fresh (o momento de aplicar) e quem saiu
//    fica montado mais um instante com .is-leaving (o momento de remover). Nada dispara ao
//    abrir a ficha nem ao trocar de ficha. ──
export function useStatusDiff(keys, resetKey, { leaveMs = 460, freshMs = 1500 } = {}) {
  const prev = useRef(null);
  const timers = useRef(new Set());
  const [st, setSt] = useState({ fresh: [], leaving: [], beat: 0, last: '' });
  const sig = keys.join('|');
  useEffect(() => {
    const p = prev.current;
    prev.current = { keys, resetKey };
    if (!p || p.resetKey !== resetKey) { setSt(s => (s.fresh.length || s.leaving.length ? { ...s, fresh: [], leaving: [] } : s)); return; }
    const added = keys.filter(k => !p.keys.includes(k));
    const removed = p.keys.filter(k => !keys.includes(k));
    if (!added.length && !removed.length) return;
    setSt(s => ({
      fresh: [...new Set([...s.fresh.filter(k => keys.includes(k)), ...added])],
      leaving: [...new Set([...s.leaving.filter(k => !keys.includes(k)), ...removed])],
      beat: s.beat + 1,
      last: added.length ? 'on' : 'off',
    }));
    const later = (fn, ms) => { const id = setTimeout(() => { timers.current.delete(id); fn(); }, ms); timers.current.add(id); };
    if (removed.length) later(() => setSt(s => ({ ...s, leaving: s.leaving.filter(k => !removed.includes(k)) })), leaveMs);
    if (added.length) later(() => setSt(s => ({ ...s, fresh: s.fresh.filter(k => !added.includes(k)) })), freshMs);
  }, [sig, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { for (const id of timers.current) clearTimeout(id); }, []);
  return st;
}

/** true por `ms` logo depois que `flag` passa de falso para verdadeiro (não ao abrir a ficha). */
export function useGainMoment(flag, resetKey, ms = 1000) {
  const prev = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const p = prev.current;
    prev.current = { flag, resetKey };
    if (!p || p.resetKey !== resetKey || p.flag || !flag) return undefined;
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [flag, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return on && !!flag;
}

// ── Símbolos em traço (24×24, currentColor): um por estado, no mesmo desenho do dado da morte ──
const G = {
  dead: <><path d="M12 3a7.5 7.5 0 0 0-4.5 13.5V19h9v-2.5A7.5 7.5 0 0 0 12 3z" /><path d="M9 11.5h.01M15 11.5h.01M10 19v2M14 19v2" /></>,
  dying: <><path d="M12 20.5C5.5 15.6 3.5 12 3.5 8.6A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 8.5 2.3c0 3.4-2 7-8.500 11.900z" /><path d="M12.8 6.8 10.6 10.4l2.9 1.9-1.9 3.4" /></>,
  stable: <><path d="M12 20.5C5.5 15.6 3.5 12 3.5 8.6A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 8.5 2.3c0 3.4-2 7-8.500 11.900z" /><path d="M12 9.200v5.600M9.200 12h5.600" /></>,
  bloodied: <path d="M12 3c3 4.600 6 7.700 6 11.200a6 6 0 0 1-12 0C6 10.700 9 7.600 12 3z" />,
  near: <><path d="M12 3c3 4.600 6 7.700 6 11.200a6 6 0 0 1-12 0C6 10.700 9 7.600 12 3z" /><path d="M12 10.500v4M12 17h.01" /></>,
  poisoned: <><path d="M9 3h6M10 3v5.200L5.700 16.500A3 3 0 0 0 8.300 21h7.400a3 3 0 0 0 2.600-4.500L14 8.200V3" /><path d="M7.800 14.500h8.400M10.500 17.500h.01M13.500 16.500h.01" /></>,
  frightened: <><path d="M2 12c3-5 6.500-7.200 10-7.200S19 7 22 12c-3 5-6.500 7.200-10 7.200S5 17 2 12z" /><path d="M12 8.300v7.400" /></>,
  charmed: <><path d="M12 20.500C5.500 15.600 3.500 12 3.500 8.600A4.600 4.600 0 0 1 12 6.300a4.600 4.600 0 0 1 8.500 2.300c0 3.400-2 7-8.500 11.900z" /><path d="M9 10.500a3 3 0 0 1 3-2" /></>,
  stunned: <><path d="M12 2.500l2.300 6.300 6.700.3-5.300 4.100 1.900 6.400L12 15.900l-5.600 3.700 1.900-6.400L3 9.100l6.700-.3z" /></>,
  paralyzed: <path d="M12 2v20M3.300 7l17.400 10M20.700 7 3.300 17M9.500 3.800 12 6l2.500-2.200M9.500 20.200 12 18l2.500 2.200M3.700 11l3.200-.9-.8-3.200M20.300 13l-3.200.9.8 3.200M17.900 6.900l-.8 3.200 3.200.9M6.100 17.100l.8-3.200-3.200-.9" />,
  petrified: <><path d="M4.500 15.500 7.500 7l6-3 6 4 1 8-5 4.500H8z" /><path d="M7.500 7l4 6.500 8-5.500M11.500 13.500 8 20.500M11.500 13.500l4 7" /></>,
  restrained: <><path d="M10 13.500a4.500 4.500 0 0 0 6.700.4l3-3a4.600 4.600 0 0 0-6.500-6.500l-1.600 1.600" /><path d="M14 10.500a4.500 4.500 0 0 0-6.700-.4l-3 3a4.600 4.600 0 0 0 6.500 6.500l1.600-1.600" /></>,
  grappled: <path d="M7.500 11.500V6.200a1.500 1.500 0 0 1 3 0V10.500M10.500 5a1.500 1.500 0 0 1 3 0v5.500M13.500 6a1.500 1.500 0 0 1 3 0v5M16.500 8.500a1.500 1.500 0 0 1 3 0V14a7 7 0 0 1-7 7h-.8a6 6 0 0 1-5-2.700L4.200 14.600a1.500 1.500 0 0 1 2.500-1.700l.8 1.100" />,
  incapacitated: <><path d="M6 11h12v9.500H6z" /><path d="M8.500 11V8a3.500 3.500 0 0 1 7 0v3M12 14.500v2.500" /></>,
  blinded: <><path d="M2 12c3-5 6.500-7.200 10-7.200S19 7 22 12c-3 5-6.500 7.200-10 7.200S5 17 2 12z" /><path d="M12 9a3 3 0 1 0 .01 0M4 4l16 16" /></>,
  deafened: <><path d="M7 9.500a5 5 0 0 1 10 0c0 3-3 4.200-3 7a3 3 0 0 1-5.600 1.500" /><path d="M10 9.500a2 2 0 0 1 4 0M4 4l16 16" /></>,
  prone: <><path d="M3 18.500h18M5 15.500h9l4-3.200" /><path d="M19.800 9.500a1.700 1.700 0 1 1-.01 0z" /></>,
  unconscious: <path d="M4.500 6h6.500l-6.500 7.500H11M13.500 12h5.500l-5.500 6.500H19" />,
  invisible: <><path d="M6 20.500V10a6 6 0 0 1 12 0v10.500l-2.500-2-2 2-1.500-2-1.500 2-2-2z" strokeDasharray="2.500 2" /><path d="M9.800 10.500h.01M14.200 10.500h.01" /></>,
  exhausted: <path d="M7 3h10M7 21h10M8 3c0 4.500 8 5.500 8 9s-8 4.500-8 9M16 3c0 4.500-8 5.500-8 9s8 4.500 8 9" />,
  custom: <path d="M12 3l1.900 7.100L21 12l-7.100 1.900L12 21l-1.900-7.100L3 12l7.100-1.900z" />,
  wild: <><path d="M12 12.800c-3 0-5.200 2.300-5.200 4.500 0 1.600 1.300 2.300 2.700 2.300 1 0 1.700-.5 2.500-.5s1.500.5 2.500.5c1.400 0 2.700-.7 2.700-2.300 0-2.200-2.200-4.500-5.200-4.500z" /><ellipse cx="6" cy="10.500" rx="1.600" ry="2.100" /><ellipse cx="10" cy="6.500" rx="1.600" ry="2.100" /><ellipse cx="14" cy="6.500" rx="1.600" ry="2.100" /><ellipse cx="18" cy="10.500" rx="1.600" ry="2.100" /></>,
  inspired: <path d="M12 2.500l2.900 6 6.600.9-4.800 4.600 1.200 6.500L12 17.400l-5.900 3.100 1.200-6.500L2.500 9.400l6.600-.9z" />,
  temp: <path d="M12 3 4.500 6v5.500c0 4.600 3.100 8 7.500 9.500 4.400-1.500 7.500-4.900 7.500-9.500V6z" />,
};
const GLYPH_OF = { 'c-exhausted': 'exhausted' };
/** Símbolo em traço de um estado (chave de statusList/artStack ou id de condição). */
export function FhStatusGlyph({ k, size = 18, className = '' }) {
  const key = GLYPH_OF[k] || String(k).replace(/^c-/, '').replace(/^t-.*/, 'custom');
  return (
    <svg className={`fh-sglyph${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {G[key] || G.custom}
    </svg>
  );
}
/** Ícone de um item de statusList: a arte pintada da condição quando existe, senão o traço. */
export function FhStatusIcon({ s, size = 22 }) {
  const src = s.kind === 'cond' ? conditionIcon(s.id) : null;
  if (src) return <img className="fh-sicon" src={src} alt="" width={size} height={size} loading="lazy" decoding="async" aria-hidden="true" />;
  return <span className="fh-sicon is-glyph" style={{ width: size, height: size }} aria-hidden="true"><FhStatusGlyph k={s.kind === 'cond' ? s.id : s.kind === 'temp' ? 'custom' : s.key} size={Math.round(size * 0.68)} /></span>;
}

// ── Bordas da tela ──
// Só estes estados pintam a borda; com vários ativos, vale o primeiro de artStack.
const EDGE = {
  dying: 'dying', petrified: 'stone', paralyzed: 'cold', stunned: 'stun', restrained: 'bound', grappled: 'bound',
  frightened: 'fear', poisoned: 'toxic', charmed: 'mind', invisible: 'boon', wild: 'wild', near: 'blood',
};
export function FhConditionFx({ char }) {
  const stack = artStack(char || {});
  const top = stack.find(k => EDGE[k]) || '';
  const diff = useStatusDiff(top ? [top] : [], char?.id);
  const rest = statusList(char || {}).filter(s => s.kind === 'cond' && s.id !== top).slice(0, 6);
  const bands = [
    ...(top ? [{ k: top, cls: diff.fresh.includes(top) ? ' is-fresh' : '' }] : []),
    ...diff.leaving.filter(k => k !== top).map(k => ({ k, cls: ' is-leaving' })),
  ];
  return bands.map(({ k, cls }) => (
    <div key={k} className={`fh-cfx fh-cfx-${k}${cls}`} data-fam={EDGE[k]} aria-hidden="true">
      <span className="fh-cfx-band is-l" />
      <span className="fh-cfx-band is-r" />
      {k === top && rest.length > 0 && (
        <span className="fh-cfx-ticks">
          {rest.map(s => <span key={s.key} className="fh-cfx-tick" data-fam={s.fam}><FhStatusIcon s={s} size={20} /></span>)}
        </span>
      )}
    </div>
  ));
}

// ── Retrato ──
const CHAINS = ['M-10 60 L410 250', 'M-10 240 L410 40', 'M80 -10 L330 310'];
const PLATES = [[4, 62], [396, 244], [4, 236], [396, 46], [86, 4], [326, 296]];
const Chain = ({ d, i }) => (
  <g className={`fh-chain is-${i}`}>
    <path className="fh-chain-back" d={d} />
    <path className="fh-chain-ring" d={d} />
    <path className="fh-chain-hole" d={d} />
    <path className="fh-chain-side" d={d} />
    <path className="fh-chain-shine" d={d} />
  </g>
);
// Manopla forjada (220×170): quatro dedos de placas com ponta em garra, costas da mão e braçal
// entrando pela borda direita. [contorno do dedo, x das duas juntas]
const FINGERS = [
  ['M116 32 H58 Q42 33 30 46 Q44 57 58 57 H116 Z', 62, 88],
  ['M116 59 H46 Q30 60 18 72 Q32 84 46 84 H116 Z', 50, 80],
  ['M116 86 H54 Q38 87 27 98 Q40 109 54 110 H116 Z', 58, 86],
  ['M116 112 H70 Q56 113 46 122 Q58 132 70 133 H116 Z', 74, 96],
];
const STUN_STARS = [[12, 20, 28, -18], [76, 8, 24, 24], [160, 11, 28, -8], [190, 31, 32, 14], [52, 43, 32, -30]];
const CRACKS = [
  'M300 -4 L288 40 L306 78 L280 124 L292 170 L262 214', 'M288 40 L250 58 L232 50', 'M306 78 L350 96 L372 140',
  'M280 124 L236 142 L214 190', 'M292 170 L330 200',
  'M120 304 L134 262 L112 224 L140 184 L128 150', 'M134 262 L176 246 L196 256', 'M112 224 L70 208 L52 168', 'M140 184 L182 170',
];
const FLAKES = ['M400 56 L382 62 L390 80 L400 78 Z', 'M328 0 L338 14 L356 8 L352 0 Z', 'M0 208 L14 216 L8 236 L0 232 Z', 'M148 300 L158 284 L176 290 L172 300 Z', 'M400 222 L386 230 L392 246 L400 244 Z'];
const CLAWS = ['M66 6 Q52 78 18 150 Q42 78 66 6 Z', 'M92 2 Q78 80 42 158 Q66 80 92 2 Z', 'M116 8 Q104 78 72 148 Q92 78 116 8 Z'];
const SHARDS = [
  'M0 0 L120 0 L74 26 L96 58 L44 44 L0 96 Z', 'M0 0 L60 0 L22 64 Z',
  'M400 0 L290 0 L330 30 L306 66 L356 46 L400 104 Z', 'M400 0 L346 0 L378 60 Z',
  'M0 300 L104 300 L66 268 L92 240 L40 256 L0 204 Z', 'M0 300 L52 300 L20 246 Z',
  'M400 300 L282 300 L328 272 L300 236 L360 252 L400 196 Z', 'M400 300 L350 300 L380 244 Z',
];

function ArtLayer({ kind, cls, char, lang }) {
  const c = `fh-cart fh-cart-${kind}${cls}`;
  switch (kind) {
    case 'dead':
      return (
        <span className={c}>
          <span className="fh-cseal"><span className="fh-cseal-in"><FhStatusGlyph k="dead" size={34} /></span></span>
        </span>
      );
    case 'paralyzed':
      return (
        <span className={c}>
          <svg className="fh-cart-svg" viewBox="0 0 400 300" preserveAspectRatio="none" focusable="false">
            {SHARDS.map((d, i) => <path key={i} className={`fh-shard is-${i >> 1}`} d={d} vectorEffect="non-scaling-stroke" />)}
          </svg>
        </span>
      );
    case 'stunned':
      return (
        <span className={c}>
          {/* anel acima da cabeça (nunca sobre os olhos) e cinco estrelas forjadas pousadas nele */}
          <span className="fh-stun">
            <span className="fh-stun-ring" />
            {STUN_STARS.map(([x, y, size, rot], i) => (
              <span key={i} className={`fh-stun-star is-${i}`} style={{ left: x, top: y, width: size, height: size, margin: -size / 2 }}>
                <span className="fh-stun-spin" style={{ transform: `rotate(${rot}deg)` }}><FhStatusGlyph k="stunned" size={size} /></span>
              </span>
            ))}
          </span>
        </span>
      );
    case 'petrified':
      return (
        <span className={c}>
          <svg className="fh-cart-svg" viewBox="0 0 400 300" preserveAspectRatio="none" focusable="false">
            {/* rachadura = traço escuro largo + fio claro por cima: aparece também sobre a parte escura do retrato */}
            {CRACKS.map(d => <path key={`u${d}`} className="fh-crack is-under" vectorEffect="non-scaling-stroke" d={d} />)}
            {CRACKS.map(d => <path key={`o${d}`} className="fh-crack is-over" vectorEffect="non-scaling-stroke" d={d} />)}
            {FLAKES.map(d => <path key={d} className="fh-flake" vectorEffect="non-scaling-stroke" d={d} />)}
          </svg>
        </span>
      );
    case 'restrained':
      return (
        <span className={c}>
          <svg className="fh-cart-svg" viewBox="0 0 400 300" preserveAspectRatio="none" focusable="false">
            {CHAINS.map((d, i) => <Chain key={d} d={d} i={i} />)}
            {PLATES.map(([x, y], i) => <g key={i} className="fh-chain-plate"><rect x={x - 9} y={y - 12} width="18" height="24" rx="2" /><circle cx={x} cy={y - 6} r="1.800" /><circle cx={x} cy={y + 6} r="1.800" /></g>)}
          </svg>
        </span>
      );
    case 'grappled':
      return (
        <span className={c}>
          {/* sombra de contato no retrato + manopla de placas cheias (ferro escuro, filete de bronze, rebites) */}
          <span className="fh-grip-shadow" />
          <svg className="fh-grip" viewBox="0 0 220 170" focusable="false">
            <defs>
              <linearGradient id="fh-grip-iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#56463a" /><stop offset=".45" stopColor="#3a2e24" /><stop offset="1" stopColor="#17110d" /></linearGradient>
              <linearGradient id="fh-grip-cuff" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a3c30" /><stop offset="1" stopColor="#140f0b" /></linearGradient>
            </defs>
            {/* polegar por baixo, fechando */}
            <path className="fh-grip-plate" d="M132 128 Q104 152 78 154 Q62 154 58 144 Q74 132 100 126 Z" />
            {FINGERS.map(([d, j1, j2], i) => (
              <g key={i}>
                <path className="fh-grip-plate" d={d} />
                <path className="fh-grip-joint" d={`M${j1} ${34 + i * 27} v${i === 3 ? 19 : 23} M${j2} ${33 + i * 27} v${i === 3 ? 21 : 24}`} />
                <path className="fh-grip-hi" d={`M${j1 + 4} ${35.5 + i * 27} H110`} />
              </g>
            ))}
            {/* costas da mão e braçal */}
            <path className="fh-grip-plate" d="M110 26 Q150 20 170 38 L170 136 Q142 148 110 140 Z" />
            <path className="fh-grip-cuffp" d="M164 30 L226 16 L226 158 L164 142 Z" />
            <path className="fh-grip-joint" d="M178 28 V146 M206 21 V153" />
            <path className="fh-grip-hi" d="M114 30 Q148 25 166 40" />
            {[45, 72, 99, 124].map(y => <circle key={y} className="fh-grip-rivet" cx="122" cy={y} r="3.4" />)}
            {[44, 88, 132].map(y => <circle key={y} className="fh-grip-rivet" cx="192" cy={y} r="2.6" />)}
          </svg>
        </span>
      );
    case 'blinded':
      return (
        <span className={c}>
          {/* venda de pano na altura do rosto, com o nó e as duas pontas soltas */}
          <span className="fh-blindfold">
            <svg className="fh-blind-knot" viewBox="0 0 70 96" focusable="false">
              <path className="fh-blind-tail" d="M24 30 Q32 56 18 92 L34 86 Q46 58 36 30 Z" />
              <path className="fh-blind-tail" d="M34 28 Q54 46 56 80 L68 68 Q62 42 42 24 Z" />
              <path className="fh-blind-node" d="M10 10 Q24 2 38 10 Q43 22 38 34 Q24 42 10 34 Q5 22 10 10 Z" />
              <path className="fh-blind-fold" d="M14 14 Q24 22 14 30 M34 14 Q26 22 34 30" />
            </svg>
          </span>
        </span>
      );
    case 'deafened':
      return (
        <span className={c}>
          {/* dois anéis de som abafado de cada lado da cabeça, que se fecham sobre ela, e um risco */}
          <svg className="fh-deaf" viewBox="0 0 240 120" focusable="false">
            <g className="fh-deaf-side is-l"><path className="fh-deaf-arc is-0" d="M72 34 A30 30 0 0 0 72 86" /><path className="fh-deaf-arc is-1" d="M54 20 A46 46 0 0 0 54 100" /></g>
            <g className="fh-deaf-side is-r"><path className="fh-deaf-arc is-0" d="M168 34 A30 30 0 0 1 168 86" /><path className="fh-deaf-arc is-1" d="M186 20 A46 46 0 0 1 186 100" /></g>
            <path className="fh-deaf-slash" d="M158 104 L206 16" />
          </svg>
        </span>
      );
    case 'poisoned':
      return <span className={c}>{[0, 1, 2, 3, 4].map(i => <span key={i} className={`fh-bubble is-${i}`} />)}</span>;
    case 'charmed':
      return <span className={c}>{[0, 1, 2].map(i => <span key={i} className={`fh-heartlet is-${i}`}><FhStatusGlyph k="charmed" size={i === 1 ? 22 : 16} /></span>)}</span>;
    case 'unconscious':
      return <span className={c}><span className="fh-zz">Z<small>z</small><small>z</small></span></span>;
    case 'invisible':
      // a figura fica vazada em tiras (máscara na <img>, no CSS); aqui o brilho que passa e dois lampejos arcanos
      return (
        <span className={c}>
          <span className="fh-ghost-shimmer" />
          {[0, 1].map(i => <span key={i} className={`fh-glint is-${i}`}><FhStatusGlyph k="custom" size={i ? 18 : 24} /></span>)}
        </span>
      );
    case 'prone':
      // o chão sobe, com a linha do horizonte, duas nuvens de poeira (só ao cair) e, no celular, o símbolo
      return (
        <span className={c}>
          <span className="fh-dust is-0" /><span className="fh-dust is-1" />
          <span className="fh-prone-g"><FhStatusGlyph k="prone" size={24} /></span>
        </span>
      );
    case 'bloodied':
    case 'near':
      return (
        <span className={c}>
          <svg className="fh-scratch" viewBox="0 0 120 120" focusable="false">
            <path d="M18 8 C40 40 58 70 66 112" /><path d="M44 4 C62 36 80 64 92 104" />{kind === 'near' && <path d="M70 6 C84 32 100 54 112 86" />}
          </svg>
        </span>
      );
    case 'wild':
      return (
        <span className={c}>
          {/* três rasgos de garra: lentes afiladas (cheias, pontas finas), com a borda de baixo escura */}
          <svg className="fh-claws" viewBox="0 0 120 160" focusable="false">
            {CLAWS.map((d, i) => <g key={d} className={`fh-claw is-${i}`}><path className="is-under" d={d} transform="translate(2 2)" /><path className="is-cut" d={d} /></g>)}
          </svg>
        </span>
      );
    // dying, stable, frightened, incapacitated, exhausted: a camada é só CSS (vinheta, hachura)
    default:
      return <span className={c} />;
  }
}

/** Marcas dos testes contra a morte na placa do retrato (espelho; os controles ficam em Vitalidade). */
const DeathMarks = ({ ds }) => (
  <span className="fh-cplate-ds">
    {[0, 1, 2].map(i => <i key={`f${i}`} className={`is-ko${i < (ds?.fail || 0) ? ' is-on' : ''}`} />)}
    <b />
    {[0, 1, 2].map(i => <i key={`s${i}`} className={`is-ok${i < (ds?.success || 0) ? ' is-on' : ''}`} />)}
  </span>
);

export function FhConditionArt({ char, lang = 'pt' }) {
  const stack = artStack(char || {});
  const layers = stack.slice(0, 2);
  const diff = useStatusDiff(layers, char?.id);
  const list = statusList(char || {});
  const marks = useStatusDiff(list.map(s => s.key), char?.id);
  const top = list[0];
  const rest = list.slice(1);
  // até 5 selos no desktop, 3 no tablet e 2 no celular (o CSS esconde os demais e troca o "+N"):
  // quem encolhe são os selos, nunca o nome da placa
  const shown = rest.slice(0, 5);
  let plate = top ? statusLabel(top, lang) : '';
  // o nome da fera vem primeiro: é o que sobra se a placa for cortada no celular
  if (top?.key === 'wild' && char?.wildShape?.beastName) plate = `${char.wildShape.beastName} · ${plate}`;
  return (
    <>
      {/* a mais grave por cima: a segunda camada é desenhada primeiro */}
      {[...layers].reverse().map(k => <ArtLayer key={k} kind={k} cls={`${diff.fresh.includes(k) ? ' is-fresh' : ''}${k === layers[0] ? ' is-top' : ' is-second'}`} char={char} lang={lang} />)}
      {diff.leaving.filter(k => !layers.includes(k)).map(k => <ArtLayer key={`out-${k}`} kind={k} cls=" is-leaving" char={char} lang={lang} />)}
      {top && (
        <span className="fh-cmarks">
          <span key={top.key} className={`fh-cplate${marks.fresh.includes(top.key) ? ' is-fresh' : ''}`} data-fam={top.fam}>
            <FhStatusIcon s={top} size={22} />
            <span className="fh-cplate-t">{plate}</span>
            {top.key === 'dying' && <DeathMarks ds={char?.deathSaves} />}
          </span>
          {shown.map((s, i) => (
            <span key={s.key} className={`fh-cbadge n-${i}${marks.fresh.includes(s.key) ? ' is-fresh' : ''}`} data-fam={s.fam}><FhStatusIcon s={s} size={22} /></span>
          ))}
          {[5, 3, 2].map(n => rest.length > n && <span key={`m${n}`} className={`fh-cbadge is-more at-${n}`}>+{rest.length - n}</span>)}
        </span>
      )}
    </>
  );
}

// ── Painel Vitalidade: moldura + marca d'água do estado que manda, e o clarão de aplicar/limpar ──
export function FhVitalFx({ char }) {
  // Sangrando sozinho não faz nada (a etiqueta sob o coração e a barra já dizem): não pinta o
  // painel. À beira da morte, sim.
  const list = statusList(char || {}).filter(s => s.key !== 'inspired' && s.key !== 'bloodied');
  const top = list[0] || null;
  // o clarão acompanha condições, efeitos e estados de PV (não a Inspiração, que tem o dela)
  const diff = useStatusDiff(list.map(s => s.key), char?.id);
  const freshKey = diff.fresh[diff.fresh.length - 1];
  const freshFam = list.find(s => s.key === freshKey)?.fam;
  return (
    <>
      {top && (
        /* moldura dupla na cor da família + o MOTIVO dela em friso nas bordas de cima e de baixo
           (elos, gelo, gotas, espinhos…: ./condition-fx.css) + o brasão do estado pendurado no
           topo. É o efeito do celular, onde o retrato quase não aparece. */
        <span key={top.key} className={`fh-vfx${diff.fresh.includes(top.key) ? ' is-fresh' : ''}`} data-fam={top.fam} aria-hidden="true">
          <span className="fh-vtrim is-t" /><span className="fh-vtrim is-b" />
          <span className="fh-vcrest"><FhStatusIcon s={top} size={26} /></span>
        </span>
      )}
      {diff.beat > 0 && (
        <span key={`f${diff.beat}`} className={`fh-vfx-flash${diff.last === 'off' ? ' is-cleansed' : ''}`} data-fam={diff.last === 'off' ? 'stable' : freshFam || top?.fam} aria-hidden="true" />
      )}
    </>
  );
}

/** Selo do estado que manda no canto do coração de PV; a 0 PV, uma rachadura no coração. */
export function FhHeartMark({ char }) {
  const f = hpFlags(char || {});
  const top = statusList(char || {}).filter(s => s.key !== 'inspired' && s.key !== 'bloodied')[0] || null;
  const ward = useGainMoment(f.temp > 0, char?.id, 800);   // o momento em que os PV temporários chegam
  return (
    <>
      {f.down && (
        /* a rachadura fica dentro do coração e fora do número: desce pelo lobo esquerdo, com um
           ramo curto no direito (mesma caixa 64×70 do medalhão) */
        <svg className="fh-heart-crack" viewBox="0 0 64 70" aria-hidden="true" focusable="false">
          <path d="M32 12 L27 17 L29 23 L21 27 L18 35 L21 42 M36 13 L43 17 L47 25 L44 31" />
        </svg>
      )}
      {ward && <span className="fh-heart-ward" aria-hidden="true" />}
      {top && <span key={top.key} className="fh-heart-mark" data-fam={top.fam} aria-hidden="true"><FhStatusIcon s={top} size={20} /></span>}
    </>
  );
}

/** Clarão dourado atrás do selo de Inspiração, só no momento em que ela chega. */
export function FhInspBurst({ inspired, resetKey }) {
  const now = useGainMoment(!!inspired, resetKey, 900);
  const spent = useGainMoment(!inspired, resetKey, 500);
  if (now) return <span className="fh-insp-burst" aria-hidden="true" />;
  if (spent) return <span className="fh-insp-spark" aria-hidden="true" />;
  return null;
}

// ── Faixa de estados sob as abas (celular e tablet): o retrato fica fora da tela enquanto o
//    jogador usa a ficha, então os estados ativos acompanham a rolagem aqui. Um botão só:
//    tocar leva à lista de estados (aba Jogar → Vitalidade). ──
export function FhStatusStrip({ char, lang = 'pt', onGo }) {
  const ref = useRef(null);
  // só há faixa quando algum estado tem aonde levar (uma linha na lista ou a linha dos testes
  // contra a morte); Inspiração e Forma Selvagem entram como selos no fim de uma faixa que já existe
  const { main, extra, target } = stripList(char || {});
  const diff = useStatusDiff(main.map(s => s.key), char?.id);
  const has = main.length > 0;
  // gruda logo abaixo da barra de abas quando ela é fixa (celular); senão, no topo.
  // (Quando a faixa aparece ou some, quem segura o controle tocado no lugar é o painel de
  // estados: src/sheet/FhStatus.jsx, useHoldStill. Aqui não se rola nada.)
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const bar = el.closest('.ficha')?.querySelector('[role="tablist"]');
      const sticky = bar && getComputedStyle(bar).position === 'sticky';
      el.style.setProperty('--fh-strip-top', `${sticky ? Math.round(bar.getBoundingClientRect().height) : 0}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [has]);
  if (!has) return null;
  const pt = lang !== 'en';
  const names = [...main, ...extra].map(s => statusLabel(s, lang));
  const go = () => {
    onGo?.();
    const root = ref.current?.closest('.ficha');
    const jump = (n) => {
      // Caído / Estável / Morto: a frase deles está na linha dos testes contra a morte
      const el = (target === 'death' && root?.querySelector('.fh-hpt-downline')) || root?.querySelector('.fh-status');
      if (!el) { if (n > 0) setTimeout(() => jump(n - 1), 80); return; }
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    };
    setTimeout(() => jump(5), 40);
  };
  const shown = main.slice(0, 6);
  const hasText = (s, i) => i === 0 || s.kind !== 'cond' || s.id === 'exhausted';
  return (
    <button ref={ref} type="button" className="fh-status-strip no-print" data-fam={main[0].fam} onClick={go}
      aria-label={pt ? `Estados ativos: ${names.join(', ')}. Ver o que cada um faz` : `Active statuses: ${names.join(', ')}. See what each one does`}>
      <span className="fh-strip-items" aria-hidden="true">
        {shown.map((s, i) => (
          <span key={s.key} className={`fh-strip-item${diff.fresh.includes(s.key) ? ' is-fresh' : ''}${hasText(s, i) ? ' has-text' : ''}`} data-fam={s.fam}>
            <FhStatusIcon s={s} size={22} />
            {hasText(s, i) && <span className="fh-strip-t">{statusLabel(s, lang)}</span>}
          </span>
        ))}
        {main.length > shown.length && <span className="fh-strip-item has-text"><span className="fh-strip-t">+{main.length - shown.length}</span></span>}
        {extra.map(s => <span key={s.key} className="fh-strip-item is-extra" data-fam={s.fam}><FhStatusIcon s={s} size={22} /></span>)}
      </span>
      <span className="fh-strip-go" aria-hidden="true">›</span>
    </button>
  );
}

export { FAMILY, artStack, condClasses };
