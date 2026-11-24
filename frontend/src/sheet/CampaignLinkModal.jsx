/* Folha "Campanha" da ficha: em quais mesas a ficha joga, atrelar a mais uma (das mesas
   da pessoa ou por código de convite), desatrelar de uma e trocar de campanha.
   Regra do servidor: a ficha senta em N mesas, nunca duas vezes na mesma (409
   character_already_in_campaign). Atrelar a outra mesa NÃO tira a ficha das atuais;
   só "Trocar de campanha" tira, e pergunta antes. A lógica e os textos ficam em
   campaign-link.js; aqui só a apresentação (folha da mesa: src/shell/MesaSheet.jsx). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { TableInviteCard } from '../creator/JoinTable.jsx';
import { normalizeInviteCode, joinFromInvite } from '../creator/creation.js';
import { closedText, sponsoredFrom, sponsoredText } from '../plans/plans-logic.js';
import {
  playerTables, seatState, seatLabel, otherCampaignFrom, linkErrorText,
  attachConfirm, detachConfirm, switchConfirm, linkToast, quoteList,
} from './campaign-link.js';
import './campaign-link.css';
import { npcStatus, upsertNpc, removeNpc } from './npc-link.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * char: ficha da conta (id numérico). onDone(msg): a ação deu certo — a ficha
 * recarrega (char.inCampaign / modo campanha) e o toast mostra `msg`. onCopies(): abre a
 * folha "Mesas e cópias da ficha" (cópia separada por mesa, one-shot, cópias guardadas).
 */
