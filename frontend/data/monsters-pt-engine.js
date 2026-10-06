/**
 * Tradução para pt-BR dos textos de monstro do SRD 5.2.1 (traços, ações,
 * reações e ações lendárias).
 *
 * Como funciona: o texto em inglês é quebrado em linhas e frases; cada frase
 * tem as distâncias convertidas para metros (5 ft = 1,5 m) e os números
 * trocados por "#", virando uma chave. A chave é procurada no dicionário
 * (monsters-pt.js); frases de fórmula fixa (jogada de ataque, dano, cabeçalho
 * de teste de resistência…) são montadas por regra. Os números voltam no lugar
 * de cada "#" (ou "#1", "#2"… quando a ordem muda em português).
 *
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, licensed under CC-BY-4.0.
 * Tradução própria, não oficial.
 */

const NUM = /\d+(?:,\d+)?/g;

/** Pés → metros no padrão das regras em português (5 ft = 1,5 m). */
export function feetToMeters(ft) {
  const m = Math.round(Number(ft) * 0.3 * 10) / 10;
  return String(m).replace('.', ',');
}

/** Converte as distâncias de uma frase em inglês para metros (mantém a palavra da unidade). */
export function convertDistances(s) {
  return String(s)
    .replace(/(\d+)(?:\/(\d+))?(\+?)([ -])(ft|feet|foot)\b/g,
      (_, a, b, plus, sep, u) => `${feetToMeters(a)}${b ? '/' + feetToMeters(b) : ''}${plus}${sep}${u}`)
    .replace(/(\d+)([ -])(miles?|mile)\b/g, (_, a, sep, u) => `${String(Number(a) * 1.5).replace('.', ',')}${sep}${u}`);
}

export const keyOf = (s) => convertDistances(s).replace(NUM, '#');

