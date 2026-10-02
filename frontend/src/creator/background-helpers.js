/*
 * Lógica pura das etapas "Antecedente" e "Talento de origem" da criação
 * (sem React). Ver README.md.
 *
 * Campos usados no char:
 *   background, skillProfs, toolProfs, feats (talento com origin: 'background'),
 *   raceBonus (2024: bônus do antecedente), languages, originFeat (nome do talento),
 *   creation.bgSkillsAdded   perícias que o antecedente realmente acrescentou a skillProfs
 *                             (as que a classe já tinha ficam de fora, para não apagar a escolha da classe)
 *   creation.toolChoices.background  ferramentas escolhidas quando o antecedente dá "1 à escolha"
 *   creation.backgroundPack  pacote de equipamento do antecedente (apagado ao trocar)
 */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { findFeat } from '../../data/feats.js';
import { tName } from '../../data/i18n.js';
import {
  originFeatFromText, featChoiceSpecs, featPicksIssues, featTakenIssue,
} from '../progression/feat-rules.js';
import { classStart, backgroundStart, toolName, TOOL_CATEGORIES } from './start-data.js';
import { dropPack } from './equipment-helpers.js';

const uniq = (a) => [...new Set(a)];
const is2024 = (char) => char?.rulesVersion !== '2014';

// ---------------------------------------------------------------------------
// Dados do antecedente
// ---------------------------------------------------------------------------
export const backgroundList = (char) => Utils.backgrounds(char) || [];
export const findBackground = (char, id = char?.background) => backgroundList(char).find(b => b.id === id) || null;

/** Ferramentas do antecedente: { fixed, choose, from, category }. */
export function backgroundTool(char, id = char?.background) {
  const t = backgroundStart(char, id)?.tool;
  return { fixed: t?.fixed || [], choose: t?.choose || 0, from: t?.from || [], category: t?.category || null };
}

/** Ferramentas escolhidas para o antecedente (quando ele dá "1 à escolha"). */
export const chosenBackgroundTools = (char) => {
  const v = char?.creation?.toolChoices?.background;
  return Array.isArray(v) ? v : [];
};

/** Todas as ferramentas que vêm do antecedente atual (fixas + escolhidas). */
export const backgroundToolIds = (char) => uniq([...backgroundTool(char).fixed, ...chosenBackgroundTools(char)]);

/** Ferramentas que vêm da classe (fixas + escolha registrada em creation.toolChoices.class). */
function classToolIds(char) {
  const c = classStart(char)?.tools;
  const chosen = char?.creation?.toolChoices?.class;
  return uniq([...(c?.fixed || []), ...(Array.isArray(chosen) ? chosen : [])]);
}

/** Nome curto da categoria de ferramenta à escolha ("ferramenta de artesão", "instrumento musical ou jogo"). */
export function toolCategoryName(category, lang) {
  const k = lang === 'pt' ? 'pt' : 'en';
  if (category === 'instrumentOrGaming') return `${TOOL_CATEGORIES.instrument[k]} ${lang === 'pt' ? 'ou' : 'or'} ${TOOL_CATEGORIES.gaming[k]}`;
  if (category === 'artisanOrInstrument') return `${TOOL_CATEGORIES.artisan[k]} ${lang === 'pt' ? 'ou' : 'or'} ${TOOL_CATEGORIES.instrument[k]}`;
  return TOOL_CATEGORIES[category]?.[k] || (lang === 'pt' ? 'ferramenta' : 'tool');
}

/** Texto da ferramenta do antecedente para o cartão ("Ferramentas de Ladrão + 1 jogo à escolha"). */
export function backgroundToolText(char, id, lang) {
  const t = backgroundTool(char, id);
  const parts = t.fixed.map(x => toolName(x, lang));
  if (t.choose) parts.push(lang === 'pt' ? `${t.choose} ${toolCategoryName(t.category, lang)} à escolha` : `${t.choose} ${toolCategoryName(t.category, lang)} of your choice`);
  return parts.join(' + ');
}

/** Talento de origem (2024) do antecedente: { feat, picks } ou null. */
export const backgroundOriginFeat = (b) => (b?.feat ? originFeatFromText(b.feat) : null);

