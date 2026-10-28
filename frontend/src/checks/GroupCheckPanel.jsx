// Painel do mestre: pedir teste à mesa com um toque e acompanhar respostas.
//
// Toque num atalho ("Percepção") → pedido enviado para os alvos marcados,
// com a CD/vantagem configuradas acima. Cada jogador responde no app ou
// digitando o dado físico; o mestre também pode anotar o que ouviu na mesa.
// Nada vai para a Tela sem o mestre tocar em "Mostrar na Tela".
// Sob cada atalho, o gancho do Raio-X: quem é o melhor da mesa e a chance dele na CD
// ("melhor: Pipo +7 · 65%"), calculado na hora com as fichas que o mestre já tem.
// V7 (folha da Agora): o atalho ⚡ Iniciativa (o mesmo teste `kind:'custom', key:'initiative'`
// do combate rápido, V8: o bônus vem de Utils.initiative na ficha do jogador; num app de
// jogador antigo o modificador não sai e ele digita o total; com um combate montado, as
// respostas entram pelo "Usar e começar" de Jogar › Combate), o
// interruptor "📺 Mostrar na Tela" (ligado quando há uma TV conectada; o teste vai à Tela
// assim que é pedido) e `closeOnSend`: a folha fecha sozinha ao enviar.
import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { tName } from '../../data/i18n.js';
import SRD from '../../data/srd.js';
import {
  QUICK_SKILLS, QUICK_SAVES, ABILITIES, INITIATIVE_KEY, abilityAbbr, checkLabel, buildCheckPayload, summarize,
} from './check-logic.js';
import { formatMod } from '../dice/dice-math.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { bestAt, firstName } from '../group/party-best.js';
import './checks-styles.css';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import { showCheckOnStage } from '../stage/stage-api.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const DC_PRESETS = [10, 12, 15, 18, 20];

// Para quem, CD e dado ficam guardados por campanha enquanto o app está aberto:
// fechar e abrir a folha de novo não perde a configuração do próximo pedido.
const lastConfig = new Map();
const EMPTY_CFG = { dc: '', dcHidden: false, advantage: 'normal', targets: [] };

