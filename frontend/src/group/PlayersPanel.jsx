import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { tName } from '../../data/i18n.js';
import Utils from '../../utils.js';
import DMCharacterEditor from '../campaigns/DMCharacterEditor.jsx';
import { editLogEntries, formatEditLogDate } from '../campaigns/edit-log.js';
import GiveItemModal from '../campaigns/GiveItemModal.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import { HpBar, PcBadges, PcPortrait } from '../shell/MesaPc.jsx';
import { useArea } from '../shell/useArea.js';
import MoreMenu from './MoreMenu.jsx';
import { groupApi } from './group-api.js';
import useRaioX from './useRaioX.js';
import { charLine, hpTone, levelupFor, memberStats, statPills, t, xpKnown, xpProgress } from './group-model.js';

/**
 * Cards dos jogadores da mesa (PlayerCard, plano §4.3): retrato, classe/espécie
 * traduzidas, PV, pastilhas de CA, iniciativa e nível (só as que têm valor;
 * mesmo cálculo da Mesa: Utils.computeAc / Utils.initiative), XP (só com dado)
 * e selos (PcBadges).
 * Mestre: 🛠 Editar ficha e 🎁 Dar item no rodapé; no ⋯, 📜 Registro (só se a
 * ficha tiver, ver campaigns/edit-log.js), 🐾 Encerrar forma (só druida em
 * forma) e Remover da mesa. Jogador: no ⋯ do próprio cartão, Trocar personagem
 * (folha com as fichas) e Sair da campanha (com confirmação; a ficha continua
 * com ele). O jogador vê o próprio cartão primeiro, com `afterMine` (Meus
 * pedidos) logo abaixo.
 * Mestre: 2 chips com os papéis mais fortes de cada personagem no Raio-X ("Cura 5 ·
 * Magia 5"); tocar abre Grupo › Raio-X com ele em destaque (useRaioX: as contas chegam
 * por import dinâmico e os ajustes do mestre 1 vez por campanha).
 * focusMember: id da vaga para trazer à vista (busca rápida).
 */
