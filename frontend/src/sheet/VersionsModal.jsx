// Versões da ficha: o MODELO e uma cópia por campanha. Lista, troca, sair, voltar,
// excluir, promover a modelo e abrir uma versão guardada só para leitura.
// Regras e armazenamento em versions.js; o que o servidor deve passar a fazer está em
// docs/character-versions.md.
//
// Hoje o servidor só conhece UMA ficha por personagem e tranca campos de quem está em
// campanha. Por isso a troca é sempre nesta ordem: soltar a ficha da mesa atual →
// gravar a outra versão → atrelar à mesa nova.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Modal } from '../../components/Shared.jsx';
import { linkErrorText } from './campaign-link.js';
import * as V from './versions.js';
import * as F from './forks.js';
import { loadMyPlan } from '../plans/plans-api.js';
import './campaign-link.css';
import './versions.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

const fromServer = (res) => {
  const c = res.character;
  return { ...c.data, id: c.id, name: c.name, inCampaign: c.inCampaign, campaignLeveling: c.campaignLeveling ?? null, updatedAt: c.updated_at, createdAt: c.created_at };
};

/**
 * char: ficha da conta. onSave(char) grava (app → storage.save); onDone(msg) recarrega
 * e avisa; onPreview(key) abre uma versão guardada só para leitura; onAddCampaign()
 * abre o seletor de mesas (a ficha já está no modelo quando ele abre).
 */
