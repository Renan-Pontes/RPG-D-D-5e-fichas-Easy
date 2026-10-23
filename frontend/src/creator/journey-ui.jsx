/*
 * Peças do visual "jornada" da criação: mapa de capítulos, cartão de capítulo,
 * herói ganhando vida, crônica, painel do peso da decisão, botão de segurar,
 * revelação e forja. Só apresentação: a lógica está em journey.js,
 * chronicle.js e decision.js; as regras continuam nos helpers das etapas.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { tName } from '../../data/i18n.js';
import { classArt, speciesArt, backgroundArt, subclassArt, optionArt, monsterArt, HERO_ART } from '../art.js';
import { prefersReducedMotion } from '../dice/dice-prefs.js';
import { characterSummary } from './creation.js';
import { findOption } from '../progression/options.js';
import { quickSummary, expectedRaceBonus, ABILITIES } from './ability-helpers.js';
import { chronicleLines } from './chronicle.js';
import { heroStats, statDiffs, lostByPatch, battleOdds, classPath, abilitiesSet, STAT_LABEL } from './decision.js';
import { L } from './ui.jsx';

const k = (lang) => (lang === 'pt' ? 'pt' : 'en');
const txt = (x, lang) => (x && typeof x === 'object' ? x[k(lang)] || x.pt : x);
const reduced = () => { try { return prefersReducedMotion(); } catch { return false; } };
const AB_SHORT = { str: { pt: 'FOR', en: 'STR' }, dex: { pt: 'DES', en: 'DEX' }, con: { pt: 'CON', en: 'CON' }, int: { pt: 'INT', en: 'INT' }, wis: { pt: 'SAB', en: 'WIS' }, cha: { pt: 'CAR', en: 'CHA' } };
const fmt = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');
const hide = (e) => { e.currentTarget.style.display = 'none'; };
const speedTxt = (ft, lang) => (lang === 'pt' ? `${String(Math.round(ft * 0.3 * 10) / 10).replace('.', ',')} m` : `${ft} ft`);

// ---------------------------------------------------------------------------
// Decisão em análise (uma por vez): as etapas propõem, o rodapé sela.
// ---------------------------------------------------------------------------
/**
 * decision = { key, id, name, art, patch(char) → patch, current (id selado ou null),
 *   currentName, reveal?: { kicker:{pt,en}, tale } , scar?: 'class' }
 */
export const DecisionContext = createContext({ pending: null, propose: () => {}, cancel: () => {} });
export const useDecision = () => useContext(DecisionContext);

/** Atalho para as etapas: o id em análise para uma chave, ou null. */
export function useConsidering(key) {
  const { pending } = useDecision();
  return pending && pending.key === key ? pending.id : null;
}