export default function PlayersPanel({ campaign, lang, isDM, characters = [], approvals = [], ask, notify, onChange, onLeft, afterMine = null, focusMember = null }) {
  const [editing, setEditing] = useState(null);
  const [giving, setGiving] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const gridRef = useRef(null);
  // fichas que saíram desta mesa agora: a lista do app (`characters`) ainda diz "em campanha"
  // até recarregar, e a folha de troca não pode deixá-las apagadas
  const released = useRef(new Set());
  const xpMode = campaign.state?.levelingMode === 'xp';
  const members = campaign.members || [];
  const dm = members.find(m => m.role === 'dm');
  const players = members.filter(m => m.role !== 'dm');
  const meId = typeof window !== 'undefined' ? window.__currentUserId__ : null;
  const { goTo } = useArea();
  const roles = usePartyRoles(campaign, isDM, lang);
  // o jogador se vê primeiro (com os próprios pedidos logo abaixo); o mestre vê a ordem da mesa
  const ordered = isDM ? players : [...players.filter(m => m.user?.id === meId), ...players.filter(m => m.user?.id !== meId)];
  const assigningMember = assigning != null ? players.find(m => m.id === assigning) : null;

  // busca rápida (membro) → traz o cartão à vista e acende por um instante
  useEffect(() => {
    if (focusMember == null) return undefined;
    const el = gridRef.current?.querySelector(`[data-mid="${CSS.escape(String(focusMember))}"]`);
    if (!el) return undefined;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView(); }
    el.classList.add('is-found');
    const id = setTimeout(() => el.classList.remove('is-found'), 1800);
    return () => clearTimeout(id);
  }, [focusMember]);

  const run = async (fn, ok) => {
    try { await fn(); if (ok) notify?.(ok); onChange?.(); } catch (e) { notify?.(errorMessage(e, lang), 'error'); }
  };
  const assign = (m, charId) => run(async () => {
    const id = charId ? Number(charId) || charId : null;
    await api.updateMembership(campaign.id, m.id, { characterId: id });
    if (m.character && m.character.id !== id) released.current.add(m.character.id);
    if (id != null) released.current.delete(id);
    setAssigning(null);
  }, t(lang, 'Personagem da mesa atualizado.', 'Table character updated.'));

  const removeMember = async (m) => {
    const who = m.character?.name || m.user?.displayName || '';
    const ok = await ask({
      title: t(lang, `Remover ${who} da mesa?`, `Remove ${who} from the table?`),
      text: t(lang, 'A ficha continua com o jogador. Ele pode voltar com o código de convite.', 'The sheet stays with the player. They can come back with the invite code.'),
      okLabel: t(lang, 'Remover', 'Remove'), danger: true,
    });
    if (ok) run(() => api.removeMember(campaign.id, m.id), t(lang, `${who} saiu da mesa.`, `${who} left the table.`));
  };
  const leave = async () => {
    const ok = await ask({
      title: t(lang, `Sair de ${campaign.name}?`, `Leave ${campaign.name}?`),
      text: t(lang,
        'Sua ficha continua com você — ela só deixa esta mesa. Você para de ver o Mundo e a Crônica desta campanha. Para voltar, peça um novo convite ao mestre.',
        'Your sheet stays with you — it only leaves this table. You stop seeing this campaign\'s World and Chronicle. To come back, ask the DM for a new invite.'),
      okLabel: t(lang, 'Sair da campanha', 'Leave campaign'), danger: true,
    });
    if (!ok) return;
    try {
      await groupApi.leaveCampaign(campaign.id);
      if (onLeft) onLeft(); else onChange?.();
    } catch (e) { notify?.(errorMessage(e, lang), 'error'); }
  };
  const endForm = async (m) => {
    const ok = await ask({
      title: t(lang, `Tirar ${m.character.name} da forma selvagem?`, `End ${m.character.name}'s wild shape?`),
      okLabel: t(lang, 'Encerrar forma', 'End form'),
    });
    if (ok) run(() => api.wildShapeForceEnd(m.character.id, {}), t(lang, `${m.character.name} voltou à forma normal.`, `${m.character.name} is back to normal form.`));
  };

  return (
    <div className="grp-players">
      {dm && (
        <p className="grp-dm-line muted small">
          👑 {t(lang, 'Mestre', 'DM')}: <strong>{dm.user?.displayName}</strong>
          {' · '}{players.length === 1 ? t(lang, '1 jogador', '1 player') : t(lang, `${players.length} jogadores`, `${players.length} players`)}
        </p>
      )}

      {players.length === 0 && (
        <div className="grp-empty">
          <span className="grp-empty-icon" aria-hidden="true">🛡</span>
          <p>{isDM
            ? t(lang, 'A mesa ainda está vazia. Copie o link de convite acima e mande para os jogadores.', 'The table is still empty. Copy the invite link above and send it to your players.')
            : t(lang, 'Ninguém na mesa ainda.', 'Nobody at the table yet.')}</p>
        </div>
      )}

      {players.length > 0 && (
        <div className="grp-card-grid" ref={gridRef}>
          {ordered.map(m => {
            const isMe = m.user?.id === meId;
            return (
              <Fragment key={m.id}>
                <PlayerCard m={m} lang={lang} isDM={isDM} xpMode={xpMode} isMe={isMe}
                  pending={m.character ? levelupFor(approvals, m.character.id, 'pending') : null}
                  unlocked={m.character ? levelupFor(approvals, m.character.id, 'approved') : null}
                  onAssignStart={() => setAssigning(m.id)}
                  onEdit={() => setEditing({ id: m.character.id, name: m.character.name, data: m.character.data })}
                  onLog={() => setEditing({ id: m.character.id, name: m.character.name, data: m.character.data, section: 'log' })}
                  onGive={campaign.status === 'closed' ? null : () => setGiving({ id: m.character.id, name: m.character.name })}
                  onEndForm={() => endForm(m)} onRemove={() => removeMember(m)} onLeave={leave}
                  roles={isDM && m.character?.data ? (roles ? roles[m.character.id] || [] : null) : undefined}
                  onRoles={() => goTo('group', 'insights', { focus: m.character.id })} />
                {isMe && !isDM && afterMine && <div className="grp-after-mine">{afterMine}</div>}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* sem o próprio cartão na lista (ainda sem a conta carregada): os pedidos vêm depois */}
      {!isDM && afterMine && !ordered.some(m => m.user?.id === meId) && <div className="grp-after-mine">{afterMine}</div>}

      {assigningMember && (
        <AssignSheet lang={lang} member={assigningMember} characters={characters}
          released={released.current} onPick={(id) => assign(assigningMember, id)} onClose={() => setAssigning(null)} />
      )}
      {editing && (
        <DMCharacterEditor character={editing} lang={lang} initialSection={editing.section} onClose={() => setEditing(null)}
          onSaved={() => { notify?.(t(lang, `Ficha de ${editing.name} salva.`, `${editing.name}'s sheet saved.`)); setEditing(null); onChange?.(); }} />
      )}
      {giving && (
        <GiveItemModal campaign={campaign} character={giving} lang={lang} notify={false} onClose={() => setGiving(null)}
          onGiven={(instance) => {
            const who = giving.name;
            setGiving(null); onChange?.();
            const raw = instance?.name;
            const itemName = raw && typeof raw === 'object' ? (raw[lang] || raw.pt || raw.en) : raw;
            const qty = instance?.qty > 1 ? `${instance.qty}× ` : '';
            notify?.(itemName
              ? t(lang, `${who} recebeu ${qty}${itemName}`, `${who} received ${qty}${itemName}`)
              : t(lang, `${who} recebeu o item`, `${who} received the item`));
          }} />
      )}
    </div>
  );
}

/** {id da ficha: [{key, label, v}]} — os 2 papéis mais fortes no Raio-X (null enquanto carrega). */
function usePartyRoles(campaign, isDM, lang) {
  const members = campaign.members || [];
  const has = isDM && members.some(m => m.role !== 'dm' && m.character?.data);
  const rx = useRaioX(campaign.id, has);
  // a mesma ficha → as mesmas contas (o GET da campanha chega a cada poucos segundos)
  const key = members.map(m => `${m.character?.id}:${JSON.stringify(m.character?.data || null)}`).join('|');
  return useMemo(() => {
    if (!rx) return null;
    const { PM, ins } = rx;
    const facts = PM.partyFacts(PM.partyMembers(members), lang);
    const opts = { w: ins.w, base: ins.base, hidden: ins.hidden };
    const avg = PM.partyAxes(facts, opts).axes;
    return Object.fromEntries(facts.map(f => [f.id, PM.topRoles(f, { ...opts, avg }).map(r => ({ ...r, name: PM.axisLabel(r.key, lang), value: PM.fmt(r.v, lang), label: `${PM.axisLabel(r.key, lang)} ${PM.fmt(r.v, lang)}` }))]));
  }, [rx, key, lang]); // eslint-disable-line react-hooks/exhaustive-deps
}

function PlayerCard({ m, lang, isDM, xpMode, isMe, pending, unlocked, onAssignStart, onEdit, onLog, onGive, onEndForm, onRemove, onLeave, roles, onRoles }) {
  const c = m.character;
  const s = memberStats(m);
  const name = c?.name || m.user?.displayName;
  const log = isDM ? editLogEntries(c?.data) : [];
  const tone = s ? hpTone(s.hp, s.maxHp) : 'unknown';
  const pills = statPills(s, lang);
  const xp = s && xpMode && xpKnown(s) ? xpProgress(s.level, s.xp) : null;
  const wild = !!(isDM && c?.data && s?.isDruid && s.wildShape);
  const menu = [
    isDM && c?.data && log.length > 0 && {
      id: 'log', label: `📜 ${t(lang, 'Registro', 'Edit log')} (${log.length})`, onSelect: onLog,
      hint: t(lang, `Última edição: ${formatEditLogDate(log[0].at, lang)}`, `Last edit: ${formatEditLogDate(log[0].at, lang)}`),
    },
    wild && { id: 'wild', label: `🐾 ${t(lang, 'Encerrar forma', 'End form')}`, onSelect: onEndForm,
      hint: t(lang, 'Tira o personagem da forma selvagem (com confirmação).', 'Takes the character out of wild shape (asks first).') },
    isMe && { id: 'swap', label: t(lang, 'Trocar personagem', 'Change character'), onSelect: onAssignStart },
    isDM && { id: 'remove', label: t(lang, 'Remover da mesa', 'Remove from table'), onSelect: onRemove, danger: true,
      hint: t(lang, 'A ficha continua com o jogador.', 'The sheet stays with the player.') },
    isMe && !isDM && { id: 'leave', label: t(lang, 'Sair da campanha', 'Leave campaign'), onSelect: onLeave, danger: true,
      hint: t(lang, 'Sua ficha continua com você.', 'Your sheet stays with you.') },
  ].filter(Boolean);

  // Cartão de ≤ 260 px no celular, de cima para baixo: cabeça (retrato, nome, classe, jogador; o ⋯ no
  // canto), PV com CA e Inic. na mesma linha, XP fina, selos, os 2 chips do Raio-X e o rodapé.
  return (
    <article className={`grp-card mesa-panel tone-${tone} ${s?.hp != null && s.hp <= 0 ? 'is-down' : ''} ${isMe ? 'is-me' : ''} ${menu.length ? 'has-more' : ''}`} data-mid={m.id}>
      <header className="grp-card-head">
        <PcPortrait stats={s} name={name} size={48} className="grp-card-pic" />
        <div className="grp-card-who">
          <strong className="grp-card-name">{name}</strong>
          <span className="grp-card-line">{c ? charLine(c.summary || c.data, lang) : t(lang, 'Sem personagem ainda', 'No character yet')}</span>
          <span className="grp-card-player">{t(lang, 'Jogador', 'Player')}: {m.user?.displayName}{isMe && !isDM ? ` · ${t(lang, 'você', 'you')}` : ''}</span>
        </div>
        <MoreMenu items={menu} lang={lang} label={t(lang, `Mais ações: ${name}`, `More actions: ${name}`)} sheetTitle={name} />
      </header>

      {s && (
        <>
          <div className="grp-card-vitals">
            <HpBar hp={s.hp} max={s.maxHp} temp={s.tempHp} lang={lang} units className="grp-card-hp" />
            {pills.map(p => (
              <span key={p.id} className={`grp-pill is-${p.id}`} aria-label={`${p.long}: ${p.value}`}>
                <span className="grp-pill-k" aria-hidden="true">{p.label}</span>
                <span className="grp-pill-v" aria-hidden="true">{p.value}</span>
              </span>
            ))}
          </div>
          {xp && (
            <div className="grp-xp">
              <span className="grp-xp-bar" aria-hidden="true"><span style={{ width: `${xp.pct}%` }} /></span>
              <span className="grp-xp-text">{xp.next ? `${xp.xp} / ${xp.next} XP` : `${xp.xp} XP · ${t(lang, 'nível máximo', 'max level')}`}</span>
            </div>
          )}
          <PcBadges stats={s} lang={lang} isDM={isDM} asked={!!pending}
            unlockedTo={unlocked ? (unlocked.payload?.toLevel ?? s.level + 1) : null} />
          {/* mestre: o lugar dos 2 chips fica reservado enquanto as contas chegam (nada pula):
              os 2 cabem numa linha só, a 320 também (o nome encolhe com "…", o número fica) */}
          {roles !== undefined && (
            <div className="grp-roles" role="group" aria-label={t(lang, `Papéis mais fortes de ${c.name} no Raio-X`, `${c.name}'s strongest roles in the X-ray`)}>
              {roles === null
                ? <span className="grp-roles-wait muted small">{t(lang, 'Raio-X…', 'X-ray…')}</span>
                : roles.map(r => (
                  <button key={r.key} type="button" className="mesa-chip grp-role-chip" onClick={onRoles}
                    aria-label={t(lang, `${r.label}: abrir o Raio-X com ${c.name} em destaque`, `${r.label}: open the X-ray highlighting ${c.name}`)}>
                    <span aria-hidden="true">✦</span><span className="grp-role-name">{r.name}</span><span className="grp-role-v">{r.value}</span>
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      {!c && isMe && (
        <button type="button" className="mesa-btn mesa-btn-lg is-primary grp-card-choose" onClick={onAssignStart}>{t(lang, 'Escolher meu personagem', 'Choose my character')}</button>
      )}

      {isDM && c?.data && (
        <footer className="grp-card-actions">
          <button type="button" className="mesa-btn" onClick={onEdit}>🛠 {t(lang, 'Editar ficha', 'Edit sheet')}</button>
          {/* campanha encerrada é só leitura: sem Dar item (o servidor responde 423) */}
          {onGive && <button type="button" className="mesa-btn" onClick={onGive}>🎁 {t(lang, 'Dar item', 'Give item')}</button>}
        </footer>
      )}
    </article>
  );
}

/**
 * "Trocar personagem" / "Escolher meu personagem": folha com as fichas da conta
 * (no lugar do select que cortava o nome). Tocar numa ficha já põe na mesa;
 * fichas que estão em outra mesa aparecem desabilitadas, com o motivo (o
 * servidor também recusa: uma ficha numa campanha por vez). `released`: as que
 * acabaram de sair desta mesa (a lista do app ainda as marca em campanha).
 */
function AssignSheet({ lang, member, characters, released, onPick, onClose }) {
  const cur = member.character?.id ?? null;
  return (
    <MesaSheet lang={lang} size="auto" width="sm" icon="🛡"
      title={cur != null ? t(lang, 'Trocar personagem', 'Change character') : t(lang, 'Escolher meu personagem', 'Choose my character')}
      onClose={onClose}
      footer={<div className="mesa-actions"><button type="button" className="mesa-btn" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button></div>}>
      <p className="mesa-sheet-text">{t(lang, 'Personagem nesta mesa', 'Character at this table')}</p>
      <div className="grp-assign-list mesa-panel is-sunk" role="radiogroup" aria-label={t(lang, 'Personagem nesta mesa', 'Character at this table')}>
        {characters.map(ch => {
          const here = ch.id === cur;
          const busy = !!ch.inCampaign && !here && !released?.has(ch.id);
          let cls = '';
          try { cls = Utils.classLabel(ch, lang, tName); } catch { cls = ''; }
          return (
            <button key={ch.id} type="button" role="radio" aria-checked={here} disabled={busy}
              className={`mesa-row grp-assign-row ${here ? 'is-on' : ''}`} onClick={() => (here ? onClose() : onPick(ch.id))}>
              <span className="grp-assign-mark" aria-hidden="true">{here ? '✓' : ''}</span>
              <span className="mesa-row-main">
                <span className="mesa-row-title">{ch.name || t(lang, 'Sem nome', 'Unnamed')}</span>
                <span className="mesa-row-sub">
                  {[cls, here ? t(lang, 'nesta mesa', 'at this table') : busy ? t(lang, 'já está em outra mesa', 'already at another table') : ''].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={cur == null} className={`mesa-row grp-assign-row ${cur == null ? 'is-on' : ''}`}
          onClick={() => (cur == null ? onClose() : onPick(null))}>
          <span className="grp-assign-mark" aria-hidden="true">{cur == null ? '✓' : ''}</span>
          <span className="mesa-row-main">
            <span className="mesa-row-title">— {t(lang, 'Nenhum', 'None')} —</span>
            <span className="mesa-row-sub">{t(lang, 'Fico na mesa sem ficha por enquanto', 'Stay at the table without a sheet for now')}</span>
          </span>
        </button>
      </div>
    </MesaSheet>
  );
}
