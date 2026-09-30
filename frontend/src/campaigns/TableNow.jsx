// "Mesa agora" — painel do mestre com tudo da sessão num lugar só:
// personagens, cena, combate, pendências, avisos e ações rápidas.
// Regra de produto: aqui só se mostra e se sugere; toda mudança é um clique do mestre.
import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import GroupCheckPanel from '../checks/GroupCheckPanel.jsx';
import { summarize } from '../checks/check-logic.js';
import { NudgeList, NudgeSettings, useNudges } from './NudgeList.jsx';
import { concentrationOf, conditionLabel, partyStatus, stateWithConcentration } from './nudges.js';
import { isWizardEnabled, stateWithWizard } from './end-of-encounter.js';
import EndOfEncounterPanel from './EndOfEncounterPanel.jsx';
import './table-now.css';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

const condLabel = conditionLabel;

const safe = (fn, fallback = null) => { try { const v = fn(); return v ?? fallback; } catch { return fallback; } };

function classLine(data, lang) {
  if (!data) return '';
  const entries = safe(() => Utils.classEntries(data), []);
  const cls = entries.map(e => `${tName('class', e.id, lang)} ${e.level}`).join(' / ');
  return cls || (data.level ? `${L(lang, 'Nível', 'Level')} ${data.level}` : '');
}

// Resumo de espaços: "1º 3/4 · 2º 1/2" (restantes/máximo).
function slotSummary(data) {
  const max = safe(() => Utils.spellSlots(data), []) || [];
  const used = data?.spellSlotsUsed || [];
  return max.map((m, i) => ({ lvl: i + 1, max: m, left: Math.max(0, m - (Number(used[i]) || 0)) })).filter(s => s.max > 0);
}

