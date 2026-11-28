/* Character sheet orchestrator — delegates sections to src/sheet/{hero,belt,tabs,spells,inventory,story}/ */
import { useState, useEffect, useLayoutEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { errorMessage } from '../src/api/errors.js';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { setActiveChar } from '../src/dice/active-char.js';
import { t } from '../data/i18n.js';
import Icon from './Icons.jsx';
import ScrollTabs from './ScrollTabs.jsx';
import { SheetSpells, SheetInventory, SheetStory, SheetNotes } from './SheetTabs.jsx';
import { api } from '../src/api/client.js';
import CombatActionPanel, { useCombatPanel } from '../src/campaigns/CombatActionPanel.jsx';
import { combatPanelSpot } from '../src/player/player-model.js';
import PlayerChecksBanner from '../src/checks/PlayerChecksBanner.jsx';
import { placeFeatures, featureKey } from '../src/sheet/feature-placement.js';
import * as Versions from '../src/sheet/versions.js';
import * as Forks from '../src/sheet/forks.js';
import { SheetToastContext, useSheetToastState, FhToast } from '../src/sheet/sheet-toast.jsx';
import { confirmDialog } from './ConfirmDialog.jsx';
import { RestModeContext } from '../src/sheet/rest-mode.jsx';
import { consumeAdvForRoll } from '../src/dice/dice-gestures.js';
import { condClasses, FhConditionFx, FhStatusStrip } from '../src/sheet/FhConditions.jsx';
import { useLevelCeremony, FhLevelCeremony, useGemRelight } from '../src/sheet/FhCeremonies.jsx';
import FhExportModal from '../src/sheet/FhExport.jsx';
import { clearSheetRolls, setSheetPolicy, setSheetRolls } from '../src/dice/sheet-roll.js';
import { createUndoHistory } from '../src/sheet/undo-history.js';
import { useSheetScrollMemory, useSheetKeyAndObserver, useSheetHpHandlers } from '../src/sheet/use-sheet-hooks.js';
import { useWakeLock } from '../src/utils/wake-lock.js';
import { initTableTheme } from '../src/utils/table-theme.js';
import MobileSheetNav from '../src/sheet/MobileSheetNav.jsx';
import { SHEET_TABS, canLevelUp } from '../src/sheet/sheet-shared.jsx';
import { SheetHero, MobileStickyHero } from '../src/sheet/hero/SheetHero.jsx';
import { SheetAbilities, AbilityHive, actionHexSpecs } from '../src/sheet/belt/BeltHive.jsx';
import { SheetPlay } from '../src/sheet/tabs/SheetPlay.jsx';
import { SheetSkills, SheetTools, TOOL_ABILITY_MAP, SKILL_GROUPS } from '../src/sheet/tabs/SheetSkillsSection.jsx';
import { FeatureTimeline, SheetFeatures } from '../src/sheet/tabs/SheetFeaturesSection.jsx';
import { countPendingChoices } from '../src/sheet/tabs/TimelineModals.jsx';
import { CheatModeModal, CampaignModeBanner, WildShapeBanner, SheetNpcs } from '../src/sheet/tabs/SheetCompanionsAndNotes.jsx';
import '../src/sheet/versions.css';
import '../src/sheet/ficha.css';
import '../src/sheet/hp-tracker.css';
import '../src/sheet/ficha-tabs.css';
import '../src/combat/monster-statblock.css';

const CampaignLinkModal = lazy(() => import('../src/sheet/CampaignLinkModal.jsx'));
const VersionsModal = lazy(() => import('../src/sheet/VersionsModal.jsx'));

export {
  SHEET_TABS,
  canLevelUp,
  actionHexSpecs,
  AbilityHive,
  SheetAbilities,
  TOOL_ABILITY_MAP,
  SKILL_GROUPS,
  SheetSkills,
  SheetTools,
  FeatureTimeline,
  SheetFeatures,
};
export const SheetStats = SheetAbilities;

const Sheet = ({ lang, char, onUpdate, onEdit, onPrint, onExportPdf, onShare, onExport, onDelete, onBack, backLabel, onLevelUp, onCampaignChange, onLogin, onSaveVersion, onPreviewVersion, onExitPreview, family = [], onFork, onOpenSheet, autoLink = false, onAutoLinkDone, children }) => {
  useWakeLock(true);
  useEffect(() => { initTableTheme(); }, []);
  useEffect(() => { setActiveChar(char); }, [char]);
  useEffect(() => () => setActiveChar(null), []);
  const [tab, setTab] = useState('play');
  useSheetScrollMemory(char.id, tab);
  const touchStartRef = useRef(null);
  const rootRef = useRef(null);
  const charRef = useRef(char);
  charRef.current = char;
  const undoRef = useRef(null);
  if (!undoRef.current) undoRef.current = createUndoHistory(20);
  useEffect(() => { undoRef.current?.clear(); }, [char.id]);
  const [concPrompt, setConcPrompt] = useState(null);
  const [stickyHero, setStickyHero] = useState(false);

  const onTabBodyTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t0 = e.touches[0];
    touchStartRef.current = { x: t0.clientX, y: t0.clientY, target: e.target, time: Date.now() };
  };

  const onTabBodyTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !e.changedTouches || e.changedTouches.length === 0) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const dt = Date.now() - start.time;
    if (dt > 700 || Math.abs(dx) < 48 || Math.abs(dx) < 1.35 * Math.abs(dy)) return;
    const el = start.target;
    if (el && el.closest('input, textarea, select, [contenteditable], [role="slider"], .fh-dragbar, .fh-knob, .fh-pips, [data-no-swipe], [data-roll-check], [data-roll-save], [data-roll-attack], .fh-hex, .fh-skill-roll, .fh-atk-btn, .fh-medal.is-roll, .fh-belt, .fh-belt-badge, .fh-belt-header, .fh-belt-slot, .modal, .dice-overlay')) {
      return;
    }
    const tabIdx = SHEET_TABS.findIndex(tb => tb.id === tab);
    if (dx < 0 && tabIdx >= 0 && tabIdx < SHEET_TABS.length - 1) setTab(SHEET_TABS[tabIdx + 1].id);
    else if (dx > 0 && tabIdx > 0) setTab(SHEET_TABS[tabIdx - 1].id);
  };

  const selectTab = (id) => {
    const resolved = id === 'inventory' ? 'inv' : id;
    setTab(resolved);
    if (resolved === 'play' || typeof window === 'undefined') return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      let narrow = false;
      let reduce = false;
      try { narrow = window.matchMedia('(max-width: 1023px)').matches; reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* ignore */ }
      if (!narrow) return;
      const body = rootRef.current?.querySelector('.fh-tab-body');
      const bar = rootRef.current?.querySelector('[role="tablist"]');
      if (!body) return;
      const top = body.getBoundingClientRect().top;
      if (top <= window.innerHeight * 0.45) return;
      window.scrollTo({ top: Math.max(0, top + window.scrollY - (bar?.offsetHeight || 0) - 12), behavior: reduce ? 'auto' : 'smooth' });
    }));
  };

  const { toast: sheetToast, api: sheetToastApi } = useSheetToastState();
  const sheetToastCtx = useMemo(() => ({
    ...sheetToastApi,
    patchChar: (p) => updateRef.current(typeof p === 'function' ? p(charRef.current) : p),
  }), [sheetToastApi]); // eslint-disable-line react-hooks/exhaustive-deps
  const [restMode, setRestMode] = useState(null);
  const [restSlot, setRestSlot] = useState(null);
  const restFinishRef = useRef(null);
  const restCtx = useMemo(() => ({ mode: restMode, setMode: setRestMode, slot: restSlot, finishRef: restFinishRef }), [restMode, restSlot]);
  useEffect(() => { setRestMode(null); }, [char.id]);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportBtnRef = useRef(null);
  const closeExport = () => { setExportOpen(false); exportBtnRef.current?.focus(); };
  const [campOpen, setCampOpen] = useState(false);
  const [campRev, setCampRev] = useState(0);
  const [campaignsList, setCampaignsList] = useState([]);
  const [campFoldOpen, setCampFoldOpen] = useState(false);
  const [busyLeaveId, setBusyLeaveId] = useState(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionsBusy = useRef(false);
  const preview = char.versionPreview || null;
  const pt = lang === 'pt';
  const isForkSheet = Forks.isFork(char);
  const vStore = typeof char.id === 'number' && !isForkSheet ? Versions.storeOf(char) : null;

  useEffect(() => {
    if (!autoLink || preview) return;
    setCampOpen(true);
    onAutoLinkDone?.();
  }, [autoLink]); // eslint-disable-line react-hooks/exhaustive-deps
  const vCurrent = vStore && vStore.current !== Versions.TEMPLATE ? vStore.campaigns[vStore.current] : null;
  useEffect(() => { versionsBusy.current = versionsOpen; }, [versionsOpen]);

  const vKey = vStore?.current || '';
  const vSeen = useRef(vKey);
  useEffect(() => {
    if (vSeen.current === vKey) return undefined;
    vSeen.current = vKey;
    const el = rootRef.current;
    if (!el) return undefined;
    el.classList.remove('is-version-swap');
    void el.offsetWidth;
    el.classList.add('is-version-swap');
    const timer = setTimeout(() => el.classList.remove('is-version-swap'), 500);
    return () => clearTimeout(timer);
  }, [vKey]);

  useSheetKeyAndObserver({ charId: char.id, rootRef, charRef, undoRef, onUpdate, sheetToastApi, pt, setStickyHero });

  useEffect(() => {
    if (typeof char.id !== 'number') {
      setCampaignsList([]);
      return;
    }
    let cancelled = false;
    api.characterCampaigns(char.id).then(r => {
      if (cancelled) return;
      const list = r.campaigns || [];
      setCampaignsList(list);
      if (Forks.isFork(charRef.current)) {
        const at = list[0];
        if (at && charRef.current.versionCampaign?.id !== at.id) onUpdate(Forks.seatFork(charRef.current, at));
        else if (Forks.shouldAutoArchive(charRef.current, list)) onUpdate(Forks.archiveFork(charRef.current));
      } else {
        try {
          const rec = Versions.reconcile(charRef.current, list, null);
          if (rec.changed && !versionsBusy.current) onUpdate(rec.char);
        } catch { /* ignore */ }
      }
      const c = list[0];
      if (c) setSheetPolicy(char.id, { allowed: c.sheetRolls, live: c.live, mode: c.sheetRollsMode });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [char.id, campRev]); // eslint-disable-line react-hooks/exhaustive-deps

  const campaignChanged = async (msg) => {
    setCampOpen(false);
    setCampRev(n => n + 1);
    await onCampaignChange?.(msg);
  };

  const leaveCampaign = async (camp) => {
    if (!(await confirmDialog({
      lang, danger: true,
      title: lang === 'pt' ? `Sair da campanha "${camp.name}"?` : `Leave campaign "${camp.name}"?`,
      message: lang === 'pt' ? 'A ficha continua com você.' : 'The sheet stays with you.',
      confirmLabel: lang === 'pt' ? 'Sair da campanha' : 'Leave campaign',
    }))) return;
    setBusyLeaveId(camp.id);
    try {
      await api.removeMember(camp.id, camp.membershipId);
      const remaining = campaignsList.filter(c => c.id !== camp.id);
      setCampaignsList(remaining);
      onUpdate({ ...char, inCampaign: remaining.length > 0 });
      await campaignChanged(lang === 'pt' ? `Você saiu da campanha "${camp.name}".` : `You left campaign "${camp.name}".`);
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusyLeaveId(null);
    }
  };

  const [levelCer, closeLevelCer] = useLevelCeremony(char);
  useGemRelight(rootRef);
  const combatPanel = useCombatPanel(char, { rev: campRev, onUpdate });
  const inCombat = !!char.inCampaign && !!combatPanel.myCombatant;
  const [panelSpot, setPanelSpot] = useState('base');
  const panelBaseRef = useRef(null);
  useLayoutEffect(() => {
    const r = panelBaseRef.current?.getBoundingClientRect();
    const hero = rootRef.current?.querySelector('.sheet-hero')?.getBoundingClientRect();
    setPanelSpot(prev => combatPanelSpot(prev, {
      inCombat, isMyTurn: combatPanel.isMyTurn, rect: r || null, topAt: hero ? hero.top : null, viewBottom: window.innerHeight,
    }));
  }, [inCombat, combatPanel.isMyTurn]);
  const turnOnTop = inCombat && panelSpot === 'top';

  const update = (patch, label = '') => {
    const revived = (char.currentHp || 0) === 0 && (patch.currentHp || 0) > 0;
    const next = { ...char, ...patch, ...(revived && !patch.deathSaves ? { deathSaves: { success: 0, fail: 0 } } : {}), ...(revived ? { stabilized: null } : {}) };
    undoRef.current?.record(char, next, label);
    onUpdate(next);
  };
  const updateRef = useRef(update);
  updateRef.current = update;
  useEffect(() => {
    window.__updateChar = (patch) => updateRef.current(patch);
    return () => { window.__updateChar = null; };
  }, []);

  const inTable = !!char.inCampaign && typeof char.id === 'number';
  useEffect(() => {
    if (!inTable) return undefined;
    setSheetRolls({ characterId: char.id, name: char.name || '' });
    return () => clearSheetRolls(char.id);
  }, [inTable, char.id, char.name]);

  const ac = Utils.computeAc(char);
  const initBonus = Utils.initiative(char);
  const speed = Utils.speed(char);
  const profB = Utils.profBonus(char);
  const passPerc = Utils.passivePerception(char);
  const slots = Utils.spellSlots(char);
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  const race = Utils.races(char).find(r => r.id === char.race);
  const bg = Utils.backgrounds(char).find(b => b.id === char.background);
  const fkey = featureKey(char);
  const placed = useMemo(() => { try { return placeFeatures(char); } catch { return placeFeatures({}); } }, [fkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pendingChoices = useMemo(() => { try { return countPendingChoices(char); } catch { return 0; } }, [fkey, char.background, char.creation, char.speciesChoices, char.inCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  const { applyHp, setTempHp } = useSheetHpHandlers({ char, charRef, lang, pt, update, onUpdate, undoRef, sheetToastApi, setConcPrompt });

  const roll = (config) => {
    const adv = config.advMode == null && typeof document !== 'undefined' ? consumeAdvForRoll(document.activeElement) : null;
    return window.__diceRoll ? window.__diceRoll({ ...config, ...(adv ? { adv, advMode: adv } : {}), sheet: true }) : null;
  };
  const [tabStance, setTabStance] = useState('normal');
  useEffect(() => { setTabStance('normal'); }, [tab]);
  const rollTab = (config) => {
    const d20 = (config.die ?? 20) === 20 && (config.count ?? 1) === 1 && !config.formula;
    if (!d20 || tabStance === 'normal') return roll(config);
    const own = config.advMode || config.adv || 'normal';
    const mix = own === 'normal' || own === tabStance ? tabStance : 'normal';
    const { adv: _a, advMode: _m, ...rest } = config;
    setTabStance('normal');
    return roll(mix === 'normal' ? { ...rest, advMode: 'normal' } : { ...rest, adv: mix, advMode: mix });
  };

  const conSaveBonus = Utils.saveBonus ? Utils.saveBonus(char, 'con') : Utils.abilityMod(char, 'con');

  return (
    <RestModeContext.Provider value={restCtx}>
    <SheetToastContext.Provider value={sheetToastCtx}>
    <div ref={rootRef} className={['ficha', ...condClasses(char), preview ? 'is-version-readonly' : '', restMode ? `is-resting is-resting-${restMode}` : ''].filter(Boolean).join(' ')}>
      <FhConditionFx char={char} />
      {levelCer && <FhLevelCeremony key={levelCer.key} cer={levelCer} char={char} lang={lang} onClose={closeLevelCer} />}
      <MobileStickyHero char={char} lang={lang} shown={stickyHero} applyHp={applyHp} onQuickHp={setTempHp} />
      <SheetHero
        char={char} lang={lang}
        onAvatar={(av) => update({ avatar: av })} onAvatarPosition={(pos) => update({ avatarPosition: pos })}
        onBack={onBack} backLabel={backLabel}
        turnPanel={turnOnTop ? <CombatActionPanel panel={combatPanel} char={char} lang={lang} /> : null}
        onLevelUp={onLevelUp} onInspiration={() => update({ inspiration: !char.inspiration }, 'inspiration')}
        cls={cls} race={race} bg={bg} onEdit={onEdit}
        exportBtnRef={exportBtnRef} setExportOpen={setExportOpen} setCheatOpen={setCheatOpen}
        versionChip={preview ? (
          <span className="fh-version-chip is-readonly no-print">
            <span aria-hidden="true">🔒</span>
            <span>{preview.name || (pt ? 'Versão guardada' : 'Stored version')}</span>
          </span>
        ) : isForkSheet ? (
          <button type="button" className="fh-version-chip is-campaign no-print" onClick={() => setVersionsOpen(true)} aria-haspopup="dialog"
            aria-label={pt ? `Versão: ${Forks.forkLabel(char, lang)}. Ver as outras versões` : `Version: ${Forks.forkLabel(char, lang)}. See the other versions`}>
            <span aria-hidden="true">{char.versionKind === 'oneshot' ? '🎲' : '🏰'}</span>
            <span>{Forks.forkLabel(char, lang)}</span><span aria-hidden="true">▾</span>
          </button>
        ) : vStore ? (
          <button type="button" className={`fh-version-chip no-print${vCurrent ? ' is-campaign' : ''}`} onClick={() => setVersionsOpen(true)} aria-haspopup="dialog"
            aria-label={pt ? `Versão em uso: ${vCurrent ? vCurrent.name : 'Modelo'}. Trocar de versão` : `Version in use: ${vCurrent ? vCurrent.name : 'Template'}. Switch version`}>
            <span aria-hidden="true">{vCurrent ? '🏰' : '📜'}</span>
            <span>{vCurrent ? vCurrent.name : (pt ? 'Modelo' : 'Template')}</span><span aria-hidden="true">▾</span>
          </button>
        ) : null}
        copies={family.map(c => ({
          id: c.id, active: c.id === char.id, level: c.level,
          kind: Forks.isFork(c) ? (c.versionKind || 'campaign') : 'template',
          label: Forks.isFork(c) ? (c.versionCampaign?.name || Forks.forkLabel(c, lang)) : (pt ? 'Ficha original' : 'Original sheet'),
        }))}
        onOpenCopy={onOpenSheet} preview={preview} onLeaveCampaign={leaveCampaign} busyLeaveId={busyLeaveId}
        onManageCampaigns={typeof char.id === 'number' ? () => setCampOpen(true) : null}
        onDeleteCopy={isForkSheet && onDelete ? onDelete : null} onLogin={onLogin}
        campaignBanner={preview ? null : (
          <CampaignModeBanner
            char={char} lang={lang} onChange={onUpdate} rev={campRev}
            onManage={typeof char.id === 'number' ? () => setCampOpen(true) : null} onLogin={onLogin}
            campFoldOpen={campFoldOpen} setCampFoldOpen={setCampFoldOpen}
            campaignsList={campaignsList} onLeaveCampaign={leaveCampaign} busyLeaveId={busyLeaveId}
          />
        )}
        campaignsList={campaignsList} campFoldOpen={campFoldOpen} setCampFoldOpen={setCampFoldOpen} update={update}
      />

      {concPrompt && (
        <div className="fh-conc-banner no-print" role="alert">
          <div>
            <strong>{pt ? 'Teste de Concentração' : 'Concentration Check'}</strong>{' '}
            <span>
              {concPrompt.dropped
                ? (pt ? `Caiu a 0 PV: concentração em "${concPrompt.spell}" interrompida.` : `Dropped to 0 HP: concentration on "${concPrompt.spell}" ended.`)
                : (pt ? `Você sofreu dano mantendo "${concPrompt.spell}". CD ${concPrompt.dc} (CON).` : `You took damage concentrating on "${concPrompt.spell}". DC ${concPrompt.dc} (CON).`)}
            </span>
          </div>
          <div className="fh-conc-acts">
            {!concPrompt.dropped && (
              <button type="button" className="is-roll" onClick={() => roll({ die: 20, mod: conSaveBonus, label: `${pt ? 'Concentração' : 'Concentration'} (CD ${concPrompt.dc})`, isSave: true })}>
                {pt ? `Rolar CON (CD ${concPrompt.dc})` : `Roll CON (DC ${concPrompt.dc})`}
              </button>
            )}
            {!concPrompt.dropped && (
              <button type="button" onClick={() => setConcPrompt(null)}>{pt ? 'Manter' : 'Keep'}</button>
            )}
            <button type="button" className="is-drop" onClick={() => { update({ concentratingSpell: null, concentration: null }, 'concentration'); setConcPrompt(null); }}>
              {pt ? 'Perder Concentração' : 'Drop Concentration'}
            </button>
          </div>
        </div>
      )}

      <div ref={setRestSlot} className="fh-rest-slot" />
      {char.inCampaign && typeof char.id === 'number' && <PlayerChecksBanner char={char} lang={lang} />}
      {preview && (
        <div className="fh-readonly-banner no-print" role="status">
          <p>
            <strong>{pt ? 'Só leitura. ' : 'Read-only. '}</strong>
            {preview.fork
              ? (pt ? `A versão “${preview.name}” está arquivada: a mesa dela acabou ou você a arquivou.` : `The “${preview.name}” version is archived: its table ended or you archived it.`)
              : preview.state === 'archived'
                ? (pt ? `A campanha “${preview.name}” foi encerrada: esta versão fica guardada como arquivo.` : `The campaign “${preview.name}” is closed: this version is kept as an archive.`)
                : (pt ? `Você saiu de “${preview.name}”: esta é a ficha como você a deixou.` : `You left “${preview.name}”: this is the sheet as you left it.`)}
            {' '}{pt ? 'Os dados rolam só neste aparelho.' : 'Dice roll on this device only.'}
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onExitPreview}>
            {preview.fork ? (pt ? 'Desarquivar' : 'Unarchive') : (pt ? 'Voltar à ficha' : 'Back to the sheet')}
          </button>
        </div>
      )}

      {campOpen && !preview && (
        <Suspense fallback={null}>
          <CampaignLinkModal char={char} lang={lang} onClose={() => setCampOpen(false)} onDone={campaignChanged}
            familyIds={family.map(c => c.id)} onCopies={() => { setCampOpen(false); setVersionsOpen(true); }} />
        </Suspense>
      )}
      {versionsOpen && !preview && (
        <Suspense fallback={null}>
          <VersionsModal char={char} lang={lang} onClose={() => setVersionsOpen(false)} onSave={onSaveVersion}
            onDone={async (msg) => { setCampRev(n => n + 1); await onCampaignChange?.(msg); }}
            onPreview={onPreviewVersion} onAddCampaign={() => { setVersionsOpen(false); setCampOpen(true); }}
            family={family} onFork={onFork ? async (kind) => { setVersionsOpen(false); await onFork(char, kind); } : null}
            onOpenSheet={onOpenSheet ? (id) => { setVersionsOpen(false); onOpenSheet(id); } : null} />
        </Suspense>
      )}

      {char.wildShape?.active && <WildShapeBanner char={char} lang={lang} onChange={onUpdate} />}
      {char.inCampaign && <div ref={panelBaseRef}>{!turnOnTop && <CombatActionPanel panel={combatPanel} char={char} lang={lang} />}</div>}
      {cheatOpen && <CheatModeModal char={char} lang={lang} update={update} onClose={() => setCheatOpen(false)} />}
      {exportOpen && <FhExportModal char={char} lang={lang} handlers={{ onPrint, onExportPdf, onShare, onExport }} onClose={closeExport} onLogin={onLogin || null} />}

      <ScrollTabs className="no-print" activeKey={tab} lang={lang} role="tablist" aria-label={lang === 'pt' ? 'Seções da ficha' : 'Sheet sections'}>
        {SHEET_TABS.map((tb, ti) => (
          <button key={tb.id} type="button" role="tab" id={`fh-tab-${tb.id}`} aria-selected={tab === tb.id} aria-controls="fh-tabpanel"
            tabIndex={tab === tb.id ? 0 : -1}
            className={`tab ${tab === tb.id ? 'active' : ''}${tb.id === 'features' && pendingChoices > 0 ? ' has-pending' : ''}`}
            onClick={() => selectTab(tb.id)}
            onKeyDown={(e) => {
              const n = SHEET_TABS.length;
              const to = e.key === 'ArrowRight' ? (ti + 1) % n : e.key === 'ArrowLeft' ? (ti - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
              if (to < 0) return;
              e.preventDefault();
              const next = SHEET_TABS[to].id;
              setTab(next);
              requestAnimationFrame(() => rootRef.current?.querySelector(`#fh-tab-${next}`)?.focus());
            }}>
            {lang === 'pt' ? tb.labelPt : tb.labelEn}
            {tb.id === 'features' && pendingChoices > 0 && (
              <span className="fh-tab-dot" role="img" aria-label={lang === 'pt' ? `${pendingChoices} escolha${pendingChoices > 1 ? 's' : ''} pendente${pendingChoices > 1 ? 's' : ''}` : `${pendingChoices} pending choice${pendingChoices > 1 ? 's' : ''}`} />
            )}
          </button>
        ))}
      </ScrollTabs>

      <FhStatusStrip char={char} lang={lang} onGo={() => { if (tab !== 'play') setTab('play'); }} />

      <div className={`fh-tab-body is-tab-${tab}${tab === 'play' ? ' is-play' : ''}`} id="fh-tabpanel" role="tabpanel" aria-labelledby={`fh-tab-${tab}`}
        onTouchStart={onTabBodyTouchStart} onTouchEnd={onTabBodyTouchEnd}>
        {tab === 'play' && (
          <SheetPlay char={char} lang={lang} update={update} applyHp={applyHp} setTempHp={setTempHp}
            ac={ac} speed={speed} profB={profB} initBonus={initBonus} passPerc={passPerc} slots={slots} roll={roll} placed={placed}
            after={children || null}
            onOpenSpells={() => {
              setTab('spells');
              requestAnimationFrame(() => requestAnimationFrame(() => {
                const body = rootRef.current?.querySelector('.fh-tab-body');
                const bar = rootRef.current?.querySelector('[role="tablist"]');
                if (body) window.scrollTo({ top: Math.max(0, body.getBoundingClientRect().top + window.scrollY - (bar?.offsetHeight || 0) - 12) });
              }));
            }} />
        )}
        {tab === 'stats' && <SheetAbilities char={char} lang={lang} update={update} profB={profB} roll={rollTab} stance={tabStance} onStance={setTabStance} />}
        {(tab === 'skills' || tab === 'tools') && <SheetSkills char={char} lang={lang} update={update} passPerc={passPerc} roll={rollTab} placed={placed} stance={tabStance} onStance={setTabStance} />}
        {tab === 'features' && <SheetFeatures char={char} lang={lang} placed={placed} cls={cls} race={race} update={update} />}
        {tab === 'spells' && <SheetSpells char={char} lang={lang} update={update} slots={slots} roll={rollTab} placed={placed} stance={tabStance} onStance={setTabStance} />}
        {tab === 'inv' && <SheetInventory char={char} lang={lang} update={update} roll={rollTab} cls={cls} bg={bg} placed={placed} stance={tabStance} onStance={setTabStance} />}
        {tab === 'story' && <SheetStory char={char} lang={lang} update={update} cls={cls} race={race} />}
        {tab === 'notes' && <SheetNotes char={char} lang={lang} update={update} />}
        {tab === 'npcs' && <SheetNpcs char={char} lang={lang} update={update} />}
      </div>

      <div className="fh-danger-zone no-print">
        <button className="btn btn-ghost btn-danger btn-sm" onClick={onDelete}>
          <Icon name="trash" size={14} /> {t('delete', lang)}
        </button>
      </div>
      <MobileSheetNav activeTab={tab === 'inv' ? 'inventory' : tab} onSelect={selectTab} lang={lang} />
      <FhToast toast={sheetToast} onClose={sheetToastApi.hide} lang={lang} />
    </div>
    </SheetToastContext.Provider>
    </RestModeContext.Provider>
  );
};

export default Sheet;