/** Uma linha simples (resumo próprio) do que cada talento de origem 2024 faz. */
export const ORIGIN_FEAT_LINE = {
  alert: { pt: 'Age mais cedo nas lutas: soma +2 na Iniciativa.', en: 'Act earlier in fights: +2 to Initiative.' },
  crafter: { pt: 'Treino em 3 ferramentas de artesão e desconto nas compras.', en: "Training with 3 artisan's tools and discounts when buying." },
  healer: { pt: 'Cura melhor os aliados usando um Kit de Curandeiro.', en: "Heals allies better with a Healer's Kit." },
  lucky: { pt: 'Alguns pontos de sorte para rolar com vantagem quando importa.', en: 'A few luck points to roll with advantage when it matters.' },
  magicInitiate: { pt: 'Aprende 2 truques e 1 magia simples, mesmo sem ser conjurador.', en: 'Learn 2 cantrips and 1 simple spell, even if you are not a caster.' },
  musician: { pt: 'Toca 3 instrumentos e anima os aliados depois de descansar.', en: 'Play 3 instruments and inspire allies after a rest.' },
  savageAttacker: { pt: 'Uma vez por turno, rola o dano da arma duas vezes e fica com o melhor.', en: 'Once per turn, roll weapon damage twice and keep the better one.' },
  skilled: { pt: 'Treino em mais 3 perícias ou ferramentas à sua escolha.', en: 'Training in 3 more skills or tools of your choice.' },
  tavernBrawler: { pt: 'Socos mais fortes, e pode empurrar quem você acertar.', en: 'Stronger punches, and you can shove whoever you hit.' },
  tough: { pt: 'Mais vida: +2 Pontos de Vida por nível.', en: 'More health: +2 Hit Points per level.' },
};

/**
 * O antecedente combina com a classe? 2024: um dos 3 atributos é atributo
 * principal da classe. 2014 (sem atributos): uma das perícias usa o atributo principal.
 */
export function fitsClass(char, b) {
  const primary = classStart(char)?.primary || [];
  if (!b || !primary.length) return false;
  if (is2024(char) && Array.isArray(b.abilities)) return b.abilities.some(a => primary.includes(a));
  return (b.skills || []).some(s => primary.includes(SRD.SKILLS.find(k => k.id === s)?.stat));
}

// ---------------------------------------------------------------------------
// Talento de origem
// ---------------------------------------------------------------------------
export const originEntry = (char) => (char?.feats || []).find(f => f?.origin === 'background') || null;

/** Troca o talento de origem pelo do antecedente b (igual a components/Creator.jsx). */
export function withOriginFeat(feats, b) {
  const rest = (feats || []).filter(f => f?.origin !== 'background');
  const o = backgroundOriginFeat(b);
  if (!o) return rest;
  return [...rest, { name: b.feat, id: o.feat.id, level: 1, origin: 'background', note: '', ...(Object.keys(o.picks).length ? { picks: o.picks } : {}) }];
}

/** Sub-escolhas do talento de origem que o jogador faz (sem as já fixadas pelo antecedente, ex.: lista do Iniciado em Magia). */
export function originFeatSpecs(char) {
  const e = originEntry(char);
  const feat = e?.id ? findFeat(e.id) : null;
  if (!feat) return [];
  const fixed = Object.keys(originFeatFromText(e.name)?.picks || {});
  return featChoiceSpecs(feat, 1).filter(c => !fixed.includes(c.key));
}

/** A etapa "Talento de origem" aparece? (2024, com talento que tem escolhas) */
export const originFeatApplies = (char) => is2024(char) && originFeatSpecs(char).length > 0;

/**
 * O talento de origem repete um talento que a ficha já tem (ex.: Humano
 * Versátil escolheu Habilidoso? Pode, é repetível. Escolheu Alerta e o
 * antecedente também dá Alerta? Não pode). Devolve o talento ou null.
 */
export function originFeatConflict(char) {
  const e = originEntry(char);
  const feat = e?.id ? findFeat(e.id) : null;
  if (!feat) return null;
  const others = { ...char, feats: (char.feats || []).filter(f => f !== e) };
  return featTakenIssue(others, feat, e.picks || {}) ? feat : null;
}

const KEY_TEXT = {
  cantrip: ['truque', 'truques', 'cantrip', 'cantrips'],
  spell: ['magia de 1º círculo', 'magias de 1º círculo', 'level 1 spell', 'level 1 spells'],
  skill: ['perícia', 'perícias', 'skill', 'skills'],
  skillOrTool: ['perícia ou ferramenta', 'perícias ou ferramentas', 'skill or tool', 'skills or tools'],
  tool: ['ferramenta', 'ferramentas', 'tool', 'tools'],
  instrument: ['instrumento musical', 'instrumentos musicais', 'musical instrument', 'musical instruments'],
};

