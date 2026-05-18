import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const PRESETS = [
  { label: { pt: 'Percepção', en: 'Perception' }, dice: 'd20', mod: 0 },
  { label: { pt: 'Furtividade', en: 'Stealth' }, dice: 'd20', mod: 0 },
  { label: { pt: 'Persuasão', en: 'Persuasion' }, dice: 'd20', mod: 0 },
  { label: { pt: 'Intuição', en: 'Insight' }, dice: 'd20', mod: 0 },
  { label: { pt: 'Investigação', en: 'Investigation' }, dice: 'd20', mod: 0 },
  { label: { pt: 'Atletismo', en: 'Athletics' }, dice: 'd20', mod: 0 },
];

/**
 * Painel de rolagens DM-gated:
 *  - Jogador: form pra criar pedido + lista das próprias pendentes + histórico.
 *  - DM: lista de pendings com botões "Mostrar no telão" / "Privado" / cancelar.
 *      Pode injetar valor via DiceRig antes de aprovar (já é automático: se houver
 *      rig pra esse jogador+dado, será consumido).
 */
export default function RollRequestPanel({ campaign, lang, isDM, onChange }) {
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [label, setLabel] = useState('');
  const [dice, setDice] = useState('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [adv, setAdv] = useState(false);
  const [dis, setDis] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        api.listPendingRolls(campaign.id),
        api.listRecentRolls(campaign.id),
      ]);
      setPending(p.rolls || []);
      setRecent(r.rolls || []);
    } catch (e) { /* ignore */ }
  }, [campaign.id]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 2500, [campaign.id]);

  const createRoll = async (overrides = {}) => {
    await api.createRoll(campaign.id, {
      label: overrides.label || label || t(lang, 'Rolagem', 'Roll'),
      diceType: overrides.dice || dice,
      count: overrides.count || count,
      modifier: overrides.mod !== undefined ? overrides.mod : modifier,
      hasAdvantage: adv && !dis,
      hasDisadvantage: dis && !adv,
    });
    setLabel('');
    setModifier(0);
    setAdv(false); setDis(false);
    load();
  };

  const resolve = async (id, visibility, extra = {}) => {
    await api.resolveRoll(id, { visibility, ...extra });
    load();
    onChange?.();
  };

  const cancel = async (id) => {
    await api.cancelRoll(id);
    load();
  };

  return (
    <div className="rolls-panel col gap-3">
      {/* Form criar pedido */}
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>
          {isDM
            ? t(lang, 'Rolar (mestre)', 'Roll (DM)')
            : t(lang, 'Pedir rolagem ao mestre', 'Request a roll')}
        </h3>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 0, fontSize: '0.9em' }}>
          {isDM
            ? t(lang, 'Mesmo o mestre pode pedir — ela passa pelo seu próprio crivo (privado por padrão).', 'You can request a roll too — passes through your own gate.')
            : t(lang, 'Você manda o pedido; o mestre decide se exibe no telão ou roda privado.', 'You send the request; the DM decides if it shows on the TV or rolls private.')}
        </p>
        <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder={t(lang, 'rótulo (ex: percepção)', 'label (e.g. perception)')} value={label} onChange={e => setLabel(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <select className="input" value={dice} onChange={e => setDice(e.target.value)}>
            {['d4','d6','d8','d10','d12','d20','d100'].map(d => <option key={d}>{d}</option>)}
          </select>
          <input type="number" className="input" min={1} max={20} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} style={{ width: 60 }} />
          <span className="muted">+</span>
          <input type="number" className="input" value={modifier} onChange={e => setModifier(parseInt(e.target.value) || 0)} style={{ width: 70 }} />
          <label className="row gap-1" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={adv} onChange={e => { setAdv(e.target.checked); if (e.target.checked) setDis(false); }} />
            <span>vant.</span>
          </label>
          <label className="row gap-1" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={dis} onChange={e => { setDis(e.target.checked); if (e.target.checked) setAdv(false); }} />
            <span>desv.</span>
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => createRoll()}>
            🎲 {t(lang, 'Pedir', 'Request')}
          </button>
        </div>
        <div className="row gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <span className="muted small">{t(lang, 'Atalhos:', 'Shortcuts:')}</span>
          {PRESETS.map(p => (
            <button key={p.label.en} className="btn btn-ghost btn-sm" onClick={() => createRoll({ label: p.label[lang] || p.label.en, dice: p.dice, mod: p.mod })}>
              {p.label[lang] || p.label.en}
            </button>
          ))}
        </div>
      </div>

      {/* Pendentes */}
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Pendentes', 'Pending')} ({pending.length})</h3>
        {pending.length === 0 ? (
          <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhuma pendente.', 'None pending.')}</p>
        ) : pending.map(r => (
          isDM
            ? <PendingDMRow key={r.id} r={r} lang={lang} onResolve={resolve} onCancel={cancel} />
            : <PendingPlayerRow key={r.id} r={r} lang={lang} />
        ))}
      </div>

      {/* Histórico */}
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Histórico recente', 'Recent rolls')}</h3>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nada ainda.', 'Nothing yet.')}</p>
        ) : recent.map(r => (
          <div key={r.id} className={`roll-row history ${r.status} ${r.isCritical ? 'critical' : ''} ${r.isCriticalFail ? 'critfail' : ''}`}>
            <div>
              <strong>{r.requestedBy?.displayName}</strong>
              <span style={{ marginLeft: 6 }}>{r.label || r.diceType}</span>
              {r.status === 'public' && <span className="pill pill-pending" style={{ marginLeft: 8 }}>📺</span>}
              {r.status === 'private' && <span className="muted small" style={{ marginLeft: 8 }}>🔒</span>}
              {r.rigged && <span className="muted small" style={{ marginLeft: 6 }}>★</span>}
            </div>
            <div className="roll-result">
              <span className="muted small">
                [{r.rolls.filter(x => x.kept).map(x => x.value).join(', ')}]
                {r.modifier ? ` ${r.modifier >= 0 ? '+' : ''}${r.modifier}` : ''}
              </span>
              <span className="roll-total">{r.total}</span>
              {r.isCritical && <span className="crit-tag">CRIT</span>}
              {r.isCriticalFail && <span className="critfail-tag">FALHA</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingPlayerRow({ r, lang }) {
  return (
    <div className="roll-row">
      <div>
        <strong>{r.requestedBy?.displayName}</strong>
        <span style={{ marginLeft: 6 }}>{r.label || r.diceType}</span>
        <span className="muted small" style={{ marginLeft: 6 }}>
          {r.count > 1 ? `${r.count}` : ''}{r.diceType}
          {r.modifier ? `${r.modifier >= 0 ? '+' : ''}${r.modifier}` : ''}
          {r.hasAdvantage ? ' · vantagem' : ''}
          {r.hasDisadvantage ? ' · desvantagem' : ''}
        </span>
      </div>
      <div className="row gap-2">
        <span className="muted small">{t(lang, 'aguardando mestre…', 'waiting for DM…')}</span>
      </div>
    </div>
  );
}

// M1: DM pode forçar valor exibido na rolagem (pra calibrar drama no telão).
function PendingDMRow({ r, lang, onResolve, onCancel }) {
  const sides = { d4:4, d6:6, d8:8, d10:10, d12:12, d20:20, d100:100 }[r.diceType] || 20;
  const [override, setOverride] = useState('');
  const [show, setShow] = useState(false);

  const handleShowAsIs = () => onResolve(r.id, 'public');
  const handleShowOverride = () => {
    const n = parseInt(override, 10);
    if (!override || Number.isNaN(n)) { alert(t(lang, `Informe um valor entre 1 e ${sides}.`, `Enter a value between 1 and ${sides}.`)); return; }
    if (n < 1 || n > sides) { alert(t(lang, `Valor inválido (1-${sides}).`, `Invalid value (1-${sides}).`)); return; }
    onResolve(r.id, 'public', { overrideValue: n });
  };

  return (
    <div className="roll-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong>{r.requestedBy?.displayName}</strong>
          <span style={{ marginLeft: 6 }}>{r.label || r.diceType}</span>
          <span className="muted small" style={{ marginLeft: 6 }}>
            {r.count > 1 ? `${r.count}` : ''}{r.diceType}
            {r.modifier ? `${r.modifier >= 0 ? '+' : ''}${r.modifier}` : ''}
            {r.hasAdvantage ? ' · vantagem' : ''}
            {r.hasDisadvantage ? ' · desvantagem' : ''}
          </span>
        </div>
        <div className="row gap-2">
          <button className="btn btn-primary btn-sm" onClick={handleShowAsIs}>
            📺 {t(lang, 'Mostrar (rolar)', 'Show (roll)')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShow(v => !v)} title={t(lang, 'Mostrar com valor customizado', 'Show with custom value')}>
            ✏ {t(lang, 'Valor manual', 'Manual value')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onResolve(r.id, 'private')}>
            🔒 {t(lang, 'Privado', 'Private')}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={() => onCancel(r.id)}>×</button>
        </div>
      </div>
      {show && (
        <div className="row gap-2" style={{ alignItems: 'center', background: 'rgba(212,168,77,0.08)', padding: '6px 8px', borderRadius: 4 }}>
          <span className="muted small">{t(lang, 'Valor a exibir', 'Value to show')}:</span>
          <input
            type="number"
            className="input"
            min={1}
            max={sides}
            value={override}
            onChange={e => setOverride(e.target.value)}
            style={{ width: 80 }}
            placeholder={`1-${sides}`}
            autoFocus
          />
          <span className="muted small">
            {r.modifier ? `${r.modifier >= 0 ? '+' : ''}${r.modifier} = ${(parseInt(override) || 0) + r.modifier}` : ''}
          </span>
          <button className="btn btn-primary btn-sm" onClick={handleShowOverride}>
            📺 {t(lang, 'Mostrar com este valor', 'Show with this value')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShow(false); setOverride(''); }}>
            {t(lang, 'Cancelar', 'Cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
