// Abas antigas da campanha, mantidas como FALLBACK da casca enquanto os
// substitutos (GroupArea, PlayArea › Telão, PlayerTable…) não existem.
// Movidas sem mudança de comportamento de CampaignDetail.jsx; só trocam
// window.confirm pelo diálogo do app e o PUT do state pelo PATCH por chave.
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client.js';
import { errorMessage } from '../../api/errors.js';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import DMCharacterEditor from '../../campaigns/DMCharacterEditor.jsx';
import GiveItemModal from '../../campaigns/GiveItemModal.jsx';
import Utils from '../../../utils.js';
import { tName } from '../../../data/i18n.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;
const ask = (message) => confirmDialog({ message, danger: true });

// "Humano · Druida 3 / Guerreiro 1" a partir do resumo do servidor (ou da ficha local).
export function charLine(c, lang) {
  if (!c) return '';
  const classes = c.classes?.length ? c.classes : (c.className ? Utils.classEntries(c) : []);
  const cls = classes.map(e => `${tName('class', e.id, lang)} ${e.level}`).join(' / ');
  return [c.race && tName('race', c.race, lang), cls].filter(Boolean).join(' · ');
}

/** Aprovações com carga própria (a casca não busca mais a lista no polling). */
export function ApprovalsLoader({ campaign, lang, isDM, onChange, refreshKey }) {
  const [approvals, setApprovals] = useState([]);
  const load = useCallback(async () => {
    try { const r = await api.listApprovals(campaign.id); setApprovals(r.approvals || []); } catch { /* mantém a lista */ }
  }, [campaign.id]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const changed = () => { load(); onChange?.(); };
  return <ApprovalsTab campaign={campaign} approvals={approvals} lang={lang} isDM={isDM} onChange={changed} />;
}

export function MembersTab({ campaign, lang, isDM, characters, onChange }) {
  const [assigning, setAssigning] = useState(null); // membershipId em edição
  const [editingChar, setEditingChar] = useState(null); // character object
  const [givingTo, setGivingTo] = useState(null); // character object
  const [selectedId, setSelectedId] = useState(null); // membership selecionado (desktop split-view)

  const assignCharacter = async (membershipId, charId) => {
    await api.updateMembership(campaign.id, membershipId, { characterId: charId });
    setAssigning(null);
    onChange();
  };

  const removeMember = async (membershipId) => {
    if (!await ask(t(lang, 'Remover este membro?', 'Remove this member?'))) return;
    await api.removeMember(campaign.id, membershipId);
    onChange();
  };

  // Em desktop (CSS) a lista vira coluna esquerda e o detalhe vai pra direita.
  // Em mobile, o detalhe não renderiza e os botões aparecem inline (member-actions).
  const selected = campaign.members.find(m => m.id === selectedId) || null;

  return (
    <div className="members-shell">
      <div className="members-list">
        {campaign.members.map(m => (
          <div
            key={m.id}
            className={`member-row ${selectedId === m.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(m.id)}
          >
            <div>
              <strong>{m.user.displayName}</strong>
              <span className={`role-pill role-${m.role}`} style={{ marginLeft: 8 }}>{m.role === 'dm' ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
            </div>
            <div>
              {m.character ? (
                <div>
                  <strong>{m.character.name}</strong>
                  {m.character.summary?.cheatMode && <span className="tag" style={{ marginLeft: 6, background: 'var(--blood-deep)', color: 'var(--ink-primary)' }} title={t(lang, 'Modo trapaça ativo nesta ficha', 'Cheat mode active on this sheet')}>🎲 {t(lang, 'Trapaça', 'Cheat')}</span>}
                  {m.character.summary && (
                    <span style={{ color: 'var(--ink-secondary)', fontSize: '0.9em' }}>
                      {' '}— {charLine(m.character.summary, lang)}
                    </span>
                  )}
                </div>
              ) : (
                <em style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Sem personagem atribuído', 'No character assigned')}</em>
              )}
            </div>
            <div className="row gap-2 member-actions">
              <MemberActions
                m={m}
                isDM={isDM}
                lang={lang}
                onChangeChar={() => setAssigning(m.id)}
                onEditChar={() => setEditingChar({ id: m.character.id, name: m.character.name, data: m.character.data })}
                onGiveItem={() => setGivingTo({ id: m.character.id, name: m.character.name })}
                onEndForm={async () => {
                  if (!await ask(t(lang, `Forçar ${m.character.name} a sair da forma selvagem?`, `Force ${m.character.name} out of wild shape?`))) return;
                  try { await api.wildShapeForceEnd(m.character.id, {}); onChange(); } catch (e) { alert(errorMessage(e)); }
                }}
                onRemove={() => removeMember(m.id)}
              />
            </div>
            {assigning === m.id && (
              <div className="character-picker">
                <select onChange={e => assignCharacter(m.id, e.target.value || null)}>
                  <option value="">— {t(lang, 'Nenhum', 'None')} —</option>
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name} ({Utils.classLabel(c, lang, tName)})</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setAssigning(null); }}>{t(lang, 'Cancelar', 'Cancel')}</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Painel direito (desktop) — detalhe do membro selecionado */}
      <div className="members-detail">
        {!selected && (
          <div className="empty">
            {t(lang, 'Selecione um membro pra ver detalhes e tomar ações.', 'Select a member to see details and take action.')}
          </div>
        )}
        {selected && (
          <MemberDetailPanel
            m={selected}
            isDM={isDM}
            lang={lang}
            characters={characters}
            assigning={assigning === selected.id}
            onChangeChar={() => setAssigning(selected.id)}
            onAssign={(charId) => assignCharacter(selected.id, charId)}
            onCancelAssign={() => setAssigning(null)}
            onEditChar={() => setEditingChar({ id: selected.character.id, name: selected.character.name, data: selected.character.data })}
            onGiveItem={() => setGivingTo({ id: selected.character.id, name: selected.character.name })}
            onEndForm={async () => {
              if (!await ask(t(lang, `Forçar ${selected.character.name} a sair da forma selvagem?`, `Force ${selected.character.name} out of wild shape?`))) return;
              try { await api.wildShapeForceEnd(selected.character.id, {}); onChange(); } catch (e) { alert(errorMessage(e)); }
            }}
            onRemove={() => removeMember(selected.id)}
          />
        )}
      </div>

      {editingChar && (
        <DMCharacterEditor
          character={editingChar}
          lang={lang}
          onClose={() => setEditingChar(null)}
          onSaved={() => { setEditingChar(null); onChange(); }}
        />
      )}
      {givingTo && (
        <GiveItemModal
          campaign={campaign}
          character={givingTo}
          lang={lang}
          onClose={() => setGivingTo(null)}
          onGiven={() => { setGivingTo(null); onChange(); }}
        />
      )}
    </div>
  );
}

function MemberActions({ m, isDM, lang, onChangeChar, onEditChar, onGiveItem, onEndForm, onRemove }) {
  // Botões compartilhados entre lista (mobile) e painel detalhado (desktop).
  // Cada botão para a propagação pra não disparar o setSelectedId do parent.
  const stop = (fn) => (e) => { e.stopPropagation(); fn?.(); };
  return (
    <>
      {m.user.id === window.__currentUserId__ && (
        <button className="btn btn-ghost btn-sm" onClick={stop(onChangeChar)}>{t(lang, 'Trocar personagem', 'Change character')}</button>
      )}
      {isDM && m.character?.data && (
        <button className="btn btn-ghost btn-sm" onClick={stop(onEditChar)} title={t(lang, 'Editar ficha em modo mestre', 'Edit sheet in DM mode')}>
          🛠 {t(lang, 'Editar ficha', 'Edit sheet')}
        </button>
      )}
      {isDM && m.character?.data && (
        <button className="btn btn-ghost btn-sm" onClick={stop(onGiveItem)} title={t(lang, 'Dar item ao personagem', 'Give item to character')}>
          🎁 {t(lang, 'Dar item', 'Give item')}
        </button>
      )}
      {isDM && m.character?.data?.wildShape?.active && (
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--moss-bright)' }} onClick={stop(onEndForm)}>
          🐾 {t(lang, 'Sair forma', 'End form')}
        </button>
      )}
      {isDM && m.role !== 'dm' && (
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} onClick={stop(onRemove)}>{t(lang, 'Remover', 'Remove')}</button>
      )}
    </>
  );
}

function MemberDetailPanel({ m, isDM, lang, characters, assigning, onChangeChar, onAssign, onCancelAssign, onEditChar, onGiveItem, onEndForm, onRemove }) {
  const c = m.character;
  return (
    <>
      <h3>
        {m.user.displayName}
        <span className={`role-pill role-${m.role}`} style={{ marginLeft: 10 }}>{m.role === 'dm' ? t(lang, 'Mestre', 'DM') : t(lang, 'Jogador', 'Player')}</span>
      </h3>
      {c ? (
        <>
          <div style={{ fontSize: '1.05em' }}>
            <strong>{c.name}</strong>
            {c.summary?.cheatMode && <span className="tag" style={{ marginLeft: 6, background: 'var(--blood-deep)', color: 'var(--ink-primary)' }} title={t(lang, 'Modo trapaça ativo nesta ficha', 'Cheat mode active on this sheet')}>🎲 {t(lang, 'Trapaça', 'Cheat')}</span>}
            {c.summary && (
              <span style={{ color: 'var(--ink-secondary)' }}>
                {' '}— {charLine(c.summary, lang)}
              </span>
            )}
          </div>
          {c.data && (
            <div className="stat-grid">
              <div><div className="lbl">HP</div><div className="val">{c.data.currentHp ?? '?'}/{c.data.maxHp ?? '?'}</div></div>
              <div><div className="lbl">AC</div><div className="val">{c.data.ac ?? '?'}</div></div>
              <div><div className="lbl">Init</div><div className="val">{c.data.initiative ?? c.data.abilities?.dex ? Math.floor(((c.data.abilities?.dex || 10) - 10) / 2) : '?'}</div></div>
              <div><div className="lbl">{t(lang, 'Nível', 'Level')}</div><div className="val">{c.data.level || 1}</div></div>
              <div><div className="lbl">XP</div><div className="val">{c.data.xp ?? 0}</div></div>
              <div><div className="lbl">{t(lang, 'Forma selvagem', 'Wild shape')}</div><div className="val">{c.data.wildShape?.active ? '🐾' : '—'}</div></div>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--ink-secondary)', fontStyle: 'italic' }}>{t(lang, 'Sem personagem atribuído.', 'No character assigned.')}</p>
      )}

      <div className="actions-row">
        <MemberActions
          m={m}
          isDM={isDM}
          lang={lang}
          onChangeChar={onChangeChar}
          onEditChar={onEditChar}
          onGiveItem={onGiveItem}
          onEndForm={onEndForm}
          onRemove={onRemove}
        />
      </div>

      {assigning && (
        <div className="character-picker" style={{ marginTop: 12 }}>
          <select onChange={e => onAssign(e.target.value || null)} defaultValue="">
            <option value="">— {t(lang, 'Nenhum', 'None')} —</option>
            {characters.map(ch => <option key={ch.id} value={ch.id}>{ch.name} ({Utils.classLabel(ch, lang, tName)})</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={onCancelAssign}>{t(lang, 'Cancelar', 'Cancel')}</button>
        </div>
      )}
    </>
  );
}

// Texto curto do que o jogador escolheu ao subir (histórico do mestre).
function levelupSummary(p, lang) {
  if (!p) return '';
  const parts = [];
  if (p.classId) parts.push(tName('class', p.classId, lang));
  if (p.hpGain) parts.push(`+${p.hpGain} ${t(lang, 'PV', 'HP')}`);
  if (p.choice?.type === 'asi') parts.push(Object.entries(p.choice.asi || {}).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', '));
  if (p.choice?.type === 'feat') parts.push(`${t(lang, 'Talento', 'Feat')}: ${p.choice.feat}`);
  if (p.skillAdded) parts.push(tName('skill', p.skillAdded, lang));
  if (p.spellsAdded?.length) parts.push(p.spellsAdded.map(x => tName('spellName', typeof x === 'string' ? x : x?.id, lang)).join(', '));
  return parts.filter(Boolean).join(' · ');
}

// Conteúdo de pedidos que não são de nível, sem JSON cru.
function payloadText(a, lang) {
  const p = a.payload || {};
  if (a.type === 'levelup') return p.toLevel ? `${t(lang, 'para o nível', 'to level')} ${p.toLevel}` : '';
  if (a.type === 'spell') return tName('spellName', p.id || p.spellId || '', lang);
  return p.name || p.title || p.desc || p.id || '';
}

// XP total para passar do nível N ao N+1 (índice = nível atual). SRD 5.2.1.
const XP_NEXT = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/**
 * Evolução da mesa (mestre): regra de multiclasse, nível de cada personagem e
 * liberação de subida individual ou para a mesa toda — sem esperar o pedido.
 */
function LevelingPanel({ campaign, approvals, lang, onChange }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const allowMulti = campaign.state?.allowMulticlass !== false;
  const xpMode = campaign.state?.levelingMode === 'xp';
  const [xpAmount, setXpAmount] = useState('');
  const [xpSplit, setXpSplit] = useState(true);
  const players = campaign.members.filter(m => m.role !== 'dm' && m.character);
  const openFor = (charId, status) => approvals.find(a => a.type === 'levelup' && a.status === status && a.character?.id === charId);

  const run = async (fn, ok) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); onChange(); } catch (e) { setMsg(errorMessage(e)); } finally { setBusy(false); }
  };
  const toggleRule = () => run(
    () => api.patchCampaignState(campaign.id, { allowMulticlass: !allowMulti }),
    !allowMulti ? t(lang, 'Multiclasse liberada na mesa.', 'Multiclassing allowed.') : t(lang, 'Multiclasse bloqueada na mesa.', 'Multiclassing blocked.'),
  );
  const setMode = (mode) => run(
    () => api.patchCampaignState(campaign.id, { levelingMode: mode }),
    mode === 'xp'
      ? t(lang, 'A mesa agora sobe de nível por XP.', 'The table now levels up by XP.')
      : t(lang, 'A mesa agora sobe de nível por marcos.', 'The table now levels up by milestones.'),
  );
  const awardXp = (ids) => run(async () => {
    const amount = parseInt(xpAmount, 10);
    if (!(amount > 0)) throw new Error(t(lang, 'Informe quanto XP dar.', 'Enter how much XP to give.'));
    await api.awardXp(campaign.id, { amount, characterIds: ids, split: ids === 'all' && xpSplit });
    setXpAmount('');
  }, t(lang, 'XP entregue. Quem alcançou o próximo nível já está liberado para subir.', 'XP awarded. Anyone who reached the next level is unlocked to level up.'));
  const grant = (ids) => run(async () => {
    const r = await api.grantLevelup(campaign.id, { characterIds: ids });
    if (!r.granted.length) throw new Error(t(lang, 'Nada para liberar (já liberado ou nível 20).', 'Nothing to unlock (already unlocked or level 20).'));
  }, t(lang, 'Subida liberada! Os jogadores confirmam na ficha.', 'Level up unlocked! Players confirm on their sheet.'));
  const revoke = (id) => run(() => api.reviewApproval(id, { status: 'pending' }), t(lang, 'Liberação revogada.', 'Unlock revoked.'));
  const reject = (id) => run(() => api.reviewApproval(id, { status: 'rejected' }), t(lang, 'Pedido recusado.', 'Request rejected.'));

  return (
    <div className="info-box leveling-panel">
      <div className="info-box-head">
        <h3>{t(lang, 'Evolução da mesa', 'Party progression')}</h3>
        <button className="btn btn-primary btn-sm" disabled={busy || !players.length} onClick={async () => {
          if (await ask(t(lang, 'Liberar a subida de nível para todos os personagens da mesa?', 'Unlock a level up for every character at the table?'))) grant('all');
        }}>
          ✨ {t(lang, 'Subir a mesa toda', 'Level up the party')}
        </button>
      </div>
      <label className="rule-toggle">
        <input type="checkbox" checked={allowMulti} disabled={busy} onChange={toggleRule} />
        <span>
          <strong>{t(lang, 'Multiclasse permitida', 'Multiclassing allowed')}</strong>
          <span className="muted text-xs"> — {t(lang, 'ao subir, o jogador pode abrir uma classe nova (com os pré-requisitos de atributo).', 'when leveling, players may take a new class (ability prerequisites apply).')}</span>
        </span>
      </label>
      <div className="rule-toggle leveling-mode">
        <strong>{t(lang, 'Progressão', 'Leveling')}</strong>
        <div className="seg" role="radiogroup" aria-label={t(lang, 'Progressão', 'Leveling')}>
          <button type="button" role="radio" aria-checked={!xpMode} className={`btn btn-sm ${!xpMode ? 'btn-primary' : 'btn-ghost'}`} disabled={busy} onClick={() => xpMode && setMode('milestone')}>
            {t(lang, 'Marcos', 'Milestones')}
          </button>
          <button type="button" role="radio" aria-checked={xpMode} className={`btn btn-sm ${xpMode ? 'btn-primary' : 'btn-ghost'}`} disabled={busy} onClick={() => !xpMode && setMode('xp')}>
            XP
          </button>
        </div>
        <span className="muted text-xs">
          {xpMode
            ? t(lang, 'você dá XP; ao alcançar o próximo nível a subida é liberada sozinha.', 'you award XP; reaching the next level unlocks it automatically.')
            : t(lang, 'você libera a subida quando a história pedir.', 'you unlock level ups when the story calls for it.')}
        </span>
      </div>
      {xpMode && (
        <div className="xp-award">
          <input aria-label={t(lang, 'XP', 'XP')} type="number" min="1" inputMode="numeric" placeholder={t(lang, 'XP', 'XP')} value={xpAmount} onChange={e => setXpAmount(e.target.value)} />
          <label className="xp-split">
            <input type="checkbox" checked={xpSplit} onChange={e => setXpSplit(e.target.checked)} />
            <span>{t(lang, 'dividir entre a mesa', 'split among the party')}</span>
          </label>
          <button className="btn btn-primary btn-sm" disabled={busy || !players.length} onClick={() => awardXp('all')}>
            {t(lang, 'Dar XP à mesa', 'Give XP to party')}
          </button>
        </div>
      )}
      {msg && <div className="text-sm" style={{ margin: '8px 0', color: 'var(--ink-secondary)' }}>{msg}</div>}

      <div className="leveling-list">
        {players.length === 0 && <div className="muted text-sm">{t(lang, 'Nenhum personagem na mesa ainda.', 'No characters at the table yet.')}</div>}
        {players.map(m => {
          const c = m.character;
          const info = c.summary || c.data || {};  // mestre recebe a ficha inteira em `data`
          const lvl = info.level || 1;
          const pending = openFor(c.id, 'pending');
          const unlocked = openFor(c.id, 'approved');
          return (
            <div key={m.id} className="leveling-row">
              <div className="leveling-who">
                <strong>{c.name}</strong>
                <span className="muted text-xs">{charLine(c.summary || c.data, lang)} · {m.user.displayName}</span>
              </div>
              <span className="leveling-level mono">
                {t(lang, 'Nv', 'Lv')} {lvl}
                {xpMode && <span className="muted text-xs"> · {info.xp || 0}/{XP_NEXT[lvl] ?? '—'} XP</span>}
              </span>
              <div className="leveling-actions">
                {unlocked ? (
                  <>
                    <span className="pill pill-approved" title={unlocked.payload?.allowMulticlass === false ? t(lang, 'sem multiclasse', 'no multiclass') : ''}>
                      {t(lang, `liberado → ${unlocked.payload?.toLevel}`, `unlocked → ${unlocked.payload?.toLevel}`)}
                    </span>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => revoke(unlocked.id)}>{t(lang, 'Revogar', 'Revoke')}</button>
                  </>
                ) : lvl >= 20 ? (
                  <span className="muted text-xs">{t(lang, 'nível máximo', 'max level')}</span>
                ) : (
                  <>
                    {pending && <span className="pill pill-pending">{t(lang, 'pediu', 'requested')}</span>}
                    {xpMode && <button className="btn btn-ghost btn-sm" disabled={busy} title={t(lang, 'Dá o valor do campo de XP só para este personagem', 'Gives the XP field amount to this character only')} onClick={() => awardXp([c.id])}>+XP</button>}
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => grant([c.id])}>
                      {pending ? t(lang, 'Aprovar', 'Approve') : t(lang, `Liberar nível ${lvl + 1}`, `Unlock level ${lvl + 1}`)}
                    </button>
                    {pending && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} disabled={busy} onClick={() => reject(pending.id)}>{t(lang, 'Recusar', 'Reject')}</button>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ApprovalsTab({ campaign, approvals, lang, isDM, onChange }) {
  const review = async (id, status) => {
    await api.reviewApproval(id, { status });
    onChange();
  };
  // Subidas de nível dos personagens da mesa ficam no painel de evolução (mestre).
  const tableChars = new Set(campaign.members.filter(m => m.character).map(m => m.character.id));
  const inPanel = (a) => isDM && a.type === 'levelup' && tableChars.has(a.character?.id);
  const pending = approvals.filter(a => a.status === 'pending' && !inPanel(a));
  const unlocked = approvals.filter(a => a.status === 'approved' && !inPanel(a));
  const done = approvals.filter(a => a.status === 'consumed' || a.status === 'rejected');
  const statusLabel = { consumed: t(lang, 'aplicado', 'applied'), rejected: t(lang, 'recusado', 'rejected') };
  return (
    <div className="approvals">
      {isDM && <LevelingPanel campaign={campaign} approvals={approvals} lang={lang} onChange={onChange} />}

      <h3 style={{ marginTop: isDM ? 24 : 0 }}>{t(lang, 'Pedidos pendentes', 'Pending requests')} ({pending.length})</h3>
      {pending.length === 0 && <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhum pedido pendente.', 'No pending requests.')}</p>}
      {pending.map(a => (
        <div key={a.id} className="approval-card">
          <div>
            <strong>{a.requestedBy?.displayName}</strong> {t(lang, 'pediu', 'requested')} <strong>{labelType(a.type, lang)}</strong>
            {a.character && <> {t(lang, 'para', 'for')} <strong>{a.character.name}</strong></>}
          </div>
          {a.character?.classes && <div className="muted text-sm">{charLine(a.character, lang)}</div>}
          {payloadText(a, lang) && <div className="approval-detail">{payloadText(a, lang)}</div>}
          {a.note && <div className="approval-note">{a.note}</div>}
          {isDM && (
            <div className="row gap-2">
              <button className="btn btn-primary btn-sm" onClick={() => review(a.id, 'approved')}>
                {a.type === 'levelup' ? t(lang, '✨ Liberar evolução', '✨ Unlock evolution') : t(lang, 'Aprovar e aplicar', 'Approve & apply')}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} onClick={() => review(a.id, 'rejected')}>{t(lang, 'Rejeitar', 'Reject')}</button>
            </div>
          )}
        </div>
      ))}

      {unlocked.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>{t(lang, 'Liberadas (aguardando jogador)', 'Unlocked (awaiting player)')} ({unlocked.length})</h3>
          {unlocked.map(a => (
            <div key={a.id} className="approval-card unlocked">
              <div>
                <span className="pill pill-approved">{t(lang, 'liberada', 'unlocked')}</span>{' '}
                <strong>{a.character?.name || a.requestedBy?.displayName}</strong> · {labelType(a.type, lang)} {payloadText(a, lang)}
              </div>
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9em', margin: '6px 0 0' }}>
                {t(lang, 'O jogador confirma a subida na própria ficha (painel de Progressão).', 'The player confirms on their own sheet (Progression panel).')}
              </p>
              {isDM && (
                <div className="row gap-2" style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => review(a.id, 'pending')}>
                    {t(lang, 'Revogar liberação', 'Revoke unlock')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <h3 style={{ marginTop: 24 }}>{t(lang, 'Histórico', 'History')}</h3>
      {done.length === 0 && <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nada por aqui ainda.', 'Nothing here yet.')}</p>}
      {done.map(a => (
        <div key={a.id} className="approval-card reviewed">
          <div>
            <span className={`pill pill-${a.status === 'consumed' ? 'approved' : a.status}`}>{statusLabel[a.status] || a.status}</span>{' '}
            <strong>{a.character?.name || a.requestedBy?.displayName}</strong> · {labelType(a.type, lang)} {payloadText(a, lang)}
          </div>
          {a.type === 'levelup' && a.status === 'consumed' && levelupSummary(a.payload, lang) && (
            <div className="approval-detail">{levelupSummary(a.payload, lang)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ScreenTab({ campaign, lang, onChange }) {
  const rotate = async () => {
    if (!await ask(t(lang, 'Gerar novo link? O antigo deixa de funcionar.', 'Generate a new link? The old one will stop working.'))) return;
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
export function CampaignDiceRoller({ campaign, lang }) {
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
      // Mostra no dado 3D o valor que o servidor decidiu (pode vir de rig do mestre).
      window.__diceShow?.({
        label: label || `${count}${diceType}`,
        groups: [{ die: parseInt(diceType.slice(1), 10), rolls: r.results.map(x => ({ value: x.value, kept: true })) }],
        total: r.total,
      });
    } catch (e) {
      console.warn('roll failed', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="info-box">
      <h3 style={{ marginTop: 0 }}>{t(lang, 'Rolar dados', 'Roll dice')}</h3>
      <div className="dice-roll-form">
        <select className="input" value={diceType} onChange={e => setDiceType(e.target.value)} aria-label={t(lang, 'Dado', 'Die')}>
          {['d4','d6','d8','d10','d12','d20','d100'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input
          type="number"
          className="input"
          min={1}
          max={20}
          value={count}
          onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          aria-label={t(lang, 'Quantidade', 'Count')}
        />
        <input aria-label={t(lang, 'rótulo (ex: percepção)', 'label (e.g. perception)')}
          className="input"
          placeholder={t(lang, 'rótulo (ex: percepção)', 'label (e.g. perception)')}
          value={label}
          onChange={e => setLabel(e.target.value)}
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