function fill(tpl, nums) {
  if (/#\d/.test(tpl)) return tpl.replace(/#(\d)/g, (_, i) => nums[+i - 1] ?? '');
  let i = 0;
  return tpl.replace(/#/g, () => nums[i++] ?? '');
}

const ABILITY = {
  Strength: 'Força', Dexterity: 'Destreza', Constitution: 'Constituição',
  Intelligence: 'Inteligência', Wisdom: 'Sabedoria', Charisma: 'Carisma',
};
export const DAMAGE_PT = {
  Acid: 'Ácido', Bludgeoning: 'Contundente', Cold: 'Frio', Fire: 'Fogo', Force: 'Força',
  Lightning: 'Elétrico', Necrotic: 'Necrótico', Piercing: 'Perfurante', Poison: 'Veneno',
  Psychic: 'Psíquico', Radiant: 'Radiante', Slashing: 'Cortante', Thunder: 'Trovejante',
};
const DMG_OF = (t) => (['Cold', 'Fire', 'Force', 'Poison'].includes(t) ? `de dano de ${DAMAGE_PT[t]}` : `de dano ${DAMAGE_PT[t]}`);
const DMG_TYPES = Object.keys(DAMAGE_PT).join('|');
const DICE = String.raw`\d+d\d+(?: [+\-−] \d+)?`;
const DMG_ONE = new RegExp(String.raw`^(\d+)(?: \((${DICE})\))? (${DMG_TYPES}) damage`);
const DMG_PLUS = new RegExp(String.raw`^,? plus (\d+)(?: \((${DICE})\))? (${DMG_TYPES}) damage`);

const LABELS = [
  ['Failure or Success:', 'Falha ou Sucesso:'], ['First Failure:', 'Primeira Falha:'], ['First Failure', 'Primeira Falha:'],
  ['Second Failure:', 'Segunda Falha:'], ['Second Failure', 'Segunda Falha:'],
  ['Failure:', 'Falha:'], ['Success:', 'Sucesso:'], ['Hit or Miss:', 'Acerto ou Erro:'], ['Hit:', 'Acerto:'],
  ['Miss:', 'Erro:'], ['Trigger:', 'Gatilho:'], ['Response:', 'Resposta:'],
];

/**
 * Cria o tradutor a partir de { dict: { chaveEn: textoPt }, spells: { en: pt },
 * nouns: { 'dragon': ['dragão', 'm'] }, names: { Rend: 'Dilacerar' } }.
 * Devolve translate(textoEn) → textoPt | null (null quando alguma frase não
 * tem tradução). onMiss(chave) recebe cada frase que faltou.
 */
export function createTranslator({ dict = {}, spells = {}, nouns = {}, names = {} } = {}, onMiss = null) {
  const nounList = Object.keys(nouns).sort((a, b) => b.length - a.length);
  const nounRe = nounList.length
    ? new RegExp(String.raw`\b([Tt])he (${nounList.map(n => n.replace(/[-]/g, '\\-')).join('|')})\b`)
    : null;

  // "the dragon" → "the @" (só o primeiro substantivo de criatura da frase)
  function abstract(conv) {
    const m = nounRe && nounRe.exec(conv);
    if (!m) return null;
    const noun = m[2];
    const re = new RegExp(String.raw`\b([Tt])he ${noun.replace(/[-]/g, '\\-')}\b`, 'g');
    return { noun, text: conv.replace(re, (_, t) => `${t}he @`) };
  }

  function withNoun(tpl, noun) {
    const [pt, g] = nouns[noun];
    const f = g === 'f';
    const cap = (x) => x[0].toUpperCase() + x.slice(1);
    const art = { o: f ? 'a' : 'o', do: f ? 'da' : 'do', ao: f ? 'à' : 'ao', no: f ? 'na' : 'no', pelo: f ? 'pela' : 'pelo', um: f ? 'uma' : 'um' };
    return tpl.replace(/\{(O|o|Do|do|Ao|ao|No|no|pelo|Pelo|N|-o|um|o-|O-)\}/g, (_, t) => {
      if (t === 'N') return pt;
      if (t === '-o') return f ? 'a' : 'o';
      if (t === 'um') return art.um;
      if (t === 'o-') return art.o;
      if (t === 'O-') return cap(art.o);
      const low = t.toLowerCase();
      const w = `${art[low]} ${pt}`;
      return t === low ? w : cap(w);
    });
  }

  function keyFor(s) {
    const conv = convertDistances(s.trim());
    const k = conv.replace(NUM, '#');
    if (dict[k] != null) return k;
    const ab = abstract(conv);
    return ab ? ab.text.replace(NUM, '#') : k;
  }
  const miss = (s) => { if (onMiss) onMiss(keyFor(s)); return null; };

  const NUMW = { one: 'um', two: 'dois', three: 'três', four: 'quatro', five: 'cinco', six: 'seis' };
  const featName = (n) => names[n] || null;
  function multiattack(conv) {
    const ab = abstract(conv);
    if (!ab) return null;
    const m = /^The @ makes (.+)\.$/.exec(ab.text);
    if (!m) return null;
    const items = m[1].split(/, and |, | and /);
    const out = [];
    for (const it of items) {
      const x = /^(one|two|three|four|five|six) (.+?) attacks?$/.exec(it);
      if (!x || !featName(x[2])) return null;
      out.push(`${NUMW[x[1]]} ${x[1] === 'one' ? 'ataque' : 'ataques'} de ${featName(x[2])}`);
    }
    const list = out.length > 1 ? `${out.slice(0, -1).join(', ')} e ${out[out.length - 1]}` : out[0];
    return withNoun(`{O} faz ${list}.`, ab.noun);
  }

  const look = (s) => {
    const conv = convertDistances(s);
    const nums = conv.match(NUM) || [];
    const tpl = dict[conv.replace(NUM, '#')];
    if (tpl != null) return fill(tpl, nums);
    const ab = abstract(conv);
    if (ab) {
      const t2 = dict[ab.text.replace(NUM, '#')];
      if (t2 != null) return withNoun(fill(t2, nums), ab.noun);
    }
    return multiattack(conv);
  };

  function damageChain(s) {
    let m = DMG_ONE.exec(s);
    if (!m) return null;
    const part = (mm) => `${mm[1]}${mm[2] ? ` (${mm[2].replace('−', '-')})` : ''} ${DMG_OF(mm[3])}`;
    let out = part(m);
    let rest = s.slice(m[0].length);
    while ((m = DMG_PLUS.exec(rest))) { out += ` mais ${part(m)}`; rest = rest.slice(m[0].length); }
    if (rest === '.' || rest === '') return out + rest;
    const sp = /^\s/.test(rest) ? ' ' : '';
    const tail = look(rest.trim());
    return tail == null ? miss(rest) : out + sp + tail;
  }

  function sentence(s) {
    s = s.trim();
    if (!s) return '';
    const hit = look(s);
    if (hit != null) return hit;
    for (const [en, pt] of LABELS) {
      if (s.startsWith(en)) {
        const rest = s.slice(en.length).trim();
        if (!rest) return pt;
        const r = sentence(rest);
        return r == null ? null : `${pt} ${r}`;
      }
    }
    let m = /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:\s*(.*)$/.exec(s);
    if (m) {
      const r = m[2] ? sentence(m[2]) : '';
      return r == null ? null : `Teste de Resistência de ${ABILITY[m[1]]}:${r ? ' ' + r : ''}`;
    }
    m = /^(Melee or Ranged|Melee|Ranged) Attack Roll: ([+\-−]\d+)(?: to hit)?( \([^)]*\))?, (?:reach (\d+) (?:ft|feet)\.?(?:,? or range ([\d/]+) (?:ft|feet)\.?)?|range ([\d/]+) (?:ft|feet)\.?)\s*(.*)$/.exec(s);
    if (m) {
      const kind = { Melee: 'Corpo a Corpo', Ranged: 'à Distância', 'Melee or Ranged': 'Corpo a Corpo ou à Distância' }[m[1]];
      const cv = (x) => x.split('/').map(feetToMeters).join('/');
      let paren = '';
      if (m[3]) { const p = look(m[3].trim()); if (p == null) return miss(m[3]); paren = ' ' + p; }
      const reach = m[4] ? `alcance ${cv(m[4])} m${m[5] ? ` ou distância ${cv(m[5])} m` : ''}` : `distância ${cv(m[6])} m`;
      const head = `Jogada de Ataque ${kind}: ${m[2].replace('−', '-')}${paren}, ${reach}.`;
      if (!m[7]) return head;
      const r = damageChain(m[7]) ?? sentence(m[7]);
      return r == null ? null : `${head} ${r}`;
    }
    if (DMG_ONE.test(s)) return damageChain(s);
    return miss(s);
  }

  const spell = (name) => spells[name.trim()] || null;

  function line(l) {
    // "- **At Will:** Detect Magic, Light"
    const li = /^- \*\*(At Will|(\d+)\/Day(?: Each)?):\*\*\s*(.*)$/.exec(l);
    if (li) {
      const label = li[2] ? `${li[2]}/dia cada` : 'À vontade';
      if (!li[3]) return `- **${label}:**`;
      const names = li[3].split(/,\s*/).map(x => {
        const lvl = /^(.*?)( \((?:level|as a level) (\d+) version\))$/.exec(x);
        if (lvl) { const p = spell(lvl[1]); return p && `${p} (versão de nível ${lvl[3]})`; }
        return spell(x);
      });
      if (onMiss) li[3].split(/,\s*/).forEach((x, i) => { if (!names[i]) onMiss('SPELL:' + x); });
      return names.some(n => !n) ? null : `- **${label}:** ${names.join(', ')}`;
    }
    const whole = look(l);
    if (whole != null) return whole;
    const parts = l.split(/(?<=[.!?:])\s+(?=[A-Z"(*])/);
    const out = parts.map(sentence);
    return out.includes(null) ? null : out.join(' ');
  }

  return function translate(text) {
    if (!text) return '';
    const out = String(text).split('\n').map(l => (l.trim() ? line(l) : ''));
    return out.includes(null) ? null : out.join('\n');
  };
}

/** Lista as frases (chaves) sem tradução — usado nos testes e na manutenção. */
export function missingKeys(text, data) {
  const out = [];
  createTranslator(data, (k) => out.push(k))(text);
  return out;
}
