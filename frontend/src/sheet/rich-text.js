/* Parser puro do texto de regra (sem React): usado por src/sheet/rich-text.jsx. */
const SIZE = /^(Tiny|Small|Medium|Large|Huge|Gargantuan|Miúd[oa]|Pequen[oa]|Médi[oa]|Grande|Enorme|Imens[oa])\b[^.]{0,80}$/;
const MD_HEAD = /^#{1,6}\s+(.+)$/;
export const BULLET = /^[•▪◦*-]\s+(.+)$/;
const EYEBROW = /^(\d+(st|nd|rd|th)-level [^.]{2,40} feature|Característica d[aeo] [^.]{2,40} de \d+º nível)$/i;
const SB_SECTION = /^(traits|actions|bonus actions|reactions|legendary actions|traços|ações|ações bônus|ações bonus|reações|ações lendárias)$/i;
const SB_LABELS = [
  'Armor Class', 'Hit Points', 'Speed', 'Saving Throws', 'Skills', 'Damage Vulnerabilities', 'Damage Resistances',
  'Damage Immunities', 'Condition Immunities', 'Immunities', 'Resistances', 'Vulnerabilities', 'Senses', 'Languages',
  'Challenge', 'Proficiency Bonus', 'Initiative', 'Gear', 'AC', 'HP', 'CR', 'PB',
  'Classe de Armadura', 'Pontos de Vida', 'Deslocamento', 'Testes de Resistência', 'Salvaguardas', 'Perícias',
  'Vulnerabilidades a Dano', 'Resistências a Dano', 'Imunidades a Dano', 'Imunidades a Condição', 'Imunidades',
  'Resistências', 'Vulnerabilidades', 'Sentidos', 'Idiomas', 'Nível de Desafio', 'Bônus de Proficiência',
  'Iniciativa', 'Equipamento', 'CA', 'PV', 'ND', 'BP',
].sort((a, b) => b.length - a.length);
// Começos de frase comuns: "You can." não é um nome em negrito.
const NOT_LEAD = /^(you|the|a|an|if|when|at|as|this|it|its|each|on|in|for|while|once|until|you're|você|o|os|as|um|uma|se|quando|no|na|nos|nas|como|isso|isto|cada|ele|ela|enquanto|até|para|por|em|ao)\b/i;

const isCaps = (s) => s.length <= 70 && /\p{Lu}.*\p{Lu}/u.test(s) && !/\p{Ll}/u.test(s) && !/[.!?:]$/.test(s) && !/^[\d\s|+–-]+$/.test(s);
const isRow = (s) => s.includes('|') && s.split('|').filter(c => c.trim()).length >= 2;
const cells = (s) => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
const isSep = (s) => cells(s).every(c => /^:?-{2,}:?$/.test(c));
const shortTitle = (s) => s && s.length <= 48 && !/[.!?:;,]$/.test(s) && !isRow(s) && !BULLET.test(s) && /^\p{Lu}/u.test(s);

/** "Healing. The drinker…" → ['Healing.', 'The drinker…'] (ou null). */
export function splitLead(s) {
  const m = /^([\p{Lu}][^.!?:]{0,46}?[.:])\s+(?=[\p{Lu}\d(])/u.exec(s);
  if (!m) return null;
  const lead = m[1];
  if (lead.split(/\s+/).length > 7 || NOT_LEAD.test(lead) || /\d+(st|nd|rd|th)$/.test(lead.slice(0, -1))) return null;
  return [lead, s.slice(m[0].length)];
}

/** Texto do catálogo → blocos [{t:'p'|'h'|'ul'|'table'|'eyebrow'|'sb', …}]. */
export function parseRich(text) {
  let src = String(text ?? '').replace(/\r/g, '');
  // Texto achatado numa linha só: "… spells. #### Cantrips You know…" → quebra antes do "####".
  if (!src.includes('\n')) src = src.replace(/\s+(?=#{2,6}\s)/g, '\n');
  const lines = src.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    // Ficha de criatura: título curto + linha de tamanho/tipo. Vai até o fim do texto.
    if (shortTitle(l) && SIZE.test(lines[i + 1] || '')) {
      out.push(parseStatblock(l, lines[i + 1], lines.slice(i + 2)));
      break;
    }
    if (isRow(l)) {
      const rows = [];
      while (i < lines.length && isRow(lines[i])) { if (!isSep(lines[i])) rows.push(cells(lines[i])); i++; }
      const prev = out[out.length - 1];
      const caption = prev?.t === 'p' && shortTitle(prev.text) ? (out.pop(), prev.text) : null;
      out.push({ t: 'table', caption, head: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (BULLET.test(l)) {
      const items = [];
      while (i < lines.length && BULLET.test(lines[i])) { items.push(BULLET.exec(lines[i])[1]); i++; }
      out.push({ t: 'ul', items });
      continue;
    }
    const h = MD_HEAD.exec(l);
    if (h) out.push({ t: 'h', text: h[1] });
    else if (EYEBROW.test(l)) out.push({ t: 'eyebrow', text: l });
    else if (isCaps(l)) out.push({ t: 'h', text: l });
    else out.push({ t: 'p', text: l });
    i++;
  }
  return out;
}

function parseStatblock(name, meta, rest) {
  const sb = { t: 'sb', name, meta, props: [], abil: null, sections: [] };
  let cur = null; // seção atual (traços/ações); antes dela, propriedades
  for (let k = 0; k < rest.length; k++) {
    const raw = rest[k];
    const l = raw.replace(BULLET, '$1');
    if (isRow(l)) {
      const rows = [];
      while (k < rest.length && isRow(rest[k])) { if (!isSep(rest[k])) rows.push(cells(rest[k])); k++; }
      k--;
      if (!sb.abil && !cur) sb.abil = { head: rows[0], rows: rows.slice(1) };
      else if (cur) cur.entries.push({ table: rows });
      else sb.props.push({ table: rows });
      continue;
    }
    if (SB_SECTION.test(l) || (isCaps(l) && l.length < 30 && !/\d/.test(l) && !SB_LABELS.some(lb => l.startsWith(lb + " ")))) { cur = { name: l, entries: [] }; sb.sections.push(cur); continue; }
    if (/^MOD\s+SAVE$/i.test(l)) continue;
    // "Str 16 +3 +3 · Dex 10 +0 +0 · Con 15 +2 +2" (formato do SRD 5.2)
    if (/^(Str|Dex|Con|Int|Wis|Cha|For|Des|Sab|Car)\s+\d+/i.test(l) && l.includes('·')) {
      const row = l.split('·').map(c => c.trim());
      sb.abil2 = [...(sb.abil2 || []), ...row];
      continue;
    }
    const label = !cur && SB_LABELS.find(lb => l.startsWith(lb + ' ') || l === lb);
    if (label) { sb.props.push({ label, text: l.slice(label.length).trim() }); continue; }
    const lead = splitLead(l);
    const entry = lead ? { lead: lead[0], text: lead[1] } : { text: l };
    if (cur) cur.entries.push(entry);
    else sb.props.push(entry);
  }
  return sb;
}

