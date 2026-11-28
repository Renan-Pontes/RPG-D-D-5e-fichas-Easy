import { useContext, useState } from 'react';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import { findFeat } from '../../../data/feats.js';
import Icon from '../../../components/Icons.jsx';
import { featSummary } from '../../progression/FeatPicker.jsx';
import OriginFeatModal from '../../progression/OriginFeatModal.jsx';
import { SpeciesChoicesModal } from '../../progression/SpeciesChoices.jsx';
import { speciesSummary } from '../../progression/species-summary.js';
import { speciesChoiceSpecs, speciesGrants } from '../../progression/species.js';
import { subclassesFor } from '../../progression/subclasses.js';
import { applyAutosToCharacter, computeProgression } from '../../progression/engine.js';
import { RespecContext, respecPatch } from '../../progression/respec.js';
import { assignSpeciesChoices } from '../species-trait-choices.js';
import { classSkillCount, classSkillPicks, classToolPicks } from '../../creator/class-helpers.js';
import { findBackground, backgroundTool, chosenBackgroundTools } from '../../creator/background-helpers.js';
import { classStart, toolName } from '../../creator/start-data.js';
import { featAsiIssues, featChoiceSpecs, featPicksIssues } from '../../progression/feat-rules.js';
import { featName, featPicksText, backgroundFeature } from '../sheet-text.js';
import { placeFeatures, poolParents } from '../feature-placement.js';
import FhFeatures, { FhFeatureItem } from '../FhFeatures.jsx';
import FhTitle from '../FhTitle.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { buildTimeline, byLevel, byTier, tierOf, classesAt, charLevelOf } from '../feature-timeline.js';
import { subclassLevelOf } from '../../progression/subclass-lock.js';
import { SUBCLASS_LABEL } from '../sheet-shared.jsx';
import { SubclassModal } from './SheetCompanionsAndNotes.jsx';
import { SpeciesTraits } from '../story/SheetStoryTab.jsx';
import { SheetAbilities } from '../belt/BeltHive.jsx';
import { SheetTools } from './SheetSkillsSection.jsx';
import { TimelineClassSkillsModal, TimelineBackgroundModal, stableJson, } from './TimelineModals.jsx';

