/* Character sheet view — play/stats/spells/inventory/story/journal tabs */
import { errorMessage } from '../src/api/errors.js';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { subclassesFor } from '../src/progression/subclasses.js';
import { subclassLock, guardSealedPatch, sealHint } from '../src/progression/subclass-lock.js';
import { featSummary } from '../src/progression/FeatPicker.jsx';
import ResourcesCard from '../src/progression/ResourcesCard.jsx';
import { computeResources } from '../src/progression/resources.js';
import { SpeciesChoicesModal } from '../src/progression/SpeciesChoices.jsx';
import { t, tName } from '../data/i18n.js';
import LanguagePicker, { chosenLanguages } from './LanguagePicker.jsx';
import Icon from './Icons.jsx';
import ScrollTabs from './ScrollTabs.jsx';
import { Filigree, Modal, NumStepper, Pips, AvatarUpload } from './Shared.jsx';
import { SheetSpells, SheetInventory, SheetStory, SheetNotes, RestButtons } from './SheetTabs.jsx';
import { api, ApiError } from '../src/api/client.js';
import CombatActionPanel from '../src/campaigns/CombatActionPanel.jsx';
import PlayerChecksBanner from '../src/checks/PlayerChecksBanner.jsx';
import * as FS from '../src/progression/fighting-styles.js';
import GrimoireHint from '../src/grimoire/GrimoireHint.jsx';
import { isArmorProficient } from '../src/creator/start-data.js';
import { trainingLines, featName, featPicksText, backgroundFeature } from '../src/sheet/sheet-text.js';
import { placeFeatures, featureKey } from '../src/sheet/feature-placement.js';
import FhFeatures, { FhFeatureItem } from '../src/sheet/FhFeatures.jsx';
import { itemArt, conditionIcon, CONDITION_EMOJI, classArt, speciesArt } from '../src/art.js';
import ArtThumb, { ArtIcon } from '../src/components/ArtThumb.jsx';
import FhTitle from '../src/sheet/FhTitle.jsx';
import FhAttackRow from '../src/sheet/FhAttack.jsx';
import FhMedal, { FhMedalDefs } from '../src/sheet/FhMedal.jsx';
import { FhHex, FhSkillRow, FhProfLegend, FhTapToRoll } from '../src/sheet/FhChecks.jsx';
import { hpState, hpStateLabel, useHpFeedback } from '../src/sheet/hp-feedback.js';
import { slotCircleLabel, gemLabel, lockedSlotTitle, slotSpent, slotTap, slotTapTitle } from '../src/sheet/gem-text.js';
import { condClasses, FhConditionFx, FhConditionArt } from '../src/sheet/FhConditions.jsx';
import { useLevelCeremony, FhLevelCeremony, useGemRelight } from '../src/sheet/FhCeremonies.jsx';
import { PLAY_H, splitColumns } from '../src/sheet/play-layout.js';
import FhExportModal from '../src/sheet/FhExport.jsx';
import SheetRollTarget from '../src/sheet/SheetRollTarget.jsx';
import { clearSheetRolls, maybeRecheck, setSheetAllowed, setSheetRecheck, setSheetRolls } from '../src/dice/sheet-roll.js';
import '../src/sheet/ficha.css';

// Modal "Campanha" (atrelar, desatrelar, trocar): só carrega quando abre.
const CampaignLinkModal = lazy(() => import('../src/sheet/CampaignLinkModal.jsx'));

