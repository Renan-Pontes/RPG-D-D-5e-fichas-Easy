import { useState } from 'react';
import { tName } from '../../data/i18n.js';
import { PLAN_LIMITS, readyChecklist, planHeading, realScene, sceneParts } from './next-session.js';
import { kindIcon, kindLabel } from '../world/world-model.js';
import MesaSheet, { SIDE_MQ } from '../shell/MesaSheet.jsx';
import useMedia from '../play/useMedia.js';
import { momentLine, planMoments } from '../group/moment-words.js';
import { capFirst } from './SceneChecklistDrawer.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export function ReadyToPlay({ plan, lang, party, heading, closed, tv, busy, compact = false, primary = true, withImage = null, recap = null, recapOf = 0, moments = null, onCopyTv, onStart, onRehearse, onRecap, onStep }) {
  const rows = readyChecklist(plan, { party, tv, lang, withImage, recap, session: recapOf, moments });
  // o que falta tem o atalho de quem resolve (as mesmas regras do "O que fazer agora")
  const fix = {
    start: onStep && { label: t(lang, 'Escrever', 'Write'), run: () => onStep('start') },
    moments: onStep && { label: t(lang, 'Ver', 'See'), run: () => onStep('party') },
    recap: onRecap && { label: t(lang, 'Escrever o resumo', 'Write the recap'), run: onRecap },
  };
  const ok = rows.filter(r => r.ok).length;
  return (
    <section className={`mesa-panel is-sunk ns-ready ${compact ? 'is-compact' : ''}`} id="ns-ready" aria-labelledby="ns-ready-h">
      <p className="mesa-eyebrow" id="ns-ready-h">{t(lang, 'Pronto para jogar', 'Ready to play')}
        {compact && <span className="ns-ready-count"> · {t(lang, `${ok} de ${rows.length} prontos`, `${ok} of ${rows.length} ready`)}</span>}</p>
      {/* um item por linha: marca · texto · atalho à direita; o que já está de pé vem primeiro */}
      {!compact && <ul className="ns-ready-list no-zebra">
        {[...rows].sort((a, b) => Number(b.ok) - Number(a.ok)).map(r => (
          <li key={r.id} className={r.ok ? 'is-ok' : 'is-todo'}>
            <span className="ns-ready-mark" aria-hidden="true">{r.ok ? '✓' : '○'}</span>
            <span className="ns-ready-text"><span className="sr-only">{r.ok ? t(lang, 'Pronto: ', 'Ready: ') : t(lang, 'Falta: ', 'Missing: ')}</span>{capFirst(r.text)}</span>
            {r.id === 'tv' && !r.ok && !closed && <button type="button" className="mesa-btn is-quiet ns-ready-copy" onClick={onCopyTv}>{t(lang, 'Copiar link', 'Copy link')}</button>}
            {!r.ok && !closed && fix[r.id] && <button type="button" className="mesa-btn is-quiet ns-ready-copy" onClick={fix[r.id].run}>{fix[r.id].label}</button>}
          </li>
        ))}
      </ul>}
      {!closed && (
        <div className="ns-ready-acts">
          {onRehearse && !heading.live && <button type="button" className="mesa-btn mesa-btn-lg" onClick={onRehearse}>▶ {t(lang, 'Ensaiar', 'Rehearse')}</button>}
          {heading.live
            ? onRehearse && <button type="button" className={`mesa-btn mesa-btn-lg ${primary ? 'is-primary' : ''}`.trim()} onClick={onRehearse}>{t(lang, 'Ir para Jogar › Agora', 'Go to Play › Now')} →</button>
            : <button type="button" className={`mesa-btn mesa-btn-lg ${primary ? 'is-primary' : ''}`.trim()} disabled={busy} onClick={onStart}>{busy ? '…' : t(lang, `▶ Começar a Sessão ${heading.next}`, `▶ Start session ${heading.next}`)}</button>}
        </div>
      )}
      {!heading.live && !closed && onRehearse && !compact && (
        <p className="ns-hint">{t(lang, 'Ensaiar abre Jogar › Agora sem começar a sessão: dá para testar a Tela.', 'Rehearse opens Play › Now without starting the session: you can test the screen.')}</p>
      )}
    </section>
  );
}

