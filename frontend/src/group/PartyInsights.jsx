// Grupo › Raio-X (só o mestre): forças, fraquezas, oportunidades e ameaças do grupo, e
// os gráficos do documento do Ivan — Papel do grupo (11 eixos), Perícias (0–20), Dano,
// Escolas, Cada personagem e a Tabela —, as lacunas, os Momentos com o estilo do
// jogador e o Equilíbrio na mesa (Moments.jsx) e o "Contra quem?".
// - As contas são do navegador (party-metrics.js, spotlights.js, versus.js) com as
//   fichas que o GET da campanha já traz: 0 pedido a mais; recalcula só quando uma
//   ficha muda (useMemo pela chave das fichas).
// - O que o mestre ajusta vai para o servidor (insights-api.js): 1 GET ao abrir, 1 PUT
//   800 ms depois do último toque. Nenhum polling.
// - Celular primeiro: listas e barras; os radares só no PC (≥ 1024). Todo número do
//   gráfico está escrito na lista ou na tabela; nada só no hover.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import MesaTitle from '../shell/MesaTitle.jsx';
import { useArea } from '../shell/useArea.js';
import { tName } from '../../data/i18n.js';
import { BESTIARY } from '../../data/bestiary.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import { getSessionPlan, saveSessionPlan } from '../world/world-api.js';
import { errorMessage } from '../api/errors.js';
import Radar from './Radar.jsx';
import * as PM from './party-metrics.js';
import { currentSession, gapGroups, ideaSceneText, momentSuggestions, partyGaps, quadrants, sceneIdeas, tableBalance } from './spotlights.js';
import { planMonsters, threatMonsters, versus } from './versus.js';
import { insightsApi, joinPatches, mergeInsights, rememberInsights, SAVE_DELAY, withDefaults } from './insights-api.js';
import { AdjustSheet, Dot, HelpButton, MonsterSheet, WhySheet } from './InsightsSheets.jsx';
import { Balance, Moments } from './Moments.jsx';
import './insights.css';

const t = PM.t;
const VIEW_DEFAULT = { skillsOrder: 'weak', schools: 'have', chars: 'abil', focusChar: null, overlay: [], open: {}, moments: 'session' };
const viewKey = (id) => `forja:insights-view:${id}`;

/** Seletores só visuais (ordem das perícias, escolas, personagens, seções abertas): no aparelho. */
function useView(campaignId) {
  const [view, setView] = useState(() => {
    try { return { ...VIEW_DEFAULT, ...JSON.parse(localStorage.getItem(viewKey(campaignId)) || '{}') }; } catch { return VIEW_DEFAULT; }
  });
  const set = useCallback((patch) => setView(v => {
    const next = { ...v, ...patch };
    try { localStorage.setItem(viewKey(campaignId), JSON.stringify(next)); } catch { /* sem storage: só não lembra */ }
    return next;
  }), [campaignId]);
  return [view, set];
}

