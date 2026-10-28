// O editor único do Resumo da sessão (V12, especificação §4.9) — junta o "Anteriormente
// em…" de Jogar (o antigo play/RecapCard.jsx) e o editor da Crônica (o RecapSheet de
// campaigns/DiaryTab.jsx). Abre:
//   - pelo Encerrar ("Encerrar e escrever o resumo"), JÁ ABERTO e com o rascunho rico;
//   - pela Crônica (✨ Anteriormente em… e ⋯ da sessão › 📜 Resumo desta sessão);
//   - por Jogar › Agora › Ferramentas › Anteriormente em… e pelo J2 ("📜 Escrever o resumo");
//   - por Jogar › Tela › Mostrar › Texto, dentro da página (`inline`, sem folha).
// O resumo SALVO da sessão (subtype 'summary') vem primeiro (D4): ele é o "Anteriormente
// em…" da sessão seguinte. Sem ele, o rascunho rico (diary-summary.buildRecap, sem IA): as
// cenas jogadas, os combates, os testes com o resultado, o que foi à Tela, revelações e
// críticos. Título, texto (5000), ✨ Montar resumo, Copiar, Salvar na Crônica (um resumo por
// sessão: salvar de novo atualiza o mesmo), 📺 Mostrar na Tela / Tirar da Tela ("● Na Tela
// agora") e Fechar; o botão grande é o que falta fazer (salvar o texto novo; mostrar o salvo).
// "Momentos da noite" fica embaixo, só para o mestre: nunca entra no texto, que vai à Tela e
// à Crônica dos jogadores. Tudo é lido ao abrir (nenhum polling).
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { buildRecap, nightMomentLine, nightMoments, sessionChecks } from '../campaigns/diary-summary.js';
import { copyText } from '../group/InviteCard.jsx';
import { cachedInsights, loadInsightsOnce } from '../group/insights-api.js';
import { normalizePlan } from '../prep/next-session.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import { sendToStage, showOnStage, stageBack } from '../stage/stage-api.js';
import { frontPlace, stageNow } from '../stage/stage-now.js';
import useStage from '../stage/useStage.js';
import { getSessionPlan } from '../world/world-api.js';
import { flash } from './flash.js';
import { currentScene, readDoneBefore, stateSessionNumber } from './now-model.js';
import { announceRecap } from './scene-actions.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
export const RECAP_MAX = 5000;

/** A sessão que o resumo conta, quando ninguém disse: ao vivo, a anterior; parada, a última. */
export function recapSessionOf(state) {
  const cur = stateSessionNumber(state) || 0;
  const n = state?.live ? cur - 1 : cur;
  return n > 0 ? n : null;
}

const newest = (list) => [...list].sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))[0] || null;

/**
 * session  a sessão do resumo (undefined = recapSessionOf; null = sem número, um dia da Crônica)
 * entries  as entradas da Crônica dessa sessão, se quem abre já tem (sem elas, 1 GET)
 * context  {plan, sceneId, doneBefore}: o plano jogado, a cena de "agora" e as já feitas antes da
 *          sessão (o Encerrar manda; sem ele, o plano arquivado da sessão ou o de agora, se for o dela)
 * inline   dentro da página (Jogar › Tela › Texto), sem folha nem Momentos da noite
 * onSaved(recap) depois de salvar (a folha fecha) · onShown() depois de ir à Tela
 */
