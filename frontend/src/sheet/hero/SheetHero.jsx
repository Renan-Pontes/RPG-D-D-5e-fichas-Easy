import { useEffect, useMemo, useRef, useState } from 'react';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { AvatarUpload, FramedImg } from '../../../components/Shared.jsx';
import { RestButtons } from '../spells/RestButtons.jsx';
import { speciesChoiceSpecs, speciesGrants } from '../../progression/species.js';
import { speciesSummary } from '../../progression/species-summary.js';
import { SpeciesChoicesModal } from '../../progression/SpeciesChoices.jsx';
import { featChoiceSpecs } from '../../progression/feat-rules.js';
import { backgroundList, findBackground } from '../../creator/background-helpers.js';
import { guardSealedPatch, subclassLock, sealHint } from '../../progression/subclass-lock.js';
import { subclassesFor } from '../../progression/subclasses.js';
import { applyAutosToCharacter } from '../../progression/engine.js';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import { api } from '../../api/client.js';
import { classArt, speciesArt } from '../../art.js';
import { FhConditionArt, FhInspBurst, useGainMoment } from '../FhConditions.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import SheetRollTarget from '../SheetRollTarget.jsx';
import { statusList, statusLabel } from '../condition-rules.js';
import { canLevelUp, stop, SUBCLASS_LABEL, SUBCLASS_LEVEL } from '../sheet-shared.jsx';
import { SubclassModal } from '../tabs/SheetCompanionsAndNotes.jsx';
import HpDeltaPopover from '../HpDeltaPopover.jsx';

