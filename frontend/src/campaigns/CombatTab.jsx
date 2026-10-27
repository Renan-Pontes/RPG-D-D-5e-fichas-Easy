import { errorMessage, isOldServer } from '../api/errors.js';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiUrl } from '../api/client.js';
import { COMBAT_EVENT, useOnRev, useTable } from '../play/table-store.js';
import { DockedScreen } from '../stage/ScreenWindow.jsx';
import useMedia from '../play/useMedia.js';
import MonsterPicker from './MonsterPicker.jsx';
import CombatGrid from './CombatGrid.jsx';
import EncounterDifficulty from '../combat/EncounterDifficulty.jsx';
import { NudgeBell } from './NudgeList.jsx';
import EndOfEncounterPanel from './EndOfEncounterPanel.jsx';
import CombatantSheet, { CombatantPanel, ConditionChip, condRounds, sheetConditions } from './CombatantSheet.jsx';
import { isWizardEnabled, stateWithWizard } from './end-of-encounter.js';
import { findMonster, monsterForCombat } from '../../data/bestiary.js';
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { HpBar, PcPortrait } from '../shell/MesaPc.jsx';
import { monsterArt, monsterEmoji } from '../art.js';
import ArtThumb from '../components/ArtThumb.jsx';
import { memberStats } from '../group/group-model.js';
import { logLine } from './monster-actions.js';
import { conditionLabel } from '../combat/monster-i18n.js';
import GroupCheckPanel from '../checks/GroupCheckPanel.jsx';
import { initiativePayload } from '../checks/check-logic.js';
import DamagePad from '../play/DamagePad.jsx';
import StartCombatSheet, { sceneOfNode } from '../play/StartCombatSheet.jsx';
import { encounterBody, initiativeRows, openInitiativeCheck, setupSteps, useInitiatives, useLabel } from '../combat/encounter-setup.js';
import { markLabel, newOpId, shouldScrollTo, toggleMark, turnMarks, TOUCH_QUIET_MS } from '../play/damage-model.js';
import { startEncounter } from '../play/combat-actions.js';
import { activeScene } from '../play/scene-model.js';
import { getAdventure, listAdventures, patchState } from '../play/play-api.js';
import { flash } from '../play/flash.js';

const ShowSheet = lazy(() => import('../stage/ShowSheet.jsx'));

// Animais da Forma Selvagem (SRD.BEASTS) não têm ataques estruturados: no combate
// usamos a versão do bestiário SRD 5.2.1, com ataques reais.
const WILD_SHAPE_BEAST_IDS = new Set((SRD.BEASTS || []).map(b => b.id));
const resolveCatalogMonster = (m) => (
  m && !m.source && !m.combatReady && WILD_SHAPE_BEAST_IDS.has(m.id) ? (findMonster(m.id) || m) : m
);

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const ask = (lang, message, opts = {}) => confirmDialog({ message, lang, ...opts });

// Lista | Mapa no celular (lembrado por aparelho, plano §2.4)
const viewKey = (id) => `forja:combat-view:${id}`;
function readView(id) {
  try { return localStorage.getItem(viewKey(id)) === 'map' ? 'map' : 'list'; } catch { return 'list'; }
}
function writeView(id, v) {
  try { localStorage.setItem(viewKey(id), v); } catch { /* modo privado */ }
}

/** true a partir de 1024 px: lista e mapa lado a lado, o painel abre na própria lista. */
function useWide() {
  const q = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => { try { return window.matchMedia(q).matches; } catch { return true; } });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

