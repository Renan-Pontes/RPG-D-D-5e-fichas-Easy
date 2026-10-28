// A folha "ENCERRAR A SESSÃO N · 2h10" (V12, especificação §4.9 e W7) — aberta pelo ■ Encerrar
// da capa, por Mais › Sessão e pelo J5 da Agora. As mesmas 3 saídas de antes (Continuar
// jogando · Encerrar · Encerrar e escrever o resumo; Esc, ✕ e toque fora = continuar), agora
// com a lista do que arrumar, tudo marcado:
//   ☑ Encerrar o combate (rodada 3 · Goblin ×2 de pé)      ← só com combate
//   ☑ Limpar a Tela (volta para a capa; tira o teste)
//   ☑ Fechar os testes abertos (1)                          ← só se há
//   ☑ Levar para a Sessão 5: 1 cena, 6 pistas, 4 pessoas    ← só com o plano desta sessão
//                                                              (marcada e "Lendo o plano…" até ele chegar)
//   Quem teve um momento hoje?  (Pipo ✓) (Dagna) …          ← só com o Raio-X
//   ✓ Pipo · ★ Abrir a fechadura                             ← o que cada toque marca, escrito
// Um toque: POST …/diary/sessions/:n/end (uma chamada). Num servidor de antes dela (404 em
// HTML), o combate, os testes, a Tela, o "ao vivo" e os momentos (PUT do Raio-X) vão pelas
// rotas antigas e a folha avisa que o plano fica como está (falta atualizar o servidor para
// guardar e levar). A lógica mora em end-session.js; aqui é só a tela.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage, isOldServer } from '../api/errors.js';
import { isWizardEnabled } from '../campaigns/end-of-encounter.js';
import { cachedInsights, insightsApi, loadInsightsOnce, rememberInsights } from '../group/insights-api.js';
import { normalizePlan } from '../prep/next-session.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import { stageClear } from '../stage/stage-api.js';
import { getSessionPlan } from '../world/world-api.js';
import { endBody, endRows, endTitle, initialChecks, markedSpotlights, momentChips, momentLine, oldServerSteps } from './end-session.js';
import { currentScene, readDoneBefore, sessionClock, sessionMeta, stateSessionNumber } from './now-model.js';
import { patchState } from './play-api.js';
import './now.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * pulse    o pulso do mestre (combate com a ordem, testes abertos); sem ele, o combatNow
 * onEnded({withRecap, session, plan, sceneId, combat, old, momentsLost}) depois de tudo: a casca
 *          recarrega, vai para a Agora e abre o fim de encontro guiado e/ou o editor do resumo
 */
