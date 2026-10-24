/* Modal "Campanha" da ficha: atrelar a uma mesa em que a pessoa joga (ou por código
   de convite), desatrelar e trocar de campanha. Uma campanha por vez (o servidor
   garante: 409 character_in_other_campaign; "Trocar" reenvia com move). A lógica
   e os textos ficam em campaign-link.js; aqui só a apresentação. */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Modal } from '../../components/Shared.jsx';
import { TableInviteCard } from '../creator/JoinTable.jsx';
import { normalizeInviteCode, joinFromInvite } from '../creator/creation.js';
import { closedText, sponsoredFrom, sponsoredText } from '../plans/plans-logic.js';
import {
  playerTables, dmTableCount, seatState, seatLabel, otherCampaignFrom, linkErrorText,
  attachConfirm, detachConfirm, switchConfirm, linkToast, findMyMembership,
} from './campaign-link.js';
import './campaign-link.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * char: ficha da conta (id numérico). onDone(msg): a ação deu certo — a ficha
 * recarrega (char.inCampaign / modo campanha) e o toast mostra `msg`.
 */
export default function CampaignLinkModal({ char, lang = 'pt', onClose, onDone }) {
  const [data, setData] = useState(null);   // { links, campaigns }
  const [loadErr, setLoadErr] = useState('');
  const [switching, setSwitching] = useState(false); // "Trocar de campanha": escolhendo a nova mesa
  const [confirm, setConfirm] = useState(null);      // { title, text, ok, danger, run }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoadErr('');
    try {
      const [l, c] = await Promise.all([api.characterCampaigns(char.id), api.listCampaigns()]);
      setData({ links: l.campaigns || [], campaigns: c.campaigns || [] });
    } catch (e) {
      setLoadErr(linkErrorText(e, lang));
    }
  }, [char.id, lang]);
  useEffect(() => { load(); }, [load]);

  const links = data?.links || [];
  const linked = links.length > 0;
  const current = links[0] || null;
  const tables = playerTables(data?.campaigns, links.map(l => l.id));
  const charName = char.name;

  // Roda uma ação; 409 "está em outra campanha" vira a confirmação de troca. Outro
  // erro fica na tela em que a pessoa está (a confirmação ou a lista).
  const run = async (fn, { onConflict } = {}) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const msg = await fn();
      setConfirm(null);
      onDone?.(msg);
    } catch (e) {
      const other = otherCampaignFrom(e);
      if (other && onConflict) setConfirm(onConflict(other));
      else setError(linkErrorText(e, lang));
    } finally { setBusy(false); }
  };

  const seatNote = (res, dmName) => {
    const seat = sponsoredFrom(res, dmName);
    return seat != null ? ` ${sponsoredText(seat, lang)}` : '';
  };

  // PUT na vaga da pessoa naquela mesa (servidor antigo sem myMembership: procura no detalhe).
  const putSeat = async (table, move) => {
    let mid = table.myMembership?.id;
    if (mid == null) {
      const r = await api.getCampaign(table.id);
      mid = findMyMembership(r.campaign, typeof window !== 'undefined' ? window.__currentUserId__ : null)?.id;
      if (mid == null) throw Object.assign(new Error('not_a_member'), { status: 403, data: { error: 'not_a_member' } });
    }
    return api.updateMembership(table.id, mid, move ? { characterId: char.id, move: true } : { characterId: char.id });
  };

  // Confirmação da troca (de `from`, a atual ou a que o 409 contou, para `to`).
  const switchTo = (to, seat, from, again) => ({
    ...switchConfirm({ charName, from: from ?? current?.name, to, seat, lang }), run: again,
  });

  const pickTable = (table) => {
    const seat = seatState(table, char.id);
    const attach = (move) => run(async () => {
      const res = await putSeat(table, move);
      return linkToast(move ? 'switch' : 'attach', { charName, table: table.name, lang }) + seatNote(res, '');
    }, { onConflict: (other) => switchTo(table.name, seat, other.campaignName, () => attach(true)) });
    if (linked) setConfirm(switchTo(table.name, seat, undefined, () => attach(true)));
    else setConfirm({ ...attachConfirm({ charName, table: table.name, seat, lang }), run: () => attach(false) });
  };

  // Código de convite: sem campanha entra direto (a prévia da mesa já está na tela);
  // com campanha, confirma a troca antes.
  const joinCode = (code, table) => {
    const go = (move) => run(async () => {
      const body = { inviteCode: code, characterId: char.id };
      const res = await api.joinCampaign(move ? { ...body, move: true } : body);
      return linkToast(move ? 'switch' : 'attach', { charName, table: table?.name, lang }) + seatNote(res, table?.dmName);
    }, { onConflict: (other) => switchTo(table?.name, null, other.campaignName, () => go(true)) });
    if (linked) setConfirm(switchTo(table?.name || code, null, undefined, () => go(true)));
    else go(false);
  };

  const detach = (link) => {
    setConfirm({
      ...detachConfirm({ charName, from: link.name, sponsored: !!link.sponsored, lang }),
      danger: true,
      run: () => run(async () => {
        await api.updateMembership(link.id, link.membershipId, { characterId: null });
        return linkToast('detach', { charName, table: link.name, lang });
      }),
    });
  };

  let body;
  if (!data) {
    body = loadErr ? (
      <div className="cl-state">
        <p className="cl-error" role="alert">{loadErr}</p>
        <button type="button" className="btn btn-ghost" onClick={load}>{L(lang, 'Tentar de novo', 'Try again')}</button>
      </div>
    ) : <p className="cl-state muted" role="status">{L(lang, 'Buscando suas campanhas…', 'Loading your campaigns…')}</p>;
  } else if (confirm) {
    body = (
      <div className="cl-confirm" role="alertdialog" aria-labelledby="cl-confirm-title" aria-describedby="cl-confirm-text">
        <h3 id="cl-confirm-title">{confirm.title}</h3>
        <p id="cl-confirm-text">{confirm.text}</p>
        {error && <p className="cl-error" role="alert">{error}</p>}
        <div className="cl-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { setConfirm(null); setError(''); }} disabled={busy}>{L(lang, 'Voltar', 'Back')}</button>
          <button type="button" className={`btn ${confirm.danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm.run} disabled={busy} autoFocus>
            {busy ? '…' : confirm.ok}
          </button>
        </div>
      </div>
    );
  } else if (linked && !switching) {
    const closed = current?.status === 'closed';
    body = (
      <>
        {links.map(link => (
          <div key={link.membershipId} className={`cl-current${link.status === 'closed' ? ' is-closed' : ''}`}>
            <span className="cl-eyebrow">🏰 {L(lang, 'Esta ficha está em', 'This sheet is in')}</span>
            <strong className="cl-current-name">{link.name}</strong>
            {link.status === 'closed' && (
              <p className="cl-note">{closedText(link, lang)} {L(lang,
                'Enquanto isso ela é só para leitura: a ficha não sai nem troca de mesa. Depois, a ficha fica livre.',
                "Meanwhile it is read-only: the sheet can't leave or move. After that, the sheet is free.")}</p>
            )}
            {link.sponsored && link.status !== 'closed' && (
              <p className="cl-note">🪑 {sponsoredText('', lang)}</p>
            )}
            {links.length > 1 && link.status !== 'closed' && (
              <button type="button" className="btn btn-ghost cl-btn" onClick={() => detach(link)}>{L(lang, 'Desatrelar daqui', 'Unlink from here')}</button>
            )}
          </div>
        ))}
        {links.length > 1 && (
          <p className="cl-note">{L(lang,
            'Ficha antiga em mais de uma campanha: hoje cada ficha fica em uma por vez. Desatrele de uma (ou troque) para acertar.',
            'Old sheet in more than one campaign: now each sheet is in one at a time. Unlink from one (or move it) to fix it.')}</p>
        )}
        {error && <p className="cl-error" role="alert">{error}</p>}
        <div className="cl-actions cl-actions-main">
          {links.length === 1 && (
            <button type="button" className="btn btn-ghost cl-btn" onClick={() => detach(current)} disabled={closed}>
              {L(lang, 'Desatrelar', 'Unlink')}
            </button>
          )}
          <button type="button" className="btn btn-primary cl-btn" onClick={() => { setSwitching(true); setError(''); }} disabled={closed}>
            {L(lang, 'Trocar de campanha', 'Move to another campaign')}
          </button>
        </div>
        {!closed && (
          <p className="cl-hint muted">{L(lang,
            'Desatrelar tira só a ficha da mesa: você continua na campanha e pode atrelar outra ficha depois.',
            'Unlinking only takes the sheet off the table: you stay in the campaign and can link another sheet later.')}</p>
        )}
      </>
    );
  } else {
    body = (
      <>
        {switching ? (
          <p className="cl-lead">{L(lang,
            `Para qual mesa ${charName || 'a ficha'} vai? Ela sai de “${current?.name || ''}” (você continua lá, sem personagem).`,
            `Which table should ${charName || 'the sheet'} go to? It leaves “${current?.name || ''}” (you stay there, without a character).`)}</p>
        ) : (
          <p className="cl-lead">{L(lang,
            'Esta ficha não está em nenhuma campanha. Escolha uma mesa em que você joga:',
            'This sheet is not in any campaign. Pick a table you play at:')}</p>
        )}
        {tables.length > 0 ? (
          <ul className="cl-tables">
            {tables.map(c => {
              const seat = seatState(c, char.id);
              return (
                <li key={c.id} className="cl-table">
                  <div className="cl-table-text">
                    <strong>{c.name}</strong>
                    {c.tagline && <span className="cl-tagline">{c.tagline}</span>}
                    {seatLabel(seat, lang) && <span className={`cl-seat is-${seat.kind}`}>{seatLabel(seat, lang)}</span>}
                  </div>
                  <button type="button" className="btn btn-primary cl-btn" onClick={() => pickTable(c)} disabled={busy}>
                    {switching ? L(lang, 'Trocar para cá', 'Move here') : L(lang, 'Atrelar', 'Link')}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="cl-empty">{switching
            ? L(lang, 'Você não joga em outra campanha ativa. Use um código de convite abaixo.', "You don't play in another active campaign. Use an invite code below.")
            : L(lang, 'Você ainda não joga em nenhuma campanha. Peça o código de convite ao mestre e use o campo abaixo.', "You don't play in any campaign yet. Ask your GM for the invite code and use the field below.")}</p>
        )}
        {dmTableCount(data.campaigns) > 0 && (
          <p className="cl-hint muted">{L(lang,
            'As campanhas que você mestra não aparecem aqui: o mestre não joga com ficha na própria mesa.',
            "Campaigns you run as GM don't show here: the GM doesn't play a sheet at their own table.")}</p>
        )}
        <InviteCodeJoin lang={lang} busy={busy} openAtStart={tables.length === 0} switching={switching} onJoin={joinCode} />
        {error && <p className="cl-error" role="alert">{error}</p>}
        {switching && (
          <div className="cl-actions">
            <button type="button" className="btn btn-ghost cl-btn" onClick={() => { setSwitching(false); setError(''); }}>{L(lang, 'Voltar', 'Back')}</button>
          </div>
        )}
      </>
    );
  }

  return (
    <Modal onClose={onClose} title={L(lang, 'Campanha', 'Campaign')}>
      <div className="cl-modal">{body}</div>
    </Modal>
  );
}

/** "Tenho um código de convite": prévia da mesa (GET /campaigns/invite/:code) e entrar com esta ficha. */
function InviteCodeJoin({ lang, busy, openAtStart, switching, onJoin }) {
  const [open, setOpen] = useState(openAtStart);
  const [code, setCode] = useState('');
  const [table, setTable] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    const c = normalizeInviteCode(code);
    setErr('');
    if (c.length < 6) { setTable(null); return undefined; }
    const tm = setTimeout(() => {
      api.campaignInvite(c)
        .then(res => {
          const t = alive && joinFromInvite(c, res);
          if (alive) setTable(t ? { ...t, closed: res.status === 'closed' } : null);
        })
        .catch(e => { if (alive) { setTable(null); setErr(linkErrorText(e, lang)); } });
    }, 400);
    return () => { alive = false; clearTimeout(tm); };
  }, [code, lang]);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost cl-btn cl-code-toggle" onClick={() => setOpen(true)}>
        🔑 {L(lang, 'Tenho um código de convite', 'I have an invite code')}
      </button>
    );
  }
  const c = normalizeInviteCode(code);
  const ready = table && table.code === c;
  const blocked = ready && (table.isDm || table.closed);
  return (
    <div className="cl-code">
      <label className="cl-code-label" htmlFor="cl-code-input">{L(lang, 'Código de convite', 'Invite code')}</label>
      <input id="cl-code-input" className="input cl-code-input" value={code} placeholder="ABCDEF" maxLength={16}
        autoComplete="off" autoCapitalize="characters" spellCheck={false}
        onChange={e => setCode(normalizeInviteCode(e.target.value))} />
      {err && <p className="cl-error" role="alert">{err}</p>}
      {ready && <TableInviteCard table={table} lang={lang} />}
      {ready && table.closed && <p className="cl-note">{L(lang, 'Esta campanha foi encerrada: não recebe fichas novas.', 'This campaign was closed: it takes no new sheets.')}</p>}
      <button type="button" className="btn btn-primary cl-btn cl-code-go" disabled={busy || !ready || blocked}
        onClick={() => onJoin(c, table)}>
        {switching ? L(lang, 'Trocar para esta mesa', 'Move to this table') : L(lang, 'Entrar com esta ficha', 'Join with this sheet')}
      </button>
    </div>
  );
}
