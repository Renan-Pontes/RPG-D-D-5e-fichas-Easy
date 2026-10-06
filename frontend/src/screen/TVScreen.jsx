import { errorMessage } from '../api/errors.js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api, API_BASE } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import CombatGrid from '../campaigns/CombatGrid.jsx';
import DiceStage from '../dice/DiceStage.jsx';
import '../dice/dice-styles.css';
import { HERO_ART, hideOnError } from '../art.js';
import { absUrl, cardKey, charLine, healthLabel, paragraphs, screenMode } from '../player/player-model.js';
import { defaultArt } from '../world/world-model.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const CONDITIONS = {
  blinded:       { pt: 'Cego',         en: 'Blinded',       icon: 'M4 12c2-5 6-7 8-7s6 2 8 7c-2 5-6 7-8 7s-6-2-8-7zm8 3a3 3 0 100-6 3 3 0 000 6zm-4-4l8 8' },
  charmed:       { pt: 'Encantado',    en: 'Charmed',       icon: 'M12 21s-7-4.5-7-10a5 5 0 019-3 5 5 0 019 3c0 5.5-7 10-7 10z' },
  deafened:      { pt: 'Surdo',        en: 'Deafened',      icon: 'M4 13a8 8 0 0116 0v3a3 3 0 01-3 3h-1v-7H9v7H7a3 3 0 01-3-3v-3z M3 3l18 18' },
  frightened:    { pt: 'Amedrontado',  en: 'Frightened',    icon: 'M9 8h.01M15 8h.01M8 16c1-1 2.5-2 4-2s3 1 4 2M12 2a10 10 0 100 20 10 10 0 000-20z' },
  grappled:      { pt: 'Agarrado',     en: 'Grappled',      icon: 'M6 6l4 4-4 4 4 4M18 6l-4 4 4 4-4 4' },
  incapacitated: { pt: 'Incapacitado', en: 'Incapacitated', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-5 13a5 5 0 0010 0' },
  invisible:     { pt: 'Invisível',    en: 'Invisible',     icon: 'M3 3l18 18M9.88 9.88a3 3 0 004.24 4.24M10.73 5.08A11 11 0 0112 5c5 0 9 4 10 7-.6 1.4-1.6 2.8-3 4M6 6c-1.4 1.2-2.4 2.6-3 4 1 3 5 7 9 7 1.4 0 2.7-.3 4-1' },
  paralyzed:     { pt: 'Paralisado',   en: 'Paralyzed',     icon: 'M9 4h6v6h4v4h-4v6H9v-6H5v-4h4z' },
  petrified:     { pt: 'Petrificado',  en: 'Petrified',     icon: 'M3 18h18l-3-13H6z' },
  poisoned:      { pt: 'Envenenado',   en: 'Poisoned',      icon: 'M8 2v6c0 2-2 3-2 6a6 6 0 0012 0c0-3-2-4-2-6V2z' },
  prone:         { pt: 'Caído',        en: 'Prone',         icon: 'M3 18h18M5 14l4-9 6 9' },
  restrained:    { pt: 'Imobilizado',  en: 'Restrained',    icon: 'M4 4h16v4H4zM4 16h16v4H4zM7 8v8M17 8v8' },
  stunned:       { pt: 'Atordoado',    en: 'Stunned',       icon: 'M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l3 3M19 5l-3 3M5 19l3-3M19 19l-3-3' },
  unconscious:   { pt: 'Inconsciente', en: 'Unconscious',   icon: 'M3 12h6l2-3 4 6 2-3h4' },
  exhaustion:    { pt: 'Exausto',      en: 'Exhausted',     icon: 'M7 12l3 3 7-7M12 2a10 10 0 100 20 10 10 0 000-20z' },
};