export default function EndSessionSheet({ campaign, lang = 'pt', pulse = null, onClose, onEnded }) {
  const st = campaign.state || {};
  const n = stateSessionNumber(st) || 0;
  const meta = sessionMeta(st);
  const length = sessionClock(meta.startedAt);
  const combat = pulse?.combat || campaign.combatNow || null;
  const openChecks = pulse?.counts ? pulse.counts.openChecks : null;
  const [plan, setPlan] = useState(undefined);       // undefined = lendo
  const [ins, setIns] = useState(() => cachedInsights(campaign.id));
  const [wrapCombat, setWrapCombat] = useState(null); // o combate inteiro, para o fim guiado
  const wizard = isWizardEnabled(st) && !!combat?.active;
  useEffect(() => {
    let alive = true;
    getSessionPlan(campaign.id).then(p => alive && setPlan(normalizePlan(p))).catch(() => alive && setPlan(null));
    if ((campaign.members || []).some(m => m.role !== 'dm' && m.character)) {
      loadInsightsOnce(campaign.id).then(v => alive && setIns(v)).catch(() => { /* sem o Raio-X: sem os momentos */ });
    }
    if (wizard) api.getCombat(campaign.id).then(r => alive && setWrapCombat(r?.combat || null)).catch(() => {});
    return () => { alive = false; };
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => endRows({ n, combat, openChecks, plan: plan || null, planWait: plan === undefined, lang }),
    [n, combat, openChecks, plan, lang]);
  const [checks, setChecks] = useState({});
  const isOn = (id) => checks[id] !== false;     // toda caixa começa marcada
  // a cena de agora e as já feitas ao começar; servidor sem o sceneId/doneBefore: pelo nome da
  // cena (state.scene) e pelo que este aparelho guardou ao começar
  const sceneNowId = st.sceneId || (plan ? currentScene(plan, { scene: st.scene })?.id : null) || null;
  const doneBefore = meta.doneBefore || readDoneBefore(campaign.id, n) || null;
  const chips0 = useMemo(() => (ins ? momentChips({ members: campaign.members, spotlights: ins.spotlights, plan: plan || null,
    sceneId: sceneNowId, doneBefore, n }) : []),
  [ins, campaign.members, plan, sceneNowId, doneBefore, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [picked, setPicked] = useState({});      // charId → on (o toque do mestre)
  const chips = chips0.map(c => (c.locked || !(c.charId in picked) ? c : { ...c, on: picked[c.charId] }));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // servidor de antes do POST …/end: as rotas antigas, na ordem de antes. → true = os
  // momentos não foram marcados (o PUT do Raio-X também falhou)
  const oldEnd = async (body) => {
    let momentsLost = false;
    for (const step of oldServerSteps(body, { combatActive: !!combat?.active })) {
      if (step === 'combat') await api.endCombat(campaign.id).catch(() => {});
      if (step === 'checks') {
        const r = await api.listChecks(campaign.id).catch(() => null);
        for (const c of (r?.checks || []).filter(x => x.status === 'open')) await api.closeCheck(c.id).catch(() => {});
      }
      if (step === 'stage') await stageClear(campaign.id).catch(() => {});
      if (step === 'live') await patchState(campaign.id, { live: false });
      if (step === 'moments') {
        try {
          const fresh = await insightsApi.get(campaign.id);   // os de agora (outro aparelho pode ter mexido)
          rememberInsights(campaign.id, await insightsApi.put(campaign.id, { spotlights: markedSpotlights(fresh?.spotlights, body.moments, n) }));
        } catch { momentsLost = true; }
      }
    }
    return momentsLost;
  };

  const end = async (withRecap) => {
    if (busy) return;
    setBusy(withRecap ? 'recap' : 'end'); setError('');
    const body = endBody({ ...initialChecks(rows), ...checks }, chips, { n, lang });
    let old = false;
    let momentsLost = false;
    try {
      await api.endDiarySession(campaign.id, n, body);
    } catch (e) {
      if (!isOldServer(e)) { setError(errorMessage(e, lang)); setBusy(''); return; }
      old = true;
      try { momentsLost = await oldEnd(body); } catch (e2) { setError(errorMessage(e2, lang)); setBusy(''); return; }
    }
    await onEnded?.({
      withRecap, session: n, plan: plan || null, sceneId: sceneNowId, doneBefore, old, momentsLost,
      combat: body.endCombat && wizard && wrapCombat ? { ...wrapCombat, active: false } : null,
    });
  };

  const toggle = (id) => setChecks(c => ({ ...c, [id]: !isOn(id) }));
  const togglePick = (c) => setPicked(p => ({ ...p, [c.charId]: !c.on }));

  return (
    <MesaSheet lang={lang} size="auto" width="md" className="ess" icon="■" title={endTitle(n, length, lang)}
      onClose={busy ? () => {} : onClose}
      footer={(
        <div className="mesa-actions is-stack ess-foot">
          {error && <p className="sss-error" role="alert">{error}</p>}
          <button type="button" className="mesa-btn" onClick={onClose} disabled={!!busy}>{L(lang, 'Continuar jogando', 'Keep playing')}</button>
          <div className="ess-ends">
            <button type="button" className="mesa-btn ess-end" onClick={() => end(false)} disabled={!!busy}>
              {busy === 'end' ? '…' : L(lang, 'Encerrar', 'End')}
            </button>
            <button type="button" className="mesa-btn mesa-btn-lg is-primary ess-end-recap" onClick={() => end(true)} disabled={!!busy}>
              {busy === 'recap' ? '…' : L(lang, 'Encerrar e escrever o resumo', 'End and write the recap')}
            </button>
          </div>
        </div>
      )}>
      <ul className="ess-list" aria-label={L(lang, 'O que arrumar ao encerrar', 'What to tidy up when ending')}>
        {rows.map(r => (
          <li key={r.id}>
            <label className={`sss-opt ess-opt ${isOn(r.id) ? 'is-on' : ''} ${r.wait ? 'is-wait' : ''}`} aria-busy={r.wait || undefined}>
              <input type="checkbox" checked={isOn(r.id)} onChange={() => toggle(r.id)} disabled={!!busy} />
              <span className="sss-opt-text">
                <span>{r.label}</span>
                {r.sub && <span className="sss-sub">{r.sub}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {chips.length > 0 && (
        <fieldset className="ess-moments">
          <legend className="mesa-eyebrow">{L(lang, 'Quem teve um momento hoje?', 'Who had a moment today?')}</legend>
          <div className="ess-chips">
            {chips.map(c => (
              <button key={c.charId} type="button" className="mesa-chip ess-chip" aria-pressed={c.on} disabled={c.locked || !!busy}
                onClick={() => togglePick(c)} aria-describedby={`ess-what-${c.charId}`}>
                {String(c.name).split(/\s+/)[0]}{c.on ? ' ✓' : ''}
              </button>
            ))}
          </div>
          {/* o que cada toque marca, escrito (todas as linhas sempre: o toque não muda a altura) */}
          <ul className="ess-what" aria-label={L(lang, 'O que será marcado', 'What gets marked')}>
            {chips.map(c => (
              <li key={c.charId} id={`ess-what-${c.charId}`} className={c.on ? 'is-on' : ''}>
                <span className="ess-what-mark" aria-hidden="true">{c.on ? '✓' : '○'}</span>
                <span>{momentLine(c, { n, lang })}</span>
              </li>
            ))}
          </ul>
          <p className="sss-sub">{L(lang, 'Conta no Equilíbrio na mesa (Grupo › Raio-X). O ✓ travado já foi marcado nesta sessão.',
            'Counts toward Table balance (Group › X-ray). A locked ✓ was already marked this session.')}</p>
        </fieldset>
      )}
    </MesaSheet>
  );
}
