import { errorMessage } from '../api/errors.js';
import { freePositions } from '../combat/placement.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { COMBAT_EVENT, useOnRev, useTable } from '../play/table-store.js';
import { DockedScreen } from '../stage/ScreenWindow.jsx';
import useMedia from '../play/useMedia.js';
import MonsterPicker from './MonsterPicker.jsx';
import CombatGrid from './CombatGrid.jsx';
import EncounterDifficulty from '../combat/EncounterDifficulty.jsx';
import { NudgeBell } from './NudgeList.jsx';
import EndOfEncounterPanel from './EndOfEncounterPanel.jsx';
import CombatantSheet, { CombatantPanel, ConditionChip, condRounds, sheetConditions } from './CombatantSheet.jsx';
import { isWizardEnabled } from './end-of-encounter.js';
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

/**
 * Jogar › Combate (só mestre).
 * - Faixa do turno presa no topo: "Rodada N · Vez de X", 🔔 avisos e Próximo turno.
 * - Iniciar / Encerrar, ✚ Monstro, ✚ Personagem e o ⋯ (Recomeçar).
 * - Dificuldade do encontro, Lista | Mapa (celular) e o registro recente.
 * - Cada combatente é uma linha curta (CombatantRow). No celular o toque abre a
 *   folha do combatente (CombatantSheet); no desktop o painel abre na lista e o
 *   mapa fica preso ao lado.
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
 * barra quando todos os monstros caíram.
 */
