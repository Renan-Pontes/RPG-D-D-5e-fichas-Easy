import { useEffect, useState, useCallback } from 'react';
import { api, API_BASE } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import CombatTab from './CombatTab.jsx';
import RollRequestPanel from './RollRequestPanel.jsx';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

export default function CampaignDetail({ lang = 'pt', campaignId, onBack, characters = [] }) {
  const [campaign, setCampaign] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [rigs, setRigs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const cRes = await api.getCampaign(campaignId);
      setCampaign(cRes.campaign);
      const aRes = await api.listApprovals(campaignId);
      setApprovals(aRes.approvals || []);
      if (cRes.campaign.role === 'dm') {
        const rRes = await api.listRigs(campaignId);
        setRigs(rRes.rigs || []);
      }
    } catch (e) {
      setError(e?.message || 'failed');
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // Polling em vez de WebSocket (PythonAnywhere free não tem WS).
  // Pausa quando a aba está oculta.
  usePolling(load, 2500, [campaignId]);

  if (error) return <div style={{ padding: 24 }}><p style={{ color: '#ff9999' }}>{error}</p><button onClick={onBack}>← {t(lang, 'Voltar', 'Back')}</button></div>;
  if (!campaign) return <div style={{ padding: 24 }}>{t(lang, 'Carregando…', 'Loading…')}</div>;

  const isDM = campaign.role === 'dm';

  return (
    <div className="campaign-detail">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← {t(lang, 'Campanhas', 'Campaigns')}</button>
          <h1 style={{ margin: '6px 0 0 0' }}>{campaign.name}</h1>
          <p style={{ color: 'var(--ink-secondary)', margin: '4px 0' }}>{campaign.description}</p>
        </div>
        <div>
          <span className={`role-pill role-${campaign.role}`}>{isDM ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={t(lang, 'Abas da campanha', 'Campaign tabs')} style={{ marginBottom: 16 }}>
        {[
          { id: 'overview',  label: t(lang, 'Visão geral', 'Overview') },
          ...(isDM ? [{ id: 'combat',   label: t(lang, '⚔ Combate', '⚔ Combat') }] : []),
          { id: 'rolls',     label: t(lang, '🎲 Rolagens', '🎲 Rolls') },
          { id: 'members',   label: t(lang, 'Membros', 'Members') },
          { id: 'approvals', label: t(lang, 'Aprovações', 'Approvals'), badge: approvals.filter(a => a.status === 'pending').length },
          ...(isDM ? [{ id: 'dice',   label: t(lang, 'Dados', 'Dice') }] : []),
          ...(isDM ? [{ id: 'screen', label: t(lang, 'Telão', 'TV screen') }] : []),
        ].map(it => (
          <button
            key={it.id}
            role="tab"
            aria-selected={tab === it.id}
            aria-controls={`tabpanel-${it.id}`}
            id={`tab-${it.id}`}
            className={`tab ${tab === it.id ? 'active' : ''}`}
            onClick={() => setTab(it.id)}
          >
            {it.label}
            {it.badge > 0 && <span className="badge" aria-label={`${it.badge} pending`}> {it.badge}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && <OverviewTab campaign={campaign} lang={lang} isDM={isDM} onChange={load} />}
        {tab === 'combat' && isDM && <CombatTab campaign={campaign} lang={lang} onChange={load} />}
        {tab === 'rolls' && <RollRequestPanel campaign={campaign} lang={lang} isDM={isDM} onChange={load} />}
        {tab === 'members' && <MembersTab campaign={campaign} lang={lang} isDM={isDM} characters={characters} onChange={load} />}
        {tab === 'approvals' && <ApprovalsTab approvals={approvals} lang={lang} isDM={isDM} onChange={load} />}
        {tab === 'dice' && isDM && <DiceTab campaign={campaign} rigs={rigs} lang={lang} onChange={load} />}
        {tab === 'screen' && isDM && <ScreenTab campaign={campaign} lang={lang} onChange={load} />}
      </div>
    </div>
  );
}

function OverviewTab({ campaign, lang, isDM, onChange }) {
  const [editing, setEditing] = useState(false);
  const [session, setSession] = useState(campaign.state?.session || '');
  const [scene, setScene] = useState(campaign.state?.scene || '');
  const [weather, setWeather] = useState(campaign.state?.weather || '');

  useEffect(() => {
    setSession(campaign.state?.session || '');
    setScene(campaign.state?.scene || '');
    setWeather(campaign.state?.weather || '');
  }, [campaign.state?.session, campaign.state?.scene, campaign.state?.weather]);

  const saveState = async () => {
    await api.updateCampaign(campaign.id, {
      state: { ...campaign.state, session, scene, weather },
    });
    setEditing(false);
    onChange();
  };

  return (
    <div className="col gap-4">
      {isDM && (
        <div className="info-box">
          <h3>{t(lang, 'Convidar jogadores', 'Invite players')}</h3>
          <p>{t(lang, 'Compartilhe este código com os jogadores:', 'Share this code with players:')}</p>
          <div className="invite-code-display">{campaign.inviteCode}</div>
        </div>
      )}
      <div className="info-box">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3>{t(lang, 'Estado da campanha', 'Campaign state')}</h3>
          {isDM && !editing && (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{t(lang, 'Editar', 'Edit')}</button>
          )}
        </div>
        {editing ? (
          <div className="col gap-2">
            <label className="col gap-1">
              <span>{t(lang, 'Sessão', 'Session')}</span>
              <input className="input" value={session} onChange={e => setSession(e.target.value)} placeholder="ex: 12" />
            </label>
            <label className="col gap-1">
              <span>{t(lang, 'Cena', 'Scene')}</span>
              <input className="input" value={scene} onChange={e => setScene(e.target.value)} placeholder={t(lang, 'ex: Taverna do Javali Cego', 'e.g.: Blind Boar Tavern')} />
            </label>
            <label className="col gap-1">
              <span>{t(lang, 'Clima/Ambiente', 'Weather/Mood')}</span>
              <input className="input" value={weather} onChange={e => setWeather(e.target.value)} placeholder={t(lang, 'ex: Chuva fina, ventania', 'e.g.: Drizzle, gusty')} />
            </label>
            <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button className="btn btn-primary btn-sm" onClick={saveState}>{t(lang, 'Salvar', 'Save')}</button>
            </div>
          </div>
        ) : (
          <>
            <p><strong>{t(lang, 'Sessão atual', 'Current session')}:</strong> {campaign.state?.session || '—'}</p>
            <p><strong>{t(lang, 'Cena', 'Scene')}:</strong> {campaign.state?.scene || '—'}</p>
            <p><strong>{t(lang, 'Clima', 'Weather')}:</strong> {campaign.state?.weather || '—'}</p>
          </>
        )}
      </div>
      {isDM && <InitiativeManager campaign={campaign} lang={lang} onChange={onChange} />}
      <CampaignDiceRoller campaign={campaign} lang={lang} />
      <div className="info-box">
        <h3>{t(lang, 'Membros', 'Members')}: {campaign.members?.length || 0}</h3>
      </div>
    </div>
  );
}

/**
 * Gerenciador de iniciativa (somente DM).
 *
 * - Carrega personagens dos jogadores como entradas pré-preenchidas (DEX mod
 *   sugerido, mas o DM digita o valor).
 * - Adiciona NPCs/monstros customizados (nome + valor).
 * - Ordena automaticamente do maior pro menor.
 * - "Próximo turno" avança o índice (volta ao 0 no fim).
 * - "Limpar combate" zera tudo.
 * - Persistido em campaign.state.{initiative, initiativeTurn, round}.
 * - Propaga ao telão via polling padrão.
 */
function InitiativeManager({ campaign, lang, onChange }) {
  const init = campaign.state?.initiative || [];
  const turn = campaign.state?.initiativeTurn ?? 0;
  const round = campaign.state?.round ?? 1;
  const [npcName, setNpcName] = useState('');
  const [npcValue, setNpcValue] = useState('');
  const [busy, setBusy] = useState(false);

  const saveState = useCallback(async (patch) => {
    setBusy(true);
    try {
      await api.updateCampaign(campaign.id, {
        state: { ...campaign.state, ...patch },
      });
      onChange();
    } catch (e) {
      console.warn('save state failed', e);
    } finally {
      setBusy(false);
    }
  }, [campaign.id, campaign.state, onChange]);

  // Sugere DEX modifier para um personagem (não rola, só sugere)
  const dexMod = (c) => {
    const dex = c?.abilities?.dex ?? 10;
    return Math.floor((dex - 10) / 2);
  };

  const addAllPCs = () => {
    const existing = new Set(init.map(e => e.name));
    const pcs = campaign.members
      .filter(m => m.role !== 'dm' && m.character)
      .map(m => ({
        name: m.character.name,
        value: 10 + dexMod(m.character.data || {}),
        type: 'pc',
      }))
      .filter(e => !existing.has(e.name));
    if (!pcs.length) return;
    const merged = sortByValue([...init, ...pcs]);
    saveState({ initiative: merged });
  };

  const addNPC = (e) => {
    e?.preventDefault?.();
    const name = npcName.trim();
    const v = parseInt(npcValue, 10);
    if (!name || !Number.isFinite(v)) return;
    const merged = sortByValue([...init, { name, value: v, type: 'npc' }]);
    setNpcName(''); setNpcValue('');
    saveState({ initiative: merged });
  };

  const removeEntry = (idx) => {
    const next = init.filter((_, i) => i !== idx);
    // Ajustar turn se for o atual ou maior
    let nextTurn = turn;
    if (idx < turn) nextTurn = Math.max(0, turn - 1);
    else if (idx === turn && nextTurn >= next.length) nextTurn = 0;
    saveState({ initiative: next, initiativeTurn: nextTurn });
  };

  const advanceTurn = () => {
    if (init.length === 0) return;
    const next = (turn + 1) % init.length;
    const nextRound = next === 0 ? round + 1 : round;
    saveState({ initiativeTurn: next, round: nextRound });
  };

  const previousTurn = () => {
    if (init.length === 0) return;
    const next = (turn - 1 + init.length) % init.length;
    const nextRound = (turn === 0 && round > 1) ? round - 1 : round;
    saveState({ initiativeTurn: next, round: nextRound });
  };

  const clearCombat = () => {
    if (!confirm(t(lang, 'Limpar combate inteiro?', 'Clear entire combat?'))) return;
    saveState({ initiative: [], initiativeTurn: 0, round: 1 });
  };

  return (
    <div className="info-box initiative-manager">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{t(lang, 'Iniciativa', 'Initiative')}
          {init.length > 0 && <span style={{ color: 'var(--ink-secondary)', marginLeft: 8, fontSize: '0.85em' }}>
            {t(lang, 'rodada', 'round')} {round}
          </span>}
        </h3>
        {init.length > 0 && (
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" onClick={previousTurn} disabled={busy} aria-label="Turno anterior">←</button>
            <button className="btn btn-primary btn-sm" onClick={advanceTurn} disabled={busy}>
              {t(lang, 'Próximo turno', 'Next turn')} →
            </button>
            <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={clearCombat} disabled={busy}>
              {t(lang, 'Limpar', 'Clear')}
            </button>
          </div>
        )}
      </div>

      {init.length === 0 ? (
        <p style={{ color: 'var(--ink-secondary)', fontStyle: 'italic', marginBottom: 12 }}>
          {t(lang, 'Sem combate ativo.', 'No active combat.')}
        </p>
      ) : (
        <ol className="initiative-list">
          {init.map((entry, i) => (
            <li key={`${entry.name}-${i}`} className={`initiative-entry ${i === turn ? 'current' : ''} type-${entry.type || 'npc'}`}>
              <span className="init-pos">{i + 1}</span>
              <span className="init-name">{entry.name}</span>
              <span className="init-value">{entry.value}</span>
              {i === turn && <span className="init-now-marker" aria-label="agora">●</span>}
              <button
                className="btn-icon danger"
                onClick={() => removeEntry(i)}
                aria-label={t(lang, 'Remover', 'Remove')}
                title={t(lang, 'Remover da iniciativa', 'Remove from initiative')}
              >×</button>
            </li>
          ))}
        </ol>
      )}

      <div className="row gap-2" style={{ flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={addAllPCs} disabled={busy}>
          ✚ {t(lang, 'Adicionar todos os jogadores (10+DEX)', 'Add all players (10+DEX)')}
        </button>
        <form className="row gap-2" onSubmit={addNPC} style={{ alignItems: 'center', flex: 1, minWidth: 280 }}>
          <input
            className="input"
            placeholder={t(lang, 'Nome do NPC/monstro', 'NPC/monster name')}
            value={npcName}
            onChange={e => setNpcName(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          <input
            type="number"
            className="input"
            placeholder="Init"
            value={npcValue}
            onChange={e => setNpcValue(e.target.value)}
            style={{ width: 80 }}
          />
          <button type="submit" className="btn btn-ghost btn-sm" disabled={!npcName || !npcValue}>
            ➕ {t(lang, 'NPC', 'NPC')}
          </button>
        </form>
      </div>
    </div>
  );
}

function sortByValue(list) {
  return [...list].sort((a, b) => (b.value - a.value));
}

function MembersTab({ campaign, lang, isDM, characters, onChange }) {
  const [assigning, setAssigning] = useState(null); // membershipId em edição

  const assignCharacter = async (membershipId, charId) => {
    await api.updateMembership(campaign.id, membershipId, { characterId: charId });
    setAssigning(null);
    onChange();
  };

  const removeMember = async (membershipId) => {
    if (!confirm(t(lang, 'Remover este membro?', 'Remove this member?'))) return;
    await api.removeMember(campaign.id, membershipId);
    onChange();
  };

  return (
    <div className="members-list">
      {campaign.members.map(m => (
        <div key={m.id} className="member-row">
          <div>
            <strong>{m.user.displayName}</strong>
            <span className={`role-pill role-${m.role}`} style={{ marginLeft: 8 }}>{m.role === 'dm' ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
          </div>
          <div>
            {m.character ? (
              <div>
                <strong>{m.character.name}</strong>
                {m.character.summary && (
                  <span style={{ color: 'var(--ink-secondary)', fontSize: '0.9em' }}>
                    {' '}— {m.character.summary.race} {m.character.summary.className} {m.character.summary.level}
                  </span>
                )}
              </div>
            ) : (
              <em style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Sem personagem atribuído', 'No character assigned')}</em>
            )}
          </div>
          <div className="row gap-2">
            {/* O próprio user pode atribuir um personagem dele */}
            {m.user.id === window.__currentUserId__ && (
              <button className="btn btn-ghost btn-sm" onClick={() => setAssigning(m.id)}>{t(lang, 'Trocar personagem', 'Change character')}</button>
            )}
            {isDM && m.role !== 'dm' && (
              <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={() => removeMember(m.id)}>{t(lang, 'Remover', 'Remove')}</button>
            )}
          </div>
          {assigning === m.id && (
            <div className="character-picker">
              <select onChange={e => assignCharacter(m.id, e.target.value || null)}>
                <option value="">— {t(lang, 'Nenhum', 'None')} —</option>
                {characters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.race} {c.className} {c.level})</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => setAssigning(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ApprovalsTab({ approvals, lang, isDM, onChange }) {
  const review = async (id, status) => {
    await api.reviewApproval(id, { status });
    onChange();
  };
  const pending = approvals.filter(a => a.status === 'pending');
  const reviewed = approvals.filter(a => a.status !== 'pending');
  return (
    <div className="approvals">
      <h3>{t(lang, 'Pendentes', 'Pending')} ({pending.length})</h3>
      {pending.length === 0 && <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhuma pendente.', 'None pending.')}</p>}
      {pending.map(a => (
        <div key={a.id} className="approval-card">
          <div>
            <strong>{a.requestedBy?.displayName}</strong> {t(lang, 'pediu', 'requested')} <strong>{labelType(a.type, lang)}</strong>
            {a.character && <> {t(lang, 'para', 'for')} <strong>{a.character.name}</strong></>}
          </div>
          <pre className="approval-payload">{JSON.stringify(a.payload, null, 2)}</pre>
          {a.note && <div className="approval-note">{a.note}</div>}
          {isDM && (
            <div className="row gap-2">
              <button className="btn btn-primary btn-sm" onClick={() => review(a.id, 'approved')}>{t(lang, 'Aprovar e aplicar', 'Approve & apply')}</button>
              <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={() => review(a.id, 'rejected')}>{t(lang, 'Rejeitar', 'Reject')}</button>
            </div>
          )}
        </div>
      ))}
      <h3 style={{ marginTop: 24 }}>{t(lang, 'Histórico', 'History')}</h3>
      {reviewed.map(a => (
        <div key={a.id} className="approval-card reviewed">
          <div>
            <span className={`pill pill-${a.status}`}>{a.status}</span>{' '}
            <strong>{a.requestedBy?.displayName}</strong> · {labelType(a.type, lang)} {a.character ? `· ${a.character.name}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DiceTab — UX completa do dice rigging:
 *  - Cards por jogador agrupando todas as filas dele
 *  - Reordenar valores (↑↓), apagar individual, injetar inline
 *  - Limpar fila inteira (volta a aleatório)
 *  - Histórico das últimas N rolagens (com flag rigged)
 *  - Atalhos: Enter para enfileirar, Delete pra limpar
 */
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
    if (!confirm(t(lang, 'Limpar todas as filas deste jogador?', 'Clear all queues for this player?'))) return;
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
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Controle de dados', 'Dice control')}</h3>
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
          <input
            value={valuesText}
            onChange={e => setValuesText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && activeTarget) enqueue(activeTarget); }}
            placeholder={t(lang, 'Valores: 15, 12, 18 (Enter para enfileirar)', 'Values: 15, 12, 18 (Enter to queue)')}
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
                  title={t(lang, 'Enfileirar valores acima neste jogador', 'Queue values above for this player')}
                >
                  ➕ {t(lang, 'Enfileirar', 'Queue')}
                </button>
                {playerRigs.length > 0 && (
                  <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={() => clearAllForPlayer(uid)}>
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
          <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhuma rolagem ainda.', 'No rolls yet.')}</p>
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
      <input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={t(lang, 'injetar valor único…', 'inject single value…')}
        className="input"
        min={1}
        max={100}
      />
      <button type="submit" className="btn btn-ghost btn-sm" disabled={!val}>
        ⚡ {t(lang, 'Injetar', 'Inject')}
      </button>
    </form>
  );
}

function ScreenTab({ campaign, lang, onChange }) {
  const rotate = async () => {
    if (!confirm(t(lang, 'Gerar novo link? O antigo deixa de funcionar.', 'Generate a new link? The old one will stop working.'))) return;
    await api.rotateScreenToken(campaign.id);
    onChange();
  };
  const url = `${window.location.origin}/tv/${campaign.screenToken}`;
  return (
    <div className="info-box">
      <h3 style={{ marginTop: 0 }}>{t(lang, 'Telão para TV', 'TV screen')}</h3>
      <p>{t(lang, 'Abra este link na TV ou tablet onde os jogadores acompanham o jogo:', 'Open this link on the TV or tablet that players watch:')}</p>
      <div className="row gap-2">
        <input className="input" readOnly value={url} onClick={e => e.target.select()} style={{ flex: 1, fontFamily: 'monospace' }} />
        <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(url)}>{t(lang, 'Copiar', 'Copy')}</button>
        <button className="btn btn-ghost" onClick={rotate}>{t(lang, 'Renovar', 'Rotate')}</button>
      </div>
      <p style={{ marginTop: 16 }}>
        <a href={url} target="_blank" rel="noreferrer">{t(lang, 'Abrir o telão em nova aba', 'Open the TV view in a new tab')}</a>
      </p>
    </div>
  );
}

/**
 * Rolagem "oficial" da campanha — passa pelo backend, sujeita ao dice rigging
 * do mestre. O DiceRoller flutuante do app continua rolando local pra diversão
 * visual; este aqui é a rolagem que importa.
 */
function CampaignDiceRoller({ campaign, lang }) {
  const [diceType, setDiceType] = useState('d20');
  const [count, setCount] = useState(1);
  const [label, setLabel] = useState('');
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);

  const roll = async () => {
    setBusy(true);
    try {
      const r = await api.rollDice({ diceType, count, campaignId: campaign.id, label });
      setLast(r);
    } catch (e) {
      console.warn('roll failed', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="info-box">
      <h3 style={{ marginTop: 0 }}>{t(lang, 'Rolar dados (oficial)', 'Roll dice (official)')}</h3>
      <p style={{ color: 'var(--ink-secondary)', marginTop: 0, fontSize: '0.9em' }}>
        {t(lang,
          'Esta rolagem passa pelo servidor — o mestre pode ter pré-definido valores.',
          'This roll goes through the server — the DM may have pre-set values.'
        )}
      </p>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <select className="input" value={diceType} onChange={e => setDiceType(e.target.value)}>
          {['d4','d6','d8','d10','d12','d20','d100'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input
          type="number"
          className="input"
          min={1}
          max={20}
          value={count}
          onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          style={{ width: 64 }}
        />
        <input
          className="input"
          placeholder={t(lang, 'rótulo (ex: percepção)', 'label (e.g. perception)')}
          value={label}
          onChange={e => setLabel(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={roll} disabled={busy}>
          {busy ? '…' : t(lang, 'Rolar', 'Roll')}
        </button>
      </div>
      {last && (
        <div style={{ marginTop: 12, fontFamily: 'JetBrains Mono, monospace' }}>
          <strong>{t(lang, 'Resultado', 'Result')}:</strong>{' '}
          {last.results.map((r, i) => (
            <span key={i} className="rig-value" style={{ marginRight: 4 }}>{r.value}</span>
          ))}
          {last.results.length > 1 && <> = <strong>{last.total}</strong></>}
        </div>
      )}
    </div>
  );
}

function labelType(type, lang) {
  const map = {
    levelup: t(lang, 'Subir de nível', 'Level up'),
    feature: t(lang, 'Nova feature', 'New feature'),
    item: t(lang, 'Novo item', 'New item'),
    spell: t(lang, 'Nova magia', 'New spell'),
    other: t(lang, 'Outro', 'Other'),
  };
  return map[type] || type;
}
