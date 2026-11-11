/* Character sheet view — play/stats/spells/inventory/story/journal tabs */
import { errorMessage } from '../src/api/errors.js';
import { useState, useEffect, useLayoutEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { subclassesFor } from '../src/progression/subclasses.js';
import { subclassLock, guardSealedPatch, sealHint } from '../src/progression/subclass-lock.js';
import { featSummary } from '../src/progression/FeatPicker.jsx';
import ResourcesCard from '../src/progression/ResourcesCard.jsx';
import { setActiveChar } from '../src/dice/active-char.js';
import { computeResources } from '../src/progression/resources.js';
import { SpeciesChoicesModal } from '../src/progression/SpeciesChoices.jsx';
import { t, tName } from '../data/i18n.js';
import LanguagePicker, { chosenLanguages } from './LanguagePicker.jsx';
import Icon from './Icons.jsx';
import ScrollTabs from './ScrollTabs.jsx';
import { Filigree, Modal, NumStepper, Pips, AvatarUpload } from './Shared.jsx';
import { SheetSpells, SheetInventory, SheetStory, SheetNotes, RestButtons } from './SheetTabs.jsx';
import { api, ApiError } from '../src/api/client.js';
import CombatActionPanel, { useCombatPanel } from '../src/campaigns/CombatActionPanel.jsx';
import { combatPanelSpot } from '../src/player/player-model.js';
import PlayerChecksBanner from '../src/checks/PlayerChecksBanner.jsx';
import * as FS from '../src/progression/fighting-styles.js';
import GrimoireHint from '../src/grimoire/GrimoireHint.jsx';
import { isArmorProficient, TOOLS, toolName } from '../src/creator/start-data.js';
import { ACTION_SKILL_GROUPS, computeActionGroupData, hasKeenSenses } from '../src/combat/monster-action-skills.js';
import { trainingLines, featName, featPicksText, backgroundFeature } from '../src/sheet/sheet-text.js';
import { placeFeatures, featureKey } from '../src/sheet/feature-placement.js';
import FhFeatures, { FhFeatureItem } from '../src/sheet/FhFeatures.jsx';
import { DiceText } from '../src/dice/dice-text.jsx';
import * as Versions from '../src/sheet/versions.js';
import * as Forks from '../src/sheet/forks.js';
import HpTracker from '../src/sheet/HpTracker.jsx';
import { RestModeContext } from '../src/sheet/rest-mode.jsx';
import { hpFormula } from '../src/sheet/hp-logic.js';
import '../src/sheet/versions.css';
import BeltMultiRoll, { pairBeltSlots, rollBeltPairs } from '../src/dice/BeltMultiRoll.jsx';
import { itemArt, conditionIcon, CONDITION_EMOJI, classArt, speciesArt } from '../src/art.js';
import ArtThumb, { ArtIcon } from '../src/components/ArtThumb.jsx';
import FhTitle from '../src/sheet/FhTitle.jsx';
import FhAttackRow from '../src/sheet/FhAttack.jsx';
import FhMedal, { FhMedalDefs } from '../src/sheet/FhMedal.jsx';
import { FhHex, FhSkillRow, FhProfLegend, FhTapToRoll } from '../src/sheet/FhChecks.jsx';
import { SpeciesTraits } from './SheetTabs.jsx';
import { hpState, hpStateLabel, useHpFeedback } from '../src/sheet/hp-feedback.js';
import { slotCircleLabel, gemLabel, lockedSlotTitle, slotSpent, slotTap, slotTapTitle } from '../src/sheet/gem-text.js';
import { condClasses, FhConditionFx, FhConditionArt } from '../src/sheet/FhConditions.jsx';
import { useLevelCeremony, FhLevelCeremony, useGemRelight } from '../src/sheet/FhCeremonies.jsx';
import { PLAY_H, splitColumns } from '../src/sheet/play-layout.js';
import FhExportModal from '../src/sheet/FhExport.jsx';
import SheetRollTarget from '../src/sheet/SheetRollTarget.jsx';
import { clearSheetRolls, maybeRecheck, setSheetPolicy, setSheetRecheck, setSheetRolls } from '../src/dice/sheet-roll.js';
import '../src/sheet/ficha.css';
import '../src/sheet/hp-tracker.css';
import '../src/combat/monster-statblock.css';

// Modal "Campanha" (atrelar, desatrelar, trocar): só carrega quando abre.
const CampaignLinkModal = lazy(() => import('../src/sheet/CampaignLinkModal.jsx'));
const VersionsModal = lazy(() => import('../src/sheet/VersionsModal.jsx'));

export const SHEET_TABS = [
  { id: 'play',     labelPt: 'Jogar',           labelEn: 'Play' },
  { id: 'stats',    labelPt: 'Atributos',       labelEn: 'Ability Scores' },
  { id: 'skills',   labelPt: 'Perícias',        labelEn: 'Skills' },
  { id: 'features', labelPt: 'Características', labelEn: 'Features' },
  { id: 'spells',   labelPt: 'Magias',          labelEn: 'Spells' },
  { id: 'inv',      labelPt: 'Inventário',      labelEn: 'Inventory' },
  { id: 'story',    labelPt: 'História',        labelEn: 'Story' },
  { id: 'notes',    labelPt: 'Diário',          labelEn: 'Journal' },
  { id: 'npcs',     labelPt: 'NPCs',            labelEn: 'NPCs' },
];

// Mesmo fluxo do painel de Progressão: fora de campanha abre a subida guiada;
// em campanha pede liberação ao mestre.
const LevelUpButton = ({ char, lang, onLevelUp }) => {
  const mode = Utils.levelingMode(char);
  const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  const canLevelXp = mode === 'xp' && char.level < 20 && (char.xp || 0) >= (XP_THRESHOLDS[char.level] || Infinity);
  const canLevel = char.level < 20 && (mode === 'milestone' || canLevelXp || char.cheatMode);

  // Selo de nível: anel tracejado + núcleo dourado. Com `can`, o anel gira devagar
  // (nunca com movimento reduzido) e o selinho ↑ continua no canto.
  return (
    <button
      className={`hero-level fh-seal no-print ${canLevel ? 'can' : ''}`}
      onClick={() => onLevelUp && onLevelUp()}
      disabled={!canLevel || !onLevelUp}
      title={canLevel ? (lang === 'pt' ? 'Subir de nível' : 'Level up') : (lang === 'pt' ? 'XP insuficiente' : 'Not enough XP')}
    >
      <svg className="fh-seal-ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#e0b55e" strokeWidth="1.2" strokeDasharray="2 4"/>
        <circle cx="32" cy="32" r="27" fill="none" stroke="#9a7231" strokeWidth="0.8"/>
      </svg>
      <span className="fh-seal-core">
        <span className="hero-level-label">{t('level', lang)}</span>
        <span className="hero-level-num">{char.level}</span>
      </span>
      {canLevel && <span className="hero-level-up">↑</span>}
    </button>
  );
};

const CampaignSealButton = ({ count, campFoldOpen, onToggle, lang }) => {
  const pt = lang === 'pt';
  return (
    <button
      type="button"
      className={`hero-camp fh-seal no-print ${campFoldOpen ? 'is-active' : ''}`}
      onClick={onToggle}
      aria-expanded={campFoldOpen}
      title={pt ? `Campanhas atribuídas (${count}). Clique para gerenciar.` : `Assigned campaigns (${count}). Click to manage.`}
    >
      <svg className="fh-seal-ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#e0b55e" strokeWidth="1.2" strokeDasharray="2 4"/>
        <circle cx="32" cy="32" r="27" fill="none" stroke="#9a7231" strokeWidth="0.8"/>
      </svg>
      <span className="fh-seal-core">
        <span className="hero-camp-icon" aria-hidden="true">🏰</span>
        <span className="hero-camp-label">{pt ? 'MESAS' : 'CAMP.'}</span>
      </span>
      {count > 0 && <span className="hero-level-up hero-camp-pip">{count}</span>}
    </button>
  );
};

const InspirationSealButton = ({ inspired, onToggle, lang }) => {
  const pt = lang === 'pt';
  return (
    <button
      type="button"
      className={`hero-insp fh-seal no-print ${inspired ? 'is-inspired' : ''}`}
      onClick={onToggle}
      aria-pressed={!!inspired}
      title={pt ? (inspired ? 'Inspirado! Clique para gastar a Inspiração.' : 'Sem Inspiração. Clique para ativar.') : (inspired ? 'Inspired! Click to spend Inspiration.' : 'No Inspiration. Click to grant.')}
    >
      <svg className="fh-seal-ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#e0b55e" strokeWidth="1.2" strokeDasharray="2 4"/>
        <circle cx="32" cy="32" r="27" fill="none" stroke="#9a7231" strokeWidth="0.8"/>
      </svg>
      <span className="fh-seal-core">
        <span className="hero-insp-icon" aria-hidden="true">
          <Icon name={inspired ? 'star-fill' : 'star'} size={20} />
        </span>
      </span>
      {inspired && <span className="hero-level-up hero-insp-pip">✦</span>}
    </button>
  );
};

const hideBrokenImg = (e) => { e.currentTarget.style.display = 'none'; };

// Topo da ficha (visual "Ficha Forjada", src/sheet/ficha.css: .fh-hero).
// Mantém os dados essenciais de topo: nome, retrato com upload, selo de nível,
// classe/raça/antecedente, etiquetas (tendência, XP, jogador) e o botão de Inspiração.
// Exportar, Editar e Modo trapaça ficam contidos dentro do painel do herói,
// diretamente abaixo da etiqueta de tendência (.hero-tags).
const SheetHero = ({
  char,
  lang,
  onAvatar,
  onAvatarPosition,
  onBack,
  backLabel,
  turnPanel,
  onLevelUp,
  onInspiration,
  cls,
  race,
  bg,
  onEdit,
  exportBtnRef,
  setExportOpen,
  setCheatOpen,
  campaignBanner,
  campaignsList = [],
  campFoldOpen = false,
  setCampFoldOpen,
  update,
  versionChip = null,
}) => {
  const pt = lang === 'pt';
  const letter = (char.name || '?').charAt(0).toUpperCase();
  const portrait = char.avatar || speciesArt(char.race) || classArt(char.className);
  const heroArtPos = {
    objectPosition: `${char.avatarPosition?.x ?? 50}% ${char.avatarPosition?.y ?? 22}%`
  };

  const currentSubclassName = useMemo(() => {
    const subs = subclassesFor(char);
    return subs.find(s => s.id === char.subclass)?.name?.[lang] || char.subclass || '';
  }, [char.subclass, char.className, lang]);

  const hasPendingSubclass = useMemo(() => {
    const subs = subclassesFor(char);
    const subLv = Utils.subclassLevel(char);
    return subs.length > 0 && (char.level || 1) >= subLv && !char.subclass;
  }, [char.subclass, char.className, char.level]);

  const hasPendingSpecies = useMemo(() => {
    const issues = Utils.speciesChoiceIssues(char).filter(i => !(char.inCampaign && (i.key === 'feat' || i.key === 'asi')));
    return issues.length > 0;
  }, [char]);

  return (
    <>
      <button className="btn btn-ghost btn-sm no-print" onClick={onBack} style={{ marginBottom: 12 }}>
        <Icon name="arrow-back" size={14}/> {backLabel || t('yourHeroes', lang)}
      </button>
      {turnPanel}
      <div className="sheet-hero fh-hero">
        <div className="fh-hero-art" aria-hidden="true">
          <span className="fh-hero-mono">{letter}</span>
          {portrait && <img key={portrait} src={portrait} alt="" onError={hideBrokenImg} style={heroArtPos} />}
          <FhConditionArt conditions={char.conditions} down={char.currentHp === 0} />
        </div>
        {/* Ações discretas no canto superior direito: Cheat -> Edit -> Export */}
        <div className="fh-hero-tools no-print">
          <button type="button" data-version-hide="" className={`fh-hero-chip fh-corner-chip${char.cheatMode ? ' is-cheat' : ''}`} onClick={() => setCheatOpen(true)}>
            <span aria-hidden="true">🎲</span> {lang === 'pt' ? 'Trapaça' : 'Cheat'}
          </button>
          {!char.inCampaign ? (
            <button type="button" data-version-hide="" className="fh-hero-chip fh-corner-chip is-icon" aria-label={t('edit', lang)} title={t('edit', lang)} onClick={onEdit}>
              <Icon name="edit" size={15} aria-hidden="true"/>
            </button>
          ) : (
            <span className="fh-hero-chip fh-corner-chip is-icon is-locked" role="img"
              aria-label={lang === 'pt' ? 'Editar (bloqueado em campanha)' : 'Edit (locked in campaign)'}
              title={lang === 'pt' ? 'Em campanha: peça ao mestre pra usar o "Editar ficha (modo mestre)"' : 'In campaign: ask DM to use "Edit sheet (DM mode)"'}>
              <Icon name="edit" size={15} aria-hidden="true"/><span className="fh-chip-lock" aria-hidden="true">🔒</span>
            </span>
          )}
          <button ref={exportBtnRef} type="button" className="fh-hero-chip fh-corner-chip is-icon fh-export-chip" aria-haspopup="dialog"
            aria-label={t('export', lang)} title={t('export', lang)} onClick={() => setExportOpen(true)}>
            <Icon name="download" size={15} aria-hidden="true"/>
          </button>
        </div>
        <div className="fh-hero-body">
          {/* Header Row: Medalhas Top-Left + Nome do Personagem imediatamente adjacente */}
          <div className="fh-hero-header-row">
            <div className="fh-hero-top-left-cluster no-print">
              <div className="fh-hero-portrait-medal" title={pt ? 'Foto do personagem' : 'Character portrait'}>
                <AvatarUpload
                  value={char.avatar}
                  onChange={onAvatar}
                  position={char.avatarPosition}
                  onPositionChange={onAvatarPosition}
                  lang={lang}
                  size={48}
                  letter={letter}
                />
                <span className="fh-hero-photo-badge" aria-hidden="true"><Icon name="image" size={10}/></span>
              </div>
              <LevelUpButton char={char} lang={lang} onLevelUp={onLevelUp} />
              <CampaignSealButton count={campaignsList.length} campFoldOpen={campFoldOpen} onToggle={() => setCampFoldOpen?.(v => !v)} lang={lang} />
              <InspirationSealButton inspired={!!char.inspiration} onToggle={onInspiration} lang={lang} />
            </div>

            <div className={char.name ? 'hero-name' : 'hero-name is-unnamed'}>
              {char.name ? <span className="fh-foil">{char.name}</span> : (pt ? 'Sem nome' : 'Unnamed')}
            </div>
          </div>
          {versionChip}
          <div className="hero-sub fh-hero-rows">
            {(() => {
              const speciesName = race ? tName('race', race.id, lang) : (char.race || '');
              const bgName = bg ? tName('background', bg.id, lang) : (char.background || '');
              const speciesBg = speciesName && bgName ? `${speciesName} (${bgName})` : (speciesName || bgName || '');
              const align = char.alignment ? tName('alignment', char.alignment, lang) : '';
              let classes = [];
              try {
                classes = Utils.classEntries(char).map(e => {
                  const view = Utils.classView(char, e);
                  const sub = view.subclass ? (tName('subclass', view.subclass, lang) || subclassesFor(view).find(x => x.id === view.subclass)?.name?.[lang] || view.subclass) : null;
                  return `${tName('class', e.id, lang)} ${e.level}${sub ? ` (${sub})` : ''}`;
                });
              } catch { classes = cls ? [`${tName('class', cls.id, lang)} ${char.level || 1}`] : []; }
              const langs = (Utils.languagesFor ? Utils.languagesFor(char) : (char.languages || []))
                .filter(l => typeof l === 'string' && !/^\+\d/.test(l))
                .map(l => (Utils.languageLabel ? Utils.languageLabel(l, lang) : l));
              return (
                <>
                  {(align || speciesBg) && <div className="fh-hero-row">{[align, speciesBg].filter(Boolean).join(', ')}</div>}
                  {classes.length > 0 && <div className="fh-hero-row is-classes">{classes.join(', ')}</div>}
                  {langs.length > 0 && <div className="fh-hero-row is-langs">{pt ? 'Fala ' : 'Speaks '}{langs.join(', ')}</div>}
                  <div className="fh-hero-row is-rest fh-hero-rest no-print" data-version-hide="">
                    <RestButtons char={char} lang={lang} update={update} />
                  </div>
                </>
              );
            })()}
          </div>

          {/* Status/faixa da campanha contidos no painel do personagem */}
          {campaignBanner}
        </div>
        {update && <HeroChoicesFold char={char} lang={lang} update={update} />}
      </div>
    </>
  );
};


// onCampaignChange(msg): a ficha entrou/saiu/trocou de campanha (modal "Campanha") —
// o app recarrega a lista (char.inCampaign) e mostra `msg`. onLogin: ficha do aparelho,
// leva à entrada na conta (sem ele, o servidor está fora e a dica não aparece).
// backLabel: o texto do "voltar" quando a ficha foi aberta de outro lugar (a Mesa, V13).
const Sheet = ({ lang, char, onUpdate, onEdit, onPrint, onExportPdf, onShare, onExport, onDelete, onBack, backLabel, onLevelUp, onCampaignChange, onLogin, onSaveVersion, onPreviewVersion, onExitPreview, family = [], onFork, onOpenSheet, autoLink = false, onAutoLinkDone, children }) => {
  // o rolador global (múltipla por linhas) vincula atributo/proficiência à ficha aberta
  useEffect(() => { setActiveChar(char); }, [char]);
  useEffect(() => () => setActiveChar(null), []);
  const [tab, setTab] = useState('play');
  const touchStartRef = useRef(null);

  const onTabBodyTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      target: e.target,
      time: Date.now(),
    };
  };

  const onTabBodyTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !e.changedTouches || e.changedTouches.length === 0) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const dt = Date.now() - start.time;

    // Filter out long holds (> 700ms) or predominantly vertical swipes
    if (dt > 700) return;
    if (Math.abs(dx) < 48 || Math.abs(dx) < 1.35 * Math.abs(dy)) return;

    // Check if touch originated inside inputs, sliders, belt components, or overlays
    const el = start.target;
    if (el && el.closest('input, textarea, select, [contenteditable], button[role="slider"], .fh-belt, .fh-belt-badge, .fh-belt-header, .fh-belt-slot, .modal, .dice-overlay')) {
      return;
    }

    const tabIdx = SHEET_TABS.findIndex(t => t.id === tab);
    if (dx < 0) {
      // Swiped Left -> Advance to next tab
      if (tabIdx >= 0 && tabIdx < SHEET_TABS.length - 1) {
        setTab(SHEET_TABS[tabIdx + 1].id);
      }
    } else {
      // Swiped Right -> Return to previous tab
      if (tabIdx > 0) {
        setTab(SHEET_TABS[tabIdx - 1].id);
      }
    }
  };

  const [hpDelta, setHpDelta] = useState(0);
  // Descanso ligado (src/sheet/rest-mode.jsx): Curto/Longo do herói viram interruptores.
  const [restMode, setRestMode] = useState(null);
  const restCtx = useMemo(() => ({ mode: restMode, setMode: setRestMode }), [restMode]);
  useEffect(() => { setRestMode(null); }, [char.id]);
  const [tempHpInput, setTempHpInput] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  // Modal Exportar: ao fechar, o foco volta para o botão que abriu.
  const [exportOpen, setExportOpen] = useState(false);
  const exportBtnRef = useRef(null);
  const closeExport = () => { setExportOpen(false); exportBtnRef.current?.focus(); };
  // campRev muda a cada atrelar/desatrelar/trocar: a faixa e o painel de combate
  // buscam a campanha de novo (na troca A→B, inCampaign continua true).
  const [campOpen, setCampOpen] = useState(false);
  const [campRev, setCampRev] = useState(0);
  const [campaignsList, setCampaignsList] = useState([]);
  const [campFoldOpen, setCampFoldOpen] = useState(false);
  const [busyLeaveId, setBusyLeaveId] = useState(null);
  // Versões da ficha (modelo + uma cópia por campanha): src/sheet/versions.js
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionsBusy = useRef(false);
  const charRef = useRef(char);
  charRef.current = char;
  const preview = char.versionPreview || null;      // versão guardada aberta só para leitura
  const pt = lang === 'pt';
  const isForkSheet = Forks.isFork(char);           // versão = ficha própria (src/sheet/forks.js)
  const vStore = typeof char.id === 'number' && !isForkSheet ? Versions.storeOf(char) : null;
  // versão recém-criada: abre o seletor de mesa uma vez
  useEffect(() => {
    if (!autoLink || preview) return;
    setCampOpen(true);
    onAutoLinkDone?.();
  }, [autoLink]); // eslint-disable-line react-hooks/exhaustive-deps
  const vCurrent = vStore && vStore.current !== Versions.TEMPLATE ? vStore.campaigns[vStore.current] : null;
  useEffect(() => { versionsBusy.current = versionsOpen; }, [versionsOpen]);
  // troca de versão: a ficha inteira muda no lugar, com um fade curto
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
    const t = setTimeout(() => el.classList.remove('is-version-swap'), 500);
    return () => clearTimeout(t);
  }, [vKey]);

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
        // versão = ficha própria: guarda em qual mesa ela sentou (selo e lista)
        const at = list[0];
        if (at && charRef.current.versionCampaign?.id !== at.id) onUpdate(Forks.seatFork(charRef.current, at));
        // one-shot cuja mesa acabou (encerrada ou saiu): vira arquivo, só leitura (F6)
        else if (Forks.shouldAutoArchive(charRef.current, list)) onUpdate(Forks.archiveFork(charRef.current));
      } else {
        // versões por campanha (armazém antigo): acerta com onde a ficha está agora
        try {
          const rec = Versions.reconcile(charRef.current, list, null);
          if (rec.changed && !versionsBusy.current) onUpdate(rec.char);
        } catch { /* armazém ilegível: a lista de versões mostra o erro */ }
      }
      const c = list[0];
      if (c) {
        setSheetPolicy(char.id, { allowed: c.sheetRolls, live: c.live, mode: c.sheetRollsMode });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [char.id, campRev]);

  const campaignChanged = async (msg) => {
    setCampOpen(false);
    setCampRev(n => n + 1);
    await onCampaignChange?.(msg);
  };

  const leaveCampaign = async (camp) => {
    if (!confirm(lang === 'pt'
      ? `Sair da campanha "${camp.name}"? A ficha continua com você.`
      : `Leave campaign "${camp.name}"? The sheet stays with you.`)) return;
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
  // Cerimônias (só visual, src/sheet/FhCeremonies.jsx): o selo quando o nível sobe e as
  // gemas que reacendem (descanso, trapaça, mestre).
  const rootRef = useRef(null);
  const [levelCer, closeLevelCer] = useLevelCeremony(char);
  useGemRelight(rootRef);
  // Painel de combate (V13): na vez do jogador sobe para o topo da ficha (logo abaixo do
  // "voltar", antes do retrato) se não está inteiro à vista no lugar de sempre e o topo
  // está à vista; senão fica e só acende "SUA VEZ". Depois de subir, fica no topo até a
  // luta acabar (src/player/player-model.js, combatPanelSpot). O combate novo só entra
  // 600 ms depois do último toque (useCombatPanel), e o lugar é decidido nessa hora,
  // medido antes de pintar. Um estado só para os dois lugares (CombatActionPanel.jsx).
  const combatPanel = useCombatPanel(char, { rev: campRev, onUpdate });
  const inCombat = !!char.inCampaign && !!combatPanel.myCombatant;
  const [panelSpot, setPanelSpot] = useState('base');
  const panelBaseRef = useRef(null);  // o lugar de sempre (vazio quando o painel está no topo)
  useLayoutEffect(() => {
    const r = panelBaseRef.current?.getBoundingClientRect();
    const hero = rootRef.current?.querySelector('.sheet-hero')?.getBoundingClientRect();
    setPanelSpot(prev => combatPanelSpot(prev, {
      inCombat, isMyTurn: combatPanel.isMyTurn, rect: r || null, topAt: hero ? hero.top : null,
      viewBottom: window.innerHeight,
    }));
  }, [inCombat, combatPanel.isMyTurn]);
  const turnOnTop = inCombat && panelSpot === 'top';

  const update = (patch) => onUpdate({ ...char, ...patch });
  const updateRef = useRef(update);
  updateRef.current = update;
  useEffect(() => {
    window.__updateChar = (patch) => updateRef.current(patch);
    return () => { window.__updateChar = null; };
  }, []);
  // Rolagens da ficha na Tela (V15, src/dice/sheet-roll.js): ficha da conta numa
  // campanha → o rolador sabe qual personagem rola e manda o resultado à Tela.
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

  // Traços de classe espalhados pela ficha: cada aba mostra os seus, junto do que tratam
  // (src/sheet/feature-placement.js). A ficha recalcula a cada tecla (notas, PV…); a chave
  // só muda com classe, nível, subclasse e escolhas, então o cálculo não se repete à toa.
  // Ficha com dado estranho (antiga, importada): abre como antes, só sem os traços espalhados.
  const fkey = featureKey(char);
  const placed = useMemo(() => {
    try { return placeFeatures(char); } catch { return placeFeatures({}); }
  }, [fkey]); // eslint-disable-line react-hooks/exhaustive-deps

  // === HP actions ===
  // Se em Wild Shape: dano vai pra fera. Quando ela chega a 0, o excedente
  // vai pro HP humanoide pré-transformação e sai da forma.
  const applyHp = (delta) => {
    const ws = char.wildShape;
    if (ws?.active && char.rulesVersion !== '2024' && delta < 0) {
      const dmg = -delta;
      const beastHp = ws.beastCurrentHp || 0;
      if (dmg <= beastHp) {
        update({
          currentHp: beastHp - dmg,
          wildShape: { ...ws, beastCurrentHp: beastHp - dmg },
        });
      } else {
        const excess = dmg - beastHp;
        const preHp = ws.preTransformHp || 0;
        const newHumanoidHp = Math.max(0, preHp - excess);
        update({
          currentHp: newHumanoidHp,
          tempHp: ws.preTransformTempHp || 0,
          wildShape: { active: false },
        });
      }
      setHpDelta(0);
      return;
    }
    if (ws?.active && char.rulesVersion !== '2024' && delta > 0) {
      // Cura em wild shape vai pra fera (não passa do max dela)
      const beastMax = ws.beastMaxHp || 0;
      const beastHp = ws.beastCurrentHp || 0;
      const newBeast = Math.min(beastMax, beastHp + delta);
      update({
        currentHp: newBeast,
        wildShape: { ...ws, beastCurrentHp: newBeast },
      });
      setHpDelta(0);
      return;
    }
    let newCurrent = char.currentHp + delta;
    let newTemp = char.tempHp || 0;
    if (delta < 0) {
      const dmg = -delta;
      const absorbed = Math.min(newTemp, dmg);
      newTemp -= absorbed;
      newCurrent = char.currentHp - (dmg - absorbed);
    } else {
      newCurrent = Math.min(char.maxHp, char.currentHp + delta);
    }
    newCurrent = Math.max(0, Math.min(newCurrent, char.maxHp));
    update({ currentHp: newCurrent, tempHp: newTemp });
    setHpDelta(0);
  };

  // O ponto comum das rolagens da ficha (perícia, salvaguarda, ataque, dano, iniciativa,
  // morte, magia): rola no aparelho e, numa campanha, vai também à Tela (V15).
  const roll = (config) => {
    if (window.__diceRoll) window.__diceRoll({ ...config, sheet: true });
  };

  // Raiz .ficha: escopo do visual da ficha (src/sheet/ficha.css). Sem transform,
  // filter, isolation nem z-index aqui: os modais da ficha não são portais.
  // As classes c-* (condições ativas) e is-down (PV 0) só mudam a aparência
  // (retrato e camadas decorativas: src/sheet/FhConditions.jsx).
  return (
    <RestModeContext.Provider value={restCtx}>
    <div ref={rootRef} className={['ficha', ...condClasses(char), preview ? 'is-version-readonly' : '', restMode ? `is-resting is-resting-${restMode}` : ''].filter(Boolean).join(' ')}>
      <FhConditionFx conditions={char.conditions} />
      {levelCer && <FhLevelCeremony key={levelCer.key} cer={levelCer} char={char} lang={lang} onClose={closeLevelCer} />}
      <SheetHero
        char={char}
        lang={lang}
        onAvatar={(av) => update({ avatar: av })}
        onAvatarPosition={(pos) => update({ avatarPosition: pos })}
        onBack={onBack}
        backLabel={backLabel}
        turnPanel={turnOnTop ? <CombatActionPanel panel={combatPanel} char={char} lang={lang} /> : null}
        onLevelUp={onLevelUp}
        onInspiration={() => update({ inspiration: !char.inspiration })}
        cls={cls} race={race} bg={bg}
        onEdit={onEdit}
        exportBtnRef={exportBtnRef}
        setExportOpen={setExportOpen}
        setCheatOpen={setCheatOpen}
        versionChip={preview ? (
          <span className="fh-version-chip is-readonly no-print">
            <span aria-hidden="true">🔒</span>
            <span>{preview.name || (pt ? 'Versão guardada' : 'Stored version')}</span>
          </span>
        ) : isForkSheet ? (
          <button type="button" className="fh-version-chip is-campaign no-print"
            onClick={() => setVersionsOpen(true)}
            aria-haspopup="dialog"
            aria-label={pt ? `Versão: ${Forks.forkLabel(char, lang)}. Ver as outras versões` : `Version: ${Forks.forkLabel(char, lang)}. See the other versions`}>
            <span aria-hidden="true">{char.versionKind === 'oneshot' ? '🎲' : '🏰'}</span>
            <span>{Forks.forkLabel(char, lang)}</span>
            <span aria-hidden="true">▾</span>
          </button>
        ) : vStore ? (
          <button type="button" className={`fh-version-chip no-print${vCurrent ? ' is-campaign' : ''}`}
            onClick={() => setVersionsOpen(true)}
            aria-haspopup="dialog"
            aria-label={pt ? `Versão em uso: ${vCurrent ? vCurrent.name : 'Modelo'}. Trocar de versão` : `Version in use: ${vCurrent ? vCurrent.name : 'Template'}. Switch version`}>
            <span aria-hidden="true">{vCurrent ? '🏰' : '📜'}</span>
            <span>{vCurrent ? vCurrent.name : (pt ? 'Modelo' : 'Template')}</span>
            <span aria-hidden="true">▾</span>
          </button>
        ) : null}
        campaignBanner={preview ? null :
          <CampaignModeBanner
            char={char}
            lang={lang}
            onChange={onUpdate}
            rev={campRev}
            onManage={typeof char.id === 'number' ? () => setVersionsOpen(true) : null}
            onLogin={onLogin}
            campFoldOpen={campFoldOpen}
            setCampFoldOpen={setCampFoldOpen}
            campaignsList={campaignsList}
            onLeaveCampaign={leaveCampaign}
            busyLeaveId={busyLeaveId}
          />
        }
        campaignsList={campaignsList}
        campFoldOpen={campFoldOpen}
        setCampFoldOpen={setCampFoldOpen}
        update={update}
      />

      {/* Pedido de teste do mestre: logo abaixo do topo, para ser visto sem rolar */}
      {char.inCampaign && typeof char.id === 'number' && (
        <PlayerChecksBanner char={char} lang={lang} />
      )}
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
          <CampaignLinkModal char={char} lang={lang} onClose={() => setCampOpen(false)} onDone={campaignChanged} familyIds={family.map(c => c.id)} />
        </Suspense>
      )}
      {versionsOpen && !preview && (
        <Suspense fallback={null}>
          <VersionsModal
            char={char}
            lang={lang}
            onClose={() => setVersionsOpen(false)}
            onSave={onSaveVersion}
            onDone={async (msg) => { setCampRev(n => n + 1); await onCampaignChange?.(msg); }}
            onPreview={onPreviewVersion}
            onAddCampaign={() => { setVersionsOpen(false); setCampOpen(true); }}
            family={family}
            onFork={onFork ? async (kind) => { setVersionsOpen(false); await onFork(char, kind); } : null}
            onOpenSheet={onOpenSheet ? (id) => { setVersionsOpen(false); onOpenSheet(id); } : null}
          />
        </Suspense>
      )}

      {char.wildShape?.active && (
        <WildShapeBanner char={char} lang={lang} onChange={onUpdate} />
      )}

      {char.inCampaign && (
        <div ref={panelBaseRef}>
          {!turnOnTop && <CombatActionPanel panel={combatPanel} char={char} lang={lang} />}
        </div>
      )}

      {cheatOpen && <CheatModeModal char={char} lang={lang} update={update} onClose={() => setCheatOpen(false)} />}
      {exportOpen && (
        <FhExportModal char={char} lang={lang} handlers={{ onPrint, onExportPdf, onShare, onExport }} onClose={closeExport} />
      )}

      <ScrollTabs className="no-print" activeKey={tab} lang={lang} role="tablist" aria-label={lang === 'pt' ? 'Seções da ficha' : 'Sheet sections'}>
        {SHEET_TABS.map(tb => (
          <button
            key={tb.id}
            role="tab"
            aria-selected={tab === tb.id}
            className={`tab ${tab === tb.id ? 'active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {lang === 'pt' ? tb.labelPt : tb.labelEn}
          </button>
        ))}
      </ScrollTabs>

      {/* Conteúdo da aba com suporte a gestos de deslizamento (swipe) no mobile */}
      <div
        className={`fh-tab-body${tab === 'play' ? ' is-play' : ''}`}
        onTouchStart={onTabBodyTouchStart}
        onTouchEnd={onTabBodyTouchEnd}
      >
        {tab === 'play' && (
          <>
            <SheetPlay
              char={char} lang={lang} update={update} applyHp={applyHp}
              ac={ac} speed={speed} profB={profB} initBonus={initBonus}
              passPerc={passPerc} slots={slots} roll={roll} placed={placed}
            />
            {children && <div className="fh-after no-print">{children}</div>}
          </>
        )}

        {tab === 'stats' && (
          <SheetAbilities
            char={char} lang={lang} update={update}
            profB={profB} roll={roll}
          />
        )}

        {(tab === 'skills' || tab === 'tools') && (
          <SheetSkills
            char={char} lang={lang} update={update}
            passPerc={passPerc} roll={roll} placed={placed}
          />
        )}

        {tab === 'features' && (
          <SheetFeatures
            char={char} lang={lang} placed={placed} cls={cls} race={race} update={update}
          />
        )}

        {tab === 'spells' && (
          <SheetSpells char={char} lang={lang} update={update} slots={slots} roll={roll} placed={placed} />
        )}

        {tab === 'inv' && (
          <SheetInventory char={char} lang={lang} update={update} roll={roll} cls={cls} bg={bg} placed={placed} />
        )}

        {tab === 'story' && <SheetStory char={char} lang={lang} update={update} cls={cls} race={race} />}
        {tab === 'notes' && <SheetNotes char={char} lang={lang} update={update} />}
        {tab === 'npcs'  && <SheetNpcs char={char} lang={lang} update={update} />}
      </div>

      <div className="fh-danger-zone no-print">
        <button className="btn btn-ghost btn-danger btn-sm" onClick={onDelete}>
          <Icon name="trash" size={14}/> {t('delete', lang)}
        </button>
      </div>
    </div>
    </RestModeContext.Provider>
  );
};

// ===== Sub-components =====

// (SheetHero and LevelUpButton relocated above Sheet)

// Level at which each class chooses a subclass
const SUBCLASS_LEVEL = {
  artificer: 3,
  barbarian: 3, bard: 3, cleric: 1, druid: 2, fighter: 3,
  monk: 3, paladin: 3, ranger: 3, rogue: 3, sorcerer: 1, warlock: 1, wizard: 2,
};

const SUBCLASS_LABEL = {
  barbarian: { pt: 'Caminho', en: 'Path' },
  bard:      { pt: 'Colégio', en: 'College' },
  cleric:    { pt: 'Domínio Divino', en: 'Divine Domain' },
  druid:     { pt: 'Círculo Druídico', en: 'Druid Circle' },
  fighter:   { pt: 'Arquétipo Marcial', en: 'Martial Archetype' },
  monk:      { pt: 'Tradição Monástica', en: 'Monastic Tradition' },
  paladin:   { pt: 'Juramento Sagrado', en: 'Sacred Oath' },
  ranger:    { pt: 'Arquétipo de Ranger', en: 'Ranger Archetype' },
  rogue:     { pt: 'Arquétipo Ladino', en: 'Roguish Archetype' },
  sorcerer:  { pt: 'Origem de Feiticeiro', en: 'Sorcerous Origin' },
  warlock:   { pt: 'Patrono Sobrenatural', en: 'Otherworldly Patron' },
  wizard:    { pt: 'Tradição Arcana', en: 'Arcane Tradition' },
};


// Escolhas de subclasse (e de espécie pendentes) dobradas no pé do painel do personagem:
// o resumo diz o que já foi escolhido; abre sozinho quando falta escolher algo.
const HeroChoicesFold = ({ char, lang, update }) => {
  const pt = lang === 'pt';
  const entries = (() => { try { return Utils.classEntries(char); } catch { return []; } })();
  const rows = entries.map(e => {
    const view = Utils.classView(char, e);
    const subs = subclassesFor(view);
    const eligible = subs.length && (view.level || 1) >= Utils.subclassLevel(view);
    const cur = subs.find(x => x.id === view.subclass);
    return { e, eligible, name: cur?.name?.[lang] || null };
  }).filter(r => r.eligible);
  let speciesPending = 0;
  try { speciesPending = Utils.speciesChoiceIssues(char).filter(i => !(char.inCampaign && (i.key === 'feat' || i.key === 'asi'))).length; } catch { /* sem espécie */ }
  if (!rows.length && !speciesPending) return null;
  const pending = rows.some(r => !r.name) || speciesPending > 0;
  const names = rows.filter(r => r.name).map(r => r.name).join(' · ');
  return (
    <details className={`fh-hero-fold no-print${pending ? ' is-pending' : ''}`} open={pending}>
      <summary>
        <span className="fh-hero-fold-k">⚜ {pt ? 'Subclasses' : 'Subclasses'}</span>
        <span className="fh-hero-fold-v">{names || (pt ? 'escolha pendente' : 'choice pending')}{pending && <span className="fh-hero-fold-dot" aria-label={pt ? 'pendente' : 'pending'} />}</span>
      </summary>
      <div className="fh-hero-fold-body">
        <SubclassBanner char={char} lang={lang} update={update} />
        <SpeciesBanner char={char} lang={lang} update={update} />
      </div>
    </details>
  );
};

// Uma faixa por classe: em multiclasse cada classe escolhe a própria subclasse
// quando chega ao nível dela (grava em multiclass[i] fora da classe inicial).
// O que já foi escolhido fica selado (guardSealedPatch: defesa atrás dos botões).
const SubclassBanner = ({ char, lang, update }) => {
  const multi = Utils.isMulticlass(char);
  return Utils.classEntries(char).map(e => {
    const view = Utils.classView(char, e);
    const save = (patch) => {
      const safe = guardSealedPatch(view, patch, subclassesFor(view));
      if (!Object.keys(safe).length) return;
      if (e.primary) update(safe);
      else update({ multiclass: char.multiclass.map(m => m.id === e.id ? { ...m, ...safe } : m) });
    };
    return <SubclassRow key={e.id} char={view} lang={lang} showClass={multi} update={save} />;
  });
};

const SubclassRow = ({ char, lang, update, showClass }) => {
  const [open, setOpen] = useState(false);
  const subs = subclassesFor(char);
  if (!subs.length) return null;
  const subLv = Utils.subclassLevel(char);
  const eligible = (char.level || 1) >= subLv;
  if (!eligible) return null;

  const base = SUBCLASS_LABEL[char.className] || { pt: 'Subclasse', en: 'Subclass' };
  const label = showClass
    ? { pt: `${base.pt} · ${tName('class', char.className, 'pt')}`, en: `${base.en} · ${tName('class', char.className, 'en')}` }
    : base;
  const current = subs.find(s => s.id === char.subclass);

  if (!current) {
    // Faixa de destaque (src/sheet/ficha.css: .fh-banner) — escolher agora
    return (
      <>
        <div className="card no-print fh-banner">
          <div className="fh-banner-text">
            <div className="eyebrow fh-banner-eyebrow">{label[lang]}</div>
            <div className="fh-banner-title">
              {char.className === 'druid' ? t('chooseCircle', lang) : t('chooseSubclass', lang)}
            </div>
          </div>
          <button className="btn btn-sm btn-primary fh-banner-btn" onClick={() => setOpen(true)}>
            <Icon name="sparkle" size={12}/> {char.className === 'druid' ? t('pickCircle', lang) : t('pickSubclass', lang)}
          </button>
        </div>
        {open && <SubclassModal char={char} lang={lang} subs={subs} label={label} update={update} onClose={() => setOpen(false)} />}
      </>
    );
  }

  // Escolhida, a subclasse fica selada (src/progression/subclass-lock.js): sem o botão
  // de trocar, com cadeado e dica; com o modo trapaça (fora de campanha) volta o
  // "Alterar". O terreno do Círculo da Terra segue a regra: a primeira escolha dele
  // continua aqui, mesmo com o círculo selado.
  const lock = subclassLock(char, subs);
  const needsLand = char.subclass === 'land' && !char.landType && (current.landTypes || []).length > 0;
  return (
    <>
      <div className={`subclass-strip no-print${lock.locked ? ' is-sealed' : ''}`}>
        <div className="subclass-strip-text">
          <span className="eyebrow">{label[lang]}</span>
          <span className="subclass-strip-name">{current.name[lang]}</span>
          {lock.locked && (
            <span className="fh-strip-lock"><span aria-hidden="true">🔒</span> {sealHint(lock.reason, lang)}</span>
          )}
        </div>
        {char.subclass === 'land' && char.landType && (
          <span className="tag fh-strip-tag">
            {(current.landTypes || []).find(l => l.id === char.landType)?.name[lang] || char.landType}
          </span>
        )}
        {!lock.locked ? (
          <button className="btn btn-sm btn-ghost" onClick={() => setOpen(true)} aria-label={lang === 'pt' ? 'Alterar' : 'Change'}>
            <Icon name="edit" size={12}/> {lang === 'pt' ? 'Alterar' : 'Change'}
          </button>
        ) : needsLand && (
          <button className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>
            <Icon name="sparkle" size={12}/> {lang === 'pt' ? 'Escolher terreno' : 'Choose terrain'}
          </button>
        )}
      </div>
      {open && <SubclassModal char={char} lang={lang} subs={subs} label={label} update={update} onClose={() => setOpen(false)} landOnly={lock.locked} />}
    </>
  );
};

// Escolhas de espécie pendentes (linhagem, ancestral, talento do Humano…): faixa
// de destaque como a da subclasse. Alterar depois fica na aba História.
const SpeciesBanner = ({ char, lang, update }) => {
  const [open, setOpen] = useState(false);
  const issues = Utils.speciesChoiceIssues(char).filter(i => !(char.inCampaign && (i.key === 'feat' || i.key === 'asi')));
  if (!issues.length && !open) return null;
  return (
    <>
      <div className="card no-print fh-banner">
        <div className="fh-banner-text">
          <div className="eyebrow fh-banner-eyebrow">{lang === 'pt' ? 'Espécie' : 'Species'} · {tName('race', char.race, lang)}</div>
          <div className="fh-banner-title">
            {issues.map(i => i[lang] || i.pt).join(' · ')}
          </div>
        </div>
        <button className="btn btn-sm btn-primary fh-banner-btn" onClick={() => setOpen(true)}>
          <Icon name="sparkle" size={12}/> {lang === 'pt' ? 'Escolher' : 'Choose'}
        </button>
      </div>
      {open && <SpeciesChoicesModal char={char} lang={lang} onSave={update} onClose={() => setOpen(false)} />}
    </>
  );
};

// landOnly: círculo já selado, só falta o terreno (a primeira escolha dele) — a lista
// de subclasses some e o modal só oferece os terrenos.
const SubclassModal = ({ char, lang, subs, label, update, onClose, landOnly = false }) => {
  const [pendingId, setPendingId] = useState(char.subclass || '');
  const [pendingLand, setPendingLand] = useState(char.landType || '');
  const selected = subs.find(s => s.id === pendingId);
  const needsLand = selected && selected.id === 'land' && selected.landTypes;
  const canSave = pendingId && (!needsLand || pendingLand);

  const save = () => {
    update(landOnly ? { landType: pendingLand } : {
      subclass: pendingId,
      landType: needsLand ? pendingLand : '',
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} title={label[lang]}>
      {landOnly && selected && (
        <div className="text-sm" style={{ marginBottom: 12, color: 'var(--ink-secondary)' }}>
          {selected.name[lang]}: {lang === 'pt' ? 'escolha o seu terreno sagrado.' : 'choose your sacred terrain.'}
        </div>
      )}
      {!landOnly && <div className="options-list" style={{ marginBottom: 16 }}>
        {subs.map(sc => {
          const isSel = pendingId === sc.id;
          return (
            <button key={sc.id} className={`option ${isSel ? 'selected' : ''}`}
              onClick={() => { setPendingId(sc.id); setPendingLand(''); }}>
              <div className="option-title">{sc.name[lang]}</div>
              <div className="option-meta text-xs" style={{ marginTop: 4 }}>{sc.desc[lang]}</div>
              {isSel && sc.features && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--stroke-faint)' }}>
                  {sc.features.map((f, i) => (
                    <div key={i} className="text-sm" style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--gold-deep)' }}>Lv{f.level} {f.name[lang]}:</strong>{' '}
                      <span style={{ color: 'var(--ink-secondary)' }}>{f.desc[lang]}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>}

      {needsLand && (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {lang === 'pt' ? 'Terreno Sagrado' : 'Sacred Terrain'}
          </div>
          <div className="options-list cols-4" style={{ marginBottom: 16 }}>
            {selected.landTypes.map(lt => (
              <button key={lt.id} className={`option ${pendingLand === lt.id ? 'selected' : ''}`}
                style={{ padding: '8px 12px', textAlign: 'center' }}
                onClick={() => setPendingLand(lt.id)}>
                {lt.name[lang]}
              </button>
            ))}
          </div>
        </>
      )}


      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>
          {lang === 'pt' ? 'Cancelar' : 'Cancel'}
        </button>
        <button className="btn" onClick={save} disabled={!canSave}
          style={{ background: canSave ? 'var(--gold)' : 'var(--surface-2)', color: canSave ? 'var(--bg-deep)' : 'var(--ink-muted)' }}>
          {lang === 'pt' ? 'Salvar' : 'Save'}
        </button>
      </div>
    </Modal>
  );
};

// ASI levels: most classes 4,8,12,16,19 — Fighter +6,14, Rogue +10
// ===== Modo trapaça =====
// Liberado pelo próprio jogador, mas sempre visível (selo na ficha e para o mestre).
const CheatModeModal = ({ char, lang, update, onClose }) => {
  const pt = lang === 'pt';
  const on = !!char.cheatMode;
  const locked = !!char.inCampaign; // servidor trava nível/PV/atributos em campanha
  const [draft, setDraft] = useState({ level: char.level || 1, maxHp: char.maxHp || 1, abilities: { ...char.abilities } });
  const items = pt ? [
    'Editor livre de nível, PV máximo e atributos (aqui embaixo e no botão Editar).',
    'Magias de qualquer lista e acima do limite de truques e magias preparadas/conhecidas.',
    'Forma Selvagem com qualquer fera: sem limite de ND, voo, natação ou usos.',
    // Fora de campanha a faixa da subclasse manda o jogador para cá (subclass-lock.js).
    ...(locked ? [] : ['Trocar a subclasse já escolhida (círculo, domínio, juramento, patrono…) e o terreno do Círculo da Terra.']),
    'A ficha ganha o selo 🎲 Trapaça, visível para você e para o mestre.',
    'Desligar não desfaz o que foi alterado.',
  ] : [
    'Free editor for level, max HP and ability scores (below and in Edit).',
    'Spells from any list, above cantrip and prepared/known limits.',
    'Wild Shape into any beast: no CR, fly, swim or use limits.',
    ...(locked ? [] : ['Change an already chosen subclass (circle, domain, oath, patron…) and the Circle of the Land terrain.']),
    'The sheet gets a 🎲 Cheat badge, visible to you and your DM.',
    'Turning it off does not undo changes.',
  ];
  const save = () => {
    const lv = Math.max(1, Math.min(20, +draft.level || 1));
    const hp = Math.max(1, +draft.maxHp || 1);
    update({ level: lv, maxHp: hp, currentHp: Math.min(char.currentHp ?? hp, hp), abilities: draft.abilities });
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 8 }}>🎲 {pt ? 'Modo trapaça' : 'Cheat mode'}</h3>
      <div className="text-sm" style={{ marginBottom: 8 }}>{pt ? 'Sem ele, nível, PV e atributos só mudam pela subida de nível guiada. Com ele ligado:' : 'Without it, level, HP and abilities only change through guided level-up. When on:'}</div>
      <ul className="text-sm" style={{ margin: '0 0 12px 18px', color: 'var(--ink-secondary)' }}>
        {items.map((it, i) => <li key={i} style={{ marginBottom: 4 }}>{it}</li>)}
      </ul>
      {locked && (
        <div className="text-sm" style={{ padding: 10, borderRadius: 6, background: 'var(--bg-elev)', marginBottom: 12 }}>
          🔒 {pt
            ? 'Esta ficha está numa campanha: o servidor continua travando nível, PV, atributos e a subclasse (só o mestre altera), e a Forma Selvagem é validada pelo servidor. Aqui o modo só libera as magias.'
            : 'This sheet is in a campaign: the server still locks level, HP, abilities and the subclass (DM only), and Wild Shape is server-validated. Here the mode only unlocks spells.'}
        </div>
      )}
      <button className={`btn ${on ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%', marginBottom: 12 }}
        onClick={() => update(on ? { cheatMode: false } : { cheatMode: true, cheatModeSince: new Date().toISOString() })}>
        {on ? (pt ? 'Desligar modo trapaça' : 'Turn cheat mode off') : (pt ? 'Ligar modo trapaça' : 'Turn cheat mode on')}
      </button>
      {on && !locked && (
        <>
          <Filigree>{pt ? 'Editor livre' : 'Free editor'}</Filigree>
          <div className="row gap-3" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label>{t('level', lang)}</label>
              <input aria-label={t('level', lang)} type="number" min="1" max="20" value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>{pt ? 'PV máximo' : 'Max HP'}</label>
              <input aria-label={pt ? 'PV máximo' : 'Max HP'} type="number" min="1" value={draft.maxHp} onChange={e => setDraft({ ...draft, maxHp: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {SRD.ABILITIES.map(k => (
              <div key={k}>
                <label>{t(k + 'Sh', lang)} {pt ? '(base)' : '(base)'}</label>
                <input type="number" min="1" max="30" value={draft.abilities[k] ?? 10}
                  onChange={e => setDraft({ ...draft, abilities: { ...draft.abilities, [k]: Math.max(1, Math.min(30, +e.target.value || 1)) } })} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>{pt ? 'Salvar' : 'Save'}</button>
        </>
      )}
    </Modal>
  );
};

// ===== Campaign Mode Banner =====

/**
 * Mostra status da ficha (standalone ou em campanha) + botão "Sair" pro player.
 * Em standalone, mostra um chip discreto "Ficha pessoal".
 * Em campanha, mostra o nome da campanha (busca via API) e botão pra sair.
 */
// Faixa da campanha. onManage: abre o modal "Campanha" (só ficha da conta);
// onLogin: ficha do aparelho, dica para entrar na conta. rev: busca de novo depois
// de atrelar/desatrelar/trocar.
const CampaignModeBanner = ({
  char,
  lang,
  onChange,
  onManage,
  onLogin,
  rev = 0,
  campFoldOpen,
  setCampFoldOpen,
  campaignsList = [],
  onLeaveCampaign,
  busyLeaveId,
}) => {
  const [busy, setBusy] = useState(false);
  const pt = lang === 'pt';

  const leave = async (c) => {
    if (!c) return;
    if (!confirm(lang === 'pt'
      ? `Sair da campanha "${c.name}"? A ficha continua com você.`
      : `Leave campaign "${c.name}"? The sheet stays with you.`)) return;
    setBusy(true);
    try {
      await api.removeMember(c.id, c.membershipId);
      onChange({ ...char, inCampaign: false });
    } catch (e) {
      alert(errorMessage(e));
    } finally { setBusy(false); }
  };

  if (!campFoldOpen) return null;

  return (
    <div className="fh-hero-campaigns-panel card no-print">
      <div className="fh-hero-campaigns-header">
        <span className="fh-hero-campaigns-title">
          🏰 {pt ? 'Campanhas do Personagem' : 'Character Campaigns'} ({campaignsList.length})
        </span>
        <div className="fh-hero-campaigns-header-actions">
          {campaignsList.length > 0 && onManage && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onManage}>
              + {pt ? 'Atrelar' : 'Link'}
            </button>
          )}
          {setCampFoldOpen && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setCampFoldOpen(false)} aria-label="Fechar">
              ✕
            </button>
          )}
        </div>
      </div>
      {campaignsList.length === 0 ? (
        <div className="fh-hero-campaigns-empty">
          <p className="muted small">
            {pt ? 'Ficha pessoal (não está em nenhuma campanha).' : 'Personal sheet (not assigned to any campaign).'}
          </p>
          {onManage && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onManage}>
              🏰 {pt ? 'Atrelar a uma campanha' : 'Link to a campaign'}
            </button>
          )}
          {typeof char.id !== 'number' && onLogin && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onLogin}>
              {pt ? 'Entrar na conta' : 'Log in'}
            </button>
          )}
        </div>
      ) : (
        <div className="fh-hero-campaigns-list">
          {campaignsList.map(camp => (
            <div
              key={camp.id}
              className="fh-hero-campaign-card"
              style={camp.coverImage ? {
                backgroundImage: `linear-gradient(rgba(14, 10, 8, 0.8), rgba(14, 10, 8, 0.94)), url(${camp.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              <div className="fh-hero-campaign-card-header">
                <div className="fh-hero-campaign-name-block">
                  <strong className="fh-hero-campaign-name">{camp.name}</strong>
                  <span className="tag fh-hero-camp-tag-mode" style={{ fontSize: '0.72rem', padding: '1px 6px', margin: '0 4px', background: 'rgba(214, 176, 100, 0.15)', border: '1px solid rgba(214, 176, 100, 0.4)', borderRadius: 3, color: '#f3e6cb' }}>
                    {camp.levelingMode === 'xp' ? (camp.xp ? `${camp.xp} XP` : 'XP') : (pt ? 'Marcos' : 'Milestones')}
                  </span>
                  {camp.sponsored && <span className="fh-hero-camp-tag-sponsored">{pt ? 'Vaga da mesa' : 'Table seat'}</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs fh-hero-campaign-leave"
                  onClick={() => onLeaveCampaign ? onLeaveCampaign(camp) : leave(camp)}
                  disabled={busyLeaveId === camp.id || busy}
                  title={pt ? `Sair da campanha "${camp.name}"` : `Leave campaign "${camp.name}"`}
                >
                  {busyLeaveId === camp.id || busy ? '…' : (pt ? '🚪 Sair' : '🚪 Leave')}
                </button>
              </div>
              {typeof char.id === 'number' && camp.status !== 'closed' && (
                <div className="fh-hero-campaign-card-rolls">
                  <SheetRollTarget lang={lang} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== Wild Shape (Druid) =====

/** Banner mostrado quando o druida está transformado. Mostra nome da fera +
 * HP atual da fera / HP da fera + botão "Sair da forma". */
const WildShapeBanner = ({ char, lang, onChange }) => {
  const ws = char.wildShape || {};
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const endShape = async () => {
    setBusy(true); setErr('');
    try {
      if (char.id && !String(char.id).startsWith('local-') && typeof char.id === 'number') {
        const res = await api.wildShapeEnd(char.id);
        onChange(res.character.data ? { ...res.character.data, id: res.character.id, name: res.character.name, updatedAt: res.character.updated_at } : char);
      } else {
        // local: aplica direto
        onChange({ ...char,
          currentHp: char.rulesVersion === '2024' ? char.currentHp : ws.preTransformHp || 0,
          tempHp: char.rulesVersion === '2024' ? char.tempHp : ws.preTransformTempHp || 0,
          wildShape: { active: false },
        });
      }
    } catch (e) {
      setErr(errorMessage(e));
    } finally { setBusy(false); }
  };
  const pct = ws.beastMaxHp ? Math.max(0, Math.min(100, ((ws.beastCurrentHp || 0) / ws.beastMaxHp) * 100)) : 0;
  return (
    <div className="wild-shape-banner">
      <div className="wsb-icon">🐺</div>
      <div className="wsb-info">
        <div className="wsb-title">
          {lang === 'pt' ? 'Em Forma Selvagem:' : 'In Wild Shape:'}{' '}
          <strong>{ws.beastName}</strong>
        </div>
        <div className="wsb-hp">
          <div className="wsb-hp-bar"><div className="wsb-hp-fill" style={{ width: `${pct}%` }} /></div>
          <span className="wsb-hp-text">{char.rulesVersion === '2024' ? `${char.currentHp} / ${char.maxHp} HP · ${char.tempHp || 0} HP temp` : `${ws.beastCurrentHp} / ${ws.beastMaxHp} HP`} · CA {ws.beastAc}</span>
        </div>
        <div className="wsb-pre">
          {char.rulesVersion === '2024' ? (lang === 'pt' ? 'Mantém seus próprios pontos de vida.' : 'Retains your own hit points.') : `${lang === 'pt' ? 'Forma humanoide guardada:' : 'Stored humanoid:'} ${ws.preTransformHp} HP`}
        </div>
        {err && <div className="fh-ws-err" role="alert">{err}</div>}
      </div>
      <button className="btn btn-ghost" onClick={endShape} disabled={busy}>
        {busy ? '…' : (lang === 'pt' ? 'Sair da forma' : 'Revert form')}
      </button>
    </div>
  );
};

const BeastModal = ({ beast, lang, onClose, onTransform, canTransform, transformError }) => {
  const speeds = [`${Utils.speedLabel(beast.speed, lang)}`];
  if (beast.fly)    speeds.push(`${lang === 'pt' ? 'Voo' : 'Fly'} ${Utils.speedLabel(beast.fly, lang)}`);
  if (beast.swim)   speeds.push(`${lang === 'pt' ? 'Nat.' : 'Swim'} ${Utils.speedLabel(beast.swim, lang)}`);
  if (beast.climb)  speeds.push(`${lang === 'pt' ? 'Esc.' : 'Climb'} ${Utils.speedLabel(beast.climb, lang)}`);
  if (beast.burrow) speeds.push(`${lang === 'pt' ? 'Cav.' : 'Burrow'} ${Utils.speedLabel(beast.burrow, lang)}`);
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 2 }}>{tName('beast', beast.id, lang)}</h3>
      <div className="text-xs muted" style={{ marginBottom: 12 }}>
        {beast.size} {lang === 'pt' ? 'Besta' : 'Beast'} · {lang === 'pt' ? 'ND' : 'CR'} {beast.cr} · {speeds.join(', ')}
      </div>
      <div className="combat-grid" style={{ marginBottom: 12 }}>
        <div className="combat-box"><div className="eyebrow">CA</div><div className="combat-box-value">{beast.ac}</div></div>
        <div className="combat-box"><div className="eyebrow">{lang === 'pt' ? 'PV' : 'HP'}</div><div className="combat-box-value">{beast.hp}</div></div>
        <div className="combat-box">
          <div className="eyebrow">{lang === 'pt' ? 'Des.' : 'Speed'}</div>
          <div className="combat-box-value" style={{ fontSize: '1rem' }}>{Utils.speedLabel(beast.speed, lang)}</div>
        </div>
      </div>
      <div className="abil-grid" style={{ marginBottom: 12 }}>
        {SRD.ABILITIES.map(k => {
          const score = beast[k];
          const mod = Math.floor((score - 10) / 2);
          return (
            <div key={k} className="abil-box">
              <div className="abil-box-name">{t(k + 'Sh', lang)}</div>
              <div className="abil-box-mod">{Utils.fmtMod(mod)}</div>
              <div className="abil-box-score">{score}</div>
            </div>
          );
        })}
      </div>
      {beast.traits && beast.traits.length > 0 && (
        <>
          <Filigree>{lang === 'pt' ? 'Traços' : 'Traits'}</Filigree>
          {beast.traits.map((tr, i) => (
            <div key={i} className="text-sm" style={{ marginBottom: 6 }}>
              <strong style={{ color: 'var(--gold-deep)' }}>{tr.name[lang]}.</strong> {tr.desc[lang]}
            </div>
          ))}
        </>
      )}
      {beast.actions && beast.actions.length > 0 && (
        <>
          <Filigree>{lang === 'pt' ? 'Ações' : 'Actions'}</Filigree>
          {beast.actions.map((ac, i) => (
            <div key={i} className="text-sm" style={{ marginBottom: 6 }}>
              <strong style={{ color: 'var(--gold-deep)' }}>{ac.name[lang]}.</strong> {ac.desc[lang]}
            </div>
          ))}
        </>
      )}
      {onTransform && (
        <>
          <Filigree />
          {transformError && <div style={{ color: 'var(--blood-bright)', marginBottom: 8 }}>{transformError}</div>}
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => onTransform(beast)}
            disabled={!canTransform}
            title={!canTransform ? (lang === 'pt' ? 'Sem usos restantes' : 'No uses remaining') : undefined}
          >
            🐾 {lang === 'pt' ? 'Transformar nesta fera' : 'Transform into this beast'}
          </button>
        </>
      )}
    </Modal>
  );
};

// Forma Estelar (Círculo das Estrelas). Texto próprio, resumido do SRD/PHB.
const STARRY_FORMS = [
  { id: 'archer', icon: '🏹', name: { pt: 'Arqueiro', en: 'Archer' },
    desc: { pt: 'Ao entrar e como ação bônus em cada turno: ataque mágico à distância (60 pés), 1d8 + SAB de dano radiante.', en: 'On entering and as a bonus action each turn: ranged spell attack (60 ft), 1d8 + WIS radiant damage.' },
    desc10: { pt: 'Nv. 10: dano vira 2d8.', en: 'Lv 10: damage becomes 2d8.' } },
  { id: 'chalice', icon: '🏆', name: { pt: 'Taça', en: 'Chalice' },
    desc: { pt: 'Ao gastar espaço de magia para curar: você ou uma criatura a 30 pés recupera 1d8 + SAB PV.', en: 'When you spend a spell slot to heal: you or a creature within 30 ft regains 1d8 + WIS HP.' },
    desc10: { pt: 'Nv. 10: cura vira 2d8.', en: 'Lv 10: healing becomes 2d8.' } },
  { id: 'dragon', icon: '🐉', name: { pt: 'Dragão', en: 'Dragon' },
    desc: { pt: 'Em testes de INT/SAB e salvaguardas de CON para concentração, um d20 de 9 ou menos conta como 10.', en: 'On INT/WIS checks and CON saves to maintain concentration, a d20 roll of 9 or lower counts as 10.' },
    desc10: { pt: 'Nv. 10: ganha voo de 20 pés e pode pairar.', en: 'Lv 10: gain 20 ft fly speed and hover.' } },
];

const StarryFormSection = ({ char, level, lang, update, maxUses, usesUsed, cheat }) => {
  const sf = char.starryForm || {};
  // 1º toque mostra o efeito; 2º toque ativa (evita gastar uso sem querer).
  const [peek, setPeek] = useState(sf.form || null);
  const unlocked = level >= (char.rulesVersion === '2024' ? 3 : 2);
  if (!unlocked) return null;
  const canUse = cheat || usesUsed < maxUses;
  const wisMod = Utils.abilityMod(char, 'wis');
  const shown = STARRY_FORMS.find(f => f.id === (peek || sf.form));
  const activate = (id) => {
    // Nv. 10 (Constelações Cintilantes): troca de constelação sem gastar uso.
    if (sf.active) { if (level >= 10 || cheat) update({ starryForm: { ...sf, form: id } }); return; }
    if (!canUse) return;
    update({ starryForm: { active: true, form: id, startedAt: new Date().toISOString() }, wildShapeUses: usesUsed + 1 });
  };
  return (
    <div className="card" style={{ padding: 12, marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="eyebrow" style={{ color: 'var(--gold)' }}>✦ {lang === 'pt' ? 'Forma Estelar' : 'Starry Form'}</div>
        {sf.active && (
          <button className="btn btn-sm btn-ghost" onClick={() => update({ starryForm: { active: false } })}>
            {lang === 'pt' ? 'Encerrar' : 'End'}
          </button>
        )}
      </div>
      <div className="text-xs muted" style={{ marginBottom: 8 }}>
        {lang === 'pt'
          ? `Ação bônus: gaste um uso de Forma Selvagem para brilhar como uma constelação por 10 minutos (luz plena 10 pés). Você não vira fera. SAB ${Utils.fmtMod(wisMod)}.`
          : `Bonus action: spend a Wild Shape use to glow as a constellation for 10 minutes (bright light 10 ft). You don't become a beast. WIS ${Utils.fmtMod(wisMod)}.`}
        {level >= 10 && (lang === 'pt' ? ' Nv. 10: troque de constelação no início de cada turno.' : ' Lv 10: switch constellation at the start of each turn.')}
      </div>
      <div className="starry-choices">
        {STARRY_FORMS.map(f => {
          const isOn = sf.active && sf.form === f.id;
          return (
            <button key={f.id} type="button" className={`starry-choice ${isOn ? 'on' : ''} ${peek === f.id && !isOn ? 'focus' : ''}`}
              onClick={() => (peek === f.id && !isOn ? activate(f.id) : setPeek(f.id))}>
              <span className="ico">{f.icon}</span>{f.name[lang]}
            </button>
          );
        })}
      </div>
      {shown && (
        <div className="text-sm" style={{ marginTop: 8, color: 'var(--ink-secondary)' }}>
          <strong style={{ color: 'var(--ink-primary)' }}>{shown.name[lang]}:</strong> {shown.desc[lang]}
          {level >= 10 && <span style={{ color: 'var(--gold-deep)' }}> {shown.desc10[lang]}</span>}
          {!sf.active && peek && canUse && (
            <div className="text-xs muted" style={{ marginTop: 4 }}>{lang === 'pt' ? 'Toque de novo para ativar (gasta 1 uso).' : 'Tap again to activate (spends 1 use).'}</div>
          )}
        </div>
      )}
      {!sf.active && !canUse && (
        <div className="text-xs muted" style={{ marginTop: 6 }}>{lang === 'pt' ? 'Sem usos de Forma Selvagem restantes.' : 'No Wild Shape uses left.'}</div>
      )}
    </div>
  );
};

// `druid` = ficha vista só como druida (nível e círculo próprios, mesmo em multiclasse).
// `features`: traços de classe que usam a Forma Selvagem (src/sheet/feature-placement.js).
const WildShapePanel = ({ char, druid, lang, update, features = [], multi = false }) => {
  const [selected, setSelected] = useState(null);
  const [showBeasts, setShowBeasts] = useState(false);
  const cheat = !!char.cheatMode;
  const [transformError, setTransformError] = useState('');
  const level = druid.level;
  const currentRules = char.rulesVersion === '2024';
  const maxUses = currentRules ? (level >= 17 ? 4 : level >= 6 ? 3 : 2) : 2;
  const isMoon = druid.subclass === 'moon';
  // Moon circle: CR 1 at lv2-5, floor(level/3) at lv6+; no fly restriction from lv2
  // Standard: CR 1/4 lv2-3 (no fly/swim), CR 1/2 lv4-7 (no fly), CR 1 lv8+
  const maxCr = isMoon
    ? (level >= 6 ? Math.floor(level / 3) : 1)
    : (level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25);
  const crLabel = isMoon
    ? `CR ≤ ${level >= 6 ? Math.floor(level / 3) : 1}`
    : (level >= 8 ? 'CR ≤ 1' : level >= 4 ? 'CR ≤ 1/2' : 'CR ≤ 1/4');
  const available = SRD.BEASTS.filter(b => {
    if (cheat) return true;
    if (b.crNum > maxCr) return false;
    // Moon circle has no fly restriction
    if (level < 8 && b.fly) return false;
    if (!currentRules && level < 4 && b.swim) return false;
    return true;
  });
  const usesUsed = char.wildShapeUses || 0;

  return (
    <section className="fh-panel">
      <FhTitle sub={<>
        {druid.subclass && <span className="fh-sub-hi">{tName('subclass', druid.subclass, lang)}</span>}
        <span>
          {crLabel}
          {!isMoon && level < 8 && (level < 4 ? (lang === 'pt' ? ' · sem voo/nat.' : ' · no fly/swim') : (lang === 'pt' ? ' · sem voo' : ' · no fly'))}
        </span>
      </>}>{lang === 'pt' ? 'Forma Selvagem' : 'Wild Shape'}</FhTitle>
      <div className="row gap-2" style={{ marginBottom: 10, alignItems: 'center' }}>
        <div className="slot-pips wild">
          {Array.from({length: maxUses}, (_, i) => i).map(i => (
            <button
              key={i} type="button"
              className={`slot-pip ${i < usesUsed ? 'used' : ''}`}
              aria-label={gemLabel(lang === 'pt' ? 'Forma Selvagem' : 'Wild Shape', i, maxUses, i < usesUsed, lang)}
              onClick={() => update({ wildShapeUses: i < usesUsed ? i : i + 1 })}
            />
          ))}
        </div>
        <span className="text-xs muted fh-gem-note"><b className="fh-gem-count">{Math.max(0, maxUses - usesUsed)}/{maxUses}</b> {lang === 'pt' ? 'usos' : 'uses'} · {currentRules ? (lang === 'pt' ? '+1 por descanso curto' : '+1 per short rest') : (lang === 'pt' ? 'recupera no descanso curto' : 'recover on short rest')}</span>
      </div>
      <FhFeatures items={features} multi={multi} lang={lang} className="fh-wild-feats"
        label={lang === 'pt' ? 'Traços da Forma Selvagem' : 'Wild Shape features'} />
      {druid.subclass === 'stars' && (
        <StarryFormSection char={char} level={level} lang={lang} update={update} maxUses={maxUses} usesUsed={usesUsed} cheat={cheat} />
      )}
      <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginBottom: 8 }} onClick={() => setShowBeasts(v => !v)}>
        <Icon name={showBeasts ? 'chevron-up' : 'chevron-down'} size={14}/>{' '}
        {showBeasts
          ? (lang === 'pt' ? 'Ocultar formas de fera' : 'Hide beast forms')
          : (lang === 'pt' ? `Ver formas de fera (${available.length})` : `Show beast forms (${available.length})`)}
      </button>
      {showBeasts && <div className="options-list cols-2" style={{ marginBottom: 4 }}>
        {available.map(b => (
          <button key={b.id} className="option" style={{ textAlign: 'left' }} onClick={() => setSelected(b)}>
            <div className="option-title" style={{ fontSize: '0.9rem' }}>{tName('beast', b.id, lang)}</div>
            <div className="option-meta text-xs">
              <span>CR {b.cr}</span>
              <span>HP {b.hp}</span>
              <span>CA {b.ac}</span>
              {b.fly && <span>✦ {lang === 'pt' ? 'voo' : 'fly'}</span>}
              {b.swim && <span>〜 {lang === 'pt' ? 'nat.' : 'swim'}</span>}
            </div>
          </button>
        ))}
      </div>}
      {selected && (
        <BeastModal
          beast={selected}
          lang={lang}
          onClose={() => { setSelected(null); setTransformError(''); }}
          canTransform={(cheat || (level >= 2 && usesUsed < maxUses)) && !(char.wildShape?.active)}
          transformError={transformError}
          onTransform={async (beast) => {
            setTransformError('');
            // Atalho local + remoto. Backend reage se char.id é numérico (remoto).
            try {
              if (typeof char.id === 'number') {
                const res = await api.wildShapeTransform(char.id, { beast });
                // O storage adapter espera o objeto inteiro como char remoto; usa o data + id + name
                const c = res.character;
                update({ ...c.data, id: c.id, name: c.name });
                setSelected(null);
              } else {
                // Local: aplica direto no data
                update({
                  wildShape: {
                    active: true,
                    beastId: beast.id,
                    beastName: tName('beast', beast.id, lang),
                    preTransformHp: char.currentHp || 0,
                    preTransformTempHp: char.tempHp || 0,
                    beastMaxHp: beast.hp,
                    beastCurrentHp: beast.hp,
                    beastAc: beast.ac,
                    beastStats: { str: beast.str, dex: beast.dex, con: beast.con, int: beast.int, wis: beast.wis, cha: beast.cha },
                    beastActions: beast.actions,
                    beastSpeed: beast.speed,
                    beastSize: beast.size,
                    transformedAt: new Date().toISOString(),
                  },
                  wildShapeUses: (char.wildShapeUses || 0) + 1,
                  currentHp: currentRules ? char.currentHp : beast.hp,
                  tempHp: currentRules ? Math.max(char.tempHp || 0, isMoon && level >= 3 ? level * 3 : level) : 0,
                });
                setSelected(null);
              }
            } catch (e) {
              setTransformError(errorMessage(e));
            }
          }}
        />
      )}
    </section>
  );
};

const STD_CONDITIONS = [
  'blinded','charmed','deafened','exhausted','frightened','grappled',
  'incapacitated','invisible','paralyzed','petrified','poisoned','prone',
  'restrained','stunned','unconscious',
];

const ConditionsPanel = ({ char, lang, update }) => {
  const [newEffect, setNewEffect] = useState('');
  const [open, setOpen] = useState(false);
  const active = char.conditions || [];
  const temps = char.tempEffects || [];
  const pt = lang === 'pt';
  const toggle = (id) => {
    const next = active.includes(id) ? active.filter(c => c !== id) : [...active, id];
    update({ conditions: next });
  };
  const addTemp = () => {
    if (!newEffect.trim()) return;
    update({ tempEffects: [...temps, { id: Date.now().toString(), name: newEffect.trim(), duration: '' }] });
    setNewEffect('');
  };
  const removeTemp = (id) => update({ tempEffects: temps.filter(e => e.id !== id) });
  const updateTemp = (id, patch) => update({ tempEffects: temps.map(e => e.id === id ? { ...e, ...patch } : e) });

  // Só o que está ativo fica à vista; a lista completa abre sob demanda.
  return (
    <section className="fh-panel">
      <FhTitle
        hint={<GrimoireHint id="condicoes" lang={lang} />}
        act={(
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(o => !o)}>
            {open ? (pt ? 'Fechar' : 'Close') : (pt ? '+ Condição' : '+ Condition')}
          </button>
        )}
      >{pt ? 'Condições e efeitos' : 'Conditions & effects'}</FhTitle>
      {!active.length && !temps.length && !open && (
        <div className="text-sm muted">{pt ? 'Nenhuma condição ativa.' : 'No active conditions.'}</div>
      )}
      {/* Pílulas com ícone (src/sheet/ficha.css). A condição ligada também muda a
          aparência da ficha: retrato e bordas da tela (src/sheet/FhConditions.jsx). */}
      <div className="cond-chips">
        {(open ? STD_CONDITIONS : active).map(id => {
          const on = active.includes(id);
          const chip = (
            <button key={id} type="button" className={`cond-chip ${on ? 'on' : ''}`} onClick={() => toggle(id)}
              aria-pressed={on}
              title={on ? (pt ? 'Toque para remover' : 'Tap to remove') : ''}>
              <ArtIcon src={conditionIcon(id)} emoji={CONDITION_EMOJI[id]} size={30} />
              {tName('condition', id, lang)}
              {on && !open ? <span className="fh-cond-x"> ✕</span> : ''}
            </button>
          );
          return on && !open
            ? <span key={id} className="row fh-cond-on" style={{ alignItems: 'center' }}>{chip}<GrimoireHint id={id} lang={lang} label={tName('condition', id, lang)} /></span>
            : chip;
        })}
      </div>
      {temps.map(e => (
        <div key={e.id} className="row gap-2 fh-cond-temp" style={{ marginTop: 6, alignItems: 'center' }}>
          <span className="fh-cond-temp-mark" aria-hidden="true" />
          <input value={e.name} onChange={ev => updateTemp(e.id, { name: ev.target.value })} style={{ flex: 2 }} />
          <input value={e.duration} onChange={ev => updateTemp(e.id, { duration: ev.target.value })}
            placeholder={pt ? 'Duração' : 'Duration'} style={{ flex: 1 }} />
          <button type="button" className="btn btn-icon btn-danger" onClick={() => removeTemp(e.id)} aria-label={pt ? 'Remover' : 'Remove'}>✕</button>
        </div>
      ))}
      {open && (
        <div className="row gap-2 fh-cond-add" style={{ marginTop: 8 }}>
          <input value={newEffect} onChange={e => setNewEffect(e.target.value)}
            placeholder={pt ? 'Efeito personalizado (ex.: Bênção, 1 min)' : 'Custom effect (e.g. Bless, 1 min)'}
            onKeyDown={e => e.key === 'Enter' && addTemp()} style={{ flex: 1 }} />
          <button type="button" className="btn btn-icon" onClick={addTemp} aria-label={pt ? 'Adicionar' : 'Add'}>+</button>
        </div>
      )}
    </section>
  );
};

// ===== NPC tab =====
const RELATIONSHIP_OPTS = [
  { id: 'ally',    label: { pt: 'Aliado',   en: 'Ally'    } },
  { id: 'neutral', label: { pt: 'Neutro',   en: 'Neutral' } },
  { id: 'enemy',   label: { pt: 'Inimigo',  en: 'Enemy'   } },
  { id: 'unknown', label: { pt: 'Incerto',  en: 'Unknown' } },
];

// Cor da relação: no CSS (src/sheet/ficha.css: [data-rel]) — aliado verdete, neutro
// ouro, inimigo vinho, incerto cinza; no cartão (filete e etiqueta) e nas pílulas do modal.
const SheetNpcs = ({ char, lang, update }) => {
  const npcs = char.npcs || [];
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState({});

  const openNew = () => { setForm({ name: '', race: '', role: '', relationship: 'neutral', notes: '' }); setEditing('new'); };
  const openEdit = (npc) => { setForm({ ...npc }); setEditing(npc.id); };
  const save = () => {
    if (!form.name?.trim()) return;
    if (editing === 'new') {
      update({ npcs: [...npcs, { ...form, id: Date.now().toString() }] });
    } else {
      update({ npcs: npcs.map(n => n.id === editing ? { ...n, ...form } : n) });
    }
    setEditing(null);
  };
  const remove = (id) => update({ npcs: npcs.filter(n => n.id !== id) });

  return (
    <section className="fh-panel">
      <FhTitle>{lang === 'pt' ? 'Personagens Conhecidos' : 'Known Characters'}</FhTitle>

      {npcs.length === 0 && (
        <div className="fh-empty">
          {lang === 'pt' ? 'Nenhum NPC registrado ainda.' : 'No NPCs recorded yet.'}
        </div>
      )}

      {/* Cartão por NPC (src/sheet/ficha.css: .fh-npc): nome, "raça · papel", relação
          em etiqueta colorida, Editar e ✕; as notas embaixo. */}
      {npcs.length > 0 && (
        <div className="fh-npcs">
          {npcs.map(npc => (
            <article key={npc.id} className="fh-npc" data-rel={npc.relationship || 'neutral'}>
              <div className="fh-npc-head">
                <div className="fh-npc-id">
                  <div className="fh-npc-name">{npc.name}</div>
                  <div className="fh-npc-sub">
                    {[npc.race, npc.role].filter(Boolean).join(' · ')}
                    {npc.relationship && (
                      <span className="fh-npc-rel">
                        {RELATIONSHIP_OPTS.find(r => r.id === npc.relationship)?.label[lang] || npc.relationship}
                      </span>
                    )}
                  </div>
                </div>
                <div className="fh-npc-acts">
                  <button type="button" className="fh-npc-btn" onClick={() => openEdit(npc)}>
                    {lang === 'pt' ? 'Editar' : 'Edit'}
                  </button>
                  <button type="button" className="fh-npc-btn is-del" onClick={() => remove(npc.id)}
                    aria-label={`${lang === 'pt' ? 'Remover' : 'Remove'} ${npc.name}`}>
                    ✕
                  </button>
                </div>
              </div>
              {npc.notes && (
                <div className="fh-npc-notes">{npc.notes}</div>
              )}
            </article>
          ))}
        </div>
      )}

      <button className="btn btn-sm btn-ghost fh-npc-add" onClick={openNew}>
        + {lang === 'pt' ? 'Adicionar NPC' : 'Add NPC'}
      </button>

      {editing !== null && (
        <Modal onClose={() => setEditing(null)}>
          <h3 style={{ marginBottom: 16, color: 'var(--gold)' }}>
            {editing === 'new' ? (lang === 'pt' ? 'Novo NPC' : 'New NPC') : (lang === 'pt' ? 'Editar NPC' : 'Edit NPC')}
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label>{lang === 'pt' ? 'Nome' : 'Name'} *</label>
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label>{lang === 'pt' ? 'Raça / Tipo' : 'Race / Type'}</label>
                <input aria-label={lang === 'pt' ? 'Raça / Tipo' : 'Race / Type'} value={form.race || ''} onChange={e => setForm(f => ({ ...f, race: e.target.value }))} />
              </div>
              <div>
                <label>{lang === 'pt' ? 'Papel / Profissão' : 'Role / Profession'}</label>
                <input aria-label={lang === 'pt' ? 'Papel / Profissão' : 'Role / Profession'} value={form.role || ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
            </div>
            <div>
              <label>{lang === 'pt' ? 'Relação' : 'Relationship'}</label>
              <div className="fh-rel-pills" role="group" aria-label={lang === 'pt' ? 'Relação' : 'Relationship'}>
                {RELATIONSHIP_OPTS.map(r => (
                  <button key={r.id} type="button" data-rel={r.id}
                    className={`fh-rel-pill${form.relationship === r.id ? ' on' : ''}`}
                    aria-pressed={form.relationship === r.id}
                    onClick={() => setForm(f => ({ ...f, relationship: r.id }))}>
                    {r.label[lang]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>{lang === 'pt' ? 'Notas' : 'Notes'}</label>
              <textarea aria-label={lang === 'pt' ? 'Notas' : 'Notes'} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ minHeight: 80 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={!form.name?.trim()}>
              {lang === 'pt' ? 'Salvar' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>
              {lang === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
};

// ===== Play tab =====
const SheetPlay = ({ char, lang, update, applyHp, ac, speed, profB, initBonus, passPerc, slots, roll, placed }) => {
  // Armadura/escudo sem treino: desvantagem em FOR/DES e sem conjurar magias (2014 e 2024).
  const untrainedArmor = [
    ...(char.armor && !isArmorProficient(char, char.armor) ? [tName('armor', char.armor, lang)] : []),
    ...(char.hasShield && !isArmorProficient(char, 'shield') ? [lang === 'pt' ? 'Escudo' : 'Shield'] : []),
  ];
  // Estilos de Luta / Maestria (src/progression/fighting-styles.js)
  const styles = FS.activeFightingStyles(char);
  const acStyleBonuses = FS.acBonuses(char, styles);
  // Monge e Bárbaro somam pés ao deslocamento: o medalhão diz quanto e de onde.
  const speedBonuses = Utils.speedBonuses(char);
  const unarmed = FS.unarmedStrike(char, styles);
  const styleSummaries = FS.styleSummaries(char, styles);
  const blindsightFt = FS.blindsight(char, styles);
  const reactions = FS.styleReactions(char, styles);

  const hpPct = Math.max(0, Math.min(100, (char.currentHp / Math.max(1, char.maxHp)) * 100));
  // Só design (src/sheet/hp-feedback.js): estado Firme/Ferido/À beira da morte/Caído pela
  // fração do PV e o retorno visual quando ele muda (número que sobe, tremor, clarão).
  const state = hpState(char.currentHp, char.maxHp);
  const hpFx = useHpFeedback(char);
  const fxKind = hpFx ? (hpFx.delta < 0 ? 'hit' : 'heal') : '';
  const fxBeat = hpFx ? (hpFx.id % 2 ? 'a' : 'b') : ''; // alterna o nome da animação para ela recomeçar
  const pt = lang === 'pt';

  // Regra da ficha: proficiência, Artes Marciais do Monge e Estilos de Luta (Utils.attackFor).
  const atks = (char.weapons || []).map(w => Utils.attackFor(char, w));
  const druidEntry = Utils.classLevel(char, 'druid') >= 2 ? Utils.classEntries(char).find(e => e.id === 'druid') : null;
  const druid = druidEntry ? Utils.classView(char, druidEntry) : null;

  // Painéis da aba, na ordem do celular (e do teclado): { h: altura estimada, el }.
  // No desktop a aba vira duas colunas e splitColumns (src/sheet/play-layout.js) escolhe
  // quantos vão para a 1ª: só layout, a ordem nunca muda. As alturas usam só o que não
  // muda durante o jogo (nenhum painel troca de coluna ao ligar condição ou levar dano).
  const slotLevels = (slots || []).filter(Boolean).length;
  const resourceCount = computeResources(char).length;
  const attackNotes = atks.reduce((n, a) => n + (a.fs.mastery ? 1 : 0) + (a.proficient ? 0 : 1) + (a.monk ? 1 : 0) + a.fs.notes.length, 0);
  const starry = druid?.subclass === 'stars' && druid.level >= (char.rulesVersion === '2024' ? 3 : 2);
  // Traços de classe desta aba (src/sheet/feature-placement.js): defesa e movimento embaixo dos
  // medalhões, os de ataque no painel Ataques e os de recurso embaixo da linha do recurso
  // (os da Forma Selvagem no painel dela; sem esse painel, no de recursos).
  const feats = placed.by;
  const wildFeats = druid ? feats.resources.filter(f => f.anchor === 'wildShape') : [];
  const resFeats = feats.resources.filter(f => !wildFeats.includes(f));
  const featsH = (n) => (n ? PLAY_H.traitHead + PLAY_H.trait * n : 0);
  const panels = [
    { h: PLAY_H.hp + featsH(feats.defense.length) + featsH(feats.movement.length), el: (
        <section key="hp" className={`hp-tracker fh-panel fh-hp${fxKind === 'heal' ? ` fh-healed-${fxBeat}` : ''}`} data-state={state}>
          <FhTitle>{t('hp', lang)}</FhTitle>
          <div className="fh-hp-row">
            <div className="hp-display">
              <span className={`fh-hp-num${fxKind === 'hit' ? ` fh-shake-${fxBeat}` : ''}`}>
                <span className="hp-current">{char.currentHp}</span>
              </span>
              {char.tempHp > 0 && <span className="fh-hp-temp-badge" title={t('tempHp', lang)}>+{char.tempHp}</span>}
              <span className="fh-hp-formula">({hpFormula(Utils.hitDiceByDie(char), Utils.abilityMod(char, 'con'), char.level)})</span>
              {hpFx && (
                <span key={hpFx.id} className={`fh-float ${fxKind}`} aria-hidden="true">
                  {hpFx.delta < 0 ? '−' : '+'}{Math.abs(hpFx.delta)}
                </span>
              )}
            </div>
            <div className="fh-hp-state">{hpStateLabel(state, lang)}</div>
          </div>
          {/* Barras e controles condensados (src/sheet/HpTracker.jsx): PV temporários, PV em 10
              fatias, Exaustão, Testes contra a Morte, arrastar para dano/cura e Dados de Vida */}
          <HpTracker char={char} lang={lang} update={update} applyHp={applyHp} roll={roll}
            byDie={Utils.hitDiceByDie(char)} conMod={Utils.abilityMod(char, 'con')} hpPct={hpPct}
            hints={{
              temp: <GrimoireHint id="pv-temporarios" lang={lang} />,
              death: <GrimoireHint id="testes-contra-a-morte" lang={lang} />,
              exhaustion: <GrimoireHint id="exaustao" lang={lang} />,
              hitDice: <GrimoireHint id="dados-de-vida" lang={lang} />,
            }} />

          {/* Defesa em medalhões: CA, Iniciativa (toque rola), Deslocamento, Prof., Perc. passiva
              e Dados de Vida (as antigas grades .combat-grid desta aba) */}
          <div className="fh-defense">
            <FhMedal shape="shield" value={ac} label={t('ac', lang)}
              sub={acStyleBonuses.length > 0
                ? <span title={acStyleBonuses.map(x => x.label[lang]).join(', ')}>{FS.partsLabel(acStyleBonuses, lang)}</span>
                : null}>
              {untrainedArmor.length > 0 && (
                <div className="fh-medal-warn"
                  title={lang === 'pt'
                    ? 'Sem treino: desvantagem em testes, salvaguardas e ataques de FOR e DES, e você não pode lançar magias.'
                    : "Untrained: Disadvantage on STR and DEX checks, saves and attacks, and you can't cast spells."}>
                  {lang === 'pt' ? 'Sem treino' : 'Untrained'}: {untrainedArmor.join(', ')}
                </div>
              )}
            </FhMedal>
            <FhMedal shape="circle" value={Utils.fmtMod(initBonus)} label={t('initiative', lang)}
              sub={<FhTapToRoll lang={lang} short />}
              onClick={() => roll({ die: 20, mod: initBonus, label: t('initRoll', lang) })} />
            <FhMedal shape="circle" value={Utils.speedLabel(speed, lang).split(' ')[0]} unit={lang === 'pt' ? 'm' : 'ft'}
              label={t('speed', lang)}
              sub={speedBonuses.length > 0
                ? <span title={speedBonuses.map(x => x.name[lang] || x.name.pt).join(', ')}>{Utils.speedBonusText(speedBonuses, lang)}</span>
                : null} />
            <FhMedal shape="diamond" value={Utils.fmtMod(profB)} label={lang === 'pt' ? 'Prof.' : 'Prof.'} />
            <FhMedal shape="diamond" value={passPerc} label={lang === 'pt' ? 'Perc.' : 'Perc.'}
              hint={<GrimoireHint id="valor-passivo" lang={lang} />} sub={lang === 'pt' ? 'passiva' : 'passive'} />
          </div>
          <FhFeatures items={feats.defense} multi={placed.multi} lang={lang} place="defense" />
          <FhFeatures items={feats.movement} multi={placed.multi} lang={lang} place="movement" />
        </section>
    ) },
    { h: PLAY_H.attacks + PLAY_H.attackRow * (atks.length + 1) + PLAY_H.attackNote * attackNotes + featsH(feats.attacks.length), el: (
        /* Ataques: uma linha por arma e o Golpe Desarmado (src/sheet/FhAttack.jsx). Os botões
            "Ataque +X" e "Dano NdX+Y" fazem as mesmas rolagens (rótulos e valores) de antes. */
        <section key="attacks" className="fh-panel">
          <FhTitle>{lang === 'pt' ? 'Ataques' : 'Attacks'}</FhTitle>
          <div className="fh-atks">
            {(char.weapons || []).map((w, i) => {
              const a = atks[i];
              const fs = a.fs;
              const atk = a.bonus;
              const dmgMod = a.dmgMod;
              const bonusText = FS.partsLabel([...fs.attackParts.map(p => ({ ...p, label: { pt: `${p.label.pt} (ataque)`, en: `${p.label.en} (attack)` } })), ...fs.damageParts], lang);
              return (
                <FhAttackRow key={i} lang={lang}
                  art={<ArtThumb src={itemArt(w)} emoji="⚔️" size={40} lang={lang} />}
                  name={w.name}
                  sub={a.dmgType ? Utils.damageLabel(a.dmgType, lang) : null}
                  atkText={Utils.fmtMod(atk)}
                  onAttack={() => roll({ die: 20, mod: atk, label: w.name + ' ' + t('attackRoll', lang) })}
                  dmgText={a.damage}
                  onDamage={() => {
                    const m = String(a.dice || '').match(/(\d+)d(\d+)/);
                    if (m) roll({ die: +m[2], count: +m[1], mod: dmgMod, label: w.name + ' ' + t('damageRoll', lang) });
                  }}>
                  {a.monk && <div className="fh-atk-note is-gold">{lang === 'pt' ? 'Artes Marciais (arma de monge)' : 'Martial Arts (Monk weapon)'}</div>}
                  {!a.proficient && <div className="fh-atk-note is-warn">{lang === 'pt' ? 'Sem proficiência: não soma o bônus de proficiência' : 'Not proficient: no proficiency bonus'}</div>}
                  {bonusText && <div className="fh-atk-note is-gold">{bonusText}</div>}
                  {fs.mastery && (
                    <div className="fh-atk-note is-mastery" title={fs.mastery.desc[lang]}>
                      {lang === 'pt' ? 'Maestria' : 'Mastery'}: <strong>{fs.mastery.name[lang]}</strong> — {fs.mastery.desc[lang]}
                    </div>
                  )}
                  {fs.notes.map((n, k) => <div key={k} className="fh-atk-note">{n[lang]}</div>)}
                </FhAttackRow>
              );
            })}
            {(() => {
              // Golpe Desarmado: todo mundo é proficiente (1 + FOR de concussão). Monge usa o dado
              // de Artes Marciais com DES ou FOR; o Estilo de Luta Desarmado troca o 1 por um dado.
              const u = Utils.unarmedStrike(char);
              const name = u.name[lang];
              const m = String(u.dice || '').match(/(\d+)d(\d+)/);
              // com dado, a fórmula vai no botão de dano; sem dado (dano fixo), fica na linha
              const sub = m ? Utils.damageLabel(u.dmgType, lang) : `${u.damage} ${Utils.damageLabel(u.dmgType, lang)}`;
              return (
                <FhAttackRow lang={lang}
                  art={<ArtThumb src={null} emoji="👊" size={40} lang={lang} title={name} />}
                  name={name}
                  sub={sub}
                  atkText={Utils.fmtMod(u.bonus)}
                  onAttack={() => roll({ die: 20, mod: u.bonus, label: name + ' ' + t('attackRoll', lang) })}
                  dmgText={u.damage}
                  onDamage={m ? () => roll({ die: +m[2], count: +m[1], mod: u.dmgMod, label: name + ' ' + t('damageRoll', lang) }) : null}>
                  {u.monk && <div className="fh-atk-note is-gold">{lang === 'pt' ? 'Artes Marciais' : 'Martial Arts'}</div>}
                  {unarmed && (
                    <div className="fh-atk-note is-gold">
                      {unarmed.name[lang]}: {lang === 'pt' ? `${unarmed.dieFree} com as mãos livres` : `${unarmed.dieFree} with free hands`}
                      {unarmed.grapple ? (lang === 'pt' ? `; ${unarmed.grapple} no agarrado` : `; ${unarmed.grapple} to grappled`) : ''}
                    </div>
                  )}
                </FhAttackRow>
              );
            })()}
          </div>
          <FhFeatures items={feats.attacks} multi={placed.multi} lang={lang} place="attacks" />
        </section>
    ) },
    styleSummaries.length > 0 && {
      h: PLAY_H.styles + PLAY_H.style * styleSummaries.length + PLAY_H.styleExtra * (reactions.length + (blindsightFt > 0 ? 1 : 0)),
      el: (
        /* Estilos de Luta ativos: resumo, sentidos (Luta às Cegas) e lembretes de reação */
        <section key="styles" className="fh-panel">
          <FhTitle>{lang === 'pt' ? 'Estilos de Luta' : 'Fighting Styles'}</FhTitle>
          <div className="fh-traits">
            {styleSummaries.map(s => (
              <div key={s.id} className="fh-trait">
                <div className="fh-trait-name">{s.name[lang]}</div>
                {s.summary[lang] && <p className="fh-trait-text">{s.summary[lang]}</p>}
              </div>
            ))}
          </div>
          {blindsightFt > 0 && (
            <div className="fh-style-sense">
              <strong>{lang === 'pt' ? 'Sentidos' : 'Senses'}:</strong> {lang === 'pt' ? `Percepção às Cegas ${Math.round(blindsightFt * 0.3)} m` : `Blindsight ${blindsightFt} ft`}
            </div>
          )}
          {reactions.map(r => (
            <div key={r.id} className="fh-style-react">
              <strong>{lang === 'pt' ? 'Reação' : 'Reaction'} · {r.name[lang]}:</strong> {r.text[lang]}
            </div>
          ))}
        </section>
      ),
    },
    slots && slots.length > 0 && {
      h: PLAY_H.slots + PLAY_H.slotRow * slotLevels,
      el: (
        /* Spell slots quick tracker */
        <section key="slots" className="fh-panel">
          <FhTitle>{t('slots', lang)}</FhTitle>
          {slots.map((max, idx) => {
            const lvl = idx + 1;
            if (!max) return null;
            const used = (char.spellSlotsUsed && char.spellSlotsUsed[idx]) || 0;
            const circle = slotCircleLabel(lvl, lang);
            return (
              <div key={lvl} className="slot-row fh-slot-line">
                <div className="slot-level">{circle}</div>
                <div className="slot-pips">
                  {Array.from({ length: max }).map((_, i) => {
                    // Gasta da direita para a esquerda; tocar de novo devolve (toque errado).
                    // Em campanha trava: o gasto é pelo "Conjurar".
                    const locked = !!char.inCampaign;
                    const spent = slotSpent(i, max, used);
                    return (
                      <button
                        key={i} type="button"
                        className={`slot-pip ${spent ? 'used' : ''} ${locked ? 'locked' : ''}`}
                        disabled={locked}
                        aria-label={gemLabel(circle, i, max, spent, lang)}
                        title={locked ? lockedSlotTitle(true, lang) : slotTapTitle(spent, lang)}
                        onClick={locked ? undefined : () => {
                          const arr = [...(char.spellSlotsUsed || [])];
                          while (arr.length <= idx) arr.push(0);
                          arr[idx] = slotTap(used, max, spent);
                          update({ spellSlotsUsed: arr });
                        }}
                      />
                    );
                  })}
                </div>
                <span className="fh-gem-count">{max - used}/{max}</span>
              </div>
            );
          })}
        </section>
      ),
    },
    { h: (resourceCount || resFeats.length) ? PLAY_H.resources + PLAY_H.resourceRow * resourceCount + PLAY_H.trait * resFeats.length : 0, el: (
        /* Recursos de classe com usos (Fúria, Canalizar Divindade…), cada um com os traços que o
            usam embaixo. O componente é compartilhado com o editor do mestre: o painel é só um
            embrulho daqui (vazio quando não há recursos nem traços; o CSS esconde). */
        <section key="resources" className="fh-panel fh-res">
          <ResourcesCard char={char} lang={lang} update={update} features={resFeats} multiclass={placed.multi} />
        </section>
    ) },
    { h: PLAY_H.conditions, el: (
        /* Conditions / status effects */
        <ConditionsPanel key="conditions" char={char} lang={lang} update={update} />
    ) },
    druid && {
      h: PLAY_H.wild + (starry ? PLAY_H.starry : 0) + featsH(wildFeats.length),
      el: (
        /* Wild Shape — Druid only */
        <WildShapePanel key="wild" char={char} druid={druid} lang={lang} update={update} features={wildFeats} multi={placed.multi} />
      ),
    },
    { h: PLAY_H.abilities, el: (
        /* Abilities at a glance */
        <section key="abilities" className="fh-panel">
          <FhTitle sub={<span><FhTapToRoll lang={lang} /></span>}>{t('tabStats', lang)}</FhTitle>
          <AbilitySeals char={char} lang={lang} roll={roll} rollLabel={k => t(k, lang) + ' ' + t('abilityCheck', lang)} />
        </section>
    ) },

  ].filter(Boolean);
  const split = splitColumns(panels.map(p => p.h));

  return (
    <>
      {/* Clarão na borda da tela ao levar dano / ser curado: camada decorativa fixa, fora
          dos painéis (nada de transform/filter em contêiner com botão que abre Modal). */}
      {hpFx && <div key={hpFx.id} className={`fh-fx fh-fx-${fxKind}`} aria-hidden="true" />}
      <FhMedalDefs />

      {/* Duas colunas a partir de 1024px (ficha.css: .fh-play). Abaixo disso, ou com o
          rolador lateral aberto e pouca largura, viram uma coluna só, na mesma ordem. */}
      <div className="fh-play">
        <div className="fh-play-col">{panels.slice(0, split).map(p => p.el)}</div>
        <div className="fh-play-col">{panels.slice(split).map(p => p.el)}</div>
      </div>
    </>
  );
};

// ===== Stats tab (abilities, saves, skills full) =====
// Idiomas: chips na ficha + modal de edição. Livre (sem modo trapaça): além das
// escolhas iniciais (espécie + antecedente/origem) entram idiomas aprendidos em jogo,
// de outros livros ou digitados. Em campanha o servidor anota a troca para o mestre.
const LanguagesField = ({ char, lang, update }) => {
  const pt = lang === 'pt';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const chosen = chosenLanguages(char);
  const count = Utils.languageChoiceCount(char);
  const missing = Math.max(0, count - chosen.length);
  const edit = () => { setDraft(chosen); setOpen(true); };
  const save = () => {
    const same = draft.length === chosen.length && draft.every(l => chosen.includes(l));
    // Fixos já salvos ficam onde estavam: o registro do mestre mostra só o que mudou.
    if (!same) update({ languages: Utils.withChosenLanguages(char, draft) });
    setOpen(false);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ margin: 0 }}>{t('languages', lang)}</label>
        <button className="btn btn-sm btn-ghost lang-edit-btn" onClick={edit}>
          <Icon name="edit" size={12}/> {pt ? 'Editar idiomas' : 'Edit languages'}
        </button>
      </div>
      <div className="lang-chips">
        {Utils.languagesFor(char).map(l => <span key={l} className="lang-chip">{Utils.languageLabel(l, lang)}</span>)}
        {missing > 0 && (
          <button type="button" className="lang-chip pending" onClick={edit}>
            + {missing} {pt ? (missing > 1 ? 'idiomas a escolher' : 'idioma a escolher') : (missing > 1 ? 'languages to choose' : 'language to choose')}
          </button>
        )}
      </div>
      {open && (
        <Modal onClose={() => setOpen(false)} title={pt ? 'Editar idiomas' : 'Edit languages'}>
          <LanguagePicker char={char} lang={lang} chosen={draft} onChange={setDraft} free />
          {char.inCampaign && (
            <p className="text-xs muted" style={{ margin: '12px 0 0' }}>
              {pt ? 'Em campanha: o mestre vê no registro de edições o idioma que entrou e o que saiu.'
                : 'In a campaign: the DM sees in the edit log which language was added and which was removed.'}
            </p>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>{pt ? 'Cancelar' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={save}>{pt ? 'Salvar' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Selos de atributo (abas Jogar e Atributos): o mesmo desenho; cada aba mantém o seu
// rótulo de rolagem ("<Atributo> Teste de habilidade" na Jogar, "<Atributo>" aqui).
// O nome acessível começa pela sigla visível no selo (quem usa voz diz "FOR").
// data-fab-pass: no celular o botão de dados passa por cima dos selos sem saltar (DiceRoller);
// no desktop (duas colunas) ele desvia deles como de qualquer botão.
const AbilitySeals = ({ char, lang, roll, rollLabel }) => (
  <div className="fh-abil" data-fab-pass="">
    {SRD.ABILITIES.map(k => {
      const score = Utils.abilityWithRace(char, k);
      const mod = Utils.abilityMod(char, k);
      return (
        <FhHex key={k} abbr={t(k + 'Sh', lang)} mod={Utils.fmtMod(mod)} score={score}
          label={lang === 'pt'
            ? `${t(k + 'Sh', lang)}, ${t(k, lang)} ${Utils.fmtMod(mod)}, valor ${score}. Rolar teste`
            : `${t(k + 'Sh', lang)}, ${t(k, lang)} ${Utils.fmtMod(mod)}, score ${score}. Roll check`}
          onClick={() => roll({ die: 20, mod, label: rollLabel(k) })} />
      );
    })}
  </div>
);

const HONEY_DICE = [4, 6, 8, 10, 12, 20, 100];
const HONEY_ABILITY_META = {
  str: { zone: 'physical', tone: 'strength' },
  dex: { zone: 'physical', tone: 'dexterity' },
  con: { zone: 'physical', tone: 'constitution' },
  int: { zone: 'mental', tone: 'intelligence' },
  wis: { zone: 'mental', tone: 'wisdom' },
  cha: { zone: 'mental', tone: 'charisma' },
};

const isActionKey = (e) => e.key === 'Enter' || e.key === ' ';
const BELT_ABBR = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };


// Segurar → soltar para rolar (o mesmo gesto dos hexágonos de dado do cinto): um toque
// rápido não rola; arrastar cancela. Enquanto segura, o botão "carrega" (.is-charging-roll).
const BELT_HOLD_MS = 220;
const beltHoldToRoll = (fn) => {
  let t0 = 0; let x0 = 0; let y0 = 0; let moved = false; let timer = null; let el = null;
  const clear = () => { clearTimeout(timer); timer = null; el?.classList.remove('is-charging-roll'); };
  return {
    onPointerDown: (e) => {
      t0 = Date.now(); x0 = e.clientX; y0 = e.clientY; moved = false; el = e.currentTarget;
      el.setPointerCapture?.(e.pointerId);
      timer = setTimeout(() => { el?.classList.add('is-charging-roll'); if (navigator.vibrate) navigator.vibrate(12); }, BELT_HOLD_MS);
    },
    onPointerMove: (e) => { if (t0 && Math.hypot(e.clientX - x0, e.clientY - y0) > 12) { moved = true; clear(); } },
    onPointerUp: () => { const held = t0 && !moved && Date.now() - t0 >= BELT_HOLD_MS; t0 = 0; clear(); if (held) fn(); },
    onPointerCancel: () => { t0 = 0; clear(); },
    onContextMenu: (e) => e.preventDefault(),
  };
};
const BeltHex = ({ k, char, lang, roll, onBind, isBound, isAssigned, onStartDrag }) => {
  const [advMode, setAdvMode] = useState('normal'); // 'normal' | 'adv' | 'dis'
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const gestureRef = useRef({ startY: 0, moved: false, pointerId: null });
  const hexRef = useRef(null);
  const hoodGestureRef = useRef({ startX: 0, startY: 0, moved: false, timer: null, pointerId: null });

  const score = Utils.abilityWithRace(char, k);
  const checkMod = Utils.abilityMod(char, k);
  const saveMod = Utils.saveBonus(char, k);
  const isProf = Utils.hasSaveProf(char, k);
  const pt = lang === 'pt';

  const onRollHalf = (mod, label, isSave = false) => {
    roll({ die: 20, mod, label, advMode, isSave });
  };

  // Knob ONLY handles stance swiping tap (up = adv, down = dis, tap = normal).
  // It NEVER initiates ability-to-belt drag, ensuring pure stance control.
  const onBadgePointerDown = (e) => {
    e.stopPropagation();
    const pointerId = e.pointerId;
    gestureRef.current = {
      startY: e.clientY,
      moved: false,
      pointerId,
    };
    setIsPulling(true);
    e.currentTarget.setPointerCapture?.(pointerId);
  };

  const getBadgeAnchor = () => {
    const badgeEl = hexRef.current ? hexRef.current.querySelector('.fh-belt-badge') : null;
    if (badgeEl) {
      const rect = badgeEl.getBoundingClientRect();
      return {
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        radius: rect.width / 2,
      };
    }
    const rect = hexRef.current ? hexRef.current.getBoundingClientRect() : null;
    return rect ? {
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height * 0.45,
      radius: 17,
    } : null;
  };

  const onBadgePointerMove = (e) => {
    e.stopPropagation();
    const g = gestureRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;

    if (Math.abs(dy) > 4) {
      g.moved = true;
      setPullY(Math.max(-8, Math.min(8, dy)));
    }
  };

  const onBadgePointerUp = (e) => {
    e.stopPropagation();
    const g = gestureRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;
    const moved = g.moved;

    try { e.currentTarget.releasePointerCapture?.(g.pointerId); } catch (_) {}
    gestureRef.current = { startY: 0, moved: false, pointerId: null };
    setIsPulling(false);
    setPullY(0);

    if (moved) {
      if (dy < -4) {
        setAdvMode('adv');
      } else if (dy > 4) {
        setAdvMode('dis');
      } else {
        setAdvMode('normal');
      }
    } else {
      // Tap on knob: deactivate if already active, or toggle
      setAdvMode(m => (m !== 'normal' ? 'normal' : 'adv'));
    }
  };

  const onBadgePointerCancel = (e) => {
    e.stopPropagation();
    try { e.currentTarget.releasePointerCapture?.(gestureRef.current.pointerId); } catch (_) {}
    gestureRef.current = { startY: 0, moved: false, pointerId: null };
    setIsPulling(false);
    setPullY(0);
  };

  // Ability score assignment starts tracking user input when user presses and holds
  // "the hood" of the hexad (.fh-belt-header) or drags from it!
  const onHoodPointerDown = (e) => {
    e.stopPropagation();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;

    const timer = setTimeout(() => {
      // Hold >= 110ms initiates ability-to-belt assignment drag!
      hoodGestureRef.current.moved = true;
      try { e.currentTarget.releasePointerCapture?.(pointerId); } catch (_) {}
      onStartDrag?.(k, { clientX: startX, clientY: startY }, getBadgeAnchor());
    }, 110);

    hoodGestureRef.current = { startX, startY, moved: false, timer, pointerId };
    try { e.currentTarget.setPointerCapture?.(pointerId); } catch (_) {}
  };

  const onHoodPointerMove = (e) => {
    const h = hoodGestureRef.current;
    if (!h.pointerId) return;
    const dist = Math.hypot(e.clientX - h.startX, e.clientY - h.startY);
    if (dist > 4 && onStartDrag) {
      if (h.timer) clearTimeout(h.timer);
      h.moved = true;
      const pid = h.pointerId;
      hoodGestureRef.current = { startX: 0, startY: 0, moved: true, timer: null, pointerId: null };
      try { e.currentTarget.releasePointerCapture?.(pid); } catch (_) {}
      onStartDrag(k, e, getBadgeAnchor());
    }
  };

  const onHoodPointerUp = (e) => {
    const h = hoodGestureRef.current;
    if (h.timer) clearTimeout(h.timer);
    const wasMoved = h.moved;
    const pid = h.pointerId;
    hoodGestureRef.current = { startX: 0, startY: 0, moved: false, timer: null, pointerId: null };
    if (pid) {
      try { e.currentTarget.releasePointerCapture?.(pid); } catch (_) {}
    }
    // A quick tap (< 110ms without dragging) binds/unbinds to active belt slot
    if (!wasMoved) {
      onBind?.(k);
    }
  };

  const onHoodPointerCancel = (e) => {
    const h = hoodGestureRef.current;
    if (h.timer) clearTimeout(h.timer);
    if (h.pointerId) {
      try { e.currentTarget.releasePointerCapture?.(h.pointerId); } catch (_) {}
    }
    hoodGestureRef.current = { startX: 0, startY: 0, moved: false, timer: null, pointerId: null };
  };

  const onBadgeKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAdvMode('adv');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAdvMode('dis');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdvMode('normal');
    } else if (isActionKey(e)) {
      e.preventDefault();
      if (e.shiftKey) {
        onBind(k);
      } else {
        setAdvMode((m) => (m === 'normal' ? 'adv' : m === 'adv' ? 'dis' : 'normal'));
      }
    }
  };

  const meta = HONEY_ABILITY_META[k] || { zone: 'physical', tone: 'strength' };
  const abbr = BELT_ABBR[k] || k.toUpperCase();

  const boundStyle = isAssigned ? {
    '--slot-bound-neon': 'var(--slot-bound-neon, #edcb7a)',
    '--slot-bound-glow': 'var(--slot-bound-glow, rgba(237, 203, 122, 0.8))',
  } : undefined;

  return (
    <div
      className={`fh-belt-hex-wrap is-${meta.zone} tone-${k}${isBound ? ' is-bound' : ''}${isAssigned ? ' is-assigned' : ''} adv-${advMode}`}
      style={boundStyle}
    >
      {/* Glowing Edge Feedback SVG */}
      <svg
        className={`fh-belt-glow-svg adv-${advMode}`}
        viewBox="0 0 100 115.47"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {advMode === 'adv' && (
          <g className="fh-glow-group-adv">
            <path className="fh-edge-shadow-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
            <path className="fh-edge-stroke-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
            <path className="fh-edge-shine-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
          </g>
        )}
        {advMode === 'dis' && (
          <g className="fh-glow-group-dis">
            <path className="fh-edge-shadow-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
            <path className="fh-edge-stroke-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
            <path className="fh-edge-shine-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
          </g>
        )}
      </svg>

      {/* Pointy-topped hexagon attribute tile */}
      <article
        ref={hexRef}
        className="fh-belt-hex"
      >
        {/* Top Header / Hood: Press & hold (>= 110ms) or drag to assign ability to belt slot; tap to toggle bind */}
        <button
          type="button"
          className="fh-belt-header"
          onPointerDown={onHoodPointerDown}
          onPointerMove={onHoodPointerMove}
          onPointerUp={onHoodPointerUp}
          onPointerCancel={onHoodPointerCancel}
          aria-label={pt
            ? `${t(k, lang)}: segure ou arraste o capuz para vincular a um slot do cinto; toque para o slot ativo`
            : `${t(k, lang)}: hold or drag the hood to bind to a belt slot; tap for active slot`}
          title={pt
            ? `${t(k, lang)}: segure/arraste o capuz para vincular ao cinto · toque para o slot ativo`
            : `${t(k, lang)}: hold/drag the hood to bind to belt · tap for active slot`}
        >
          <span className="fh-honey-abbr">{abbr}</span>
        </button>

        {/* Vertical Slider Track recessed into the hexad face */}
        <div className="fh-belt-badge-track" aria-hidden="true" />

        {/* Repurposed Ability Score Badge: Round slider knob with vertical drag hint */}
        <button
          type="button"
          className={`fh-belt-badge adv-${advMode}${isPulling ? ' is-pulling' : ''}`}
          data-ability-badge={k}
          style={pullY !== 0 ? { transform: `translate(-50%, calc(-50% + ${pullY}px))` } : undefined}
          onPointerDown={onBadgePointerDown}
          onPointerMove={onBadgePointerMove}
          onPointerUp={onBadgePointerUp}
          onPointerCancel={onBadgePointerCancel}
          onKeyDown={onBadgeKeyDown}
          tabIndex={0}
          role="slider"
          aria-valuenow={advMode === 'adv' ? 1 : advMode === 'dis' ? -1 : 0}
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuetext={advMode === 'adv' ? 'Vantagem' : advMode === 'dis' ? 'Desvantagem' : 'Normal'}
          aria-label={pt
            ? `${t(k, lang)}: ${score}. Deslize ↑ vantagem, ↓ desvantagem, ou toque para normal`
            : `${t(k, lang)}: ${score}. Swipe ↑ advantage, ↓ disadvantage, or tap for normal`}
          title={pt
            ? `${t(k, lang)} ${score}: Deslize ↑ vantagem 🟢, ↓ desvantagem 🔴 · Toque para normal`
            : `${t(k, lang)} ${score}: Swipe ↑ advantage 🟢, ↓ disadvantage 🔴 · Tap for normal`}
        >
          <span className="fh-badge-arrow is-up" aria-hidden="true">▲</span>
          <span className="fh-honey-score">{score}</span>
          <span className="fh-badge-arrow is-down" aria-hidden="true">▼</span>
        </button>

        <div className="fh-honey-halves">
          <button
            type="button"
            className="fh-honey-half is-check"
            {...beltHoldToRoll(() => onRollHalf(checkMod, `${t(k, lang)} ${t('abilityCheck', lang)}`))}
            onKeyDown={(e) => {
              if (!isActionKey(e)) return;
              e.preventDefault();
              onRollHalf(checkMod, `${t(k, lang)} ${t('abilityCheck', lang)}`);
            }}
            aria-label={pt
              ? `${t(k, lang)}: teste ${Utils.fmtMod(checkMod)}${advMode === 'adv' ? ' (com vantagem)' : advMode === 'dis' ? ' (com desvantagem)' : ''}`
              : `${t(k, lang)}: check ${Utils.fmtMod(checkMod)}${advMode === 'adv' ? ' (with advantage)' : advMode === 'dis' ? ' (with disadvantage)' : ''}`}
          >
            <span className="fh-honey-val">{Utils.fmtMod(checkMod)}</span>
          </button>
          <button
            type="button"
            className={`fh-honey-half is-save${isProf ? ' is-prof' : ''}`}
            {...beltHoldToRoll(() => onRollHalf(saveMod, `${t(k, lang)} ${t('saveRoll', lang)}`, true))}
            onKeyDown={(e) => {
              if (!isActionKey(e)) return;
              e.preventDefault();
              onRollHalf(saveMod, `${t(k, lang)} ${t('saveRoll', lang)}`, true);
            }}
            aria-label={pt
              ? `${t(k, lang)}: resistência ${Utils.fmtMod(saveMod)}${isProf ? ' (proficiente)' : ''}${advMode === 'adv' ? ' (com vantagem)' : advMode === 'dis' ? ' (com desvantagem)' : ''}`
              : `${t(k, lang)}: save ${Utils.fmtMod(saveMod)}${isProf ? ' (proficient)' : ''}${advMode === 'adv' ? ' (with advantage)' : advMode === 'dis' ? ' (with disadvantage)' : ''}`}
          >
            <span className="fh-honey-val">{Utils.fmtMod(saveMod)}</span>
          </button>
        </div>
      </article>
    </div>
  );
};

const renderDieShape = (die) => {
  switch (Number(die)) {
    case 4:
      return (
        <g className="fh-die-shape is-d4">
          {/* Equilateral triangle with centroid at (50, 50) */}
          <polygon points="50,10 88,70 12,70" className="fh-die-poly-base" />
          <polygon points="50,26 72,62 28,62" className="fh-die-crease-facet" />
          <line x1="50" y1="10" x2="50" y2="26" className="fh-die-crease" />
          <line x1="88" y1="70" x2="72" y2="62" className="fh-die-crease" />
          <line x1="12" y1="70" x2="28" y2="62" className="fh-die-crease" />
        </g>
      );
    case 6:
      return (
        <g className="fh-die-shape is-d6">
          {/* Regular hexagon centered at (50, 50) */}
          <polygon points="50,8 86.4,29 86.4,71 50,92 13.6,71 13.6,29" className="fh-die-poly-base" />
          <polygon points="50,24 72.5,37 72.5,63 50,76 27.5,63 27.5,37" className="fh-die-crease-facet" />
          <line x1="50" y1="8" x2="50" y2="24" className="fh-die-crease" />
          <line x1="86.4" y1="29" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="86.4" y1="71" x2="72.5" y2="63" className="fh-die-crease" />
          <line x1="50" y1="92" x2="50" y2="76" className="fh-die-crease" />
          <line x1="13.6" y1="71" x2="27.5" y2="63" className="fh-die-crease" />
          <line x1="13.6" y1="29" x2="27.5" y2="37" className="fh-die-crease" />
        </g>
      );
    case 8:
      return (
        <g className="fh-die-shape is-d8">
          {/* Symmetrical diamond centered at (50, 50) */}
          <polygon points="50,6 94,50 50,94 6,50" className="fh-die-poly-base" />
          <polygon points="50,24 76,50 50,76 24,50" className="fh-die-crease-facet" />
          <line x1="50" y1="6" x2="50" y2="24" className="fh-die-crease" />
          <line x1="94" y1="50" x2="76" y2="50" className="fh-die-crease" />
          <line x1="50" y1="94" x2="50" y2="76" className="fh-die-crease" />
          <line x1="6" y1="50" x2="24" y2="50" className="fh-die-crease" />
        </g>
      );
    case 10:
    case 100:
      return (
        <g className="fh-die-shape is-d10">
          {/* Pentagonal Trapezohedron centered at (50, 50) */}
          <polygon points="50,6 92,34 74,82 50,94 26,82 8,34" className="fh-die-poly-base" />
          <polygon points="50,22 76,38 64,72 50,78 36,72 24,38" className="fh-die-crease-facet" />
          <line x1="50" y1="6" x2="50" y2="22" className="fh-die-crease" />
          <line x1="92" y1="34" x2="76" y2="38" className="fh-die-crease" />
          <line x1="74" y1="82" x2="64" y2="72" className="fh-die-crease" />
          <line x1="50" y1="94" x2="50" y2="78" className="fh-die-crease" />
          <line x1="26" y1="82" x2="36" y2="72" className="fh-die-crease" />
          <line x1="8" y1="34" x2="24" y2="38" className="fh-die-crease" />
        </g>
      );
    case 12:
      return (
        <g className="fh-die-shape is-d12">
          {/* Regular pentagon centered at (50, 50) */}
          <polygon points="50,8 90,37 74.7,84 25.3,84 10,37" className="fh-die-poly-base" />
          <polygon points="50,24 74.7,42 65.3,71 34.7,71 25.3,42" className="fh-die-crease-facet" />
          <line x1="50" y1="8" x2="50" y2="24" className="fh-die-crease" />
          <line x1="90" y1="37" x2="74.7" y2="42" className="fh-die-crease" />
          <line x1="74.7" y1="84" x2="65.3" y2="71" className="fh-die-crease" />
          <line x1="25.3" y1="84" x2="34.7" y2="71" className="fh-die-crease" />
          <line x1="10" y1="37" x2="25.3" y2="42" className="fh-die-crease" />
        </g>
      );
    case 20:
    default:
      return (
        <g className="fh-die-shape is-d20">
          {/* Regular hexagon outer silhouette centered at (50, 50) */}
          <polygon points="50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28" className="fh-die-poly-base" />
          {/* Central triangular face with centroid at (50, 50) */}
          <polygon points="27.5,37 72.5,37 50,76" className="fh-die-crease-facet" />
          <line x1="50" y1="6" x2="27.5" y2="37" className="fh-die-crease" />
          <line x1="50" y1="6" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="88.1" y1="28" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="88.1" y1="72" x2="72.5" y2="37" className="fh-die-crease" />
          <line x1="88.1" y1="72" x2="50" y2="76" className="fh-die-crease" />
          <line x1="50" y1="94" x2="50" y2="76" className="fh-die-crease" />
          <line x1="11.9" y1="72" x2="50" y2="76" className="fh-die-crease" />
          <line x1="11.9" y1="72" x2="27.5" y2="37" className="fh-die-crease" />
          <line x1="11.9" y1="28" x2="27.5" y2="37" className="fh-die-crease" />
        </g>
      );
  }
};

const BeltPbSlot = ({
  char,
  lang,
  profB,
  pbActive,
  onSetPb,
}) => {
  const pt = lang === 'pt';
  const gestureRef = useRef({ startX: 0, startY: 0, movedX: false, pointerId: null, at: 0 });

  const onSlotPointerDown = (e) => {
    const pointerId = e.pointerId;
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      movedX: false,
      pointerId,
      at: Date.now(),
    };
    e.currentTarget.setPointerCapture?.(pointerId);
  };

  const onSlotPointerMove = (e) => {
    const g = gestureRef.current;
    if (!g.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
      g.movedX = true;
    }
  };

  const onSlotPointerUp = (e) => {
    const g = gestureRef.current;
    if (!g.pointerId) return;
    const dx = e.clientX - g.startX;
    const movedX = g.movedX;

    e.currentTarget.releasePointerCapture?.(g.pointerId);
    gestureRef.current = { startX: 0, startY: 0, movedX: false, pointerId: null, at: 0 };

    if (movedX || Math.abs(dx) > 18) {
      if (dx > 0) {
        onSetPb(true); // Swipe Right: Add PB
      } else {
        onSetPb(false); // Swipe Left: Remove PB
      }
      return;
    }

    // Tap on slot body: right half activates, left half deactivates, or toggle
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    if (relX > rect.width * 0.55) {
      onSetPb(true);
    } else if (relX < rect.width * 0.45) {
      onSetPb(false);
    } else {
      onSetPb(!pbActive);
    }
  };

  const onSlotPointerCancel = () => {
    gestureRef.current = { startX: 0, startY: 0, movedX: false, pointerId: null, at: 0 };
  };

  const onSlotKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSetPb(true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSetPb(false);
    } else if (isActionKey(e) && e.target === e.currentTarget) {
      e.preventDefault();
      onSetPb(!pbActive);
    }
  };

  return (
    <div className={`fh-belt-hex-wrap is-pb-master${pbActive ? ' is-pb-active' : ' is-pb-inactive'}`}>
      {/* SVG Glowing Edges: Right (PB Active), Left (PB Inactive) */}
      <svg
        className={`fh-belt-glow-svg${pbActive ? ' pb-right' : ' pb-left'}`}
        viewBox="0 0 100 115.47"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {pbActive && (
          <g className="fh-glow-group-pb-right">
            <path className="fh-edge-shadow-pb-right" d="M 50,0 L 100,28.87 L 100,86.60 L 50,115.47" />
            <path className="fh-edge-stroke-pb-right" d="M 50,0 L 100,28.87 L 100,86.60 L 50,115.47" />
          </g>
        )}
        {!pbActive && (
          <g className="fh-glow-group-pb-left">
            <path className="fh-edge-shadow-pb-left" d="M 50,0 L 0,28.87 L 0,86.60 L 50,115.47" />
            <path className="fh-edge-stroke-pb-left" d="M 50,0 L 0,28.87 L 0,86.60 L 50,115.47" />
          </g>
        )}
      </svg>

      <article
        className={`fh-belt-slot fh-belt-pb-slot${pbActive ? ' is-pb-active' : ' is-pb-inactive'}`}
        onPointerDown={onSlotPointerDown}
        onPointerMove={onSlotPointerMove}
        onPointerUp={onSlotPointerUp}
        onPointerCancel={onSlotPointerCancel}
        onKeyDown={onSlotKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={pbActive}
        aria-label={pt
          ? `Bônus de Proficiência do Cinto: PB +${profB} (${pbActive ? 'Ativado' : 'Desativado'}). Deslize → para ativar, ← para desativar`
          : `Belt Proficiency Bonus: PB +${profB} (${pbActive ? 'Active' : 'Inactive'}). Swipe → to add PB, ← to remove PB`}
        title={pt
          ? `PB +${profB} [${pbActive ? 'Ativado' : 'Desativado'}]: deslize → ligar, ← desligar · toque para alternar`
          : `PB +${profB} [${pbActive ? 'Active' : 'Inactive'}]: swipe → add PB, ← remove PB · tap to toggle`}
      >
        {/* Full 3D Chiseled Gold Medal Vector Facets & Lighting */}
        <svg className="fh-pb-medal-svg" viewBox="0 0 100 115.47" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            {/* Bevel Chamfer Gradients */}
            <linearGradient id="pb-chamfer-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#ffea9f" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d49f28" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="pb-chamfer-dark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#87580b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#543303" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2e1a01" stopOpacity="1" />
            </linearGradient>
            {/* Inactive Face Radial Gold */}
            <radialGradient id="pb-face-gold" cx="38%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fffef2" />
              <stop offset="16%" stopColor="#fdeba4" />
              <stop offset="45%" stopColor="#e5b847" />
              <stop offset="76%" stopColor="#be881e" />
              <stop offset="100%" stopColor="#7a5006" />
            </radialGradient>
            {/* Active Face Radiant Sun Gold */}
            <radialGradient id="pb-face-gold-active" cx="36%" cy="26%" r="68%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="14%" stopColor="#fff6be" />
              <stop offset="42%" stopColor="#f8d462" />
              <stop offset="74%" stopColor="#cb9824" />
              <stop offset="100%" stopColor="#875808" />
            </radialGradient>
          </defs>

          {/* Outer Base Bevel Layer */}
          <polygon
            className="fh-pb-medal-base"
            points="50,0 100,28.87 100,86.60 50,115.47 0,86.60 0,28.87"
            fill={pbActive ? "url(#pb-face-gold-active)" : "url(#pb-face-gold)"}
          />

          {/* Top-Left Lit Chamfer Facet */}
          <polygon
            className="fh-pb-chamfer-lit"
            points="50,0 0,28.87 0,86.60 4.5,84.20 4.5,31.30 50,5.00"
            fill="url(#pb-chamfer-light)"
          />

          {/* Bottom-Right Shadow Chamfer Facet */}
          <polygon
            className="fh-pb-chamfer-shade"
            points="50,0 100,28.87 100,86.60 50,115.47 0,86.60 4.5,84.20 50,110.50 95.5,84.20 95.5,31.30 50,5.00"
            fill="url(#pb-chamfer-dark)"
          />

          {/* Recessed Chiseled Inner Groove */}
          <polygon
            className="fh-pb-medal-groove"
            points="50,5.0 95.5,31.3 95.5,84.2 50,110.5 4.5,84.2 4.5,31.3"
            fill="none"
            stroke="#2b1702"
            strokeWidth="1.2"
          />

          {/* Raised Central Coin Plateau */}
          <polygon
            className="fh-pb-medal-plateau"
            points="50,8.2 92.5,32.8 92.5,82.7 50,107.3 7.5,82.7 7.5,32.8"
            fill={pbActive ? "url(#pb-face-gold-active)" : "url(#pb-face-gold)"}
          />

          {/* Plateau Edge Highlights */}
          <polyline
            className="fh-pb-plateau-rim-light"
            points="7.5,82.7 7.5,32.8 50,8.2 92.5,32.8"
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="1.1"
          />
          <polyline
            className="fh-pb-plateau-rim-dark"
            points="92.5,32.8 92.5,82.7 50,107.3 7.5,82.7"
            fill="none"
            stroke="rgba(60, 36, 4, 0.75)"
            strokeWidth="1.3"
          />
        </svg>

        {/* Precisely Centered Deeply Etched PB Label */}
        <div className="fh-belt-pb-etched-wrap">
          <span className="fh-belt-pb-etched">PB +{profB}</span>
        </div>

        {/* Specular Reflection Sheen when PB Active */}
        {pbActive && <div className="fh-belt-sheen is-slot-pb" aria-hidden="true" />}
      </article>
    </div>
  );
};

const BeltQuickSlot = ({
  slot,
  index,
  isActive,
  isDragTarget = false,
  onSelect,
  onShiftDie,
  onShiftCount,
  onSetAdvMode,
  onRoll,
  char,
  lang,
  pbActive,
  profB,
}) => {
  const HOLD_TO_ROLL_MS = 220;
  const touchRef = useRef({ x: 0, y: 0, time: 0, pointerId: null });
  const dieKnobRef = useRef({ startX: 0, startY: 0, movedY: false, movedX: false, pointerId: null, at: 0 });
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const chargeTimerRef = useRef(null);

  const pt = lang === 'pt';
  const isBound = !!slot.bound;
  const boundMod = isBound ? Utils.abilityMod(char, slot.bound) : 0;
  const isD20 = Number(slot.die) === 20;
  const advMode = isD20 ? (slot.advMode || 'normal') : 'normal';

  // 1. Die count: When d20 is in Advantage or Disadvantage stance, display 2d20!
  const hasStance = isD20 && (advMode === 'adv' || advMode === 'dis');
  const count = hasStance ? 2 : (slot.count > 1 ? slot.count : 1);
  const dieTypeStr = `${count}d${slot.die}`;

  // 2. Consolidated bonus as a singular unified sum on the right side of the dice type:
  // When an ability score is assigned, sum = boundMod + (pbActive ? profB : 0).
  // When not assigned, if pbActive is on, sum = profB.
  const hasBonus = isBound || pbActive;
  const totalMod = (isBound ? boundMod : 0) + (pbActive ? profB : 0);
  const bonusStr = hasBonus ? Utils.fmtMod(totalMod) : '';
  const formulaLabel = `${dieTypeStr}${bonusStr}`;

  // Slot container gestures: Hold & Release to roll; Simple Tap on d20 deactivates stance!
  const onDown = (e) => {
    const pointerId = e.pointerId;
    touchRef.current = { x: e.clientX, y: e.clientY, time: Date.now(), pointerId };
    onSelect(index);
    try { e.currentTarget.setPointerCapture?.(pointerId); } catch (_) {}

    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    chargeTimerRef.current = setTimeout(() => {
      setIsCharging(true);
      if (navigator.vibrate) navigator.vibrate(18);
    }, HOLD_TO_ROLL_MS);
  };

  const onUp = (e) => {
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    const wasCharging = isCharging;
    setIsCharging(false);

    const t = touchRef.current;
    if (t.pointerId != null) {
      try { e.currentTarget.releasePointerCapture?.(t.pointerId); } catch (_) {}
    }
    touchRef.current = { x: 0, y: 0, time: 0, pointerId: null };

    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const dist = Math.hypot(dx, dy);
    const holdDuration = Date.now() - t.time;

    // Horizontal swipe -> die type
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) {
      const step = Math.max(1, Math.floor(Math.abs(dx) / 24));
      onShiftDie(index, dx > 0 ? step : -step);
      return;
    }
    // Vertical swipe -> count
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 18) {
      const step = Math.max(1, Math.floor(Math.abs(dy) / 24));
      onShiftCount(index, dy < 0 ? step : -step);
      return;
    }

    // In-place interaction (dist < 16)
    if (dist < 16) {
      onSelect(index);
      if (holdDuration >= HOLD_TO_ROLL_MS || wasCharging) {
        // HELD AND THEN RELEASED -> EXECUTE ROLL!
        onRoll(index);
      } else {
        // SIMPLE TAP:
        // If it's a d20 with Advantage or Disadvantage, simple tap deactivates the stance!
        if (isD20 && advMode !== 'normal') {
          onSetAdvMode(index, 'normal');
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }
    }
  };

  // D20 Die Silhouette Knob Gestures (Advantage / Disadvantage knob solely when d20)
  const onDieKnobPointerDown = (e) => {
    onSelect(index);
    if (!isD20) return;
    e.stopPropagation();
    const pointerId = e.pointerId;
    dieKnobRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      movedY: false,
      movedX: false,
      pointerId,
      at: Date.now(),
    };
    setIsPulling(true);
    try { e.currentTarget.setPointerCapture?.(pointerId); } catch (_) {}

    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    chargeTimerRef.current = setTimeout(() => {
      setIsCharging(true);
      if (navigator.vibrate) navigator.vibrate(18);
    }, HOLD_TO_ROLL_MS);
  };

  const onDieKnobPointerMove = (e) => {
    if (!isD20) return;
    e.stopPropagation();
    const g = dieKnobRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;
    const dx = e.clientX - g.startX;

    if (Math.abs(dy) > 4 && Math.abs(dy) >= Math.abs(dx)) {
      g.movedY = true;
      if (chargeTimerRef.current) {
        clearTimeout(chargeTimerRef.current);
        chargeTimerRef.current = null;
      }
      setIsCharging(false);
      const clamped = Math.max(-10, Math.min(10, dy));
      setPullY(clamped);
    } else if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy)) {
      g.movedX = true;
      if (chargeTimerRef.current) {
        clearTimeout(chargeTimerRef.current);
        chargeTimerRef.current = null;
      }
      setIsCharging(false);
    }
  };

  const onDieKnobPointerUp = (e) => {
    if (!isD20) return;
    e.stopPropagation();
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    const wasCharging = isCharging;
    setIsCharging(false);

    const g = dieKnobRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;
    const dx = e.clientX - g.startX;
    const movedY = g.movedY;
    const movedX = g.movedX;
    const holdDuration = Date.now() - g.at;

    try { e.currentTarget.releasePointerCapture?.(g.pointerId); } catch (_) {}
    dieKnobRef.current = { startX: 0, startY: 0, movedY: false, movedX: false, pointerId: null, at: 0 };
    setIsPulling(false);
    setPullY(0);

    if (movedX) {
      onShiftDie(index, dx > 0 ? 1 : -1);
      return;
    }

    if (movedY) {
      if (dy < -5) {
        onSetAdvMode(index, 'adv'); // Drag Up: Advantage
      } else if (dy > 5) {
        onSetAdvMode(index, 'dis'); // Drag Down: Disadvantage
      } else {
        onSetAdvMode(index, 'normal');
      }
      return;
    }

    // In-place interaction on D20 silhouette:
    onSelect(index);
    if (holdDuration >= HOLD_TO_ROLL_MS || wasCharging) {
      // HELD AND THEN RELEASED -> EXECUTE ROLL!
      onRoll(index);
    } else {
      // SIMPLE TAP on d20 knob:
      // Deactivate advantage / disadvantage!
      if (advMode !== 'normal') {
        onSetAdvMode(index, 'normal');
        if (navigator.vibrate) navigator.vibrate(20);
      }
    }
  };

  const onDieKnobPointerCancel = (e) => {
    if (!isD20) return;
    e.stopPropagation();
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    setIsCharging(false);
    dieKnobRef.current = { startX: 0, startY: 0, movedY: false, movedX: false, pointerId: null, at: 0 };
    setIsPulling(false);
    setPullY(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); onShiftDie(index, -1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); onShiftDie(index, 1); return; }
    if (isD20 && e.key === 'ArrowUp') { e.preventDefault(); onSetAdvMode(index, 'adv'); return; }
    if (isD20 && e.key === 'ArrowDown') { e.preventDefault(); onSetAdvMode(index, 'dis'); return; }
    if (isD20 && e.key === 'Escape') { e.preventDefault(); onSetAdvMode(index, 'normal'); return; }
    if (!isD20 && e.key === 'ArrowUp') { e.preventDefault(); onShiftCount(index, 1); return; }
    if (!isD20 && e.key === 'ArrowDown') { e.preventDefault(); onShiftCount(index, -1); return; }
    if (isActionKey(e)) { e.preventDefault(); onSelect(index); onRoll(index); }
  };

  const stanceText = advMode === 'adv' ? (pt ? ' (Vantagem 🟢)' : ' (Advantage 🟢)')
                   : advMode === 'dis' ? (pt ? ' (Desvantagem 🔴)' : ' (Disadvantage 🔴)')
                   : '';

  const ariaLabel = pt
    ? `Slot do cinto: ${formulaLabel}${stanceText}. Segure e solte para rolar`
    : `Belt slot: ${formulaLabel}${stanceText}. Hold and release to roll`;

  return (
    <div className={`fh-belt-hex-wrap is-quick-slot die-d${slot.die}${isD20 ? ` adv-${advMode}` : ''}${isBound ? ` is-bound tone-${slot.bound}` : ''}`}>
      {/* SVG Glowing Edges solely when d20: Top 2 (Advantage Green), Bottom 2 (Disadvantage Red) */}
      {isD20 && (
        <svg
          className={`fh-belt-glow-svg adv-${advMode}`}
          viewBox="0 0 100 115.47"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {advMode === 'adv' && (
            <g className="fh-glow-group-adv">
              <path className="fh-edge-shadow-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
              <path className="fh-edge-stroke-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
              <path className="fh-edge-shine-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
            </g>
          )}
          {advMode === 'dis' && (
            <g className="fh-glow-group-dis">
              <path className="fh-edge-shadow-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
              <path className="fh-edge-stroke-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
              <path className="fh-edge-shine-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
            </g>
          )}
        </svg>
      )}

      <article
        className={`fh-belt-slot${pbActive ? ' has-pb' : ''}${isActive ? ' is-active' : ''}${isDragTarget ? ' is-drag-target' : ''}${isBound ? ` is-bound tone-${slot.bound}` : ''}${isD20 ? ` adv-${advMode}` : ''}${isCharging ? ' is-charging-roll' : ''}`}
        data-quick-slot-index={index}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => {
          if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
          setIsCharging(false);
          touchRef.current = { x: 0, y: 0, time: 0, pointerId: null };
        }}
        onFocus={() => onSelect(index)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        title={isD20
          ? (pt ? `d20: arraste ↑ vantagem, ↓ desvantagem · toque para desativar · segure e solte para rolar` : `d20: drag ↑ advantage, ↓ disadvantage · tap to clear · hold & release to roll`)
          : (pt ? `Deslize ↔ dado, ↕ qtd · segure e solte para rolar` : `Swipe ↔ die, ↕ count · hold & release to roll`)}
      >
        {/* Specular Reflection Sheen when PB Active */}
        {pbActive && <div className={`fh-belt-sheen is-slot-${index}`} aria-hidden="true" />}

        {/* Center: Perfectly Centered Die Silhouette Badge. When d20, silhouette is the stance knob! */}
        <div
          className={`fh-belt-die-badge die-d${slot.die}${isD20 ? ` is-d20-knob adv-${advMode}${isPulling ? ' is-pulling' : ''}` : ''}`}
          style={isD20 && pullY !== 0 ? { transform: `translate(-50%, calc(-50% + ${pullY}px)) scale(1.03)` } : undefined}
          onPointerDown={onDieKnobPointerDown}
          onPointerMove={onDieKnobPointerMove}
          onPointerUp={onDieKnobPointerUp}
          onPointerCancel={onDieKnobPointerCancel}
          role={isD20 ? 'slider' : undefined}
          aria-valuenow={isD20 ? (advMode === 'adv' ? 1 : advMode === 'dis' ? -1 : 0) : undefined}
          aria-valuemin={isD20 ? -1 : undefined}
          aria-valuemax={isD20 ? 1 : undefined}
          aria-label={isD20 ? (pt ? `Postura do d20: ${advMode}` : `d20 Stance: ${advMode}`) : undefined}
        >
          <svg className="fh-die-silhouette-svg" viewBox="0 0 100 100" aria-hidden="true">
            {renderDieShape(slot.die)}
          </svg>
          {/* Clean inline consolidated formula: e.g. '2d20+3', '1d12+5', '1d6', etc. */}
          <div className="fh-belt-dice-lockup">
            <span className="fh-belt-slot-dice">
              {formulaLabel}
            </span>
          </div>
        </div>
      </article>
      {pbActive && (
          <svg className="fh-belt-pb-contour" viewBox="0 0 100 115.47" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength="100" d="M 50,0 L 100,28.87 L 100,86.60 L 50,115.47" />
            <path pathLength="100" d="M 50,0 L 0,28.87 L 0,86.60 L 50,115.47" />
          </svg>
        )}
    </div>
  );
};

const BeltAbilities = ({ char, lang, roll, profB }) => {
  // DES ⇄ CON e SAB ⇄ CAR: FOR e DES ficam sobre os dois d20 centrais (os mais usados)
  const top = ['str', 'con', 'dex'];
  const bottom = ['int', 'cha', 'wis'];
  const pt = lang === 'pt';
  const effectiveProfB = profB != null ? profB : Utils.profBonus(char.level);

  const [activeSlot, setActiveSlot] = useState(0);
  const [dragLink, setDragLink] = useState(null);
  const dragLinkRef = useRef(null);
  dragLinkRef.current = dragLink;
  const lastTargetSlotRef = useRef(null);

  const getSlotAtPoint = (x, y) => {
    if (x == null || y == null) return null;
    const elements = document.querySelectorAll('.fh-belt-slot[data-quick-slot-index]');
    let closestIdx = null;
    let closestDist = Infinity;
    const hitMargin = 36;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left - hitMargin &&
        x <= rect.right + hitMargin &&
        y >= rect.top - hitMargin &&
        y <= rect.bottom + hitMargin
      ) {
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = Number(el.getAttribute('data-quick-slot-index'));
        }
      }
    }
    return closestIdx;
  };

  useEffect(() => {
    if (!dragLink) {
      lastTargetSlotRef.current = null;
      return;
    }

    const onPointerMove = (e) => {
      const targetIndex = getSlotAtPoint(e.clientX, e.clientY);
      if (targetIndex != null) lastTargetSlotRef.current = targetIndex;
      setDragLink((prev) => (prev ? {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        targetSlot: targetIndex,
      } : null));
    };

    const onPointerUp = (e) => {
      const current = dragLinkRef.current;
      const pointSlot = e && e.clientX != null ? getSlotAtPoint(e.clientX, e.clientY) : null;
      const targetIndex = pointSlot ?? lastTargetSlotRef.current ?? current?.targetSlot;
      if (current && targetIndex != null) {
        const ability = current.ability;
        setSlots((slotsPrev) => slotsPrev.map((s, i) => (
          i === targetIndex ? { ...s, bound: s.bound === ability ? null : ability } : s
        )));
        setActiveSlot(targetIndex);
        if (navigator.vibrate) navigator.vibrate(40);
      }
      setDragLink(null);
      lastTargetSlotRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
    };
  }, [dragLink != null]);

  const onStartAbilityDrag = (k, e, anchor) => {
    const startX = anchor?.startX ?? (anchor?.left != null ? anchor.left + anchor.width / 2 : e.clientX);
    const startY = anchor?.startY ?? (anchor?.top != null ? anchor.top + anchor.height * 0.45 : e.clientY);
    const radius = anchor?.radius ?? 17;
    const targetSlot = getSlotAtPoint(e.clientX, e.clientY);
    lastTargetSlotRef.current = targetSlot;
    setDragLink({
      ability: k,
      startX,
      startY,
      radius,
      currentX: e.clientX,
      currentY: e.clientY,
      targetSlot,
    });
  };

  // 4 hexágonos de dado no meio do cinto; os dois centrais são d20 com FOR e DES já atribuídos
  // e o BP ligado — cada um tem a sua cunha de BP no vão acima dele.
  // Cinto salvo por personagem (slots + as duas "cargas" I/II de cada metade)
  const beltKey = `fh-belt:${char?.id ?? 'local'}`;
  const beltSaved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(beltKey) || 'null'); } catch { return null; }
  }, [beltKey]);
  const [slots, setSlots] = useState(() => (Array.isArray(beltSaved?.slots) && beltSaved.slots.length === 4 ? beltSaved.slots : [
    { die: 6, count: 1, bound: null, advMode: 'normal', pb: false },
    { die: 20, count: 1, bound: 'str', advMode: 'normal', pb: true },
    { die: 20, count: 1, bound: 'dex', advMode: 'normal', pb: true },
    { die: 8, count: 1, bound: null, advMode: 'normal', pb: false },
  ]));
  // carga ativa (0 = I, 1 = II) e a carga guardada de cada metade do cinto
  const [loadouts, setLoadouts] = useState(() => beltSaved?.loadouts || { L: { active: 0, other: null }, R: { active: 0, other: null } });
  useEffect(() => {
    try { localStorage.setItem(beltKey, JSON.stringify({ slots, loadouts })); } catch { /* sem armazenamento */ }
  }, [beltKey, slots, loadouts]);
  const swapLoadout = (side) => {
    const idxs = side === 'L' ? [0, 1] : [2, 3];
    const cur = idxs.map((i) => slots[i]);
    const lo = loadouts[side];
    const next = lo.other || cur.map((x) => ({ ...x }));   // primeira vez: II nasce como cópia de I
    setSlots((prev) => prev.map((x, i) => (idxs.includes(i) ? next[idxs.indexOf(i)] : x)));
    setLoadouts((prev) => ({ ...prev, [side]: { active: 1 - prev[side].active, other: cur } }));
    if (navigator.vibrate) navigator.vibrate(20);
  };
  const pbActive = slots.some((s) => s.pb);
  const togglePb = (idx) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, pb: !s.pb } : s)));
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const onShiftDie = (idx, delta) => {
    setActiveSlot(idx);
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const curDieIdx = Math.max(0, HONEY_DICE.indexOf(s.die));
      const nextIdx = (((curDieIdx + delta) % HONEY_DICE.length) + HONEY_DICE.length) % HONEY_DICE.length;
      const nextDie = HONEY_DICE[nextIdx];
      return {
        ...s,
        die: nextDie,
        advMode: nextDie === 20 ? (s.advMode || 'normal') : 'normal',
      };
    }));
  };

  const onShiftCount = (idx, delta) => {
    setActiveSlot(idx);
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      return { ...s, count: Math.max(1, Math.min(20, s.count + delta)) };
    }));
  };

  const onSetSlotAdvMode = (idx, modeOrFn) => {
    setActiveSlot(idx);
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      if (Number(s.die) !== 20) return { ...s, advMode: 'normal' };
      const cur = s.advMode || 'normal';
      const nextMode = typeof modeOrFn === 'function' ? modeOrFn(cur) : modeOrFn;
      return { ...s, advMode: nextMode };
    }));
  };

  const onBind = (k) => {
    setSlots((prev) => prev.map((s, i) => {
      if (i !== activeSlot) return s;
      return { ...s, bound: s.bound === k ? null : k };
    }));
  };

  const [beltMulti, setBeltMulti] = useState(null);
  const onRollSlot = (idx) => {
    const s = slots[idx];
    // Padrão: rola todos os hexágonos de dado com o MESMO atributo, em pares 1d20 + 1 dano
    // (2d20 + 2 danos = ataque múltiplo, um par por coluna).
    const group = s.bound ? slots.filter((x) => x.bound === s.bound) : [];
    if (group.length >= 2) {
      const abilMod = Utils.abilityMod(char, s.bound);
      const results = rollBeltPairs(pairBeltSlots(group), { abilMod, profB: effectiveProfB });
      setBeltMulti({ results, abil: BELT_ABBR[s.bound] || s.bound.toUpperCase() });
      return;
    }
    const isBound = !!s.bound;
    const boundMod = isBound ? Utils.abilityMod(char, s.bound) : 0;
    const totalMod = (isBound ? boundMod : 0) + (s.pb ? effectiveProfB : 0);
    const parts = [];
    if (s.bound) parts.push(`${BELT_ABBR[s.bound] || s.bound.toUpperCase()} ${Utils.fmtMod(boundMod)}`);
    if (s.pb) parts.push(`PB ${Utils.fmtMod(effectiveProfB)}`);
    const modText = parts.length ? ` (${parts.join(' + ')})` : '';
    const isD20 = Number(s.die) === 20;
    const advMode = isD20 ? (s.advMode || 'normal') : 'normal';
    const hasStance = isD20 && (advMode === 'adv' || advMode === 'dis');
    const rollCount = hasStance ? 1 : (s.count || 1);
    const advText = advMode === 'adv' ? (pt ? ' (com vantagem)' : ' (with advantage)')
                  : advMode === 'dis' ? (pt ? ' (com desvantagem)' : ' (with disadvantage)')
                  : '';
    roll({
      die: s.die,
      count: rollCount,
      mod: totalMod,
      label: pt
        ? `Cinto [Slot ${idx + 1}] ${rollCount}d${s.die}${modText}${advText}`
        : `Belt [Slot ${idx + 1}] ${rollCount}d${s.die}${modText}${advText}`,
      advMode,
    });
  };

  return (
    <div className="fh-belt" data-fab-pass="">
      {beltMulti && (
        <BeltMultiRoll results={beltMulti.results} lang={lang} onClose={() => setBeltMulti(null)} />
      )}
      {dragLink && typeof document !== 'undefined' && createPortal(
        (() => {
          // Query the live spherical head badge so (cx, cy, r) is 100% physically locked with 0 offset
          const liveBadge = document.querySelector(`.fh-belt-badge[data-ability-badge="${dragLink.ability}"]`);
          const badgeRect = liveBadge?.getBoundingClientRect();
          const startX = badgeRect ? badgeRect.left + badgeRect.width / 2 : dragLink.startX;
          const startY = badgeRect ? badgeRect.top + badgeRect.height / 2 : dragLink.startY;
          const radius = badgeRect ? badgeRect.width / 2 : (dragLink.radius || 17);

          const dx = dragLink.currentX - startX;
          const dy = dragLink.currentY - startY;
          const dist = Math.hypot(dx, dy);
          // Tightly contours the round badge rim seamlessly and gaplessly
          const contourRadius = radius + 0.6;
          const offset = radius + 1.8; // starts cleanly outside the contour stroke
          const x0 = dist > offset ? startX + (dx / dist) * offset : startX;
          const y0 = dist > offset ? startY + (dy / dist) * offset : startY;
          const midX = (x0 + dragLink.currentX) / 2;
          const midY = (y0 + dragLink.currentY) / 2 - 20;

          return (
            <svg className="fh-belt-drag-overlay" aria-hidden="true">
              {/* Luminous Contour Ring tightly hugging the round badge rim gaplessly */}
              <circle
                className={`fh-drag-trail-contour tone-${dragLink.ability}`}
                cx={startX}
                cy={startY}
                r={contourRadius}
              />

              {/* Trailing dashed guide starting strictly outside the contour ring */}
              <path
                className={`fh-drag-trail-path tone-${dragLink.ability}`}
                d={`M ${x0} ${y0} Q ${midX} ${midY} ${dragLink.currentX} ${dragLink.currentY}`}
              />
              <g transform={`translate(${dragLink.currentX}, ${dragLink.currentY})`}>
                <circle className={`fh-drag-beacon-halo tone-${dragLink.ability}`} r="30" />
                <circle className="fh-drag-beacon-core" r="19" />
                <text className="fh-drag-beacon-text" textAnchor="middle" dy="1">
                  {BELT_ABBR[dragLink.ability] || dragLink.ability.toUpperCase()}
                </text>
              </g>
            </svg>
          );
        })(),
        document.body
      )}
      <div className="fh-belt-hive-row is-top">
        {top.map((k) => (
          <BeltHex
            key={k}
            k={k}
            char={char}
            lang={lang}
            roll={roll}
            onBind={onBind}
            onStartDrag={onStartAbilityDrag}
            isBound={slots[activeSlot]?.bound === k}
            isAssigned={slots.some((s) => s.bound === k)}
          />
        ))}
        {/* Cunhas de BP nos vãos FOR|CON e CON|DES: tocar desce um contorno luminoso pelas
            frestas até o hexágono de dado logo abaixo (slot 1 e slot 2), somando o BP nele. */}
        {[1, 2].map((si) => (
          <button
            key={`pb${si}`}
            type="button"
            className={`fh-belt-pb-wedge is-${si === 1 ? 'left' : 'right'}${slots[si]?.pb ? ' is-on' : ''}`}
            aria-pressed={!!slots[si]?.pb}
            aria-label={pt
              ? `BP +${effectiveProfB} no dado abaixo (${slots[si]?.pb ? 'ligado' : 'desligado'})`
              : `PB +${effectiveProfB} on the die below (${slots[si]?.pb ? 'on' : 'off'})`}
            onClick={(e) => { e.stopPropagation(); togglePb(si); }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`pbw-face-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" className="pbw-face-a" />
                  <stop offset=".55" className="pbw-face-b" />
                  <stop offset="1" className="pbw-face-c" />
                </linearGradient>
                <radialGradient id={`pbw-sheen-${si}`} cx=".5" cy=".18" r=".55">
                  <stop offset="0" stopColor="#fff" stopOpacity=".38" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* fresta: o vão sombreado em volta da peça */}
              <polygon className="pbw-slit" points="0,0 100,0 50,100" />
              {/* corpo chanfrado (cantos cortados) */}
              <polygon className="pbw-body" fill={`url(#pbw-face-${si})`} points="9,3 91,3 95.5,7.5 53,91 47,91 4.5,7.5" />
              {/* biséis: luz em cima e à esquerda, sombra à direita e no fundo */}
              <polyline className="pbw-bevel-hi" points="4.5,7.5 9,3 91,3 95.5,7.5" />
              <polyline className="pbw-bevel-lo" points="95.5,7.5 53,91 47,91" />
              <polyline className="pbw-bevel-mid" points="47,91 4.5,7.5" />
              <polygon className="pbw-face" fill={`url(#pbw-face-${si})`} points="14,9 86,9 50,79" />
              <polygon points="14,9 86,9 50,79" fill={`url(#pbw-sheen-${si})`} />
            </svg>
            <span>BP</span>
          </button>
        ))}
        {[1, 2].map((si) => slots[si]?.pb && (
          <svg key={`pbs${si}`} className={`fh-belt-pb-slits is-${si === 1 ? 'left' : 'right'}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {/* fio dourado no meio das frestas: em volta da cunha e descendo até o dado */}
            {/* 1) contorna a cunha partindo do meio da aresta de cima até o vértice */}
            <path pathLength="100" d="M 50,0 L 0,0 L 50,100" />
            <path pathLength="100" d="M 50,0 L 100,0 L 50,100" />
          </svg>
        ))}
        {/* 2) desce pela fresta entre os hexágonos de atributo até o vértice do dado */}
        {[1, 2].map((si) => slots[si]?.pb && (
          <span key={`pbd${si}`} className={`fh-belt-pb-drop is-${si === 1 ? 'left' : 'right'}`} aria-hidden="true" />
        ))}
      </div>
      <div className="fh-belt-hive-row is-mid">
        {slots.map((slot, idx) => (
          <BeltQuickSlot
            key={idx}
            slot={slot}
            index={idx}
            isActive={activeSlot === idx}
            isDragTarget={dragLink?.targetSlot === idx}
            onSelect={setActiveSlot}
            onShiftDie={onShiftDie}
            onShiftCount={onShiftCount}
            onSetAdvMode={onSetSlotAdvMode}
            onRoll={onRollSlot}
            char={char}
            lang={lang}
            pbActive={!!slot.pb}
            profB={effectiveProfB}
          />
        ))}
      </div>
      <div className="fh-belt-hive-row is-bottom">
        {bottom.map((k) => (
          <BeltHex
            key={k}
            k={k}
            char={char}
            lang={lang}
            roll={roll}
            onBind={onBind}
            onStartDrag={onStartAbilityDrag}
            isBound={slots[activeSlot]?.bound === k}
            isAssigned={slots.some((s) => s.bound === k)}
          />
        ))}
        {/* Cargas I/II: cunhas nos vãos de baixo (INT|CHA e CHA|SAB). Cada uma troca a
            configuração dos 2 dados daquele lado do cinto. */}
        {['L', 'R'].map((side) => (
          <button
            key={`lo${side}`}
            type="button"
            className={`fh-belt-pb-wedge is-loadout is-${side === 'L' ? 'left' : 'right'}${loadouts[side].active ? ' is-on' : ''}`}
            aria-label={pt
              ? `Carga ${loadouts[side].active ? 'II' : 'I'} dos dados da ${side === 'L' ? 'esquerda' : 'direita'}: toque para trocar`
              : `${side === 'L' ? 'Left' : 'Right'} dice loadout ${loadouts[side].active ? 'II' : 'I'}: tap to swap`}
            onClick={(e) => { e.stopPropagation(); swapLoadout(side); }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`low-face-${side}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" className="pbw-face-a" />
                  <stop offset=".55" className="pbw-face-b" />
                  <stop offset="1" className="pbw-face-c" />
                </linearGradient>
              </defs>
              <polygon className="pbw-body" fill={`url(#low-face-${side})`} points="9,97 91,97 95.5,92.5 53,9 47,9 4.5,92.5" />
              <polyline className="pbw-bevel-mid" points="4.5,92.5 47,9 53,9" />
              <polyline className="pbw-bevel-lo" points="53,9 95.5,92.5 91,97 9,97 4.5,92.5" />
              <polygon className="pbw-face" fill={`url(#low-face-${side})`} points="14,91 86,91 50,21" />
            </svg>
            <span>{loadouts[side].active ? 'II' : 'I'}</span>
          </button>
        ))}
      </div>
      <p className="fh-honey-help">
        {pt
          ? 'Rolar: segure e solte · BP: toque na cunha acima do dado · I/II: troca a carga dos dados · d20: arraste a silhueta ↑ vantagem 🟢, ↓ desvantagem 🔴 · segure um atributo para vincular ao cinto.'
          : 'Roll: hold and release · PB: tap the wedge above a die · I/II: swap the dice loadout on that side · d20: drag silhouette ↑ advantage 🟢, ↓ disadvantage 🔴 · hold an attribute badge to bind to belt.'}
      </p>
    </div>
  );
};

const OtherFeatures = ({ char, lang, placed, cls }) => {
  const pt = lang === 'pt';
  const bgf = backgroundFeature(char, lang);
  // Sem dados de progressão (classe fora das regras): os traços do nível 1 do SRD.
  const srd = !placed.items.length && char.rulesVersion !== '2024' ? (cls?.features || []) : [];
  const items = placed.by.other;
  if (!items.length && !bgf && !srd.length) return null;
  const both = (v) => ({ pt: v, en: v });
  return (
    <section className="fh-panel">
      <FhTitle>{pt ? 'Outros traços' : 'Other features'}</FhTitle>
      <FhFeatures items={items} multi={placed.multi} lang={lang} label={null}>
        {srd.map((f, i) => (
          <FhFeatureItem key={`srd-${i}`} item={{ name: f.name, desc: f.desc }} lang={lang} tag={pt ? 'Nv. 1' : 'Lv 1'} />
        ))}
        {bgf && <FhFeatureItem item={{ name: both(bgf.name), desc: both(bgf.desc) }} lang={lang} tag={pt ? 'antecedente' : 'background'} />}
      </FhFeatures>
    </section>
  );
};

export const SheetAbilities = ({ char, lang, update, profB, roll }) => {
  const pt = lang === 'pt';
  const [beltMode, setBeltMode] = useState(false);
  const profText = (level) => level === 2 ? (pt ? 'Especialista' : 'Expertise') : level ? (pt ? 'Treinado' : 'Proficient') : (pt ? 'Sem treino' : 'Not proficient');

  return (
    <div className="fh-scope-content fh-scope-abilities">
      <section className="fh-panel">
        <FhTitle sub={<span><FhTapToRoll lang={lang} /></span>}>{pt ? 'Atributos' : 'Ability Scores'}</FhTitle>
        <label className="fh-honey-toggle">
          <input type="checkbox" checked={beltMode} onChange={(e) => setBeltMode(e.target.checked)} />
          <span>{pt ? 'Modo cinto de rolagem (belt)' : 'Dice belt mode'}</span>
        </label>
        {beltMode
          ? <BeltAbilities char={char} lang={lang} roll={roll} profB={profB} />
          : <AbilitySeals char={char} lang={lang} roll={roll} rollLabel={k => t(k, lang)} />}
      </section>

      {!beltMode && (
        <section className="fh-panel">
          <FhTitle sub={<span><FhTapToRoll lang={lang} /></span>}>{pt ? 'Testes de Resistência' : 'Saving Throws'}</FhTitle>
          <div className="fh-skills" data-fab-pass="" style={{ '--fh-rows': Math.ceil(SRD.ABILITIES.length / 2) }}>
            {SRD.ABILITIES.map(k => {
              const bonus = Utils.saveBonus(char, k);
              const isProf = Utils.hasSaveProf(char, k);
              return (
                <FhSkillRow key={k} name={t(k, lang)} abbr={t(k + 'Sh', lang)} bonus={Utils.fmtMod(bonus)}
                  level={isProf ? 1 : 0}
                  profTitle={profText(isProf ? 1 : 0)}
                  profLabel={`${t(k, lang)}: ${profText(isProf ? 1 : 0)}`}
                  onToggle={() => update({ saveProfs: isProf ? (char.saveProfs || []).filter(x => x !== k) : [...(char.saveProfs || []), k] })}
                  onRoll={() => roll({ die: 20, mod: bonus, label: t(k, lang) + ' ' + t('saveRoll', lang), isSave: true })} />
              );
            })}
          </div>
          <FhProfLegend lang={lang} />
        </section>
      )}
    </div>
  );
};

export const TOOL_ABILITY_MAP = {
  thievesTools: 'dex',
  alchemistsSupplies: 'int',
  brewersSupplies: 'con',
  calligraphersSupplies: 'dex',
  carpentersTools: 'str',
  cartographersTools: 'wis',
  cobblersTools: 'dex',
  cooksUtensils: 'wis',
  glassblowersTools: 'dex',
  jewelersTools: 'dex',
  leatherworkersTools: 'dex',
  masonsTools: 'str',
  paintersSupplies: 'dex',
  pottersTools: 'dex',
  smithsTools: 'str',
  tinkersTools: 'dex',
  weaversTools: 'dex',
  woodcarversTools: 'dex',
  disguiseKit: 'cha',
  forgeryKit: 'dex',
  herbalismKit: 'wis',
  navigatorsTools: 'wis',
  poisonersKit: 'int',
  bagpipes: 'cha', drum: 'cha', dulcimer: 'cha', flute: 'cha', horn: 'cha',
  lute: 'cha', lyre: 'cha', panFlute: 'cha', shawm: 'cha', viol: 'cha',
  diceSet: 'wis', dragonchessSet: 'int', playingCardSet: 'cha', threeDragonAnteSet: 'cha',
  vehiclesLand: 'dex', vehiclesWater: 'dex',
};

export const SKILL_GROUPS = [
  {
    id: 'search',
    name: { pt: 'Ação: Busca (Search)', en: 'Battle Action: Search' },
    icon: '🔍',
    skillIds: ['survival', 'insight', 'medicine', 'perception'],
  },
  {
    id: 'hide',
    name: { pt: 'Ação: Furtividade & Evasão (Hide)', en: 'Battle Action: Hide & Agility' },
    icon: '👣',
    skillIds: ['acrobatics', 'athletics', 'sleightOfHand', 'stealth'],
  },
  {
    id: 'influence',
    name: { pt: 'Ação: Influência (Influence)', en: 'Battle Action: Influence' },
    icon: '💬',
    skillIds: ['animalHandling', 'deception', 'intimidation', 'performance', 'persuasion'],
  },
  {
    id: 'study',
    name: { pt: 'Ação: Estudo (Study)', en: 'Battle Action: Study' },
    icon: '📚',
    skillIds: ['arcana', 'history', 'investigation', 'nature', 'religion'],
  },
];

export const SheetSkills = ({ char, lang, update, passPerc, roll, placed }) => {
  const pt = lang === 'pt';
  const profText = (level) => level === 2 ? (pt ? 'Especialista' : 'Expertise') : level ? (pt ? 'Treinado' : 'Proficient') : (pt ? 'Sem treino' : 'Not proficient');

  // Estado recolhível/dobrável para cada uma das categorias de ações (padrão parcialmente recolhido)
  const [collapsed, setCollapsed] = useState({
    search: true,
    hide: true,
    influence: true,
    study: true,
    tools: true,
  });

  const toggleGroup = (groupId) => {
    setCollapsed(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const allCollapsed = Object.values(collapsed).every(Boolean);
  const toggleAll = () => {
    const nextVal = !allCollapsed;
    setCollapsed({ search: nextVal, hide: nextVal, influence: nextVal, study: nextVal, tools: nextVal });
  };

  const explicitSkillMap = useMemo(() => {
    const map = new Map();
    for (const s of SRD.SKILLS) {
      const bonus = Utils.skillBonus(char, s.id);
      map.set(s.id.toLowerCase().replace(/[\s_\-]/g, ''), bonus);
    }
    return map;
  }, [char]);

  const keen = useMemo(() => hasKeenSenses(char), [char]);

  const actionSkillData = useMemo(() => {
    return ACTION_SKILL_GROUPS.map((grp) => ({
      ...grp,
      ...computeActionGroupData(grp, char.abilities, explicitSkillMap, lang, { hasKeen: keen }),
    }));
  }, [char.abilities, explicitSkillMap, lang, keen]);

  const handleSkillRoll = (formula, label, defaultAdv, e) => {
    const el = e?.currentTarget;
    const swipedAdv = el?.getAttribute('data-roll-adv');
    const finalAdv = swipedAdv || defaultAdv;
    const match = formula.match(/1d20([+-]\d+)/);
    const mod = match ? parseInt(match[1], 10) : 0;
    roll({
      die: 20,
      mod,
      formula,
      label,
      isCheck: true,
      ...(finalAdv ? { adv: finalAdv, advMode: finalAdv } : {}),
    });
  };

  const toggleProf = (sId) => {
    const isExpert = Utils.hasExpertise(char, sId);
    const isProf = Utils.hasSkillProf(char, sId);
    if (isExpert) {
      update({
        skillExpertise: (char.skillExpertise || []).filter(x => x !== sId),
        skillProfs: (char.skillProfs || []).filter(x => x !== sId),
      });
    } else if (isProf) {
      update({ skillExpertise: [...(char.skillExpertise || []), sId] });
    } else {
      update({ skillProfs: [...(char.skillProfs || []), sId] });
    }
  };

  // 5th Action Group: Action: Use Tool (Usar Ferramenta)
  const toolItems = useMemo(() => {
    const profs = new Set([
      ...(char.toolProfs || []),
      ...(char.creation?.toolChoices?.background || []),
      ...(char.creation?.toolChoices?.class || []),
    ]);
    const pb = Utils.profBonus(char);
    const hasToolExp = (char.className === 'artificer' && (char.level || 1) >= 6) ||
      (char.features || []).some(f => /toolExpertise/i.test(f.id || f.name));

    const list = [];
    profs.forEach(tId => {
      const stat = TOOL_ABILITY_MAP[tId] || 'dex';
      const abilMod = Utils.abilityMod(char, stat);
      const bonus = abilMod + pb * (hasToolExp ? 2 : 1);
      const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      const passive = 10 + bonus;
      const name = toolName(tId, lang);
      list.push({
        id: tId,
        name,
        stat: stat.toUpperCase(),
        bonus,
        bonusStr,
        passive,
        isTrained: true,
        formula: `1d20${bonusStr}`,
      });
    });
    if (!list.length) {
      const stat = 'dex';
      const abilMod = Utils.abilityMod(char, stat);
      const bonusStr = abilMod >= 0 ? `+${abilMod}` : `${abilMod}`;
      list.push({
        id: 'improvised',
        name: pt ? 'Ferramentas Improvisadas' : 'Improvised Tools',
        stat: 'DEX',
        bonus: abilMod,
        bonusStr,
        passive: 10 + abilMod,
        isTrained: false,
        formula: `1d20${bonusStr}`,
      });
    }
    return list;
  }, [char, lang, pt]);

  const toolBaselineBonus = toolItems[0]?.bonus || 0;
  const toolBaselineBonusStr = toolBaselineBonus >= 0 ? `+${toolBaselineBonus}` : `${toolBaselineBonus}`;
  const toolBaselinePassive = 10 + toolBaselineBonus;

  return (
    <div className="fh-scope-content fh-scope-skills">
      <section className="fh-panel">
        <FhTitle sub={<span><FhTapToRoll lang={lang} /></span>}>{t('skills', lang)}</FhTitle>

        {/* 4 Categorical Rows / Foldable Cards: Search, Hide, Influence, Study */}
        <div className="fh-skill-categories-grid">
          {actionSkillData.map(grp => {
            const isFolded = !!collapsed[grp.key];
            const trainedSkills = (grp.skills || []).filter(sk => {
              const isTrained = Utils.hasSkillProf(char, sk.id) || Utils.hasExpertise?.(char, sk.id);
              if (!isTrained) return false;
              const isDisclosedOnConsolidatedPanel = (sk.passive === grp.baselinePassive && sk.bonusStr === grp.baselineBonusStr);
              return !isDisclosedOnConsolidatedPanel;
            });
            return (
              <div key={grp.key} className={`fh-skill-group-card card statblock-action-details fh-skills-action-details ${isFolded ? 'is-collapsed' : 'open'}`}>
                <div
                  className="fh-skill-group-header statblock-action-summary"
                  onClick={() => toggleGroup(grp.key)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isFolded}
                  aria-controls={`fh-skill-group-${grp.key}`}
                >
                  <span className="statblock-action-header-left">
                    <span className="fh-skill-group-chevron statblock-action-chevron" aria-hidden="true">{isFolded ? '▸' : '▾'}</span>
                    <span className="fh-skill-group-icon statblock-action-icon" aria-hidden="true">{grp.icon}</span>
                    <span className="fh-skill-group-title statblock-action-title">{grp.groupTitle}</span>
                  </span>

                  <div className="statblock-action-summary-actions">
                    <button
                      type="button"
                      className="statblock-roll-btn statblock-action-header-roll-btn"
                      data-roll-check={`1d20${grp.baselineBonusStr}`}
                      data-roll-label={`${char.name || (pt ? 'Personagem' : 'Character')}: ${grp.groupTitle} (${grp.baselineBonusStr})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSkillRoll(`1d20${grp.baselineBonusStr}`, `${grp.groupTitle} (${grp.baselineBonusStr})`, undefined, e);
                      }}
                      title={pt ? `Rolar ação consolidada ${grp.groupTitle} (1d20${grp.baselineBonusStr})` : `Roll consolidated action ${grp.groupTitle} (1d20${grp.baselineBonusStr})`}
                    >
                      <span className="statblock-action-roll-dice" aria-hidden="true">🎲</span>
                      <span className="statblock-action-roll-score">{grp.baselinePassive}/{grp.baselineBonusStr}</span>
                    </button>
                  </div>
                </div>

                {/* Exposição parcial e identada das perícias treinadas sob o cabeçalho sanfonado */}
                {isFolded && (grp.skills || []).some(sk => Utils.hasSkillProf(char, sk.id) || Utils.hasExpertise?.(char, sk.id)) && (
                  <div className="statblock-action-indented-profs">
                    {(grp.skills || [])
                      .filter(sk => Utils.hasSkillProf(char, sk.id) || Utils.hasExpertise?.(char, sk.id))
                      .map(sk => {
                        const isExpert = Utils.hasExpertise?.(char, sk.id);
                        return (
                          <div key={sk.id} className="statblock-action-skill-row is-trained">
                            <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                              <span className="statblock-action-prof-mark" aria-hidden="true">
                                {isExpert ? '⭐' : '●'}
                              </span>
                              <span className="statblock-action-skill-name" title={`${sk.name} (${sk.abilUpper})`}>
                                {sk.name} <abbr>({sk.abilUpper})</abbr>
                              </span>
                            </div>

                            <div className="statblock-action-skill-controls">
                              <span className="statblock-action-skill-pass" title={pt ? 'Passiva' : 'Passive'}>
                                {sk.passive}
                              </span>
                              <button
                                type="button"
                                className={`statblock-roll-btn statblock-action-skill-btn${sk.defaultAdv ? ' has-adv' : ''}`}
                                data-roll-check={`1d20${sk.bonusStr}`}
                                data-roll-label={`${char.name || (pt ? 'Personagem' : 'Character')}: ${sk.name} (${sk.bonusStr})`}
                                data-roll-adv={sk.defaultAdv}
                                onClick={(e) => handleSkillRoll(`1d20${sk.bonusStr}`, `${sk.name} (${sk.bonusStr})`, sk.defaultAdv, e)}
                                title={pt ? `Toque para rolar ${sk.name} (1d20${sk.bonusStr}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.` : `Tap to roll ${sk.name} (1d20${sk.bonusStr}). Swipe ↑ for Advantage or ↓ for Disadvantage.`}
                              >
                                {sk.bonusStr}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {!isFolded && (
                  <div id={`fh-skill-group-${grp.key}`} className="statblock-action-grid">
                    {grp.skills.map(sk => {
                      const isExpert = Utils.hasExpertise(char, sk.id);
                      const isProf = Utils.hasSkillProf(char, sk.id);
                      const level = isExpert ? 2 : isProf ? 1 : 0;
                      return (
                        <div key={sk.id} className={`statblock-action-skill-row${isProf || isExpert ? ' is-trained' : ''}`}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                            <button
                              type="button"
                              className="fh-skill-cycle-btn no-print"
                              onClick={() => toggleProf(sk.id)}
                              title={profText(level)}
                              aria-label={`${sk.name}: ${profText(level)}`}
                            >
                              {level === 2 ? '⭐' : level === 1 ? '●' : '○'}
                            </button>
                            <span className="statblock-action-skill-name" title={`${sk.name} (${sk.abilUpper})`}>
                              {sk.name} <abbr>({sk.abilUpper})</abbr>
                            </span>
                          </div>

                          <div className="statblock-action-skill-controls">
                            <span className="statblock-action-skill-pass" title={pt ? 'Passiva' : 'Passive'}>
                              {sk.passive}
                            </span>
                            <button
                              type="button"
                              className={`statblock-roll-btn statblock-action-skill-btn${sk.defaultAdv ? ' has-adv' : ''}`}
                              data-roll-check={`1d20${sk.bonusStr}`}
                              data-roll-label={`${char.name || (pt ? 'Personagem' : 'Character')}: ${sk.name} (${sk.bonusStr})`}
                              data-roll-adv={sk.defaultAdv}
                              onClick={(e) => handleSkillRoll(`1d20${sk.bonusStr}`, `${sk.name} (${sk.bonusStr})`, sk.defaultAdv, e)}
                              title={pt ? `Toque para rolar ${sk.name} (1d20${sk.bonusStr}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.` : `Tap to roll ${sk.name} (1d20${sk.bonusStr}). Swipe ↑ for Advantage or ↓ for Disadvantage.`}
                            >
                              {sk.bonusStr}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 5th Action Group: Action: Use Tool (Usar Ferramenta) */}
          <div className={`fh-skill-group-card card statblock-action-details fh-skills-action-details ${collapsed.tools ? 'is-collapsed' : 'open'}`}>
            <div
              className="fh-skill-group-header statblock-action-summary"
              onClick={() => toggleGroup('tools')}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsed.tools}
              aria-controls="fh-skill-group-tools"
            >
              <span className="statblock-action-header-left">
                <span className="fh-skill-group-chevron statblock-action-chevron" aria-hidden="true">{collapsed.tools ? '▸' : '▾'}</span>
                <span className="fh-skill-group-icon statblock-action-icon" aria-hidden="true">🛠️</span>
                <span className="fh-skill-group-title statblock-action-title">{pt ? 'Usar Ferramenta' : 'Use Tool'}</span>
              </span>

              <div className="statblock-action-summary-actions">
                <button
                  type="button"
                  className="statblock-roll-btn statblock-action-header-roll-btn"
                  data-roll-check={`1d20${toolBaselineBonusStr}`}
                  data-roll-label={`${char.name || (pt ? 'Personagem' : 'Character')}: ${pt ? 'Usar Ferramenta' : 'Use Tool'} (${toolBaselineBonusStr})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSkillRoll(`1d20${toolBaselineBonusStr}`, `${pt ? 'Usar Ferramenta' : 'Use Tool'} (${toolBaselineBonusStr})`, undefined, e);
                  }}
                  title={pt ? `Rolar uso de ferramenta (1d20${toolBaselineBonusStr})` : `Roll tool use (1d20${toolBaselineBonusStr})`}
                >
                  <span className="statblock-action-roll-dice" aria-hidden="true">🎲</span>
                  <span className="statblock-action-roll-score">{toolBaselinePassive}/{toolBaselineBonusStr}</span>
                </button>
              </div>
            </div>

            {/* Exposição parcial e identada das ferramentas sob o cabeçalho sanfonado */}
            {collapsed.tools && toolItems.filter(t => t.isTrained).length > 0 && (
              <div className="statblock-action-indented-profs">
                {toolItems.filter(t => t.isTrained).map(tool => (
                  <div key={tool.id} className="statblock-action-skill-row is-trained">
                    <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                      <span className="statblock-action-prof-mark" aria-hidden="true">🛠️</span>
                      <span className="statblock-action-skill-name" title={`${tool.name} (${tool.stat})`}>
                        {tool.name} <abbr>({tool.stat})</abbr>
                      </span>
                    </div>

                    <div className="statblock-action-skill-controls">
                      <span className="statblock-action-skill-pass" title={pt ? 'Passiva' : 'Passive'}>
                        {tool.passive}
                      </span>
                      <button
                        type="button"
                        className="statblock-roll-btn statblock-action-skill-btn"
                        data-roll-check={tool.formula}
                        data-roll-label={`${char.name || (pt ? 'Personagem' : 'Character')}: ${tool.name} (${tool.bonusStr})`}
                        onClick={(e) => handleSkillRoll(tool.formula, `${tool.name} (${tool.bonusStr})`, undefined, e)}
                        title={pt ? `Toque para rolar ${tool.name} (${tool.formula}).` : `Tap to roll ${tool.name} (${tool.formula}).`}
                      >
                        {tool.bonusStr}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!collapsed.tools && (
              <div id="fh-skill-group-tools" className="statblock-action-grid">
                {toolItems.map(tool => (
                  <div key={tool.id} className="statblock-action-skill-row is-trained">
                    <span className="statblock-action-skill-name" title={`${tool.name} (${tool.stat})`}>
                      🛠️ {tool.name} <abbr>({tool.stat})</abbr>
                    </span>
                    <div className="statblock-action-skill-controls">
                      <span className="statblock-action-skill-pass" title={pt ? 'Passiva' : 'Passive'}>
                        {tool.passive}
                      </span>
                      <button
                        type="button"
                        className="statblock-roll-btn statblock-action-skill-btn"
                        data-roll-check={tool.formula}
                        data-roll-label={`${char.name || (pt ? 'Personagem' : 'Character')}: ${tool.name} (${tool.bonusStr})`}
                        onClick={(e) => handleSkillRoll(tool.formula, `${tool.name} (${tool.bonusStr})`, undefined, e)}
                        title={pt ? `Toque para rolar ${tool.name} (${tool.formula}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.` : `Tap to roll ${tool.name} (${tool.formula}). Swipe ↑ for Advantage or ↓ for Disadvantage.`}
                      >
                        {tool.bonusStr}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <FhProfLegend lang={lang} expert />
        {placed?.by?.skills && <FhFeatures items={placed.by.skills} multi={placed.multi} lang={lang} place="skills" />}
      </section>
    </div>
  );
};

export const SheetTools = ({ char, lang, update, placed }) => {
  const pt = lang === 'pt';
  const toolSummaries = [
    ...trainingLines(char, lang),
    ...(char.otherProfs ? [{ key: 'other', label: pt ? 'Outras proficiências' : 'Other proficiencies', text: char.otherProfs }] : []),
  ];

  return (
    <div className="fh-scope-content fh-scope-tools">
      <section className="fh-panel">
        <FhTitle>{pt ? 'Idiomas e Proficiências de Ferramentas' : 'Languages & Tool Proficiencies'}</FhTitle>
        <LanguagesField char={char} lang={lang} update={update} />
        {toolSummaries.map(tl => (
          <div key={tl.key} className="text-sm" style={{ marginBottom: 6 }}>
            <strong style={{ color: 'var(--gold-deep)' }}>{tl.label}:</strong> {tl.text}
          </div>
        ))}
        {placed?.by?.proficiencies && (
          <FhFeatures items={placed.by.proficiencies} multi={placed.multi} lang={lang} place="proficiencies" className="fh-cf-profs" />
        )}
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>{pt ? 'Outras proficiências' : 'Other proficiencies'}</label>
          <textarea
            aria-label={pt ? 'Outras proficiências' : 'Other proficiencies'}
            value={char.otherProfs || ''}
            onChange={e => update({ otherProfs: e.target.value })}
            placeholder={pt ? 'Ferramentas, armas adicionais, perícias manuais...' : 'Tools, extra weapons, custom proficiencies...'}
            rows={3}
          />
        </div>
      </section>
    </div>
  );
};

export const SheetFeatures = ({ char, lang, placed, cls, race, update }) => {
  const pt = lang === 'pt';
  const classItems = (placed?.items || []).filter(it => it.classId || it.level != null);
  const fallbackSrd = !classItems.length && char.rulesVersion !== '2024' ? (cls?.features || []) : [];

  return (
    <div className="fh-scope-content fh-scope-features">
      {/* Class and Subclass Features */}
      <section className="fh-panel">
        <FhTitle>{pt ? 'Características de Classe & Subclasse' : 'Class & Subclass Features'}</FhTitle>
        {classItems.length > 0 ? (
          <FhFeatures items={classItems} multi={placed?.multi} lang={lang} />
        ) : fallbackSrd.length > 0 ? (
          <FhFeatures items={[]} lang={lang}>
            {fallbackSrd.map((f, i) => (
              <FhFeatureItem key={`srd-${i}`} item={{ name: f.name, desc: f.desc }} lang={lang} tag={pt ? 'Nv. 1' : 'Lv 1'} />
            ))}
          </FhFeatures>
        ) : (
          <div className="text-sm muted" style={{ padding: '8px 0' }}>
            {pt ? 'Nenhuma característica de classe ativa.' : 'No active class features.'}
          </div>
        )}
      </section>

      {/* Other features (Background features, etc.) */}
      {placed && <OtherFeatures char={char} lang={lang} placed={placed} cls={cls} />}

      {/* Feats / Talentos */}
      {(char.feats || []).length > 0 && (
        <section className="fh-panel">
          <FhTitle>{pt ? 'Talentos' : 'Feats'}</FhTitle>
          <div>
            {char.feats.map((f, i) => (
              <div key={i} className="text-sm" style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--gold-deep)' }}>{featName(char, f, lang)}</strong>
                <span className="muted"> · {f.origin === 'background' ? (pt ? 'Antecedente' : 'Background') : f.origin === 'species' ? (pt ? 'Espécie' : 'Species') : `${pt ? 'Nv.' : 'Lv'} ${f.level}`}</span>
                {f.asi && <span className="muted"> · {Object.entries(f.asi).map(([k, v]) => `${t(k + 'Sh', lang)} +${v}`).join(', ')}</span>}
                {featSummary(f, lang) && <div className="text-xs" style={{ color: 'var(--ink-secondary)', marginTop: 2 }}><DiceText text={featSummary(f, lang)} lang={lang} /></div>}
                {f.picks && <div className="text-xs muted">{featPicksText(f.picks, lang)}</div>}
                {f.note && <span style={{ color: 'var(--ink-secondary)' }}> — <DiceText text={f.note} lang={lang} /></span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Idiomas e Proficiências de Ferramentas: escopo correto na aba Características */}
      <SheetTools char={char} lang={lang} update={update} placed={placed} />

      {/* Species Traits: officially on Features tab with full interactive choices and traits */}
      {race && <SpeciesTraits char={char} lang={lang} update={update} race={race} />}
    </div>
  );
};

export const SheetStats = SheetAbilities;

export default Sheet;