function useWide() {
  const q = '(min-width: 1024px)';
  const get = () => { try { return window.matchMedia(q).matches; } catch { return false; } };
  const [wide, setWide] = useState(get);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

const classLine = (f, lang) => [f.primary, f.secondary].filter(Boolean).map(id => tName('class', id, lang)).join('/');
const pos = (v, min, max) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;

// params.focus = id da ficha (cartão de Grupo › Jogadores): abre com ele em destaque.
export default function PartyInsights({ campaign, lang = 'pt', params, onParamsDone }) {
  const { goTo } = useArea();
  const wide = useWide();
  const readOnly = campaign.status === 'closed';
  const [ins, setIns] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [save, setSave] = useState('idle');   // idle · waiting · saving · saved · error
  const [saveErr, setSaveErr] = useState('');
  const pending = useRef(null);
  const timer = useRef(null);
  const seq = useRef(0);
  const [view, setView] = useView(campaign.id);
  const [sheet, setSheet] = useState(null);   // {kind:'adjust'|'why'|'monster', …}
  const [expanded, setExpanded] = useState({});
  const [planned, setPlanned] = useState({});  // ideia → 'busy' | 'ok' | mensagem de erro
  const [monster, setMonster] = useState(null);
  const [planPick, setPlanPick] = useState(null);

  // ---------------------------------------------------------------- servidor
  const load = useCallback(async () => {
    setLoadErr('');
    try {
      const got = withDefaults(await insightsApi.get(campaign.id));
      rememberInsights(campaign.id, got);
      setIns(got);
    } catch (e) {
      setLoadErr(errorMessage(e, lang));
      setIns(cur => cur || withDefaults({}));
    }
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!patch) return;
    pending.current = null;
    const my = ++seq.current;
    setSave('saving');
    try {
      const server = await insightsApi.put(campaign.id, patch);
      if (my === seq.current && !pending.current) { setIns(withDefaults(server)); rememberInsights(campaign.id, server); setSave('saved'); }
    } catch (e) {
      pending.current = joinPatches(patch, pending.current);
      if (my === seq.current) { setSave('error'); setSaveErr(errorMessage(e, lang)); }
    }
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Saiu do Raio-X com algo esperando: envia já.
  useEffect(() => () => { if (pending.current) flush(); }, [flush]);

  const update = useCallback((patch) => {
    if (readOnly) return;
    setIns(cur => { const next = mergeInsights(cur, patch); rememberInsights(campaign.id, next); return next; });
    pending.current = joinPatches(pending.current, patch);
    setSave('waiting');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }, [flush, readOnly, campaign.id]);

  // Vindo do cartão de um jogador: destaque nele (Momentos e Cada personagem)
  const [focusId, setFocusId] = useState(null);
  const focusParam = params?.focus;
  useEffect(() => {
    if (focusParam == null || !ins) return;
    const id = Number(focusParam);
    setFocusId(id);
    setView({ focusChar: id });
    onParamsDone?.();
  }, [focusParam, ins]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- contas
  const touchedAt = useRef(0);   // último toque na tela (pointerdown)

  // Equilíbrio na mesa e "⚠ sem momento": o histórico vem uma vez, quando os Momentos chegam
  // perto da tela (Moments.jsx); chegando logo depois de um toque, espera os 600 ms.
  const [history, setHistory] = useState(null);
  const [histState, setHistState] = useState('idle');   // idle · loading · ok · error
  const loadHistory = useCallback(async () => {
    setHistState('loading');
    try {
      const h = await insightsApi.history(campaign.id);
      const wait = touchedAt.current + 600 - Date.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      setHistory(h);
      setHistState('ok');
    } catch { setHistState('error'); }
  }, [campaign.id]);

  // Ficha nova chegando logo depois de um toque espera 600 ms (nada mexe debaixo do dedo).
  const sheetKey = (campaign.members || []).map(m => `${m.role}:${m.character?.id}:${JSON.stringify(m.character?.data || null)}`).join('|');
  const [members, setMembers] = useState(campaign.members);
  useEffect(() => {
    const wait = touchedAt.current + 600 - Date.now();
    if (wait <= 0) { setMembers(campaign.members); return undefined; }
    const id = setTimeout(() => setMembers(campaign.members), wait);
    return () => clearTimeout(id);
  }, [sheetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const party = useMemo(() => PM.partyMembers(members), [members]);
  const allFacts = useMemo(() => PM.partyFacts(party, lang), [party, lang]);
  const settings = ins || withDefaults({});
  const inIds = PM.includedIds(party, settings.include);
  const inKey = inIds.join(',');
  const facts = useMemo(() => allFacts.filter(f => inIds.includes(f.id)), [allFacts, inKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const monsters = useMemo(() => [...loadCustomMonsters().map(m => ({ ...m, custom: true })), ...BESTIARY], []);
  const calc = useMemo(() => {
    const opts = { w: settings.w, base: settings.base, rep: settings.rep };
    const axes = PM.partyAxes(facts, opts);
    const skills = PM.partySkills(facts, settings.dc);
    const gaps = partyGaps(facts, axes, { lang, dc: settings.dc, focus: settings.focus, hidden: settings.hidden });
    const suggestions = momentSuggestions(facts, { lang, dc: settings.dc, style: settings.style, axisOpts: { w: settings.w, base: settings.base } });
    const threats = threatMonsters(monsters, facts, lang, { limit: 3 });
    return {
      axes, skills, gaps, threats,
      damage: PM.partyDamage(facts),
      schools: PM.partySchools(facts),
      classSchools: PM.classSchools(party.filter(p => inIds.includes(p.id))),
      suggestions,
      quads: quadrants({ facts, party: axes, skills, gaps, lang, focus: settings.focus, hidden: settings.hidden, suggestions, dismissed: settings.dismissed, spotlights: settings.spotlights, threats }),
      ideas: sceneIdeas(gaps, facts, lang),
    };
  }, [facts, settings.w, settings.base, settings.rep, settings.dc, settings.focus, settings.hidden, settings.dismissed, settings.style, settings.spotlights, lang, monsters]); // eslint-disable-line react-hooks/exhaustive-deps
  const session = currentSession(campaign.state);
  const balance = useMemo(() => tableBalance({ facts, spotlights: settings.spotlights, style: settings.style, history, state: campaign.state }),
    [facts, settings.spotlights, settings.style, history, campaign.state]);
  const shownAxes = PM.AXES.filter(k => !settings.hidden.includes(k));

  const toggleIn = (id) => {
    const next = inIds.includes(id) ? inIds.filter(x => x !== id) : [...inIds, id];
    update({ include: next.length === party.length ? null : party.map(p => p.id).filter(x => next.includes(x)) });
  };

  const takeToPlan = async (idea) => {
    setPlanned(p => ({ ...p, [idea.key]: 'busy' }));
    try {
      const plan = await getSessionPlan(campaign.id);
      const scenes = [...(plan?.scenes || [])];
      if (scenes.length >= 30) throw Object.assign(new Error(t(lang, 'O plano já tem 30 cenas.', 'The plan already has 30 scenes.')), { plain: true });
      await saveSessionPlan(campaign.id, { scenes: [...scenes, { text: ideaSceneText(idea, lang) }] });
      setPlanned(p => ({ ...p, [idea.key]: 'ok' }));
    } catch (e) {
      setPlanned(p => ({ ...p, [idea.key]: e?.plain ? e.message : errorMessage(e, lang) }));
    }
  };

  const openPlanCombat = async () => {
    setPlanPick({ busy: true });
    try {
      const plan = await getSessionPlan(campaign.id);
      const text = [plan?.monsters, ...(plan?.scenes || []).map(s => s.text)].filter(Boolean).join('\n');
      const list = planMonsters(monsters, text);
      if (list.length === 1) { setMonster(list[0]); setPlanPick(null); } else setPlanPick({ list });
    } catch (e) { setPlanPick({ error: errorMessage(e, lang) }); }
  };

  // ---------------------------------------------------------------- tela
  const saveLine = readOnly ? t(lang, 'Só leitura', 'Read-only')
    : save === 'saving' || save === 'waiting' ? t(lang, 'Salvando…', 'Saving…')
    : save === 'saved' ? t(lang, 'Salvo ✓', 'Saved ✓')
    : save === 'error' ? t(lang, 'Não salvo', 'Not saved') : '';
  const levels = [...new Set(allFacts.map(f => f.level))].sort((a, b) => a - b);
  const rules = [...new Set(allFacts.map(f => f.rules))].sort();
  const sessionNo = parseInt(campaign.state?.session, 10);
  const metaLine = [
    t(lang, `${facts.length} de ${party.length} personagens`, `${facts.length} of ${party.length} characters`),
    levels.length ? (levels.length === 1 ? t(lang, `nível ${levels[0]}`, `level ${levels[0]}`) : t(lang, `níveis ${levels[0]}–${levels.at(-1)}`, `levels ${levels[0]}–${levels.at(-1)}`)) : null,
    rules.length ? t(lang, `regras ${rules.join(' e ')}`, `${rules.join(' & ')} rules`) : null,
    Number.isFinite(sessionNo) && sessionNo > 0 ? t(lang, `Sessão ${sessionNo}`, `Session ${sessionNo}`) : null,
  ].filter(Boolean).join(' · ');

  if (!ins) return <p className="muted ins-loading" role="status">{t(lang, 'Carregando o Raio-X…', 'Loading the X-ray…')}</p>;

  return (
    <div className="ins" role="tabpanel" onPointerDownCapture={() => { touchedAt.current = Date.now(); }}>
      <section className="mesa-panel has-corners ins-head">
        <MesaTitle as="h2" sub={<span>{t(lang, 'Forças, fraquezas e ideias para cada um brilhar.', 'Strengths, weaknesses and ideas for everyone to shine.')}</span>}
          hint={<HelpButton lang={lang} title={t(lang, 'Raio-X do grupo', 'Party X-ray')} text={[
            t(lang, 'O Raio-X lê as fichas da mesa e mostra o que o grupo faz bem, onde tropeça e quem pode brilhar. Só você vê.', 'The X-ray reads the table’s sheets and shows what the party does well, where it stumbles and who can shine. Only you see it.'),
            t(lang, 'Os números são uma estimativa para preparar a sessão, não uma regra. Em Ajustar você escolhe quanto vale a tabela de classes do Ivan e quanto vale a ficha.', "The numbers are an estimate to prep the session, not a rule. In Adjust you choose how much Ivan's class table weighs against the sheet."),
          ]} />}
          act={<button type="button" className="mesa-btn" onClick={() => setSheet({ kind: 'adjust' })}>⚙ {t(lang, 'Ajustar', 'Adjust')}</button>}>
          {t(lang, 'Raio-X do grupo', 'Party X-ray')}
        </MesaTitle>
        <p className="ins-meta">{metaLine}</p>
        {loadErr && (
          <p className="ins-note is-warn" role="alert">{t(lang, 'Não deu para ler os ajustes salvos', "Couldn't read the saved settings")}: {loadErr}{' '}
            <button type="button" className="mesa-btn is-quiet" onClick={load}>{t(lang, 'Tentar de novo', 'Try again')}</button></p>
        )}
        {save === 'error' && (
          <p className="ins-note is-warn" role="alert">{t(lang, 'Não enviado', 'Not sent')}: {saveErr}{' '}
            <button type="button" className="mesa-btn is-quiet" onClick={flush}>{t(lang, 'Tentar de novo', 'Try again')}</button></p>
        )}
        {party.length > 0 && (
          <div className="ins-who">
            <p className="ins-who-label" id="ins-who-label">{t(lang, 'Quem entra', "Who's in")}
              {saveLine && <span className="ins-save-line" role="status"> · {saveLine}</span>}</p>
            <div className="ins-who-chips" role="group" aria-labelledby="ins-who-label">
              {allFacts.map(f => (
                <button key={f.id} type="button" className="mesa-chip ins-who-chip" aria-pressed={inIds.includes(f.id)} disabled={readOnly}
                  onClick={() => toggleIn(f.id)}>
                  <Dot color={f.color} /><span className="ins-who-name">{PM.firstName(f.name)}</span>
                  <span className="ins-who-class">{classLine(f, lang)}</span>
                </button>
              ))}
            </div>
            {readOnly && <p className="ins-note">{t(lang, 'Campanha encerrada: o Raio-X fica só para ler.', 'Campaign closed: the X-ray is read-only.')}</p>}
          </div>
        )}
      </section>

      {!party.length ? (
        <section className="mesa-panel ins-empty">
          <p>{t(lang, 'Ninguém da mesa tem ficha ainda. Quando os jogadores entrarem com os personagens, o Raio-X aparece aqui.', 'Nobody at the table has a sheet yet. Once players join with their characters, the X-ray shows up here.')}</p>
          <button type="button" className="mesa-btn is-primary mesa-btn-lg" onClick={() => goTo('group', 'players')}>{t(lang, 'Convidar jogadores', 'Invite players')}</button>
        </section>
      ) : !facts.length ? (
        <section className="mesa-panel ins-empty">
          <p>{t(lang, 'Ninguém entra: toque num nome acima para pôr de volta.', "Nobody's in: tap a name above to put them back.")}</p>
          <button type="button" className="mesa-btn is-primary mesa-btn-lg" disabled={readOnly} onClick={() => update({ include: null })}>{t(lang, 'Pôr todos', 'Add everyone')}</button>
        </section>
      ) : (
        <>
          <Quadrants q={calc.quads} lang={lang} expanded={expanded} setExpanded={setExpanded}
            onAllGaps={() => { setExpanded(e => ({ ...e, gaps: true })); document.getElementById('ins-gaps')?.scrollIntoView({ block: 'start' }); }}
            onMoments={() => document.getElementById('ins-moments')?.scrollIntoView({ block: 'start' })} />
          <Ideas ideas={calc.ideas} lang={lang} planned={planned} onTake={takeToPlan} onOpenPlan={() => goTo('prepare', 'next')} readOnly={readOnly} />
          <Roles calc={calc} facts={facts} axes={shownAxes} settings={settings} lang={lang} wide={wide} onWhy={(k) => setSheet({ kind: 'why', why: { kind: 'axis', key: k } })} />
          <Skills calc={calc} settings={settings} lang={lang} wide={wide} view={view} setView={setView} onWhy={(k) => setSheet({ kind: 'why', why: { kind: 'skill', key: k } })} />
          <Damage calc={calc} lang={lang} onWhy={(k) => setSheet({ kind: 'why', why: { kind: 'damage', key: k } })} />
          <Gaps gaps={calc.gaps} facts={facts} lang={lang} expanded={!!expanded.gaps} setExpanded={(v) => setExpanded(e => ({ ...e, gaps: v }))}
            planned={planned} onTake={takeToPlan} onOpenPlan={() => goTo('prepare', 'next')} readOnly={readOnly} />
          <Fold id="schools" title={t(lang, 'Escolas de magia', 'Schools of magic')} view={view} setView={setView} wide={wide}>
            <Schools calc={calc} facts={facts} lang={lang} wide={wide} view={view} setView={setView} />
          </Fold>
          <Fold id="chars" title={t(lang, 'Cada personagem', 'Each character')} view={view} setView={setView} wide={wide}>
            <Characters facts={facts} lang={lang} wide={wide} view={view} setView={setView} />
          </Fold>
          <Fold id="table" title={t(lang, 'Tabela', 'Table')} view={view} setView={setView} wide={wide}>
            <Table facts={facts} lang={lang} wide={wide} sessionNo={sessionNo} />
          </Fold>
          <Moments facts={facts} settings={settings} update={update} suggestions={calc.suggestions} session={session} balance={balance}
            lang={lang} readOnly={readOnly} focusId={focusId} filter={view.moments || 'session'} setFilter={(v) => setView({ moments: v })}
            campaignId={campaign.id} onOpenPlan={() => goTo('prepare', 'next')} historyState={histState} onNear={loadHistory} />
          <Balance balance={balance} history={history} state={histState} onLoad={loadHistory} lang={lang} />
          <Versus facts={facts} lang={lang} monster={monster} setMonster={setMonster} planPick={planPick} setPlanPick={setPlanPick}
            onPick={() => setSheet({ kind: 'monster' })} onPlan={openPlanCombat} />
        </>
      )}

      {sheet?.kind === 'adjust' && <AdjustSheet settings={settings} update={update} lang={lang} readOnly={readOnly} saveLine={saveLine} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'why' && <WhySheet why={sheet.why} facts={facts} calc={calc} settings={settings} lang={lang} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'monster' && <MonsterSheet monsters={monsters} lang={lang} onClose={() => setSheet(null)}
        onPick={(m) => { setMonster(m); setPlanPick(null); setSheet(null); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- G0: 4 quadros
const QUADS = [
  { id: 'strengths', title: ['Forças', 'Strengths'], help: ['o que o grupo faz bem', 'what the party does well'] },
  { id: 'weaknesses', title: ['Fraquezas', 'Weaknesses'], help: ['onde tropeça', 'where it stumbles'] },
  { id: 'opportunities', title: ['Oportunidades', 'Opportunities'], help: ['momentos prontos para alguém brilhar', 'moments ready for someone to shine'] },
  { id: 'threats', title: ['Ameaças', 'Threats'], help: ['o que pode derrubar o grupo', 'what could take the party down'] },
];

function Quadrants({ q, lang, expanded, setExpanded, onAllGaps, onMoments }) {
  return (
    <section className="ins-quads" aria-label={t(lang, 'O que isso quer dizer', 'What this means')}>
      {QUADS.map(d => {
        const items = q[d.id] || [];
        const open = !!expanded[d.id];
        const shown = open ? items : items.slice(0, 2);
        return (
          <article key={d.id} className={`mesa-panel ins-quad is-${d.id}`}>
            <h3 className="mesa-eyebrow">{PM.t(lang, ...d.title)}</h3>
            <p className="ins-quad-help">{PM.t(lang, ...d.help)}</p>
            {items.length ? (
              <ul className="ins-quad-list">{shown.map(x => <li key={x.key}>{x.text}</li>)}</ul>
            ) : <p className="ins-quad-none">{t(lang, 'Nada por aqui.', 'Nothing here.')}</p>}
            {items.length > 2 && (d.id === 'weaknesses'
              ? <button type="button" className="mesa-btn is-quiet ins-more" onClick={onAllGaps}>{t(lang, `Ver todas (${items.length})`, `See all (${items.length})`)}</button>
              : d.id === 'opportunities'
              ? <button type="button" className="mesa-btn is-quiet ins-more" onClick={onMoments}>{t(lang, `Ver os momentos (${items.length})`, `See the moments (${items.length})`)}</button>
              : <button type="button" className="mesa-btn is-quiet ins-more" aria-expanded={open} onClick={() => setExpanded(e => ({ ...e, [d.id]: !open }))}>
                {open ? t(lang, 'Menos', 'Less') : `+${items.length - 2}`}</button>)}
          </article>
        );
      })}
    </section>
  );
}

// Botão que acabou de mudar de sentido ignora toques por 400 ms (princípio 8): sem isso, o
// 2º toque de um toque duplo em "＋ Levar para o plano" cai em "Abrir o plano ›", que
// aparece no mesmo lugar assim que o PUT volta, e tira o mestre do Raio-X.
const SETTLE_MS = 400;

function PlanButton({ idea, planned, onTake, onOpenPlan, readOnly, lang, label }) {
  const st = planned[idea.key];
  const okAt = useRef(0);
  const was = useRef(st);
  // antes da pintura: nenhum toque chega entre o botão novo aparecer e a trava valer
  useLayoutEffect(() => {
    if (st === 'ok' && was.current !== 'ok') okAt.current = Date.now();
    was.current = st;
  }, [st]);
  if (st === 'ok') {
    const open = () => { if (Date.now() - okAt.current >= SETTLE_MS) onOpenPlan(); };
    return (
      <span className="ins-plan-ok" role="status">✓ {t(lang, 'No plano', 'In the plan')}{' '}
        <button type="button" className="mesa-btn is-quiet" onClick={open}>{t(lang, 'Abrir o plano ›', 'Open the plan ›')}</button></span>
    );
  }
  return (
    <>
      <button type="button" className="mesa-btn" disabled={readOnly || st === 'busy'} onClick={() => onTake(idea)}>
        {st === 'busy' ? '…' : label || t(lang, '＋ Levar para o plano', '＋ Take to the plan')}
      </button>
      {st && st !== 'busy' && <span className="ins-note is-warn" role="alert">{t(lang, 'Não enviado', 'Not sent')}: {st}</span>}
    </>
  );
}

function Ideas({ ideas, lang, planned, onTake, onOpenPlan, readOnly }) {
  if (!ideas.length) return null;
  return (
    <section className="mesa-panel ins-block ins-ideas">
      <MesaTitle>{t(lang, `${ideas.length} ideias de cena`, `${ideas.length} scene ideas`)}</MesaTitle>
      <ul className="ins-idea-list">
        {ideas.map(i => (
          <li key={i.key} className="ins-idea">
            <p className="ins-idea-text">{i.text}</p>
            <div className="ins-idea-act"><PlanButton idea={i} planned={planned} onTake={onTake} onOpenPlan={onOpenPlan} readOnly={readOnly} lang={lang} /></div>
          </li>
        ))}
      </ul>
      {readOnly && <p className="ins-note">{t(lang, 'Campanha encerrada: o plano não aceita cenas novas.', 'Campaign closed: the plan takes no new scenes.')}</p>}
    </section>
  );
}

// ---------------------------------------------------------------- G1: papel do grupo
function Roles({ calc, facts, axes, settings, lang, wide, onWhy }) {
  const a = calc.axes.axes;
  const top2 = settings.rep === 'top2';
  const legend = (
    <p className="ins-legend">
      <span><span className="ins-mk is-avg" aria-hidden="true" /> {t(lang, 'média', 'average')}</span>
      <span><span className="ins-mk is-best" aria-hidden="true" /> {top2 ? t(lang, '2 melhores', 'top 2') : t(lang, 'melhor', 'best')}</span>
      <span><span className="ins-mk is-ref" aria-hidden="true" /> {t(lang, 'normal do nível (3)', 'level standard (3)')}</span>
    </p>
  );
  const bestText = (k) => (top2
    ? `${PM.fmt(a[k].shown, lang)} ${t(lang, '2 melhores', 'top 2')}`
    : `${PM.fmt(a[k].best, lang)} ${a[k].bestWho.map(PM.firstName).join(', ')}`);
  if (!axes.length) {
    return (
      <section className="mesa-panel ins-block">
        <MesaTitle>{t(lang, 'Papel do grupo', 'Party roles')}</MesaTitle>
        <p className="ins-adj-help">{t(lang, 'Todos os eixos estão escondidos (Ajustar › Eixos).', 'All axes are hidden (Adjust › Axes).')}</p>
      </section>
    );
  }
  return (
    <section className="mesa-panel ins-block ins-roles">
      <MesaTitle sub={t(lang, 'de 1 a 5 · toque num eixo para ver o porquê', '1 to 5 · tap an axis to see why')}
        hint={<HelpButton lang={lang} title={t(lang, 'Papel do grupo', 'Party roles')} text={[
          t(lang, 'Cada eixo vai de 1 a 5, e 3 é o normal para o nível do grupo. A bolinha azul é a média de quem entra; o losango laranja, o melhor (ou a média dos 2 melhores, em Ajustar).', "Each axis goes from 1 to 5, and 3 is standard for the party's level. The blue dot is the average of who's in; the orange diamond, the best (or the average of the top 2, in Adjust)."),
          t(lang, 'A nota junta a tabela de classes do Ivan com o que a ficha mostra. Toque num eixo para ver de onde vem o número de cada um.', "The score blends Ivan's class table with what the sheet shows. Tap an axis to see where each one's number comes from."),
        ]} />}>{t(lang, 'Papel do grupo', 'Party roles')}</MesaTitle>
      {legend}
      <div className="ins-roles-body">
        {wide && (
          <Radar size={340} pad={62} min={1} max={5} rings={[1, 2, 3, 4, 5]} mark={3}
            axes={axes.map(k => ({ key: k, label: PM.axisLabel(k, lang) }))}
            series={[
              { key: 'avg', values: axes.map(k => a[k].avg), color: PM.AVG_COLOR, fill: 0.25 },
              { key: 'best', values: axes.map(k => a[k].shown), color: PM.BEST_COLOR, fill: 0 },
            ]}
            label={t(lang, `Radar do papel do grupo: média e ${top2 ? '2 melhores' : 'melhor'} em ${axes.length} eixos`, `Party roles radar: average and ${top2 ? 'top 2' : 'best'} on ${axes.length} axes`)} />
        )}
        <ul className="ins-axis-rows">
          {axes.map(k => {
            const imp = settings.focus?.[k] === 2;
            return (
              <li key={k}>
                <button type="button" className="ins-axis-btn" onClick={() => onWhy(k)}
                  aria-label={t(lang, `${PM.axisLabel(k, lang)}: média ${PM.fmt(a[k].avg, lang)}, ${top2 ? '2 melhores' : 'melhor'} ${bestText(k)}. Ver o porquê`, `${PM.axisLabel(k, lang)}: average ${PM.fmt(a[k].avg, lang)}, ${top2 ? 'top 2' : 'best'} ${bestText(k)}. See why`)}>
                  <span className="ins-axis-name">{PM.axisLabel(k, lang)}{imp && <span className="ins-imp"> · {t(lang, 'importante', 'important')}</span>}</span>
                  <span className="ins-track" aria-hidden="true">
                    <span className="ins-track-ref" style={{ left: pos(3, 1, 5) }} />
                    <span className="ins-mk is-avg" style={{ left: pos(a[k].avg, 1, 5) }} />
                    <span className="ins-mk is-best" style={{ left: pos(a[k].shown, 1, 5) }} />
                  </span>
                  <span className="ins-axis-nums" aria-hidden="true">{PM.fmt(a[k].avg, lang)} · {bestText(k)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {facts.length === 1 && <p className="ins-adj-help">{t(lang, 'Com 1 personagem, a média e o melhor são o mesmo.', 'With 1 character, average and best are the same.')}</p>}
    </section>
  );
}

// ---------------------------------------------------------------- G2: perícias
function Skills({ calc, settings, lang, wide, view, setView, onWhy }) {
  const gapSkills = new Set(calc.gaps.filter(g => g.kind === 'skill').map(g => g.key));
  const ordered = calc.skills.slice().sort(view.skillsOrder === 'ability'
    ? (x, y) => PM.ABILS.indexOf(x.ability) - PM.ABILS.indexOf(y.ability) || PM.skillLabel(x.skill, lang).localeCompare(PM.skillLabel(y.skill, lang))
    : (x, y) => x.passive - y.passive || x.chanceGroup - y.chanceGroup);
  const radarOrder = calc.skills.slice().sort((x, y) => PM.ABILS.indexOf(x.ability) - PM.ABILS.indexOf(y.ability));
  return (
    <section className="mesa-panel ins-block ins-skills">
      <MesaTitle sub={t(lang, `passiva do melhor, de 0 a 20 · CD ${settings.dc}`, `best passive, 0 to 20 · DC ${settings.dc}`)}
        hint={<HelpButton lang={lang} title={t(lang, 'Perícias do grupo', 'Party skills')} text={[
          t(lang, 'A barra é a passiva do melhor do grupo em cada perícia (10 + o bônus), de 0 a 20. As fracas, com ⚠, são lacunas.', "The bar is the party's best passive in each skill (10 + the bonus), 0 to 20. Weak ones, marked ⚠, are gaps."),
          t(lang, `A porcentagem é a chance do melhor passar na CD ${settings.dc}; "grupo" é a chance de pelo menos 1 passar se todos tentarem. Toque numa perícia para ver cada um.`, `The percentage is the best one's chance at DC ${settings.dc}; "party" is the chance at least 1 passes if everyone tries. Tap a skill to see everyone.`),
        ]} />}
        act={(
          <span className="ins-pair is-small" role="group" aria-label={t(lang, 'Ordem', 'Order')}>
            <button type="button" className="mesa-chip" aria-pressed={view.skillsOrder !== 'ability'} onClick={() => setView({ skillsOrder: 'weak' })}>{t(lang, 'Fracas primeiro', 'Weakest first')}</button>
            <button type="button" className="mesa-chip" aria-pressed={view.skillsOrder === 'ability'} onClick={() => setView({ skillsOrder: 'ability' })}>{t(lang, 'Por atributo', 'By ability')}</button>
          </span>
        )}>{t(lang, 'Perícias do grupo', 'Party skills')}</MesaTitle>
      <div className="ins-skills-body">
        {wide && (
          <Radar size={340} pad={44} min={0} max={20} rings={[5, 10, 15, 20]} mark={settings.dc} labelSize={12}
            axes={radarOrder.map(s => ({ key: s.skill, label: shortSkill(s.skill, lang), title: PM.skillLabel(s.skill, lang) }))}
            series={[{ key: 'best', values: radarOrder.map(s => s.passive), color: 'var(--ins-series)', fill: 0.18 }]}
            label={t(lang, 'Radar das 18 perícias: passiva do melhor do grupo, de 0 a 20', 'Radar of the 18 skills: best passive in the party, 0 to 20')} />
        )}
        <ul className="ins-bars">
          {ordered.map(s => {
            const weak = gapSkills.has(s.skill);
            return (
              <li key={s.skill}>
                <button type="button" className={`ins-bar-row ${weak ? 'is-weak' : ''}`} onClick={() => onWhy(s.skill)}>
                  <span className="ins-bar-name">{PM.skillLabel(s.skill, lang)}{weak && <span className="ins-warn"> ⚠ {t(lang, 'fraca', 'weak')}</span>}</span>
                  <span className="ins-bar" aria-hidden="true">
                    <span className="ins-bar-fill" style={{ width: pos(s.passive, 0, 20) }} />
                    {[10, 15].map(v => <span key={v} className="ins-bar-tick" style={{ left: pos(v, 0, 20) }} />)}
                  </span>
                  <span className="ins-bar-nums">
                    <strong>{s.passive}</strong> · {s.who.map(PM.firstName).join(', ')} · {t(lang, `${s.chanceBest}% na CD ${settings.dc} · grupo ${s.chanceGroup}%`, `${s.chanceBest}% at DC ${settings.dc} · party ${s.chanceGroup}%`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="ins-adj-help">{t(lang, '"grupo" = a chance de pelo menos 1 passar se todos tentarem. As marcas na barra ficam em 10, 15 e 20.', '"party" = the chance at least 1 passes if everyone tries. The bar marks sit at 10, 15 and 20.')}</p>
    </section>
  );
}

const SHORT_SKILL = {
  acrobatics: ['Acrob.', 'Acro.'], animalHandling: ['Animais', 'Animal'], arcana: ['Arcan.', 'Arcana'], athletics: ['Atlet.', 'Athl.'],
  deception: ['Blefar', 'Decep.'], history: ['Hist.', 'Hist.'], insight: ['Intuição', 'Insight'], intimidation: ['Intim.', 'Intim.'],
  investigation: ['Invest.', 'Invest.'], medicine: ['Medic.', 'Med.'], nature: ['Natur.', 'Nature'], perception: ['Perc.', 'Perc.'],
  performance: ['Atuação', 'Perf.'], persuasion: ['Persu.', 'Pers.'], religion: ['Relig.', 'Relig.'], sleightOfHand: ['Prest.', 'Sleight'],
  stealth: ['Furtiv.', 'Stealth'], survival: ['Sobrev.', 'Surv.'],
};
const shortSkill = (k, lang) => SHORT_SKILL[k]?.[lang === 'en' ? 1 : 0] || PM.skillLabel(k, lang);

// ---------------------------------------------------------------- G3: dano
function Damage({ calc, lang, onWhy }) {
  return (
    <section className="mesa-panel ins-block">
      <MesaTitle sub={t(lang, 'quem causa cada tipo, e por onde', 'who deals each type, and how')}>{t(lang, 'Dano que o grupo causa', 'Damage the party deals')}</MesaTitle>
      <ul className="ins-dmg-grid">
        {PM.DAMAGE_TYPES.map(k => {
          const who = calc.damage[k];
          return (
            <li key={k}>
              <button type="button" className={`ins-dmg ${who.length ? '' : 'is-none'}`} onClick={() => onWhy(k)}>
                <span className="ins-dmg-type">{PM.damageLabel(k, lang)}</span>
                {who.length ? (
                  <span className="ins-dmg-who">
                    {who.map(x => <span key={x.id} className="ins-dmg-line">{PM.firstName(x.name)} · {x.via.slice(0, 2).join(', ')}{x.via.length > 2 ? '…' : ''}</span>)}
                  </span>
                ) : <span className="ins-dmg-who is-none">{t(lang, 'ninguém', 'nobody')}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- G7: lacunas
function Gaps({ gaps, facts, lang, expanded, setExpanded, planned, onTake, onOpenPlan, readOnly }) {
  const groups = gapGroups(gaps, lang);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  let left = expanded ? Infinity : 3;
  return (
    <section className="mesa-panel ins-block ins-gaps" id="ins-gaps">
      <MesaTitle sub={t(lang, 'o que falta no grupo, das mais sérias para as menos', 'what the party lacks, most serious first')}>{t(lang, 'Lacunas', 'Gaps')}</MesaTitle>
      {!total && <p className="ins-adj-help">{t(lang, 'Nenhuma lacuna: o grupo cobre tudo o que o Raio-X mede.', 'No gaps: the party covers everything the X-ray measures.')}</p>}
      {groups.map(g => {
        const items = g.items.slice(0, Math.max(0, left));
        left -= items.length;
        if (!items.length) return null;
        return (
          <div key={g.id} className="ins-gap-group">
            <h4 className="ins-gap-label">{g.label}</h4>
            <ul className="ins-gap-list">
              {items.map(x => {
                const idea = sceneIdeas([x], facts, lang, 1)[0];
                return (
                  <li key={`${x.kind}:${x.key}`} className="ins-gap">
                    <p className="ins-gap-text">{x.important && <span className="ins-imp">★ </span>}{x.text}</p>
                    {idea && <div className="ins-idea-act"><PlanButton idea={idea} planned={planned} onTake={onTake} onOpenPlan={onOpenPlan} readOnly={readOnly} lang={lang} label={t(lang, 'Usar numa cena', 'Use in a scene')} /></div>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {total > 3 && (
        <button type="button" className="mesa-btn ins-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? t(lang, 'Ver só as 3 primeiras', 'Show only the first 3') : t(lang, `Ver todas (${total})`, `See all (${total})`)}
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- seções recolhíveis
function Fold({ id, title, view, setView, wide, children }) {
  const open = view.open?.[id] ?? wide;
  return (
    <section className="mesa-panel ins-block ins-fold">
      <button type="button" className="ins-fold-head" aria-expanded={open} onClick={() => setView({ open: { ...view.open, [id]: !open } })}>
        <span className="mesa-gem" aria-hidden="true" />
        <span className="ins-fold-title mesa-foil">{title}</span>
        <span className="ins-fold-ico" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="ins-fold-body">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------- G4: escolas
const SCHOOL_SHORT = { abjuration: ['Abj', 'Abj'], conjuration: ['Conj', 'Conj'], divination: ['Adiv', 'Div'], enchantment: ['Enc', 'Ench'], evocation: ['Evoc', 'Evoc'], illusion: ['Ilus', 'Illu'], necromancy: ['Necr', 'Necr'], transmutation: ['Trans', 'Trans'] };

function Schools({ calc, facts, lang, wide, view, setView }) {
  const mode = view.schools === 'list' ? 'list' : 'have';
  const data = mode === 'list' ? calc.classSchools : calc.schools;
  const color = (id) => facts.find(f => f.id === id)?.color;
  const max = Math.max(1, ...PM.SCHOOLS.flatMap(s => data[s].map(x => x.n)));
  const casters = facts.filter(f => PM.SCHOOLS.some(s => data[s].some(x => x.id === f.id)));
  return (
    <>
      <div className="ins-pair is-small" role="group" aria-label={t(lang, 'Contar', 'Count')}>
        <button type="button" className="mesa-chip" aria-pressed={mode === 'have'} onClick={() => setView({ schools: 'have' })}>{t(lang, 'Magias que têm', 'Spells they have')}</button>
        <button type="button" className="mesa-chip" aria-pressed={mode === 'list'} onClick={() => setView({ schools: 'list' })}>{t(lang, 'Lista da classe', 'Class list')}</button>
      </div>
      <p className="ins-adj-help">{mode === 'list'
        ? t(lang, 'Quantas magias de cada escola a lista da classe de cada um tem (a referência do Ivan).', "How many spells of each school each one's class list has (Ivan's reference).")
        : t(lang, 'Quantas magias de cada escola cada um conhece hoje.', 'How many spells of each school each one knows today.')}</p>
      <ul className="ins-school-grid">
        {PM.SCHOOLS.map(s => (
          <li key={s} className={`ins-school ${data[s].length ? '' : 'is-none'}`}>
            <span className="ins-school-name">{PM.schoolLabel(s, lang)}</span>
            {data[s].length ? data[s].map(x => (
              <span key={x.id} className="ins-school-row">
                <span>{PM.firstName(x.name)} {x.n}</span>
                <span className="ins-mini-bar" aria-hidden="true"><span style={{ width: pos(x.n, 0, max), background: color(x.id) }} /></span>
              </span>
            )) : <span className="ins-school-row is-none">{t(lang, 'ninguém', 'nobody')}</span>}
          </li>
        ))}
      </ul>
      {wide && casters.length > 0 && (
        <div className="ins-multiples">
          {casters.map(f => (
            <figure key={f.id} className="ins-multiple">
              <Radar size={170} min={0} max={max} rings={[max / 2, max]} labelSize={12}
                axes={PM.SCHOOLS.map(s => ({ key: s, label: SCHOOL_SHORT[s][lang === 'en' ? 1 : 0], title: PM.schoolLabel(s, lang) }))}
                series={[{ key: f.id, values: PM.SCHOOLS.map(s => data[s].find(x => x.id === f.id)?.n || 0), color: f.color, fill: 0.18 }]}
                label={t(lang, `Escolas de ${f.name}`, `${f.name}'s schools`)} />
              <figcaption><span className="ins-mult-name"><Dot color={f.color} /> {PM.firstName(f.name)}</span></figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- G5: cada personagem
const CHAR_MODES = {
  abil: { label: ['Atributos', 'Abilities'], min: 0, max: 20, rings: [5, 10, 15, 20], mark: 10 },
  save: { label: ['Salvaguardas', 'Saving throws'], min: -5, max: 15, rings: [0, 5, 10, 15], mark: 0 },
  skill: { label: ['Perícias', 'Skills'], min: -5, max: 15, rings: [0, 5, 10, 15], mark: 0 },
};

function charValues(f, mode) {
  if (mode === 'abil') return PM.ABILS.map(a => f.scores[a]);
  if (mode === 'save') return PM.ABILS.map(a => f.saves[a]);
  return PM.SKILLS.map(k => f.skills[k]);
}

function Characters({ facts, lang, wide, view, setView }) {
  const mode = CHAR_MODES[view.chars] ? view.chars : 'abil';
  const cfg = CHAR_MODES[mode];
  const focus = facts.some(f => f.id === view.focusChar) ? view.focusChar : facts[0]?.id;
  const overlay = (view.overlay || []).filter(id => facts.some(f => f.id === id)).slice(0, 3);
  const axes = mode === 'skill'
    ? PM.SKILLS.map(k => ({ key: k, label: '', title: PM.skillLabel(k, lang) }))
    : PM.ABILS.map(a => ({ key: a, label: PM.abilShort(a, lang) }));
  const written = (f) => (mode === 'skill'
    ? (() => {
      const s = PM.SKILLS.slice().sort((a, b) => f.skills[b] - f.skills[a]);
      return t(lang, `melhores: ${s.slice(0, 3).map(k => `${PM.skillLabel(k, lang)} ${PM.fmtMod(f.skills[k])}`).join(', ')} · piores: ${s.slice(-2).map(k => `${PM.skillLabel(k, lang)} ${PM.fmtMod(f.skills[k])}`).join(', ')}`,
        `best: ${s.slice(0, 3).map(k => `${PM.skillLabel(k, lang)} ${PM.fmtMod(f.skills[k])}`).join(', ')} · worst: ${s.slice(-2).map(k => `${PM.skillLabel(k, lang)} ${PM.fmtMod(f.skills[k])}`).join(', ')}`);
    })()
    : PM.ABILS.map(a => `${PM.abilShort(a, lang)}\u00a0${mode === 'abil' ? f.scores[a] : PM.fmtMod(f.saves[a])}`).join(' · '));
  const toggleOverlay = (id) => setView({ overlay: overlay.includes(id) ? overlay.filter(x => x !== id) : [...overlay, id].slice(-3) });
  return (
    <>
      <div className="ins-pair is-small" role="group" aria-label={t(lang, 'Mostrar', 'Show')}>
        {Object.entries(CHAR_MODES).map(([k, c]) => (
          <button key={k} type="button" className="mesa-chip" aria-pressed={mode === k} onClick={() => setView({ chars: k })}>{PM.t(lang, ...c.label)}</button>
        ))}
      </div>
      <div className="ins-pair is-small" role="group" aria-label={t(lang, 'Destaque', 'Highlight')}>
        {facts.map(f => (
          <button key={f.id} type="button" className="mesa-chip" aria-pressed={focus === f.id} onClick={() => setView({ focusChar: f.id })}>
            <Dot color={f.color} /> {PM.firstName(f.name)}
          </button>
        ))}
      </div>
      <p className="ins-adj-help">{mode === 'abil' ? t(lang, 'Atributos com a espécie, de 0 a 20.', 'Abilities with species, 0 to 20.')
        : t(lang, 'Bônus de −5 a +15; o anel marcado é o 0.', 'Bonus from −5 to +15; the marked ring is 0.')}{' '}
        {t(lang, 'O destaque fica em cor; os outros, em cinza.', 'The highlight is in color; the others are gray.')}</p>
      <div className="ins-multiples">
        {facts.map(f => (
          <figure key={f.id} className={`ins-multiple ${focus === f.id ? 'is-focus' : ''}`}>
            {/* viewBox de 140 no celular: a 360 a coluna da grade 2×2 tem 138 px e o rótulo de
                13 fica com 12,8 px (com 160, encolhia para 11,2) */}
            <Radar size={wide ? 190 : 140} min={cfg.min} max={cfg.max} rings={cfg.rings} mark={cfg.mark} labels={mode !== 'skill'} labelSize={13}
              axes={axes} series={[{ key: f.id, values: charValues(f, mode), color: focus === f.id ? f.color : 'var(--ins-gray)', fill: focus === f.id ? 0.18 : 0.06, dots: focus === f.id }]}
              label={`${f.name}: ${written(f)}`} />
            <figcaption>
              <span className="ins-mult-name"><Dot color={f.color} /> {PM.firstName(f.name)}</span>
              <span className="ins-mult-vals">{written(f)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {wide && (
        <div className="ins-overlay">
          <p className="ins-adj-help">{t(lang, 'Sobrepor (até 3):', 'Overlay (up to 3):')}</p>
          <div className="ins-pair is-small" role="group" aria-label={t(lang, 'Sobrepor', 'Overlay')}>
            {facts.map(f => (
              <button key={f.id} type="button" className="mesa-chip" aria-pressed={overlay.includes(f.id)} onClick={() => toggleOverlay(f.id)}>
                <Dot color={f.color} /> {PM.firstName(f.name)}
              </button>
            ))}
          </div>
          {overlay.length > 0 && (
            <Radar size={300} min={cfg.min} max={cfg.max} rings={cfg.rings} mark={cfg.mark} labels={mode !== 'skill'}
              axes={axes} series={overlay.map(id => { const f = facts.find(x => x.id === id); return { key: id, values: charValues(f, mode), color: f.color, fill: 0.08 }; })}
              label={t(lang, `Sobrepostos: ${overlay.map(id => facts.find(x => x.id === id)?.name).join(', ')}`, `Overlaid: ${overlay.map(id => facts.find(x => x.id === id)?.name).join(', ')}`)} />
          )}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- G6: tabela
function tableRows(lang) {
  const row = (label, get) => ({ label, get });
  return [
    row(t(lang, 'Jogador', 'Player'), f => f.player || '—'),
    row(t(lang, 'Classe', 'Class'), f => f.classes.map(e => `${tName('class', e.id, lang)} ${e.level}`).join(' / ')),
    row(t(lang, 'Atributos mais altos', 'Top abilities'), f => PM.ABILS.slice().sort((a, b) => f.scores[b] - f.scores[a]).slice(0, 2).map(a => PM.abilShort(a, lang)).join(', ')),
    row(t(lang, 'Nível', 'Level'), f => f.level),
    row(t(lang, 'PV máx.', 'Max HP'), f => f.maxHp),
    row(t(lang, 'CA', 'AC'), f => (f.acMage !== f.ac ? t(lang, `${f.ac} (${f.acMage} com Armadura Arcana)`, `${f.ac} (${f.acMage} with Mage Armor)`) : f.ac)),
    row(t(lang, 'Proficiência', 'Proficiency'), f => PM.fmtMod(f.prof)),
    ...PM.ABILS.map(a => row(t(lang, `${PM.abilShort(a, lang)} (mod.)`, `${PM.abilShort(a, lang)} (mod)`), f => `${f.scores[a]} (${PM.fmtMod(f.mods[a])})`)),
    ...PM.ABILS.map(a => row(t(lang, `Salv. ${PM.abilShort(a, lang)}`, `${PM.abilShort(a, lang)} save`), f => PM.fmtMod(f.saves[a]))),
    row(t(lang, 'Percepção passiva', 'Passive Perception'), f => f.passive.perception),
    row(t(lang, 'Dano por rodada', 'Damage per round'), f => PM.fmt(f.dpr, lang)),
    row(t(lang, 'Cura por dia', 'Healing per day'), f => PM.fmt(f.healDay, lang)),
    ...PM.SKILLS.map(k => row(PM.skillLabel(k, lang), f => PM.fmtMod(f.skills[k]))),
  ];
}

function Table({ facts, lang, wide, sessionNo }) {
  const rows = tableRows(lang);
  if (wide) {
    return (
      <div className="ins-table-wrap mesa-scroll" tabIndex={0} role="region" aria-label={t(lang, 'Tabela do grupo', 'Party table')}>
        <table className="ins-table">
          <caption className="grp-sr-only">{t(lang, 'Tabela do grupo, um personagem por coluna', 'Party table, one character per column')}</caption>
          <thead>
            <tr>
              <th scope="col">{Number.isFinite(sessionNo) && sessionNo > 0 ? t(lang, `Sessão ${sessionNo}`, `Session ${sessionNo}`) : t(lang, 'Personagem', 'Character')}</th>
              {facts.map(f => <th key={f.id} scope="col"><Dot color={f.color} /> {f.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label}><th scope="row">{r.label}</th>{facts.map(f => <td key={f.id}>{r.get(f)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="ins-cards">
      {facts.map(f => (
        <details key={f.id} className="ins-card">
          <summary><Dot color={f.color} /> <strong>{f.name}</strong> <span className="ins-card-sub">{classLine(f, lang)} {f.level}</span></summary>
          <dl className="ins-card-dl">
            {rows.map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.get(f)}</dd></div>)}
          </dl>
        </details>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- G10: contra quem?
function Versus({ facts, lang, monster, setMonster, planPick, setPlanPick, onPick, onPlan }) {
  const v = monster ? versus(monster, facts, lang) : null;
  const factor = (k) => (k === 0 ? t(lang, 'imune', 'immune') : k === 0.5 ? t(lang, 'resiste (½)', 'resists (½)') : k === 2 ? t(lang, 'vulnerável (×2)', 'vulnerable (×2)') : t(lang, 'normal', 'normal'));
  return (
    <section className="mesa-panel ins-block ins-versus">
      <MesaTitle sub={t(lang, 'o monstro contra o dano e as salvaguardas do grupo', 'the monster against the party’s damage and saves')}>{t(lang, 'Contra quem?', 'Against whom?')}</MesaTitle>
      <div className="mesa-actions is-start">
        <button type="button" className="mesa-btn" onClick={onPick}>🐉 {t(lang, 'Escolher monstro…', 'Pick a monster…')}</button>
        <button type="button" className="mesa-btn" disabled={planPick?.busy} onClick={onPlan}>{planPick?.busy ? '…' : t(lang, 'Um combate do plano', 'A combat from the plan')}</button>
      </div>
      {planPick?.error && <p className="ins-note is-warn" role="alert">{planPick.error}</p>}
      {planPick?.list && (planPick.list.length ? (
        <div className="ins-plan-pick">
          <p className="ins-adj-help">{t(lang, 'Monstros citados no plano da sessão:', 'Monsters named in the session plan:')}</p>
          <div className="ins-pair is-small">
            {planPick.list.map(m => <button key={m.id} type="button" className="mesa-chip" onClick={() => { setMonster(m); setPlanPick(null); }}>{typeof m.name === 'string' ? m.name : m.name?.[lang] || m.name?.pt}</button>)}
          </div>
        </div>
      ) : <p className="ins-adj-help">{t(lang, 'O plano da sessão ainda não cita nenhum monstro do bestiário. Escreva os monstros no plano ou escolha um aqui.', "The session plan doesn't name any bestiary monster yet. Write the monsters in the plan or pick one here.")}</p>)}
      {v && (
        <article className="ins-vs">
          <header className="ins-vs-head">
            <strong>{v.name}</strong> <span className="muted">{t(lang, `ND ${v.cr}`, `CR ${v.cr}`)}</span>
            <button type="button" className="mesa-icon-btn" aria-label={t(lang, 'Tirar o monstro', 'Remove the monster')} onClick={() => setMonster(null)}>✕</button>
          </header>
          <p className={`ins-vs-line ${v.line ? '' : 'is-calm'}`}>{v.line ? `× ${t(lang, 'grupo', 'party')}: ${v.line}` : t(lang, 'Nada que preocupe: o dano principal de todos pega e as salvaguardas que ele cobra passam fácil.', "Nothing to worry about: everyone's main damage lands and the saves it calls for are easy.")}</p>
          <ul className="ins-vs-rows">
            {v.rows.map(r => {
              const f = facts.find(x => x.id === r.id);
              return (
                <li key={r.id}>
                  <Dot color={f?.color} /> <strong>{PM.firstName(r.name)}</strong>{' · '}
                  {r.main ? <>{PM.damageLabel(r.main.type, lang)} ({r.main.via}): {factor(r.k)}{r.alt ? ` · ${t(lang, 'melhor contra ele', 'best against it')}: ${PM.damageLabel(r.alt.type, lang)}` : ''}</> : t(lang, 'sem dano medido', 'no damage measured')}
                </li>
              );
            })}
          </ul>
          {v.saves.length > 0 && (
            <ul className="ins-vs-rows">
              {v.saves.map(s => (
                <li key={`${s.ab}${s.dc}`}><strong>{t(lang, `${PM.abilShort(s.ab, lang)} CD ${s.dc}`, `${PM.abilShort(s.ab, lang)} DC ${s.dc}`)}</strong>: {s.chances.map(c => `${PM.firstName(c.name)} ${c.p}%`).join(' · ')}</li>
              ))}
            </ul>
          )}
        </article>
      )}
    </section>
  );
}