export const FeatureTimeline = ({ char, lang, placed: placedIn, cls: clsIn, race: raceIn, update: updateIn, onResolveChoice, onResolveOptions, title = null, compact = false }) => {
  const pt = lang === 'pt';
  const respec = useContext(RespecContext);
  const update = updateIn || respec?.update;
  const effResolveChoice = onResolveChoice || respec?.resolveChoice;
  const effResolveOptions = onResolveOptions || respec?.resolveOptions;
  const canEdit = Boolean(respec || update);
  const [localModal, setLocalModal] = useState(null);
  const [openMap, setOpenMap] = useState({});

  const tlToast = useSheetToast();
  // Pedidos de troca em andamento, agrupados: o mesmo pedido (título + mudanças) enviado a
  // duas mesas ou repetido aparecia como linhas idênticas empilhadas.
  const respecGroups = (() => {
    const out = [];
    for (const a of (respec?.pending || [])) {
      const title = a?.payload?.title || (pt ? 'Troca de escolhas' : 'Changed choices');
      const changes = a?.payload?.changes || [];
      const sig = `${title}|${changes.join('|')}`;
      const g = out.find(x => x.sig === sig);
      if (g) { g.count += 1; g.approved = g.approved || a.status === 'approved'; }
      else out.push({ id: a.id, sig, title, changes, count: 1, approved: a.status === 'approved', patch: a?.payload?.patch || null });
    }
    return out;
  })();
  const applyChange = (patch, summaryPt, summaryEn) => {
    if (respec?.submit) {
      // Em campanha a troca vira pedido ao mestre: o MESMO pedido não é enviado duas vezes.
      if (char.inCampaign) {
        let same = false;
        try {
          const want = stableJson(respecPatch(char, applyAutosToCharacter({ ...char, ...patch })));
          same = respecGroups.some(g => !g.approved && g.patch && stableJson(g.patch) === want);
        } catch { same = false; }
        if (same) {
          tlToast?.show({ tone: 'info', ms: 5000, text: pt ? 'Este pedido já está com o mestre. Aguarde a resposta dele.' : 'This request is already with your DM. Wait for the answer.' });
          return undefined;
        }
      }
      return respec.submit({ ...char, ...patch }, pt ? summaryPt : summaryEn);
    }
    if (update) return update(patch);
    return undefined;
  };

  // Fonte única (aba Características e painel Progressão): os mesmos traços posicionados,
  // escolhas de classe, pendências da engine, proficiências de multiclasse e truques automáticos.
  const placed = placedIn || (() => { try { return placeFeatures(char); } catch { return placeFeatures({}); } })();
  const cls = clsIn || SRD.CLASSES.find(c => c.id === char.className);
  const race = raceIn !== undefined ? raceIn : Utils.races(char).find(r => r.id === char.race);
  const prog = (() => { try { return computeProgression(char); } catch { return null; } })();
  const multi = !!placed?.multi;
  const seq = (() => { try { return Utils.classSequence(char); } catch { return []; } })();
  const srd = !(placed?.items || []).length && char.rulesVersion !== '2024' ? (cls?.features || []) : [];
  const rawClassItems = [
    ...(placed?.items || []),
    ...(placed?.orphanPicks || []),
    ...srd.map((f, i) => ({ key: `srd-${i}`, classId: char.className, level: 1, name: { pt: f.name, en: f.name }, desc: { pt: f.desc, en: f.desc } })),
  ];

  // Enriquecer classe: (1) Perícias e ferramentas iniciais da classe no nível 1,
  // (2) subclasse escolhida e terreno (Círculo da Terra) nos traços de subclasse.
  const startInfo = (() => { try { return classStart(char); } catch { return null; } })();
  const cSkills = (() => { try { return classSkillPicks(char); } catch { return []; } })();
  const cSkillNeed = (() => { try { return classSkillCount(char); } catch { return 0; } })();
  const cToolIds = [...new Set([
    ...(startInfo?.tools?.fixed || []),
    ...(char.creation?.toolChoices?.class || []),
    ...(() => { try { return classToolPicks(char); } catch { return []; } })(),
  ])];
  const classProfsItem = char.className && (cSkillNeed > 0 || startInfo?.tools?.choose > 0 || cToolIds.length > 0) ? [{
    key: 'class-profs',
    id: 'classProficiencies',
    classId: char.className,
    level: 1,
    name: { pt: 'Perícias e Ferramentas da Classe', en: 'Class Skills & Tools' },
    desc: { pt: 'Proficiências iniciais escolhidas na criação do personagem.', en: 'Initial proficiency choices from character creation.' },
    picks: [
      ...(cSkillNeed > 0 || cSkills.length > 0 ? [{
        name: { pt: `Perícias da classe (${cSkills.length}/${cSkillNeed})`, en: `Class skills (${cSkills.length}/${cSkillNeed})` },
        desc: {
          pt: cSkills.length ? cSkills.map(id => tName('skill', id, 'pt')).join(', ') : 'a escolher',
          en: cSkills.length ? cSkills.map(id => tName('skill', id, 'en')).join(', ') : 'to choose',
        },
      }] : []),
      ...(startInfo?.tools?.choose > 0 || cToolIds.length > 0 ? [{
        name: { pt: 'Ferramentas da classe', en: 'Class tools' },
        desc: {
          pt: cToolIds.length ? cToolIds.map(id => toolName(id, 'pt')).join(', ') : 'a escolher',
          en: cToolIds.length ? cToolIds.map(id => toolName(id, 'en')).join(', ') : 'to choose',
        },
      }] : []),
    ],
    _isClassProfs: true,
    _missingProfs: cSkills.length < cSkillNeed || (startInfo?.tools?.choose > 0 && !(char.creation?.toolChoices?.class?.length)),
  }] : [];

  const classItems = (() => {
    const list = [...classProfsItem, ...rawClassItems.map(it => ({ ...it }))];
    const entries = (() => { try { return Utils.classEntries(char); } catch { return []; } })();
    for (const ce of entries) {
      const cView = Utils.classView(char, ce);
      if (!cView.subclass) continue;
      const subsList = subclassesFor(cView, ce.id);
      const subObj = subsList.find(s => s.id === cView.subclass);
      const subLabel = SUBCLASS_LABEL[ce.id] || { pt: 'Subclasse', en: 'Subclass' };
      const subPick = {
        name: subLabel,
        desc: { pt: subObj?.name?.pt || cView.subclass, en: subObj?.name?.en || cView.subclass },
      };
      const ltObj = ce.id === 'druid' && cView.subclass === 'land'
        ? (subObj?.landTypes || []).find(l => l.id === cView.landType)
        : null;
      const landPick = ce.id === 'druid' && cView.subclass === 'land' ? {
        name: { pt: 'Terreno (Círculo da Terra)', en: 'Land Type (Circle of the Land)' },
        desc: { pt: ltObj?.name?.pt || cView.landType || 'a escolher', en: ltObj?.name?.en || cView.landType || 'to choose' },
      } : null;

      let matchedRoot = false;
      for (let idx = 0; idx < list.length; idx++) {
        const it = list[idx];
        if (it.classId === ce.id && /Subclass$|^artificerSpecialist$/.test(it.id || '')) {
          matchedRoot = true;
          list[idx] = {
            ...it,
            picks: [...(it.picks || []), subPick, ...(landPick ? [landPick] : [])],
            _isSubclassRoot: true,
          };
        } else if (landPick && it.classId === ce.id && /circle(?:OfTheLand)?Spells/.test(it.id || '')) {
          list[idx] = { ...it, picks: [...(it.picks || []), landPick], _isSubclassRoot: true };
        }
      }
      if (!matchedRoot) {
        const subLv = subclassLevelOf(cView);
        list.push({
          key: `sub-${ce.id}`,
          id: `${ce.id}Subclass`,
          classId: ce.id,
          level: subLv,
          name: subLabel,
          desc: subObj?.desc || { pt: '', en: '' },
          picks: [subPick, ...(landPick ? [landPick] : [])],
          _isSubclassRoot: true,
        });
      }
    }
    return list;
  })();

  const multiclass = (prog?.classes || []).filter(e => !e.primary).map(e => ({
    classId: e.id,
    name: { pt: `Multiclasse: ${tName('class', e.id, 'pt')}`, en: `Multiclass: ${tName('class', e.id, 'en')}` },
    text: Utils.multiclassProfs(char, e.id) || '',
  }));
  const autoLv = (() => { try { return charLevelOf(seq, char.className, subclassLevelOf(char)) || subclassLevelOf(char); } catch { return 3; } })();
  const extras = (prog?.autoCantrips || []).length ? [{
    level: autoLv, kind: 'class', classId: char.className, key: 'autocantrips',
    item: { name: { pt: 'Truques automáticos da subclasse', en: 'Subclass auto cantrips' },
      desc: { pt: prog.autoCantrips.map(id => tName('spellName', id, 'pt')).join(', '), en: prog.autoCantrips.map(id => tName('spellName', id, 'en')).join(', ') } },
  }] : [];

  // Espécie: escolhas ativas + futuras (ex.: Simic 5º nível), magias por nível (3º e 5º) e fallback para nível 1
  const speciesRowsPt = (() => { try { return speciesSummary(char, 'pt'); } catch { return []; } })();
  const speciesRowsEn = (() => { try { return speciesSummary(char, 'en'); } catch { return []; } })();
  const speciesSpecs = (() => { try { return speciesChoiceSpecs(char, { includeFuture: true }); } catch { return []; } })();
  const spGrants = (() => { try { return speciesGrants(char); } catch { return { cantrips: [], spells: [], spellsByLevel: {}, spellUses: {}, skills: [], resist: [], tools: [], darkvision: 0, speed: null, size: null, spellAbility: null, options: {} }; } })();
  const baseSpeciesTraits = race?.traits || [];
  const speciesAt = assignSpeciesChoices(baseSpeciesTraits, speciesSpecs);
  const spellCatalog = (() => { try { return Utils.spellCatalog(char); } catch { return []; } })();
  const spName = (id, l) => { const n = tName('spellName', id, l); return (n && n !== id ? n : spellCatalog.find(s => s.id === id)?.name?.[l]) || id; };

  const extraSpeciesTraits = (() => {
    const out = [...baseSpeciesTraits];
    if (!baseSpeciesTraits.length && speciesSpecs.some(c => !c.minLevel)) {
      out.push({
        key: 'sp:0',
        level: 1,
        name: race?.name || { pt: 'Traços da espécie', en: 'Species traits' },
        desc: { pt: '', en: '' },
        hasChoices: true,
      });
    }
    const levels = new Set([
      ...Object.keys(spGrants.spellsByLevel || {}).map(Number).filter(n => n > 1),
      ...speciesSpecs.map(c => c.minLevel).filter(n => n > 1),
    ]);
    for (const lv of [...levels].sort((a, b) => a - b)) {
      if (out.some(t => (+t.level || 1) === lv)) continue;
      const spells = spGrants.spellsByLevel[lv] || [];
      const minSpecs = speciesSpecs.filter(c => c.minLevel === lv);
      if (!spells.length && !minSpecs.length) continue;
      const picks = [
        ...minSpecs.map(c => {
          const lPt = c.label?.pt || c.label?.en || c.key;
          const lEn = c.label?.en || c.label?.pt || c.key;
          const vPt = speciesRowsPt.find(([l]) => l === lPt)?.[1] || 'a escolher';
          const vEn = speciesRowsEn.find(([l]) => l === lEn)?.[1] || 'to choose';
          return { name: { pt: lPt, en: lEn }, desc: { pt: vPt, en: vEn } };
        }),
        ...(spells.length ? [{
          name: { pt: `Magias liberadas (${lv}º nível)`, en: `Unlocked spells (Level ${lv})` },
          desc: {
            pt: spells.map(id => spName(id, 'pt')).join(', ') + (spGrants.spellAbility ? ` (${t(spGrants.spellAbility + 'Sh', 'pt')})` : ''),
            en: spells.map(id => spName(id, 'en')).join(', ') + (spGrants.spellAbility ? ` (${t(spGrants.spellAbility + 'Sh', 'en')})` : ''),
          },
        }] : []),
      ];
      const raceNamePt = race?.name?.pt || race?.name?.en || tName('race', char.race, 'pt');
      const raceNameEn = race?.name?.en || race?.name?.pt || tName('race', char.race, 'en');
      out.push({
        key: `sp-lv:${lv}`,
        level: lv,
        hasChoices: true,
        name: { pt: `${raceNamePt}: Progressão (${lv}º nível)`, en: `${raceNameEn}: Progression (Level ${lv})` },
        desc: {
          pt: spells.length ? `Magias desbloqueadas no ${lv}º nível pela linhagem ou traço da espécie.` : `Escolha de espécie liberada no ${lv}º nível.`,
          en: spells.length ? `Spells unlocked at level ${lv} by your species lineage or trait.` : `Species choice unlocked at level ${lv}.`,
        },
        picks,
      });
    }
    return out;
  })();

  // Antecedente: 2014 (característica + escolhas) e 2024 (atributos, talento de origem, perícias, ferramentas e idiomas)
  const bgfPt = backgroundFeature(char, 'pt');
  const bgfEn = backgroundFeature(char, 'en');
  const bgDef = (() => { try { return findBackground(char); } catch { return null; } })();
  const bgTimeline = (() => {
    if (!char?.background && !bgfPt) return null;
    const is24 = char.rulesVersion === '2024';
    const bgNamePt = bgDef?.name?.pt || tName('background', char.background, 'pt') || char.background || '';
    const bgNameEn = bgDef?.name?.en || tName('background', char.background, 'en') || char.background || '';
    const name = {
      pt: bgfPt && !is24 ? `${bgfPt.name} (${bgNamePt})` : `Antecedente: ${bgNamePt}`,
      en: bgfEn && !is24 ? `${bgfEn.name} (${bgNameEn})` : `Background: ${bgNameEn}`,
    };
    const desc = {
      pt: bgfPt?.desc || bgDef?.desc?.pt || '',
      en: bgfEn?.desc || bgDef?.desc?.en || '',
    };
    const bgSk = (() => { try { return Utils.backgroundSkills(char); } catch { return []; } })();
    const bt = (() => { try { return backgroundTool(char); } catch { return { fixed: [], choose: 0 }; } })();
    const btIds = [...new Set([...(bt.fixed || []), ...(() => { try { return chosenBackgroundTools(char); } catch { return []; } })()])];
    const ofId = bgDef?.originFeat || (char.feats || []).find(f => f?.origin === 'background')?.id;
    const ofDef = ofId ? findFeat(ofId) : null;
    const bonusEntries = Object.entries(char.raceBonus || {}).filter(([, v]) => v);
    const langs = (() => { try { return Utils.languagesFor(char); } catch { return []; } })();
    const picks = [
      ...(bgSk.length ? [{
        name: { pt: 'Perícias', en: 'Skills' },
        desc: { pt: bgSk.map(id => tName('skill', id, 'pt')).join(', '), en: bgSk.map(id => tName('skill', id, 'en')).join(', ') },
      }] : []),
      ...(is24 ? [{
        name: { pt: 'Atributos do antecedente', en: 'Background abilities' },
        desc: {
          pt: bonusEntries.length ? bonusEntries.map(([k, v]) => `${t(k + 'Sh', 'pt')} +${v}`).join(', ') : 'a escolher (+2/+1 ou +1/+1/+1)',
          en: bonusEntries.length ? bonusEntries.map(([k, v]) => `${t(k + 'Sh', 'en')} +${v}`).join(', ') : 'to choose (+2/+1 or +1/+1/+1)',
        },
      }] : []),
      ...(is24 && (ofDef || char.originFeat) ? [{
        name: { pt: 'Talento de origem', en: 'Origin feat' },
        desc: ofDef?.name || { pt: char.originFeat, en: char.originFeat },
      }] : []),
      ...(bt.choose > 0 || btIds.length > 0 ? [{
        name: { pt: 'Ferramentas', en: 'Tools' },
        desc: {
          pt: btIds.length ? btIds.map(id => toolName(id, 'pt')).join(', ') : 'a escolher',
          en: btIds.length ? btIds.map(id => toolName(id, 'en')).join(', ') : 'to choose',
        },
      }] : []),
      ...(langs.length > 0 || Utils.languageChoiceCount(char) > 0 ? [{
        name: { pt: 'Idiomas', en: 'Languages' },
        desc: {
          pt: langs.length ? langs.map(id => Utils.languageLabel(id, 'pt')).join(', ') : 'a escolher',
          en: langs.length ? langs.map(id => Utils.languageLabel(id, 'en')).join(', ') : 'to choose',
        },
      }] : []),
    ];
    return { name, desc, picks };
  })();

  const built = buildTimeline({
    level: char.level || 1, seq, classItems,
    speciesTraits: extraSpeciesTraits,
    feats: char.feats || [],
    background: bgTimeline,
    levelChoices: char.levelChoices || {},
    asiText: (asi) => Object.entries(asi || {}).map(([k, v]) => `${t(k + 'Sh', lang)} +${v}`).join(', '),
    pending: prog?.pendingChoices || [], multiclass, extras,
  });
  // Uma pendência, uma linha: enquanto a subclasse não foi escolhida, o traço "Subclasse de X"
  // (só descritivo) sai da lista e o texto dele vai para a linha "Escolha sua subclasse ·
  // PENDENTE", que é a que tem o botão. Escolhida a subclasse, o traço volta como antes.
  const entries = (() => {
    const pend = built.filter(e => e.pending && e.choice?.type === 'subclass');
    if (!pend.length) return built;
    const drop = new Set();
    const out = built.map(e => {
      if (!pend.includes(e)) return e;
      const twin = built.find(x => x.kind === 'class' && !x.pending && x.level === e.level && /Subclass$/.test(String(x.item?.id || ''))
        && (!e.classId || !x.classId || x.classId === e.classId));
      if (!twin) return e;
      drop.add(twin);
      return { ...e, item: { ...e.item, desc: twin.item?.desc || e.item.desc } };
    });
    return out.filter(e => !drop.has(e));
  })();
  if (!entries.length) return null;
  const tagOf = (e) => {
    if (e.kind === 'species') return pt ? 'Espécie' : 'Species';
    if (e.kind === 'background') return pt ? 'Antecedente' : 'Background';
    if (e.kind === 'feat') return e.feat.origin === 'background' ? (pt ? 'Talento · antecedente' : 'Feat · background') : e.feat.origin === 'species' ? (pt ? 'Talento · espécie' : 'Feat · species') : (pt ? 'Talento no lugar do ASI' : 'Feat instead of ASI');
    if (e.kind === 'asi') return e.pending ? (pt ? 'ASI · escolha pendente' : 'ASI · choice pending') : 'ASI';
    if (e.kind === 'choice') return pt ? 'Pendente' : 'Pending';
    if (e.kind === 'multiclass') return pt ? 'Multiclasse' : 'Multiclass';
    return multi ? tName('class', e.classId, lang) : (cls?.name?.[lang] || tName('class', char.className, lang));
  };
  // Escolhas ligadas ao traço da entrada `sp:<i>` (e fallback em `sp:0` para escolhas sem traço próprio, como tamanho).
  const choicesFor = (e) => {
    if (String(e.key || '').startsWith('sp-lv:')) {
      const lv = Number(String(e.key).split(':')[1]);
      return speciesSpecs.filter(c => c.minLevel === lv).map(c => {
        const labelPt = c.label?.pt || c.label?.en || c.key;
        const labelEn = c.label?.en || c.label?.pt || c.key;
        return {
          key: c.key, labelPt, labelEn,
          valuePt: speciesRowsPt.find(([l]) => l === labelPt)?.[1] || '',
          valueEn: speciesRowsEn.find(([l]) => l === labelEn)?.[1] || '',
          label: lang === 'pt' ? labelPt : labelEn,
          value: (lang === 'pt' ? speciesRowsPt : speciesRowsEn).find(([l]) => l === (lang === 'pt' ? labelPt : labelEn))?.[1] || '',
        };
      });
    }
    const i = Number(String(e.key || '').split(':')[1]);
    if (!Number.isInteger(i)) return [];
    return speciesSpecs.map((c, k) => ({ c, k })).filter(({ c, k }) => {
      if (c.minLevel > 1) return false;
      return speciesAt[k] === i || (i === 0 && speciesAt[k] === -1);
    }).map(({ c }) => {
      const labelPt = c.label?.pt || c.label?.en || c.key;
      const labelEn = c.label?.en || c.label?.pt || c.key;
      const valuePt = speciesRowsPt.find(([l]) => l === labelPt)?.[1] || '';
      const valueEn = speciesRowsEn.find(([l]) => l === labelEn)?.[1] || '';
      return {
        key: c.key, labelPt, labelEn, valuePt, valueEn,
        label: lang === 'pt' ? labelPt : labelEn,
        value: lang === 'pt' ? valuePt : valueEn,
      };
    });
  };
  const itemOf = (e) => {
    if (e.kind === 'species') {
      if (String(e.key || '').startsWith('sp-lv:')) return e.item;
      const rows = choicesFor(e);
      if (!rows.length) return e.item;
      const own = [e.item?.name?.pt, e.item?.name?.en].filter(Boolean).map(n => n.toLowerCase());
      const chosenStr = (isPt) => rows.map(r => {
        const lblRaw = isPt ? r.labelPt : r.labelEn;
        const label = String(lblRaw).split(':').pop().trim();
        const v = (isPt ? r.valuePt : r.valueEn) || (isPt ? 'a escolher' : 'to choose');
        return own.includes(String(lblRaw).toLowerCase()) ? v : `${label}: ${v}`;
      }).join(' · ');
      const add = (d, isPt) => `${d || ''}${d ? ' ' : ''}${isPt ? 'Escolhido' : 'Chosen'}: ${chosenStr(isPt)}.`;
      const picks = [
        ...(e.item.picks || []),
        ...rows.map(r => ({
          name: { pt: r.labelPt, en: r.labelEn },
          desc: { pt: r.valuePt || 'a escolher', en: r.valueEn || 'to choose' },
        })),
        ...(rows.some(r => ['lineage', 'spellAbility', 'legacy'].includes(r.key)) && (spGrants.cantrips.length || (spGrants.spellsByLevel[1] || []).length) ? [{
          name: { pt: 'Magias (1º nível)', en: 'Spells (1st level)' },
          desc: {
            pt: [...spGrants.cantrips, ...(spGrants.spellsByLevel[1] || [])].map(id => spName(id, 'pt')).join(', '),
            en: [...spGrants.cantrips, ...(spGrants.spellsByLevel[1] || [])].map(id => spName(id, 'en')).join(', '),
          },
        }] : []),
      ];
      // as escolhas aparecem UMA vez, na lista chave/valor (`picks`): a frase "Escolhido: …"
      // que as repetia no fim do texto saiu. Sem lista (nenhuma linha), a frase continua.
      return picks.length ? { ...e.item, picks } : { ...e.item, desc: { pt: add(e.item.desc?.pt, true), en: add(e.item.desc?.en, false) }, picks };
    }
    if (e.kind !== 'feat') return e.item;
    const f = e.feat;
    const def = f?.id ? findFeat(f.id) : null;
    const namePt = featName(char, f, 'pt');
    const nameEn = featName(char, f, 'en');
    const asiListPt = f.asi ? Object.entries(f.asi).filter(([, v]) => v).map(([k, v]) => `${t(k + 'Sh', 'pt')} +${v}`).join(', ') : '';
    const asiListEn = f.asi ? Object.entries(f.asi).filter(([, v]) => v).map(([k, v]) => `${t(k + 'Sh', 'en')} +${v}`).join(', ') : '';
    const picksPt = f.picks ? featPicksText(f.picks, 'pt') : '';
    const picksEn = f.picks ? featPicksText(f.picks, 'en') : '';
    const featPicks = [
      ...(asiListPt || (def?.asi && !['background', 'species'].includes(f.origin)) ? [{
        name: { pt: 'Aumento de atributo', en: 'Ability score' },
        desc: { pt: asiListPt || 'a escolher', en: asiListEn || 'to choose' },
      }] : []),
      ...((def && featChoiceSpecs(def).length > 0) || picksPt ? [{
        name: { pt: 'Escolhas do talento', en: 'Feat choices' },
        desc: { pt: picksPt || 'a escolher', en: picksEn || 'to choose' },
      }] : []),
      ...(f.note ? [{ name: { pt: 'Nota', en: 'Note' }, desc: { pt: f.note, en: f.note } }] : []),
    ];
    const bitsPt = [asiListPt, featSummary(f, 'pt') || '', picksPt, f.note || ''].filter(Boolean).join(' · ');
    const bitsEn = [asiListEn, featSummary(f, 'en') || '', picksEn, f.note || ''].filter(Boolean).join(' · ');
    return { name: { pt: namePt, en: nameEn }, desc: { pt: bitsPt, en: bitsEn }, picks: featPicks };
  };
  const poolParentMap = poolParents();
  const hasPoolPicks = (classId, featureId) => {
    const raw = poolParentMap[classId]?.[featureId];
    if (!raw) return false;
    const pools = Array.isArray(raw) ? raw : String(raw).split(/[\s,]+/).filter(Boolean);
    return (char.classOptions || []).some(p => p.classId === classId && pools.includes(p.pool));
  };
  const triggerReq = (req) => {
    if (!req) return;
    if (['subclass', 'classSkills', 'background'].includes(req.kind)) return setLocalModal(req);
    if (respec?.change) return respec.change(req);
    if (req.kind === 'level') return effResolveChoice?.(req.level);
    if (req.kind === 'options') return effResolveOptions?.(req.classId);
    setLocalModal(req);
  };
  // Botão "Escolher agora" nas pendências (quando quem usa a linha do tempo resolve escolhas)
  const goOf = (e) => {
    let go = null;
    if (e.pending) {
      const c = e.choice;
      go = c?.type === 'classOption' ? (effResolveOptions && (() => effResolveOptions(c.classId || char.className)))
        : (c?.type === 'asiOrFeat' || c?.type === 'epicBoon' || e.kind === 'asi') ? (effResolveChoice && (() => effResolveChoice(e.level)))
        : (c?.type === 'subclass' || c?.type === 'landType') ? (canEdit && (() => setLocalModal({ kind: 'subclass', classId: c.classId || char.className, landOnly: c.type === 'landType' })))
        : null;
    } else if (!e.later && canEdit) {
      if (e.kind === 'species' && choicesFor(e).some(r => !(lang === 'pt' ? r.valuePt : r.valueEn))) {
        go = () => triggerReq({ kind: 'species' });
      } else if (e.kind === 'class' && e.item?._missingProfs) {
        go = () => setLocalModal({ kind: 'classSkills' });
      } else if (e.kind === 'background') {
        const bgToolSpec = backgroundTool(char);
        const missingTool = bgToolSpec.choose > chosenBackgroundTools(char).length;
        const missingBonus = char.rulesVersion === '2024' && !Object.values(char.raceBonus || {}).some(Boolean);
        if (missingTool || missingBonus) go = () => setLocalModal({ kind: 'background' });
      } else if (e.kind === 'feat') {
        const f = e.feat;
        const def = f?.id ? findFeat(f.id) : null;
        if (def && (featPicksIssues(def, f.picks, f.level || 1).length > 0 || (def.asi && !['background', 'species'].includes(f.origin) && featAsiIssues(char, def, f.asi).length > 0))) {
          const req = !['background', 'species'].includes(f?.origin) && (char.levelChoices || {})[f?.level]
            ? { kind: 'level', level: f.level }
            : { kind: 'origin', index: (char.feats || []).indexOf(f) };
          go = () => triggerReq(req);
        }
      }
    }
    return go || null;
  };
  const actionOf = (e) => {
    const go = goOf(e);
    if (!go) return null;
    return <button type="button" className="btn btn-sm btn-primary prog-choose" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); go(); }}>{pt ? 'Escolher agora' : 'Choose now'}</button>;
  };
  // Pendência = o que a engine marca como pendente OU qualquer linha com "Escolher agora"
  // (antecedente sem ferramenta, perícias da classe em falta…): é o que os contadores somam.
  const needsChoice = (e) => { try { return !!e.pending || !!goOf(e); } catch { return !!e.pending; } };
  // Botão "Trocar" nas escolhas já feitas: espécie, antecedente, perícias/opções/subclasse e talentos/ASI.
  const changeOf = (e) => {
    if (!canEdit || e.pending || e.later) return null;
    let req = null;
    if (e.kind === 'asi' && e.done) req = { kind: 'level', level: e.level };
    else if (e.kind === 'feat') {
      req = !['background', 'species'].includes(e.feat?.origin) && (char.levelChoices || {})[e.feat?.level]
        ? { kind: 'level', level: e.feat.level }
        : { kind: 'origin', index: (char.feats || []).indexOf(e.feat) };
    } else if (e.kind === 'species' && (choicesFor(e).length > 0 || e.hasChoices)) req = { kind: 'species' };
    else if (e.kind === 'background') req = { kind: 'background' };
    else if (e.kind === 'class') {
      if (e.item?._isClassProfs) req = { kind: 'classSkills' };
      else if (e.item?._isSubclassRoot) req = { kind: 'subclass', classId: e.classId || char.className };
      else if (e.classId && (e.item?.picks?.length || hasPoolPicks(e.classId, e.item?.id))) req = { kind: 'options', classId: e.classId };
    }
    if (!req) return null;
    return (
      <button type="button" className="btn btn-sm btn-ghost fh-tl-change" title={pt ? 'Trocar esta escolha' : 'Change this choice'}
        aria-label={`${pt ? 'Trocar' : 'Change'}: ${itemOf(e)?.name?.[pt ? 'pt' : 'en'] || ''}`}
        onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); triggerReq(req); }}>
        <Icon name="edit" size={13} aria-hidden="true" /><span className="fh-tl-change-t">{pt ? 'Trocar' : 'Change'}</span>
      </button>
    );
  };
  const now = char.level || 1;
  const cur = tierOf(now);
  // Acordeão: começam abertos o nível atual e os que têm escolha pendente; o resto, fechado
  const isOpen = (g) => openMap[g.level] ?? ((!compact && g.level === now) || g.entries.some(e => e.pending));
  const toggle = (g) => setOpenMap(m => ({ ...m, [g.level]: !isOpen(g) }));
  // nível 1 sempre existe: é onde ficam idiomas, proficiências e as escolhas da espécie
  const groups = byLevel(entries);
  if (!groups.length || groups[0].level !== 1) groups.unshift({ level: 1, entries: [] });
  const origin = !update || compact ? null : (
    <div className="fh-tl-origin">
      {race && <SpeciesTraits char={char} lang={lang} update={update} race={race} hideTraits embedded />}
      <div className="fh-tl-embed-h">{pt ? 'Idiomas e proficiências' : 'Languages & proficiencies'}</div>
      <SheetTools char={char} lang={lang} update={update} placed={placed} embedded />
    </div>
  );
  const subModalTarget = localModal?.kind === 'subclass' ? (() => {
    const entry = Utils.classEntries(char).find(x => x.id === (localModal.classId || char.className));
    const view = entry ? Utils.classView(char, entry) : char;
    const subs = subclassesFor(view);
    const label = SUBCLASS_LABEL[view.className] || { pt: 'Subclasse', en: 'Subclass' };
    return { entry, view, subs, label };
  })() : null;
  return (
    <section className={title === false ? 'fh-timeline fh-timeline-bare' : 'fh-panel fh-timeline'}>
      {title !== false && (typeof title === 'string'
        ? <FhTitle sub={<span className="fh-tl-now">{pt ? 'por nível' : 'by level'}</span>}>{title}</FhTitle>
        : <FhTitle sub={<span className="fh-tl-now">{pt ? `Patamar ${cur.tier} · ${cur.pt}` : `Tier ${cur.tier} · ${cur.en}`}</span>}>{pt ? 'Linha do tempo' : 'Timeline'}</FhTitle>)}
      {respecGroups.length > 0 && (
        <div className="fh-tl-respec" role="status">
          <strong className="fh-tl-respec-h"><Icon name="info" size={15} aria-hidden="true" /> {pt ? (respecGroups.length === 1 ? 'Troca aguardando o mestre' : `${respecGroups.length} trocas aguardando o mestre`) : (respecGroups.length === 1 ? 'Change waiting for your DM' : `${respecGroups.length} changes waiting for your DM`)}</strong>
          {/* o mesmo pedido enviado a várias mesas (ou repetido) vira UMA linha, com a contagem */}
          {respecGroups.map(g => (
            <div key={g.id} className="fh-tl-respec-item">
              <span className="fh-tl-respec-t">
                {g.title}
                {g.count > 1 ? (pt ? ` · enviado ${g.count}×` : ` · sent ${g.count}×`) : ''}
                {g.approved ? (pt ? ' · aprovada, aplicando…' : ' · approved, applying…') : ''}
              </span>
              {g.changes.length > 0 && <span className="fh-tl-respec-c">{g.changes.join(' · ')}</span>}
            </div>
          ))}
          <span className="fh-tl-respec-foot">{pt ? 'A ficha muda quando o mestre aprovar. Para desistir de um pedido, avise o mestre: ele recusa na fila de aprovações.' : 'The sheet changes once the DM approves. To drop a request, tell the DM: they reject it in the approvals queue.'}</span>
        </div>
      )}
      <ol className="fh-tl">
        {byTier(groups).map(tr => (
          <li key={tr.tier} className={`fh-tl-tier${tr.tier === cur.tier ? ' is-current' : ''}${tr.from > now ? ' is-later' : ''}`}>
            <div className="fh-tl-tier-h">
              <span className="fh-tl-tier-n">{pt ? 'Patamar' : 'Tier'} {tr.tier}</span>
              <span className="fh-tl-tier-t">{pt ? tr.pt : tr.en}</span>
              <span className="fh-tl-tier-r">{pt ? `Nv. ${tr.from}–${tr.to}` : `Lv ${tr.from}–${tr.to}`}</span>
              {(() => {
                const n = tr.levels.reduce((k, g) => k + g.entries.filter(needsChoice).length, 0);
                return n ? <span className="fh-tl-badge is-tier" title={pt ? (n === 1 ? '1 escolha pendente neste patamar' : `${n} escolhas pendentes neste patamar`) : (n === 1 ? '1 pending choice in this tier' : `${n} pending choices in this tier`)}>{n}</span> : null;
              })()}
            </div>
            <ol className="fh-tl-levels">
              {tr.levels.map(g => (
                <li key={g.level} className={`fh-tl-level${g.level > now ? ' is-later' : ''}${g.level === now ? ' is-now' : ''}${isOpen(g) ? '' : ' is-folded'}`}>
                  {/* o marcador do nível abre/fecha o conteúdo dele (acordeão) */}
                  <button type="button" className="fh-tl-node" aria-expanded={isOpen(g)}
                    aria-label={(pt ? `Nível ${g.level}: ${isOpen(g) ? 'recolher' : 'expandir'}` : `Level ${g.level}: ${isOpen(g) ? 'collapse' : 'expand'}`) + (g.entries.some(needsChoice) ? (pt ? ' · tem escolhas pendentes' : ' · has pending choices') : '')}
                    onClick={() => toggle(g)}>{g.level}
                    {(() => {
                      // contador de escolhas pendentes neste marcador (estilo notificação)
                      const n = g.entries.filter(needsChoice).length;
                      return n ? <span className="fh-tl-badge" aria-label={pt ? `${n} ${n === 1 ? 'escolha pendente' : 'escolhas pendentes'}` : `${n} pending ${n === 1 ? 'choice' : 'choices'}`}>{n}</span> : null;
                    })()}
                  </button>
                  {!isOpen(g) && (
                    <button type="button" className="fh-tl-fold" aria-expanded={false} onClick={() => toggle(g)}>
                      <span className="fh-tl-fold-k">{classesAt(seq, g.level).filter(c => c.up).map(c => `${tName('class', c.id, lang)} ${c.level}`).join(' · ') || (pt ? `Nível ${g.level}` : `Level ${g.level}`)}</span>
                      <span className="fh-tl-fold-n">{g.entries.length} {pt ? (g.entries.length === 1 ? 'traço' : 'traços') : (g.entries.length === 1 ? 'feature' : 'features')}{g.level > now ? (pt ? (g.entries.length === 1 ? ' futuro' : ' futuros') : ' ahead') : ''}{g.entries.some(e => e.pending) ? (pt ? ' · pendente' : ' · pending') : ''}</span>
                      <Icon name="chevron-down" size={14} aria-hidden="true" />
                    </button>
                  )}
                  {isOpen(g) && <div className="fh-tl-body">
                    {/* classes neste nível, em texto (não é botão: subir de nível é o botão dourado no
                        pé do painel). Em multiclasse, "+1" marca a classe que subiu neste nível. */}
                    {classesAt(seq, g.level).length > 0 && (
                      <div className="fh-tl-classes">
                        {classesAt(seq, g.level).map((c, _i, all) => (
                          <span key={c.id} className={`fh-tl-cls${c.up ? ' is-up' : ''}`}
                            title={c.up ? (pt ? 'Subiu nesta classe neste nível' : 'Leveled this class here') : undefined}>
                            {tName('class', c.id, lang)} {c.level}
                            {c.up && all.length > 1 && <span className="fh-tl-plus">+1<span className="sr-only">{pt ? ' (subiu neste nível)' : ' (leveled up here)'}</span></span>}
                          </span>
                        ))}
                      </div>
                    )}
                    {g.entries.length > 0 && (
                      <FhFeatures items={[]} lang={lang} label={null}>
                        {g.entries.map(e => (
                          <FhFeatureItem key={e.key} item={itemOf(e)} lang={lang}
                            tag={<>
                              <span className={`fh-tl-tag is-${e.kind}${e.pending ? ' is-pending' : ''}${e.later ? ' is-later' : ''}`}>{tagOf(e)}{e.later ? (pt ? ' · próximo' : ' · next') : ''}</span>
                              {actionOf(e)}
                              {changeOf(e)}
                            </>} />
                        ))}
                      </FhFeatures>
                    )}
                    {g.level === 1 && origin}
                  </div>}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      {subModalTarget && (
        <SubclassModal
          char={subModalTarget.view}
          lang={lang}
          subs={subModalTarget.subs}
          label={subModalTarget.label}
          landOnly={Boolean(localModal.landOnly)}
          update={(patch) => {
            const p = !subModalTarget.entry || subModalTarget.entry.primary
              ? patch
              : { multiclass: (char.multiclass || []).map(m => m.id === subModalTarget.entry.id ? { ...m, ...patch } : m) };
            // o pedido diz o resultado ("Círculo das Estrelas → Círculo dos Sonhos"), não só "troca"
            const nameOf = (id, l) => subModalTarget.subs.find(s => s.id === id)?.name?.[l] || '';
            const land = (id, l) => (subModalTarget.subs.find(s => s.id === 'land')?.landTypes || []).find(x => x.id === id)?.name?.[l] || '';
            const title = (l) => {
              const base = subModalTarget.label[l];
              if (patch.subclass && patch.subclass !== subModalTarget.view.subclass) {
                const from = nameOf(subModalTarget.view.subclass, l);
                return `${base}: ${from ? `${from} → ` : ''}${nameOf(patch.subclass, l)}${patch.landType ? ` (${land(patch.landType, l)})` : ''}`;
              }
              if (patch.landType) return `${l === 'pt' ? 'Terreno' : 'Terrain'}: ${land(patch.landType, l)}`;
              return l === 'pt' ? 'Troca de subclasse' : 'Subclass changed';
            };
            applyChange(p, title('pt'), title('en'));
          }}
          askDm={!!respec?.submit && !!char.inCampaign}
          onClose={() => setLocalModal(null)}
        />
      )}
      {localModal?.kind === 'classSkills' && (
        <TimelineClassSkillsModal
          char={char}
          lang={lang}
          askDm={!!respec?.submit && !!char.inCampaign}
          onConfirm={(after) => applyChange(after, 'Perícias da classe alteradas', 'Class skills changed')}
          onClose={() => setLocalModal(null)}
        />
      )}
      {localModal?.kind === 'background' && (
        <TimelineBackgroundModal
          char={char}
          lang={lang}
          askDm={!!respec?.submit && !!char.inCampaign}
          onConfirm={(after) => applyChange(after, 'Antecedente e escolhas alterados', 'Background choices changed')}
          onClose={() => setLocalModal(null)}
        />
      )}
      {localModal?.kind === 'species' && update && (
        <SpeciesChoicesModal char={char} lang={lang} onClose={() => setLocalModal(null)} onSave={(p) => update(p)} />
      )}
      {localModal?.kind === 'origin' && localModal.index >= 0 && update && (
        <OriginFeatModal char={char} index={localModal.index} lang={lang}
          onConfirm={(after) => update(after)} onClose={() => setLocalModal(null)} />
      )}
    </section>
  );
};

export const SheetFeatures = ({ char, lang, placed, cls, race, update }) => {
  return (
    <div className="fh-scope-content fh-scope-features">
      {/* Tudo numa linha do tempo por nível, agrupada nos tiers de jogo: traços de classe,
          espécie, antecedente, talentos e, no nível 1, idiomas, proficiências e escolhas */}
      <FeatureTimeline char={char} lang={lang} placed={placed} cls={cls} race={race} update={update}
        title={lang === 'pt' ? 'Características' : 'Features'} />
    </div>
  );
};

export const SheetStats = SheetAbilities;