// Abrir o Grimório reaproveita o link #grimorio que o app já escuta.
function openGrimoire() {
  if (/^#(grimorio|grimoire)$/i.test(window.location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = '#grimorio';
}

export default function TableNow({ campaign, approvals = [], lang = 'pt', onChange, onNavigate }) {
  const [combat, setCombat] = useState(undefined); // undefined = carregando
  const [pendingRolls, setPendingRolls] = useState([]);
  const [checks, setChecks] = useState([]);
  const [showCheck, setShowCheck] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [cb, rolls, ch] = await Promise.allSettled([
      api.getCombat(campaign.id), api.listPendingRolls(campaign.id), api.listChecks(campaign.id),
    ]);
    if (cb.status === 'fulfilled') setCombat(cb.value.combat || null);
    if (rolls.status === 'fulfilled') setPendingRolls(rolls.value.rolls || []);
    if (ch.status === 'fulfilled') setChecks(ch.value.checks || []);
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 4000, [campaign.id]);

  const refresh = useCallback(() => { load(); onChange?.(); }, [load, onChange]);
  const nudges = useNudges({ campaign, combat, lang, onChange: refresh });

  const saveState = async (nextState) => {
    await api.updateCampaign(campaign.id, { state: nextState });
    onChange?.();
  };

  const act = async (fn, ok) => {
    setBusy(true); setMsg('');
    try { await fn(); if (ok) setMsg(ok); refresh(); } catch (e) { setMsg(errorMessage(e)); } finally { setBusy(false); }
  };

  const party = partyStatus(campaign, combat);
  const combatants = combat?.combatants || [];
  const active = !!combat?.active && combatants.length > 0;
  // Marca na hora (otimista); o valor do servidor assume quando a campanha recarrega.
  const [wizardLocal, setWizardLocal] = useState(null);
  const serverWizard = isWizardEnabled(campaign.state);
  useEffect(() => { setWizardLocal(null); }, [serverWizard]);
  const wizardOn = wizardLocal ?? serverWizard;
  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const levelups = pendingApprovals.filter(a => a.type === 'levelup').length;
  const openChecks = checks.filter(c => c.status === 'open');

  return (
    <div className="table-now">
      <SceneBar campaign={campaign} lang={lang} onSave={saveState} />

      {combat !== undefined && (combatants.length > 0) && (
        <CombatStrip combat={combat} lang={lang} active={active} wizardOn={wizardOn}
          onOpen={() => onNavigate?.('combat')}
          onNext={() => act(() => api.combatNextTurn(campaign.id))}
          onWrapUp={() => setShowWrapUp(true)} busy={busy} />
      )}
      {showWrapUp && combat && (
        <div className="tn-wrapup">
          <EndOfEncounterPanel campaign={campaign} combat={combat} lang={lang}
            onClose={() => setShowWrapUp(false)} onNavigate={onNavigate} onChange={refresh} />
        </div>
      )}

      <section className="tn-box tn-nudges" aria-labelledby="tn-nudges-h">
        <div className="tn-box-head">
          <h3 id="tn-nudges-h">{L(lang, 'Avisos', 'Notices')}
            {nudges.visible.length > 0 && <span className="tn-count">{nudges.visible.length}</span>}
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showSettings} onClick={() => setShowSettings(v => !v)}>
            ⚙ {L(lang, 'Configurar', 'Settings')}
          </button>
        </div>
        {showSettings && <NudgeSettings nudges={nudges} lang={lang} />}
        <NudgeList nudges={nudges} lang={lang} />
      </section>

      <section className="tn-party" aria-label={L(lang, 'Personagens da mesa', 'Party')}>
        {party.length === 0 && (
          <div className="tn-box muted">{L(lang, 'Nenhum personagem na mesa ainda. Compartilhe o código de convite na Visão geral.', 'No characters yet. Share the invite code from the Overview.')}</div>
        )}
        {party.map(p => (
          <PartyCard key={p.characterId} p={p} campaign={campaign} lang={lang} onSaveState={saveState}
            onToggleInspiration={() => act(() => api.dmEditCharacter(p.characterId, { data: { inspiration: !p.data?.inspiration } }))} />
        ))}
      </section>

      <section className="tn-box tn-pending" aria-labelledby="tn-pending-h">
        <h3 id="tn-pending-h">{L(lang, 'Pendências', 'Pending')}</h3>
        <ul className="tn-pending-list">
          <PendingRow n={levelups} lang={lang} label={L(lang, 'pedido(s) de subida de nível', 'level-up request(s)')} onClick={() => onNavigate?.('approvals')} />
          <PendingRow n={pendingApprovals.length - levelups} lang={lang} label={L(lang, 'outro(s) pedido(s) de aprovação', 'other approval request(s)')} onClick={() => onNavigate?.('approvals')} />
          <PendingRow n={pendingRolls.length} lang={lang} label={L(lang, 'pedido(s) de rolagem esperando', 'roll request(s) waiting')} onClick={() => onNavigate?.('rolls')} />
          {openChecks.map(c => {
            const s = summarize(c);
            return (
              <li key={c.id}>
                <button type="button" className="tn-pending-item" onClick={() => setShowCheck(true)}>
                  <span className="tn-pending-n">{s.answered}/{s.total}</span>
                  <span>🎯 {c.label}{c.dc != null ? ` CD ${c.dc}` : ''} — {L(lang, 'responderam', 'answered')}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {!levelups && !pendingApprovals.length && !pendingRolls.length && !openChecks.length && (
          <p className="muted small" style={{ margin: 0 }}>{L(lang, 'Nada esperando por você.', 'Nothing waiting for you.')}</p>
        )}
      </section>

      <section className="tn-box tn-actions" aria-labelledby="tn-actions-h">
        <h3 id="tn-actions-h">{L(lang, 'Ações rápidas', 'Quick actions')}</h3>
        <div className="tn-action-grid">
          <button type="button" className={`btn btn-sm ${showCheck ? 'btn-primary' : 'btn-ghost'}`} aria-expanded={showCheck} onClick={() => setShowCheck(v => !v)}>
            🎯 {L(lang, 'Pedir teste à mesa', 'Ask for a check')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !party.length} onClick={() => {
            if (confirm(L(lang, 'Aplicar descanso curto em todos os personagens da mesa?', 'Apply a short rest to the whole party?'))) {
              act(async () => { await api.campaignShortRestAll(campaign.id); }, L(lang, 'Descanso curto aplicado.', 'Short rest applied.'));
            }
          }}>☕ {L(lang, 'Descanso curto (mesa)', 'Short rest (party)')}</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !party.length} onClick={() => {
            if (confirm(L(lang, 'Aplicar descanso longo em todos os personagens da mesa?', 'Apply a long rest to the whole party?'))) {
              act(async () => { await api.campaignLongRestAll(campaign.id); }, L(lang, 'Descanso longo aplicado.', 'Long rest applied.'));
            }
          }}>🛌 {L(lang, 'Descanso longo (mesa)', 'Long rest (party)')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={openGrimoire}>📖 {L(lang, 'Abrir Grimório', 'Open Grimoire')}</button>
        </div>
        <label className="tn-toggle">
          <input type="checkbox" checked={wizardOn} disabled={busy}
            onChange={e => {
              const on = e.target.checked;
              setWizardLocal(on);
              act(async () => {
                try { await saveState(stateWithWizard(campaign.state, on)); } catch (err) { setWizardLocal(null); throw err; }
              }, on ? L(lang, 'Fim de encontro guiado ligado.', 'Guided wrap-up on.') : L(lang, 'Fim de encontro guiado desligado.', 'Guided wrap-up off.'));
            }} />
          <span>
            <strong>{L(lang, 'Fim de encontro guiado', 'Guided end of encounter')}</strong>
            <span className="muted small"> — {L(lang,
              'ao encerrar o combate, abre um painel com XP, descanso, tesouro e nota no Diário (tudo opcional).',
              'when combat ends, opens a panel with XP, rest, treasure and a Diary note (all optional).')}</span>
          </span>
        </label>
        {msg && <p className="small tn-msg" role="status">{msg}</p>}
      </section>

      {showCheck && (
        <div className="tn-check">
          <GroupCheckPanel campaign={campaign} lang={lang} />
        </div>
      )}
    </div>
  );
}

function PendingRow({ n, label, onClick }) {
  if (!n) return null;
  return (
    <li>
      <button type="button" className="tn-pending-item" onClick={onClick}>
        <span className="tn-pending-n">{n}</span><span>{label}</span>
      </button>
    </li>
  );
}

/** Sessão / cena / clima editáveis na própria linha (salva ao sair do campo ou Enter). */
function SceneBar({ campaign, lang, onSave }) {
  const fields = [
    ['session', L(lang, 'Sessão', 'Session'), 'ex: 12'],
    ['scene', L(lang, 'Cena', 'Scene'), L(lang, 'ex: Taverna do Javali Cego', 'e.g.: Blind Boar Tavern')],
    ['weather', L(lang, 'Clima', 'Weather'), L(lang, 'ex: chuva fina', 'e.g.: drizzle')],
  ];
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(([k]) => [k, campaign.state?.[k] || ''])));
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(null);
  const st = campaign.state || {};
  useEffect(() => {
    // Atualiza com o que veio do servidor, sem atropelar o campo em edição.
    setVals(v => Object.fromEntries(fields.map(([k]) => [k, k === editing ? v[k] : (st[k] || '')])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.session, st.scene, st.weather, editing]);

  const commit = async (k) => {
    setEditing(null);
    if ((st[k] || '') === vals[k]) return;
    try { await onSave({ ...st, [k]: vals[k] }); setSaved(k); setTimeout(() => setSaved(s => (s === k ? null : s)), 1500); } catch { /* polling corrige */ }
  };
  return (
    <div className="tn-scene">
      {fields.map(([k, label, ph]) => (
        <label key={k} className={`tn-scene-field tn-scene-${k}`}>
          <span className="tn-eyebrow">{label}{saved === k && <span className="tn-saved"> ✓</span>}</span>
          <input className="tn-scene-input" value={vals[k]} placeholder={ph} maxLength={120}
            onFocus={() => setEditing(k)}
            onChange={e => setVals(v => ({ ...v, [k]: e.target.value }))}
            onBlur={() => commit(k)}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setVals(v => ({ ...v, [k]: st[k] || '' })); setEditing(null); } }} />
        </label>
      ))}
    </div>
  );
}