export const HeroChoicesFold = ({ char, lang, update, onLevelUp }) => {
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
  if (!entries.length) return null;
  const pending = rows.some(r => !r.name) || speciesPending > 0;
  // Classes da ficha, uma vez só: "Bruxo 9 (O Corruptor) · Feiticeiro 3" — o nível e a classe
  // primeiro; a subclasse entre parênteses quando escolhida (substitui a linha de classes do topo).
  const label = entries.map(e => {
    const r = rows.find(x => x.e === e);
    const sub = r?.name || null;
    return `${tName('class', e.id, lang)} ${e.level}${sub ? ` (${sub})` : ''}`;
  }).join(' · ');
  const hasBody = !!update && (rows.length > 0 || speciesPending > 0);
  const can = !!onLevelUp && canLevelUp(char);
  const head = (
    <>
        <LevelUpButton char={char} lang={lang} onLevelUp={onLevelUp} />
        <span className="fh-hero-classchips">
          {entries.map(e => {
            const r = rows.find(x => x.e === e);
            const cname = tName('class', e.id, lang);
            return (
              <span key={e.id} className="fh-hero-classchip">
                {entries.length > 1 && <button type="button" className={`fh-hero-classlv${can ? ' can' : ''}`} disabled={!can}
                  onClick={stop(() => onLevelUp(e.id))}
                  title={can ? (pt ? `Subir um nível de ${cname}` : `Level up ${cname}`) : (pt ? 'Ainda não dá para subir' : 'Cannot level up yet')}
                  aria-label={pt ? `${cname} nível ${e.level}${can ? ', subir' : ''}` : `${cname} level ${e.level}${can ? ', level up' : ''}`}>
                  <span className="fh-hero-classlv-n">{e.level}</span>
                  {can && <span className="fh-hero-classlv-up" aria-hidden="true">↑</span>}
                </button>}
                <span className="fh-hero-classchip-name">{cname}{r?.name ? <span className="fh-hero-classchip-sub"> ({r.name})</span> : null}</span>
              </span>
            );
          })}
        </span>
        {pending && (
          <span className="fh-hero-fold-pending">
            <span className="fh-hero-fold-dot" aria-hidden="true" />
            {pt ? 'Escolha pendente' : 'Choice pending'}
          </span>
        )}
    </>
  );
  // Sem subclasse nem escolha de espécie para mostrar não há o que abrir: vira uma linha de
  // texto ao lado do selo de nível (só o selo é controle), não uma dobra que nunca abre.
  if (!hasBody) {
    return (
      <div className={`fh-hero-fold fh-hero-classfold is-flat no-print${pending ? ' is-pending' : ''}`} role="group" aria-label={label}>
        <div className="fh-hero-classrow">{head}</div>
      </div>
    );
  }
  return (
    <details className={`fh-hero-fold fh-hero-classfold no-print${pending ? ' is-pending' : ''}`} aria-label={label}>
      <summary>{head}</summary>
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
export const SubclassBanner = ({ char, lang, update }) => {
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

export const SubclassRow = ({ char, lang, update, showClass }) => {
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
export const SpeciesBanner = ({ char, lang, update }) => {
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

export const LevelUpButton = ({ char, lang, onLevelUp }) => {
  const canLevel = canLevelUp(char);

  // Selo de nível: anel tracejado + núcleo dourado. Com `can`, o anel gira devagar
  // (nunca com movimento reduzido) e o selinho ↑ continua no canto.
  return (
    <button
      className={`hero-level fh-seal no-print ${canLevel ? 'can' : ''}`}
      aria-label={`${t('level', lang)} ${char.level}${canLevel ? (lang === 'pt' ? ': subir de nível' : ': level up') : ''}`}
      onClick={stop(() => onLevelUp && onLevelUp())}
      disabled={!canLevel || !onLevelUp}
      title={canLevel ? (lang === 'pt' ? 'Subir de nível (escolher a classe, inclusive uma nova)' : 'Level up (pick the class, including a new one)') : (lang === 'pt' ? 'XP insuficiente' : 'Not enough XP')}
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

export const CampaignSealButton = ({ count, campFoldOpen, onToggle, lang }) => {
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

export const InspirationSealButton = ({ inspired, onToggle, lang, burstKey = null }) => {
  const pt = lang === 'pt';
  return (
    <button
      type="button"
      className={`hero-insp fh-seal no-print ${inspired ? 'is-inspired' : ''}`}
      onClick={onToggle}
      aria-pressed={!!inspired}
      aria-label={pt ? 'Inspiração Heroica' : 'Heroic Inspiration'}
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
      {/* clarão dourado só no momento em que a Inspiração chega (src/sheet/FhConditions.jsx) */}
      <FhInspBurst inspired={inspired} resetKey={burstKey} />
      {inspired && <span className="hero-level-up hero-insp-pip" aria-hidden="true">✦</span>}
      <span className="fh-seal-cap" aria-hidden="true">{pt ? 'Inspiração' : 'Inspiration'}</span>
    </button>
  );
};

export const hideBrokenImg = (e) => { e.currentTarget.style.display = 'none'; };

// Topo da ficha (visual "Ficha Forjada", src/sheet/ficha.css: .fh-hero).
// Mantém os dados essenciais de topo: nome, retrato com upload, selo de nível,
// classe/raça/antecedente, etiquetas (tendência, XP, jogador) e o botão de Inspiração.
// Exportar, Editar e Modo trapaça ficam contidos dentro do painel do herói,
// diretamente abaixo da etiqueta de tendência (.hero-tags).
export const SheetHero = ({
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
  copies = [],
  onOpenCopy = null,
  preview = null,
  onLeaveCampaign = null,
  busyLeaveId = null,
  onManageCampaigns = null,
  onDeleteCopy = null,
  onLogin = null,
  campaignsList = [],
  campFoldOpen = false,
  setCampFoldOpen,
  update,
  versionChip = null,
}) => {
  const pt = lang === 'pt';
  const toast = useSheetToast();
  const letter = (char.name || '?').charAt(0).toUpperCase();
  const inspNow = useGainMoment(!!char.inspiration, char.id, 1000); // brilho que passa no nome ao ganhar Inspiração
  const portrait = char.avatar || speciesArt(char.race) || classArt(char.className);

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
          {portrait && <FramedImg key={portrait} src={portrait} onError={hideBrokenImg} pos={char.avatar ? char.avatarPosition : null} />}
          <FhConditionArt char={char} lang={lang} />
        </div>
        <div className="fh-hero-body">
          {/* Header Row: Medalhas Top-Left + Nome do Personagem imediatamente adjacente */}
          <div className="fh-hero-header-row is-stacked">
            {/* Uma barra só, em cima do nome: a campanha da cópia aberta (ou "Fora de campanha").
                Tocar abre a lista de cópias da ficha, uma linha por campanha. */}
            {!preview && (
              <HeroCampaignBar copies={copies} lang={lang} open={!!campFoldOpen} setOpen={setCampFoldOpen}
                char={char} campaignsList={campaignsList} onOpen={onOpenCopy}
                onLeave={onLeaveCampaign} busyLeaveId={busyLeaveId} onManage={onManageCampaigns} onLogin={onLogin} onDeleteCopy={onDeleteCopy} />
            )}
            {preview && versionChip}

            {/* Classes + nível numa faixa só: selo do nível total (sobe escolhendo qualquer
                classe, inclusive nova) e um selinho por classe (sobe direto nela). */}
            <HeroChoicesFold char={char} lang={lang} update={update} onLevelUp={onLevelUp} />

            {/* Linha do nome: retrato, nível e inspiração (mudam de campanha para campanha) */}
            <div className="fh-hero-name-row">
              <div className="fh-hero-top-left-cluster fh-hero-name-seals no-print">
                <div className="fh-hero-portrait-medal" title={pt ? 'Foto do personagem' : 'Character portrait'}>
                  <AvatarUpload
                    value={char.avatar}
                    onChange={onAvatar}
                    position={char.avatarPosition}
                    onPositionChange={onAvatarPosition}
                    lang={lang}
                    size={48}
                    letter={letter}
                    bundled={!!char.pregenId}
                  />
                  <span className="fh-hero-photo-badge" aria-hidden="true"><Icon name="image" size={10}/></span>
                </div>
                <InspirationSealButton inspired={!!char.inspiration} onToggle={onInspiration} lang={lang} burstKey={char.id} />
                <span className="fh-hero-rest-seals" data-version-hide="">
                  <RestButtons char={char} lang={lang} update={update} seals />
                </span>
              </div>
              <div className={char.name ? 'hero-name' : 'hero-name is-unnamed'}>
                {char.name ? <span className={`fh-foil${inspNow ? ' is-shimmer' : ''}`}>{char.name}</span> : (pt ? 'Sem nome' : 'Unnamed')}
              </div>
            </div>
          </div>
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
                  {langs.length > 0 && <div className="fh-hero-row is-langs">{pt ? 'Fala ' : 'Speaks '}{langs.join(', ')}</div>}
                </>
              );
            })()}
          </div>


        </div>
        {/* Ações discretas no canto do painel: Trapaça -> Editar -> Exportar. Ficam depois do
            corpo no DOM (são posicionadas por CSS): o teclado passa pela campanha, pelo nível
            e pelos selos antes de chegar nelas, na ordem em que a tela é lida. */}
        <div className="fh-hero-tools no-print">
          <button type="button" data-version-hide="" className={`fh-hero-chip fh-corner-chip${char.cheatMode ? ' is-cheat' : ''}`} onClick={() => setCheatOpen(true)}>
            <span aria-hidden="true">🎲</span> {lang === 'pt' ? 'Trapaça' : 'Cheat'}
          </button>
          {!char.inCampaign ? (
            <button type="button" data-version-hide="" className="fh-hero-chip fh-corner-chip is-icon" aria-label={t('edit', lang)} title={t('edit', lang)} onClick={onEdit}>
              <Icon name="edit" size={15} aria-hidden="true"/>
            </button>
          ) : (
            /* Em campanha o lápis fica trancado, mas é um botão de verdade: tocar explica o
               porquê (no celular não existe o balão do title). */
            <button type="button" className="fh-hero-chip fh-corner-chip is-icon is-locked" aria-disabled="true"
              aria-label={lang === 'pt' ? 'Editar (bloqueado em campanha)' : 'Edit (locked in campaign)'}
              title={lang === 'pt' ? 'Em campanha: peça ao mestre pra usar o "Editar ficha (modo mestre)"' : 'In campaign: ask DM to use "Edit sheet (DM mode)"'}
              onClick={() => toast?.show({
                tone: 'info', ms: 7000,
                text: lang === 'pt'
                  ? 'Em campanha a ficha só muda pelo mestre: peça a ele para usar "Editar ficha (modo mestre)".'
                  : 'In a campaign only the DM changes the sheet: ask them to use "Edit sheet (DM mode)".',
              })}>
              <Icon name="edit" size={15} aria-hidden="true"/><span className="fh-chip-lock" aria-hidden="true">🔒</span>
            </button>
          )}
          <button ref={exportBtnRef} type="button" className="fh-hero-chip fh-corner-chip is-icon fh-export-chip" aria-haspopup="dialog"
            aria-label={t('export', lang)} title={t('export', lang)} onClick={() => setExportOpen(true)}>
            <Icon name="download" size={15} aria-hidden="true"/>
          </button>
        </div>
      </div>
    </>
  );
};


// Barra única da campanha + lista das cópias da ficha (original + uma por campanha), uma
// linha cada. A cópia aberta mostra, também em uma linha por campanha, o modo da mesa,
// quem vê as rolagens e "Sair"; as outras cópias trocam a ficha inteira ao tocar.
export const HeroCampaignBar = ({ copies, lang, open, setOpen, char, campaignsList = [], onOpen, onLeave, busyLeaveId, onManage, onLogin, onDeleteCopy }) => {
  const pt = lang === 'pt';
  const current = campaignsList[0]?.name || char.versionCampaign?.name || '';
  const label = current || (pt ? 'Fora de campanha' : 'Not in a campaign');
  const list = copies.length ? copies : [{ id: char.id ?? 'self', active: true, kind: 'template', label: pt ? 'Esta ficha' : 'This sheet', level: char.level }];
  const mode = (camp) => (camp.levelingMode === 'xp' ? (camp.xp ? `${camp.xp} XP` : 'XP') : (pt ? 'Marcos' : 'Milestones'));
  return (
    <div className={`fh-hero-campbar no-print${open ? ' is-open' : ''}${current ? '' : ' is-solo'}`}>
      <button type="button" className="fh-hero-campbar-head" aria-expanded={open} onClick={() => setOpen?.(v => !v)}>
        {/* Selo da campanha: mesmo desenho dos outros selos (anel tracejado, núcleo dourado,
            ícone orbitando no canto de baixo à direita), na mesma coluna do selo de nível. */}
        <span className="fh-seal fh-hero-campseal" aria-hidden="true">
          <svg className="fh-seal-ring" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="none" stroke="#e0b55e" strokeWidth="1.2" strokeDasharray="2 4"/>
            <circle cx="32" cy="32" r="27" fill="none" stroke="#9a7231" strokeWidth="0.8"/>
          </svg>
          <span className="fh-seal-core">{current ? '🏰' : '📜'}</span>
          <span className="hero-level-up fh-hero-campseal-orbit">{list.length > 1 ? list.length : (open ? '▴' : '▾')}</span>
        </span>
        <span className="fh-hero-campbar-name">{label}</span>
        {/* a ficha senta em mais de uma mesa: a barra fechada diz quantas além da primeira */}
        {campaignsList.length > 1 && (
          <span className="fh-hero-campbar-n" aria-label={pt ? `e mais ${campaignsList.length - 1}` : `and ${campaignsList.length - 1} more`}>+{campaignsList.length - 1}</span>
        )}
        {list.length > 1 && <span className="fh-hero-campbar-caret" aria-hidden="true">{open ? '▴' : '▾'}</span>}
      </button>
      {open && (
        <ul className="fh-hero-copies" role="list">
          {list.map(c => (c.active ? (
            (campaignsList.length ? campaignsList : [null]).map((camp, i) => (
              <li key={`${c.id}-${camp?.id ?? 'none'}`} className={`fh-hero-copy is-active${camp?.coverUrl ? ' has-cover' : ''}${camp ? '' : ' is-none'}`}
                style={camp?.coverUrl ? { backgroundImage: `linear-gradient(90deg, rgba(14,10,8,.92), rgba(14,10,8,.72)), url(${camp.coverUrl})` } : undefined}>
                {/* fora de campanha a barra de cima já diz o título: aqui só a frase e o botão */}
                {camp && <span className="fh-hero-copy-ico" aria-hidden="true">🏰</span>}
                <span className="fh-hero-copy-main">
                  {camp && <span className="fh-hero-copy-name">{camp.name}</span>}
                  <span className="fh-hero-copy-tags">
                    {camp && <span className="fh-hero-copy-tag">{mode(camp)}</span>}
                    {camp && <span className={`fh-hero-copy-tag is-${camp.isNpc ? 'npc' : 'pc'}`}>{camp.isNpc ? 'NPC' : (pt ? 'PJ' : 'PC')}</span>}
                    {camp?.sponsored && <span className="fh-hero-copy-tag">{pt ? 'Vaga da mesa' : 'Table seat'}</span>}
                    {camp?.status === 'closed' && <span className="fh-hero-copy-tag">{pt ? 'Encerrada' : 'Closed'}</span>}
                    {i === 0 && c.level ? <span className="fh-hero-copy-lv">{pt ? 'Nv.' : 'Lv'} {c.level}</span> : null}
                    {!camp && !onManage && typeof char.id !== 'number' && onLogin && (
                      <span className="fh-hero-copy-why">{pt ? 'Com uma conta dá para atrelar a ficha a uma campanha.' : 'With an account you can link this sheet to a campaign.'}</span>
                    )}
                    {!camp && onManage && (
                      <span className="fh-hero-copy-why">{pt ? 'Esta ficha não está em nenhuma campanha.' : 'This sheet is not in any campaign.'}</span>
                    )}
                  </span>
                </span>
                <span className="fh-hero-copy-acts">
                  {camp && typeof char.id === 'number' && camp.status !== 'closed' && <SheetRollTarget lang={lang} compact />}
                  {camp && onLeave && (
                    <button type="button" className="btn btn-ghost btn-xs" disabled={busyLeaveId === camp.id}
                      onClick={() => onLeave(camp)} title={pt ? `Sair da campanha "${camp.name}"` : `Leave campaign "${camp.name}"`}>
                      {busyLeaveId === camp.id ? '…' : (pt ? '🚪 Sair' : '🚪 Leave')}
                    </button>
                  )}
                  {!camp && onManage && <button type="button" className="btn btn-primary btn-xs" onClick={onManage}>+ {pt ? 'Atrelar' : 'Link'}</button>}
                  {!camp && !onManage && typeof char.id !== 'number' && onLogin && <button type="button" className="btn btn-primary btn-xs" onClick={onLogin}>{pt ? 'Entrar na conta' : 'Log in'}</button>}
                  {i === 0 && c.kind !== 'template' && onDeleteCopy && (
                    <button type="button" className="btn btn-ghost btn-xs btn-danger" onClick={onDeleteCopy}
                      title={pt ? 'Excluir esta cópia da ficha (a original fica)' : 'Delete this copy of the sheet (the original stays)'}>
                      🗑 {pt ? 'Excluir' : 'Delete'}
                    </button>
                  )}
                </span>
              </li>
            ))
          ) : (
            <li key={c.id} className="fh-hero-copy">
              <button type="button" className="fh-hero-copy-head" onClick={() => onOpen && onOpen(c.id)} title={pt ? 'Abrir esta cópia' : 'Open this copy'}>
                <span className="fh-hero-copy-ico" aria-hidden="true">{c.kind === 'template' ? '📜' : c.kind === 'oneshot' ? '🎲' : '🏰'}</span>
                <span className="fh-hero-copy-name">{c.label}</span>
                {c.level ? <span className="fh-hero-copy-lv">{pt ? 'Nv.' : 'Lv'} {c.level}</span> : null}
                <span className="fh-hero-copy-caret" aria-hidden="true">›</span>
              </button>
            </li>
          )))}
          {campaignsList.length > 0 && onManage && (
            <li className="fh-hero-copy is-add"><button type="button" className="fh-hero-copy-head" onClick={onManage}>+ {pt ? 'Atrelar a outra campanha' : 'Link to another campaign'}</button></li>
          )}
        </ul>
      )}
    </div>
  );
};

// onCampaignChange(msg): a ficha entrou/saiu/trocou de campanha (modal "Campanha") —
// o app recarrega a lista (char.inCampaign) e mostra `msg`. onLogin: ficha do aparelho,
// leva à entrada na conta (sem ele, o servidor está fora e a dica não aparece).
// backLabel: o texto do "voltar" quando a ficha foi aberta de outro lugar (a Mesa, V13).

export function MobileStickyHero({ char, lang = 'pt', shown, onQuickHp, applyHp }) {
  const [pop, setPop] = useState(false);
  const pt = lang === 'pt';
  if (!shown) return null;
  const ac = Utils.computeAc ? Utils.computeAc(char) : (char.ac ?? 10);
  const conds = statusList(char).filter(x => x.key !== 'inspired').slice(0, 2);
  const jump = (sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="fh-sticky-hero no-print" role="region" aria-label={pt ? 'Resumo rápido' : 'Quick summary'}>
      <div className="fh-sticky-top">
        <span className="fh-sticky-name">{char.name || (pt ? 'Herói' : 'Hero')}</span>
        <span className="fh-sticky-lv">{pt ? 'Nv' : 'Lv'} {char.level || 1}</span>
        <button type="button" className="fh-sticky-hp" onClick={() => setPop(v => !v)} aria-expanded={pop}>
          ♥ {char.currentHp}/{char.maxHp}{char.tempHp > 0 ? `+${char.tempHp}` : ''}
        </button>
        <span className="fh-sticky-ac">🛡 {ac}</span>
        {conds.map(c => <span key={c.key} className="fh-sticky-cond">{statusLabel(c, lang)}</span>)}
      </div>
      {pop && (
        <HpDeltaPopover
          open={pop}
          currentHp={char.currentHp || 0}
          maxHp={char.maxHp || 1}
          tempHp={char.tempHp || 0}
          lang={lang}
          onApply={(d, opts) => {
            if (opts?.temp) onQuickHp?.((char.tempHp || 0) + d);
            else applyHp?.(d);
          }}
          onClose={() => setPop(false)}
        />
      )}
      <div className="fh-jump-bar" role="navigation" aria-label={pt ? 'Ir para' : 'Jump to'}>
        {[
          ['.fh-hp', pt ? 'Vitalidade' : 'Vitals'],
          ['.fh-abil-panel', pt ? 'Atributos' : 'Abilities'],
          ['.fh-atk-panel', pt ? 'Ataques' : 'Attacks'],
          ['.fh-res', pt ? 'Recursos' : 'Resources'],
        ].map(([sel, lbl]) => (
          <button key={sel} type="button" className="fh-jump-chip" onClick={() => jump(sel)}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}
