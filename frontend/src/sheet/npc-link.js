// Ficha do mestre → NPC no Mundo da campanha, sem depender do servidor novo: o cartão
// de NPC é criado/atualizado pela API do Mundo (que existe desde a 1ª versão) e
// referencia a ficha pela tag `ficha:<id>`. O corpo leva um retrato da ficha (números,
// perícias, magias) para quem tem acesso à campanha ler com detalhe; o mestre abre a
// ficha inteira pelo link (#ficha=<id>).
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import { prepApi } from '../prep/prep-api.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
export const sheetTag = (id) => `ficha:${id}`;
export const sheetIdFromTags = (tags) => {
  const tg = (tags || []).find(x => /^ficha:\d+$/.test(String(x)));
  return tg ? Number(String(tg).slice(6)) : null;
};
export const findNpcEntry = (entries, charId) =>
  (entries || []).find(e => e && e.kind === 'npc' && sheetIdFromTags(e.tags) === Number(charId)) || null;

const safe = (fn, fb = null) => { try { const v = fn(); return v == null || Number.isNaN(v) ? fb : v; } catch { return fb; } };
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const clip = (s, n) => String(s || '').trim().slice(0, n);

/** Linha de classes: "Bruxo 9 (O Corruptor) / Feiticeiro 3". */
function classLine(char, lang) {
  return safe(() => Utils.classEntries(char).map(e => {
    const sub = e.subclass ? ` (${tName('subclass', e.subclass, lang) || e.subclass})` : '';
    return `${tName('class', e.id, lang)} ${e.level}${sub}`;
  }).join(' / '), char.className || '');
}

/** Campos do cartão de NPC tirados da ficha (o que existir). */
export function npcFromSheet(char, lang = 'pt') {
  const species = char.race ? (tName('race', char.race, lang) || char.race) : '';
  const bg = char.background ? (tName('background', char.background, lang) || char.background) : '';
  const cls = classLine(char, lang);
  const align = char.alignment ? tName('alignment', char.alignment, lang) : '';
  const summary = [species && (bg ? `${species} (${bg})` : species), cls, align].filter(Boolean).join(', ');
  const scores = Object.fromEntries(ABIL.map(k => [k, safe(() => Utils.abilityWithRace(char, k), 10)]));
  const ac = safe(() => Utils.computeAc(char), char.armorClass ?? 10);
  const hp = char.maxHp ?? null;
  const pb = safe(() => Utils.profBonus(char), 2);
  const speed = safe(() => Utils.speed(char), 30);
  const skills = safe(() => SRD.SKILLS.filter(s => Utils.hasSkillProf(char, s.id))
    .map(s => `${tName('skill', s.id, lang) || s.id} ${Utils.fmtMod(Utils.skillBonus(char, s.id))}`), []);
  const saves = safe(() => ABIL.filter(k => Utils.hasSaveProf(char, k)).map(k => `${k.toUpperCase()} ${Utils.fmtMod(Utils.saveBonus(char, k))}`), []);
  const langs = safe(() => Utils.languagesFor(char).map(l => Utils.languageLabel ? Utils.languageLabel(l, lang) : l), []);
  const catalog = safe(() => Utils.spellCatalog(char), []);
  const spells = (char.spells || []).filter(s => s.prepared !== false)
    .map(s => catalog.find(x => x.id === s.id)).filter(Boolean)
    .sort((a, b) => a.level - b.level)
    .map(sp => `${tName('spellName', sp.id, lang)}${sp.level ? ` (${sp.level})` : ''}`);
  const ab = safe(() => Utils.spellcastingAbility(char), null);
  const dc = ab ? 8 + pb + safe(() => Utils.abilityMod(char, ab), 0) : null;

  const lines = [
    `📜 ${L(lang, 'Ficha de referência', 'Reference sheet')} — ${char.name}`,
    [cls, species && `${species}${bg ? ` (${bg})` : ''}`, align].filter(Boolean).join(' · '),
    `${L(lang, 'CA', 'AC')} ${ac} · ${L(lang, 'PV', 'HP')} ${hp ?? '—'} · ${L(lang, 'Deslocamento', 'Speed')} ${speed} ft · ${L(lang, 'Proficiência', 'Proficiency')} ${Utils.fmtMod(pb)}`,
    ABIL.map(k => `${k.toUpperCase()} ${scores[k]} (${Utils.fmtMod(Utils.mod(scores[k]))})`).join(' · '),
    saves.length ? `${L(lang, 'Salvaguardas', 'Saving throws')}: ${saves.join(', ')}` : '',
    skills.length ? `${L(lang, 'Perícias', 'Skills')}: ${skills.join(', ')}` : '',
    langs.length ? `${L(lang, 'Idiomas', 'Languages')}: ${langs.join(', ')}` : '',
    dc ? `${L(lang, 'Conjuração', 'Spellcasting')}: ${L(lang, 'CD', 'DC')} ${dc}, ${L(lang, 'ataque', 'attack')} ${Utils.fmtMod(dc - 8)}` : '',
    spells.length ? `${L(lang, 'Magias', 'Spells')}: ${spells.join(', ')}` : '',
  ].filter(Boolean);
  const story = [char.backstory, char.notes].map(x => String(x || '').trim()).filter(Boolean);
  const body = [...story, lines.join('\n')].join('\n\n');

  return {
    kind: 'npc',
    name: clip(char.name, 120),
    summary: clip(summary || 'NPC', 280),
    body: clip(body, 20000),
    tags: ['npc', sheetTag(char.id)],
    data: {
      role: clip(cls || 'NPC', 80),
      appearance: clip(char.appearance, 600),
      mannerism: clip([char.personality, char.flaws].filter(Boolean).join(' · '), 300),
      wants: clip([char.ideals, char.bonds].filter(Boolean).join(' · '), 600),
      statblock: { ac, hp, speed, pb, ...scores, skills, saves, languages: langs, spellDc: dc, spells },
    },
  };
}

/** Situação da ficha numa mesa que a pessoa mestra: entrada de NPC (ou null). */
export async function npcStatus(campaignId, charId) {
  const r = await prepApi.listWorld(campaignId);
  const list = r?.entries || r?.world || (Array.isArray(r) ? r : []);
  return findNpcEntry(list, charId);
}

/** Cria ou atualiza o NPC desta ficha no Mundo; devolve a entrada. */
export async function upsertNpc(campaignId, char, lang, existing = null) {
  const fields = npcFromSheet(char, lang);
  const prev = existing || await npcStatus(campaignId, char.id);
  let entry;
  if (prev) {
    const keepTags = (prev.tags || []).filter(t => !/^ficha:\d+$/.test(String(t)) && t !== 'npc');
    const r = await prepApi.updateEntry(prev.id, { ...fields, tags: [...fields.tags, ...keepTags], data: { ...(prev.data || {}), ...fields.data } });
    entry = r?.entry || { ...prev, ...fields };
  } else {
    const r = await prepApi.createEntry(campaignId, { ...fields, visibility: 'revealed' });
    entry = r?.entry || r;
  }
  // retrato da ficha vira a imagem do cartão (só foto enviada; arte do site fica de fora)
  if (entry?.id && typeof char.avatar === 'string' && char.avatar.startsWith('data:image/')) {
    try { await prepApi.putEntryImage(entry.id, char.avatar); } catch { /* imagem é opcional */ }
  }
  return entry;
}

export async function removeNpc(entryId) {
  await prepApi.deleteEntry(entryId);
}
