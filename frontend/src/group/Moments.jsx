// Raio-X › Momentos (G8, a checklist de holofotes do Ivan) e Equilíbrio na mesa (G9),
// com o estilo do jogador. Só apresentação: as contas vêm de spotlights.js.
// - Sugestão (cinza, não gravada): Aceitar · Dispensar. Aceito ou escrito (gravado em
//   partyInsights.spotlights pelo PUT do Raio-X): → Cena, ⋯ (Editar · Tirar da cena ·
//   Apagar) e a caixa "Aconteceu" de 48 px, que grava o nº da sessão.
// - Aceitar, Dispensar e desmarcar mudam a lista: os botões da lista do personagem
//   ignoram toques por 400 ms (o 2º toque de um toque duplo não cai na sugestão seguinte).
// - Dispensar e Apagar não perguntam: mostram "↶ Desfazer" por 6 s (princípio 5), que
//   põe de volta a chave ou a foto do momento na lista de agora (spotlights.js).
// - O histórico do servidor (Equilíbrio e o "⚠ sem momento") é lido uma vez, quando os
//   Momentos chegam perto da tela: a resposta chega antes de os cartões aparecerem.
import { useEffect, useRef, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { getSessionPlan, saveSessionPlan } from '../world/world-api.js';
import { errorMessage } from '../api/errors.js';
import MoreMenu from './MoreMenu.jsx';
import { Dot, HelpButton } from './InsightsSheets.jsx';
import * as PM from './party-metrics.js';
import {
  acceptMoment, DROUGHT_WARN, dismissKey, filterMoments, kindIcon, kindLabel, MAX_MOMENT_TEXT, MAX_MOMENTS, MOMENT_KINDS,
  momentSceneText, openSuggestions, removeMoment, restoreMoment, spreadKinds, STYLES, styleLabel, toggleDone, undismissKey,
  updateMoment, writeMoment,
} from './spotlights.js';

const t = PM.t;
const SETTLE_MS = 400;
const UNDO_MS = 6000;
const FILTERS = [
  { id: 'session', label: ['Desta sessão', 'This session'] },
  { id: 'all', label: ['Todos', 'All'] },
  { id: 'done', label: ['Aconteceram', 'Happened'] },
];
const SUGGESTIONS_SHOWN = 3;

const sessionsText = (n, lang) => (n === 1 ? t(lang, '1 sessão', '1 session') : t(lang, `${n} sessões`, `${n} sessions`));
export const droughtText = (n, lang) => t(lang, `⚠ sem momento há ${sessionsText(n, lang)}`, `⚠ no moment for ${sessionsText(n, lang)}`);
// "na última sessão" / "nas últimas 3 sessões"
const lastText = (n, lang) => (n === 1 ? t(lang, 'na última sessão', 'in the last session') : t(lang, `nas últimas ${n} sessões`, `in the last ${n} sessions`));
/** Subtítulo do G9: momentos nas últimas 5 sessões e testes nas últimas 3 (juntos quando dá o mesmo número). */
export function balanceSub(n, lang) {
  if (!n) return t(lang, 'ainda sem sessões no diário', 'no sessions in the diary yet');
  const m = Math.min(n, 5);
  const c = Math.min(n, 3);
  return m === c
    ? t(lang, `momentos e testes pedidos ${lastText(m, lang)}`, `moments and checks asked ${lastText(m, lang)}`)
    : t(lang, `momentos ${lastText(m, lang)} · testes pedidos ${lastText(c, lang)}`, `moments ${lastText(m, lang)} · checks asked ${lastText(c, lang)}`);
}

/** G8: um cartão por personagem de quem entra. */
export function Moments({ facts, settings, update, suggestions, session, balance, lang, readOnly, focusId, filter, setFilter, campaignId, onOpenPlan, historyState, onNear }) {
  const [sheet, setSheet] = useState(null);   // {kind:'write'|'scene', id, moment?}
  const [undo, setUndo] = useState(null);     // {id, text, run}: o "↶ Desfazer" de 6 s
  const ref = useRef(null);
  const latest = useRef(settings);            // o Desfazer mexe na lista de agora, não na do toque
  latest.current = settings;
  useEffect(() => {
    if (!undo) return undefined;
    const id = setTimeout(() => setUndo(u => (u === undo ? null : u)), UNDO_MS);
    return () => clearTimeout(id);
  }, [undo]);
  const offerUndo = (text, run) => setUndo({ id: Date.now(), text, run });
  // sob demanda: o histórico só é pedido quando os Momentos chegam perto da tela (uma vez)
  useEffect(() => {
    if (historyState !== 'idle') return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { onNear(); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); onNear(); } }, { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [historyState, onNear]);
  const warn = Object.fromEntries((balance?.rows || []).map(r => [r.id, r]));
  const setList = (id, list) => update({ spotlights: { [String(id)]: list } });
  const dismiss = (id, auto) => {
    const key = String(id);
    update({ dismissed: { [key]: dismissKey(settings.dismissed?.[key], auto) } });
    offerUndo(t(lang, 'Sugestão dispensada', 'Suggestion dismissed'),
      () => update({ dismissed: { [key]: undismissKey(latest.current.dismissed?.[key], auto) } }));
  };
  const remove = (id, moment) => {
    const key = String(id);
    const cur = settings.spotlights?.[key] || [];
    const index = cur.findIndex(m => m.id === moment.id);
    setList(id, removeMoment(cur, moment.id));
    offerUndo(t(lang, 'Momento apagado', 'Moment deleted'),
      () => setList(id, restoreMoment(latest.current.spotlights?.[key] || [], moment, index)));
  };
  return (
    <section ref={ref} className="mesa-panel ins-block ins-moments" id="ins-moments">
      <MesaTitle sub={t(lang, 'um momento para cada um brilhar, ser desafiado ou viver a história dele', 'a moment for each one to shine, be challenged or live their story')}
        hint={<HelpButton lang={lang} title={t(lang, 'Momentos', 'Moments')} text={[
          t(lang, '★ Brilha: algo em que ele já é bom. ↗ Desafia: uma fraqueza dele, com saída. ✎ Gancho: o que o jogador escreveu na ficha.', '★ Shines: something they are already good at. ↗ Challenges: one of their weaknesses, with a way out. ✎ Hook: what the player wrote on the sheet.'),
          t(lang, 'As sugestões em cinza saem da ficha e não ficam salvas. Aceite, escreva o seu ou dispense. Leve para uma cena do plano e marque quando acontecer na mesa.', 'The gray suggestions come from the sheet and are not saved. Accept, write your own or dismiss. Take it to a plan scene and tick it when it happens at the table.'),
          t(lang, 'O estilo do jogador muda as sugestões: quem fala pouco nunca recebe um desafio de falar em público.', "The player style changes the suggestions: a quiet player never gets a public-speaking challenge."),
        ]} />}>{t(lang, 'Momentos', 'Moments')}</MesaTitle>
      <div className="ins-pair is-small" role="group" aria-label={t(lang, 'Mostrar', 'Show')}>
        {FILTERS.map(f => (
          <button key={f.id} type="button" className="mesa-chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{PM.t(lang, ...f.label)}</button>
        ))}
      </div>
      {readOnly && <p className="ins-note">{t(lang, 'Campanha encerrada: os momentos ficam só para ler.', 'Campaign closed: the moments are read-only.')}</p>}
      <div className="ins-mom-grid">
        {facts.map(f => (
          <MomentCard key={f.id} f={f} lang={lang} readOnly={readOnly} session={session} filter={filter}
            list={settings.spotlights?.[String(f.id)] || []} style={settings.style?.[String(f.id)] || []}
            dismissed={settings.dismissed?.[String(f.id)] || []} suggestions={suggestions[f.id] || []}
            row={warn[f.id]} focus={focusId === f.id}
            setList={(list) => setList(f.id, list)}
            setStyle={(st) => update({ style: { [String(f.id)]: st.length ? st : null } })}
            dismiss={(auto) => dismiss(f.id, auto)} remove={(m) => remove(f.id, m)}
            onWrite={(moment) => setSheet({ kind: 'write', id: f.id, moment })}
            onScene={(moment) => setSheet({ kind: 'scene', id: f.id, moment })} />
        ))}
      </div>
      {sheet?.kind === 'write' && (
        <WriteSheet lang={lang} moment={sheet.moment} name={facts.find(f => f.id === sheet.id)?.name}
          onClose={() => setSheet(null)}
          onSave={(kind, text) => {
            const list = settings.spotlights?.[String(sheet.id)] || [];
            if (sheet.moment) setList(sheet.id, updateMoment(list, sheet.moment.id, { kind, text }));
            else setList(sheet.id, writeMoment(list, kind, text).list);
            setSheet(null);
          }} />
      )}
      {sheet?.kind === 'scene' && (
        <SceneSheet lang={lang} campaignId={campaignId} moment={sheet.moment} name={facts.find(f => f.id === sheet.id)?.name}
          onClose={() => setSheet(null)} onOpenPlan={onOpenPlan}
          onLinked={(sceneId) => setList(sheet.id, updateMoment(settings.spotlights?.[String(sheet.id)] || [], sheet.moment.id, { plan: sceneId }))} />
      )}
      {undo && (
        <div className="ins-undo" role="status" aria-live="polite">
          <span>{undo.text}</span>
          <button type="button" className="mesa-btn" onClick={() => { undo.run(); setUndo(null); }}>↶ {t(lang, 'Desfazer', 'Undo')}</button>
        </div>
      )}
    </section>
  );
}

function MomentCard({ f, lang, readOnly, session, filter, list, style, dismissed, suggestions, row, focus, setList, setStyle, dismiss, remove, onWrite, onScene }) {
  const [styleOpen, setStyleOpen] = useState(false);
  const [more, setMore] = useState(false);
  const lockedUntil = useRef(0);
  const ref = useRef(null);
  useEffect(() => { if (focus) ref.current?.scrollIntoView?.({ block: 'start' }); }, [focus]);
  // ação que muda a lista: os botões dela esperam 400 ms antes do próximo toque
  const guard = (fn) => (...args) => {
    if (Date.now() < lockedUntil.current) return;
    lockedUntil.current = Date.now() + SETTLE_MS;
    fn(...args);
  };
  const shown = filterMoments(list, filter, session);
  // à vista, um de cada tipo (★ ↗ ✎); o resto em "Mais N sugestões"
  const open = filter === 'done' ? [] : spreadKinds(openSuggestions(suggestions, list, dismissed));
  const visible = more ? open : open.slice(0, SUGGESTIONS_SHOWN);
  const doneCount = list.filter(m => m.done != null).length;
  const full = list.length >= MAX_MOMENTS;
  const name = PM.firstName(f.name);
  return (
    <article ref={ref} className={`ins-mom-card ${focus ? 'is-focus' : ''}`} id={`ins-mom-${f.id}`} aria-labelledby={`ins-mom-h-${f.id}`}>
      <header className="ins-mom-head">
        <h3 className="ins-mom-name" id={`ins-mom-h-${f.id}`}><Dot color={f.color} /> {f.name}</h3>
        <p className="ins-mom-count">{t(lang, `${list.length} momento${list.length === 1 ? '' : 's'} · ${doneCount} aconteceu`, `${list.length} moment${list.length === 1 ? '' : 's'} · ${doneCount} happened`)}</p>
        {style.length > 0 && <p className="ins-mom-style">{style.map(s => styleLabel(s, lang)).join(' · ')}</p>}
        {row?.warn && <p className="ins-warn ins-mom-warn" role="note">{droughtText(row.drought, lang)}</p>}
        <button type="button" className="mesa-btn is-quiet ins-style-toggle" aria-expanded={styleOpen} onClick={() => setStyleOpen(o => !o)}>
          {t(lang, 'Estilo do jogador', 'Player style')} <span aria-hidden="true">{styleOpen ? '▴' : '▾'}</span>
        </button>
        {styleOpen && (
          <div className="ins-style-chips" role="group" aria-label={t(lang, `Estilo de quem joga com ${name}`, `Style of ${name}'s player`)}>
            {STYLES.map(s => {
              const on = style.includes(s.id);
              return (
                <button key={s.id} type="button" className="mesa-chip" aria-pressed={on} disabled={readOnly}
                  onClick={() => setStyle(on ? style.filter(x => x !== s.id) : [...style, s.id])}>{styleLabel(s.id, lang)}</button>
              );
            })}
          </div>
        )}
      </header>

      {shown.length > 0 && (
        <ul className="ins-mom-list">
          {shown.map(m => {
            const done = m.done != null;
            const menu = [
              { id: 'edit', label: t(lang, 'Editar', 'Edit'), onSelect: () => onWrite(m) },
              m.plan && { id: 'unlink', label: t(lang, 'Tirar da cena', 'Remove from scene'), onSelect: () => setList(updateMoment(list, m.id, { plan: null })) },
              { id: 'delete', label: t(lang, 'Apagar', 'Delete'), danger: true, onSelect: guard(() => remove(m)) },
            ].filter(Boolean);
            return (
              <li key={m.id} className={`ins-mom ${done ? 'is-done' : ''}`}>
                <button type="button" role="checkbox" aria-checked={done} className="ins-mom-box" disabled={readOnly}
                  aria-label={t(lang, `Aconteceu: ${m.text}`, `It happened: ${m.text}`)}
                  onClick={guard(() => setList(toggleDone(list, m.id, session)))}>
                  <span aria-hidden="true">{done ? '✓' : ''}</span>
                </button>
                <div className="ins-mom-body">
                  <p className="ins-mom-text"><span className="ins-mom-kind">{kindIcon(m.kind)} {kindLabel(m.kind, lang)}</span> {m.text}</p>
                  {(done || m.plan) && (
                    <p className="ins-mom-meta">
                      {done && (m.done > 0 ? t(lang, `aconteceu na sessão ${m.done}`, `happened in session ${m.done}`) : t(lang, 'aconteceu', 'happened'))}
                      {done && m.plan && ' · '}
                      {m.plan && t(lang, '📜 numa cena do plano', '📜 in a plan scene')}
                    </p>
                  )}
                  {!readOnly && (
                    <div className="ins-mom-act">
                      {!m.plan && !done && <button type="button" className="mesa-btn" onClick={() => onScene(m)}>→ {t(lang, 'Cena', 'Scene')}</button>}
                      <MoreMenu items={menu} label={t(lang, `Mais ações: ${m.text}`, `More actions: ${m.text}`)} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!shown.length && filter === 'done' && <p className="ins-adj-help">{t(lang, `Nenhum momento de ${name} aconteceu ainda.`, `None of ${name}'s moments happened yet.`)}</p>}

      {visible.length > 0 && (
        <ul className="ins-sug-list" aria-label={t(lang, `Sugestões para ${name}`, `Suggestions for ${name}`)}>
          {visible.map(s => (
            <li key={s.auto} className="ins-sug">
              <p className="ins-sug-text"><span className="ins-sug-tag">{t(lang, 'sugestão', 'suggestion')}</span> <span className="ins-mom-kind">{kindIcon(s.kind)} {kindLabel(s.kind, lang)}</span> {s.text}</p>
              {!readOnly && (
                <div className="ins-mom-act">
                  <button type="button" className="mesa-btn" disabled={full} onClick={guard(() => setList(acceptMoment(list, s)))}>{t(lang, 'Aceitar', 'Accept')}</button>
                  <button type="button" className="mesa-btn is-quiet" onClick={guard(() => dismiss(s.auto))}>{t(lang, 'Dispensar', 'Dismiss')}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {open.length > SUGGESTIONS_SHOWN && (
        <button type="button" className="mesa-btn is-quiet ins-more" aria-expanded={more} onClick={() => setMore(v => !v)}>
          {more ? t(lang, 'Menos sugestões', 'Fewer suggestions') : t(lang, `Mais ${open.length - SUGGESTIONS_SHOWN} sugest${open.length - SUGGESTIONS_SHOWN === 1 ? 'ão' : 'ões'}`, `${open.length - SUGGESTIONS_SHOWN} more suggestion${open.length - SUGGESTIONS_SHOWN === 1 ? '' : 's'}`)}
        </button>
      )}
      {!readOnly && (
        <div className="ins-mom-foot">
          <button type="button" className="mesa-btn" disabled={full} onClick={() => onWrite(null)}>✎ {t(lang, 'Escrever o meu', 'Write my own')}</button>
          {full && <p className="ins-adj-help">{t(lang, `${name} já tem ${MAX_MOMENTS} momentos: apague um para pôr outro.`, `${name} already has ${MAX_MOMENTS} moments: delete one to add another.`)}</p>}
        </div>
      )}
    </article>
  );
}

/** "Escrever o meu" e "Editar": tipo (★ ↗ ✎) e o texto, até 160 (o resto é cortado com aviso). */
function WriteSheet({ lang, moment, name, onSave, onClose }) {
  const [kind, setKind] = useState(moment?.kind || 'shine');
  const [text, setText] = useState(moment?.text || '');
  const [cut, setCut] = useState(false);
  const chars = [...text].length;
  const onChange = (v) => {
    const all = [...v];
    setCut(all.length > MAX_MOMENT_TEXT);
    setText(all.slice(0, MAX_MOMENT_TEXT).join(''));
  };
  const ok = text.trim().length > 0;
  return (
    <MesaSheet title={moment ? t(lang, 'Editar o momento', 'Edit the moment') : t(lang, `Momento de ${PM.firstName(name)}`, `${PM.firstName(name)}'s moment`)} icon="✎"
      size="auto" width="sm" lang={lang} onClose={onClose} dirty={text !== (moment?.text || '') || kind !== (moment?.kind || 'shine')}
      footer={(
        <div className="ins-sheet-foot">
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="button" className="mesa-btn is-primary mesa-btn-lg" disabled={!ok} onClick={() => onSave(kind, text)}>{t(lang, 'Salvar', 'Save')}</button>
        </div>
      )}>
      <div className="ins-pair" role="radiogroup" aria-label={t(lang, 'Tipo', 'Kind')}>
        {MOMENT_KINDS.map(k => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className="mesa-chip" onClick={() => setKind(k)}>{kindIcon(k)} {kindLabel(k, lang)}</button>
        ))}
      </div>
      <label className="ins-write-label" htmlFor="ins-write-text">{t(lang, 'O que vai acontecer', 'What will happen')}</label>
      <textarea id="ins-write-text" className="input ins-write-text" rows={3} value={text} onChange={e => onChange(e.target.value)}
        placeholder={t(lang, 'Ex.: Uma fechadura que só ele abre, com o grupo cercado', 'E.g. A lock only they can open, with the party surrounded')} />
      <p className={`ins-write-count ${cut ? 'is-warn' : ''}`} role={cut ? 'alert' : 'status'}>
        {cut ? t(lang, `Cortado em ${MAX_MOMENT_TEXT} caracteres: o resto não cabe.`, `Cut at ${MAX_MOMENT_TEXT} characters: the rest does not fit.`) : `${chars}/${MAX_MOMENT_TEXT}`}
      </p>
    </MesaSheet>
  );
}

/** "→ Cena": escolher uma cena do plano ou criar uma nova com o texto do momento. */
function SceneSheet({ lang, campaignId, moment, name, onLinked, onOpenPlan, onClose }) {
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);   // {text}
  useEffect(() => {
    let alive = true;
    getSessionPlan(campaignId).then(p => { if (alive) setPlan(p || { scenes: [] }); }).catch(e => { if (alive) setErr(errorMessage(e, lang)); });
    return () => { alive = false; };
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps
  const scenes = plan?.scenes || [];
  const createNew = async () => {
    setBusy(true); setErr('');
    try {
      if (scenes.length >= 30) throw Object.assign(new Error(t(lang, 'O plano já tem 30 cenas.', 'The plan already has 30 scenes.')), { plain: true });
      const text = momentSceneText(moment, name, lang);
      const saved = await saveSessionPlan(campaignId, { scenes: [...scenes, { text }] });
      const last = (saved?.scenes || []).at(-1);
      onLinked(last?.id || null);
      setDone({ text, isNew: true });
    } catch (e) { setErr(e?.plain ? e.message : errorMessage(e, lang)); } finally { setBusy(false); }
  };
  const pick = (s) => { onLinked(s.id); setDone({ text: s.text }); };
  return (
    <MesaSheet title={t(lang, 'Levar para uma cena', 'Take to a scene')} icon="📜" size="tall" width="md" lang={lang} onClose={onClose}
      footer={done ? (
        <div className="ins-sheet-foot">
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={onOpenPlan}>{t(lang, 'Abrir o plano ›', 'Open the plan ›')}</button>
          <button type="button" className="mesa-btn is-primary mesa-btn-lg" onClick={onClose}>{t(lang, 'Pronto', 'Done')}</button>
        </div>
      ) : (
        <div className="ins-sheet-foot">
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="button" className="mesa-btn is-primary mesa-btn-lg" disabled={busy || !plan} onClick={createNew}>{busy ? '…' : t(lang, '＋ Cena nova', '＋ New scene')}</button>
        </div>
      )}>
      <p className="ins-why-lead">{kindIcon(moment.kind)} {PM.firstName(name)} · {moment.text}</p>
      {err && <p className="ins-note is-warn" role="alert">{t(lang, 'Não enviado', 'Not sent')}: {err}</p>}
      {done ? (
        <p className="ins-plan-ok" role="status">✓ {done.isNew
          ? t(lang, 'Cena nova no plano da sessão.', 'New scene in the session plan.')
          : t(lang, `Ligado à cena “${done.text.slice(0, 80) || '…'}”.`, `Linked to the scene “${done.text.slice(0, 80) || '…'}”.`)}</p>
      ) : !plan && !err ? (
        <p className="muted" role="status">{t(lang, 'Carregando o plano…', 'Loading the plan…')}</p>
      ) : (
        <>
          <p className="ins-adj-help">{scenes.length
            ? t(lang, 'Toque numa cena do plano para pôr o momento nela, ou crie uma cena nova com o texto dele.', 'Tap a plan scene to put the moment in it, or create a new scene with its text.')
            : t(lang, 'O plano ainda não tem cenas: crie uma nova com o texto do momento.', 'The plan has no scenes yet: create a new one with the moment text.')}</p>
          {scenes.length > 0 && (
            <ul className="ins-scene-list">
              {scenes.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className="ins-scene-row" onClick={() => pick(s)}>
                    <span className="ins-scene-n">{t(lang, `Cena ${i + 1}`, `Scene ${i + 1}`)}</span>
                    <span className="ins-scene-text">{s.text || t(lang, '(sem texto)', '(no text)')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </MesaSheet>
  );
}

/** G9: momentos que aconteceram e testes pedidos, por personagem; "⚠ sem momento há N sessões". */
export function Balance({ balance, history, state, onLoad, lang }) {
  const n = balance.sessions.length;
  return (
    <section className="mesa-panel ins-block ins-balance">
      <MesaTitle sub={balanceSub(n, lang)}
        hint={<HelpButton lang={lang} title={t(lang, 'Equilíbrio na mesa', 'Table balance')} text={[
          t(lang, 'Todos tiveram o seu momento? A barra conta os momentos marcados como "aconteceu" nas últimas 5 sessões; embaixo, quantos testes você pediu a cada um nas últimas 3.', 'Did everyone get their moment? The bar counts the moments ticked as "it happened" in the last 5 sessions; below, how many checks you asked each one in the last 3.'),
          t(lang, `O aviso aparece depois de ${DROUGHT_WARN} sessões seguidas sem momento; quem fala pouco leva a marca 🤐 junto.`, `The warning shows after ${DROUGHT_WARN} sessions in a row without a moment; a quiet player gets the 🤐 mark too.`),
        ]} />}>{t(lang, 'Equilíbrio na mesa', 'Table balance')}</MesaTitle>
      {/* uma linha de altura fixa para o estado: o histórico chegando não empurra nada */}
      {state === 'error' ? (
        <p className="ins-note is-warn ins-bal-status" role="alert">{t(lang, 'Não deu para ler o histórico dos testes; os momentos valem.', "Couldn't read the checks history; the moments still count.")}{' '}
          <button type="button" className="mesa-btn is-quiet" onClick={onLoad}>{t(lang, 'Tentar de novo', 'Try again')}</button></p>
      ) : (
        <p className="ins-adj-help ins-bal-status" role="status">{state === 'ok'
          ? (n ? t(lang, `Sessões contadas: ${balance.sessions.join(', ')}.`, `Sessions counted: ${balance.sessions.join(', ')}.`) : t(lang, 'Nenhuma sessão começou ainda.', 'No session has started yet.'))
          : t(lang, 'Lendo o histórico das sessões…', 'Reading the session history…')}</p>
      )}
      <ul className="ins-bal-rows">
        {balance.rows.map(r => (
          <li key={r.id} className="ins-bal-row">
            <span className="ins-bal-name"><Dot color={r.color} /> {PM.firstName(r.name)}</span>
            <span className="ins-bal-line">
              <span className="ins-mini-bar ins-bal-bar" aria-hidden="true"><span style={{ width: `${(r.moments / balance.maxMoments) * 100}%`, background: r.color }} /></span>
              <span className="ins-bal-num"><strong>{r.moments}</strong> {r.moments === 1 ? t(lang, 'momento', 'moment') : t(lang, 'momentos', 'moments')}</span>
            </span>
            <span className="ins-bal-line">
              <span className="ins-mini-bar ins-bal-bar is-checks" aria-hidden="true"><span style={{ width: `${history ? (r.checks.asked / balance.maxAsked) * 100 : 0}%` }} /></span>
              <span className="ins-bal-num">{!history
                ? t(lang, 'testes: …', 'checks: …')
                : t(lang,
                  `${r.checks.asked} teste${r.checks.asked === 1 ? '' : 's'} pedido${r.checks.asked === 1 ? '' : 's'} · ${r.checks.passed === 0 ? 'nenhum passou' : r.checks.passed === 1 ? '1 passou' : `${r.checks.passed} passaram`}`,
                  `${r.checks.asked} check${r.checks.asked === 1 ? '' : 's'} asked · ${r.checks.passed} passed`)}</span>
            </span>
            {r.warn && <span className="ins-warn ins-bal-warn">{droughtText(r.drought, lang)}{r.quiet ? ` · ${styleLabel('quiet', lang)}` : ''}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