// Telão (TV da mesa). Rota pública /tv/<token>, sem login.
//
// Quatro modos, decididos pelo que o servidor manda (screenMode):
//   repouso — capa da campanha (ou arte padrão), nome, frase, cena e o grupo;
//   cartão  — o mestre clicou "Mostrar no telão": a carta entra virando;
//   recap   — "Anteriormente em…", estilo abertura de série;
//   combate — grade + PV dos PJs (monstros só com faixa de saúde).
// Tudo o que chega aqui já vem filtrado pelo backend (whitelist do telão).
// Animações respeitam prefers-reduced-motion (CSS).
export default function TVScreen({ token, lang = 'pt' }) {
  const [data, setData] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  // Overlay de rolagem dramática
  const [activeRoll, setActiveRoll] = useState(null);
  const lastRollIdRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.screen(token);
      setData(res.campaign);
      setCard(res.card ?? res.campaign?.card ?? null);
      setError('');
      // Detecta nova rolagem pública e dispara overlay
      const rolls = res.campaign.publicRolls || [];
      const newest = rolls[0];
      if (newest && newest.id !== lastRollIdRef.current) {
        // Só dispara se a rolagem é fresca (< 20s)
        if (newest.resolvedAt && (Date.now() - new Date(newest.resolvedAt).getTime()) < 20000) {
          lastRollIdRef.current = newest.id;
          setActiveRoll(newest);
        } else if (!lastRollIdRef.current) {
          lastRollIdRef.current = newest.id; // marca pra evitar trigger antigo
        }
      }
    } catch (e) {
      setError(errorMessage(e, lang, lang === 'en' ? 'Could not load the TV screen.' : 'Falha ao carregar o telão.'));
    }
  }, [token, lang]);

  usePolling(load, 2000, [token]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-fecha overlay após 8s
  useEffect(() => {
    if (!activeRoll) return;
    const id = setTimeout(() => setActiveRoll(null), 8000);
    return () => clearTimeout(id);
  }, [activeRoll]);

  // Telão não tem menu: o título da aba ajuda a achar a janela certa.
  useEffect(() => {
    if (data?.name) document.title = `${data.name} · ${t(lang, 'Telão', 'TV screen')}`;
  }, [data?.name, lang]);

  if (error && !data) return <div className="tv-error"><h1>{error}</h1></div>;
  if (!data) return <div className="tv-loading"><h1>{t(lang, 'Carregando…', 'Loading…')}</h1></div>;

  const combat = data.combat;
  const mode = screenMode({ combat, card });
  const inCombat = mode === 'combat';
  const state = data.state || {};
  const playerMembers = (data.members || []).filter(m => m.character && m.role !== 'dm');
  const currentTurnName = inCombat ? combat.combatants[combat.turnIndex]?.name : null;
  const coverUrl = absUrl(API_BASE, data.coverUrl) || HERO_ART;
  const accent = /^#[0-9a-f]{3,8}$/i.test(data.accent || '') ? data.accent : null;
  const clock = now.toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`tv-screen tv-mode-${mode} ${activeRoll ? 'has-roll-overlay' : ''}`}
      style={accent ? { '--tv-accent': accent } : undefined}
    >
      {!inCombat && <TVBackdrop url={coverUrl} dim={mode === 'card'} recap={mode === 'recap'} />}

      {inCombat ? (
        <>
          <header className="tv-header">
            <div>
              <h1 className="tv-title">{data.name}</h1>
              {state.scene && <h2 className="tv-scene">{state.scene}</h2>}
            </div>
            <div className="tv-meta">
              {state.session && <div className="tv-session-pill">{t(lang, 'Sessão', 'Session')} {state.session}</div>}
              <div className="tv-combat-pill">⚔ {t(lang, 'EM COMBATE', 'IN COMBAT')} · {t(lang, 'Rodada', 'Round')} {combat.round}</div>
              <div className="tv-clock">{clock}</div>
            </div>
          </header>
          {currentTurnName && (
            <div className="tv-now-acting" aria-live="polite">
              <span className="tv-now-label">{t(lang, 'Vez de', 'Now acting')}</span>
              <span className="tv-now-name">{currentTurnName}</span>
            </div>
          )}
          <main className="tv-combat-main">
            <div className="tv-grid-container">
              <CombatGrid combat={gridCombat(combat)} readOnly={true} lang={lang} />
            </div>
            <aside className="tv-combat-side">
              {card && card.type === 'entry' && <TVMiniCard card={card} lang={lang} />}
              {combat.combatants
                .filter(c => c.type === 'pc')
                .map(c => <CombatHpCard key={c.id} c={c} lang={lang} isTurn={combat.combatants[combat.turnIndex]?.id === c.id} />)}
              {combat.combatants.some(c => c.type !== 'pc') && (
                <div className="tv-foes">
                  {combat.combatants.filter(c => c.type !== 'pc').map(c => <FoeChip key={c.id} c={c} lang={lang} isTurn={combat.combatants[combat.turnIndex]?.id === c.id} />)}
                </div>
              )}
            </aside>
          </main>
        </>
      ) : mode === 'recap' ? (
        <TVRecap key={cardKey(card)} card={card} campaign={data} lang={lang} />
      ) : (
        <>
          <header className="tv-cover-top">
            <div className="tv-cover-pills">
              {state.live && <span className="tv-live"><span className="tv-live-dot" aria-hidden="true" />{t(lang, 'Ao vivo', 'Live')}</span>}
              {state.session && <span className="tv-session-pill">{t(lang, 'Sessão', 'Session')} {state.session}</span>}
              {state.weather && <span className="tv-weather">☁ {state.weather}</span>}
            </div>
            <div className="tv-clock">{clock}</div>
          </header>

          {mode === 'card' ? (
            <main className="tv-stage">
              <div className="tv-stage-campaign">{data.name}</div>
              <TVCard key={cardKey(card)} card={card} lang={lang} />
            </main>
          ) : (
            <main className="tv-cover">
              <div className="tv-cover-ornament" aria-hidden="true">✦</div>
              <h1 className="tv-cover-title">{data.name}</h1>
              {data.tagline && <p className="tv-cover-tagline">{data.tagline}</p>}
              {state.scene && (
                <div className="tv-cover-scene">
                  <span className="tv-cover-eyebrow">{t(lang, 'Agora', 'Now')}</span>
                  <span className="tv-cover-scene-name">{state.scene}</span>
                </div>
              )}
              {state.sceneText && <section className="tv-read-aloud" aria-live="polite">{state.sceneText}</section>}
            </main>
          )}

          {playerMembers.length > 0 && (
            <footer className={`tv-party ${mode === 'card' ? 'is-compact' : ''}`}>
              {playerMembers.map(m => <CharCard key={m.id} member={m} lang={lang} compact={mode === 'card'} />)}
            </footer>
          )}
        </>
      )}

      {data.publicCheck && <CheckScreenPanel check={data.publicCheck} lang={lang} />}
      {error && <div className="tv-offline" role="status">{t(lang, 'Reconectando…', 'Reconnecting…')}</div>}

      {/* Overlay dramático — TV limpa, sem histórico (M1: telão limpo) */}
      {activeRoll && <DramaticRollOverlay roll={activeRoll} lang={lang} onDone={() => setActiveRoll(null)} />}
    </div>
  );
}

