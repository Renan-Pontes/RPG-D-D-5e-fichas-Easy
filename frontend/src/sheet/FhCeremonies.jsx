/* Cerimônias da ficha (visual "Ficha Forjada", src/sheet/ficha.css; plano F13).
 * Só design: nada aqui grava a ficha, muda regra ou abre fluxo novo. As duas reagem a
 * mudanças que já acontecem hoje (subir de nível, descanso, trapaça, mestre, servidor).
 * - Subir de nível: quando char.level SOBE em relação à renderização anterior (mesma
 *   ficha), uma camada fixa com raios, o selo "carimbado" e faíscas. Fecha com toque,
 *   Esc ou sozinha. O toast "Nível N! ✨" do app continua (fica por cima, z 200).
 * - Reacender gemas: quando uma gema (button.slot-pip) deixa de estar gasta, ela acende
 *   com um repique e um brilho, uma depois da outra (descanso longo = todas em fila).
 *   Vale para todas as gemas da ficha, inclusive as do ResourcesCard (componente do app
 *   inteiro, que não muda): um MutationObserver vê a classe `used` sair e põe a classe
 *   decorativa fh-relit por um instante. Abrir a ficha ou trocar de aba não anima nada
 *   (gema nova não é mudança de classe).
 * Movimento reduzido: o CSS tira toda animação (a camada do nível fica parada). */
import { useEffect, useRef, useState } from 'react';
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';

// Mesmo critério do useHpFeedback: não dispara ao abrir a ficha nem ao trocar de ficha.
export function useLevelCeremony(char) {
  const now = { id: char.id, level: char.level || 1 };
  const prev = useRef(null);
  const [cer, setCer] = useState(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = now;
    if (!p || p.id !== now.id || now.level <= p.level) return;
    setCer(c => ({ key: (c?.key || 0) + 1, level: now.level }));
  }, [now.id, now.level]); // eslint-disable-line react-hooks/exhaustive-deps
  return [cer, () => setCer(null)];
}

const SPARKS = Array.from({ length: 20 }, (_, i) => i);
const CLOSE_MS = 5500;

export function FhLevelCeremony({ cer, char, lang, onClose }) {
  const pt = lang === 'pt';
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    const timer = setTimeout(() => closeRef.current(), CLOSE_MS);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, [cer.key]);
  const name = char.name || (pt ? 'Seu herói' : 'Your hero');
  return (
    <div className="fh-levelup no-print" onClick={onClose} role="status" aria-live="polite">
      <div className="fh-lu-box">
        <span className="fh-lu-rays" aria-hidden="true" />
        <span className="fh-lu-seal" aria-hidden="true">
          <small>{pt ? 'Nível' : 'Level'}</small>
          <span className="fh-lu-num">{cer.level}</span>
          <span className="fh-lu-sparks">{SPARKS.map(i => <i key={i} style={{ '--i': i }} />)}</span>
        </span>
        <div className="fh-lu-title">
          {pt ? `${name} subiu de nível` : `${name} leveled up`}
          <span className="fh-sr">{pt ? `: nível ${cer.level}` : `: level ${cer.level}`}</span>
        </div>
        <div className="fh-lu-sub">{Utils.classLabel(char, lang, tName)}</div>
        <div className="fh-lu-close">{pt ? 'Toque para fechar' : 'Tap to close'}</div>
      </div>
    </div>
  );
}

const RELIT_STEP_MS = 80;  // fila: uma gema depois da outra (demo: 120 ms; aqui um pouco mais rápido)
const RELIT_MAX_I = 15;    // muitas gemas (mago de nível alto): a fila não passa de ~1,2 s
const RELIT_MS = 850;      // duração da animação (ficha.css: fh-relit)

export function useGemRelight(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof MutationObserver === 'undefined') return undefined;
    const timers = new Set();
    const isUsed = (cls) => /(^|\s)used(\s|$)/.test(cls || '');
    const obs = new MutationObserver((records) => {
      // Um commit do React chega num lote só, na ordem do documento: a fila segue a ficha.
      const lit = [];
      for (const r of records) {
        const el = r.target;
        if (!el.classList?.contains('slot-pip') || !isUsed(r.oldValue) || el.classList.contains('used')) continue;
        if (!lit.includes(el)) lit.push(el);
      }
      lit.forEach((el, n) => {
        const i = Math.min(n, RELIT_MAX_I);
        el.style.setProperty('--fh-relit-i', String(i));
        el.classList.remove('fh-relit');
        void el.offsetWidth; // recomeça a animação se a gema já estava acendendo
        el.classList.add('fh-relit');
        const timer = setTimeout(() => {
          timers.delete(timer);
          el.classList.remove('fh-relit');
          el.style.removeProperty('--fh-relit-i');
        }, RELIT_MS + i * RELIT_STEP_MS + 100);
        timers.add(timer);
      });
    });
    obs.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    return () => { obs.disconnect(); timers.forEach(clearTimeout); };
  }, [rootRef]);
}
