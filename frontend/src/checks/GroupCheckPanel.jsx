// Painel do mestre: pedir teste à mesa com um toque e acompanhar respostas.
//
// Toque num atalho ("Percepção") → pedido enviado para os alvos marcados,
// com a CD/vantagem configuradas acima. Cada jogador responde no app ou
// digitando o dado físico; o mestre também pode anotar o que ouviu na mesa.
// Nada vai para o telão sem o mestre tocar em "Mostrar no telão".
import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { tName } from '../../data/i18n.js';
import SRD from '../../data/srd.js';
import {
  QUICK_SKILLS, QUICK_SAVES, ABILITIES, abilityAbbr, checkLabel, buildCheckPayload, summarize,
} from './check-logic.js';
import { formatMod } from '../dice/dice-math.js';
import './checks-styles.css';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const DC_PRESETS = [10, 12, 15, 18, 20];

export default function GroupCheckPanel({ campaign, lang = 'pt' }) {
  const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.user?.id !== campaign.dmId);
  const [dc, setDc] = useState('');
  const [dcHidden, setDcHidden] = useState(false);
  const [advantage, setAdvantage] = useState('normal');
  const [targets, setTargets] = useState([]); // [] = todos
  const [checks, setChecks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [other, setOther] = useState('');
  const [custom, setCustom] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.listChecks(campaign.id);
      setChecks(r.checks || []);
    } catch { /* polling */ }
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 2500, [campaign.id]);

  const send = async (spec) => {
    if (!players.length) { setError(L(lang, 'Nenhum jogador na campanha ainda.', 'No players in this campaign yet.')); return; }
    setBusy(true); setError('');
    try {
      await api.createCheck(campaign.id, buildCheckPayload({ ...spec, dc, dcHidden, advantage, targets }, lang));
      if (navigator.vibrate) navigator.vibrate(20);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  const toggleTarget = (userId) => {
    setTargets(prev => (prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId]));
  };

  const act = async (fn) => { try { await fn(); await load(); } catch (e) { setError(errorMessage(e)); } };

  const open = checks.filter(c => c.status === 'open');
  const closed = checks.filter(c => c.status !== 'open').slice(0, 5);
  const targetText = targets.length === 0
    ? L(lang, 'todos', 'everyone')
    : players.filter(p => targets.includes(p.user.id)).map(p => p.character?.name || p.user.displayName).join(', ');

  return (
    <div className="info-box group-checks">
      <div className="group-checks-head">
        <h3 style={{ margin: 0 }}>🎯 {L(lang, 'Pedir teste à mesa', 'Ask the table for a check')}</h3>
        <span className="muted small">
          {L(lang, 'Um toque envia. Os jogadores rolam no app ou digitam o dado físico.', 'One tap sends. Players roll in the app or type their physical die.')}
        </span>
      </div>

      <div className="group-checks-config">
        <div className="gc-field">
          <span className="gc-label">{L(lang, 'Para', 'To')}</span>
          <div className="gc-chips">
            <button type="button" className={`gc-chip ${targets.length === 0 ? 'active' : ''}`} aria-pressed={targets.length === 0} onClick={() => setTargets([])}>
              {L(lang, 'Todos', 'Everyone')}
            </button>
            {players.map(p => (
              <button key={p.user.id} type="button" className={`gc-chip ${targets.includes(p.user.id) ? 'active' : ''}`}
                aria-pressed={targets.includes(p.user.id)} onClick={() => toggleTarget(p.user.id)}>
                {p.character?.name || p.user.displayName}
              </button>
            ))}
          </div>
        </div>
        <div className="gc-field">
          <span className="gc-label">CD</span>
          <div className="gc-chips">
            <button type="button" className={`gc-chip ${dc === '' ? 'active' : ''}`} onClick={() => setDc('')}>{L(lang, 'sem', 'none')}</button>
            {DC_PRESETS.map(v => (
              <button key={v} type="button" className={`gc-chip ${String(dc) === String(v) ? 'active' : ''}`} onClick={() => setDc(String(v))}>{v}</button>
            ))}
            <input className="input gc-dc-input" type="number" inputMode="numeric" min={1} max={40} value={dc}
              onChange={e => setDc(e.target.value)} aria-label={L(lang, 'CD personalizada', 'Custom DC')} placeholder="…" />
            <button type="button" className={`gc-chip gc-secret ${dcHidden && dc !== '' ? 'active' : ''}`} aria-pressed={dcHidden && dc !== ''}
              disabled={dc === ''} onClick={() => setDcHidden(v => !v)}
              title={L(lang, 'Jogadores e telão não veem a CD', 'Players and TV do not see the DC')}>
              🔒 {L(lang, 'CD secreta', 'Secret DC')}
            </button>
          </div>
        </div>
        <div className="gc-field">
          <span className="gc-label">{L(lang, 'Dado', 'Roll')}</span>
          <div className="gc-chips">
            {[['normal', L(lang, 'Normal', 'Normal')], ['adv', L(lang, 'Vantagem', 'Advantage')], ['dis', L(lang, 'Desvantagem', 'Disadvantage')]].map(([k, lbl]) => (
              <button key={k} type="button" className={`gc-chip ${advantage === k ? 'active' : ''} ${k}`} aria-pressed={advantage === k} onClick={() => setAdvantage(k)}>{lbl}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="gc-quick" aria-label={L(lang, 'Atalhos de perícia', 'Skill shortcuts')}>
        {QUICK_SKILLS.map(k => (
          <button key={k} type="button" className="gc-quick-btn" disabled={busy} onClick={() => send({ kind: 'skill', key: k })}>
            {tName('skill', k, lang)}
          </button>
        ))}
      </div>
      <div className="gc-quick gc-quick-saves">
        <span className="gc-label">{L(lang, 'Resistência', 'Save')}</span>
        {QUICK_SAVES.map(k => (
          <button key={k} type="button" className="gc-quick-btn is-save" disabled={busy} onClick={() => send({ kind: 'save', key: k })}>
            {abilityAbbr(k, lang)}
          </button>
        ))}
      </div>
      <div className="gc-more">
        <select className="input" value={other} onChange={e => setOther(e.target.value)} aria-label={L(lang, 'Outro teste', 'Other check')}>
          <option value="">{L(lang, 'Outro teste…', 'Other check…')}</option>
          <optgroup label={L(lang, 'Perícias', 'Skills')}>
            {SRD.SKILLS.map(s => <option key={s.id} value={`skill:${s.id}`}>{tName('skill', s.id, lang)}</option>)}
          </optgroup>
          <optgroup label={L(lang, 'Atributo puro', 'Ability check')}>
            {ABILITIES.map(a => <option key={a} value={`ability:${a}`}>{checkLabel({ kind: 'ability', key: a }, lang)}</option>)}
          </optgroup>
        </select>
        <input aria-label={L(lang, 'ou nome livre (ex.: Ferramentas de ladrão)', 'or free text (e.g. Thieves’ tools)')} className="input" value={custom} onChange={e => setCustom(e.target.value)} maxLength={120}
          placeholder={L(lang, 'ou nome livre (ex.: Ferramentas de ladrão)', 'or free text (e.g. Thieves’ tools)')} />
        <button type="button" className="btn btn-primary" disabled={busy || (!other && !custom.trim())} onClick={() => {
          const [kind, key] = other ? other.split(':') : ['custom', ''];
          send({ kind, key, label: custom.trim() || undefined });
          setOther(''); setCustom('');
        }}>
          {L(lang, 'Pedir', 'Ask')}
        </button>
      </div>
      <div className="muted small">
        {L(lang, 'Próximo pedido vai para', 'Next request goes to')}: <strong>{targetText}</strong>
        {dc !== '' && <> · CD {dc}{dcHidden ? ` (${L(lang, 'secreta', 'secret')})` : ''}</>}
        {advantage !== 'normal' && <> · {advantage === 'adv' ? L(lang, 'vantagem', 'advantage') : L(lang, 'desvantagem', 'disadvantage')}</>}
      </div>
      {error && <div className="check-card-error" role="alert">{error}</div>}

      {open.length > 0 && (
        <div className="gc-list">
          {open.map(c => <DMCheckCard key={c.id} check={c} campaign={campaign} lang={lang} act={act} />)}
        </div>
      )}
      {closed.length > 0 && (
        <details className="gc-closed">
          <summary>{L(lang, 'Encerrados', 'Closed')} ({closed.length})</summary>
          <div className="gc-list">
            {closed.map(c => <DMCheckCard key={c.id} check={c} campaign={campaign} lang={lang} act={act} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function DMCheckCard({ check, campaign, lang, act }) {
  const s = summarize(check);
  const isOpen = check.status === 'open';
  return (
    <article className={`gc-card ${isOpen ? 'is-open' : 'is-closed'} ${check.showOnScreen ? 'on-screen' : ''}`}>
      <header className="gc-card-head">
        <div>
          <strong>{check.label}</strong>
          {check.dc != null && <span className="gc-card-dc">CD {check.dc}{check.dcHidden ? ' 🔒' : ''}</span>}
          {check.advantage !== 'normal' && <span className="gc-card-adv">{check.advantage === 'adv' ? 'VTG' : 'DSV'}</span>}
        </div>
        <span className="muted small">
          {s.answered}/{s.total} {L(lang, 'responderam', 'answered')}
          {check.dc != null && s.answered > 0 && <> · <span className="ok">{s.passed}✓</span> <span className="bad">{s.failed}✗</span></>}
        </span>
      </header>
      <ul className="gc-targets">
        {check.targets.map(t => (
          <TargetRow key={t.userId} t={t} check={check} campaign={campaign} lang={lang} act={act} />
        ))}
      </ul>
      <div className="gc-card-actions">
        <button type="button" className={`btn btn-sm ${check.showOnScreen ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => act(() => api.screenCheck(check.id, !check.showOnScreen))}>
          📺 {check.showOnScreen ? L(lang, 'Tirar do telão', 'Hide from TV') : L(lang, 'Mostrar no telão', 'Show on TV')}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => act(() => api.closeCheck(check.id, { reopen: !isOpen }))}>
          {isOpen ? L(lang, 'Encerrar', 'Close') : L(lang, 'Reabrir', 'Reopen')}
        </button>
        <button type="button" className="btn btn-sm btn-ghost gc-remove" aria-label={L(lang, 'Remover pedido', 'Remove request')}
          onClick={() => { if (confirm(L(lang, 'Remover este pedido?', 'Remove this request?'))) act(() => api.deleteCheck(check.id)); }}>
          {L(lang, 'Remover', 'Remove')}
        </button>
      </div>
    </article>
  );
}

function TargetRow({ t, check, lang, act }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const r = t.response;
  const save = (e) => {
    e?.preventDefault?.();
    const n = parseInt(val, 10);
    if (Number.isNaN(n)) return;
    act(() => api.respondCheck(check.id, { userId: t.userId, mode: 'physical', total: n })).then(() => { setEditing(false); setVal(''); });
  };
  const modeIcon = r ? ({ app: '📱', physical: '🎲', dm: '✍' }[r.mode] || '') : '';
  const modeTitle = r ? ({ app: L(lang, 'rolou no app', 'rolled in app'), physical: L(lang, 'dado físico', 'physical die'), dm: L(lang, 'anotado por você', 'entered by you') }[r.mode]) : '';
  return (
    <li className={`gc-target ${t.outcome || (r ? 'answered' : 'waiting')}`}>
      <span className="gc-target-name">{t.characterName || t.displayName}</span>
      {r ? (
        <span className="gc-target-result">
          <span className="gc-target-mode" title={modeTitle}>{modeIcon}</span>
          <span className="gc-target-detail muted small">
            {r.natural != null ? `${r.natural}${r.modifier ? formatMod(r.modifier) : ''}` : ''}
            {r.rigged ? ' ★' : ''}
          </span>
          <strong className="gc-target-total">{r.total}</strong>
          {t.outcome && <span className={`check-outcome ${t.outcome}`}>{t.outcome === 'pass' ? '✓' : '✗'}</span>}
        </span>
      ) : (
        <span className="gc-target-result muted small">{L(lang, 'aguardando…', 'waiting…')}</span>
      )}
      {check.status === 'open' && (
        editing ? (
          <form className="gc-note" onSubmit={save}>
            <input className="input" type="number" inputMode="numeric" autoFocus value={val} onChange={e => setVal(e.target.value)}
              placeholder={L(lang, 'total', 'total')} aria-label={L(lang, `Total de ${t.characterName || t.displayName}`, `Total for ${t.characterName || t.displayName}`)} />
            <button type="submit" className="btn btn-sm btn-primary">OK</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>×</button>
          </form>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost gc-note-btn" onClick={() => setEditing(true)}
            title={L(lang, 'Anotar o total que o jogador falou na mesa', 'Enter the total the player said at the table')}>
            ✍ {r ? L(lang, 'Corrigir', 'Fix') : L(lang, 'Anotar', 'Enter')}
          </button>
        )
      )}
    </li>
  );
}