function CombatStrip({ combat, lang, active, wizardOn, onOpen, onNext, onWrapUp, busy }) {
  const list = combat.combatants || [];
  const cur = list[combat.turnIndex];
  let next = null;
  for (let i = 1; i <= list.length; i++) {
    const c = list[(combat.turnIndex + i) % list.length];
    if (c && !c.defeated && c.id !== cur?.id) { next = c; break; }
  }
  if (!active) {
    return (
      <div className="tn-combat is-idle">
        <span className="tn-combat-label">⚔ {L(lang, 'Combate montado, parado', 'Combat set up, paused')} · {list.length} {L(lang, 'combatentes', 'combatants')}</span>
        <div className="tn-combat-actions">
          {wizardOn && <button type="button" className="btn btn-ghost btn-sm" onClick={onWrapUp}>{L(lang, 'Fim de encontro', 'Wrap up')}</button>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onOpen}>{L(lang, 'Abrir combate', 'Open combat')} →</button>
        </div>
      </div>
    );
  }
  return (
    <div className="tn-combat">
      <div className="tn-combat-info">
        <span className="tn-combat-round">{L(lang, 'Rodada', 'Round')} {combat.round}</span>
        <span className="tn-combat-now"><span className="tn-eyebrow">{L(lang, 'Vez de', 'Now')}</span> <strong>{cur?.name || '—'}</strong>
          {cur && <span className="muted small"> {cur.current_hp}/{cur.stats?.max_hp ?? '?'} PV</span>}</span>
        {next && <span className="tn-combat-next"><span className="tn-eyebrow">{L(lang, 'Próximo', 'Next')}</span> {next.name}</span>}
      </div>
      <div className="tn-combat-actions">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onNext}>{L(lang, 'Próximo turno', 'Next turn')} →</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpen}>⚔ {L(lang, 'Abrir combate', 'Open combat')}</button>
      </div>
    </div>
  );
}