/** "★ Usar a ideia": em qual cena o momento entra (ou uma cena nova com o texto dele). */
export function IdeaSheet({ lang, plan, step, rx, onPick, onClose }) {
  const [busy, setBusy] = useState(false);
  const { name, idea } = step.payload;
  const scenes = plan.scenes.filter(realScene);
  const pick = async (id, newName) => { if (busy) return; setBusy(true); try { await onPick(id, newName); } finally { setBusy(false); } };
  return (
    <MesaSheet title={t(lang, 'Em qual cena?', 'In which scene?')} icon="★" size="tall" width="md" lang={lang} onClose={onClose}
      footer={(
        <div className="mesa-actions">
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy || plan.scenes.length >= PLAN_LIMITS.scenes}
            onClick={() => pick(null, rx.S.momentSceneText(idea, name, lang))}>{busy ? '…' : t(lang, '＋ Cena nova', '＋ New scene')}</button>
        </div>
      )}>
      <p className="mesa-sheet-text">{momentLine(idea, name, lang)}</p>
      {idea.detail && <p className="ns-hint">{t(lang, 'detalhes', 'details')}: {idea.detail}</p>}
      <p className="ns-hint">{t(lang, 'O momento fica no Raio-X e liga à cena escolhida. Na mesa, a cena lembra você dele.', 'The moment is saved in the X-ray and linked to the chosen scene. At the table, the scene reminds you of it.')}</p>
      <ul className="ns-pick-list">
        {scenes.map((s, i) => (
          <li key={s.id}>
            <button type="button" className="mesa-row" disabled={busy} onClick={() => pick(s.id)}>
              <span className="ns-row-n" aria-hidden="true">{i + 1}</span>
              <span className="mesa-row-main"><span className="mesa-row-title">{sceneParts(s.text).name || t(lang, '(sem nome)', '(no name)')}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </MesaSheet>
  );
}

/** Os momentos de um personagem (tocar na linha do ① Quem joga): os gravados, a cena de cada um e as ideias. */
export function MomentsSheet({ lang, rx, plan, fact, closed, moments, session, suggestions, style, onSave, onXray, onClose }) {
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(null);   // id do momento escolhendo a cena
  if (!fact) return null;
  const scenes = plan.scenes.filter(realScene);
  const sceneName = (id) => { const i = scenes.findIndex(s => s.id === id); return i < 0 ? null : `${i + 1}. ${sceneParts(scenes[i].text).name || '…'}`; };
  const run = async (list) => { setBusy(true); try { await onSave(list); } finally { setBusy(false); } };
  // os mesmos que a linha do ① Quem joga conta (planMoments): esperando, com ou sem cena, e os de hoje
  const open = planMoments(moments, { session, sceneIds: scenes.map(s => s.id) }).map(r => r.moment);
  return (
    <MesaSheet title={t(lang, `Momentos de ${rx.PM.firstName(fact.name)}`, `${rx.PM.firstName(fact.name)}'s moments`)} icon="★" size="tall" width="md" lang={lang} onClose={onClose}
      footer={(
        <div className="mesa-actions">
          {onXray && <button type="button" className="mesa-btn mesa-btn-lg" onClick={onXray}>{t(lang, 'Abrir no Raio-X ›', 'Open in the X-ray ›')}</button>}
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={onClose}>{t(lang, 'Pronto', 'Done')}</button>
        </div>
      )}>
      {style.length > 0 && <p className="ns-hint">{t(lang, 'Estilo do jogador', 'Player style')}: {style.join(' · ')}</p>}
      {closed && <p className="ns-hint">{t(lang, 'Só para ler aqui. Escreva, edite e dispense no Raio-X.', 'Read-only here. Write, edit and dismiss in the X-ray.')}</p>}
      <p className="mesa-eyebrow">{t(lang, 'Momentos', 'Moments')}</p>
      {open.length === 0 && <p className="ns-empty-line">{t(lang, 'Nenhum momento esperando.', 'No moments waiting.')}</p>}
      <ul className="ns-mom-list">
        {open.map(m => (
          <li key={m.id} className="ns-mom">
            <p className="ns-mom-text">{momentLine(m, fact.name, lang)}</p>
            <p className="ns-hint">{m.done != null ? `✓ ${t(lang, 'aconteceu hoje', 'happened today')}` : m.plan && sceneName(m.plan) ? `📜 ${sceneName(m.plan)}` : t(lang, 'sem cena ainda', 'no scene yet')}</p>
            {!closed && m.done == null && (linking === m.id ? (
              <div className="ns-mom-scenes" role="group" aria-label={t(lang, 'Em qual cena?', 'In which scene?')}>
                {scenes.map((s, i) => (
                  <button key={s.id} type="button" className="mesa-chip" aria-pressed={m.plan === s.id} disabled={busy}
                    onClick={async () => { await run(moments.map(x => (x.id === m.id ? { ...x, plan: s.id } : x))); setLinking(null); }}>
                    {i + 1}. {sceneParts(s.text).name || '…'}
                  </button>
                ))}
                <button type="button" className="mesa-btn" onClick={() => setLinking(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
              </div>
            ) : scenes.length > 0 && (
              <button type="button" className="mesa-btn" disabled={busy} onClick={() => setLinking(m.id)}>
                {m.plan && sceneName(m.plan) ? t(lang, 'Trocar a cena', 'Change the scene') : `→ ${t(lang, 'Cena', 'Scene')}`}
              </button>
            ))}
          </li>
        ))}
      </ul>
      {!closed && suggestions.length > 0 && (
        <>
          <p className="mesa-eyebrow">{t(lang, 'Ideias da ficha', 'Ideas from the sheet')}</p>
          <ul className="ns-mom-list">
            {suggestions.slice(0, 3).map(s => (
              <li key={s.auto} className="ns-mom is-idea">
                <p className="ns-mom-text">{momentLine(s, fact.name, lang)}</p>
                {s.detail && <p className="ns-hint ns-mom-detail">{t(lang, 'detalhes', 'details')}: {s.detail}</p>}
                <button type="button" className="mesa-btn" disabled={busy} onClick={() => run(rx.S.acceptMoment(moments, s))}>{t(lang, 'Aceitar', 'Accept')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </MesaSheet>
  );
}

/** "🔗 Ligar a um segredo" (sempre à vista): um segredo de um cartão do Mundo, o cartão inteiro ou um cartão novo. */
