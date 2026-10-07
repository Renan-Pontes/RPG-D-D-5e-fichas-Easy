/* Código de mesa na criação: cartão da campanha do convite + bloco opcional da etapa Começo. */
import { useState } from 'react';
import { api, API_BASE } from '../api/client.js';
import { L } from './ui.jsx';
import { normalizeInviteCode, joinFromInvite, joinPatch, creationJoin, inviteCheckMessage } from './creation.js';
import './join-table.css';
import useMyPlan from '../plans/useMyPlan.js';
import { inviteSeatsFree, seatNoticeText } from '../plans/plans-logic.js';
import '../plans/plans.css';

const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const memberCount = (m) => (Array.isArray(m) ? m.length : Number.isFinite(m) ? m : null);

/** Cartão da mesa (nome, frase, mestre, progressão). `children` = ações. */
export function TableInviteCard({ table, lang, children, confirmed = false, notice = '' }) {
  if (!table) return null;
  const n = memberCount(table.members);
  return (
    <div className={`join-card ${confirmed ? 'is-confirmed' : ''}`} style={isHex(table.accent) ? { '--join-accent': table.accent } : undefined}>
      {table.coverUrl && (
        <img className="join-card-cover" src={`${API_BASE}${table.coverUrl}`} alt="" loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
      <div className="join-card-eyebrow">
        {confirmed ? <>✓ {L(lang, 'Seu personagem vai entrar nesta mesa', 'Your character will join this table')}</> : L(lang, 'Mesa encontrada', 'Table found')}
      </div>
      <h4 className="join-card-name">{table.name || L(lang, 'Mesa sem nome', 'Untitled table')}</h4>
      {table.tagline && <p className="join-card-tagline">{table.tagline}</p>}
      <dl className="join-card-meta">
        {table.dmName && <div><dt>{L(lang, 'Mestre', 'GM')}</dt><dd>{table.dmName}</dd></div>}
        {n != null && <div><dt>{L(lang, 'Jogadores', 'Players')}</dt><dd>{n === 0 ? L(lang, 'você será o primeiro', "you'll be the first") : n}</dd></div>}
        <div><dt>{L(lang, 'Sobe de nível', 'Levels up')}</dt><dd>{table.levelingMode === 'xp' ? L(lang, 'por XP', 'by XP') : L(lang, 'quando a história pede (o mestre libera)', 'when the story calls for it (DM unlocks)')}</dd></div>
      </dl>
      {table.alreadyMember && (
        <p className="join-card-note">{L(lang,
          'Você já participa desta mesa: este personagem passa a ser o seu nela.',
          'You are already in this table: this character becomes yours there.')}</p>
      )}
      {notice && <p className="pl-sponsored-note" role="note">🪑 {notice}</p>}
      {children && <div className="join-card-actions">{children}</div>}
    </div>
  );
}

/**
 * Bloco opcional "Tem um código de mesa?" da etapa Começo.
 * Nada aqui vira pendência: sem código, a criação segue igual.
 */
export function JoinTableBlock({ char, set, lang, joinEnabled = true }) {
  const join = creationJoin(char);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(null); // mesa verificada, ainda não confirmada
  const [seatsFree, setSeatsFree] = useState(null);
  // No limite de personagens? Então a ficha entra usando uma vaga da mesa.
  const my = useMyPlan(joinEnabled);

  const verify = async (e) => {
    e?.preventDefault?.();
    const c = normalizeInviteCode(code);
    if (!c || busy) return;
    setBusy(true); setError(null); setFound(null);
    try {
      const res = await api.campaignInvite(c);
      const j = joinFromInvite(c, res);
      if (!j) throw Object.assign(new Error('invite_invalid'), { status: 404 });
      setFound(j);
      setSeatsFree(inviteSeatsFree(res));
    } catch (err) {
      setError(inviteCheckMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => { set(prev => joinPatch(prev, found)); setFound(null); setCode(''); setOpen(false); };
  const remove = () => { set(prev => joinPatch(prev, null)); setOpen(true); };

  if (join) {
    return (
      <div className="join-block">
        <TableInviteCard table={join} lang={lang} confirmed notice={seatNoticeText(my, join.dmName, lang, seatsFree)}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>{L(lang, 'Trocar ou tirar a mesa', 'Change or remove table')}</button>
        </TableInviteCard>
      </div>
    );
  }

  return (
    <div className="join-block">
      {!open ? (
        <button type="button" className="join-toggle" onClick={() => setOpen(true)} aria-expanded="false">
          <span className="join-toggle-ico" aria-hidden="true">🗝</span>
          <span>{L(lang, 'Tem um código de mesa?', 'Have a table code?')} <span className="muted">({L(lang, 'opcional', 'optional')})</span></span>
        </button>
      ) : (
        <div className="join-panel">
          <div className="join-panel-head">
            <strong>{L(lang, 'Código de mesa', 'Table code')}</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setError(null); setFound(null); }}>
              {L(lang, 'Agora não', 'Not now')}
            </button>
          </div>
          <p className="muted text-sm" style={{ margin: '0 0 var(--s-2)' }}>{L(lang,
            'Se o seu mestre te passou um código, digite aqui: o personagem já nasce dentro da campanha. Sem código? Pode seguir — dá para entrar numa mesa depois.',
            'If your GM gave you a code, type it here: the character is created inside the campaign. No code? Just go on — you can join a table later.')}</p>
          {!joinEnabled ? (
            <p className="join-hint">{L(lang,
              'Para entrar numa mesa, entre na sua conta (botão "Entrar", no topo). Seu rascunho fica guardado.',
              'To join a table, log in first ("Log in" button at the top). Your draft is kept.')}</p>
          ) : (
            <form className="join-form" onSubmit={verify}>
              <input className="input join-input" value={code} maxLength={16} autoComplete="off" spellCheck={false}
                aria-label={L(lang, 'Código de mesa', 'Table code')} placeholder="ABCDEF"
                onChange={e => { setCode(normalizeInviteCode(e.target.value)); setError(null); setFound(null); }} />
              <button type="submit" className="btn btn-primary" disabled={busy || !code}>
                {busy ? L(lang, 'Verificando…', 'Checking…') : L(lang, 'Verificar', 'Check')}
              </button>
            </form>
          )}
          {error && <div className="join-error" role="alert">{error[lang] || error.pt}</div>}
          {found && (
            <TableInviteCard table={found} lang={lang} notice={seatNoticeText(my, found.dmName, lang, seatsFree)}>
              <button type="button" className="btn btn-primary" onClick={confirm}>{L(lang, 'É essa! Entrar nesta mesa', "That's it! Join this table")}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setFound(null)}>{L(lang, 'Não é essa', 'Not this one')}</button>
            </TableInviteCard>
          )}
        </div>
      )}
    </div>
  );
}
