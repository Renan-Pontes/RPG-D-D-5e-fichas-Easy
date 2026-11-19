// Mesas e cópias da ficha: onde ela joga, a ficha ORIGINAL (o "modelo" do armazém) e uma
// cópia por campanha. Lista, troca, sair, voltar, excluir, promover a original e abrir uma
// cópia guardada só para leitura. Na tela: "ficha original" e "cópia" (no código: modelo/versão).
// Regras e armazenamento em versions.js; o que o servidor deve passar a fazer está em
// docs/character-versions.md.
//
// Hoje o servidor só conhece UMA ficha por personagem e tranca campos de quem está em
// campanha. Por isso a troca é sempre nesta ordem: soltar a ficha da mesa atual →
// gravar a outra versão → atrelar à mesa nova.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
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
 * abre a folha Campanha (atrelar a mais uma mesa; a ficha continua onde está).
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
      if (alive.current) { setError(e?.message === 'version_active' ? L(lang, 'Saia da campanha antes de excluir.', 'Leave the campaign before deleting.') : linkErrorText(e, lang)); await load().catch(() => {}); }
    } finally { if (alive.current) setBusy(''); }
  };

  // Troca para `key` (modelo ou campanha ativa): soltar → gravar → atrelar.
  const switchTo = async (key, base = live) => {
    const cur = V.storeOf(base).current;
    if (cur !== V.TEMPLATE) await detach(cur);
    let next = await save(V.checkout(base, key)) || V.checkout(base, key);
    // já sentada naquela mesa (a ficha senta em N mesas): só troca a cópia, sem atrelar de novo
    if (key !== V.TEMPLATE && !linkOf(key)) {
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

  // Abrir outra cópia tira o personagem da mesa da cópia aberta (o armazém reveza a mesma
  // ficha). Isso nunca acontece calado: se há mesa para sair, pergunta antes e diz qual.
  const doSwitch = (r) => {
    const cur = V.storeOf(live).current;
    const go = () => act(`open:${r.key}`, async () => {
      await switchTo(r.key);
      return r.kind === 'template'
        ? L(lang, 'Ficha original aberta (fora de campanha).', 'Original sheet open (outside campaigns).')
        : L(lang, `Cópia de “${r.name}” aberta.`, `“${r.name}” copy open.`);
    });
    if (cur === V.TEMPLATE || !linkOf(cur)) { go(); return; }
    const from = store.campaigns?.[cur]?.name || linkOf(cur)?.name || L(lang, 'a mesa atual', 'the current table');
    const who = live.name || L(lang, 'O personagem', 'The character');
    setConfirm({
      title: r.kind === 'template'
        ? L(lang, 'Abrir a ficha original?', 'Open the original sheet?')
        : L(lang, `Abrir a cópia de “${r.name}”?`, `Open the “${r.name}” copy?`),
      text: L(lang,
        `${who} sai de “${from}” (você continua lá, sem personagem). A cópia dessa mesa fica guardada como está, e dá para voltar depois. Para jogar em mais de uma mesa com a mesma ficha, use “Atrelar a outra mesa”.`,
        `${who} leaves “${from}” (you stay there, without a character). That table’s copy is kept as it is, and you can come back later. To play at more than one table with the same sheet, use “Link to another table”.`),
      ok: L(lang, `Abrir e sair de “${from}”`, `Open and leave “${from}”`),
      run: go,
    });
  };

  const doLeave = (r) => setConfirm({
    title: L(lang, `Sair de “${r.name}”?`, `Leave “${r.name}”?`),
    text: L(lang,
      'O personagem sai da mesa (você continua na campanha, sem personagem). A cópia desta mesa fica guardada como está: dá para voltar depois e continuar de onde parou, ou excluí-la de vez.',
      'The character leaves the table (you stay in the campaign, without a character). This table’s copy is kept as it is: you can join again later and pick up where you left off, or delete it for good.'),
    ok: L(lang, 'Sair', 'Leave'),
    run: () => act(`leave:${r.key}`, async () => {
      if (V.storeOf(live).current === r.key) await detach(r.key);
      await save(V.leave(live, r.key));
      return L(lang, `Você saiu de “${r.name}”. A cópia ficou guardada.`, `You left “${r.name}”. The copy was kept.`);
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
      'A cópia vira uma ficha à parte, com tudo o que tem hoje, e sai desta lista. Ela conta como uma ficha do plano. Depois, use “Atrelar a uma mesa” nela para sentar na mesa — sem tirar o personagem das outras.',
      'The copy becomes a separate sheet with everything it has today and leaves this list. It counts as one character on your plan. Then use “Link to a table” on it to sit at the table — without taking the character off the others.'),
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
    title: L(lang, 'Recomeçar a partir da ficha original?', 'Restart from the original sheet?'),
    text: L(lang,
      'Esta cópia volta a ser igual à ficha original como ela está agora: nível, itens e anotações desta mesa se perdem. Ela continua na mesma mesa. Não dá para desfazer.',
      'This copy becomes equal to the original sheet as it is now: this table’s level, items and notes are lost. It stays at the same table. It cannot be undone.'),
    ok: L(lang, 'Recomeçar', 'Restart'),
    danger: true,
    typed: L(lang, 'recomeçar', 'restart'),
    run: () => act('restart', async () => {
      await save(F.restartFromTemplate(live, template));
      return L(lang, 'Cópia recomeçada a partir da ficha original.', 'Copy restarted from the original sheet.');
    }),
  });
  const doArchive = () => act('archive', async () => {
    await save(F.archiveFork(live));
    return L(lang, 'Cópia arquivada: fica só para leitura.', 'Copy archived: it is now read-only.');
  });

  const doExclude = (r) => setConfirm({
    title: L(lang, `Excluir a cópia de “${r.name}”?`, `Delete the “${r.name}” copy?`),
    text: L(lang,
      'Isto apaga para sempre a cópia desta campanha (nível, itens, anotações…). A ficha original e as outras cópias não mudam. Não dá para desfazer.',
      'This permanently deletes this campaign’s copy (level, items, notes…). The original sheet and other copies are untouched. It cannot be undone.'),
    ok: L(lang, 'Excluir para sempre', 'Delete forever'),
    danger: true,
    typed: r.name || L(lang, 'excluir', 'delete'),
    run: () => act(`exclude:${r.key}`, async () => {
      await save(V.exclude(live, r.key));
      // devolve a vaga vazia da pessoa naquela mesa, se houver (sem erro se não der)
      const camp = campOf(r.key);
      const seats = camp ? (camp.myMemberships || (camp.myMembership ? [camp.myMembership] : [])) : [];
      if (camp && camp.role !== 'dm' && seats.length === 1 && seats[0].characterId == null) {
        await api.removeMember(camp.id, seats[0].id).catch(() => {});
      }
      return L(lang, `Cópia de “${r.name}” excluída.`, `“${r.name}” copy deleted.`);
    }),
  });

  const doPromote = (r) => setConfirm({
    title: L(lang, `Promover “${r.name}” a ficha original?`, `Promote “${r.name}” to original sheet?`),
    text: L(lang,
      'A ficha original passa a ser igual à cópia desta mesa. As cópias das mesas não mudam. Dá para desfazer uma vez.',
      'The original sheet becomes equal to this table’s copy. Table copies are untouched. You can undo it once.'),
    ok: L(lang, 'Promover', 'Promote'),
    run: () => act(`promote:${r.key}`, async () => {
      await save(V.promote(live, r.key));
      return L(lang, `A ficha original agora é igual à cópia de “${r.name}”.`, `The original sheet now matches the “${r.name}” copy.`);
    }),
  });

  const doUndoPromote = () => act('undo', async () => {
    await save(V.undoPromote(live));
    return L(lang, 'Ficha original anterior restaurada.', 'Previous original sheet restored.');
  });

  // PT-01: "Atrelar a outra mesa" só abre a folha Campanha. Antes trocava a ficha para o
  // modelo primeiro — o que tirava o personagem da mesa atual sem avisar.
  const doAdd = () => { setError(''); onAddCampaign?.(); };

  const stateTag = (r) => {
    if (r.kind === 'template') return null;
    if (r.state === 'left') return <span className="vr-tag is-left">{L(lang, 'Você saiu', 'You left')}</span>;
    if (r.state === 'archived') return <span className="vr-tag is-archived">{L(lang, 'Campanha encerrada', 'Campaign closed')}</span>;
    return null;
  };
  const levelLine = (level, hp, maxHp) => (
    <span className="vr-preview">
      {L(lang, 'Nível', 'Level')} {level || 1}
      {maxHp != null && <> · {L(lang, 'PV', 'HP')} {hp ?? maxHp}/{maxHp}</>}
    </span>
  );

  // ── Outras fichas deste personagem: cada cópia separada é uma ficha própria (forks.js) ──
  const others = (family || []).filter(c => c && c.id !== live.id);
  const familyRow = (c) => {
    const tpl = !F.isFork(c);
    return (
      <li key={c.id} className="vr-row">
        <div className="vr-main">
          <span className="vr-eyebrow">
            {tpl ? L(lang, 'Ficha original', 'Original sheet') : c.versionKind === 'oneshot' ? 'One-shot' : L(lang, 'Cópia separada', 'Separate copy')}
            {c.inCampaign && <span className="vr-tag is-current">{L(lang, 'Na mesa', 'Seated')}</span>}
          </span>
          <strong className="vr-name">{tpl ? (c.name || L(lang, 'Sem nome', 'Unnamed')) : F.forkLabel(c, lang)}</strong>
          {levelLine(c.level, c.currentHp, c.maxHp)}
        </div>
        {onOpenSheet && (
          <div className="vr-actions">
            <button type="button" className="mesa-btn" disabled={!!busy} onClick={() => onOpenSheet(c.id)}>{L(lang, 'Abrir', 'Open')}</button>
          </div>
        )}
      </li>
    );
  };
  const doFork = (kind) => act(`fork:${kind}`, async () => { await onFork(kind); return ''; });
  const familyList = others.length > 0 && (
    <section className="cl-sec" aria-label={L(lang, 'Outras fichas deste personagem', 'Other sheets of this character')}>
      <MesaTitle as="h3">{L(lang, 'Outras fichas deste personagem', 'Other sheets of this character')}</MesaTitle>
      <ul className="vr-list">{others.map(familyRow)}</ul>
    </section>
  );
  const forkBox = onFork && (
    <div className="vr-adv-item">
      <h4 className="vr-adv-title">{L(lang, 'Cópia separada para outra mesa', 'Separate copy for another table')}</h4>
      <p className="cl-hint">{L(lang,
        'Cria outra ficha, só daquela mesa: nasce igual a esta e evolui sozinha (nível, itens e anotações não se misturam).',
        'Creates another sheet, for that table only: it starts as a copy of this one and grows on its own (level, items and notes do not mix).')}</p>
      {(() => { const n = F.forkPlanNote(plan, family, live, lang); return <p className={`cl-hint${n.atLimit ? ' vr-plan-full' : ''}`}>{n.text}</p>; })()}
      <div className="cl-actions is-start">
        <button type="button" className="mesa-btn cl-btn" disabled={!!busy} onClick={() => doFork('campaign')}>
          {busy === 'fork:campaign' ? '…' : L(lang, 'Nova cópia para outra mesa', 'New copy for another table')}
        </button>
        <button type="button" className="mesa-btn cl-btn" disabled={!!busy} onClick={() => doFork('oneshot')}>
          {busy === 'fork:oneshot' ? '…' : L(lang, 'Jogar um one-shot', 'Play a one-shot')}
        </button>
      </div>
    </div>
  );

  let body;
  if (loadErr) {
    body = (
      <div className="cl-state">
        <p className="cl-error" role="alert">{loadErr}</p>
        <button type="button" className="mesa-btn cl-btn" onClick={load}>{L(lang, 'Tentar de novo', 'Try again')}</button>
      </div>
    );
  } else if (!ctx) {
    body = <p className="cl-empty" role="status">{L(lang, 'Carregando…', 'Loading…')}</p>;
  } else if (confirm) {
    const locked = confirm.typed && typed.trim().toLowerCase() !== confirm.typed.trim().toLowerCase();
    body = (
      <div className="cl-confirm" role="alertdialog" aria-labelledby="vr-confirm-title" aria-describedby="vr-confirm-text">
        <h3 id="vr-confirm-title">{confirm.title}</h3>
        <p id="vr-confirm-text">{confirm.text}</p>
        {confirm.typed && (
          <label className="vr-typed">
            <span>{L(lang, `Digite “${confirm.typed}” para confirmar`, `Type “${confirm.typed}” to confirm`)}</span>
            <input className="input" value={typed} onChange={e => setTyped(e.target.value)} autoFocus autoComplete="off" />
          </label>
        )}
        {error && <p className="cl-error" role="alert">{error}</p>}
        <div className="cl-actions">
          <button type="button" className="mesa-btn" onClick={() => { setConfirm(null); setTyped(''); setError(''); }} disabled={!!busy}>{L(lang, 'Voltar', 'Back')}</button>
          <button type="button" className={`mesa-btn ${confirm.danger ? 'is-danger' : 'is-primary'}`} onClick={confirm.run} disabled={!!busy || locked}>
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
            `Esta é a cópia de “${live.versionCampaign.name}”: uma ficha própria, só desta mesa. A ficha original e as outras cópias não mudam com ela.`,
            `This is the “${live.versionCampaign.name}” copy: a sheet of its own, for this table only. The original sheet and the other copies do not change with it.`)
          : L(lang,
            'Esta cópia ainda não tem mesa. Toque em “Atrelar a uma mesa” para sentá-la; a ficha original e as outras cópias não mudam com ela.',
            'This copy has no table yet. Tap “Link to a table” to seat it; the original sheet and the other copies do not change with it.')}</p>
        {!live.versionCampaign?.name && onAddCampaign && (
          <div className="cl-actions is-start">
            <button type="button" className="mesa-btn is-primary cl-btn" disabled={!!busy} onClick={doAdd}>{L(lang, 'Atrelar a uma mesa', 'Link to a table')}</button>
          </div>
        )}
        {familyList}
        {error && <p className="cl-error" role="alert">{error}</p>}
        <details className="vr-adv">
          <summary>{L(lang, 'Avançado', 'Advanced')}</summary>
          <div className="vr-adv-body">
            {forkBox}
            {template && (
              <div className="vr-adv-item">
                <h4 className="vr-adv-title">{L(lang, 'Recomeçar a partir da ficha original', 'Restart from the original sheet')}</h4>
                <p className="cl-hint">{L(lang, 'Esta cópia volta a ser igual à ficha original de agora. O que ela tem hoje se perde.', 'This copy becomes equal to the original sheet as it is now. What it has today is lost.')}</p>
                <div className="cl-actions is-start">
                  <button type="button" className="mesa-btn is-danger cl-btn" disabled={!!busy} onClick={doRestart}>
                    {busy === 'restart' ? '…' : L(lang, 'Recomeçar…', 'Restart…')}
                  </button>
                </div>
              </div>
            )}
            <div className="vr-adv-item">
              <h4 className="vr-adv-title">{L(lang, 'Arquivar esta cópia', 'Archive this copy')}</h4>
              <p className="cl-hint">{L(lang, 'Ela fica guardada só para leitura; dá para desarquivar depois.', 'It is kept read-only; you can unarchive it later.')}</p>
              <div className="cl-actions is-start">
                <button type="button" className="mesa-btn cl-btn" disabled={!!busy} onClick={doArchive}>
                  {busy === 'archive' ? '…' : L(lang, 'Arquivar (só leitura)', 'Archive (read-only)')}
                </button>
              </div>
            </div>
          </div>
        </details>
      </>
    );
  } else {
    const seated = list.filter(r => r.kind === 'campaign' && r.state === 'active');
    const stored = list.filter(r => r.kind === 'campaign' && r.state !== 'active');
    const tpl = list.find(r => r.kind === 'template');
    const camps = list.filter(r => r.kind === 'campaign');
    const splits = camps.filter(r => canSplit.has(r.key));
    const openTag = <span className="vr-tag is-current">{L(lang, 'Aberta agora', 'Open now')}</span>;
    body = (
      <>
        <section className="cl-sec" aria-label={L(lang, 'Onde esta ficha joga', 'Where this sheet plays')}>
          <MesaTitle as="h3">{L(lang, 'Onde esta ficha joga', 'Where this sheet plays')}</MesaTitle>
          {seated.length === 0 ? (
            <p className="cl-empty">{L(lang, 'Esta ficha não está em nenhuma mesa.', 'This sheet is not at any table.')}</p>
          ) : (
            <ul className="vr-list">
              {seated.map(r => (
                <li key={r.key} className={`vr-row is-seated${r.current ? ' is-current' : ''}`}>
                  <div className="vr-main">
                    <strong className="vr-name">{r.name}</strong>
                    <span className="vr-meta">
                      {levelLine(r.level, r.hp, r.maxHp)}
                      {r.current && seated.length > 1 && openTag}
                    </span>
                  </div>
                  <div className="vr-actions">
                    {!r.current && (
                      <button type="button" className="mesa-btn is-primary" disabled={!!busy} onClick={() => doSwitch(r)}>
                        {busy === `open:${r.key}` ? '…' : L(lang, 'Abrir', 'Open')}
                      </button>
                    )}
                    <button type="button" className="mesa-btn" disabled={!!busy} onClick={() => doLeave(r)}>{L(lang, 'Sair', 'Leave')}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="cl-error" role="alert">{error}</p>}
          <div className="cl-actions is-start">
            <button type="button" className="mesa-btn is-primary cl-btn" disabled={!!busy} onClick={doAdd}>
              {seated.length ? L(lang, 'Atrelar a outra mesa', 'Link to another table') : L(lang, 'Atrelar a uma mesa', 'Link to a table')}
            </button>
          </div>
          {store.current !== V.TEMPLATE && (
            <p className="cl-hint">{L(lang,
              'Em campanha, nível, PV máximo, atributos e itens são cuidados pelo mestre.',
              'In a campaign, level, max HP, abilities and items are handled by the GM.')}</p>
          )}
        </section>

        <section className="cl-sec" aria-label={L(lang, 'Cópias desta ficha por mesa', 'Copies of this sheet per table')}>
          <MesaTitle as="h3">{L(lang, 'Cópias desta ficha por mesa', 'Copies of this sheet per table')}</MesaTitle>
          <p className="cl-hint">{L(lang,
            'Cada mesa guarda a sua cópia (nível, itens, anotações). A ficha original é a de fora de campanha: dela nasce a cópia de cada mesa nova.',
            'Each table keeps its own copy (level, items, notes). The original sheet is the one outside campaigns: each new table starts from a copy of it.')}</p>
          <ul className="vr-list">
            {tpl && (
              <li className={`vr-row is-template${tpl.current ? ' is-current' : ''}`}>
                <div className="vr-main">
                  <span className="vr-eyebrow">{L(lang, 'Ficha original', 'Original sheet')}{tpl.current && openTag}</span>
                  <strong className="vr-name">{live.name || L(lang, 'Sem nome', 'Unnamed')}</strong>
                  {levelLine(tpl.level, tpl.hp, tpl.maxHp)}
                </div>
                <div className="vr-actions">
                  {!tpl.current && (
                    <button type="button" className="mesa-btn" disabled={!!busy} onClick={() => doSwitch(tpl)}>
                      {busy === `open:${tpl.key}` ? '…' : L(lang, 'Abrir a original', 'Open the original')}
                    </button>
                  )}
                  {V.canUndoPromote(live) && (
                    <button type="button" className="mesa-btn" disabled={!!busy} onClick={doUndoPromote}>{L(lang, 'Desfazer promoção', 'Undo promote')}</button>
                  )}
                </div>
              </li>
            )}
            {stored.map(r => (
              <li key={r.key} className={`vr-row is-${r.state}`}>
                <div className="vr-main">
                  <span className="vr-eyebrow">{stateTag(r)}</span>
                  <strong className="vr-name">{r.name}</strong>
                  {levelLine(r.level, r.hp, r.maxHp)}
                </div>
                <div className="vr-actions">
                  {r.state === 'left' && (
                    <button type="button" className="mesa-btn is-primary" disabled={!!busy} onClick={() => doJoin(r)}>
                      {busy === `join:${r.key}` ? '…' : L(lang, 'Voltar para a mesa', 'Join again')}
                    </button>
                  )}
                  <button type="button" className="mesa-btn" disabled={!!busy} onClick={() => { onPreview?.(r.key); onClose?.(); }}>
                    {L(lang, 'Ver', 'View')}
                  </button>
                  <button type="button" className="mesa-btn is-danger" disabled={!!busy} onClick={() => doExclude(r)}>{L(lang, 'Excluir', 'Delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {familyList}

        {(forkBox || camps.length > 0) && (
          <details className="vr-adv">
            <summary>{L(lang, 'Avançado', 'Advanced')}</summary>
            <div className="vr-adv-body">
              {forkBox}
              {camps.length > 0 && (
                <div className="vr-adv-item">
                  <h4 className="vr-adv-title">{L(lang, 'Promover a cópia de uma mesa a ficha original', 'Promote a table copy to original sheet')}</h4>
                  <p className="cl-hint">{L(lang,
                    'A ficha original passa a ser igual à cópia daquela mesa. As cópias das mesas não mudam. Dá para desfazer uma vez.',
                    'The original sheet becomes equal to that table’s copy. Table copies do not change. You can undo it once.')}</p>
                  <div className="cl-actions is-start">
                    {camps.map(r => (
                      <button key={r.key} type="button" className="mesa-btn cl-btn" disabled={!!busy} onClick={() => doPromote(r)}>
                        {L(lang, `Promover “${r.name}”`, `Promote “${r.name}”`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {splits.length > 0 && (
                <div className="vr-adv-item">
                  <h4 className="vr-adv-title">{L(lang, 'Separar a cópia de uma mesa em ficha própria', 'Split a table copy into its own sheet')}</h4>
                  <p className="cl-hint">{L(lang,
                    'A cópia vira uma ficha à parte e sai desta lista. Ela conta como uma ficha do seu plano.',
                    'The copy becomes a separate sheet and leaves this list. It counts as one character on your plan.')}</p>
                  <div className="cl-actions is-start">
                    {splits.map(r => (
                      <button key={r.key} type="button" className="mesa-btn cl-btn" disabled={!!busy} onClick={() => doSplit(r)}>
                        {busy === `split:${r.key}` ? '…' : L(lang, `Separar “${r.name}”`, `Split “${r.name}”`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </>
    );
  }

  return (
    <MesaSheet title={L(lang, 'Mesas e cópias da ficha', 'Tables and copies of the sheet')} eyebrow={live.name || undefined}
      onClose={onClose} lang={lang} width="md" className="cl-sheet">
      <div className="cl-modal vr-modal">{body}</div>
    </MesaSheet>
  );
}