/** Sem as sub-escolhas do talento de origem (para saber o que o jogador já tinha antes dele). */
const withoutOriginPicks = (char) => {
  const e = originEntry(char);
  return e ? { ...char, feats: (char.feats || []).map(f => (f === e ? { ...f, picks: originFeatFromText(e.name)?.picks || {} } : f)) } : char;
};

/** Perícias/ferramentas escolhidas no talento que o personagem já tinha por outro lado. */
export function originFeatRepeats(char) {
  const e = originEntry(char);
  if (!e) return [];
  const base = withoutOriginPicks(char);
  const tools = new Set([...(char.toolProfs || []), ...(Utils.classGrants(base).tools || [])]);
  const p = e.picks || {};
  const skillIds = new Set(SRD.SKILLS.map(s => s.id));
  const out = [];
  for (const key of ['skill', 'skillOrTool', 'tool', 'instrument']) {
    for (const id of Array.isArray(p[key]) ? p[key] : []) {
      if (skillIds.has(id) ? Utils.hasSkillProf(base, id) : tools.has(id)) out.push(id);
    }
  }
  return uniq(out);
}

const plural = (n, one, many) => (n === 1 ? one : many);

/** O que falta no talento de origem, em linguagem simples: [{ pt, en }]. */
export function originFeatIssues(char) {
  const e = originEntry(char);
  const feat = e?.id ? findFeat(e.id) : null;
  if (!feat || !is2024(char)) return [];
  const out = [];
  const picks = e.picks || {};
  for (const c of originFeatSpecs(char)) {
    const v = picks[c.key];
    if (c.single) {
      if (typeof v !== 'string' || !c.options.includes(v)) {
        out.push(c.key === 'spellAbility'
          ? { pt: 'Escolha qual atributo suas magias do talento vão usar (Inteligência, Sabedoria ou Carisma).', en: 'Choose which ability your feat spells use (Intelligence, Wisdom or Charisma).' }
          : { pt: `Faça a escolha de "${c.key}" do talento ${feat.name.pt}.`, en: `Make the "${c.key}" choice of the ${feat.name.en} feat.` });
      }
      continue;
    }
    const n = c.count - (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).length : 0);
    const t = KEY_TEXT[c.key] || [c.key, c.key, c.key, c.key];
    if (n > 0) out.push({ pt: `Escolha mais ${n} ${plural(n, t[0], t[1])} no talento ${feat.name.pt}.`, en: `Pick ${n} more ${plural(n, t[2], t[3])} in the ${feat.name.en} feat.` });
    else if (n < 0) out.push({ pt: `Você marcou ${-n} ${plural(-n, t[0], t[1])} a mais no talento ${feat.name.pt}. Desmarque ${-n}.`, en: `You picked ${-n} too many ${t[3]} in the ${feat.name.en} feat. Unselect ${-n}.` });
  }
  // Qualquer outro problema (opção inválida, repetida) que o validador geral encontre.
  if (!out.length && featPicksIssues(feat, picks, 1).length) {
    out.push({ pt: `Revise as escolhas do talento ${feat.name.pt}: alguma opção não vale.`, en: `Review your ${feat.name.en} choices: an option isn't valid.` });
  }
  const rep = originFeatRepeats(char);
  if (rep.length) {
    const names = (lang) => rep.map(id => (SRD.SKILLS.some(s => s.id === id) ? skillLabel(id, lang) : toolName(id, lang))).join(', ');
    out.push({ pt: `Você já tem treino em ${names('pt')}. Troque por algo novo no talento.`, en: `You're already trained in ${names('en')}. Swap it for something new in the feat.` });
  }
  return out;
}

const skillLabel = (id, lang) => tName('skill', id, lang);

// ---------------------------------------------------------------------------
// Aplicar / trocar antecedente
// ---------------------------------------------------------------------------
/**
 * Patch para escolher o antecedente `bgId`. Escolher o mesmo antecedente de
 * novo não muda nada (não apaga a distribuição de +2/+1 nem o talento).
 */
