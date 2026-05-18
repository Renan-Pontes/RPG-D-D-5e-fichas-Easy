import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import CombatGrid from '../campaigns/CombatGrid.jsx';

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

export default function TVScreen({ token, lang = 'pt' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  // Overlay de rolagem dramática
  const [activeRoll, setActiveRoll] = useState(null);
  const lastRollIdRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.screen(token);
      setData(res.campaign);
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
      setError(e?.message || 'Falha ao carregar telão');
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
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

  if (error) return <div className="tv-error"><h1>{error}</h1></div>;
  if (!data) return <div className="tv-loading"><h1>{t(lang, 'Carregando…', 'Loading…')}</h1></div>;

  const members = (data.members || []).filter(m => m.character);
  const playerMembers = members.filter(m => m.role !== 'dm');

  const combat = data.combat;
  const inCombat = combat?.active;
  const initiative = data.state?.initiative;
  const initiativeTurn = data.state?.initiativeTurn ?? null;
  const currentTurnName = inCombat
    ? (combat.combatants[combat.turnIndex]?.name)
    : initiative?.[initiativeTurn]?.name;

  return (
    <div className={`tv-screen tv-mode-${inCombat ? 'combat' : 'exploration'}`}>
      <header className="tv-header">
        <div>
          <h1 className="tv-title">{data.name}</h1>
          {data.state?.scene && <h2 className="tv-scene">{data.state.scene}</h2>}
        </div>
        <div className="tv-meta">
          {data.state?.session && <div className="tv-session-pill">{t(lang, 'Sessão', 'Session')} {data.state.session}</div>}
          {data.state?.weather && <div className="tv-weather">{data.state.weather}</div>}
          {inCombat && <div className="tv-combat-pill">⚔ {t(lang, 'EM COMBATE', 'IN COMBAT')} · {t(lang, 'Rodada', 'Round')} {combat.round}</div>}
          <div className="tv-clock">{now.toLocaleTimeString()}</div>
        </div>
      </header>

      {currentTurnName && (
        <div className="tv-now-acting" aria-live="polite">
          <span className="tv-now-label">{t(lang, 'Vez de', "Now acting")}</span>
          <span className="tv-now-name">{currentTurnName}</span>
        </div>
      )}

      {inCombat ? (
        <main className="tv-combat-main">
          <div className="tv-grid-container">
            <CombatGrid combat={combat} readOnly={true} lang={lang} />
          </div>
          <aside className="tv-combat-side">
            {combat.combatants
              .filter(c => c.type === 'pc')
              .map(c => <CombatHpCard key={c.id} c={c} lang={lang} isTurn={combat.combatants[combat.turnIndex]?.id === c.id} />)}
          </aside>
        </main>
      ) : (
        <main className="tv-grid">
          {playerMembers.map(m => (
            <CharCard
              key={m.id}
              member={m}
              lang={lang}
              isActiveTurn={currentTurnName && currentTurnName === m.character?.name}
            />
          ))}
        </main>
      )}

      {initiative && initiative.length > 0 && !inCombat && (
        <aside className="tv-initiative">
          <h3>{t(lang, 'Iniciativa', 'Initiative')}</h3>
          <ol>
            {initiative.map((entry, idx) => (
              <li key={`${entry.name}-${idx}`} className={idx === initiativeTurn ? 'current' : ''}>
                <span className="tv-init-name">{entry.name}</span>
                <span className="tv-init-value">{entry.value}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {/* Overlay dramático — TV limpa, sem histórico (M1: telão limpo) */}
      {activeRoll && <DramaticRollOverlay roll={activeRoll} lang={lang} onDone={() => setActiveRoll(null)} />}
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

function CharCard({ member, lang, isActiveTurn }) {
  const c = member.character;
  const hpPct = c.maxHp ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0;
  const tone = hpPct > 60 ? 'ok' : hpPct > 30 ? 'warn' : 'crit';
  const dead = c.currentHp != null && c.currentHp <= 0;
  return (
    <article className={`tv-char-card ${isActiveTurn ? 'is-active-turn' : ''} ${dead ? 'is-dead' : ''}`}>
      <div className="tv-char-head">
        {c.avatar
          ? <img src={c.avatar} alt="" className="tv-avatar" />
          : <div className="tv-avatar tv-avatar-placeholder">{(c.name || '?').slice(0, 1).toUpperCase()}</div>}
        <div className="tv-char-id">
          <div className="tv-char-name">{c.name}</div>
          <div className="tv-char-sub">{member.user.displayName} · {[c.race, c.className, c.level].filter(Boolean).join(' ')}</div>
        </div>
        {c.inspiration && <div className="tv-inspiration" title={t(lang, 'Inspiração', 'Inspiration')}>★</div>}
      </div>
      <div className={`tv-hp-bar tv-hp-${tone}`} role="meter" aria-valuenow={c.currentHp} aria-valuemin={0} aria-valuemax={c.maxHp}>
        <div className="tv-hp-fill" style={{ width: `${hpPct}%` }} />
        <div className="tv-hp-text">
          {c.currentHp} / {c.maxHp ?? '?'}{c.tempHp ? <span className="tv-hp-temp"> (+{c.tempHp})</span> : null} HP
        </div>
      </div>
      <div className="tv-stats">
        <div className="tv-stat-block"><span className="lbl">CA</span> <span className="val">{c.armorClass ?? '—'}</span></div>
        <div className="tv-stat-block"><span className="lbl">{t(lang, 'Vel', 'Spd')}</span> <span className="val">{c.speed ?? 30}</span></div>
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
      {c.conditions?.length > 0 && (
        <div className="tv-conditions">
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
 * Animação: dado girando 1.5s, depois revela resultado.
 */
function DramaticRollOverlay({ roll, lang, onDone }) {
  const [phase, setPhase] = useState('rolling'); // 'rolling' → 'reveal' → 'done'
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 1400);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div className={`tv-roll-overlay phase-${phase} ${roll.isCritical ? 'crit' : ''} ${roll.isCriticalFail ? 'fail' : ''}`} onClick={onDone}>
      <div className="tv-roll-inner">
        <div className="tv-roll-who">{roll.requester}</div>
        <div className="tv-roll-label">{roll.label || roll.diceType}</div>
        <div className="tv-roll-dice">
          {phase === 'rolling' ? (
            <div className="tv-die tv-die-spinning">🎲</div>
          ) : (
            <div className="tv-roll-numbers">
              {roll.rolls.filter(r => r.kept).map((r, i) => (
                <span key={i} className="tv-die-result">{r.value}</span>
              ))}
              {roll.modifier !== 0 && (
                <span className="tv-roll-mod">{roll.modifier >= 0 ? '+' : ''}{roll.modifier}</span>
              )}
              <span className="tv-roll-equals">=</span>
              <span className="tv-roll-total">{roll.total}</span>
            </div>
          )}
        </div>
        {phase === 'reveal' && roll.isCritical && <div className="tv-roll-tag crit-tag">⚔ CRÍTICO</div>}
        {phase === 'reveal' && roll.isCriticalFail && <div className="tv-roll-tag fail-tag">💀 FALHA</div>}
      </div>
    </div>
  );
}