// showList=false: só o formulário de pedir (a lista fica na lista única de
// Testes, em Jogar › Testes); onSent é chamado depois de cada pedido enviado.
// asSheet: abre como folha da mesa (MesaSheet, onClose fecha), com o "Próximo
// pedido vai para…" preso no rodapé. Sem asSheet: painel de couro na página.
export default function GroupCheckPanel({ campaign, lang = 'pt', showList = true, onSent, asSheet = false, onClose, closeOnSend = false, tvLive = 0 }) {
  const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.user?.id !== campaign.dmId);
  const [cfg, setCfg] = useState(() => ({ ...EMPTY_CFG, ...(lastConfig.get(campaign.id) || {}) }));
  const { dc, dcHidden, advantage, targets } = cfg;
  const setDc = (v) => setCfg(c => ({ ...c, dc: v }));
  const setDcHidden = (fn) => setCfg(c => ({ ...c, dcHidden: typeof fn === 'function' ? fn(c.dcHidden) : fn }));
  const setAdvantage = (v) => setCfg(c => ({ ...c, advantage: v }));
  const setTargets = (fn) => setCfg(c => ({ ...c, targets: typeof fn === 'function' ? fn(c.targets) : fn }));
  useEffect(() => { lastConfig.set(campaign.id, cfg); }, [campaign.id, cfg]);
  const [checks, setChecks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [other, setOther] = useState('');
  const [custom, setCustom] = useState('');
  // 📺 Mostrar na Tela: ligado quando há uma TV conectada (a escolha vale enquanto a folha está aberta)
  const [toScreen, setToScreen] = useState(tvLive > 0);
  // "melhor: Pipo +7 · 65%" — na CD escolhida (sem CD, na 15, a de referência do Raio-X) e
  // com o dado escolhido aqui (vantagem: 1 − (1 − p)²; desvantagem: p²)
  const refDc = dc !== '' && Number.isFinite(+dc) && +dc > 0 ? +dc : 15;
  const members = campaign.members;
  const best = useMemo(() => {
    const out = {};
    for (const k of QUICK_SKILLS) out[`skill:${k}`] = bestAt(members, 'skill', k, refDc, { mode: advantage });
    for (const k of QUICK_SAVES) out[`save:${k}`] = bestAt(members, 'save', k, refDc, { mode: advantage });
    return out;
  }, [members, refDc, advantage]);
  const modeText = advantage === 'adv' ? L(lang, ' com vantagem', ' with advantage') : advantage === 'dis' ? L(lang, ' com desvantagem', ' with disadvantage') : '';
  const bestLine = (b) => {
    if (!b) return null;
    const who = b.who.length > 2 ? L(lang, `${b.who.length} empatados`, `${b.who.length} tied`) : b.who.map(firstName).join('/');
    return `${L(lang, 'melhor', 'best')}: ${who} ${formatMod(b.best)} · ${b.p}%`;
  };
  const bestAria = (b) => (b ? L(lang, `, melhor da mesa: ${b.who.join(', ')} ${formatMod(b.best)}, ${b.p}% na CD ${refDc}${modeText}`, `, best at the table: ${b.who.join(', ')} ${formatMod(b.best)}, ${b.p}% at DC ${refDc}${modeText}`) : '');
  const hasBest = Object.values(best).some(Boolean);

  const load = useCallback(async () => {
    if (!showList) return;
    try {
      const r = await api.listChecks(campaign.id);
      setChecks(r.checks || []);
    } catch { /* polling */ }
  }, [campaign.id, showList]);
  usePolling(async () => { if (showList) await load(); }, 2500, [campaign.id, showList]);

  const send = async (spec) => {
    if (!players.length) { setError(L(lang, 'Nenhum jogador na campanha ainda.', 'No players in this campaign yet.')); return; }
    setBusy(true); setError(''); setSent('');
    try {
      const body = buildCheckPayload({ ...spec, dc, dcHidden, advantage, targets }, lang);
      const r = await api.createCheck(campaign.id, body);
      if (navigator.vibrate) navigator.vibrate(20);
      setSent(body.label);
      if (asSheet && toScreen && r?.check?.id) {
        try { await showCheckOnStage(r.check.id, true); } catch { /* o teste foi; o 📺 do painel tenta de novo */ }
      }
      await load();
      onSent?.(body, r?.check || null);
      if (closeOnSend) onClose?.();
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

  const form = (
    <>
      <div className="group-checks-config">
        <div className="gc-field">
          <span className="gc-label">{L(lang, 'Para', 'To')}</span>
          <div className="gc-chips">
            <button type="button" className={`mesa-chip gc-chip ${targets.length === 0 ? 'active' : ''}`} aria-pressed={targets.length === 0} onClick={() => setTargets([])}>
              {L(lang, 'Todos', 'Everyone')}
            </button>
            {players.map(p => (
              <button key={p.user.id} type="button" className={`mesa-chip gc-chip ${targets.includes(p.user.id) ? 'active' : ''}`}
                aria-pressed={targets.includes(p.user.id)} onClick={() => toggleTarget(p.user.id)}>
                {p.character?.name || p.user.displayName}
              </button>
            ))}
          </div>
        </div>
        <div className="gc-field">
          <span className="gc-label">CD</span>
          <div className="gc-chips gc-dc">
            <button type="button" className={`mesa-chip gc-chip ${dc === '' ? 'active' : ''}`} aria-pressed={dc === ''} onClick={() => setDc('')}>{L(lang, 'sem', 'none')}</button>
            {DC_PRESETS.map(v => (
              <button key={v} type="button" className={`mesa-chip gc-chip ${String(dc) === String(v) ? 'active' : ''}`} aria-pressed={String(dc) === String(v)} onClick={() => setDc(String(v))}>{v}</button>
            ))}
            <input className="input gc-dc-input" type="number" inputMode="numeric" min={1} max={40} value={dc}
              onChange={e => setDc(e.target.value)} aria-label={L(lang, 'CD personalizada', 'Custom DC')} placeholder="…" />
            <button type="button" className={`mesa-chip gc-chip gc-secret ${dcHidden && dc !== '' ? 'active' : ''}`} aria-pressed={dcHidden && dc !== ''}
              disabled={dc === ''} onClick={() => setDcHidden(v => !v)}
              title={L(lang, 'Jogadores e a Tela não veem a CD', 'Players and the screen do not see the DC')}>
              🔒 {L(lang, 'CD secreta', 'Secret DC')}
            </button>
          </div>
          <p className="gc-hint">{L(lang, 'CD secreta: os jogadores e a Tela não veem o número nem quem passou; você vê.', 'Secret DC: players and the screen see neither the number nor who passed; you do.')}</p>
        </div>
        <div className="gc-field">
          <span className="gc-label">{L(lang, 'Dado', 'Roll')}</span>
          <div className="gc-chips gc-adv">
            {[['normal', L(lang, 'Normal', 'Normal')], ['adv', L(lang, 'Vantagem', 'Advantage')], ['dis', L(lang, 'Desvantagem', 'Disadvantage')]].map(([k, lbl]) => (
              <button key={k} type="button" className={`mesa-chip gc-chip ${advantage === k ? 'active' : ''} ${k}`} aria-pressed={advantage === k} onClick={() => setAdvantage(k)}>{lbl}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="gc-field">
        <span className="gc-label">{L(lang, 'Perícia (um toque envia)', 'Skill (one tap sends)')}</span>
        {hasBest && (
          <p className="gc-hint">{dc === ''
            ? L(lang, `Embaixo de cada atalho: o melhor da mesa e a chance dele na CD ${refDc}${modeText} (sem CD escolhida).`, `Under each shortcut: the best at the table and their chance at DC ${refDc}${modeText} (no DC picked).`)
            : L(lang, `Embaixo de cada atalho: o melhor da mesa e a chance dele na CD ${refDc}${modeText}.`, `Under each shortcut: the best at the table and their chance at DC ${refDc}${modeText}.`)}</p>
        )}
        <div className="gc-quick" aria-label={L(lang, 'Atalhos de perícia', 'Skill shortcuts')}>
          {QUICK_SKILLS.map(k => (
            <button key={k} type="button" className="gc-quick-btn" disabled={busy} onClick={() => send({ kind: 'skill', key: k })}
              aria-label={`${tName('skill', k, lang)}${bestAria(best[`skill:${k}`])}`}>
              <span className="gc-quick-name">{tName('skill', k, lang)}</span>
              {best[`skill:${k}`] && <span className="gc-quick-best" aria-hidden="true">{bestLine(best[`skill:${k}`])}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="gc-field">
        <span className="gc-label">{L(lang, 'Iniciativa', 'Initiative')}</span>
        <div className="gc-quick gc-quick-init">
          <button type="button" className="gc-quick-btn is-init" disabled={busy}
            onClick={() => send({ kind: 'custom', key: INITIATIVE_KEY })}>
            <span className="gc-quick-name">⚡ {L(lang, 'Iniciativa', 'Initiative')}</span>
            <span className="gc-quick-best">{L(lang, 'cada um rola a sua', 'everyone rolls theirs')}</span>
          </button>
        </div>
      </div>
      <div className="gc-field">
        <span className="gc-label">{L(lang, 'Resistência', 'Save')}</span>
        <div className="gc-quick gc-quick-saves">
          {QUICK_SAVES.map(k => (
            <button key={k} type="button" className="gc-quick-btn is-save" disabled={busy} onClick={() => send({ kind: 'save', key: k })}
              aria-label={`${abilityAbbr(k, lang)}${bestAria(best[`save:${k}`])}`}>
              <span className="gc-quick-name">{abilityAbbr(k, lang)}</span>
              {best[`save:${k}`] && <span className="gc-quick-best" aria-hidden="true">{bestLine(best[`save:${k}`])}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="gc-field">
        <span className="gc-label">{L(lang, 'Outro teste', 'Other check')}</span>
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
          <button type="button" className="mesa-btn is-primary gc-more-send" disabled={busy || (!other && !custom.trim())} onClick={() => {
            const [kind, key] = other ? other.split(':') : ['custom', ''];
            send({ kind, key, label: custom.trim() || undefined });
            setOther(''); setCustom('');
          }}>
            {L(lang, 'Pedir', 'Ask')}
          </button>
        </div>
      </div>
      {error && <div className="check-card-error" role="alert">{error}</div>}
    </>
  );

  const summary = (
    <p className="gc-summary">
      {L(lang, 'Próximo pedido vai para', 'Next request goes to')}: <strong>{targetText}</strong>
      {dc !== '' && <> · CD {dc}{dcHidden ? ` (${L(lang, 'secreta', 'secret')})` : ''}</>}
      {advantage !== 'normal' && <> · {advantage === 'adv' ? L(lang, 'vantagem', 'advantage') : L(lang, 'desvantagem', 'disadvantage')}</>}
    </p>
  );
  const sentLine = sent
    ? <p className="gc-sent" role="status">✓ {L(lang, `Pedido enviado: ${sent}. Acompanhe em Testes › Abertos.`, `Request sent: ${sent}. Follow it in Checks › Open.`)}</p>
    : null;

  if (asSheet) {
    return (
      <MesaSheet title={L(lang, 'Pedir teste à mesa', 'Ask the table for a check')} icon="🎯" size="tall" width="md" lang={lang} dock="play"
        onClose={onClose} className="gc-sheet" bodyClassName="group-checks is-sheet"
        footer={(
          <div className="gc-foot">
            <label className="gc-screen">
              <input type="checkbox" checked={toScreen} onChange={e => setToScreen(e.target.checked)} />
              <span>📺 {L(lang, 'Mostrar na Tela', 'Show on screen')}{tvLive > 0 ? '' : <span className="gc-screen-sub"> · {L(lang, 'nenhuma TV conectada', 'no TV connected')}</span>}</span>
            </label>
            <div className="gc-foot-text">{sentLine}{summary}</div>
            <button type="button" className="mesa-btn is-primary gc-done" onClick={onClose}>{L(lang, 'Pronto', 'Done')}</button>
          </div>
        )}>
        <p className="mesa-sheet-text">
          {L(lang, 'Um toque numa perícia envia. Os jogadores rolam no app ou digitam o dado físico.', 'One tap on a skill sends. Players roll in the app or type their physical die.')}
        </p>
        {form}
      </MesaSheet>
    );
  }

  return (
    <section className="mesa-panel group-checks" aria-labelledby="gc-h">
      <MesaTitle id="gc-h" sub={L(lang, 'Um toque numa perícia envia. Os jogadores rolam no app ou digitam o dado físico.', 'One tap on a skill sends. Players roll in the app or type their physical die.')}>
        {L(lang, 'Pedir teste à mesa', 'Ask the table for a check')}
      </MesaTitle>
      {form}
      {sentLine}
      {summary}

      {showList && open.length > 0 && (
        <div className="gc-list">
          {open.map(c => <DMCheckCard key={c.id} check={c} campaign={campaign} lang={lang} act={act} />)}
        </div>
      )}
      {showList && closed.length > 0 && (
        <details className="gc-closed">
          <summary>{L(lang, 'Encerrados', 'Closed')} ({closed.length})</summary>
          <div className="gc-list">
            {closed.map(c => <DMCheckCard key={c.id} check={c} campaign={campaign} lang={lang} act={act} />)}
          </div>
        </details>
      )}
    </section>
  );
}

export function DMCheckCard({ check, campaign, lang, act }) {
  const s = summarize(check);
  const isOpen = check.status === 'open';
  return (
    <article className={`gc-card ${isOpen ? 'is-open' : 'is-closed'} ${check.showOnScreen ? 'on-screen' : ''}`}>
      <header className="gc-card-head">
        <div className="gc-card-what">
          <span className="tl-kind">🎯 {L(lang, 'Teste à mesa', 'Table check')}</span>
          <strong>{check.label}</strong>
          {check.dc != null && <span className="gc-card-dc">CD {check.dc}{check.dcHidden ? ` 🔒 ${L(lang, 'secreta', 'secret')}` : ''}</span>}
          {check.advantage !== 'normal' && <span className="gc-card-adv">{check.advantage === 'adv' ? L(lang, 'vantagem', 'advantage') : L(lang, 'desvantagem', 'disadvantage')}</span>}
        </div>
        <span className="gc-card-count">
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
        {/* O 📺 único: mostra/tira o teste da Tela com o aviso de sempre (Encerrar também tira). */}
        {isOpen ? (
          <ShowOnTable campaign={campaign} lang={lang} target={{ kind: 'check', check }}
            className={`mesa-btn ${check.showOnScreen ? 'is-primary' : ''}`} onShown={() => act(async () => {})} />
        ) : (
          <button type="button" className="mesa-btn" disabled>📺 {L(lang, 'Encerrado: reabra para mostrar', 'Closed: reopen to show')}</button>
        )}
        <button type="button" className="mesa-btn" onClick={() => act(() => api.closeCheck(check.id, { reopen: !isOpen }))}>
          {isOpen ? L(lang, 'Encerrar', 'Close') : L(lang, 'Reabrir', 'Reopen')}
        </button>
        <button type="button" className="mesa-btn is-quiet gc-remove" aria-label={L(lang, 'Remover pedido', 'Remove request')}
          onClick={async () => {
            if (await confirmDialog({ lang, danger: true, message: L(lang, 'Remover este pedido?', 'Remove this request?'), confirmLabel: L(lang, 'Remover', 'Remove') })) act(() => api.deleteCheck(check.id));
          }}>
          🗑 {L(lang, 'Remover', 'Remove')}
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
  const modeTitle = r ? ({ app: L(lang, 'no app', 'in app'), physical: L(lang, 'dado físico', 'physical die'), dm: L(lang, 'anotado por você', 'entered by you') }[r.mode]) : '';
  return (
    <li className={`gc-target ${t.outcome || (r ? 'answered' : 'waiting')}`}>
      <span className="gc-target-name">{t.characterName || t.displayName}</span>
      {r ? (
        <span className="gc-target-result">
          <span className="gc-target-mode"><span aria-hidden="true">{modeIcon}</span> {modeTitle}</span>
          <span className="gc-target-detail">
            {r.natural != null ? `${r.natural}${r.modifier ? formatMod(r.modifier) : ''}` : ''}
            {r.rigged ? ' ★' : ''}
          </span>
          <strong className="gc-target-total">{r.total}</strong>
          {t.outcome && <span className={`check-outcome ${t.outcome}`}>{t.outcome === 'pass' ? '✓' : '✗'}</span>}
        </span>
      ) : (
        <span className="gc-target-result gc-target-wait">{L(lang, 'aguardando…', 'waiting…')}</span>
      )}
      {check.status === 'open' && (
        editing ? (
          <form className="gc-note" onSubmit={save}>
            <input className="input" type="number" inputMode="numeric" autoFocus value={val} onChange={e => setVal(e.target.value)}
              placeholder={L(lang, 'total', 'total')} aria-label={L(lang, `Total de ${t.characterName || t.displayName}`, `Total for ${t.characterName || t.displayName}`)} />
            <button type="submit" className="mesa-btn is-primary">OK</button>
            <button type="button" className="mesa-icon-btn" onClick={() => setEditing(false)} aria-label={L(lang, 'Cancelar', 'Cancel')}>✕</button>
          </form>
        ) : (
          <button type="button" className="mesa-btn gc-note-btn" onClick={() => setEditing(true)}
            title={L(lang, 'Anotar o total que o jogador falou na mesa', 'Enter the total the player said at the table')}>
            ✍ {r ? L(lang, 'Corrigir', 'Fix') : L(lang, 'Anotar', 'Enter')}
          </button>
        )
      )}
    </li>
  );
}