// Grade do combate no telão: fundo pela URL cacheável (não reprocessa o base64
// a cada poll) e barra dos monstros pela faixa de saúde (sem PV real).
const BAND_PCT = { unhurt: 100, hurt: 75, bloodied: 35, down: 0 };
function gridCombat(combat) {
  const map = combat.map || {};
  const bg = map.backgroundUrl ? absUrl(API_BASE, map.backgroundUrl) : map.background_image;
  return {
    ...combat,
    map: { ...map, background_image: bg || null },
    combatants: (combat.combatants || []).map(c => (c.type === 'pc' || c.stats?.max_hp
      ? c
      : { ...c, current_hp: BAND_PCT[c.health] ?? 100, stats: { ...(c.stats || {}), max_hp: 100 } })),
  };
}

function TVBackdrop({ url, dim, recap }) {
  return (
    <div className={`tv-backdrop ${dim ? 'is-dim' : ''} ${recap ? 'is-recap' : ''}`} aria-hidden="true">
      <img src={url} alt="" onError={(e) => { if (!e.currentTarget.src.endsWith(HERO_ART)) e.currentTarget.src = HERO_ART; }} />
    </div>
  );
}

function cardKindLabel(card, lang) {
  return (lang === 'pt' ? card.kindLabel : card.kindLabelEn) || card.kindLabel || '';
}