export default function VersionsModal({ char, lang = 'pt', onClose, onSave, onDone, onPreview, onAddCampaign, family = [], onFork = null, onOpenSheet = null }) {
  const forkSheet = F.isFork(char);   // esta ficha já é uma versão própria (forks.js)
  const [live, setLive] = useState(char);          // ficha fresca do servidor, já reconciliada
  const [ctx, setCtx] = useState(null);            // { links, campaigns }
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);    // { title, text, ok, danger, typed?, run }
  const [typed, setTyped] = useState('');
  const [plan, setPlan] = useState(null);          // loadMyPlan() p/ o aviso de cota (F10/F16)
  useEffect(() => {
    if (!onFork && !F.splittable(char).length) return undefined;
    let on = true;
    loadMyPlan().then(m => { if (on) setPlan(m); }).catch(() => {});
    return () => { on = false; };
  }, [char.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const alive = useRef(true);
  const saveRef = useRef(onSave);   // o app recria onSave a cada render: a carga não pode depender dele
  saveRef.current = onSave;
  const save = useCallback((c) => saveRef.current(c), []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    setLoadErr('');
    try {
      const [fresh, l, c] = await Promise.all([
        api.getCharacter(char.id).then(fromServer),
        api.characterCampaigns(char.id),
        api.listCampaigns().catch(() => null),
      ]);
      const links = l.campaigns || [];
      const campaigns = c ? (c.campaigns || []) : null;
      // versão própria não usa o armazém antigo: nada a acertar
      const r = forkSheet ? { char: fresh, changed: false } : V.reconcile(fresh, links, campaigns);
      let next = r.char;
      if (r.changed) next = (await save(next)) || next;
      if (!alive.current) return;
      setLive(next); setCtx({ links, campaigns: campaigns || [] });
    } catch (e) {
      if (alive.current) setLoadErr(linkErrorText(e, lang));
    }
  }, [char.id, lang, save, forkSheet]);
  useEffect(() => { load(); }, [load]);

  const store = V.storeOf(live);
  const list = V.rows(live);
  const campOf = (key) => (ctx?.campaigns || []).find(c => String(c.id) === String(key));
  const linkOf = (key) => (ctx?.links || []).find(l => String(l.id) === String(key));

  // ── servidor: soltar / atrelar ──
  const detach = async (key) => {
    const link = linkOf(key) || ((await api.characterCampaigns(live.id)).campaigns || []).find(l => String(l.id) === String(key));
    if (link?.membershipId != null) await api.updateMembership(link.id, link.membershipId, { characterId: null });
  };
  const attach = async (key) => {
    const camp = campOf(key) || { id: key };
    const seats = camp.myMemberships || (camp.myMembership ? [camp.myMembership] : []);
    const free = seats.find(m => m.characterId == null && m.role !== 'dm');
    if (free) return api.updateMembership(camp.id, free.id, { characterId: live.id });
    let inviteCode = camp.inviteCode || camp.invite_code || '';
    if (!inviteCode) {
      try { const d = await api.getCampaign(camp.id); inviteCode = d?.campaign?.inviteCode || d?.campaign?.invite_code || ''; } catch { /* sem convite: tenta só pelo id */ }
    }
    return api.joinCampaign({ inviteCode, campaignId: camp.id, characterId: live.id });
  };

  // ── ações ──
  const act = async (tag, fn) => {
    if (busy) return;
    setBusy(tag); setError('');
    try {
      const msg = await fn();
      if (!alive.current) return;
      setConfirm(null); setTyped('');
      await onDone?.(msg);
      if (alive.current) await load();
    } catch (e) {
      if (alive.current) { setError(e?.message === 'version_active' ? L(lang, 'Saia da campanha antes de excluir.', 'Leave the campaign before excluding.') : linkErrorText(e, lang)); await load().catch(() => {}); }
    } finally { if (alive.current) setBusy(''); }
  };

  // Troca para `key` (modelo ou campanha ativa): soltar → gravar → atrelar.
  const switchTo = async (key, base = live) => {
    const cur = V.storeOf(base).current;
    if (cur !== V.TEMPLATE) await detach(cur);
    let next = await save(V.checkout(base, key)) || V.checkout(base, key);
    if (key !== V.TEMPLATE) {
      try { await attach(key); } catch (e) {
        // não deu para sentar na mesa: volta ao modelo (a versão fica guardada)
        const closed = e?.status === 423 || e?.data?.error === 'campaign_closed';
        let back = V.checkout({ ...next }, V.TEMPLATE);
        if (closed) back = V.archive(back, key);
        await save(back);
        throw e;
      }
    }
    return next;
  };

  const nameOfRow = (r) => (r.kind === 'template' ? L(lang, 'Modelo', 'Template') : (r.name || L(lang, 'Campanha', 'Campaign')));

  const doSwitch = (r) => act(`open:${r.key}`, async () => {
    await switchTo(r.key);
    return r.kind === 'template'
      ? L(lang, 'Ficha no modelo (fora de campanha).', 'Sheet on the template (outside campaigns).')
      : L(lang, `Ficha na versão de “${r.name}”.`, `Sheet on the “${r.name}” version.`);
  });

  const doLeave = (r) => setConfirm({
    title: L(lang, `Sair de “${r.name}”?`, `Leave “${r.name}”?`),
    text: L(lang,
      'A versão desta campanha fica guardada como está. Você pode voltar depois e continuar de onde parou, ou excluí-la de vez.',
      'This campaign’s version is kept as it is. You can join again later and pick up where you left off, or exclude it for good.'),
    ok: L(lang, 'Sair', 'Leave'),
    run: () => act(`leave:${r.key}`, async () => {
      if (V.storeOf(live).current === r.key) await detach(r.key);
      await save(V.leave(live, r.key));
      return L(lang, `Você saiu de “${r.name}”. A versão ficou guardada.`, `You left “${r.name}”. The version was kept.`);
    }),
  });

  const doJoin = (r) => act(`join:${r.key}`, async () => {
    await switchTo(r.key, V.rejoin(live, r.key));
    return L(lang, `De volta a “${r.name}”, com a ficha como você deixou.`, `Back in “${r.name}”, with the sheet as you left it.`);
  });

  // F5: versão do armazém antigo vira ficha própria (o modelo para de guardá-la)
  const canSplit = new Set(F.splittable(live).map(x => x.key));
  const doSplit = (r) => setConfirm({
    title: L(lang, `Separar “${r.name}” em ficha própria?`, `Split “${r.name}” into its own sheet?`),
    text: L(lang,
      'A versão vira uma ficha à parte, com tudo o que tem hoje, e sai desta lista. Ela conta como uma ficha do plano. Depois, use “Campanha” nela para sentar na mesa — sem tirar o personagem das outras.',
      'The version becomes a separate sheet with everything it has today and leaves this list. It counts as one character on your plan. Then use “Campaign” on it to sit at the table — without taking the character off the others.'),
    ok: L(lang, 'Separar', 'Split'),
    run: () => act(`split:${r.key}`, async () => {
      const created = await save(F.splitFromStore(live, r.key));
      if (created?.id != null) F.copyDevicePrefs(live.id, created.id);
      await save(V.release(live, r.key));
      return L(lang, `“${r.name}” agora é uma ficha própria.`, `“${r.name}” is now a sheet of its own.`);
    }),
  });

  // F14 / F6: ações da própria versão
  const template = (family || []).find(c => !F.isFork(c));
  const doRestart = () => setConfirm({
    title: L(lang, 'Recomeçar a partir do modelo?', 'Restart from the template?'),
    text: L(lang,
      'Esta versão volta a ser uma cópia do modelo como ele está agora: nível, itens e anotações desta mesa se perdem. Ela continua na mesma mesa. Não dá para desfazer.',
      'This version becomes a copy of the template as it is now: this table’s level, items and notes are lost. It stays at the same table. It cannot be undone.'),
    ok: L(lang, 'Recomeçar', 'Restart'),
    danger: true,
    typed: L(lang, 'recomeçar', 'restart'),
    run: () => act('restart', async () => {
      await save(F.restartFromTemplate(live, template));
      return L(lang, 'Versão recomeçada a partir do modelo.', 'Version restarted from the template.');
    }),
  });
  const doArchive = () => act('archive', async () => {
    await save(F.archiveFork(live));
    return L(lang, 'Versão arquivada: fica só para leitura.', 'Version archived: it is now read-only.');
  });

  const doExclude = (r) => setConfirm({
    title: L(lang, `Excluir a versão de “${r.name}”?`, `Exclude the “${r.name}” version?`),
    text: L(lang,
      'Isto apaga para sempre a ficha desta campanha (nível, itens, anotações…). O modelo e as outras versões não mudam. Não dá para desfazer.',
      'This permanently deletes this campaign’s sheet (level, items, notes…). The template and other versions are untouched. It cannot be undone.'),
    ok: L(lang, 'Excluir para sempre', 'Exclude forever'),
    danger: true,
    typed: r.name || L(lang, 'excluir', 'exclude'),
    run: () => act(`exclude:${r.key}`, async () => {
      await save(V.exclude(live, r.key));
      // devolve a vaga vazia da pessoa naquela mesa, se houver (sem erro se não der)
      const camp = campOf(r.key);
      const seats = camp ? (camp.myMemberships || (camp.myMembership ? [camp.myMembership] : [])) : [];
      if (camp && camp.role !== 'dm' && seats.length === 1 && seats[0].characterId == null) {
        await api.removeMember(camp.id, seats[0].id).catch(() => {});
      }
      return L(lang, `Versão de “${r.name}” excluída.`, `“${r.name}” version excluded.`);
    }),
  });

  const doPromote = (r) => setConfirm({
    title: L(lang, `Promover “${r.name}” a modelo?`, `Promote “${r.name}” to template?`),
    text: L(lang,
      'O modelo passa a ser uma cópia desta versão. As versões das campanhas não mudam. Dá para desfazer uma vez.',
      'The template becomes a copy of this version. Campaign versions are untouched. You can undo it once.'),
    ok: L(lang, 'Promover', 'Promote'),
    run: () => act(`promote:${r.key}`, async () => {
      await save(V.promote(live, r.key));
      return L(lang, `O modelo agora é igual à versão de “${r.name}”.`, `The template now matches the “${r.name}” version.`);
    }),
  });

  const doUndoPromote = () => act('undo', async () => {
    await save(V.undoPromote(live));
    return L(lang, 'Modelo anterior restaurado.', 'Previous template restored.');
  });

  const doAdd = () => act('add', async () => {
    if (V.storeOf(live).current !== V.TEMPLATE) await switchTo(V.TEMPLATE);
    onAddCampaign?.();
    return '';
  });

  const stateTag = (r) => {
    if (r.kind === 'template') return null;
    if (r.state === 'left') return <span className="vr-tag is-left">{L(lang, 'Você saiu', 'You left')}</span>;
    if (r.state === 'archived') return <span className="vr-tag is-archived">{L(lang, 'Campanha encerrada', 'Campaign closed')}</span>;
    return null;
  };

  // ── Mesas em paralelo: cada versão é uma ficha própria (forks.js) ──
  const others = (family || []).filter(c => c && c.id !== live.id);
  const familyRow = (c) => {
    const tpl = !F.isFork(c);
    return (
      <li key={c.id} className="vr-row">
        <div className="vr-main">
          <span className="vr-eyebrow">
            {tpl ? `📜 ${L(lang, 'Modelo', 'Template')}` : c.versionKind === 'oneshot' ? '🎲 One-shot' : `🏰 ${L(lang, 'Mesa', 'Table')}`}
            {c.inCampaign && <span className="vr-tag is-current">{L(lang, 'Na mesa', 'Seated')}</span>}
          </span>
          <strong className="vr-name">{tpl ? (c.name || L(lang, 'Sem nome', 'Unnamed')) : F.forkLabel(c, lang)}</strong>
          <span className="vr-preview">{L(lang, 'Nível', 'Level')} {c.level || 1}{c.maxHp != null && <> · {L(lang, 'PV', 'HP')} {c.currentHp ?? c.maxHp}/{c.maxHp}</>}</span>
        </div>
        {onOpenSheet && (
          <div className="vr-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => onOpenSheet(c.id)}>{L(lang, 'Abrir', 'Open')}</button>
          </div>
        )}
      </li>
    );
  };
  const doFork = (kind) => act(`fork:${kind}`, async () => { await onFork(kind); return ''; });
  const parallel = (
    <section className="vr-parallel" aria-label={L(lang, 'Versões em mesas ao mesmo tempo', 'Versions at tables at the same time')}>
      <h3 className="vr-section-title">{L(lang, 'Mesas ao mesmo tempo', 'Tables at the same time')}</h3>
      <p className="cl-hint muted">{L(lang,
        'Cada versão é uma ficha à parte, sentada na sua mesa: jogar numa não tira o personagem das outras. Ela nasce como cópia completa do modelo e segue sozinha.',
        'Each version is a separate sheet seated at its own table: playing in one does not take the character off the others. It starts as a full copy of the template and goes its own way.')}</p>
      {onFork && (() => { const n = F.forkPlanNote(plan, family, live, lang); return <p className={`cl-hint${n.atLimit ? ' vr-plan-full' : ' muted'}`}>{n.text}</p>; })()}
      {others.length > 0 && <ul className="vr-list">{others.map(familyRow)}</ul>}
      {onFork && (
        <div className="cl-actions">
          <button type="button" className="btn btn-primary cl-btn" disabled={!!busy} onClick={() => doFork('campaign')}>
            {busy === 'fork:campaign' ? '…' : L(lang, 'Nova versão para outra mesa', 'New version for another table')}
          </button>
          <button type="button" className="btn btn-ghost cl-btn" disabled={!!busy} onClick={() => doFork('oneshot')}>
            {busy === 'fork:oneshot' ? '…' : L(lang, '🎲 Jogar um one-shot', '🎲 Play a one-shot')}
          </button>
        </div>
      )}
    </section>
  );

  let body;
  if (loadErr) {
    body = (
      <div className="cl-state">
        <p className="cl-error" role="alert">{loadErr}</p>
        <button type="button" className="btn btn-ghost cl-btn" onClick={load}>{L(lang, 'Tentar de novo', 'Try again')}</button>
      </div>
    );
  } else if (!ctx) {
    body = <p className="cl-empty" role="status">{L(lang, 'Carregando versões…', 'Loading versions…')}</p>;
  } else if (confirm) {
    const locked = confirm.typed && typed.trim().toLowerCase() !== confirm.typed.trim().toLowerCase();
    body = (
      <div className="cl-confirm" role="alertdialog" aria-labelledby="vr-confirm-title" aria-describedby="vr-confirm-text">
        <h3 id="vr-confirm-title">{confirm.title}</h3>
        <p id="vr-confirm-text">{confirm.text}</p>
        {confirm.typed && (
          <label className="vr-typed">
            <span>{L(lang, `Digite “${confirm.typed}” para confirmar`, `Type “${confirm.typed}” to confirm`)}</span>
            <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus autoComplete="off" />
          </label>
        )}
        {error && <p className="cl-error" role="alert">{error}</p>}
        <div className="cl-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { setConfirm(null); setTyped(''); setError(''); }} disabled={!!busy}>{L(lang, 'Voltar', 'Back')}</button>
          <button type="button" className={`btn ${confirm.danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm.run} disabled={!!busy || locked}>
            {busy ? '…' : confirm.ok}
          </button>
        </div>
      </div>
    );
  } else if (forkSheet) {
    body = (
      <>
        <p className="cl-lead">{live.versionCampaign?.name
          ? L(lang,
            `Esta é a versão de “${live.versionCampaign.name}”: uma ficha própria, só desta mesa. O modelo e as outras versões não mudam com ela.`,
            `This is the “${live.versionCampaign.name}” version: a sheet of its own, for this table only. The template and other versions do not change with it.`)
          : L(lang,
            'Esta versão ainda não tem mesa. Use “Campanha” na ficha para sentá-la numa mesa; o modelo e as outras versões não mudam com ela.',
            'This version has no table yet. Use “Campaign” on the sheet to seat it at a table; the template and other versions do not change with it.')}</p>
        {parallel}
        <div className="cl-actions vr-own">
          {template && (
            <button type="button" className="btn btn-ghost cl-btn" disabled={!!busy} onClick={doRestart}>
              {busy === 'restart' ? '…' : L(lang, 'Recomeçar a partir do modelo', 'Restart from the template')}
            </button>
          )}
          <button type="button" className="btn btn-ghost cl-btn" disabled={!!busy} onClick={doArchive}>
            {busy === 'archive' ? '…' : L(lang, 'Arquivar (só leitura)', 'Archive (read-only)')}
          </button>
        </div>
        {error && <p className="cl-error" role="alert">{error}</p>}
      </>
    );
  } else {
    body = (
      <>
        {parallel}
        <h3 className="vr-section-title">{L(lang, 'Uma mesa por vez (troca)', 'One table at a time (swap)')}</h3>
        <p className="cl-lead">{L(lang,
          'Cada campanha tem a sua própria cópia desta ficha. O modelo é a ficha fora de campanha: é dele que nasce a cópia de cada mesa nova.',
          'Each campaign has its own copy of this sheet. The template is the sheet outside campaigns: every new table starts from a copy of it.')}</p>
        <ul className="vr-list">
          {list.map(r => {
            const ro = r.kind !== 'template' && r.state !== 'active';
            return (
              <li key={r.key} className={`vr-row is-${r.state}${r.current ? ' is-current' : ''}`}>
                <div className="vr-main">
                  <span className="vr-eyebrow">
                    {r.kind === 'template' ? `📜 ${L(lang, 'Modelo', 'Template')}` : `🏰 ${L(lang, 'Campanha', 'Campaign')}`}
                    {r.current && <span className="vr-tag is-current">{L(lang, 'Em uso', 'In use')}</span>}
                    {stateTag(r)}
                  </span>
                  <strong className="vr-name">{r.kind === 'template' ? (live.name || L(lang, 'Sem nome', 'Unnamed')) : r.name}</strong>
                  <span className="vr-preview">
                    {L(lang, 'Nível', 'Level')} {r.level}
                    {r.maxHp != null && <> · {L(lang, 'PV', 'HP')} {r.hp ?? r.maxHp}/{r.maxHp}</>}
                  </span>
                </div>
                <div className="vr-actions">
                  {!r.current && !ro && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => doSwitch(r)}>
                      {busy === `open:${r.key}` ? '…' : L(lang, 'Abrir', 'Open')}
                    </button>
                  )}
                  {ro && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => { onPreview?.(r.key); onClose?.(); }}>
                      {L(lang, 'Ver', 'View')}
                    </button>
                  )}
                  {r.state === 'left' && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => doJoin(r)}>
                      {busy === `join:${r.key}` ? '…' : L(lang, 'Voltar', 'Join')}
                    </button>
                  )}
                  {r.state === 'active' && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => doLeave(r)}>{L(lang, 'Sair', 'Leave')}</button>
                  )}
                  {r.kind === 'campaign' && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => doPromote(r)}>{L(lang, 'Promover a modelo', 'Promote to template')}</button>
                  )}
                  {canSplit.has(r.key) && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => doSplit(r)}>
                      {busy === `split:${r.key}` ? '…' : L(lang, 'Separar em ficha própria', 'Split into its own sheet')}
                    </button>
                  )}
                  {ro && (
                    <button type="button" className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => doExclude(r)}>{L(lang, 'Excluir', 'Exclude')}</button>
                  )}
                  {r.kind === 'template' && V.canUndoPromote(live) && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={doUndoPromote}>{L(lang, 'Desfazer promoção', 'Undo promote')}</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {error && <p className="cl-error" role="alert">{error}</p>}
        <div className="cl-actions cl-actions-main">
          <button type="button" className="btn btn-primary cl-btn" disabled={!!busy} onClick={doAdd}>
            {busy === 'add' ? '…' : L(lang, 'Adicionar a uma campanha', 'Add to a campaign')}
          </button>
        </div>
        <p className="cl-hint muted">{L(lang,
          'Aqui as versões revezam a mesma ficha: abrir uma tira o personagem da mesa anterior (você continua lá, sem personagem). Para jogar em duas mesas ao mesmo tempo, use “Nova versão para outra mesa”, acima.',
          'Here the versions take turns on the same sheet: opening one takes the character off the previous table (you stay there, without a character). To play at two tables at once, use “New version for another table” above.')}</p>
        {store.current !== V.TEMPLATE && (
          <p className="cl-hint muted">{L(lang,
            'Em campanha, nível, PV máximo, atributos e itens são cuidados pelo mestre.',
            'In a campaign, level, max HP, abilities and items are handled by the GM.')}</p>
        )}
      </>
    );
  }

  return (
    <Modal onClose={onClose} title={L(lang, 'Versões da ficha', 'Sheet versions')}>
      <div className="cl-modal vr-modal">{body}</div>
    </Modal>
  );
}