export default function CombatTab({ campaign, lang, onChange, onNavigate, turnStrip: ownStrip = true, params = null }) {
  const table = useTable();
  const [combat, setCombat] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showAddPC, setShowAddPC] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selected, setSelected] = useState(null); // combatente selecionado (linha e mapa)
  const [sheet, setSheet] = useState(null); // { id, tab } — folha aberta (celular/tablet)
  const [wrapUp, setWrapUp] = useState(null); // combate encerrado → Fim de encontro (opt-in)
  const [pendings, setPendings] = useState({}); // sugestão em aberto por combatente
  const [choices, setChoices] = useState({}); // alvos escolhidos por combatente:ação
  const [view, setView] = useState(() => readView(campaign.id));
  const wide = useWide();
  const roomy = useMedia('(min-width: 1280px)');   // a Tela encaixada ganha a 3ª coluna

  const seeRef = useRef(() => {});
  const load = useCallback(async () => {
    try {
      const r = await api.getCombat(campaign.id);
      setCombat(r.combat);
      seeRef.current(r.combat?.updatedAt);
    } catch (e) { console.warn(e); }
  }, [campaign.id]);

  useEffect(() => { load(); }, [load]);
  // Com o pulso: só quando o combate muda (e 1 vez por minuto); sem ele, a cada 2,5 s, como antes.
  // A versão que já chegou (por esta busca ou pela resposta de uma ação) conta como vista:
  // o pulso que traz o mesmo `ver` não busca o combate de novo.
  seeRef.current = useOnRev(table?.combat?.ver, load, { table, fallbackMs: 2500, initial: false });
  // O combate que voltou de uma ação da barra, da faixa ou da tecla N: na hora, sem buscar de novo.
  useEffect(() => {
    const on = (e) => {
      if (String(e.detail?.campaignId) !== String(campaign.id) || !e.detail?.combat) return;
      setCombat(e.detail.combat);
      seeRef.current(e.detail.combat.updatedAt);
    };
    window.addEventListener(COMBAT_EVENT, on);
    return () => window.removeEventListener(COMBAT_EVENT, on);
  }, [campaign.id]);

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
    // Monstro abre nas Ações; PJ (o jogador age pela ficha) na aba padrão dele.
    if (!wide) setSheet({ id: who.id, tab: who.type === 'monster' ? 'actions' : null });
    else requestAnimationFrame(() => document.getElementById(`cc-${who.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [combat, params, wide]);

  // Quando a vez muda, quem age fica selecionado (destaque na lista e no mapa).
  // Só seleciona — não rola a tela, não abre folha, não age por ninguém.
  const turnKey = combat?.active ? `${combat.round}:${combat.turnIndex}:${combat.combatants?.[combat.turnIndex]?.id || ''}` : '';
  const lastTurnKey = useRef(null);
  useEffect(() => {
    if (!turnKey) { lastTurnKey.current = null; return; }
    if (lastTurnKey.current === turnKey) return;
    lastTurnKey.current = turnKey;
    const who = combat?.combatants?.[combat.turnIndex];
    if (who) setSelected(who.id);
  }, [turnKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const combatants = combat?.combatants || [];
  // a folha fecha se o combatente saiu do combate
  useEffect(() => {
    if (sheet && combat && !combatants.some(c => c.id === sheet.id)) setSheet(null);
  }, [sheet, combat, combatants]);

  const setPendingFor = useCallback((id) => (p) => setPendings(m => ({ ...m, [id]: p })), []);
  const choiceFor = useCallback((id) => (index) => choices[`${id}:${index}`] || {}, [choices]);
  const setChoiceFor = useCallback((id) => (index, patch) => setChoices(m => {
    const k = `${id}:${index}`;
    return { ...m, [k]: { ...(m[k] || {}), ...patch } };
  }), []);

  if (!combat) return <div className="combat-tab is-loading"><p className="muted">{t(lang, 'Carregando combate…', 'Loading combat…')}</p></div>;

  const active = !!combat.active;
  const currentTurn = active ? combatants[combat.turnIndex] : null;
  // A faixa (com o Próximo turno) depende só de haver combate em andamento: a vez
  // pode apontar para fora da lista (tiraram o último da ordem na vez dele) e o
  // Próximo turno é o que a traz de volta (o servidor faz (vez + 1) % total).
  // Na casca do mestre ela mora na barra da mesa (celular) e no topo de Jogar (PC).
  const showTurn = ownStrip && active && combatants.length > 0;

  const startCombat = async () => { await api.startCombat(campaign.id); load(); };
  const endCombat = async () => {
    if (!await ask(lang, t(lang, 'Encerrar o combate?', 'End combat?'), { confirmLabel: t(lang, 'Encerrar', 'End') })) return;
    const r = await api.endCombat(campaign.id); load();
    if (isWizardEnabled(campaign.state)) setWrapUp(r?.combat || combat);
  };
  endCombatRef.current = endCombat;
  const resetCombat = async () => {
    if (!await ask(lang, t(lang, 'Recomeçar do zero? Todos os combatentes saem do combate.', 'Start over? All combatants are removed.'), { danger: true, confirmLabel: t(lang, 'Recomeçar', 'Start over') })) return;
    setShowMore(false);
    await api.resetCombat(campaign.id); load();
  };
  // Próximo turno com a vez que está à vista (o servidor recusa se ela já mudou).
  const nextTurn = async () => {
    const expect = { round: combat.round, turnIndex: combat.turnIndex };
    if (table?.enabled) { table.nextTurn(expect); return; }
    try { await api.combatNextTurn(campaign.id, expect); } catch { /* 409: a vez já tinha passado */ }
    load();
  };

  const gridOpts = () => {
    const m = combat?.map || {};
    return { grid: m.grid_size_px || 50, width: m.width_px || 1200, height: m.height_px || 800 };
  };

  const addMonster = async (monster, count, initiative) => {
    // Snapshot do bestiário (ações/bônus/reações/lendárias numa lista com `kind`).
    const snap = monsterForCombat(resolveCatalogMonster(monster));
    const base = (typeof snap.name === 'object' ? (snap.name?.[lang] || snap.name?.en) : snap.name) || 'Monster';
    const tokenScale = snap.size === 'Large' ? 2 : snap.size === 'Huge' ? 3 : snap.size === 'Gargantuan' ? 4 : snap.size === 'Tiny' ? 0.5 : 1;
    // Próximas células livres do grid (antes todos nasciam em (100,100) e empilhavam).
    const spots = freePositions(combatants, count, { ...gridOpts(), scale: tokenScale, start: { x: 100, y: 100 } });
    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line no-await-in-loop
      await api.addCombatant(campaign.id, {
        type: 'monster',
        monster: { ...snap, name: count > 1 ? `${base} #${i + 1}` : base },
        initiative, // exatamente o que o mestre digitou (nunca alterado pelo app)
        position: spots[i],
        tokenScale,
      });
    }
    setShowPicker(false);
    load();
  };

  // Iniciativa do personagem: o mestre digita o que o jogador rolou na mesa
  // (dado físico); "rolar" só preenche o campo com d20 + bônus da ficha.
  const addPC = async (characterId, initiative) => {
    const n = parseInt(initiative, 10);
    const [spot] = freePositions(combatants, 1, { ...gridOpts(), start: { x: 100, y: 200 } });
    await api.addCombatant(campaign.id, {
      type: 'pc',
      characterId,
      initiative: Number.isFinite(n) ? n : 10,
      position: spot,
      tokenScale: 1,
    });
    load();
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
  const openRow = (c, tab) => {
    if (wide) { setSelected(selected === c.id ? null : c.id); return; }
    setSelected(c.id);
    setSheet({ id: c.id, tab: tab || null });
  };
  const seeCurrent = () => {
    if (!currentTurn) return;
    // Monstro abre nas Ações; PJ (o jogador age pela ficha) na aba padrão dele (Dano/Cura).
    if (!wide) { openRow(currentTurn, currentTurn.type === 'pc' ? null : 'actions'); return; }
    setSelected(currentTurn.id);
    requestAnimationFrame(() => document.getElementById(`cc-${currentTurn.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const switchView = (v) => { setView(v); writeView(campaign.id, v); };

  const sel = combatants.find(c => c.id === selected);
  const sheetC = sheet ? combatants.find(c => c.id === sheet.id) : null;
  const bell = combatants.length > 0 && (
    <NudgeBell campaign={campaign} combat={combat} lang={lang} compact={showTurn}
      onChange={() => { load(); onChange?.(); }} />
  );
  const panelProps = (c) => ({
    combatant: c, allCombatants: combatants, campaign, lang,
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

  return (
    <div className={`combat-tab ${wide ? 'is-wide' : 'is-narrow'}`}>
      {showTurn && (
        <div className="ct-turn-wrap">
          <div className="mesa-turn is-now ct-turn" role="region" aria-label={t(lang, 'Turno', 'Turn')}>
            {currentTurn ? (
              <button type="button" className="ct-turn-who" onClick={seeCurrent}>
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
              <span>{t(lang, 'Próximo turno', 'Next turn')}{'\u00a0'}<span aria-hidden="true">→</span></span>
            </button>
          </div>
        </div>
      )}

      <MesaTitle className="ct-title"
        act={<>
          <span className={`ct-state ${active ? 'is-on' : ''}`}>
            {active
              ? <>{t(lang, 'Em andamento', 'In progress')} · {t(lang, 'rodada', 'round')} {combat.round}</>
              : combatants.length > 0 ? t(lang, 'Parado', 'Paused') : t(lang, 'Vazio', 'Empty')}
          </span>
          {!showTurn && bell}
        </>}>
        {t(lang, 'Combate', 'Combat')}
      </MesaTitle>

      <div className="ct-controls">
        {!active ? (
          <button type="button" className="mesa-btn mesa-btn-lg is-primary ct-main" onClick={startCombat} disabled={combatants.length === 0}>
            ▶ {t(lang, 'Iniciar combate', 'Start combat')}
          </button>
        ) : (
          <button type="button" className="mesa-btn mesa-btn-lg ct-main" onClick={endCombat}>
            ⏸ {t(lang, 'Encerrar combate', 'End combat')}
          </button>
        )}
        <button type="button" className="mesa-btn ct-add" onClick={() => setShowPicker(true)}>
          ✚ {t(lang, 'Monstro', 'Monster')}
        </button>
        <button type="button" className="mesa-btn ct-add" onClick={() => setShowAddPC(true)}>
          ✚ {t(lang, 'Personagem', 'Character')}
        </button>
        {combatants.length > 0 && (
          <button type="button" className="mesa-btn ct-more" onClick={() => setShowMore(true)}
            aria-haspopup="dialog" aria-label={t(lang, 'Mais ações do combate', 'More combat actions')}>
            <span aria-hidden="true">⋯</span><span className="ct-more-label">{t(lang, 'Mais', 'More')}</span>
          </button>
        )}
      </div>

      {combatants.length === 0 && (
        <div className="combat-empty-hint">
          <p>
            <strong>{t(lang, 'Nada no combate ainda.', 'Nothing in combat yet.')}</strong>{' '}
            {t(lang,
              'Adicione monstros e os personagens dos jogadores (com a iniciativa que rolaram na mesa) e toque em Iniciar combate.',
              'Add monsters and the players’ characters (with the initiative they rolled at the table), then tap Start combat.')}
          </p>
          {onNavigate && (
            <button type="button" className="mesa-btn is-quiet ct-prep-link" onClick={() => onNavigate('prep')}>
              {t(lang, 'Ou monte o encontro com calma em Preparar →', 'Or build the encounter calmly in Prepare →')}
            </button>
          )}
        </div>
      )}

      <EncounterDifficulty campaign={campaign} combatants={combatants} lang={lang} />

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
                    expanded={wide ? isSel : undefined} pending={!!pendings[c.id]}
                    onOpen={(tab) => openRow(c, tab)} />
                  {wide && isSel && (
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
              onTokenTap={(c) => { if (!wide) openRow(c); }} />
            {!wide && sel && (
              <div className="ct-map-sel">
                <p className="mesa-eyebrow">{t(lang, 'Selecionado no mapa', 'Selected on the map')}</p>
                <CombatantRow combatant={sel} campaign={campaign} lang={lang}
                  isTurn={active && combatants[combat.turnIndex]?.id === sel.id} isSel pending={!!pendings[sel.id]}
                  onOpen={(tab) => openRow(sel, tab)} />
              </div>
            )}
          </div>
        )}
      </div>

      <CombatLog log={combat.log} lang={lang} />

      {sheetC && (
        <CombatantSheet key={sheetC.id} initialTab={sheet.tab} {...panelProps(sheetC)} onClose={() => setSheet(null)} />
      )}
      {showMore && (
        <MesaSheet title={t(lang, 'Mais do combate', 'More combat actions')} icon="⋯" size="auto" width="sm" lang={lang}
          onClose={() => setShowMore(false)} className="ct-more-sheet">
          <div className="ct-more-list">
            <button type="button" className="mesa-btn mesa-btn-lg is-danger" onClick={resetCombat}>
              ↺ {t(lang, 'Recomeçar do zero', 'Start over')}
            </button>
            <p className="mesa-hint">{t(lang, 'Tira todos os combatentes e recomeça (pede confirmação).', 'Removes all combatants and starts over (asks first).')}</p>
          </div>
        </MesaSheet>
      )}
      {wrapUp && (
        <EndOfEncounterPanel campaign={campaign} combat={wrapUp} lang={lang} onNavigate={onNavigate}
          onClose={() => setWrapUp(null)} onChange={() => { load(); onChange?.(); }} />
      )}
      {showPicker && <MonsterPicker lang={lang} levelingMode={campaign.state?.levelingMode || 'milestone'} onPick={addMonster} onClose={() => setShowPicker(false)} />}
      {showAddPC && (
        <AddCharacterSheet campaign={campaign} lang={lang} combatants={combatants}
          onAdd={addPC} onClose={() => setShowAddPC(false)} />
      )}
    </div>
  );
}

/**
 * Linha do combatente (64–72 px): iniciativa, retrato, nome em até 2 linhas,
 * chips de condição (rodadas restantes), selo Monstro/Personagem e barra de PV.
 * O toque em qualquer ponto da linha (chips e barra de PV incluídos) abre a
 * folha (celular) ou o painel (desktop). Os chips da linha só mostram: tirar
 * uma condição é na folha/painel (chips de 44 px e a aba Condições, que
 * perguntam antes). As condições da ficha do jogador aparecem marcadas "ficha".
 */
function CombatantRow({ combatant: c, campaign, lang, isTurn, isSel, expanded, pending, onOpen }) {
  const conds = c.conditions || [];
  const fromSheet = useMemo(() => sheetConditions(c, campaign), [c, campaign]);
  const member = c.type === 'pc' ? (campaign.members || []).find(m => m.character?.id === c.character_id) : null;
  const stats = member ? memberStats(member) : null;
  const down = (c.current_hp || 0) <= 0;
  const nChips = conds.length + fromSheet.length;
  const kind = c.type === 'monster' ? t(lang, 'Monstro', 'Monster') : t(lang, 'Personagem', 'Character');
  const badge = c.defeated ? t(lang, 'Derrotado', 'Defeated')
    : c.type === 'pc' && down ? t(lang, 'Caído', 'Down')
      : c.type === 'monster' ? t(lang, 'Monstro', 'Monster') : t(lang, 'PJ', 'PC');
  const condText = [
    ...conds.map(cond => {
      const r = condRounds(c, cond);
      return conditionLabel(cond, lang) + (r != null ? t(lang, ` (${r} rodada(s))`, ` (${r} round(s))`) : '');
    }),
    ...fromSheet.map(cond => `${conditionLabel(cond, lang)} (${t(lang, 'ficha', 'sheet')})`),
  ].join(', ');
  const label = [
    c.name, kind, `${t(lang, 'iniciativa', 'initiative')} ${c.initiative}`,
    `${t(lang, 'PV', 'HP')} ${c.current_hp}/${c.stats?.max_hp ?? '?'}`,
    condText ? `${t(lang, 'condições', 'conditions')}: ${condText}` : null,
    isTurn ? t(lang, 'vez dele', 'their turn') : null,
    c.defeated ? t(lang, 'derrotado', 'defeated') : null,
    pending ? t(lang, 'sugestão em aberto', 'pending suggestion') : null,
  ].filter(Boolean).join(', ');
  return (
    <div className={`ct-row type-${c.type} ${isTurn ? 'is-turn' : ''} ${isSel ? 'is-sel' : ''} ${c.defeated ? 'is-defeated' : ''} ${nChips ? 'has-conds' : ''}`}>
      <span className="ct-init" aria-hidden="true">{c.initiative}</span>
      <span className="ct-pic" aria-hidden="true">
        {c.type === 'monster'
          ? <ArtThumb src={c.sprite || monsterArt(c.monster_id)} emoji={monsterEmoji(c.stats?.type)} size={40} round lang={lang} />
          : <PcPortrait stats={stats} name={c.name} size={40} />}
      </span>
      <button type="button" className="ct-open" onClick={() => onOpen()} aria-label={label}
        aria-expanded={expanded} aria-haspopup={expanded === undefined ? 'dialog' : undefined}>
        <span className="ct-name">{c.name}</span>
      </button>
      {nChips > 0 && (
        <div className="ct-conds" aria-hidden="true">
          {conds.map(cond => (
            <ConditionChip key={cond} cond={cond} rounds={condRounds(c, cond)} lang={lang} className="is-mini" />
          ))}
          {fromSheet.map(cond => <ConditionChip key={`f-${cond}`} cond={cond} lang={lang} fromSheet className="is-mini" />)}
        </div>
      )}
      <span className="ct-side" aria-hidden="true">
        <HpBar hp={c.current_hp} max={c.stats?.max_hp} temp={c.temp_hp} lang={lang} compact className="ct-hp" />
        <span className="ct-kind">
          {pending && <span className="ct-pending" title={t(lang, 'Sugestão em aberto', 'Pending suggestion')}>⚔</span>}
          <span className={`ct-badge ${c.type === 'monster' ? 'mon' : 'pc'} ${down || c.defeated ? 'is-down' : ''}`}>{badge}</span>
        </span>
      </span>
    </div>
  );
}

function CombatLog({ log, lang }) {
  const lines = (log || []).slice(-8).map(e => logLine(e, lang)).filter(Boolean).reverse();
  if (!lines.length) return null;
  return (
    <details className="combat-log ct-log">
      <summary>{t(lang, 'Registro recente', 'Recent log')} <span className="ct-log-n">({lines.length})</span></summary>
      <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </details>
  );
}

/** Adicionar personagens ao combate com a iniciativa que o jogador rolou na mesa (folha "tall"). */
function AddCharacterSheet({ campaign, lang, combatants, onAdd, onClose }) {
  const inFight = new Set(combatants.filter(c => c.type === 'pc').map(c => c.character_id));
  const members = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
  const [inits, setInits] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const bonusOf = (m) => {
    try { const d = m.character.data; return d && d.abilities ? Utils.initiative(d) : null; } catch { return null; }
  };
  const add = async (m, { closeWhenDone = true } = {}) => {
    setBusy(m.character.id); setError('');
    try { await onAdd(m.character.id, inits[m.character.id]); }
    catch (e) { setError(errorMessage(e, lang)); return false; }
    finally { setBusy(null); }
    // Todos já no combate → fecha sozinho (não fica bloqueando o Iniciar combate).
    if (closeWhenDone && members.every(x => x.character.id === m.character.id || inFight.has(x.character.id))) onClose();
    return true;
  };
  const addAll = async () => {
    for (const m of members) {
      if (inFight.has(m.character.id)) continue;
      // eslint-disable-next-line no-await-in-loop
      if (!await add(m, { closeWhenDone: false })) return;
    }
    onClose();
  };
  const missing = members.filter(m => !inFight.has(m.character.id)).length;
  const footer = (
    <div className="mesa-actions ct-addpc-foot">
      {missing > 1 && (
        <button type="button" className="mesa-btn mesa-btn-lg" disabled={!!busy} onClick={addAll}>{t(lang, 'Adicionar todos', 'Add everyone')}</button>
      )}
      <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={onClose}>✓ {t(lang, 'Pronto', 'Done')}</button>
    </div>
  );
  return (
    <MesaSheet title={t(lang, 'Adicionar personagem ao combate', 'Add character to combat')} icon="✚" size="tall" width="md"
      lang={lang} onClose={onClose} footer={footer} className="ct-addpc-sheet">
      <p className="mesa-sheet-text">
        {t(lang, 'Digite a iniciativa que cada jogador rolou (dado físico). Em branco = 10. O 🎲 só preenche o campo com d20 + bônus.', 'Type the initiative each player rolled (physical die). Blank = 10. 🎲 just fills the field with d20 + bonus.')}
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
                  <button type="button" className="mesa-btn is-primary" disabled={busy === id} onClick={() => add(m)}>
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