/** A carta "virada" no centro do telão. */
function TVCard({ card, lang }) {
  const img = absUrl(API_BASE, card.imageUrl);
  const [imgOk, setImgOk] = useState(true);
  const paras = paragraphs(card.text);
  const isPartial = !!card.partial;
  return (
    <article className={`tv-card tv-card-${card.kind || card.type} ${isPartial ? 'is-partial' : ''} ${(img && imgOk) || card.type === 'entry' ? 'has-img' : 'no-img'}`} aria-live="polite">
      <div className="tv-card-inner">
        <div className="tv-card-back" aria-hidden="true"><span>✦</span></div>
        <div className="tv-card-front">
          {img && imgOk ? (
            <div className="tv-card-art"><img src={img} alt="" onError={() => setImgOk(false)} /></div>
          ) : card.type === 'entry' ? (
            <div className="tv-card-art is-default"><img src={defaultArt({ id: card.entryId, kind: card.kind })} alt="" onError={hideOnError} /></div>
          ) : (
            <div className="tv-card-emblem" aria-hidden="true">🎭</div>
          )}
          <div className="tv-card-body">
            <div className="tv-card-kind">{cardKindLabel(card, lang)}</div>
            <h2 className="tv-card-title">{card.title}</h2>
            {isPartial && <div className="tv-card-rumor">{t(lang, 'Rumores…', 'Rumors…')}</div>}
            <div className="tv-card-text">
              {paras.slice(0, 6).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Versão pequena do cartão durante o combate (canto da tela). */
function TVMiniCard({ card, lang }) {
  // Sem imagem própria, o cartão do mundo usa a mesma arte padrão da prévia do mestre.
  const fallback = card.type === 'entry' ? defaultArt({ kind: card.kind, id: card.entryId }) : null;
  const img = absUrl(API_BASE, card.imageUrl) || fallback;
  return (
    <div className="tv-mini-card" key={cardKey(card)}>
      {img && <img src={img} alt="" onError={(e) => {
        if (fallback && !e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; else hideOnError(e);
      }} />}
      <div>
        <div className="tv-card-kind">{cardKindLabel(card, lang)}</div>
        <div className="tv-mini-title">{card.title}</div>
      </div>
    </div>
  );
}

/** "Anteriormente em…": tarjas de cinema, título e parágrafos que surgem um a um. */
function TVRecap({ card, campaign, lang }) {
  const paras = paragraphs(card.text);
  const size = (card.text || '').length > 900 ? 'is-long' : (card.text || '').length > 450 ? 'is-medium' : '';
  return (
    <main className={`tv-recap ${size}`} aria-live="polite">
      <div className="tv-recap-bar top" aria-hidden="true" />
      <div className="tv-recap-content">
        <div className="tv-recap-eyebrow">{t(lang, 'Anteriormente em', 'Previously on')}</div>
        <h1 className="tv-recap-campaign">{campaign.name}</h1>
        {card.title && <h2 className="tv-recap-title">{card.title}</h2>}
        <div className="tv-recap-text">
          {paras.map((p, i) => <p key={i} style={{ '--i': i }}>{p}</p>)}
        </div>
      </div>
      <div className="tv-recap-bar bottom" aria-hidden="true" />
    </main>
  );
}

function FoeChip({ c, lang, isTurn }) {
  const band = c.health || 'unhurt';
  return (
    <div className={`tv-foe tv-foe-${band} ${isTurn ? 'is-turn' : ''}`}>
      <span className="tv-foe-name">{c.name}</span>
      <span className="tv-foe-band">{healthLabel(band, lang)}</span>
      {(c.conditions || []).length > 0 && (
        <span className="tv-conditions tiny">
          {c.conditions.map(cond => <ConditionChip key={cond} cond={cond} lang={lang} />)}
        </span>
      )}
    </div>
  );
}

function CombatHpCard({ c, lang, isTurn }) {
  const hpPct = c.stats?.max_hp ? Math.max(0, Math.min(100, (c.current_hp / c.stats.max_hp) * 100)) : 0;
  const tone = hpPct > 60 ? 'ok' : hpPct > 30 ? 'warn' : 'crit';
  return (
    <div className={`tv-combat-hp-card ${isTurn ? 'is-turn' : ''} ${c.defeated ? 'is-dead' : ''}`}>
      <div className="tv-combat-name">{c.name}</div>
      <div className={`tv-hp-bar tv-hp-${tone}`}>
        <div className="tv-hp-fill" style={{ width: `${hpPct}%` }} />
        <div className="tv-hp-text">{c.current_hp} / {c.stats?.max_hp}</div>
      </div>
      {(c.conditions || []).length > 0 && (
        <div className="tv-conditions tiny">
          {c.conditions.map(cond => <ConditionChip key={cond} cond={cond} lang={lang} />)}
        </div>
      )}
    </div>
  );
}

function CharCard({ member, lang, isActiveTurn, compact = false }) {
  const c = member.character;
  const hpPct = c.maxHp ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0;
  const tone = hpPct > 60 ? 'ok' : hpPct > 30 ? 'warn' : 'crit';
  const dead = c.currentHp != null && c.currentHp <= 0;
  const line = charLine(c, lang);
  return (
    <article className={`tv-char-card ${compact ? 'is-compact' : ''} ${isActiveTurn ? 'is-active-turn' : ''} ${dead ? 'is-dead' : ''}`}>
      <div className="tv-char-head">
        {c.avatar
          ? <img src={c.avatar} alt="" className="tv-avatar" />
          : <div className="tv-avatar tv-avatar-placeholder">{(c.name || '?').slice(0, 1).toUpperCase()}</div>}
        <div className="tv-char-id">
          <div className="tv-char-name">{c.name}</div>
          {!compact && <div className="tv-char-sub">{line}</div>}
          {!compact && member.user?.displayName && <div className="tv-char-player">{member.user.displayName}</div>}
        </div>
        {c.inspiration && <div className="tv-inspiration" title={t(lang, 'Inspiração', 'Inspiration')}>★</div>}
      </div>
      <div className={`tv-hp-bar tv-hp-${tone}`} role="meter" aria-label={t(lang, 'Pontos de vida', 'Hit points')} aria-valuenow={c.currentHp} aria-valuemin={0} aria-valuemax={c.maxHp}>
        <div className="tv-hp-fill" style={{ width: `${hpPct}%` }} />
        <div className="tv-hp-text">
          {c.currentHp} / {c.maxHp ?? '?'}{c.tempHp ? <span className="tv-hp-temp"> (+{c.tempHp})</span> : null} {t(lang, 'PV', 'HP')}
        </div>
      </div>
      {!compact && (
        <div className="tv-stats">
          <div className="tv-stat-block"><span className="lbl">{t(lang, 'CA', 'AC')}</span> <span className="val">{c.armorClass ?? '—'}</span></div>
          <div className="tv-stat-block"><span className="lbl">{t(lang, 'Desl.', 'Speed')}</span> <span className="val">{c.speed ?? 30}</span></div>
          {c.deathSaves && (c.deathSaves.success + c.deathSaves.fail > 0) && (
            <div className="tv-stat-block tv-death">
              <span className="lbl">{t(lang, 'Morte', 'Death')}</span>
              <span className="val">
                <span className="tv-death-succ">{'✓'.repeat(c.deathSaves.success)}</span>
                <span className="tv-death-fail">{'✗'.repeat(c.deathSaves.fail)}</span>
              </span>
            </div>
          )}
        </div>
      )}
      {c.conditions?.length > 0 && (
        <div className={`tv-conditions ${compact ? 'tiny' : ''}`}>
          {c.conditions.map(cond => <ConditionChip key={cond} cond={cond} lang={lang} />)}
        </div>
      )}
    </article>
  );
}

function ConditionChip({ cond, lang }) {
  const def = CONDITIONS[cond];
  if (!def) return <span className="tv-condition">{cond}</span>;
  return (
    <span className="tv-condition" title={def[lang]}>
      <svg className="tv-cond-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d={def.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="tv-cond-label">{def[lang]}</span>
    </span>
  );
}

/**
 * Overlay dramático que aparece quando o mestre torna uma rolagem pública.
 * Dado 3D (three.js, sob demanda) rola e para no valor que veio do servidor;
 * sem WebGL / com movimento reduzido cai no 2D. Depois revela o total.
 */
function DramaticRollOverlay({ roll, lang, onDone }) {
  const [phase, setPhase] = useState('rolling'); // 'rolling' → 'reveal'
  const die = parseInt(String(roll.diceType || 'd20').replace(/^d/i, ''), 10) || 20;
  const groups = [{ die, rolls: (roll.rolls || []).map(r => ({ value: r.value, kept: r.kept !== false })) }];
  // Segurança: revela mesmo se a animação falhar/demorar.
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 3500);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div className={`tv-roll-overlay phase-${phase} ${roll.isCritical ? 'crit' : ''} ${roll.isCriticalFail ? 'fail' : ''}`} onClick={onDone}>
      <div className="tv-roll-inner">
        <div className="tv-roll-who">{roll.requester}</div>
        <div className="tv-roll-label">{roll.label || roll.diceType}</div>
        <DiceStage
          groups={groups}
          tone={roll.isCritical ? 'crit' : roll.isCriticalFail ? 'fumble' : null}
          className="tv-dice-stage"
          size2d={140}
          onSettled={() => setPhase('reveal')}
        />
        {phase === 'reveal' && (
          <div className="tv-roll-dice">
            <div className="tv-roll-numbers">
              {groups[0].rolls.filter(r => r.kept).map((r, i) => (
                <span key={i} className="tv-die-result">{r.value}</span>
              ))}
              {roll.modifier !== 0 && (
                <span className="tv-roll-mod">{roll.modifier >= 0 ? '+' : ''}{roll.modifier}</span>
              )}
              <span className="tv-roll-equals">=</span>
              <span className="tv-roll-total">{roll.total}</span>
            </div>
          </div>
        )}
        {phase === 'reveal' && roll.isCritical && <div className="tv-roll-tag tv-crit-tag">⚔ {t(lang, 'CRÍTICO', 'CRITICAL')}</div>}
        {phase === 'reveal' && roll.isCriticalFail && <div className="tv-roll-tag tv-fail-tag">💀 {t(lang, 'FALHA CRÍTICA', 'FUMBLE')}</div>}
      </div>
    </div>
  );
}

/** Resultado de um pedido de teste que o mestre escolheu mostrar no telão. */
function CheckScreenPanel({ check, lang }) {
  const done = check.results.filter(r => r.total != null).length;
  return (
    <section className="tv-check-panel" aria-live="polite">
      <header className="tv-check-head">
        <span className="tv-check-eyebrow">🎯 {t(lang, 'Teste', 'Check')}</span>
        <span className="tv-check-label">{check.label}</span>
        {check.dc != null && <span className="tv-check-dc">{t(lang, 'CD', 'DC')} {check.dc}</span>}
        <span className="tv-check-count">{done}/{check.results.length}</span>
      </header>
      <ul className="tv-check-list">
        {check.results.map((r, i) => (
          <li key={i} className={`tv-check-item ${r.outcome || (r.total == null ? 'waiting' : 'answered')}`}>
            <span className="tv-check-name">{r.name}</span>
            <span className="tv-check-total">{r.total == null ? '…' : r.total}</span>
            {r.outcome && <span className="tv-check-mark">{r.outcome === 'pass' ? '✓' : '✗'}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