export default function RecapEditor({ campaign, lang = 'pt', session: sessionProp, entries: entriesProp = null, context = null,
  inline = false, dock, onClose, onSaved, onShown }) {
  const st = campaign.state || {};
  const n = sessionProp === undefined ? recapSessionOf(st) : sessionProp;
  const closed = campaign.status === 'closed';
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(null);      // {id, title, text} do resumo salvo
  const [from, setFrom] = useState('loading');   // 'loading' | 'saved' | 'draft'
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState('');
  const [night, setNight] = useState(null);       // linhas dos Momentos da noite
  const entriesRef = useRef(entriesProp);
  const inputs = useRef(null);                    // {plan, sceneId, checks} já lidos

  // ---------------------------------------------------------------- leitura (sob demanda)
  const sessionEntries = async () => {
    if (entriesRef.current) return entriesRef.current;
    if (n == null) return [];
    const r = await api.listDiary(campaign.id, { session: n, limit: 200 });
    entriesRef.current = r.entries || [];
    return entriesRef.current;
  };
  const draftInputs = async (list) => {
    if (inputs.current) return inputs.current;
    const meta = (n != null && st.diarySessions?.[String(n)]) || {};
    let plan = context?.plan || null;
    let sceneId = context?.sceneId ?? null;
    // servidor sem o doneBefore: o que este aparelho guardou ao começar a sessão
    let doneBefore = context?.doneBefore ?? meta.doneBefore ?? readDoneBefore(campaign.id, n) ?? null;
    if (!plan && n != null) {
      if (list.some(e => e.subtype === 'plan')) {
        const r = await api.listDiary(campaign.id, { subtype: 'plan', session: n, limit: 1 }).catch(() => null);
        const d = r?.entries?.[0]?.data;
        if (d?.plan) { plan = d.plan; sceneId = d.sceneId || null; doneBefore = d.doneBefore ?? doneBefore; }
      } else {
        const p = normalizePlan(await getSessionPlan(campaign.id).catch(() => null));
        const cur = stateSessionNumber(st);
        // servidor sem o sceneId: a cena de agora pelo nome (state.scene)
        if (p.forSession === n || (!p.forSession && cur === n)) { plan = p; if (st.live && cur === n) sceneId = st.sceneId || currentScene(p, { scene: st.scene })?.id || null; }
      }
    }
    let checks = [];
    if (n != null && meta.startedAt) {
      const r = await api.listChecks(campaign.id).catch(() => null);
      checks = sessionChecks(r?.checks || [], meta.startedAt, meta.endedAt || null);
    }
    inputs.current = { plan, sceneId, doneBefore, checks, shown: meta.shown || [] };
    return inputs.current;
  };
  const makeDraft = async () => {
    const list = await sessionEntries();
    const inp = await draftInputs(list);
    const info = n != null ? st.diarySessions?.[String(n)] : null;
    return buildRecap(list, { lang, session: n, title: info?.title || '', campaignName: campaign.name, ...inp });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await sessionEntries();
        const hit = newest(list.filter(e => e.subtype === 'summary' && (n == null || Number(e.session) === Number(n))));
        if (!alive) return;
        if (hit) {
          const rec = { id: hit.id, title: hit.title || '', text: hit.body || '' };
          setSaved(rec); setTitle(rec.title); setText(rec.text); setFrom('saved');
          return;
        }
        const d = await makeDraft();
        if (!alive) return;
        setTitle(d.title); setText(d.text); setFrom('draft');
      } catch (e) {
        if (alive) { setErr(errorMessage(e, lang)); setFrom('draft'); }
      }
    })();
    return () => { alive = false; };
  }, [campaign.id, n]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Momentos da noite": os do Raio-X (1 leitura por campanha) e os testes da sessão
  const party = useMemo(() => (campaign.members || []).filter(m => m.role !== 'dm' && m.character?.id)
    .map(m => ({ id: m.character.id, name: m.character.name || '?' })), [campaign.members]);
  const openNight = async () => {
    if (night || !party.length || n == null) return;
    try {
      const ins = cachedInsights(campaign.id) || await loadInsightsOnce(campaign.id);
      const inp = await draftInputs(await sessionEntries());
      setNight(nightMoments({ party, spotlights: ins?.spotlights || {}, checks: inp.checks, session: n }).map(r => ({ ...r, line: nightMomentLine(r, lang) })));
    } catch { setNight([]); }
  };

  // ---------------------------------------------------------------- a Tela (a regra de sempre)
  const stage = useStage(campaign);
  const place = frontPlace(stageNow({ stage, combat: campaign.combatNow }), 'recap');
  const onTv = st.stageRecap || {};
  const live = place === 'front' && (onTv.title || '') === title.trim() && (onTv.text || '') === text;

  // ---------------------------------------------------------------- ações
  const empty = !title.trim() && !text.trim();
  const tooLong = text.length > RECAP_MAX;
  const changed = !saved || saved.title !== title.trim() || saved.text !== text;
  const edit = (set) => (e) => { set(e.target.value); setTouched(true); setErr(''); };

  const redraft = async () => {
    setBusy(true); setErr('');
    try { const d = await makeDraft(); setTitle(d.title); setText(d.text); setTouched(true); setFrom('draft'); }
    catch (e) { setErr(errorMessage(e, lang)); }
    setBusy(false);
  };
  const save = async () => {
    setBusy(true); setErr('');
    const body = { title: title.trim().slice(0, 200), body: text };
    try {
      const r = saved ? await api.updateDiaryEntry(campaign.id, saved.id, body)
        : await api.createDiaryNote(campaign.id, { subtype: 'summary', ...body, session: n });
      const rec = { id: r?.entry?.id ?? saved?.id, title: body.title, text };
      setSaved(rec); setTouched(false); setFrom('saved');
      announceRecap(campaign.id, n, { has: true, ...rec });
      flash(L(lang, 'Resumo salvo na Crônica.', 'Recap saved to the chronicle.'));
      onSaved?.(rec);
    } catch (e) { setErr(errorMessage(e, lang)); }
    setBusy(false);
  };
  const show = async () => {
    setBusy(true);
    const r = await sendToStage(campaign.id, () => showOnStage(campaign.id, { kind: 'recap', title: title.trim().slice(0, 200), text }),
      { lang, name: L(lang, 'Anteriormente em…', 'Previously on…') });
    if (r) { setTouched(false); onShown?.(); }
    setBusy(false);
  };
  const takeOff = () => sendToStage(campaign.id, () => stageBack(campaign.id), { lang, done: L(lang, 'Tirado da Tela ✓', 'Removed from the screen ✓') });
  const copy = async () => {
    if (await copyText(`${title}\n\n${text}`)) { setErr(''); flash(L(lang, 'Texto copiado.', 'Text copied.')); }
    else setErr(L(lang, 'Não deu para copiar: selecione o texto e copie à mão.', 'Could not copy: select the text and copy it by hand.'));
  };

  // ---------------------------------------------------------------- tela
  const loading = from === 'loading';
  const why = closed ? L(lang, 'Campanha encerrada: o resumo fica só para ler e copiar.', 'Campaign closed: the recap is read and copy only.')
    : tooLong ? L(lang, `Texto longo demais (máx. ${RECAP_MAX} caracteres).`, `Text too long (max ${RECAP_MAX} characters).`) : '';
  const off = busy || loading || closed || empty || tooLong;
  const saveBtn = (big) => (
    <button type="button" className={`mesa-btn ${big ? 'mesa-btn-lg is-primary recap-main' : ''} recap-save`} disabled={off || (!changed && !!saved)} onClick={save}>
      {busy ? '…' : saved && !changed ? L(lang, 'Salvo na Crônica ✓', 'Saved to the chronicle ✓') : L(lang, 'Salvar na Crônica', 'Save to chronicle')}
    </button>
  );
  const showBtn = (big) => (live
    ? <button type="button" className={`mesa-btn ${big ? 'mesa-btn-lg recap-main' : ''}`} disabled={busy} onClick={takeOff}>{L(lang, 'Tirar da Tela', 'Remove from screen')}</button>
    : <button type="button" className={`mesa-btn ${big ? 'mesa-btn-lg is-primary recap-main' : ''} recap-show`} disabled={off} onClick={show}>📺 {L(lang, 'Mostrar na Tela', 'Show on screen')}</button>);
  // o que falta fazer vai grande: o texto novo, salvar; o salvo, mostrar
  const mainIsSave = changed && !inline;
  const footer = ({ close } = {}) => (
    <div className="recap-foot">
      {err && <p className="recap-err" role="alert" onClick={() => setErr('')}>{err}</p>}
      {why && <p className="recap-why">{why}</p>}
      {live && <p className="recap-live" role="status">● {L(lang, 'Na Tela agora', 'On screen now')}</p>}
      {mainIsSave ? saveBtn(true) : showBtn(true)}
      <div className="recap-more">
        {mainIsSave ? showBtn(false) : saveBtn(false)}
        <button type="button" className="mesa-btn" disabled={loading || empty} onClick={copy}>{L(lang, 'Copiar', 'Copy')}</button>
        {close && <button type="button" className="mesa-btn" onClick={close}>{L(lang, 'Fechar', 'Close')}</button>}
      </div>
    </div>
  );
  const sub = from === 'saved'
    ? L(lang, `O resumo salvo${n != null ? ` da Sessão ${n}` : ''}: é o “Anteriormente em…” da sessão seguinte.`, `The saved recap${n != null ? ` of session ${n}` : ''}: it is the next session’s “Previously on…”.`)
    : L(lang, 'Rascunho montado com o que ficou na Crônica, no plano e na Tela (o que é oculto fica de fora). Edite à vontade: só vai à Tela quando você mandar.',
      'Draft built from the Chronicle, the plan and the screen (hidden things are left out). Edit freely: it only goes to the screen when you say so.');
  const body = (
    <>
      <p className="mesa-sheet-text recap-sub">{loading ? L(lang, 'Montando o resumo…', 'Drafting the recap…') : sub}</p>
      <button type="button" className="mesa-btn recap-draft" disabled={busy || loading} onClick={redraft}>
        ✨ {L(lang, 'Montar resumo', 'Draft recap')}{from === 'saved' ? ` · ${L(lang, 'de novo, da Crônica', 'again, from the Chronicle')}` : ''}
      </button>
      <label className="mesa-field">
        <span className="mesa-field-label">{L(lang, 'Título', 'Title')}</span>
        <input className="input recap-title" value={title} maxLength={200} disabled={loading} onChange={edit(setTitle)}
          placeholder={L(lang, `Anteriormente em ${campaign.name}…`, `Previously on ${campaign.name}…`)} />
      </label>
      <label className="mesa-field recap-textfield">
        <span className="mesa-field-label">{L(lang, 'Texto', 'Text')} <span className="recap-count">{text.length}/{RECAP_MAX}</span></span>
        <textarea className="input recap-text" rows={Math.min(14, Math.max(6, text.split('\n').length + 2))} value={text} disabled={loading}
          onChange={edit(setText)} placeholder={L(lang, 'O que aconteceu na sessão… (leia em voz alta ou mostre na Tela)', 'What happened in the session… (read it aloud or show it on screen)')} />
      </label>
      {!inline && party.length > 0 && n != null && (
        <details className="recap-night" onToggle={(e) => { if (e.currentTarget.open) openNight(); }}>
          <summary>{L(lang, 'Momentos da noite', 'Tonight’s moments')} <span className="recap-night-who">· {L(lang, 'só você vê', 'only you see this')}</span></summary>
          {!night && <p className="recap-night-row">{L(lang, 'Carregando…', 'Loading…')}</p>}
          {night && !night.length && <p className="recap-night-row">{L(lang, 'Sem os momentos do Raio-X.', 'No X-ray moments.')}</p>}
          {night && night.map(r => <p key={r.id} className={`recap-night-row ${r.warn ? 'is-warn' : ''}`}>{r.line}</p>)}
          {night?.some(r => r.warn) && (
            <p className="recap-night-hint">{L(lang, `Quem ficou sem momento pode ganhar um no Plano da Sessão ${n + 1} (Grupo › Raio-X › Momentos).`, `Whoever had no moment can get one in the session ${n + 1} plan (Group › X-ray › Moments).`)}</p>
          )}
        </details>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="recap-card">
        <span className="mesa-eyebrow">📜 {L(lang, 'Anteriormente em…', 'Previously on…')}</span>
        {body}
        {footer()}
      </div>
    );
  }
  return (
    <MesaSheet title={L(lang, 'Resumo da sessão', 'Session recap')} icon="📜" size="tall" width="md" lang={lang} dock={dock}
      eyebrow={n != null ? L(lang, `Sessão ${n}`, `Session ${n}`) : undefined}
      onClose={onClose} dirty={touched && changed && !live} className="recap-sheet" bodyClassName="recap-card is-sheet"
      dirtyText={L(lang, 'O texto que você mexeu não foi salvo na Crônica nem foi para a Tela.', 'The text you edited was not saved to the chronicle and did not go to the screen.')}
      footer={footer}>
      {body}
    </MesaSheet>
  );
}