export default function CampaignLinkModal({ char, lang = 'pt', onClose, onDone, familyIds = [], onCopies = null }) {
  const [data, setData] = useState(null);   // { links, campaigns }
  const [loadErr, setLoadErr] = useState('');
  const [switching, setSwitching] = useState(false); // "Trocar de campanha": escolhendo a nova mesa
  const [confirm, setConfirm] = useState(null);      // { title, text, ok, danger, run }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);
  // Esc, ✕ ou toque fora com uma confirmação aberta: volta um passo (para a lista), em vez de
  // fechar a folha inteira; o foco fica na folha.
  const closeOrBack = () => {
    if (!confirm) { onClose?.(); return; }
    if (busy) return;
    setConfirm(null); setError('');
    try { bodyRef.current?.closest('.mesa-sheet')?.focus({ preventScroll: true }); } catch { /* ok */ }
  };

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
  const tables = playerTables(data?.campaigns, links.map(l => l.id));
  const fromNames = links.map(l => l.name); // a troca tira a ficha de TODAS as mesas atuais
  const charName = char.name;
  const who = charName || L(lang, 'a ficha', 'the sheet');
  const tableOf = (id) => (data?.campaigns || []).find(c => String(c.id) === String(id));
  const seatsOf = (c) => c?.myMemberships || (c?.myMembership ? [c.myMembership] : []);

  // Roda uma ação; 409 "já está nesta campanha" e outros erros ficam na tela em que a
  // pessoa está (a confirmação ou a lista).
  const run = async (fn) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const msg = await fn();
      setConfirm(null);
      onDone?.(msg);
    } catch (e) {
      const other = otherCampaignFrom(e);
      setError(other
        ? L(lang, `${who} já está em ${other.campaignName ? `“${other.campaignName}”` : 'esta campanha'}.`, `${who} is already in ${other.campaignName ? `“${other.campaignName}”` : 'this campaign'}.`)
        : linkErrorText(e, lang));
    } finally { setBusy(false); }
  };

  const seatNote = (res, dmName) => {
    const seat = sponsoredFrom(res, dmName);
    return seat != null ? ` ${sponsoredText(seat, lang)}` : '';
  };

  // Troca de campanha: depois de sentar na mesa nova, solta a ficha das outras (a
  // pessoa continua nelas, sem personagem).
  const keepOnly = async (campaignId) => {
    const l = await api.characterCampaigns(char.id);
    for (const o of (l.campaigns || []).filter(x => String(x.id) !== String(campaignId) && x.membershipId != null)) {
      await api.updateMembership(o.id, o.membershipId, { characterId: null });
    }
  };

  // Senta a ficha na mesa: usa a vaga vazia da pessoa, se houver; senão entra com mais uma.
  const seatAt = async (table) => {
    const memberships = seatsOf(table);
    const emptySeat = memberships.find(m => m.characterId == null && m.role !== 'dm');
    if (emptySeat) return api.updateMembership(table.id, emptySeat.id, { characterId: char.id });
    // só o mestre recebe o código (backend v1.0.136); membro entra pelo id da campanha
    const inviteCode = table.inviteCode || table.invite_code || '';
    // a pessoa já tem outra ficha nesta mesa (ou é o mestre): entra com mais uma vaga
    const res = await api.joinCampaign({ inviteCode, campaignId: table.id, characterId: char.id });
    return res;
  };

  const pickTable = (table) => {
    const seat = seatState(table, char.id, familyIds);
    if (seat.kind === 'family') return;
    if (switching) {
      setConfirm({
        ...switchConfirm({ charName, from: fromNames, to: table.name, seat, lang }),
        run: () => run(async () => {
          const res = await seatAt(table);
          await keepOnly(table.id);
          return linkToast('switch', { charName, table: table.name, lang }) + seatNote(res, '');
        }),
      });
      return;
    }
    setConfirm({
      ...attachConfirm({ charName, table: table.name, seat, lang }),
      run: () => run(async () => {
        const res = await seatAt(table);
        return linkToast('attach', { charName, table: table.name, lang }) + seatNote(res, '');
      }),
    });
  };

  // Código de convite: entra na mesa com este personagem. Na troca, pergunta antes
  // (a ficha sai das mesas atuais).
  const joinCode = (code, table) => {
    const join = () => api.joinCampaign({ inviteCode: code, campaignId: table?.id, characterId: char.id });
    if (switching) {
      setConfirm({
        ...switchConfirm({ charName, from: fromNames, to: table?.name, seat: null, lang }),
        run: () => run(async () => {
          const res = await join();
          await keepOnly(table?.id ?? res?.campaign?.id);
          return linkToast('switch', { charName, table: table?.name, lang }) + seatNote(res, table?.dmName);
        }),
      });
      return;
    }
    run(async () => {
      const res = await join();
      return linkToast('attach', { charName, table: table?.name, lang }) + seatNote(res, table?.dmName);
    });
  };

  // Desatrelar de UMA mesa. A vaga da pessoa fica (ela continua na campanha, sem
  // personagem) — é o que a confirmação promete. Só quando ela tem outra vaga na mesma
  // mesa (outro personagem dela joga lá) a vaga extra some junto.
  const detach = (link) => {
    const others = links.filter(l => l.membershipId !== link.membershipId).map(l => l.name);
    const table = tableOf(link.id);
    const keepSeat = seatsOf(table).length <= 1 || table?.role === 'dm' || link.status === 'closed';
    setConfirm({
      ...detachConfirm({ charName, from: link.name, sponsored: !!link.sponsored, others, lang }),
      danger: true,
      run: () => run(async () => {
        if (keepSeat) await api.updateMembership(link.id, link.membershipId, { characterId: null });
        else await api.removeMember(link.id, link.membershipId);
        return linkToast('detach', { charName, table: link.name, stillIn: others.length, lang });
      }),
    });
  };

  let body;
  if (!data) {
    body = loadErr ? (
      <div className="cl-state">
        <p className="cl-error" role="alert">{loadErr}</p>
        <button type="button" className="mesa-btn" onClick={load}>{L(lang, 'Tentar de novo', 'Try again')}</button>
      </div>
    ) : <p className="cl-state cl-empty" role="status">{L(lang, 'Buscando suas campanhas…', 'Loading your campaigns…')}</p>;
  } else if (confirm) {
    body = (
      <div className="cl-confirm" role="alertdialog" aria-labelledby="cl-confirm-title" aria-describedby="cl-confirm-text">
        <h3 id="cl-confirm-title">{confirm.title}</h3>
        <p id="cl-confirm-text">{confirm.text}</p>
        {error && <p className="cl-error" role="alert">{error}</p>}
        {/* ação perigosa (desatrelar): o foco entra no "Voltar" — Enter não confirma sem querer */}
        <div className="cl-actions">
          <button type="button" className="mesa-btn" onClick={() => { setConfirm(null); setError(''); }} disabled={busy} autoFocus={!!confirm.danger}>{L(lang, 'Voltar', 'Back')}</button>
          <button type="button" className={`mesa-btn ${confirm.danger ? 'is-danger' : 'is-primary'}`} onClick={confirm.run} disabled={busy} autoFocus={!confirm.danger}>
            {busy ? '…' : confirm.ok}
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        {linked && !switching && (
          <section className="cl-sec" aria-label={L(lang, 'Onde esta ficha joga', 'Where this sheet plays')}>
            <MesaTitle as="h3">{L(lang, 'Onde esta ficha joga', 'Where this sheet plays')}</MesaTitle>
            <ul className="cl-links">
              {links.map(link => {
                const closed = link.status === 'closed';
                return (
                  <li key={link.membershipId ?? link.id} className={`cl-current${closed ? ' is-closed' : ''}`}>
                    <div className="cl-current-text">
                      <strong className="cl-current-name">{link.name}</strong>
                      <span className="cl-current-tags">
                        <span className={`cl-status is-${link.isNpc ? 'npc' : 'player'}`}>{link.isNpc ? L(lang, 'Como NPC', 'As an NPC') : L(lang, 'Como jogador', 'As a player')}</span>
                        {closed && <span className="cl-status">{L(lang, 'Encerrada', 'Closed')}</span>}
                      </span>
                    </div>
                    <button type="button" className="mesa-btn cl-btn" onClick={() => detach(link)}>{L(lang, 'Desatrelar daqui', 'Unlink from here')}</button>
                    {closed && (
                      <p className="cl-note">{closedText(link, lang)} {L(lang,
                        'Ela fica só para leitura, mas a ficha é sua: dá para desatrelar ou levar para outra mesa.',
                        'It is read-only, but the sheet is yours: you can unlink it or take it to another table.')}</p>
                    )}
                    {link.sponsored && !closed && <p className="cl-note">{sponsoredText('', lang)}</p>}
                  </li>
                );
              })}
            </ul>
            <p className="cl-hint">{L(lang,
              'Desatrelar tira só a ficha da mesa: você continua na campanha e pode atrelar outra ficha depois.',
              'Unlinking only takes the sheet off the table: you stay in the campaign and can link another sheet later.')}</p>
          </section>
        )}

        <section className="cl-sec" aria-label={switching ? L(lang, 'Trocar de campanha', 'Move to another campaign') : L(lang, 'Atrelar a uma mesa', 'Link to a table')}>
          <MesaTitle as="h3">{switching
            ? L(lang, 'Trocar para qual mesa?', 'Move to which table?')
            : linked ? L(lang, 'Atrelar a outra mesa', 'Link to another table') : L(lang, 'Atrelar a uma mesa', 'Link to a table')}</MesaTitle>
          {switching ? (
            <p className="cl-lead">{L(lang,
              `${who} sai de ${quoteList(fromNames, 'pt')} (você continua lá, sem personagem) e passa a jogar só na mesa que você escolher.`,
              `${who} leaves ${quoteList(fromNames, 'en')} (you stay there, without a character) and plays only at the table you pick.`)}</p>
          ) : linked ? (
            <p className="cl-lead">{L(lang,
              `${who} continua nas mesas de cima e passa a jogar nesta também.`,
              `${who} stays at the tables above and plays at this one too.`)}</p>
          ) : (
            <p className="cl-lead">{L(lang,
              'Esta ficha não está em nenhuma campanha. Escolha uma das suas mesas ou use um código de convite.',
              'This sheet is not in any campaign. Pick one of your tables or use an invite code.')}</p>
          )}
          {tables.length > 0 ? (
            <ul className="cl-tables">
              {tables.map(c => {
                const seat = seatState(c, char.id, familyIds);
                return (
                  <li key={c.id} className="cl-table">
                    <div className="cl-table-text">
                      <strong>{c.name}</strong>
                      {c.tagline && <span className="cl-tagline">{c.tagline}</span>}
                      {c.role === 'dm'
                        ? <span className="cl-seat">{L(lang, 'Você é o mestre desta mesa', 'You run this table')}</span>
                        : seatLabel(seat, lang) && <span className={`cl-seat is-${seat.kind}`}>{seatLabel(seat, lang)}</span>}
                    </div>
                    <button type="button" className="mesa-btn is-primary cl-btn" onClick={() => pickTable(c)} disabled={busy || seat.kind === 'family'}>
                      {switching ? L(lang, 'Trocar para cá', 'Move here') : L(lang, 'Atrelar', 'Link')}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="cl-empty">{linked
              ? L(lang, 'Você não tem outra campanha ativa. Para entrar em mais uma, use o código de convite do mestre.', 'You have no other active campaign. To join one more, use the invite code from its GM.')
              : L(lang, 'Você ainda não está em nenhuma campanha. Peça o código de convite ao mestre e use o campo abaixo.', "You are not in any campaign yet. Ask your GM for the invite code and use the field below.")}</p>
          )}
          <InviteCodeJoin lang={lang} busy={busy} openAtStart={tables.length === 0} switching={switching} onJoin={joinCode} />
          {error && <p className="cl-error" role="alert">{error}</p>}
          {linked && !switching && (
            <button type="button" className="mesa-btn is-quiet cl-btn cl-move" onClick={() => { setSwitching(true); setError(''); }}>
              {L(lang, 'Trocar de campanha (sai das atuais)', 'Move to another campaign (leaves the current ones)')}
            </button>
          )}
          {switching && (
            <button type="button" className="mesa-btn cl-btn cl-back" onClick={() => { setSwitching(false); setError(''); }}>← {L(lang, 'Voltar', 'Back')}</button>
          )}
        </section>
      </>
    );
  }

  return (
    <MesaSheet title={L(lang, 'Campanha', 'Campaign')} eyebrow={charName || undefined} onClose={closeOrBack} lang={lang} width="md" className="cl-sheet">
      <div className="cl-modal" ref={bodyRef}>
        {body}
        {data && !confirm && !switching && <DmNpcTables char={char} lang={lang} campaigns={(data.campaigns || []).filter(c => c.role === 'dm' && c.status !== 'closed')} />}
        {data && !confirm && !switching && onCopies && (
          <div className="cl-more">
            <p className="cl-hint">{L(lang,
              'Quer que esta mesa tenha a própria ficha (nível e itens separados), jogar um one-shot ou rever uma cópia guardada?',
              'Want this table to have its own sheet (separate level and items), play a one-shot or review a stored copy?')}</p>
            <button type="button" className="mesa-btn cl-btn" onClick={onCopies}>{L(lang, 'Mesas e cópias da ficha', 'Tables and copies of the sheet')}</button>
          </div>
        )}
      </div>
    </MesaSheet>
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
      <button type="button" className="mesa-btn cl-btn cl-code-toggle" onClick={() => setOpen(true)}>
        {L(lang, 'Tenho um código de convite', 'I have an invite code')}
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
      <button type="button" className="mesa-btn is-primary cl-btn cl-code-go" disabled={busy || !ready || blocked}
        onClick={() => onJoin(c, table)}>
        {switching ? L(lang, 'Trocar para esta mesa', 'Move to this table') : L(lang, 'Entrar com esta ficha', 'Join with this sheet')}
      </button>
    </div>
  );
}

/**
 * Mesas que a pessoa mestra: a ficha entra como NPC no Mundo da campanha (cartão com os
 * dados da ficha e a referência a ela). Usa só a API do Mundo — funciona em qualquer
 * versão do servidor.
 */
function DmNpcTables({ char, lang, campaigns }) {
  const [state, setState] = useState({});   // { [campaignId]: entry | null | 'loading' | 'busy' }
  const [err, setErr] = useState('');
  const ids = campaigns.map(c => c.id).join(',');
  useEffect(() => {
    let alive = true;
    campaigns.forEach(c => {
      setState(s => ({ ...s, [c.id]: 'loading' }));
      npcStatus(c.id, char.id).then(e => alive && setState(s => ({ ...s, [c.id]: e })))
        .catch(() => alive && setState(s => ({ ...s, [c.id]: null })));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, char.id]);
  if (!campaigns.length) return null;
  const act = async (c, fn) => {
    setErr('');
    const prev = state[c.id];
    setState(s => ({ ...s, [c.id]: 'busy' }));
    try { const out = await fn(prev); setState(s => ({ ...s, [c.id]: out })); }
    catch (e) { setErr(linkErrorText(e, lang)); setState(s => ({ ...s, [c.id]: prev })); }
  };
  return (
    <div className="cl-npc-tables">
      <MesaTitle as="h3">{L(lang, 'Como NPC nas mesas que você mestra', 'As an NPC at tables you run')}</MesaTitle>
      <p className="cl-hint">{L(lang,
        'Como NPC, a ficha vira um cartão no Mundo da campanha, preenchido com os dados dela e com a referência à ficha. Atualize quando a ficha mudar.',
        "As an NPC, the sheet becomes a card in the campaign's World, filled from its data and referencing the sheet. Re-sync when the sheet changes.")}</p>
      <ul className="cl-tables">
        {campaigns.map(c => {
          const st = state[c.id];
          const busy = st === 'loading' || st === 'busy';
          const entry = st && typeof st === 'object' ? st : null;
          return (
            <li key={c.id} className="cl-table">
              <div className="cl-table-text">
                <strong>{c.name}</strong>
                {entry
                  ? <span className="cl-status is-npc">🎭 {L(lang, 'Como NPC', 'As an NPC')}</span>
                  : !busy && <span className="cl-status">{L(lang, 'Fora da mesa', 'Not at this table')}</span>}
              </div>
              <div className="cl-npc-acts">
                {entry ? (
                  <>
                    <button type="button" className="mesa-btn cl-btn" disabled={busy}
                      onClick={() => act(c, (prev) => upsertNpc(c.id, char, lang, prev))}>
                      ↻ {L(lang, 'Atualizar', 'Re-sync')}
                    </button>
                    <button type="button" className="mesa-btn cl-btn" disabled={busy}
                      onClick={() => act(c, async (prev) => { await removeNpc(prev.id); return null; })}>
                      {L(lang, 'Tirar do Mundo', 'Remove')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="mesa-btn is-primary cl-btn" disabled={busy}
                    onClick={() => act(c, () => upsertNpc(c.id, char, lang, null))}>
                    {busy ? '…' : `🎭 ${L(lang, 'Adicionar como NPC', 'Add as NPC')}`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {err && <p className="cl-error" role="alert">{err}</p>}
    </div>
  );
}
