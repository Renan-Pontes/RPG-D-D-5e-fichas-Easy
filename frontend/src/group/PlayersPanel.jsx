import { useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { tName } from '../../data/i18n.js';
import Utils from '../../utils.js';
import { classArt, speciesArt } from '../art.js';
import DMCharacterEditor from '../campaigns/DMCharacterEditor.jsx';
import GiveItemModal from '../campaigns/GiveItemModal.jsx';
import MoreMenu from './MoreMenu.jsx';
import { groupApi } from './group-api.js';
import { charLine, fmtMod, hpTone, levelupFor, memberStats, t, xpProgress } from './group-model.js';

const condName = (c, lang) => (c === 'exhaustion' ? t(lang, 'Exaustão', 'Exhaustion') : tName('condition', c, lang));

/**
 * Cards dos jogadores da mesa: retrato, classe/espécie traduzidas, PV, CA e
 * iniciativa (mesmo cálculo da Mesa: Utils.computeAc / Utils.initiative).
 * Mestre: editar ficha, dar item (com aviso), encerrar forma selvagem (só
 * druida em forma) e remover da mesa. Jogador: trocar o próprio personagem e
 * sair da campanha (com confirmação; a ficha continua com ele).
 */
export default function PlayersPanel({ campaign, lang, isDM, characters = [], approvals = [], ask, notify, onChange, onLeft }) {
  const [editing, setEditing] = useState(null);
  const [giving, setGiving] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const xpMode = campaign.state?.levelingMode === 'xp';
  const members = campaign.members || [];
  const dm = members.find(m => m.role === 'dm');
  const players = members.filter(m => m.role !== 'dm');
  const meId = typeof window !== 'undefined' ? window.__currentUserId__ : null;

  const run = async (fn, ok) => {
    try { await fn(); if (ok) notify?.(ok); onChange?.(); } catch (e) { notify?.(errorMessage(e, lang), 'error'); }
  };
  const assign = (m, charId) => run(async () => {
    await api.updateMembership(campaign.id, m.id, { characterId: charId ? Number(charId) || charId : null });
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

      <div className="grp-card-grid">
        {players.map(m => (
          <PlayerCard key={m.id} m={m} lang={lang} isDM={isDM} xpMode={xpMode} isMe={m.user?.id === meId}
            pending={m.character ? levelupFor(approvals, m.character.id, 'pending') : null}
            unlocked={m.character ? levelupFor(approvals, m.character.id, 'approved') : null}
            assigning={assigning === m.id} characters={characters}
            onAssignStart={() => setAssigning(m.id)} onAssignCancel={() => setAssigning(null)} onAssign={(id) => assign(m, id)}
            onEdit={() => setEditing({ id: m.character.id, name: m.character.name, data: m.character.data })}
            onGive={() => setGiving({ id: m.character.id, name: m.character.name })}
            onEndForm={() => endForm(m)} onRemove={() => removeMember(m)} onLeave={leave} />
        ))}
      </div>

      {editing && (
        <DMCharacterEditor character={editing} lang={lang} onClose={() => setEditing(null)}
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

function Portrait({ stats, name }) {
  const [broken, setBroken] = useState(false);
  const art = stats?.avatar || speciesArt(stats?.race) || classArt(stats?.classId);
  if (art && !broken) {
    return <img className={`grp-portrait ${stats?.avatar ? 'is-avatar' : 'is-art'}`} src={art} alt="" loading="lazy" onError={() => setBroken(true)} />;
  }
  return <span className="grp-portrait is-initial" aria-hidden="true">{(name || '?').charAt(0).toUpperCase()}</span>;
}

function PlayerCard({ m, lang, isDM, xpMode, isMe, pending, unlocked, assigning, characters, onAssignStart, onAssignCancel, onAssign, onEdit, onGive, onEndForm, onRemove, onLeave }) {
  const c = m.character;
  const s = memberStats(m);
  const tone = s ? hpTone(s.hp, s.maxHp) : 'unknown';
  const pct = s?.maxHp ? Math.max(0, Math.min(100, ((s.hp ?? 0) / s.maxHp) * 100)) : 0;
  const xp = s ? xpProgress(s.level, s.xp) : null;
  const menu = [
    isMe && { id: 'swap', label: t(lang, 'Trocar personagem', 'Change character'), onSelect: onAssignStart },
    isDM && { id: 'remove', label: t(lang, 'Remover da mesa', 'Remove from table'), onSelect: onRemove, danger: true },
    isMe && !isDM && { id: 'leave', label: t(lang, 'Sair da campanha', 'Leave campaign'), onSelect: onLeave, danger: true },
  ].filter(Boolean);

  return (
    <article className={`grp-card tone-${tone} ${s?.hp != null && s.hp <= 0 ? 'is-down' : ''}`}>
      <header className="grp-card-head">
        <Portrait stats={s} name={c?.name || m.user?.displayName} />
        <div className="grp-card-who">
          <strong className="grp-card-name">{c?.name || m.user?.displayName}</strong>
          <span className="grp-card-line">{c ? charLine(c.summary || c.data, lang) : t(lang, 'Sem personagem ainda', 'No character yet')}</span>
          <span className="grp-card-player muted">{t(lang, 'Jogador', 'Player')}: {m.user?.displayName}</span>
        </div>
        <MoreMenu items={menu} label={t(lang, 'Mais ações', 'More actions')} />
      </header>

      {s && (
        <>
          <div className={`grp-hp tone-${tone}`} role="img" aria-label={t(lang, `Pontos de vida ${s.hp ?? '?'} de ${s.maxHp ?? '?'}`, `Hit points ${s.hp ?? '?'} of ${s.maxHp ?? '?'}`)}>
            <div className="grp-hp-fill" style={{ width: `${pct}%` }} />
            <span className="grp-hp-text">
              {t(lang, 'PV', 'HP')} {s.hp ?? '?'}/{s.maxHp ?? '?'}
              {s.tempHp > 0 && <span className="grp-temp"> +{s.tempHp} {t(lang, 'temp.', 'temp')}</span>}
            </span>
          </div>
          <dl className="grp-stats">
            <div title={t(lang, 'Classe de Armadura', 'Armor Class')}><dt>{t(lang, 'CA', 'AC')}</dt><dd>{s.ac ?? '—'}</dd></div>
            <div title={t(lang, 'Iniciativa', 'Initiative')}><dt>{t(lang, 'Inic.', 'Init.')}</dt><dd>{s.init == null ? '—' : fmtMod(s.init)}</dd></div>
            <div><dt>{t(lang, 'Nível', 'Level')}</dt><dd>{s.level}</dd></div>
          </dl>
          {xpMode && xp && (
            <div className="grp-xp" title={xp.next ? `${xp.xp} / ${xp.next} XP` : `${xp.xp} XP`}>
              <div className="grp-xp-bar"><div style={{ width: `${xp.pct}%` }} /></div>
              <span className="muted small">{xp.next ? `${xp.xp} / ${xp.next} XP` : `${xp.xp} XP · ${t(lang, 'nível máximo', 'max level')}`}</span>
            </div>
          )}
          <div className="grp-badges">
            {s.inspiration && <span className="grp-badge is-insp" title={t(lang, 'Tem inspiração', 'Has inspiration')}>★ {t(lang, 'Inspiração', 'Inspiration')}</span>}
            {s.conditions.map(cd => <span key={cd} className="grp-badge is-cond">{condName(cd, lang)}</span>)}
            {s.isDruid && s.wildShape && (
              <span className="grp-badge is-wild">🐾 {t(lang, 'Forma selvagem', 'Wild shape')}{s.wildShape.beast ? `: ${s.wildShape.beast}` : ''}
                {s.wildShape.hp != null && ` (${s.wildShape.hp}/${s.wildShape.maxHp ?? '?'})`}</span>
            )}
            {unlocked && <span className="grp-badge is-unlocked">✨ {t(lang, `Nível ${unlocked.payload?.toLevel ?? s.level + 1} liberado`, `Level ${unlocked.payload?.toLevel ?? s.level + 1} unlocked`)}</span>}
            {pending && <span className="grp-badge is-pending">⬆ {t(lang, 'Pediu para subir', 'Asked to level up')}</span>}
            {isDM && s.cheatMode && <span className="grp-badge is-cheat" title={t(lang, 'Modo trapaça ativo nesta ficha', 'Cheat mode active on this sheet')}>🎲 {t(lang, 'Trapaça', 'Cheat')}</span>}
          </div>
        </>
      )}

      {assigning && (
        <div className="grp-assign">
          <label className="grp-assign-label">
            <span className="small">{t(lang, 'Personagem nesta mesa', 'Character at this table')}</span>
            <select className="input" defaultValue={c?.id ?? ''} onChange={e => onAssign(e.target.value || null)}>
              <option value="">— {t(lang, 'Nenhum', 'None')} —</option>
              {characters.map(ch => <option key={ch.id} value={ch.id}>{ch.name} ({Utils.classLabel(ch, lang, tName)})</option>)}
            </select>
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onAssignCancel}>{t(lang, 'Cancelar', 'Cancel')}</button>
        </div>
      )}

      {!c && isMe && !assigning && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onAssignStart}>{t(lang, 'Escolher meu personagem', 'Choose my character')}</button>
      )}

      {isDM && c?.data && (
        <footer className="grp-card-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>🛠 {t(lang, 'Editar ficha', 'Edit sheet')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onGive}>🎁 {t(lang, 'Dar item', 'Give item')}</button>
          {s?.isDruid && s.wildShape && (
            <button type="button" className="btn btn-ghost btn-sm grp-wild-end" onClick={onEndForm}>🐾 {t(lang, 'Encerrar forma', 'End form')}</button>
          )}
        </footer>
      )}
    </article>
  );
}
