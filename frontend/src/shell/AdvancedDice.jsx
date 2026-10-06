// Ferramenta avançada "Dados preparados pelo mestre" (antiga aba Dados).
// Opt-in: só aparece em ⚙ Ajustes › Ferramentas avançadas quando ligada.
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;
const ask = (message) => confirmDialog({ message, danger: true });

/**
 * DiceTab — UX completa do dice rigging:
 *  - Cards por jogador agrupando todas as filas dele
 *  - Reordenar valores (↑↓), apagar individual, injetar inline
 *  - Limpar fila inteira (volta a aleatório)
 *  - Histórico das últimas N rolagens (com flag rigged)
 *  - Atalhos: Enter para enfileirar, Delete pra limpar
 */
export default function AdvancedDice({ campaign, lang }) {
  const [rigs, setRigs] = useState([]);
  const load = useCallback(async () => {
    try { const r = await api.listRigs(campaign.id); setRigs(r.rigs || []); } catch { /* mantém */ }
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);
  return <DiceTab campaign={campaign} rigs={rigs} lang={lang} onChange={load} />;
}

function DiceTab({ campaign, rigs, lang, onChange }) {
  const [diceType, setDiceType] = useState('d20');
  const [valuesText, setValuesText] = useState('');
  const [activeTarget, setActiveTarget] = useState(null);
  const [log, setLog] = useState([]);

  const players = campaign.members.filter(m => m.role !== 'dm');

  // Carrega histórico
  const loadLog = useCallback(async () => {
    try {
      const r = await api.diceLog(campaign.id);
      setLog(r.log || []);
    } catch (e) { /* ignore */ }
  }, [campaign.id]);
  useEffect(() => { loadLog(); }, [loadLog]);
  // Recarrega histórico junto com mudanças
  useEffect(() => { loadLog(); }, [rigs, loadLog]);

  const parseValues = (s) => s.split(/[,\s]+/).filter(Boolean).map(v => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? { value: n } : null;
  }).filter(Boolean);

  const enqueue = async (targetUserId) => {
    const values = parseValues(valuesText);
    if (!values.length || !targetUserId) return;
    await api.createRig(campaign.id, { targetUserId, diceType, values });
    setValuesText('');
    onChange();
  };

  const injectOne = async (targetUserId, value) => {
    if (!Number.isFinite(value)) return;
    await api.createRig(campaign.id, { targetUserId, diceType: 'any', values: [{ value }] });
    onChange();
  };

  const deleteRig = async (id) => {
    await api.deleteRig(id);
    onChange();
  };

  const reorderRig = async (rig, from, to) => {
    if (to < 0 || to >= rig.values.length) return;
    const v = [...rig.values];
    const [item] = v.splice(from, 1);
    v.splice(to, 0, item);
    await api.updateRig(rig.id, { values: v });
    onChange();
  };

  const removeValue = async (rig, idx) => {
    const v = rig.values.filter((_, i) => i !== idx);
    if (v.length === 0) {
      await api.deleteRig(rig.id);
    } else {
      await api.updateRig(rig.id, { values: v });
    }
    onChange();
  };

  const clearAllForPlayer = async (userId) => {
    if (!await ask(t(lang, 'Limpar todas as filas deste jogador?', 'Clear all queues for this player?'))) return;
    const playerRigs = rigs.filter(r => r.targetUser?.id === userId || r.targetUserId === userId);
    await Promise.all(playerRigs.map(r => api.deleteRig(r.id)));
    onChange();
  };

  // Agrupa rigs por jogador
  const rigsByPlayer = {};
  for (const r of rigs) {
    const uid = r.targetUser?.id ?? r.targetUserId;
    if (!rigsByPlayer[uid]) rigsByPlayer[uid] = [];
    rigsByPlayer[uid].push(r);
  }

  return (
    <div className="col gap-3">
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Dados preparados pelo mestre', 'DM-prepared dice')}</h3>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 0 }}>
          {t(lang,
            'Defina os próximos valores que cada jogador "rolará". Quando eles rolarem pelo app, esses valores serão usados na ordem. Eles não veem isto.',
            'Set the next values each player will "roll". When they roll via the app, these values are used in order. They cannot see this.'
          )}
        </p>
        <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={diceType} onChange={e => setDiceType(e.target.value)} className="input">
            {['d20','d12','d10','d8','d6','d4','d100','any'].map(d => (
              <option key={d} value={d}>{d === 'any' ? t(lang, 'Qualquer', 'Any') : d}</option>
            ))}
          </select>
          <input aria-label={t(lang, 'Valores: 15, 12, 18 (Enter adiciona à fila)', 'Values: 15, 12, 18 (Enter adds to queue)')}
            value={valuesText}
            onChange={e => setValuesText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && activeTarget) enqueue(activeTarget); }}
            placeholder={t(lang, 'Valores: 15, 12, 18 (Enter adiciona à fila)', 'Values: 15, 12, 18 (Enter adds to queue)')}
            className="input"
            style={{ flex: 1, minWidth: 240 }}
          />
        </div>
      </div>

      {players.map(p => {
        const uid = p.user.id;
        const playerRigs = rigsByPlayer[uid] || [];
        const totalPending = playerRigs.reduce((acc, r) => acc + r.values.filter(v => !v.consumed).length, 0);
        const isActive = activeTarget === uid;
        return (
          <div key={p.id} className={`player-dice-card ${isActive ? 'active' : ''}`}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.user.displayName}</strong>
                {p.character && <span style={{ color: 'var(--ink-secondary)', marginLeft: 8 }}>{p.character.name}</span>}
                {totalPending > 0 && (
                  <span className="pill pill-pending" style={{ marginLeft: 8 }}>
                    {totalPending} {t(lang, 'na fila', 'queued')}
                  </span>
                )}
              </div>
              <div className="row gap-2">
                <button
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTarget(isActive ? null : uid)}
                  aria-pressed={isActive}
                >
                  {isActive ? t(lang, 'Alvo selecionado ✓', 'Target selected ✓') : t(lang, 'Selecionar como alvo', 'Select as target')}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => enqueue(uid)}
                  disabled={!valuesText.trim()}
                  title={t(lang, 'Adicionar os valores acima à fila deste jogador', 'Add the values above to this player\'s queue')}
                >
                  ➕ {t(lang, 'Adicionar à fila', 'Add to queue')}
                </button>
                {playerRigs.length > 0 && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} onClick={() => clearAllForPlayer(uid)}>
                    {t(lang, 'Limpar tudo', 'Clear all')}
                  </button>
                )}
              </div>
            </div>

            {playerRigs.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontStyle: 'italic', margin: '8px 0 0' }}>
                {t(lang, 'Sem rolagens enfileiradas. Rolagens deste jogador serão aleatórias.',
                  'No queued rolls. This player\'s rolls will be random.')}
              </p>
            ) : (
              playerRigs.map(rig => (
                <RigRow
                  key={rig.id}
                  rig={rig}
                  lang={lang}
                  onMoveUp={i => reorderRig(rig, i, i - 1)}
                  onMoveDown={i => reorderRig(rig, i, i + 1)}
                  onRemoveValue={i => removeValue(rig, i)}
                  onDeleteRig={() => deleteRig(rig.id)}
                />
              ))
            )}

            <QuickInject lang={lang} onInject={v => injectOne(uid, v)} />
          </div>
        );
      })}

      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Histórico de rolagens', 'Rolls history')}</h3>
        {log.length === 0 ? (
          <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhuma rolagem ainda. As rolagens feitas na ficha dentro da campanha aparecem aqui.', 'No rolls yet. Rolls made from sheets in this campaign show up here.')}</p>
        ) : (
          <div className="dice-log">
            {log.slice(0, 50).map(r => {
              const player = players.find(p => p.user.id === r.user_id);
              return (
                <div key={r.id} className="dice-log-row">
                  <span className={`dice-log-result ${r.rigged ? 'rigged' : ''}`}>{r.result}</span>
                  <span className="dice-log-type">{r.dice_type}</span>
                  <span className="dice-log-who">{player?.user.displayName || `#${r.user_id}`}</span>
                  {r.label && <span className="dice-log-label">{r.label}</span>}
                  {r.rigged && <span className="dice-log-flag" title={t(lang, 'Valor da fila do mestre', 'From DM queue')}>★</span>}
                  <span className="dice-log-time">{new Date(r.created_at).toLocaleTimeString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RigRow({ rig, lang, onMoveUp, onMoveDown, onRemoveValue, onDeleteRig }) {
  return (
    <div className="rig-detailed">
      <div style={{ fontSize: '0.85em', color: 'var(--ink-secondary)' }}>
        {rig.diceType === 'any' ? t(lang, 'Qualquer dado', 'Any die') : rig.diceType}
      </div>
      <div className="rig-values-list">
        {rig.values.map((v, i) => (
          <div key={i} className={`rig-value-row ${v.consumed ? 'consumed' : ''}`}>
            <span className="rig-value-num">{v.value}</span>
            {v.label && <span className="rig-value-label">{v.label}</span>}
            <div className="rig-value-actions">
              {!v.consumed && (
                <>
                  <button
                    className="btn-icon"
                    onClick={() => onMoveUp(i)}
                    disabled={i === 0 || rig.values[i - 1]?.consumed}
                    aria-label="Mover acima"
                    title={t(lang, 'Mover acima', 'Move up')}
                  >↑</button>
                  <button
                    className="btn-icon"
                    onClick={() => onMoveDown(i)}
                    disabled={i === rig.values.length - 1}
                    aria-label="Mover abaixo"
                    title={t(lang, 'Mover abaixo', 'Move down')}
                  >↓</button>
                  <button
                    className="btn-icon danger"
                    onClick={() => onRemoveValue(i)}
                    aria-label="Remover"
                    title={t(lang, 'Remover', 'Remove')}
                  >×</button>
                </>
              )}
              {v.consumed && <span className="rig-consumed-tag">{t(lang, 'usado', 'used')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickInject({ lang, onInject }) {
  const [val, setVal] = useState('');
  const submit = (e) => {
    e?.preventDefault?.();
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return;
    onInject(n);
    setVal('');
  };
  return (
    <form className="quick-inject" onSubmit={submit}>
      <input aria-label={t(lang, 'próximo resultado…', 'next result…')}
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={t(lang, 'próximo resultado…', 'next result…')}
        className="input"
        min={1}
        max={100}
      />
      <button type="submit" className="btn btn-ghost btn-sm" disabled={!val}>
        ⚡ {t(lang, 'Definir próximo resultado', 'Set next result')}
      </button>
    </form>
  );
}
