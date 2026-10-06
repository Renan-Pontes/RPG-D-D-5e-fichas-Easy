import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import PlayerCampaignChecks from '../checks/PlayerCampaignChecks.jsx';
import TestsPanel from '../play/TestsPanel.jsx';
import { PendingPlayerRow, RollHistoryRow } from '../play/RollRows.jsx';

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
 * Mestre: a lista única de Testes (Jogar › Testes). Jogador: pedir rolagem ao
 * mestre + os próprios pedidos e o histórico.
 */
export default function RollRequestPanel(props) {
  if (props.isDM) return <TestsPanel campaign={props.campaign} lang={props.lang} onChange={props.onChange} />;
  return <PlayerRollPanel {...props} />;
}

/**
 * Painel de rolagens DM-gated (lado do jogador):
 *  - Jogador: form pra criar pedido + lista das próprias pendentes + histórico.
 *  - DM: lista de pendings com botões "Mostrar no telão" / "Privado" / cancelar.
 *      Pode injetar valor via DiceRig antes de aprovar (já é automático: se houver
 *      rig pra esse jogador+dado, será consumido).
 */
function PlayerRollPanel({ campaign, lang, isDM, onChange }) {
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [label, setLabel] = useState('');
  const [dice, setDice] = useState('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [adv, setAdv] = useState(false);
  const [dis, setDis] = useState(false);

  // Ids dos meus pedidos pendentes: quando o mestre resolve, mostra o dado
  // (3D) com o valor que veio do servidor.
  const myPendingRef = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        api.listPendingRolls(campaign.id),
        api.listRecentRolls(campaign.id),
      ]);
      const pend = p.rolls || [];
      const rec = r.rolls || [];
      if (!isDM) {
        for (const roll of rec) {
          if (myPendingRef.current.has(roll.id) && roll.status !== 'cancelled' && roll.rolls?.length) {
            window.__diceShow?.({
              label: roll.label || roll.diceType,
              groups: [{ die: parseInt(String(roll.diceType).replace('d', ''), 10) || 20, rolls: roll.rolls }],
              mod: roll.modifier || 0,
              total: roll.total,
              isCrit: roll.isCritical,
              isFumble: roll.isCriticalFail,
            });
          }
        }
        myPendingRef.current = new Set(pend.map(x => x.id));
      }
      setPending(pend);
      setRecent(rec);
    } catch (e) { /* ignore */ }
  }, [campaign.id, isDM]);

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
      <PlayerCampaignChecks campaign={campaign} lang={lang} />
      {/* Form criar pedido */}
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Pedir rolagem ao mestre', 'Request a roll')}</h3>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 0, fontSize: '0.9em' }}>
          {t(lang, 'Você manda o pedido; o mestre decide se mostra no telão ou rola em segredo.', 'You send the request; the DM decides whether it shows on the TV or rolls privately.')}
        </p>
        <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <input aria-label={t(lang, 'rótulo (ex: percepção)', 'label (e.g. perception)')} className="input" placeholder={t(lang, 'rótulo (ex: percepção)', 'label (e.g. perception)')} value={label} onChange={e => setLabel(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <select className="input" value={dice} onChange={e => setDice(e.target.value)} aria-label={t(lang, 'Dado', 'Die')}>
            {['d4','d6','d8','d10','d12','d20','d100'].map(d => <option key={d}>{d}</option>)}
          </select>
          <input type="number" className="input" min={1} max={20} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} style={{ width: 60 }} aria-label={t(lang, 'Quantidade', 'Count')} />
          <span className="muted">+</span>
          <input type="number" className="input" value={modifier} onChange={e => setModifier(parseInt(e.target.value) || 0)} style={{ width: 70 }} aria-label={t(lang, 'Modificador', 'Modifier')} />
          <label className="roll-check">
            <input type="checkbox" checked={adv} onChange={e => { setAdv(e.target.checked); if (e.target.checked) setDis(false); }} />
            <span>{t(lang, 'vantagem', 'advantage')}</span>
          </label>
          <label className="roll-check">
            <input type="checkbox" checked={dis} onChange={e => { setDis(e.target.checked); if (e.target.checked) setAdv(false); }} />
            <span>{t(lang, 'desvantagem', 'disadvantage')}</span>
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
        ) : pending.map(r => <PendingPlayerRow key={r.id} r={r} lang={lang} />)}
      </div>

      {/* Histórico */}
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Histórico recente', 'Recent rolls')}</h3>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nada ainda.', 'Nothing yet.')}</p>
        ) : recent.map(r => <RollHistoryRow key={r.id} r={r} lang={lang} />)}
      </div>
    </div>
  );
}

