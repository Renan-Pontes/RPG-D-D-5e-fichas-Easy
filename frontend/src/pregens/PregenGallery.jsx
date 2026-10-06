/* "Comece rápido": fichas prontas de nível 1 para quem nunca jogou (data/pregens.json,
 * geradas por scripts/build-pregens.mjs com a mesma lógica da criação). */
import { useEffect, useState } from 'react';
import { tName } from '../../data/i18n.js';
import Utils from '../../utils.js';
import { Modal } from '../../components/Shared.jsx';
import Icon from '../../components/Icons.jsx';
import { hideOnError } from '../art.js';
import './pregens.css';

// glob: a build não quebra enquanto data/pregens.json não existir (a galeria some).
const PREGEN_FILES = import.meta.glob('../../data/pregens.json');
export const hasPregens = Object.keys(PREGEN_FILES).length > 0;

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const txt = (o, lang) => (o && typeof o === 'object' ? (o[lang] || o.pt || '') : (o || ''));

function useOpenState(key, initial) {
  const [open, setOpen] = useState(() => {
    try { const v = localStorage.getItem(key); return v == null ? initial : v === '1'; } catch { return initial; }
  });
  const toggle = () => setOpen(o => { try { localStorage.setItem(key, o ? '0' : '1'); } catch { /* ok */ } return !o; });
  return [open, toggle];
}

function PregenModal({ p, lang, onClose, onPick, busy }) {
  const c = p.character;
  const tips = txt(p.howToPlay, lang).split('\n').filter(Boolean);
  return (
    <Modal onClose={onClose} title={c.name}>
      <div className="pg-modal">
        <img className="pg-modal-art" src={c.avatar} alt="" onError={hideOnError} />
        <p className="pg-modal-sub">
          {tName('class', c.className, lang)} · {tName('race', c.race, lang)} · {tName('background', c.background, lang)}
        </p>
        <p className="pg-pitch">{txt(p.pitch, lang)}</p>
        <div className="pg-stats">
          <div><strong>{c.maxHp}</strong><span>{L(lang, 'Pontos de Vida', 'Hit Points')}</span></div>
          <div><strong>{Utils.computeAc(c)}</strong><span>{L(lang, 'Classe de Armadura', 'Armor Class')}</span></div>
          <div><strong>{Utils.fmtMod(Utils.initiative(c))}</strong><span>{L(lang, 'Iniciativa', 'Initiative')}</span></div>
        </div>
        {tips.length > 0 && (
          <>
            <h4>{L(lang, 'Como jogar na primeira sessão', 'How to play in your first session')}</h4>
            <ul className="pg-tips">{tips.map((t, i) => <li key={i}>{t.replace(/^[-•]\s*/, '')}</li>)}</ul>
          </>
        )}
        {c.backstory && <p className="muted text-sm">{c.backstory}</p>}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={busy} onClick={() => onPick(p)}>
          <Icon name="plus" size={16} /> {busy ? '…' : L(lang, 'Pegar esta ficha', 'Take this character')}
        </button>
        <p className="text-xs muted" style={{ textAlign: 'center', marginTop: 6 }}>
          {L(lang, 'Vira uma cópia sua: dá para trocar o nome, a foto e tudo mais depois.', 'It becomes your own copy: rename it, change the photo and anything else later.')}
        </p>
      </div>
    </Modal>
  );
}

export default function PregenGallery({ lang, onPick, startOpen = false }) {
  if (!hasPregens) return null;
  return <Gallery lang={lang} onPick={onPick} startOpen={startOpen} />;
}

function Gallery({ lang, onPick, startOpen }) {
  const [list, setList] = useState(null);
  const [open, toggle] = useOpenState('forja:pregens-open', startOpen);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || list) return;
    const load = PREGEN_FILES['../../data/pregens.json'];
    if (!load) { setList([]); return; }
    load().then(m => setList(m.default || m)).catch(() => setList([]));
  }, [open, list]);

  const pick = async (p) => {
    setBusy(true);
    try { await onPick(p); setSel(null); } finally { setBusy(false); }
  };

  return (
    <section className={`pg ${open ? 'open' : ''}`}>
      <button type="button" className="pg-head" onClick={toggle} aria-expanded={open}>
        <span className="pg-head-icon" aria-hidden>✦</span>
        <span className="pg-head-text">
          <strong>{L(lang, 'Nunca jogou? Pegue uma ficha pronta', 'Never played? Grab a ready-made character')}</strong>
          <span className="muted">{L(lang, '12 heróis de nível 1 montados pelas regras, prontos para a primeira sessão.', '12 level-1 heroes built by the rules, ready for your first session.')}</span>
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
      </button>
      {open && (
        <div className="pg-grid">
          {!list && <p className="muted">{L(lang, 'Carregando…', 'Loading…')}</p>}
          {list && list.map(p => (
            <button key={p.id} type="button" className="pg-card" onClick={() => setSel(p)}>
              <img className="pg-card-art" src={p.character.avatar} alt="" loading="lazy" onError={hideOnError} />
              <span className="pg-card-body">
                <span className="pg-card-class">{tName('class', p.classId, lang)}</span>
                <span className="pg-card-name">{p.character.name}</span>
                <span className="pg-card-pitch">{txt(p.pitch, lang)}</span>
                <span className={`pg-diff pg-diff-${txt(p.difficulty, 'en').toLowerCase()}`}>{txt(p.difficulty, lang)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {sel && <PregenModal p={sel} lang={lang} onClose={() => setSel(null)} onPick={pick} busy={busy} />}
    </section>
  );
}