function PartyCard({ p, campaign, lang, onSaveState, onToggleInspiration }) {
  const d = p.data || {};
  const [editConc, setEditConc] = useState(false);
  const [concText, setConcText] = useState('');
  const conc = concentrationOf(campaign.state, { characterId: p.characterId, data: d });
  const pct = p.maxHp ? Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) : 0;
  const tone = p.hp != null && p.hp <= 0 ? 'down' : pct <= 25 ? 'crit' : pct <= 60 ? 'warn' : 'ok';
  const ac = safe(() => Utils.computeAc(d), d.armorClass);
  const pp = safe(() => Utils.passivePerception(d));
  const inv = safe(() => 10 + Utils.skillBonus(d, 'investigation'));
  const ins = safe(() => 10 + Utils.skillBonus(d, 'insight'));
  const slots = slotSummary(d);
  const conds = p.conditions.filter(c => c !== 'unconscious' || p.hp > 0);
  const ds = p.deathSaves || {};

  const saveConc = async (spell) => {
    await onSaveState(stateWithConcentration(campaign.state, `char:${p.characterId}`, spell));
    setEditConc(false); setConcText('');
  };

  return (
    <article className={`tn-card tone-${tone}`}>
      <header className="tn-card-head">
        <div className="tn-card-who">
          <strong className="tn-card-name">{p.name}</strong>
          <span className="muted small">{classLine(d, lang)}</span>
        </div>
        <button type="button" className={`tn-insp ${d.inspiration ? 'on' : ''}`} onClick={onToggleInspiration}
          aria-pressed={!!d.inspiration} title={L(lang, 'Inspiração (clique para alternar)', 'Inspiration (click to toggle)')}>
          {d.inspiration ? '★' : '☆'}<span className="tn-insp-label">{L(lang, 'Insp.', 'Insp.')}</span>
        </button>
      </header>

      <div className={`tn-hp tone-${tone}`} role="img" aria-label={`PV ${p.hp ?? '?'} / ${p.maxHp ?? '?'}`}>
        <div className="tn-hp-fill" style={{ width: `${pct}%` }} />
        <span className="tn-hp-text">
          {L(lang, 'PV', 'HP')} {p.hp ?? '?'}/{p.maxHp ?? '?'}
          {p.tempHp > 0 && <span className="tn-temp"> +{p.tempHp} {L(lang, 'temp', 'temp')}</span>}
        </span>
      </div>

      <dl className="tn-stats">
        <div><dt>{L(lang, 'CA', 'AC')}</dt><dd>{ac ?? '—'}</dd></div>
        <div title={L(lang, 'Percepção passiva', 'Passive Perception')}><dt>{L(lang, 'Perc.', 'Perc.')}</dt><dd>{pp ?? '—'}</dd></div>
        <div title={L(lang, 'Investigação passiva', 'Passive Investigation')}><dt>{L(lang, 'Inv.', 'Inv.')}</dt><dd>{inv ?? '—'}</dd></div>
        <div title={L(lang, 'Intuição passiva', 'Passive Insight')}><dt>{L(lang, 'Intu.', 'Ins.')}</dt><dd>{ins ?? '—'}</dd></div>
      </dl>

      {p.hp != null && p.hp <= 0 && (
        <div className="tn-death">
          <span>{L(lang, 'Contra a morte', 'Death saves')}</span>
          <span className="tn-ds ok" aria-label={L(lang, 'sucessos', 'successes')}>{'●'.repeat(ds.success || 0)}{'○'.repeat(Math.max(0, 3 - (ds.success || 0)))}</span>
          <span className="tn-ds bad" aria-label={L(lang, 'falhas', 'failures')}>{'●'.repeat(ds.fail || 0)}{'○'.repeat(Math.max(0, 3 - (ds.fail || 0)))}</span>
        </div>
      )}

      {conds.length > 0 && (
        <div className="tn-conds">{conds.map(c => <span key={c} className="tn-cond">{condLabel(c, lang)}</span>)}</div>
      )}

      <div className="tn-conc">
        {editConc ? (
          <form className="tn-conc-form" onSubmit={e => { e.preventDefault(); saveConc(concText); }}>
            <input className="input" autoFocus value={concText} maxLength={80} onChange={e => setConcText(e.target.value)}
              placeholder={L(lang, 'Magia (ex.: Bênção)', 'Spell (e.g. Bless)')} aria-label={L(lang, 'Concentrando em', 'Concentrating on')} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!concText.trim()}>OK</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditConc(false)}>×</button>
          </form>
        ) : conc ? (
          <span className="tn-conc-on">
            ◎ {L(lang, 'Concentrando', 'Concentrating')}: <strong>{conc.spell}</strong>
            {!conc.fromSheet && (
              <button type="button" className="btn-link" onClick={() => saveConc('')}>{L(lang, 'encerrar', 'end')}</button>
            )}
          </span>
        ) : (
          <button type="button" className="btn-link tn-conc-add" onClick={() => setEditConc(true)}>◎ {L(lang, 'marcar concentração', 'mark concentration')}</button>
        )}
      </div>

      {slots.length > 0 && (
        <div className="tn-slots" title={L(lang, 'Espaços de magia restantes / máximo', 'Spell slots left / max')}>
          {slots.map(s => (
            <span key={s.lvl} className={`tn-slot ${s.left === 0 ? 'empty' : ''}`}>{s.lvl}º <strong>{s.left}</strong>/{s.max}</span>
          ))}
        </div>
      )}
    </article>
  );
}
