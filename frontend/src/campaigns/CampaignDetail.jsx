import { useEffect, useState, useCallback } from 'react';
import { api, API_BASE } from '../api/client.js';
import { usePolling } from '../api/polling.js';

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

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>{t(lang, 'Visão geral', 'Overview')}</button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>{t(lang, 'Membros', 'Members')}</button>
        <button className={`tab ${tab === 'approvals' ? 'active' : ''}`} onClick={() => setTab('approvals')}>
          {t(lang, 'Aprovações', 'Approvals')}
          {approvals.filter(a => a.status === 'pending').length > 0 && <span className="badge"> {approvals.filter(a => a.status === 'pending').length}</span>}
        </button>
        {isDM && <button className={`tab ${tab === 'dice' ? 'active' : ''}`} onClick={() => setTab('dice')}>{t(lang, 'Dados', 'Dice')}</button>}
        {isDM && <button className={`tab ${tab === 'screen' ? 'active' : ''}`} onClick={() => setTab('screen')}>{t(lang, 'Telão', 'TV screen')}</button>}
      </div>

      {tab === 'overview' && <OverviewTab campaign={campaign} lang={lang} isDM={isDM} onChange={load} />}
      {tab === 'members' && <MembersTab campaign={campaign} lang={lang} isDM={isDM} characters={characters} onChange={load} />}
      {tab === 'approvals' && <ApprovalsTab approvals={approvals} lang={lang} isDM={isDM} onChange={load} />}
      {tab === 'dice' && isDM && <DiceTab campaign={campaign} rigs={rigs} lang={lang} onChange={load} />}
      {tab === 'screen' && isDM && <ScreenTab campaign={campaign} lang={lang} onChange={load} />}
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
      <CampaignDiceRoller campaign={campaign} lang={lang} />
      <div className="info-box">
        <h3>{t(lang, 'Membros', 'Members')}: {campaign.members?.length || 0}</h3>
      </div>
    </div>
  );
}

function MembersTab({ campaign, lang, isDM, characters, onChange }) {
  const [assigning, setAssigning] = useState(null); // membershipId
  const myMembership = campaign.members.find(m => m.user.id === (window.__currentUserId__ || '')); // será injetado pelo App

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

function DiceTab({ campaign, rigs, lang, onChange }) {
  const [targetId, setTargetId] = useState('');
  const [diceType, setDiceType] = useState('d20');
  const [valuesText, setValuesText] = useState('');

  const players = campaign.members.filter(m => m.role !== 'dm');

  const createRig = async () => {
    if (!targetId) return;
    const values = valuesText.split(/[,\s]+/).filter(Boolean).map(v => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? { value: n } : null;
    }).filter(Boolean);
    if (!values.length) return;
    await api.createRig(campaign.id, { targetUserId: targetId, diceType, values });
    setValuesText('');
    onChange();
  };

  const deleteRig = async (id) => {
    await api.deleteRig(id);
    onChange();
  };

  return (
    <div className="col gap-3">
      <div className="info-box">
        <h3 style={{ marginTop: 0 }}>{t(lang, 'Controle de dados', 'Dice control')}</h3>
        <p style={{ color: 'var(--ink-secondary)' }}>
          {t(lang,
            'Defina os próximos valores que cada jogador "rolará". Quando eles rolarem pelo app, esses valores serão usados na ordem. Eles não veem isto.',
            'Set the next values each player will "roll". When they roll via the app, these values are used in order. They cannot see this.'
          )}
        </p>
        <div className="row gap-2">
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="input">
            <option value="">{t(lang, 'Escolha um jogador…', 'Pick a player…')}</option>
            {players.map(p => <option key={p.id} value={p.user.id}>{p.user.displayName} ({p.character?.name || '—'})</option>)}
          </select>
          <select value={diceType} onChange={e => setDiceType(e.target.value)} className="input">
            <option value="d20">d20</option>
            <option value="d12">d12</option>
            <option value="d10">d10</option>
            <option value="d8">d8</option>
            <option value="d6">d6</option>
            <option value="d4">d4</option>
            <option value="d100">d100</option>
            <option value="any">{t(lang, 'Qualquer', 'Any')}</option>
          </select>
          <input
            value={valuesText}
            onChange={e => setValuesText(e.target.value)}
            placeholder={t(lang, 'Valores: 15, 12, 18', 'Values: 15, 12, 18')}
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={createRig}>{t(lang, 'Adicionar fila', 'Queue')}</button>
        </div>
      </div>

      {rigs.map(r => (
        <div key={r.id} className="rig-card">
          <div>
            <strong>{r.targetUser?.displayName}</strong> · {r.diceType}
          </div>
          <div className="rig-values">
            {r.values.map((v, i) => (
              <span key={i} className={`rig-value ${v.consumed ? 'consumed' : ''}`}>{v.value}</span>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={() => deleteRig(r.id)}>{t(lang, 'Apagar', 'Delete')}</button>
        </div>
      ))}
    </div>
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