// ---------------------------------------------------------------------------
// Mapa da jornada (substitui a barra de etapas; mantém .cr-progress)
// ---------------------------------------------------------------------------
const ROMAN = ['✦', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', '⚒'];

export function JourneyMap({ chapters, steps, index, stepIssues, visited, reachable, goTo, lang, navRef }) {
  const cur = chapters.find(c => c.now);
  const shown = chapters.filter(c => !c.skip);
  const pos = Math.max(0, shown.indexOf(cur));
  return (
    <nav className="cr-progress cr-journey" aria-label={L(lang, 'Etapas da jornada', 'Journey steps')} ref={navRef}>
      <div className="cr-miles">
        <span className="cr-miles-path" aria-hidden="true" />
        <span className="cr-miles-fill" aria-hidden="true" style={{ '--p': shown.length > 1 ? pos / (shown.length - 1) : 0 }} />
        {shown.map(c => {
          // Etapas com pendência pelo nome, como na barra antiga.
          const missing = c.steps.filter(s => visited.includes(s.id) && s.i !== index && (stepIssues[s.i] || []).length).map(s => s.title[lang] || s.title.pt);
          const label = `${txt(c.num, lang)}: ${txt(c.title, lang)}${missing.length ? ` — ${missing.join(', ')}: ${L(lang, 'falta resolver algo', 'something is missing')}` : c.done ? L(lang, ' (concluído)', ' (done)') : ''}`;
          return (
          <button key={c.id} type="button" className={`cr-mile ${c.now ? 'now' : c.done ? 'done' : c.pending ? 'pending' : ''}`}
            disabled={c.target == null || c.now} onClick={() => c.target != null && goTo(steps[c.target].id)}
            aria-label={label} title={label}>
            <span className="cr-mile-dot">{c.pending && !c.now ? '!' : ROMAN[c.index] || '•'}</span>
            <span className="cr-mile-name">{txt(c.title, lang)}</span>
          </button>
          );
        })}
      </div>
      {cur && cur.steps.length > 0 && (
        <div className="cr-substeps">
          <span className="cr-substeps-ch">{txt(cur.num, lang)}</span>
          {cur.steps.map(s => {
            const i = s.i, seen = visited.includes(s.id) && i !== index, pending = seen && stepIssues[i].length > 0, done = seen && !pending;
            return (
              <button key={s.id} type="button" className={`cr-progress-step ${i === index ? 'active' : done ? 'done' : pending ? 'pending' : ''}`}
                disabled={!reachable(i)} onClick={() => goTo(s.id)} aria-current={i === index ? 'step' : undefined}
                title={pending ? L(lang, `${s.title.pt}: falta resolver algo`, `${s.title.en}: something is missing`) : s.title[lang]}>
                <span className="cr-progress-dot">{done ? '✓' : pending ? '!' : i + 1}</span>
                <span className="cr-progress-label">{s.title[lang]}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

/** Cartão de título ao entrar num capítulo novo (toque para pular). */
export function TitleCard({ chapter, lang, onDone }) {
  useEffect(() => {
    if (!chapter) return undefined;
    const t = setTimeout(onDone, 2100);
    return () => clearTimeout(t);
  }, [chapter, onDone]);
  if (!chapter) return null;
  return (
    <div className="cr-titlecard" role="presentation" onClick={onDone}>
      <div className="cr-tc-in">
        <div className="cr-tc-num">{txt(chapter.num, lang)}</div>
        <div className="cr-tc-title cr-foil">{txt(chapter.title, lang)}</div>
        <div className="cr-tc-line" />
        <div className="cr-tc-narr">{txt(chapter.narr, lang)}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Herói ganhando vida
// ---------------------------------------------------------------------------
/** Retrato: foto do jogador; senão espécie (ou sub-raça); senão classe. */
export function portraitOf(char) {
  return char?.avatar || speciesArt(char?.race) || classArt(char?.className) || null;
}

/** Marcas das escolhas (arte pequena): classe, subclasse, antecedente, espécie, escolhas de classe. */
export function marksOf(char, lang) {
  const out = [];
  const add = (key, src, title) => { if (src) out.push({ key, src, title }); };
  if (char.className) add('c', classArt(char.className), tName('class', char.className, lang));
  if (char.subclass) add('sc', subclassArt(char.className, char.subclass), tName('subclass', char.subclass, lang));
  if (char.background) add('b', backgroundArt(char.background), tName('background', char.background, lang));
  if (char.race) add('r', speciesArt(char.race), tName('race', char.race, lang));
  for (const p of (char.classOptions || []).filter(p => p?.classId === char.className)) add(`o:${p.pool}:${p.id}`, optionArt(p.id), txt(findOption(char.className, p.pool, p.id)?.name, lang) || p.id);
  return out;
}

function usePrevious(value) {
  const ref = useRef(value);
  const prev = ref.current;
  useEffect(() => { ref.current = value; }, [value]);
  return prev;
}

export function HeroPanel({ char, lang }) {
  const { pending } = useDecision();
  // O mesmo bônus esperado da espécie/antecedente que a prévia e os mini-atributos usam.
  const summary = useMemo(() => { try { return characterSummary({ ...char, raceBonus: expectedRaceBonus(char) }, lang); } catch { return null; } }, [char, lang]);
  const quick = useMemo(() => { try { return quickSummary(char); } catch { return null; } }, [char]);
  const est = useMemo(() => { try { return heroStats(char); } catch { return {}; } }, [char]);
  const preview = useMemo(() => {
    if (!pending) return null;
    try {
      const p = pending.patch(char);
      return { diffs: statDiffs(char, p), art: portraitOf({ ...char, ...p }) };
    } catch { return null; }
  }, [pending, char]);
  const src = portraitOf(char);
  const ghost = preview?.art && preview.art !== src ? preview.art : null;
  const pre = (key) => { const d = preview?.diffs.find(x => x.key === key); return d ? <i className="cr-pre">→ {key === 'speed' ? speedTxt(d.to, lang) : d.to}</i> : null; };
  const abil = abilitiesSet(char);
  const name = String(char.name || '').trim();
  const line = [char.race && tName('race', char.race, lang), char.className && `${tName('class', char.className, lang)} ${char.level || 1}`, char.background && tName('background', char.background, lang)].filter(Boolean).join(' · ');
  // Antes dos atributos, PV/CA são estimados com a tabela sugerida da classe (os mesmos da prévia "→").
  const approx = (v) => (v == null ? null : abil ? v : `~${v}`);
  const vitals = [
    { key: 'hp', label: L(lang, 'PV', 'HP'), value: approx(est.hp) },
    { key: 'ac', label: L(lang, 'CA', 'AC'), value: approx(est.ac) },
    { key: 'speed', label: L(lang, 'Desloc.', 'Speed'), value: est.speed ? speedTxt(est.speed, lang) : null },
    { key: 'prof', label: L(lang, 'Prof.', 'Prof.'), value: summary ? `+${summary.profBonus}` : '+2' },
  ];
  const prevVitals = usePrevious(vitals.map(v => v.value).join('|'));
  const changed = (i) => prevVitals && prevVitals.split('|')[i] !== String(vitals[i].value ?? '') && vitals[i].value != null;
  const marks = marksOf(char, lang);
  const prevMarks = usePrevious(marks.map(m => m.key).join('|')) || '';
  const skills = (summary?.skills || []).map(s => tName('skill', s.id, lang));
  return (
    <article className="cr-hero" aria-label={L(lang, 'Seu herói', 'Your hero')}>
      <div className={`cr-hero-art ${ghost ? 'previewing' : ''}`}>
        {ghost ? <><img className="cr-ghost-img" src={ghost} alt="" onError={hide} /><span className="cr-pre-tag">{L(lang, 'Prévia', 'Preview')}</span></>
          : src ? <img key={src} className="cr-hero-img" src={src} alt="" onError={hide} /> : <div className="cr-hero-empty">{L(lang, 'Seu herói vai tomar forma aqui', 'Your hero will take shape here')}</div>}
      </div>
      <div className="cr-hero-body">
        <h2 className={`cr-hero-name ${name ? 'cr-foil' : 'unnamed'}`}>{name || L(lang, 'Herói sem nome', 'Nameless hero')}</h2>
        <div className="cr-hero-line">{line || L(lang, 'Nível 1 · origem em branco', 'Level 1 · origin still blank')}</div>
        <div className="cr-vitals">
          {vitals.map((v, i) => (
            <div key={v.key} className={`cr-vital ${v.value == null ? 'unset' : ''} ${changed(i) ? 'cr-glint' : ''}`}
              title={!abil && (v.key === 'hp' || v.key === 'ac') && v.value != null ? L(lang, 'Estimado com os atributos sugeridos para a classe', 'Estimated with the suggested ability scores for the class') : undefined}>
              <b>{v.value ?? '–'}</b>{pre(v.key)}<span>{v.label}</span>
            </div>
          ))}
        </div>
        {!abil && char.className && <div className="cr-vital-note">{L(lang, '~ estimado até a etapa Atributos', '~ estimated until the Abilities step')}</div>}
        <div className="cr-mini-abil">
          {ABILITIES.map(a => (
            <div key={a}><span>{AB_SHORT[a][k(lang)]}</span><b>{abil && quick ? quick.final[a] : '–'}</b></div>
          ))}
        </div>
        {marks.length > 0 && (
          <div className="cr-marks">
            {marks.map(m => <span key={m.key} className={`cr-mark ${prevMarks.split('|').includes(m.key) ? '' : 'new'}`} title={m.title}><img src={m.src} alt="" onError={hide} /></span>)}
          </div>
        )}
        <div className="cr-hero-list">
          {skills.length > 0 && <div><b>{L(lang, 'Perícias', 'Skills')}</b>{skills.join(', ')}</div>}
          {char.race && summary?.languages?.length > 0 && <div><b>{L(lang, 'Idiomas', 'Languages')}</b>{summary.languages.join(', ')}</div>}
          {summary?.spells?.length > 0 && <div><b>{L(lang, 'Magias', 'Spells')}</b>{summary.spells.map(s => s.name).join(', ')}</div>}
        </div>
      </div>
    </article>
  );
}

/** A crônica em pergaminho: cada frase nova aparece como tinta fresca. */
export function Chronicle({ char, lang }) {
  const lines = useMemo(() => { try { return chronicleLines(char, lang); } catch { return []; } }, [char, lang]);
  const prev = usePrevious(lines);
  const scars = Object.values(char.creation?.scars || {}).map(s => (s && typeof s === 'object' ? s[k(lang)] || s.pt : s));
  return (
    <article className="cr-chronicle" aria-label={L(lang, 'A crônica', 'The chronicle')}>
      <h2>{L(lang, 'A crônica', 'The chronicle')}</h2>
      <div className="cr-story">
        {lines.length ? (
          <p>{lines.map((t, i) => <span key={i} className={`s ${prev && !prev.includes(t) ? 'new' : ''} ${scars.includes(t) ? 'scar' : ''}`}>{t} </span>)}</p>
        ) : <p className="empty">{L(lang, 'A primeira linha da sua lenda aparece aqui quando você fizer a primeira escolha.', 'The first line of your legend appears here once you make your first choice.')}</p>}
      </div>
    </article>
  );
}

/** Faixa compacta do herói no celular (abre o painel completo). */
export function MiniHero({ char, lang, onOpen, open, btnRef }) {
  const est = useMemo(() => { try { return heroStats(char); } catch { return {}; } }, [char]);
  const src = portraitOf(char);
  const name = String(char.name || '').trim();
  const line = [char.race && tName('race', char.race, lang), char.className && tName('class', char.className, lang)].filter(Boolean).join(' · ');
  return (
    <button type="button" className="cr-minihero" onClick={onOpen} ref={btnRef} aria-expanded={!!open} aria-label={L(lang, 'Ver o herói e a crônica', 'See the hero and the chronicle')}>
      {src && <img src={src} alt="" onError={hide} />}
      <span className="cr-minihero-txt"><b>{name || L(lang, 'Herói sem nome', 'Nameless hero')}</b><span>{line || L(lang, 'Toque para ver o herói e a crônica', 'Tap to see the hero and the chronicle')}</span></span>
      {char.className && est.hp != null && <span className="cr-minihero-vit">{L(lang, 'PV', 'HP')} {abilitiesSet(char) ? '' : '~'}{est.hp}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// O peso da decisão
// ---------------------------------------------------------------------------

/**
 * Painel da escolha em análise (ou da já selada). `info` traz o que a opção
 * dá: { art, kicker, name, pitch, gains:[txt], loses:[txt], tale }. `children`
 * mantém os detalhes completos que a etapa já mostrava.
 */
export function DecisionPanel({ char, lang, decisionKey, sealedId, info, battle = false, path = null, children, id }) {
  const { pending, cancel } = useDecision();
  const considering = pending && pending.key === decisionKey ? pending : null;
  const sealed = !considering;
  const patch = useMemo(() => { try { return considering ? considering.patch(char) : null; } catch { return null; } }, [considering, char]);
  const diffs = useMemo(() => (patch ? statDiffs(char, patch) : []), [patch, char]);
  const lost = useMemo(() => (patch && sealedId ? lostByPatch(char, patch) : []), [patch, char, sealedId]);
  const odds = useMemo(() => {
    if (!battle) return null;
    const after = patch ? battleOdds({ ...char, ...patch }, lang) : battleOdds(char, lang);
    const before = patch && sealedId ? battleOdds(char, lang) : null;
    return after ? { after, before } : null;
  }, [battle, patch, char, sealedId, lang]);
  const steps = useMemo(() => (path ? classPath(char, path) : []), [path, char]);
  if (!info) return null;
  const gains = (info.gains || []).filter(Boolean), loses = (info.loses || []).filter(Boolean);
  const row = (key, label, unit, good) => {
    const a = odds.after[key], b = odds.before?.[key];
    const better = b != null && (good === 'up' ? a > b : a < b), worse = b != null && a !== b && !better;
    return (
      <div className={`cr-b-row ${better ? 'better' : worse ? 'worse' : ''}`} key={key}>
        <span>{label}</span><b>{b != null && b !== a && <s>{b}{unit}</s>}{b != null && b !== a && ' → '}{a}{unit}</b>
      </div>
    );
  };
  return (
    <section id={id} className={`cr-decision ${sealed ? 'is-sealed' : 'open'}`} aria-label={`${txt(info.name, lang)} · ${sealed ? L(lang, 'selado', 'sealed') : L(lang, 'em análise', 'under consideration')}`}>
      <div className="cr-dec-art">
        {info.art && <img src={info.art} alt="" onError={hide} />}
        <span className="cr-wax" aria-hidden="true">{String(txt(info.name, lang) || '?').charAt(0)}</span>
      </div>
      <div className="cr-dec-body">
        <div className="eyebrow">{txt(info.kicker, lang)} · {sealed ? L(lang, 'selado', 'sealed') : L(lang, 'o peso da escolha', 'the weight of the choice')}</div>
        <h3>{txt(info.name, lang)}</h3>
        {info.pitch && <p>{txt(info.pitch, lang)}</p>}
        {diffs.length > 0 && (
          <div className="cr-dec-diffs" aria-label={L(lang, 'O que muda no herói', 'What changes in your hero')}>
            {diffs.map(d => (
              <div key={d.key} className="cr-diff"><span>{STAT_LABEL[d.key][k(lang)]}</span>
                <b>{d.from != null && <><s>{d.key === 'speed' ? speedTxt(d.from, lang) : d.from}</s> → </>}{d.key === 'speed' ? speedTxt(d.to, lang) : d.to}</b></div>
            ))}
          </div>
        )}
        {(gains.length > 0 || loses.length > 0) && (
          <div className="cr-dec-cols">
            {gains.length > 0 && <div className="cr-gain"><b>{L(lang, 'O que você ganha', 'What you gain')}</b><ul>{gains.map((g, i) => <li key={i}>{txt(g, lang)}</li>)}</ul></div>}
            {loses.length > 0 && <div className="cr-lose"><b>{info.losesTitle ? txt(info.losesTitle, lang) : L(lang, 'O que fica para trás', 'What you leave behind')}</b><ul>{loses.map((g, i) => <li key={i}>{txt(g, lang)}</li>)}</ul></div>}
          </div>
        )}
        {odds && (
          <div className="cr-battle">
            <img src={monsterArt('goblin-warrior') || monsterArt('goblin')} alt="" onError={hide} />
            <div>
              <b className="cr-b-h">{L(lang, 'A primeira batalha: um goblin salta da moita', 'The first battle: a goblin leaps from the bushes')}</b>
              {row('hitsYou', L(lang, 'Ele te acerta em', 'It hits you'), L(lang, '% dos ataques', '% of the time'), 'down')}
              {row('fallsAfter', L(lang, 'Você cai depois de', 'You drop after'), odds.after.fallsAfter > 1 ? L(lang, ' golpes', ' hits') : L(lang, ' golpe', ' hit'), 'up')}
              {row('youHit', L(lang, 'Você acerta ele em', 'You hit it'), L(lang, '% dos ataques', '% of the time'), 'up')}
              {(odds.after.assumedAbilities || odds.after.assumedKit) && (
                <span className="cr-b-note">{L(lang, 'Com ', 'With ')}{[odds.after.assumedAbilities && L(lang, 'os atributos sugeridos', 'the suggested ability scores'), odds.after.assumedKit && L(lang, 'o primeiro kit da classe', 'the first class kit')].filter(Boolean).join(L(lang, ' e ', ' and '))}.</span>
              )}
            </div>
          </div>
        )}
        {steps.length > 0 && (
          <div className="cr-path">
            <b className="cr-p-h">{L(lang, 'O caminho adiante', 'The road ahead')}</b>
            <ol>{steps.map(s => <li key={s.level} className={s.big ? 'big' : ''}><span className="lv">{s.level}</span><span>{s.items.map(x => txt(x, lang)).join(' · ')}</span></li>)}</ol>
          </div>
        )}
        {info.tale && txt(info.tale, lang) && <p className="cr-quote"><span>{L(lang, 'Na crônica: ', 'In the chronicle: ')}</span>{txt(info.tale, lang)}</p>}
        {considering && sealedId && (
          <div className="cr-break">
            <b>{L(lang, `Isto quebra o selo de ${txt(considering.currentName, 'pt')}.`, `This breaks the seal of ${txt(considering.currentName, 'en')}.`)}</b>
            {lost.length > 0 && <> {L(lang, 'Vai desfazer ', 'It will undo ')}{lost.map(x => txt(x, lang)).join(', ')}.</>}
            {info.breakNote && <> {txt(info.breakNote, lang)}</>}
          </div>
        )}
        {considering ? (
          <div className="cr-seal-row">
            <p className="cr-seal-hint">
              {L(lang, 'Gostou? Segure o botão de selar, no rodapé, até a forja brilhar.', 'Like it? Hold the seal button at the bottom until the forge glows.')}
              {sealedId && ' ' + L(lang, `Para manter ${txt(considering.currentName, 'pt')}, toque nele de novo ou em "Desistir".`, `To keep ${txt(considering.currentName, 'en')}, tap it again or "Never mind".`)}
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>{L(lang, 'Desistir', 'Never mind')}</button>
          </div>
        ) : <p className="cr-sealed-note">{L(lang, 'Escolha selada. Para mudar, toque em outra opção.', 'Choice sealed. To change it, tap another option.')}</p>}
        {children && <div className="cr-dec-more">{children}</div>}
      </div>
    </section>
  );
}

/** "Porque você escolheu…": lembra mais adiante por que algo está ali. */
export function Echo({ art, children, lang }) {
  return (
    <div className="cr-echo">
      {art && <img src={art} alt="" onError={hide} />}
      <span><em>{L(lang, 'Porque você escolheu · ', 'Because you chose · ')}</em>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segurar para selar
// ---------------------------------------------------------------------------
export const HOLD_MS = 1200;
const HOLD_WORDS = { pt: ['Você hesita…', '…respira fundo…', '…e decide.'], en: ['You hesitate…', '…take a breath…', '…and decide.'] };

export function HoldButton({ label, onComplete, lang, disabled, className = '' }) {
  const [holding, setHolding] = useState(false);
  const [word, setWord] = useState(null);
  const [nudge, setNudge] = useState(false);
  const [tip, setTip] = useState(false);
  const timers = useRef([]);
  const tipTimer = useRef(null);
  const holdingRef = useRef(false); // ref, não estado: o pointerup chega antes do novo render
  const firedAt = useRef(0);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { clear(); clearTimeout(tipTimer.current); }, []);
  const fire = () => {
    // Uma vez só (Espaço + o click nativo, ou o timer + um clique de tecnologia assistiva).
    if (disabled || Date.now() - firedAt.current < 500) return;
    firedAt.current = Date.now();
    clear(); clearTimeout(tipTimer.current);
    holdingRef.current = false;
    setHolding(false); setWord(null); setNudge(false); setTip(false);
    onComplete();
  };
  const start = (e) => {
    if (disabled || holdingRef.current || (e.button != null && e.button !== 0)) return;
    // Movimento reduzido: sela no clique (ao soltar dentro do botão), que ainda dá para cancelar arrastando para fora.
    if (reduced()) return;
    holdingRef.current = true;
    setNudge(false); setTip(false); setHolding(true);
    HOLD_WORDS[k(lang)].forEach((w, i) => timers.current.push(setTimeout(() => setWord(w), i * (HOLD_MS / 3))));
    timers.current.push(setTimeout(fire, HOLD_MS));
  };
  const stop = () => {
    if (!holdingRef.current) return;
    clear(); holdingRef.current = false;
    setHolding(false); setWord(null); setNudge(true); setTip(true);
    clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(false), 5000);
  };
  // Clique sem ponteiro (leitor de tela, comando de voz, acesso por botão, Enter) sela na hora, como o teclado.
  const onClick = (e) => { if (e.detail === 0 || reduced()) fire(); };
  return (
    <span className="cr-hold-wrap">
      <button type="button" className={`btn cr-hold ${holding ? 'holding' : ''} ${nudge ? 'nudge' : ''} ${className}`} disabled={disabled}
        onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } }}
        onClick={onClick}
        onAnimationEnd={() => setNudge(false)}
        aria-label={reduced() ? label : `${label}. ${L(lang, 'Mantenha pressionado; no teclado ou leitor de tela, Enter.', 'Press and hold; with a keyboard or screen reader, Enter.')}`}>
        <span className="cr-hold-fill" style={{ '--hold': `${HOLD_MS}ms` }} />
        <span className="cr-hold-txt">{word || label}</span>
      </button>
      {tip && (
        <span className="cr-hold-tip" role="status">
          {L(lang, 'Segure um pouco mais, até o selo encher.', 'Hold a little longer, until the seal fills.')}{' '}
          {/* Para quem não consegue segurar (acesso por botão, comando de voz). */}
          <button type="button" className="cr-hold-now" onClick={fire}>{L(lang, 'Selar sem segurar', 'Seal without holding')}</button>
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Revelação ao selar uma escolha que define o herói, e a forja final
// ---------------------------------------------------------------------------
export function Reveal({ data, lang, onDone }) {
  useEffect(() => {
    if (!data) return undefined;
    const t = setTimeout(onDone, 2300);
    return () => clearTimeout(t);
  }, [data, onDone]);
  if (!data) return null;
  return (
    <div className="cr-reveal" role="presentation" onClick={onDone}>
      {data.art && <img src={data.art} alt="" onError={hide} />}
      <div className="cr-rv-in" aria-live="assertive">
        <div className="cr-rv-k">{txt(data.kicker, lang)}</div>
        <div className="cr-rv-n cr-foil">{txt(data.name, lang)}</div>
        <div className="cr-tc-line" />
        {data.tale && txt(data.tale, lang) && <div className="cr-rv-t">{txt(data.tale, lang)}</div>}
      </div>
    </div>
  );
}

export const FORGE_MS = 2600;
const FORGE_WORDS = { pt: ['Aquecendo a forja…', 'Temperando a vontade…', 'Gravando o nome…', 'Um herói nasceu'], en: ['Heating the forge…', 'Tempering the will…', 'Engraving the name…', 'A hero is born'] };

export function Forge({ char, lang }) {
  const [step, setStep] = useState(0);
  const boxRef = useRef(null);
  useEffect(() => {
    const ts = [1, 2, 3].map(i => setTimeout(() => setStep(i), i * (FORGE_MS / 4)));
    try { boxRef.current?.focus({ preventScroll: true }); } catch { /* sem foco */ }
    return () => ts.forEach(clearTimeout);
  }, []);
  const name = String(char.name || '').trim();
  const sub = [char.race && tName('race', char.race, lang), char.className && tName('class', char.className, lang), char.background && tName('background', char.background, lang)].filter(Boolean).join(' · ');
  return (
    <div className="cr-forge" role="dialog" aria-modal="true" aria-label={L(lang, 'A forja', 'The forge')} ref={boxRef} tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Tab') e.preventDefault(); /* nada atrás dela enquanto salva */ }}>
      <div className="cr-forge-in">
        <div className="cr-forge-step">{FORGE_WORDS[k(lang)][step]}</div>
        <div className={`cr-anvil ${step === 3 ? 'lit' : ''}`}>
          <div className="cr-anvil-portrait"><img src={portraitOf(char) || HERO_ART} alt="" onError={hide} /></div>
          <div key={step} className="cr-forge-flash" />
          <svg className="cr-anvil-svg" viewBox="0 0 220 90" aria-hidden="true"><path d="M10 20 H170 C190 20 205 28 214 36 C190 34 175 38 165 46 L150 46 L150 62 L176 84 L44 84 L70 62 L70 46 L40 46 C25 46 12 36 10 20 Z" /><rect x="10" y="16" width="160" height="6" rx="2" /></svg>
          <svg key={`h${step}`} className="cr-hammer" viewBox="0 0 110 120" aria-hidden="true"><rect className="h" x="70" y="10" width="10" height="100" rx="4" /><rect x="40" y="0" width="64" height="30" rx="4" /></svg>
        </div>
        {step === 3 && <><div className="cr-forge-name cr-foil">{name || L(lang, 'Herói sem nome', 'Nameless hero')}</div><div className="cr-forge-sub">{sub}{sub ? ' · ' : ''}{L(lang, 'Nível', 'Level')} {char.level || 1}</div></>}
      </div>
    </div>
  );
}

export { reduced as prefersReduced };