export function applyBackground(char, bgId) {
  if (!bgId || bgId === char.background) return {};
  const b = findBackground(char, bgId);
  if (!b) return {};
  const creation = { ...(char.creation || {}) };

  // Perícias: tira as que o antecedente anterior acrescentou e põe as do novo
  // (as que a classe já tinha não são "acrescentadas" e continuam da classe).
  const oldAdded = Array.isArray(creation.bgSkillsAdded) ? creation.bgSkillsAdded : Utils.backgroundSkills(char);
  const kept = (char.skillProfs || []).filter(s => !oldAdded.includes(s));
  const added = (b.skills || []).filter(s => !kept.includes(s));
  creation.bgSkillsAdded = added;

  // Ferramentas: tira as do antecedente anterior (menos as que a classe também dá) e põe as fixas do novo.
  const oldTools = backgroundToolIds(char);
  const classTools = classToolIds(char);
  const keptTools = (char.toolProfs || []).filter(t => !oldTools.includes(t) || classTools.includes(t));
  creation.toolChoices = { ...(creation.toolChoices || {}), background: [] };
  const toolProfs = uniq([...keptTools, ...backgroundTool(char, bgId).fixed]);

  // Pacote de equipamento do antecedente anterior deixa de valer (itens e ouro recalculados).
  const equip = dropPack({ ...char, creation }, 'backgroundPack');

  const patch = {
    background: b.id,
    skillProfs: uniq([...kept, ...added]),
    toolProfs,
    ...equip,
    ...(is2024(char) ? { raceBonus: {}, originFeat: b.feat, feats: withOriginFeat(char.feats, b) } : {}),
  };
  // Idiomas a mais (ex.: 2014, Sábio dá 2 e o novo antecedente dá 0).
  if (typeof Utils.trimLanguages === 'function') patch.languages = Utils.trimLanguages({ ...char, ...patch });
  return patch;
}

/** Marca/desmarca uma ferramenta da escolha do antecedente. */
export function toggleBackgroundTool(char, toolId) {
  const t = backgroundTool(char);
  if (!t.choose || !t.from.includes(toolId)) return {};
  const cur = chosenBackgroundTools(char);
  let next;
  if (cur.includes(toolId)) next = cur.filter(x => x !== toolId);
  else if (t.choose === 1) next = [toolId];
  else if (cur.length < t.choose) next = [...cur, toolId];
  else return {};
  const classTools = classToolIds(char);
  const removed = cur.filter(x => !next.includes(x) && !classTools.includes(x) && !t.fixed.includes(x));
  const toolProfs = uniq([...(char.toolProfs || []).filter(x => !removed.includes(x)), ...next]);
  const creation = { ...(char.creation || {}), toolChoices: { ...(char.creation?.toolChoices || {}), background: next } };
  return { toolProfs, creation };
}

/** Perícias do antecedente que já tinham sido escolhidas na etapa de classe. */
export function skillOverlap(char) {
  const b = findBackground(char);
  if (!b) return [];
  const added = Array.isArray(char.creation?.bgSkillsAdded) ? char.creation.bgSkillsAdded : b.skills;
  return (b.skills || []).filter(s => !added.includes(s) && (char.skillProfs || []).includes(s));
}

/** O que falta na etapa Antecedente: [{ pt, en }]. */
export function backgroundIssues(char) {
  const b = findBackground(char);
  if (!b) return [{ pt: 'Escolha um antecedente: toque em um dos cartões.', en: 'Choose a background: tap one of the cards.' }];
  const out = [];
  const t = backgroundTool(char);
  if (t.choose) {
    const n = t.choose - chosenBackgroundTools(char).filter(x => t.from.includes(x)).length;
    if (n > 0) {
      out.push({
        pt: `Escolha ${n} ${toolCategoryName(t.category, 'pt')} que seu antecedente ensina (lista abaixo dos cartões).`,
        en: `Choose ${n} ${toolCategoryName(t.category, 'en')} your background teaches (list below the cards).`,
      });
    }
  }
  if (is2024(char)) {
    const dup = originFeatConflict(char);
    if (dup) {
      out.push({
        pt: `Você já tem o talento ${dup.name.pt} (da espécie). Escolha outro antecedente ou troque o talento da espécie.`,
        en: `You already have the ${dup.name.en} feat (from your species). Pick another background or change the species feat.`,
      });
    }
  }
  return out;
}