// onCampaignChange(msg): a ficha entrou/saiu/trocou de campanha (modal "Campanha") —
// o app recarrega a lista (char.inCampaign) e mostra `msg`. onLogin: ficha do aparelho,
// leva à entrada na conta (sem ele, o servidor está fora e a dica não aparece).
const Sheet = ({ lang, char, onUpdate, onEdit, onPrint, onExportPdf, onShare, onExport, onDelete, onBack, onLevelUp, onCampaignChange, onLogin, children }) => {
  const [tab, setTab] = useState('play');
  const [hpDelta, setHpDelta] = useState(0);
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
  const campaignChanged = async (msg) => {
    setCampOpen(false);
    setCampRev(n => n + 1);
    await onCampaignChange?.(msg);
  };
  // Cerimônias (só visual, src/sheet/FhCeremonies.jsx): o selo quando o nível sobe e as
  // gemas que reacendem (descanso, trapaça, mestre).
  const rootRef = useRef(null);
  const [levelCer, closeLevelCer] = useLevelCeremony(char);
  useGemRelight(rootRef);

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
    <div ref={rootRef} className={['ficha', ...condClasses(char)].join(' ')}>
      <FhConditionFx conditions={char.conditions} />
      {levelCer && <FhLevelCeremony key={levelCer.key} cer={levelCer} char={char} lang={lang} onClose={closeLevelCer} />}
      <SheetHero
        char={char}
        lang={lang}
        onAvatar={(av) => update({ avatar: av })}
        onBack={onBack}
        onLevelUp={onLevelUp}
        onInspiration={() => update({ inspiration: !char.inspiration })}
        cls={cls} race={race} bg={bg}
      />

      {/* Pedido de teste do mestre: logo abaixo do topo, para ser visto sem rolar */}
      {char.inCampaign && typeof char.id === 'number' && (
        <PlayerChecksBanner char={char} lang={lang} />
      )}

      <SubclassBanner char={char} lang={lang} update={update} />
      <SpeciesBanner char={char} lang={lang} update={update} />
      <CampaignModeBanner char={char} lang={lang} onChange={onUpdate} rev={campRev}
        onManage={typeof char.id === 'number' ? () => setCampOpen(true) : null} onLogin={onLogin} />
      {campOpen && (
        <Suspense fallback={null}>
          <CampaignLinkModal char={char} lang={lang} onClose={() => setCampOpen(false)} onDone={campaignChanged} />
        </Suspense>
      )}

      {char.wildShape?.active && (
        <WildShapeBanner char={char} lang={lang} onChange={onUpdate} />
      )}

      {char.inCampaign && (
        <CombatActionPanel key={campRev} char={char} lang={lang} onUpdate={onUpdate} />
      )}

      {/* Barra de ações (src/sheet/ficha.css: .fh-actions): Exportar, Editar e Modo trapaça;
          o travado e a trapaça ligada viraram classes (antes, estilo inline). Imprimir, os
          dois PDFs, Compartilhar e o JSON eram botões soltos aqui: agora são as linhas do
          modal Exportar (src/sheet/FhExport.jsx), com os mesmos handlers. */}
      <div className="action-bar fh-actions no-print">
        <button ref={exportBtnRef} type="button" className="chip fh-export-chip" aria-haspopup="dialog" onClick={() => setExportOpen(true)}>
          <Icon name="download" size={14} className="chip-icon"/> {t('export', lang)}
        </button>
        {!char.inCampaign && (
          <button className="chip" onClick={onEdit}><Icon name="edit" size={14} className="chip-icon"/> {t('edit', lang)}</button>
        )}
        {char.inCampaign && (
          <span className="chip is-locked" title={lang === 'pt' ? 'Em campanha: peça ao mestre pra usar o "Editar ficha (modo mestre)"' : 'In campaign: ask DM to use "Edit sheet (DM mode)"'}>
            🔒 <Icon name="edit" size={14} className="chip-icon"/> {t('edit', lang)}
          </span>
        )}
        <button className={`chip${char.cheatMode ? ' is-cheat' : ''}`} onClick={() => setCheatOpen(true)}>
          🎲 {lang === 'pt' ? (char.cheatMode ? 'Trapaça ativa' : 'Modo trapaça') : (char.cheatMode ? 'Cheat on' : 'Cheat mode')}
        </button>
        {/* Inspiração: virou a estrela do topo (SheetHero), com o mesmo handler */}
      </div>

      {cheatOpen && <CheatModeModal char={char} lang={lang} update={update} onClose={() => setCheatOpen(false)} />}
      {exportOpen && (
        <FhExportModal char={char} lang={lang} handlers={{ onPrint, onExportPdf, onShare, onExport }} onClose={closeExport} />
      )}

      <ScrollTabs className="no-print" activeKey={tab} lang={lang} role="tablist" aria-label={lang === 'pt' ? 'Seções da ficha' : 'Sheet sections'}>
        {[
          { id: 'play',   label: t('tabPlay', lang) },
          { id: 'stats',  label: t('tabStats', lang) },
          { id: 'spells', label: t('tabSpells', lang) },
          { id: 'inv',    label: t('tabInv', lang) },
          { id: 'story',  label: t('tabStory', lang) },
          { id: 'notes',  label: t('tabNotes', lang) },
          { id: 'npcs',   label: lang === 'pt' ? 'NPCs' : 'NPCs' },
        ].map(tb => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} className={`tab ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.label}
          </button>
        ))}
      </ScrollTabs>

      {/* Conteúdo da aba. No desktop (1024px ou mais, ficha.css: F14) a ficha usa a largura
          toda: a aba Jogar em duas colunas; as demais numa coluna de leitura centrada. */}
      <div className={`fh-tab-body${tab === 'play' ? ' is-play' : ''}`}>
        {tab === 'play' && (
          <SheetPlay
            char={char} lang={lang} update={update} applyHp={applyHp}
            ac={ac} speed={speed} profB={profB} initBonus={initBonus}
            passPerc={passPerc} slots={slots} roll={roll} placed={placed}
          />
        )}

        {tab === 'stats' && (
          <SheetStats
            char={char} lang={lang} update={update}
            profB={profB} passPerc={passPerc} roll={roll} placed={placed} cls={cls}
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

      {/* Conteúdo extra da ficha (ex.: painel de Progressão) antes da zona de perigo */}
      <div className="fh-after">{children}</div>

      <div className="fh-danger-zone no-print">
        <button className="btn btn-ghost btn-danger btn-sm" onClick={onDelete}>
          <Icon name="trash" size={14}/> {t('delete', lang)}
        </button>
      </div>
    </div>
  );
};

// ===== Sub-components =====

// Topo da ficha (visual "Ficha Forjada", src/sheet/ficha.css: .fh-hero).
// - Retrato grande: só decoração (aria-hidden). Mesma regra do retrato do criador
//   (portraitOf, src/creator/journey-ui.jsx): a foto do jogador; sem foto, a arte da
//   espécie; senão, a da classe. Atrás dele fica a inicial em monograma, que aparece
//   quando não há arte ou a imagem não carrega.
// - O controle da foto continua sendo o círculo do AvatarUpload (enviar, ver, trocar,
//   remover), num canto do retrato.
// - Máscara e animações só em elementos-folha (<img>, anel do selo, estrela): o
//   AvatarUpload abre um Modal, que não é portal.
const hideBrokenImg = (e) => { e.currentTarget.style.display = 'none'; };

const SheetHero = ({ char, lang, onAvatar, onBack, onLevelUp, onInspiration, cls, race, bg }) => {
  const pt = lang === 'pt';
  const letter = (char.name || '?').charAt(0).toUpperCase();
  const portrait = char.avatar || speciesArt(char.race) || classArt(char.className);
  return (
    <>
      <button className="btn btn-ghost btn-sm no-print" onClick={onBack} style={{ marginBottom: 12 }}>
        <Icon name="arrow-back" size={14}/> {t('yourHeroes', lang)}
      </button>
      <div className="sheet-hero fh-hero">
        <div className="fh-hero-art" aria-hidden="true">
          <span className="fh-hero-mono">{letter}</span>
          {portrait && <img key={portrait} src={portrait} alt="" onError={hideBrokenImg} />}
          <FhConditionArt conditions={char.conditions} down={char.currentHp === 0} />
        </div>
        <div className="fh-hero-body">
          <LevelUpButton char={char} lang={lang} onLevelUp={onLevelUp} />
          <div className={char.name ? 'hero-name' : 'hero-name is-unnamed'}>
            {char.name ? <span className="fh-foil">{char.name}</span> : (pt ? 'Sem nome' : 'Unnamed')}
          </div>
          <div className="hero-sub">
            {race ? <b>{tName('race', race.id, lang)}</b> : '—'}
            {cls ? ` · ${Utils.classLabel(char, lang, tName)}` : ''}
            {bg ? ` · ${tName('background', bg.id, lang)}` : ''}
          </div>
          <div className="hero-tags">
            {char.alignment && <span className="tag">{tName('alignment', char.alignment, lang)}</span>}
            {char.player && <span className="tag">{char.player}</span>}
            {Utils.levelingMode(char) === 'xp' && <span className="tag">{char.xp || 0} XP</span>}
            {Utils.levelingMode(char) === 'milestone' && <span className="tag" title={pt ? 'Sobe de nível por marcos da história (sem XP)' : 'Levels up at story milestones (no XP)'}>{pt ? 'Marcos' : 'Milestones'}</span>}
            {char.cheatMode && <span className="tag fh-tag-cheat">🎲 {pt ? 'Trapaça' : 'Cheat'}</span>}
          </div>
        </div>
        {/* Estrela e foto vêm depois do corpo: pintam (e recebem o toque) por cima dele,
            sem z-index. Ficam no lado direito do retrato. */}
        <button type="button" className="fh-insp no-print" aria-pressed={!!char.inspiration} onClick={onInspiration}>
          <span className="fh-insp-gem"><Icon name={char.inspiration ? 'star-fill' : 'star'} size={22}/></span>
          <span className="fh-insp-label">{t('inspiration', lang)}</span>
        </button>
        <div className="fh-hero-photo">
          <AvatarUpload value={char.avatar} onChange={onAvatar} lang={lang} size={52} letter={letter} />
          <span className="fh-hero-photo-badge" aria-hidden="true"><Icon name="image" size={11}/></span>
        </div>
      </div>
    </>
  );
};

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
const CampaignModeBanner = ({ char, lang, onChange, onManage, onLogin, rev = 0 }) => {
  const [campInfo, setCampInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  // V15: com as rolagens das fichas desligadas pelo mestre a ficha não manda nada;
  // esta busca de novo (no máximo a cada 30 s, só enquanto desligada) quando a ficha
  // volta à vista ou o jogador rola, para valer de novo assim que ele religar.
  const [recheck, setRecheck] = useState(0);
  const pt = lang === 'pt';
  const inTable = !!char.inCampaign && typeof char.id === 'number';

  useEffect(() => {
    if (!inTable) { setCampInfo(null); return; }
    let cancelled = false;
    api.characterCampaigns(char.id).then(r => {
      if (cancelled) return;
      const c = (r.campaigns || [])[0];
      setCampInfo(c || null);
      if (c && typeof c.sheetRolls === 'boolean') setSheetAllowed(char.id, c.sheetRolls);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [char.id, inTable, rev, recheck]);

  useEffect(() => {
    if (!inTable) return undefined;
    setSheetRecheck(() => setRecheck(n => n + 1));
    const onVis = () => { if (!document.hidden) maybeRecheck(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { setSheetRecheck(null); document.removeEventListener('visibilitychange', onVis); };
  }, [inTable, char.id]);

  const leave = async () => {
    if (!campInfo) return;
    if (!confirm(lang === 'pt'
      ? `Sair da campanha "${campInfo.name}"? Você volta a ter controle total da ficha.`
      : `Leave campaign "${campInfo.name}"? You'll regain full sheet control.`)) return;
    setBusy(true);
    try {
      await api.removeMember(campInfo.id, campInfo.membershipId);
      // Forçar reload da ficha pra atualizar inCampaign
      onChange({ ...char, inCampaign: false });
    } catch (e) {
      alert(errorMessage(e));
    } finally { setBusy(false); }
  };

  if (!char.inCampaign) {
    const local = typeof char.id !== 'number';
    return (
      <div className="campaign-mode-inline fh-camp-inline no-print">
        <span className="fh-camp-inline-text">
          📜 <strong>{pt ? 'Ficha pessoal' : 'Personal sheet'}</strong>
          <span className="muted"> · {pt ? 'fora de campanha; nível e atributos sobem pela Progressão' : 'not in a campaign; level and abilities change through Progression'}</span>
          {local && onLogin && (
            <span className="muted fh-camp-inline-hint"> {pt
              ? 'Para jogar numa campanha, entre na sua conta: as fichas deste aparelho vão junto.'
              : 'To play in a campaign, log in to your account: the sheets on this device come along.'}</span>
          )}
        </span>
        {onManage && (
          <button type="button" className="btn btn-ghost btn-sm fh-camp-link" onClick={onManage}>
            🏰 {pt ? 'Atrelar a uma campanha' : 'Link to a campaign'}
          </button>
        )}
        {local && onLogin && (
          <button type="button" className="btn btn-ghost btn-sm fh-camp-link" onClick={onLogin}>
            {pt ? 'Entrar na conta' : 'Log in'}
          </button>
        )}
      </div>
    );
  }

  // Faixa da campanha (src/sheet/ficha.css: .fh-camp): [🏰] rótulo + nome / travas [Sair]
  return (
    <div className="campaign-mode-banner in-campaign fh-camp">
      <span className="cmb-icon" aria-hidden="true">🏰</span>
      <div className="fh-camp-text">
        <span className="cmb-label">{lang === 'pt' ? 'Em campanha' : 'In campaign'}</span>
        {campInfo && <strong className="cmb-name">{campInfo.name}</strong>}
        <span className="muted small fh-camp-note">
          {lang === 'pt'
            ? 'Itens, slots, HP máximo e atributos são gerenciados pelo mestre.'
            : 'Items, slots, max HP and abilities are managed by the DM.'}
        </span>
      </div>
      {(onManage || campInfo) && (
        <div className="fh-camp-actions">
          {onManage && (
            <button className="btn btn-ghost btn-sm" onClick={onManage}
              title={pt ? 'Desatrelar a ficha ou trocar de campanha' : 'Unlink the sheet or move it to another campaign'}>
              {pt ? 'Campanha' : 'Campaign'}
            </button>
          )}
          {campInfo && (
            <button className="btn btn-ghost btn-sm" onClick={leave} disabled={busy}
              title={pt ? 'Sair da campanha (a ficha continua com você)' : 'Leave the campaign (the sheet stays with you)'}>
              {busy ? '…' : (pt ? 'Sair' : 'Leave')}
            </button>
          )}
        </div>
      )}
      {/* 📺 Na Tela · 🔒 Só eu das rolagens desta ficha (V15); só ficha da conta */}
      {typeof char.id === 'number' && campInfo?.status !== 'closed' && <SheetRollTarget lang={lang} />}
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
  const unarmed = FS.unarmedStrike(char, styles);
  const styleSummaries = FS.styleSummaries(char, styles);
  const blindsightFt = FS.blindsight(char, styles);
  const reactions = FS.styleReactions(char, styles);
  const [delta, setDelta] = useState('');
  const apply = (sign) => {
    const n = +delta || 0;
    if (!n) return;
    applyHp(n * sign);
    setDelta('');
  };

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
                <span className="hp-sep">/</span>
                <span className="hp-max">{char.maxHp}</span>
              </span>
              {char.tempHp > 0 && <span className="fh-hp-temp-badge" title={t('tempHp', lang)}>+{char.tempHp}</span>}
              {hpFx && (
                <span key={hpFx.id} className={`fh-float ${fxKind}`} aria-hidden="true">
                  {hpFx.delta < 0 ? '−' : '+'}{Math.abs(hpFx.delta)}
                </span>
              )}
            </div>
            <div className="fh-hp-state">{hpStateLabel(state, lang)}</div>
          </div>
          {/* barra-fantasma: anda atrás do preenchimento, com atraso, e mostra o quanto caiu */}
          <div className="hp-bar" aria-hidden="true">
            <div className="fh-hp-ghost" style={{ width: `${hpPct}%` }} />
            <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="hp-actions">
            <button className="btn btn-sm btn-hurt" onClick={() => apply(-1)} disabled={!delta}>
              <Icon name="sword" size={18}/> {t('damage', lang)}
            </button>
            <input
              className="hp-input"
              type="number"
              inputMode="numeric"
              min="0"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              placeholder="0"
              aria-label={pt ? 'Quantidade de dano ou cura' : 'Damage or healing amount'}
            />
            <button className="btn btn-sm btn-heal" onClick={() => apply(1)} disabled={!delta}>
              <Icon name="heart" size={18}/> {t('heal', lang)}
            </button>
          </div>
          <div className="hp-temp fh-hp-temp">
            <span className="fh-hp-temp-label">{t('tempHp', lang)}<GrimoireHint id="pv-temporarios" lang={lang} /></span>
            <input
              type="number" min="0"
              inputMode="numeric"
              value={char.tempHp || 0}
              onChange={e => update({ tempHp: Math.max(0, +e.target.value || 0) })}
              aria-label={t('tempHp', lang)}
            />
          </div>
  
          {/* Death saves */}
          {char.currentHp === 0 && (
            <div className="fh-death">
              <div className="fh-death-title">{t('deathSaves', lang)}<GrimoireHint id="testes-contra-a-morte" lang={lang} /></div>
              <div className="fh-death-rows">
                <div className="fh-death-group is-success">
                  <span className="fh-death-label">{t('successes', lang)}:</span>
                  <div className="death-pips">
                    {[0,1,2].map(i => (
                      <button key={i} type="button" className={`death-pip ${i < char.deathSaves.success ? 'success' : ''}`}
                        aria-pressed={i < char.deathSaves.success} aria-label={`${t('successes', lang)}: ${i + 1}`}
                        onClick={() => update({ deathSaves: { ...char.deathSaves, success: i < char.deathSaves.success ? i : i + 1 } })}/>
                    ))}
                  </div>
                </div>
                <div className="fh-death-group is-fail">
                  <span className="fh-death-label">{t('failures', lang)}:</span>
                  <div className="death-pips">
                    {[0,1,2].map(i => (
                      <button key={i} type="button" className={`death-pip ${i < char.deathSaves.fail ? 'fail' : ''}`}
                        aria-pressed={i < char.deathSaves.fail} aria-label={`${t('failures', lang)}: ${i + 1}`}
                        onClick={() => update({ deathSaves: { ...char.deathSaves, fail: i < char.deathSaves.fail ? i : i + 1 } })}/>
                    ))}
                  </div>
                </div>
              </div>
              <button className="btn btn-sm btn-ghost fh-death-roll"
                onClick={() => roll({ die: 20, label: t('death', lang) })}>
                <Icon name="dice" size={14}/> {lang === 'pt' ? 'Rolar teste contra morte' : 'Roll death save'}
              </button>
            </div>
          )}
  
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
              label={t('speed', lang)} />
            <FhMedal shape="diamond" value={Utils.fmtMod(profB)} label={lang === 'pt' ? 'Prof.' : 'Prof.'} />
            <FhMedal shape="diamond" value={passPerc} label={lang === 'pt' ? 'Perc.' : 'Perc.'}
              hint={<GrimoireHint id="valor-passivo" lang={lang} />} sub={lang === 'pt' ? 'passiva' : 'passive'} />
            <FhMedal shape="circle" value={Math.max(0, char.level - (char.hitDiceUsed || 0))} label={t('hitDice', lang)}
              hint={<GrimoireHint id="dados-de-vida" lang={lang} />} sub={`/${Utils.hitDiceLabel(char)}`} />
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
    { h: PLAY_H.rest, el: (
        /* Descanso: mesma lógica (e endpoint) da aba de magias */
        <section key="rest" className="fh-panel">
          <FhTitle hint={<GrimoireHint id="descanso-curto" lang={lang} />}>{lang === 'pt' ? 'Descanso' : 'Rest'}</FhTitle>
          <RestButtons char={char} lang={lang} update={update} />
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

// Outros traços: traços de classe sem seção própria na ficha, escolhas de classe sem o traço
// que as concede (src/sheet/feature-placement.js; as de ferramenta e instrumento ficam no
// painel de proficiências) e a característica do antecedente (2014).
// Antes era a lista "Características de Classe" da aba Inventário, com todos os traços.
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

const SheetStats = ({ char, lang, update, profB, passPerc, roll, placed, cls }) => {
  const pt = lang === 'pt';
  const profText = (level) => level === 2 ? (pt ? 'Especialista' : 'Expertise') : level ? (pt ? 'Treinado' : 'Proficient') : (pt ? 'Sem treino' : 'Not proficient');
  return (
    <>
      <section className="fh-panel">
      <FhTitle sub={<span><FhTapToRoll lang={lang} /></span>}>{pt ? 'Atributos' : 'Abilities'}</FhTitle>
      <AbilitySeals char={char} lang={lang} roll={roll} rollLabel={k => t(k, lang)} />
      </section>

      <section className="fh-panel">
      <FhTitle sub={<span><FhTapToRoll lang={lang} /></span>}>{lang === 'pt' ? 'Testes de Resistência' : 'Saving Throws'}</FhTitle>
      {/* Em 2 colunas no desktop (3 + 3), na ordem do DOM: --fh-rows = metade das linhas.
          data-fab-pass: o botão de dados fica no canto sobre a lista, sem saltar (DiceRoller) */}
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
              onRoll={() => roll({ die: 20, mod: bonus, label: t(k, lang) + ' ' + t('saveRoll', lang) })} />
          );
        })}
      </div>
      <FhProfLegend lang={lang} />
      </section>

      <section className="fh-panel">
      <FhTitle sub={<>
        <span>{t('passivePerception', lang)} <span className="fh-sub-hi">{passPerc}</span></span>
        <span aria-hidden="true">·</span>
        <span><FhTapToRoll lang={lang} /></span>
      </>}>{t('skills', lang)}</FhTitle>
      <div className="fh-skills" data-fab-pass="" style={{ '--fh-rows': Math.ceil(SRD.SKILLS.length / 2) }}>
        {SRD.SKILLS.map(s => {
          const bonus = Utils.skillBonus(char, s.id);
          const isProf = Utils.hasSkillProf(char, s.id);
          const isExpert = Utils.hasExpertise(char, s.id);
          const level = isExpert ? 2 : isProf ? 1 : 0;
          return (
            <FhSkillRow key={s.id} name={tName('skill', s.id, lang)} abbr={t(s.stat + 'Sh', lang)} bonus={Utils.fmtMod(bonus)}
              level={level}
              profTitle={profText(level)}
              profLabel={`${tName('skill', s.id, lang)}: ${profText(level)}`}
              onToggle={() => {
                // ciclo: sem treino → treinado → especialista → sem treino
                if (isExpert) {
                  update({ skillExpertise: (char.skillExpertise || []).filter(x => x !== s.id), skillProfs: (char.skillProfs || []).filter(x => x !== s.id) });
                } else if (isProf) {
                  update({ skillExpertise: [...(char.skillExpertise || []), s.id] });
                } else {
                  update({ skillProfs: [...(char.skillProfs || []), s.id] });
                }
              }}
              onRoll={() => roll({ die: 20, mod: bonus, label: tName('skill', s.id, lang) })} />
          );
        })}
      </div>
      <FhProfLegend lang={lang} expert />
      <FhFeatures items={placed.by.skills} multi={placed.multi} lang={lang} place="skills" />
      </section>

      <OtherFeatures char={char} lang={lang} placed={placed} cls={cls} />

      {(char.feats || []).length > 0 && (
        <section className="fh-panel">
          <FhTitle>{lang === 'pt' ? 'Talentos' : 'Feats'}</FhTitle>
          <div>
            {char.feats.map((f, i) => (
              <div key={i} className="text-sm" style={{ marginBottom: 4 }}>
                <strong style={{ color: 'var(--gold-deep)' }}>{featName(char, f, lang)}</strong>
                <span className="muted"> · {f.origin === 'background' ? (lang === 'pt' ? 'Antecedente' : 'Background') : f.origin === 'species' ? (lang === 'pt' ? 'Espécie' : 'Species') : `${lang === 'pt' ? 'Nv.' : 'Lv'} ${f.level}`}</span>
                {f.asi && <span className="muted"> · {Object.entries(f.asi).map(([k, v]) => `${t(k + 'Sh', lang)} +${v}`).join(', ')}</span>}
                {featSummary(f, lang) && <div className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{featSummary(f, lang)}</div>}
                {f.picks && <div className="text-xs muted">{featPicksText(f.picks, lang)}</div>}
                {f.note && <span style={{ color: 'var(--ink-secondary)' }}> — {f.note}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="fh-panel">
      <FhTitle>{lang === 'pt' ? 'Idiomas e Outras Proficiências' : 'Languages & Other Proficiencies'}</FhTitle>
      <LanguagesField char={char} lang={lang} update={update} />
      {trainingLines(char, lang).map(tl => (
        <div key={tl.key} className="text-sm" style={{ marginBottom: 6 }}>
          <strong style={{ color: 'var(--gold-deep)' }}>{tl.label}:</strong> {tl.text}
        </div>
      ))}
      <FhFeatures items={placed.by.proficiencies} multi={placed.multi} lang={lang} place="proficiencies" className="fh-cf-profs" />
      <div>
        <label>{lang === 'pt' ? 'Outras proficiências' : 'Other proficiencies'}</label>
        <textarea aria-label={lang === 'pt' ? 'Outras proficiências' : 'Other proficiencies'}
          value={char.otherProfs || ''}
          onChange={e => update({ otherProfs: e.target.value })}
          placeholder={lang === 'pt' ? 'Ferramentas, armas adicionais...' : 'Tools, extra weapons...'}
        />
      </div>
      </section>
    </>
  );
};

export default Sheet;