const isTyping = (el) => {
  const tag = (el?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el?.isContentEditable;
};
const modalOpen = () => !!document.querySelector('.modal-backdrop, [role="dialog"][aria-modal="true"]');

/**
 * Jogar › Combate (só mestre).
 * - Linha de ações no topo (V8): 🎯 Pedir teste · 📺 Mostrar · ⋯ Combate (▶ Iniciar,
 *   Registro recente, Ferramentas do mapa, Fim de combate guiado e, por último,
 *   Recomeçar, que pergunta "Manter o mapa?").
 * - Cabeçalho "Combate · rodada N" com 🔔 avisos e ⏸ Encerrar; a dificuldade embaixo.
 * - Combate parado: "Monte o combate em 3 passos" (① Monstros ② Personagens
 *   ③ Iniciativa, cada um com ✓), o atalho "Usar o combate da cena X" e, com a
 *   iniciativa pedida à mesa, as respostas na linha ("⚡ 14") e "Usar e começar (3 de 4)".
 * - Cada combatente é uma linha de 56 px (CombatantRow) com a marca da vez (✓ agiu ·
 *   ▶ agora · † caiu) e a pílula de PV, que abre o teclado de dano (DamagePad);
 *   "Vários alvos" liga caixas nas linhas e o "½ passou". No celular o toque na linha
 *   abre a folha do combatente; no desktop o painel abre na lista e o mapa fica preso
 *   ao lado.
 * - Quem age fica destacado e a lista não pula: a linha não se abre sozinha e a
 *   página só rola até ela se estiver fora da vista (nunca nos 600 ms depois de um toque).
 * - Encerrar volta para Jogar › Agora (depois do fim guiado, se ligado).
 * - Sugestões de ataque/salvaguarda ficam guardadas aqui, por combatente: nada
 *   é aplicado antes do "Aplicar".
 * Na casca do mestre (V4, `turnStrip={false}`): a faixa do turno sai daqui (no
 * celular ela mora na barra da mesa, embaixo; no PC, presa no topo de Jogar), o
 * combate só é buscado quando o pulso diz que ele mudou (`pulse.combat.ver`) ou
 * quando uma ação devolve o combate novo (evento da loja da mesa), e a janela da
 * Tela fica encaixada FORA do mapa (que fica inteiro e preso ao lado da lista): numa
 * 3ª coluna estreita a partir de 1280 px; de 1024 a 1279, compacta no topo da
 * coluna da lista. `params.actor` abre quem age (o [Ações] da
 * Tela ao vivo e a faixa do PC); `params.endCombat` é o "Encerrar o combate" da
 * barra quando todos os monstros caíram. Teclas no PC: D (teclado de dano de quem
 * está selecionado ou na vez) e P (Pedir teste).
 */
export default function CombatTab({ campaign, lang, onChange, onNavigate, goTo, turnStrip: ownStrip = true, params = null }) {
  const table = useTable();
  const [combat, setCombat] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showAddPC, setShowAddPC] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(null); // 'ask' | 'show' | null
  const [selected, setSelected] = useState(null); // combatente selecionado (linha e mapa)
  const [sheet, setSheet] = useState(null); // { id, tab } — folha aberta (celular/tablet)
  const [pad, setPad] = useState(null); // { id } | { multi: true } — teclado de dano
  const [marks, setMarks] = useState(null); // "Vários alvos": {id: {half}} | null
  const [wrapUp, setWrapUp] = useState(null); // combate encerrado → Fim de encontro (opt-in)
  const [pendings, setPendings] = useState({}); // sugestão em aberto por combatente
  const [choices, setChoices] = useState({}); // alvos escolhidos por combatente:ação
  const [view, setView] = useState(() => readView(campaign.id));
  const [toolsSignal, setToolsSignal] = useState(0);
  const [startScene, setStartScene] = useState(null); // a folha "Começar o combate"
  const [sceneFight, setSceneFight] = useState(null); // {adventure, fight} da cena em jogo
  const [initCheck, setInitCheck] = useState(null); // o teste de iniciativa aberto
  const [busy, setBusy] = useState('');
  const wide = useWide();
  const roomy = useMedia('(min-width: 1280px)');   // a Tela encaixada ganha a 3ª coluna

  const seeRef = useRef(() => {});
  // Nada mexe debaixo do dedo: o último toque na tela. O combate que chega pelo pulso
  // nos 600 ms depois de um toque espera esse tempo para entrar (e a lista não rola).
  const touchedAt = useRef(0);
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    return () => document.removeEventListener('pointerdown', mark, true);
  }, []);
  const load = useCallback(async () => {
    try {
      const r = await api.getCombat(campaign.id);
      const apply = () => { setCombat(r.combat); seeRef.current(r.combat?.updatedAt); };
      const wait = touchedAt.current + TOUCH_QUIET_MS - Date.now();
      if (wait > 0) setTimeout(apply, wait); else apply();
    } catch (e) { console.warn(e); }
  }, [campaign.id]);

  useEffect(() => { load(); }, [load]);
  // Com o pulso: só quando o combate muda (e 1 vez por minuto); sem ele, a cada 2,5 s, como antes.
  // A versão que já chegou (por esta busca ou pela resposta de uma ação) conta como vista:
  // o pulso que traz o mesmo `ver` não busca o combate de novo.
  seeRef.current = useOnRev(table?.combat?.ver, load, { table, fallbackMs: 2500, initial: false });
  // O combate que voltou de uma ação da barra, da faixa, da tecla N ou do teclado de dano: na hora.
  useEffect(() => {
    const on = (e) => {
      if (String(e.detail?.campaignId) !== String(campaign.id) || !e.detail?.combat) return;
      setCombat(e.detail.combat);
      seeRef.current(e.detail.combat.updatedAt);
    };
    window.addEventListener(COMBAT_EVENT, on);
    return () => window.removeEventListener(COMBAT_EVENT, on);
  }, [campaign.id]);
  // O combate novo de uma ação desta tela: a loja da mesa avisa todo mundo (barra, Tela);
  // sem a loja (tela antiga), só aqui.
  const applyCombat = useCallback((c) => {
    if (!c) return;
    if (table?.applyCombat) table.applyCombat(c);
    else { setCombat(c); seeRef.current(c.updatedAt); }
  }, [table]);

  const combatants = combat?.combatants || [];
  const active = !!combat?.active;

  // A iniciativa pedida à mesa: só enquanto o combate está sendo montado e já tem
  // personagem. Busca quando o pulso diz que os testes mudaram (sem pulso, a cada 6 s),
  // e só nesse período. (Servidor antigo: os personagens entram sem o "✎", mas as
  // respostas do teste aberto entram igual pelo "Usar e começar".)
  const waitingInit = !!combat && !active && combatants.some(c => c.type === 'pc');
  const waitRef = useRef(waitingInit);
  waitRef.current = waitingInit;
  const loadChecks = useCallback(async () => {
    if (!waitRef.current) return;
    try { const r = await api.listChecks(campaign.id); setInitCheck(openInitiativeCheck(r.checks || [])); }
    catch { /* o próximo tenta de novo */ }
  }, [campaign.id]);
  useOnRev(table?.pulse?.checksRev, loadChecks, { table, fallbackMs: 6000, initial: false });
  useEffect(() => { if (waitingInit) loadChecks(); else setInitCheck(null); }, [waitingInit, loadChecks]);

  // "Usar o combate da cena X": com o combate vazio, a lista leve das aventuras diz se a
  // sala em jogo tem combate (1 GET ao abrir; servidor antigo não manda `currentFight`).
  const empty = !!combat && !active && combatants.length === 0;
  useEffect(() => {
    if (!empty) return undefined;
    let alive = true;
    listAdventures(campaign.id).then(r => {
      const adv = activeScene(r?.adventures || []);
      if (alive) setSceneFight(adv?.currentFight ? { adventure: adv, fight: adv.currentFight } : null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [empty, campaign.id]);

  // Vindo de outro lugar: [Ações] (abre quem age) ou "Encerrar o combate" (barra da mesa).
  const handled = useRef(null);
  const endCombatRef = useRef(null);
  useEffect(() => {
    if (!combat || !params) return;
    const key = params.actor ? `a:${params.actor}:${params.at || ''}` : params.endCombat ? `e:${params.endCombat}` : null;
    if (!key || handled.current === key) return;
    handled.current = key;
    if (params.endCombat) { endCombatRef.current?.(); return; }
    const who = (combat.combatants || []).find(c => c.id === params.actor);
    if (!who) return;
    setSelected(who.id);
    // Monstro abre nas Ações; PJ (o jogador age pela ficha) no PV.
    if (!wide) setSheet({ id: who.id, tab: who.type === 'monster' ? 'actions' : 'hp' });
    else requestAnimationFrame(() => document.getElementById(`cc-${who.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }, [combat, params, wide]);

  // Quando a vez muda: quem age fica destacado (a linha não se abre sozinha). No celular
  // ele fica selecionado no mapa; a lista só rola até ele se estiver fora da vista.
  const turnKey = active ? `${combat.round}:${combat.turnIndex}:${combatants[combat.turnIndex]?.id || ''}` : '';
  const lastTurnKey = useRef(null);
  useEffect(() => {
    if (!turnKey) { lastTurnKey.current = null; return; }
    if (lastTurnKey.current === turnKey) return;
    const first = lastTurnKey.current === null;
    lastTurnKey.current = turnKey;
    const who = combat?.combatants?.[combat.turnIndex];
    if (!who) return;
    if (!wide) setSelected(who.id);
    if (first) return undefined;
    // O toque no Próximo acabou de acontecer: espera os 600 ms passarem e confere de novo.
    let timer = null;
    let tries = 0;
    const check = () => {
      const el = document.getElementById(`cc-${who.id}`);
      if (!el) return;
      const wait = touchedAt.current + TOUCH_QUIET_MS - Date.now();
      if (wait > 0 && tries++ < 5) { timer = setTimeout(check, wait + 20); return; }
      // a área livre: abaixo do segmentado preso e acima da barra da mesa (ou da barra de baixo)
      const bar = [...document.querySelectorAll('.mesa-bar, .shell-bottom-bar')].map(b => b.getBoundingClientRect()).find(b => b.height > 0);
      const top = wide ? 150 : 110;
      const bottom = (bar ? bar.top : window.innerHeight) - 4;
      if (shouldScrollTo(el.getBoundingClientRect(), { top, bottom, lastTouchAt: touchedAt.current })) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ok */ }
      }
    };
    requestAnimationFrame(check);
    return () => clearTimeout(timer);
  }, [turnKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // a folha e o teclado fecham se o combatente saiu do combate
  useEffect(() => {
    if (sheet && combat && !combatants.some(c => c.id === sheet.id)) setSheet(null);
    if (pad?.id && combat && !combatants.some(c => c.id === pad.id)) setPad(null);
  }, [sheet, pad, combat, combatants]);

  const setPendingFor = useCallback((id) => (p) => setPendings(m => ({ ...m, [id]: p })), []);
  const choiceFor = useCallback((id) => (index) => choices[`${id}:${index}`] || {}, [choices]);
  const setChoiceFor = useCallback((id) => (index, patch) => setChoices(m => {
    const k = `${id}:${index}`;
    return { ...m, [k]: { ...(m[k] || {}), ...patch } };
  }), []);

  // Teclas do PC: D = teclado de dano de quem está selecionado (ou na vez) · P = Pedir teste.
  const keysRef = useRef({});
  keysRef.current = { combat, selected, wide };
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || modalOpen()) return;
      const k = e.key.toLowerCase();
      const { combat: cmb, selected: sel } = keysRef.current;
      if (k === 'd' && cmb) {
        const id = sel || (cmb.active ? cmb.combatants?.[cmb.turnIndex]?.id : null);
        if (id) { e.preventDefault(); setPad({ id }); }
      } else if (k === 'p') {
        e.preventDefault(); setSheetOpen('ask');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!combat) return <div className="combat-tab is-loading"><p className="muted">{t(lang, 'Carregando combate…', 'Loading combat…')}</p></div>;

  const currentTurn = active ? combatants[combat.turnIndex] : null;
  // A faixa (com o Próximo turno) depende só de haver combate em andamento: a vez
  // pode apontar para fora da lista (tiraram o último da ordem na vez dele) e o
  // Próximo turno é o que a traz de volta (o servidor faz (vez + 1) % total).
  // Na casca do mestre ela mora na barra da mesa (celular) e no topo de Jogar (PC).
  const showTurn = ownStrip && active && combatants.length > 0;
  const marksOf = turnMarks(combat);
  const rows = initiativeRows(combat, initCheck);
  const answers = new Map(rows.filter(r => r.answered).map(r => [r.id, r.total]));
  const steps = setupSteps(combat, { askedInitiative: !!initCheck });
  const use = useInitiatives(rows);
  const backToNow = () => { if (goTo) goTo('play', 'scene'); };

  const startCombat = async () => {
    setShowMore(false);
    if (table?.enabled) { await table.startCombat(); return; }
    await api.startCombat(campaign.id); load();
  };
  const endCombat = async () => {
    if (!await ask(lang, t(lang, 'Encerrar o combate?', 'End combat?'), { confirmLabel: t(lang, 'Encerrar', 'End') })) return;
    let r;
    try { r = await api.endCombat(campaign.id); }
    catch (e) { flash(`${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); return; }
    applyCombat(r?.combat);
    // Encerrar volta para a Agora (com o fim guiado ligado, depois do painel dele).
    if (isWizardEnabled(campaign.state)) setWrapUp(r?.combat || combat);
    else backToNow();
  };
  endCombatRef.current = endCombat;
  const resetCombat = async (keepMap) => {
    setShowMore(false);
    try {
      const r = await api.resetCombat(campaign.id, keepMap ? undefined : { keepMap: false });
      applyCombat(r?.combat);
    } catch (e) { flash(`${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); }
    load();
  };
  // Próximo turno com a vez que está à vista (o servidor recusa se ela já mudou).
  const nextTurn = async () => {
    const expect = { round: combat.round, turnIndex: combat.turnIndex };
    if (table?.enabled) { table.nextTurn(expect); return; }
    try { await api.combatNextTurn(campaign.id, expect); } catch { /* 409: a vez já tinha passado */ }
    load();
  };

  // ✚ Monstro: uma chamada (POST /encounter, casas livres e iniciativa por monstro no
  // servidor); servidor antigo: 1 POST por monstro, como antes.
  const addMonster = async (monster, count, initiative) => {
    // Snapshot do bestiário (ações/bônus/reações/lendárias numa lista com `kind`).
    const snap = monsterForCombat(resolveCatalogMonster(monster));
    const name = (typeof snap.name === 'object' ? (snap.name?.[lang] || snap.name?.en) : snap.name) || 'Monster';
    const tokenScale = snap.size === 'Large' ? 2 : snap.size === 'Huge' ? 3 : snap.size === 'Gargantuan' ? 4 : snap.size === 'Tiny' ? 0.5 : 1;
    const groups = [{ monster: snap, name, count, initiative, tokenScale }];
    try {
      const r = await startEncounter(campaign.id, encounterBody({ opId: newOpId(), groups, pcs: false, lang }),
        { groups, combatants, map: combat?.map || {} });
      applyCombat(r?.combat);
    } catch (e) { flash(`${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); }
    setShowPicker(false);
    load();
  };

  // ✚ Personagem: a iniciativa que o mestre digitou (ou 10 com "✎"); "Adicionar todos"
  // vai numa chamada só, cada um numa casa livre (D1).
  const addPCs = async (list) => {
    const members = (campaign.members || []).filter(m => list.some(x => x.characterId === m.character?.id))
      .map(m => ({ ...m, initiative: list.find(x => x.characterId === m.character.id)?.initiative }));
    const pcs = list.map(x => {
      const n = parseInt(x.initiative, 10);
      return { characterId: x.characterId, ...(Number.isFinite(n) ? { initiative: n } : {}) };
    });
    const r = await startEncounter(campaign.id, { ...encounterBody({ opId: newOpId(), lang }), pcs }, { members, combatants, map: combat?.map || {} });
    applyCombat(r?.combat);
    load();
  };

  // ③ Iniciativa: o teste à mesa (kind custom; quem está no combate rola no app).
  const askInitiative = async () => {
    if (busy) return;
    setBusy('init');
    try {
      const inFight = new Set(combatants.filter(c => c.type === 'pc').map(c => c.character_id));
      const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
      const targets = players.every(m => inFight.has(m.character.id)) ? [] : players.filter(m => inFight.has(m.character.id)).map(m => m.user.id);
      const r = await api.createCheck(campaign.id, initiativePayload(lang, targets));
      setInitCheck(r?.check || null);
      flash(t(lang, '⚡ Iniciativa pedida à mesa: os jogadores rolam no app.', '⚡ Initiative asked: players roll in the app.'));
    } catch (e) { flash(`${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); }
    finally { setBusy(''); }
  };
  // "Usar e começar (3 de 4)": as respostas na ordem, 10 e "✎" para quem falta, e começa.
  const useAndStart = async () => {
    if (busy) return;
    setBusy('use');
    try {
      const body = { opId: newOpId(), initiatives: use.initiatives, start: true, ...(initCheck ? { closeCheck: initCheck.id } : {}) };
      let r;
      try { r = await api.combatEncounter(campaign.id, body); }
      catch (e) {
        if (!isOldServer(e)) throw e;
        // servidor antigo: uma iniciativa por vez e o ▶ Iniciar de antes
        for (const x of use.initiatives) {
          // eslint-disable-next-line no-await-in-loop
          await api.updateCombatant(campaign.id, x.id, { initiative: x.initiative });
        }
        if (initCheck) await api.closeCheck(initCheck.id).catch(() => {});
        r = await api.startCombat(campaign.id);
      }
      applyCombat(r?.combat);
      setInitCheck(null);
    } catch (e) { flash(`${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, { error: true }); }
    finally { setBusy(''); load(); }
  };

  // "Usar o combate da cena X": a sala inteira (com os stat blocks) só ao tocar.
  const useSceneFight = async () => {
    if (!sceneFight || busy) return;
    setBusy('scene');
    try {
      const full = await getAdventure(campaign.id, sceneFight.adventure.id);
      const adv = full.adventure || full;
      const node = (adv.data?.nodes || []).find(n => n.id === sceneFight.fight.nodeId);
      if (node) setStartScene(sceneOfNode(adv, node, lang));
    } catch (e) { flash(errorMessage(e, lang), { error: true }); }
    finally { setBusy(''); }
  };

  const removeCombatant = async (cid) => {
    const who = combat?.combatants?.find(c => c.id === cid)?.name || '';
    if (!await ask(lang, t(lang, `Tirar ${who} do combate? (PV e condições dele se perdem.)`, `Remove ${who} from combat? (Its HP and conditions are lost.)`), { danger: true, confirmLabel: t(lang, 'Tirar', 'Remove') })) return;
    await api.removeCombatant(campaign.id, cid);
    if (selected === cid) setSelected(null);
    if (sheet?.id === cid) setSheet(null);
    setPendings(m => { const n = { ...m }; delete n[cid]; return n; });
    load();
  };

  // Linha tocada: no celular abre a folha; no desktop abre/fecha o painel na lista.
  // Com "Vários alvos" ligado, o toque marca o alvo.
  const openRow = (c, tab) => {
    if (marks) { setMarks(m => toggleMark(m, c.id)); return; }
    if (wide && !tab) { setSelected(selected === c.id ? null : c.id); return; }
    setSelected(c.id);
    setSheet({ id: c.id, tab: tab || null });
  };
  const openPad = (c) => {
    if (marks) { setMarks(m => toggleMark(m, c.id)); return; }
    // no PC selecionar abriria o painel embaixo da linha (atrás do teclado): só no celular
    if (!wide) setSelected(c.id);
    setPad({ id: c.id });
  };
  const switchView = (v) => { setView(v); writeView(campaign.id, v); };

  const sel = combatants.find(c => c.id === selected);
  const sheetC = sheet ? combatants.find(c => c.id === sheet.id) : null;
  const padC = pad?.id ? combatants.find(c => c.id === pad.id) : null;
  const bell = combatants.length > 0 && (
    <NudgeBell campaign={campaign} combat={combat} lang={lang} compact={showTurn}
      onChange={() => { load(); onChange?.(); }} />
  );
  const panelProps = (c) => ({
    combatant: c, allCombatants: combatants, campaign, lang, combat,
    pending: pendings[c.id] || null, setPending: setPendingFor(c.id),
    choice: choiceFor(c.id), setChoice: setChoiceFor(c.id),
    onChange: load, onRemove: () => removeCombatant(c.id),
    isCurrentTurn: !!currentTurn && currentTurn.id === c.id,
  });
  const showList = wide || view === 'list';
  // combate vazio: o mapa fica à vista (fundo, quadrado e grade antes de montar o encontro)
  const showMap = wide || view === 'map' || combatants.length === 0;
  // A janela da Tela encaixada (PC, na casca do mestre; a casca decide se ela aparece).
  const docked = wide && table?.win === 'docked';
  const turnLabel = <span className="mesa-turn-label">{t(lang, 'Rodada', 'Round')} {combat.round} · {t(lang, 'Vez de', 'Now acting')}</span>;
  const nMarked = marks ? Object.keys(marks).length : 0;
  const hasMap = !!(combat.map?.backgroundUrl || combat.map?.background_image);
  const stepText = {
    monsters: t(lang, 'Monstros', 'Monsters'),
    pcs: t(lang, 'Personagens', 'Characters'),
    init: t(lang, 'Iniciativa', 'Initiative'),
  };
  const nMon = combatants.filter(c => c.type === 'monster').length;
  const nPc = combatants.filter(c => c.type === 'pc').length;

  return (
    <div className={`combat-tab ${wide ? 'is-wide' : 'is-narrow'} ${marks ? 'is-marking' : ''}`}>
      {showTurn && (
        <div className="ct-turn-wrap">
          <div className="mesa-turn is-now ct-turn" role="region" aria-label={t(lang, 'Turno', 'Turn')}>
            {currentTurn ? (
              <button type="button" className="ct-turn-who" onClick={() => openRow(currentTurn, currentTurn.type === 'pc' ? 'hp' : 'actions')}>
                {turnLabel}
                <span className="ct-turn-name">{currentTurn.name}</span>
                <span className="ct-turn-sub">
                  {t(lang, 'PV', 'HP')} {currentTurn.current_hp}/{(currentTurn.stats || {}).max_hp ?? '?'}
                  <span className="ct-turn-see"> · {currentTurn.type === 'monster' ? t(lang, 'Ver ações', 'See actions') : t(lang, 'Ver ficha', 'See card')} ›</span>
                </span>
              </button>
            ) : (
              <div className="ct-turn-who is-none">
                {turnLabel}
                <span className="ct-turn-name">—</span>
                <span className="ct-turn-sub">{t(lang, 'Toque em Próximo turno para seguir', 'Tap Next turn to continue')}</span>
              </div>
            )}
            {bell}
            <button type="button" className="mesa-btn mesa-btn-lg is-primary ct-next" onClick={nextTurn}
              aria-keyshortcuts="N" title={t(lang, 'Atalho: tecla N', 'Shortcut: N key')}>
              <span>{t(lang, 'Próximo turno', 'Next turn')}{' '}<span aria-hidden="true">→</span></span>
            </button>
          </div>
        </div>
      )}

      <div className="ct-acts" role="group" aria-label={t(lang, 'Ações do combate', 'Combat actions')}>
        <button type="button" className="mesa-btn mesa-btn-lg ct-act" onClick={() => setSheetOpen('ask')} aria-keyshortcuts="P">
          <span aria-hidden="true">🎯</span> {t(lang, 'Pedir teste', 'Ask for a check')}
        </button>
        <button type="button" className="mesa-btn mesa-btn-lg ct-act" onClick={() => setSheetOpen('show')}>
          <span aria-hidden="true">📺</span> {t(lang, 'Mostrar', 'Show')}
        </button>
        <button type="button" className="mesa-btn mesa-btn-lg ct-act ct-more" onClick={() => setShowMore(true)}
          aria-haspopup="dialog" aria-label={t(lang, 'Mais do combate', 'More combat actions')}>
          <span aria-hidden="true">⋯</span> <span className="ct-more-label">{t(lang, 'Combate', 'Combat')}</span>
        </button>
      </div>

      <MesaTitle className="ct-title"
        act={<>
          {!showTurn && bell}
          {active && (
            <button type="button" className="mesa-btn ct-end" onClick={endCombat}>⏸ {t(lang, 'Encerrar', 'End')}</button>
          )}
        </>}
        sub={(
          <span className={`ct-state ${active ? 'is-on' : ''}`}>
            {active
              ? <>{t(lang, 'Em andamento', 'In progress')} · {t(lang, 'rodada', 'round')} {combat.round}</>
              : combatants.length > 0 ? t(lang, 'Montado, ainda não começou', 'Set up, not started yet') : t(lang, 'Vazio', 'Empty')}
          </span>
        )}>
        {t(lang, 'Combate', 'Combat')}
      </MesaTitle>

      <EncounterDifficulty campaign={campaign} combatants={combatants} lang={lang} />

      {!active && (
        <section className="mesa-panel ct-setup" aria-labelledby="ct-setup-h">
          <p className="mesa-eyebrow" id="ct-setup-h">{t(lang, 'Monte o combate em 3 passos', 'Set up combat in 3 steps')}</p>
          {empty && sceneFight && (
            <button type="button" className="mesa-btn mesa-btn-lg is-primary ct-scene-fight" disabled={busy === 'scene'} onClick={useSceneFight}>
              {busy === 'scene' ? '…' : <>⚔ {t(lang, `Usar o combate da cena ${sceneFight.fight.name}`, `Use the combat of scene ${sceneFight.fight.name}`)}</>}
            </button>
          )}
          {empty && sceneFight && (
            <p className="mesa-hint">{sceneFight.fight.monsters.map(m => `${m.count} × ${m.name}`).join(' · ')}</p>
          )}
          <ol className="ct-steps">
            {steps.map((s, i) => (
              <li key={s.id} className={`ct-step ${s.done ? 'is-done' : ''}`}>
                <span className="ct-step-n" aria-hidden="true">{s.done ? '✓' : ['①', '②', '③'][i]}</span>
                <span className="ct-step-main">
                  <strong>{stepText[s.id]}</strong>
                  <span className="ct-step-sub">
                    {s.id === 'monsters' && (nMon ? t(lang, `${nMon} no combate`, `${nMon} in combat`) : t(lang, 'nenhum ainda', 'none yet'))}
                    {s.id === 'pcs' && (nPc ? t(lang, `${nPc} no combate`, `${nPc} in combat`) : t(lang, 'nenhum ainda', 'none yet'))}
                    {s.id === 'init' && (!nPc ? t(lang, 'depois dos personagens', 'after the characters')
                      : s.done ? t(lang, 'todos com iniciativa', 'everyone has initiative')
                        : initCheck ? t(lang, `${use.answered} de ${use.total} responderam`, `${use.answered} of ${use.total} answered`)
                          : t(lang, 'peça à mesa ou digite na linha', 'ask the table or type it on the row'))}
                    {s.done ? <span className="sr-only"> ✓</span> : null}
                  </span>
                </span>
                {s.id === 'monsters' && (
                  <button type="button" className="mesa-btn ct-step-btn" onClick={() => setShowPicker(true)}>✚ {t(lang, 'Monstro', 'Monster')}</button>
                )}
                {s.id === 'pcs' && (
                  <button type="button" className="mesa-btn ct-step-btn" onClick={() => setShowAddPC(true)}>✚ {t(lang, 'Personagem', 'Character')}</button>
                )}
                {s.id === 'init' && nPc > 0 && !s.done && !initCheck && (
                  <button type="button" className="mesa-btn ct-step-btn" disabled={busy === 'init'} onClick={askInitiative}>
                    {busy === 'init' ? '…' : <>⚡ {t(lang, 'Pedir à mesa', 'Ask the table')}</>}
                  </button>
                )}
              </li>
            ))}
          </ol>
          {initCheck && rows.length > 0 && (
            <p className="ct-init-line" aria-live="polite">
              ⚡ {rows.map(r => `${r.name} ${r.answered ? r.total : '…'}`).join(' · ')}
            </p>
          )}
          {combatants.length > 0 && (
            <div className="ct-setup-go">
              {initCheck ? (
                <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy === 'use'} onClick={useAndStart}>
                  {busy === 'use' ? '…' : <>▶ {useLabel(use, lang)}</>}
                </button>
              ) : (
                <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={startCombat} disabled={table?.busy === 'start'}>
                  ▶ {t(lang, 'Iniciar combate', 'Start combat')}
                </button>
              )}
              {initCheck && use.answered < use.total && (
                <p className="mesa-hint">{t(lang, 'Quem não respondeu entra com 10 e fica com ✎ (dá para mudar na folha).', "Whoever didn't answer starts at 10 with ✎ (change it on the card).")}</p>
              )}
            </div>
          )}
          {empty && onNavigate && (
            <button type="button" className="mesa-btn is-quiet ct-prep-link" onClick={() => onNavigate('prep')}>
              {t(lang, 'Ou monte com calma em Preparar →', 'Or set it up calmly in Prepare →')}
            </button>
          )}
        </section>
      )}

      {!wide && combatants.length > 0 && (
        <div className="mesa-seg ct-view" role="tablist" aria-label={t(lang, 'Ver como', 'View as')}>
          {[['list', '☰', t(lang, 'Lista', 'List')], ['map', '🗺', t(lang, 'Mapa', 'Map')]].map(([id, ico, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id}
              className={`mesa-seg-btn ${view === id ? 'active' : ''}`} onClick={() => switchView(id)}>
              <span aria-hidden="true">{ico}</span> {label}
            </button>
          ))}
        </div>
      )}

      {marks && (
        <p className="mesa-hint ct-mark-hint">
          {t(lang, 'Vários alvos: toque nas linhas para marcar; "½ passou" leva a metade.', 'Several targets: tap the rows to mark; "½ saved" takes half.')}
        </p>
      )}

      <div className={`combat-body ${wide ? '' : `is-${view}`} ${docked ? 'has-screen' : ''}`}>
        {docked && (
          <aside className="ct-screen">
            <DockedScreen campaign={campaign} lang={lang} compact={!roomy} />
          </aside>
        )}
        {showList && combatants.length > 0 && (
          <ol className="combatants-list ct-list" aria-label={t(lang, 'Ordem de iniciativa', 'Initiative order')}>
            {combatants.map((c, i) => {
              const isTurn = active && i === combat.turnIndex;
              const isSel = selected === c.id;
              return (
                <li key={c.id} id={`cc-${c.id}`} className={`ct-item ${wide && isSel ? 'is-open' : ''}`}>
                  <CombatantRow combatant={c} campaign={campaign} lang={lang} isTurn={isTurn} isSel={isSel}
                    mark={marksOf[c.id]} answer={answers.get(c.id)} marking={!!marks} marked={marks?.[c.id] || null}
                    expanded={wide ? isSel : undefined} pending={!!pendings[c.id]}
                    onOpen={(tab) => openRow(c, tab)} onPad={() => openPad(c)}
                    onHalf={() => setMarks(m => toggleMark(m, c.id, { half: true }))} />
                  {wide && isSel && !marks && (
                    <div className="ct-inline mesa-panel is-sunk">
                      <CombatantPanel key={c.id} layout="inline" {...panelProps(c)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {showMap && (
          <div className="ct-map">
            {/* toque no token: no celular abre a folha do combatente; no desktop seleciona (o painel abre na lista) */}
            <CombatGrid combat={combat} campaignId={campaign.id} lang={lang} onChange={load} selectedId={selected} setSelectedId={setSelected}
              onTokenTap={(c) => { if (!wide) openRow(c); }} toolsSignal={toolsSignal} />
            {!wide && sel && (
              <div className="ct-map-sel">
                <p className="mesa-eyebrow">{t(lang, 'Selecionado no mapa', 'Selected on the map')}</p>
                <CombatantRow combatant={sel} campaign={campaign} lang={lang} mark={marksOf[sel.id]}
                  isTurn={active && combatants[combat.turnIndex]?.id === sel.id} isSel pending={!!pendings[sel.id]}
                  onOpen={(tab) => openRow(sel, tab)} onPad={() => openPad(sel)} />
              </div>
            )}
          </div>
        )}
      </div>

      {active && (
        <div className="ct-controls ct-adds">
          <button type="button" className="mesa-btn ct-add" onClick={() => setShowPicker(true)}>
            ✚ {t(lang, 'Monstro', 'Monster')}
          </button>
          <button type="button" className="mesa-btn ct-add" onClick={() => setShowAddPC(true)}>
            ✚ {t(lang, 'Personagem', 'Character')}
          </button>
        </div>
      )}

      {marks && (
        <div className="ct-multi-bar" role="region" aria-label={t(lang, 'Vários alvos', 'Several targets')}>
          <span className="ct-multi-n" aria-live="polite">
            {t(lang, `${nMarked} alvo${nMarked === 1 ? '' : 's'}`, `${nMarked} target${nMarked === 1 ? '' : 's'}`)}
          </span>
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={() => setMarks(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={!nMarked} onClick={() => setPad({ multi: true })}>
            {t(lang, 'Digitar o dano', 'Type the damage')} →
          </button>
        </div>
      )}

      {sheetC && (
        <CombatantSheet key={sheetC.id} initialTab={sheet.tab} {...panelProps(sheetC)} onClose={() => setSheet(null)} />
      )}
      {padC && !marks && (
        <DamagePad key={padC.id} campaign={campaign} combat={combat} lang={lang} target={padC}
          onClose={() => setPad(null)} onApplied={(c) => { if (!table?.applyCombat) { setCombat(c); seeRef.current(c.updatedAt); } }}
          onMulti={() => { setPad(null); setMarks({ [padC.id]: { half: false } }); }}
          onConditions={() => { setPad(null); openRow(padC, 'conditions'); }}
          onSheet={() => { setPad(null); openRow(padC, 'hp'); }} />
      )}
      {pad?.multi && marks && (
        <DamagePad campaign={campaign} combat={combat} lang={lang} marks={marks}
          onClose={() => setPad(null)} onApplied={(c) => { setMarks(null); if (!table?.applyCombat) { setCombat(c); seeRef.current(c.updatedAt); } }}
          onMulti={() => setPad(null)} />
      )}
      {showMore && (
        <MoreSheet campaign={campaign} combat={combat} lang={lang} active={active} hasMap={hasMap}
          onClose={() => setShowMore(false)} onStart={startCombat} onReset={resetCombat} onChange={onChange}
          onTools={() => { setShowMore(false); if (!wide) switchView('map'); setToolsSignal(n => n + 1); }} />
      )}
      {sheetOpen === 'ask' && (
        <GroupCheckPanel campaign={campaign} lang={lang} showList={false} asSheet onClose={() => setSheetOpen(null)}
          onSent={() => setSheetOpen(null)} />
      )}
      {sheetOpen === 'show' && (
        <Suspense fallback={null}>
          <ShowSheet campaign={campaign} stage={campaign.stage || campaign.state?.stage} lang={lang} onClose={() => setSheetOpen(null)} onChange={onChange} />
        </Suspense>
      )}
      {startScene && (
        <StartCombatSheet campaign={campaign} lang={lang} scene={startScene} combat={combat}
          onClose={() => setStartScene(null)} onStarted={(r) => { applyCombat(r?.combat); load(); }} />
      )}
      {wrapUp && (
        <EndOfEncounterPanel campaign={campaign} combat={wrapUp} lang={lang} onNavigate={onNavigate}
          onClose={() => { setWrapUp(null); backToNow(); }} onChange={() => { load(); onChange?.(); }} />
      )}
      {showPicker && <MonsterPicker lang={lang} levelingMode={campaign.state?.levelingMode || 'milestone'} members={campaign.members} onPick={addMonster} onClose={() => setShowPicker(false)} />}
      {showAddPC && (
        <AddCharacterSheet campaign={campaign} lang={lang} combatants={combatants}
          onAdd={addPCs} onClose={() => setShowAddPC(false)} />
      )}
    </div>
  );
}

/**
 * Linha do combatente (56 px): iniciativa, retrato, nome em até 2 linhas, a marca da
 * vez (✓ agiu esmaecida · ▶ agora dourada · † caiu) e os chips de condição; à direita
 * a pílula de PV (72×44), que abre o teclado de dano. O toque no resto da linha abre a
 * folha (celular) ou o painel (desktop). Com "Vários alvos" (`marking`), a caixa de
 * 48 px marca o alvo e o chip "½ passou" aparece no marcado. Os chips de condição da
 * linha só mostram: tirar é na folha (que pergunta antes). Com a iniciativa pedida à
 * mesa, a resposta aparece na linha ("⚡ 14"); "✎" = entrou com 10, sem responder.
 */
function CombatantRow({
  combatant: c, campaign, lang, isTurn, isSel, expanded, pending, mark = null, answer = null,
  marking = false, marked = null, onOpen, onPad, onHalf,
}) {
  const conds = c.conditions || [];
  const fromSheet = useMemo(() => sheetConditions(c, campaign), [c, campaign]);
  const member = c.type === 'pc' ? (campaign.members || []).find(m => m.character?.id === c.character_id) : null;
  const stats = member ? memberStats(member) : null;
  const down = (c.current_hp || 0) <= 0;
  const nChips = conds.length + fromSheet.length;
  const kind = c.type === 'monster' ? t(lang, 'Monstro', 'Monster') : t(lang, 'Personagem', 'Character');
  const condText = [
    ...conds.map(cond => {
      const r = condRounds(c, cond);
      return conditionLabel(cond, lang) + (r != null ? t(lang, ` (${r} rodada(s))`, ` (${r} round(s))`) : '');
    }),
    ...fromSheet.map(cond => `${conditionLabel(cond, lang)} (${t(lang, 'ficha', 'sheet')})`),
  ].join(', ');
  const markText = markLabel(mark, lang);
  const status = [
    markText,
    mark === 'now' && c.type === 'monster' ? t(lang, 'Ações ›', 'Actions ›') : null,
    c.defeated && mark !== 'down' ? t(lang, 'derrotado', 'defeated') : null,
    c.type === 'pc' && down && mark !== 'down' ? t(lang, 'caído', 'down') : null,
    answer != null ? `⚡ ${answer}` : null,
  ].filter(Boolean).join(' · ');
  const label = [
    c.name, kind, `${t(lang, 'iniciativa', 'initiative')} ${c.initiative}${c.init_guess ? t(lang, ' (sem resposta)', ' (no answer)') : ''}`,
    condText ? `${t(lang, 'condições', 'conditions')}: ${condText}` : null,
    status || null,
    pending ? t(lang, 'sugestão em aberto', 'pending suggestion') : null,
  ].filter(Boolean).join(', ');
  const hpText = `${c.current_hp ?? '?'}/${c.stats?.max_hp ?? '?'}`;
  return (
    <div className={`ct-row type-${c.type} ${isTurn ? 'is-turn' : ''} ${isSel ? 'is-sel' : ''} ${c.defeated ? 'is-defeated' : ''} ${nChips || status ? 'has-conds' : ''} ${mark ? `mark-${mark}` : ''} ${marking ? 'is-marking' : ''} ${marked ? 'is-marked' : ''}`}>
      {marking ? (
        <button type="button" className={`ct-mark-box ${marked ? 'is-on' : ''}`} role="checkbox" aria-checked={!!marked}
          aria-label={t(lang, `Alvo: ${c.name}`, `Target: ${c.name}`)} onClick={() => onOpen()}>
          <span aria-hidden="true">{marked ? '✓' : ''}</span>
        </button>
      ) : (
        <span className={`ct-init ${c.init_guess ? 'is-guess' : ''}`} aria-hidden="true">{c.initiative}{c.init_guess ? '✎' : ''}</span>
      )}
      <span className="ct-pic" aria-hidden="true">
        {c.type === 'monster'
          ? <ArtThumb src={apiUrl(c.sprite) || monsterArt(c.monster_id)} emoji={monsterEmoji(c.stats?.type)} size={36} round lang={lang} />
          : <PcPortrait stats={stats} name={c.name} size={36} />}
      </span>
      <button type="button" className="ct-open" onClick={() => onOpen()} aria-label={label}
        aria-expanded={marking ? undefined : expanded} aria-haspopup={!marking && expanded === undefined ? 'dialog' : undefined}>
        <span className="ct-name">{c.name}</span>
      </button>
      {(nChips > 0 || status || marked) && (
        <div className="ct-conds">
          {status && <span className={`ct-mark ${mark ? `is-${mark}` : ''}`} aria-hidden="true">{status}</span>}
          {pending && <span className="ct-pending" aria-hidden="true">⚔</span>}
          {conds.map(cond => (
            <ConditionChip key={cond} cond={cond} rounds={condRounds(c, cond)} lang={lang} className="is-mini" />
          ))}
          {fromSheet.map(cond => <ConditionChip key={`f-${cond}`} cond={cond} lang={lang} fromSheet className="is-mini" />)}
          {marked && (
            <button type="button" className={`mesa-chip ct-half ${marked.half ? 'active' : ''}`} aria-pressed={!!marked.half} onClick={onHalf}>
              ½ {t(lang, 'passou', 'saved')}
            </button>
          )}
        </div>
      )}
      <button type="button" className="ct-hp-pill" onClick={onPad}
        aria-label={marking ? t(lang, `Alvo: ${c.name}`, `Target: ${c.name}`) : t(lang, `PV ${hpText} de ${c.name}: dano ou cura`, `${c.name} HP ${hpText}: damage or heal`)}>
        <HpBar hp={c.current_hp} max={c.stats?.max_hp} temp={c.temp_hp} lang={lang} compact className="ct-hp" />
      </button>
    </div>
  );
}

/** ⋯ Combate: ▶ Iniciar · Registro recente · Ferramentas do mapa · Fim guiado · Recomeçar (por último). */
function MoreSheet({ campaign, combat, lang, active, hasMap, onClose, onStart, onReset, onTools, onChange }) {
  const [resetting, setResetting] = useState(false);
  const [wizardLocal, setWizardLocal] = useState(null);
  const [saving, setSaving] = useState(false);
  const wizardOn = wizardLocal ?? isWizardEnabled(campaign.state);
  const lines = (combat.log || []).slice(-8).map(e => logLine(e, lang)).filter(Boolean).reverse();
  const n = (combat.combatants || []).length;
  const setWizard = async (on) => {
    setWizardLocal(on); setSaving(true);
    try { await patchState(campaign.id, { endOfEncounterWizard: stateWithWizard(campaign.state, on).endOfEncounterWizard }); onChange?.(); }
    catch (e) { setWizardLocal(null); flash(errorMessage(e, lang), { error: true }); }
    finally { setSaving(false); }
  };
  return (
    <MesaSheet title={t(lang, 'Combate', 'Combat')} icon="⋯" size="auto" width="sm" lang={lang} dock="play"
      onClose={onClose} className="ct-more-sheet">
      <div className="ct-more-list">
        {!active && n > 0 && (
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={onStart}>▶ {t(lang, 'Iniciar combate', 'Start combat')}</button>
        )}
        <details className="combat-log ct-log">
          <summary>{t(lang, 'Registro recente', 'Recent log')} <span className="ct-log-n">({lines.length})</span></summary>
          {lines.length ? <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p className="mesa-hint">{t(lang, 'Nada ainda.', 'Nothing yet.')}</p>}
        </details>
        <button type="button" className="mesa-btn mesa-btn-lg" onClick={onTools}>🛠 {t(lang, 'Ferramentas do mapa', 'Map tools')}</button>
        <label className="cs-check ct-wizard">
          <input type="checkbox" checked={wizardOn} disabled={saving} onChange={e => setWizard(e.target.checked)} />
          <span>
            <strong>{t(lang, 'Fim de combate guiado', 'Guided end of combat')}</strong>
            <span className="ct-wizard-hint">{t(lang, 'Ao encerrar: XP, descanso, tesouro da cena e nota no Diário (tudo opcional).', 'When it ends: XP, rest, the scene treasure and a Diary note (all optional).')}</span>
          </span>
        </label>
        {!resetting ? (
          <button type="button" className="mesa-btn mesa-btn-lg is-danger" onClick={() => setResetting(true)} disabled={!n && !hasMap}>
            ↺ {t(lang, 'Recomeçar do zero', 'Start over')}
          </button>
        ) : (
          <div className="ct-reset" role="group" aria-label={t(lang, 'Recomeçar do zero', 'Start over')}>
            <p><strong>{t(lang, 'Recomeçar do zero?', 'Start over?')}</strong> {t(lang, 'Todos os combatentes saem do combate (não dá para desfazer).', 'Every combatant leaves combat (cannot be undone).')}</p>
            {hasMap && <p>{t(lang, 'Manter o mapa?', 'Keep the map?')}</p>}
            <div className="ct-reset-btns">
              {hasMap ? (
                <>
                  <button type="button" className="mesa-btn mesa-btn-lg is-danger" onClick={() => onReset(true)}>{t(lang, 'Recomeçar e manter o mapa', 'Start over, keep the map')}</button>
                  <button type="button" className="mesa-btn mesa-btn-lg is-danger" onClick={() => onReset(false)}>{t(lang, 'Recomeçar sem o mapa', 'Start over without the map')}</button>
                </>
              ) : (
                <button type="button" className="mesa-btn mesa-btn-lg is-danger" onClick={() => onReset(true)}>{t(lang, 'Recomeçar', 'Start over')}</button>
              )}
              <button type="button" className="mesa-btn mesa-btn-lg" onClick={() => setResetting(false)}>{t(lang, 'Cancelar', 'Cancel')}</button>
            </div>
          </div>
        )}
        {!resetting && <p className="mesa-hint">{t(lang, 'Recomeçar tira todos os combatentes (pergunta antes e pergunta se o mapa fica).', 'Start over removes every combatant (asks first, and asks whether the map stays).')}</p>}
      </div>
    </MesaSheet>
  );
}

/**
 * Adicionar personagens ao combate (folha "tall"): a iniciativa que o jogador rolou
 * na mesa (dado físico) ou em branco (entra com 10 e "✎"; dá para pedir a iniciativa
 * à mesa no passo ③). "Adicionar todos" vai numa chamada, cada um numa casa livre.
 */
function AddCharacterSheet({ campaign, lang, combatants, onAdd, onClose }) {
  const inFight = new Set(combatants.filter(c => c.type === 'pc').map(c => c.character_id));
  const members = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
  const [inits, setInits] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const bonusOf = (m) => {
    try { const d = m.character.data; return d && d.abilities ? Utils.initiative(d) : null; } catch { return null; }
  };
  const add = async (list) => {
    setBusy(list.length > 1 ? 'all' : list[0].characterId); setError('');
    try { await onAdd(list); }
    catch (e) { setError(errorMessage(e, lang)); return false; }
    finally { setBusy(null); }
    return true;
  };
  const addOne = async (m) => {
    if (!await add([{ characterId: m.character.id, initiative: inits[m.character.id] }])) return;
    // Todos já no combate → fecha sozinho (não fica bloqueando o Iniciar combate).
    if (members.every(x => x.character.id === m.character.id || inFight.has(x.character.id))) onClose();
  };
  const addAll = async () => {
    const list = members.filter(m => !inFight.has(m.character.id)).map(m => ({ characterId: m.character.id, initiative: inits[m.character.id] }));
    if (list.length && await add(list)) onClose();
  };
  const missing = members.filter(m => !inFight.has(m.character.id)).length;
  const footer = (
    <div className="mesa-actions ct-addpc-foot">
      {missing > 1 && (
        <button type="button" className="mesa-btn mesa-btn-lg" disabled={!!busy} onClick={addAll}>{busy === 'all' ? '…' : t(lang, 'Adicionar todos', 'Add everyone')}</button>
      )}
      <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={onClose}>✓ {t(lang, 'Pronto', 'Done')}</button>
    </div>
  );
  return (
    <MesaSheet title={t(lang, 'Adicionar personagem ao combate', 'Add character to combat')} icon="✚" size="tall" width="md" dock="play"
      lang={lang} onClose={onClose} footer={footer} className="ct-addpc-sheet">
      <p className="mesa-sheet-text">
        {t(lang, 'Digite a iniciativa que cada jogador rolou (dado físico). Em branco = 10 com ✎ (peça a iniciativa à mesa no passo ③). O 🎲 só preenche o campo com d20 + bônus.', 'Type the initiative each player rolled (physical die). Blank = 10 with ✎ (ask the table for initiative in step ③). 🎲 just fills the field with d20 + bonus.')}
      </p>
      {error && <div className="cc-action-error" role="alert">{error}</div>}
      <ul className="ct-addpc-list">
        {members.map(m => {
          const id = m.character.id;
          const bonus = bonusOf(m);
          const already = inFight.has(id);
          return (
            <li key={m.id} className={`add-pc-row ct-addpc-row ${already ? 'is-in' : ''}`}>
              <PcPortrait stats={memberStats(m)} name={m.character.name} size={40} />
              <div className="add-pc-who">
                <strong>{m.character.name}</strong>
                <span className="ct-addpc-sub">{m.user?.displayName}{bonus != null ? ` · ${t(lang, 'iniciativa', 'initiative')} ${bonus >= 0 ? '+' : ''}${bonus}` : ''}</span>
              </div>
              {already ? (
                <span className="ct-addpc-in">✓ {t(lang, 'no combate', 'in combat')}</span>
              ) : (
                <div className="add-pc-actions">
                  <input className="input" type="number" inputMode="numeric" value={inits[id] ?? ''} placeholder="10"
                    onChange={e => setInits(v => ({ ...v, [id]: e.target.value }))}
                    aria-label={t(lang, `Iniciativa de ${m.character.name}`, `${m.character.name} initiative`)} />
                  <button type="button" className="mesa-icon-btn ct-roll"
                    aria-label={t(lang, `Rolar d20 + bônus para ${m.character.name} (só preenche o campo)`, `Roll d20 + bonus for ${m.character.name} (just fills the field)`)}
                    onClick={() => setInits(v => ({ ...v, [id]: String(1 + Math.floor(Math.random() * 20) + (bonus || 0)) }))}>🎲</button>
                  <button type="button" className="mesa-btn is-primary" disabled={!!busy} onClick={() => addOne(m)}>
                    {busy === id ? '…' : t(lang, 'Adicionar', 'Add')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {members.length === 0 && (
        <p className="mesa-sheet-text">{t(lang, 'Nenhum jogador com personagem ainda.', 'No player with a character yet.')}</p>
      )}
    </MesaSheet>
  );
}
