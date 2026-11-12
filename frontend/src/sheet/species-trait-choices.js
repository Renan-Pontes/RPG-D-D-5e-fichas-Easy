/**
 * Liga cada escolha da espécie (speciesChoiceSpecs) ao traço que a pede, para a linha do
 * tempo mostrar o valor escolhido no próprio traço (Instintos de Changeling → perícias,
 * Linhagem Élfica → linhagem…) e oferecer o botão de troca ali.
 *
 * Ordem: nome do traço no rótulo da escolha → linhagem/ancestral → assunto da escolha
 * (ferramenta, truque, atributo de conjuração, perícia, aumento de atributo, tamanho)
 * no nome e depois no texto do traço → "Traços de origem". Sem traço (-1), a escolha
 * fica só no bloco "Escolhas da espécie" do nível 1.
 */
const nrm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const txt = (v) => (v && typeof v === 'object' ? `${v.pt || ''} ${v.en || ''}` : String(v || ''));

const LINEAGE = /linhagem|lineage|legado|legacy|heranca|heritage/;
const ANCESTRY = /ancestral|ancestry|ancestor/;
// [regex no NOME do traço, regex no TEXTO do traço (ou null = só pelo nome)]
const BY_KEY = {
  tool: [/tool|ferrament/, /tool|ferrament/],
  cantrip: [/cantrip|truque/, /cantrip|truque/],
  spellAbility: [/magic|magia|psionic|lineage|linhagem|legacy|legado|spell|conjur/, /\bspell|magia/],
  skill: [/skill|instinct|instinto|recall|knowledge|conhecimento|curiosity|curiosidade|precision|precisao|senses|sentidos|intuition|intuicao|pericia/, /\bskill|pericia/],
  asi: [/ability score|valor de atributo/, /ability score|valor de atributo/],
  size: [/^size$|tamanho/, null],
  lineage: [LINEAGE, null],
  ancestry: [ANCESTRY, null],
};
const ORIGIN = /origin traits|tracos de origem/;

/** specs: [{ key, label: {pt,en} }]; traits: [{ name, desc }] → índice do traço por escolha. */
export function assignSpeciesChoices(traits = [], specs = []) {
  const names = traits.map(t => [txt(t?.name)].map(nrm)[0]);
  const bodies = traits.map(t => nrm(`${txt(t?.name)} ${txt(t?.desc)}`));
  return specs.map(c => {
    if (!traits.length) return -1;
    const labels = [c?.label?.pt, c?.label?.en, typeof c?.label === 'string' ? c.label : ''].filter(Boolean);
    for (const raw of labels) {
      const l = nrm(raw);
      const head = nrm(String(raw).split(':')[0]);
      const i = traits.findIndex(t => [t?.name?.pt, t?.name?.en, typeof t?.name === 'string' ? t.name : ''].filter(Boolean).map(nrm)
        .some(n => n && (l.startsWith(n) || (head && (n.startsWith(head) || head.startsWith(n))))));
      if (i >= 0) return i;
      for (const re of [LINEAGE, ANCESTRY]) {
        if (!re.test(l)) continue;
        const j = names.findIndex(n => re.test(n));
        if (j >= 0) return j;
      }
    }
    const [byNameRe, byBodyRe] = BY_KEY[c?.key] || [];
    if (byNameRe) {
      const byName = names.findIndex(n => byNameRe.test(n));
      if (byName >= 0) return byName;
    }
    if (byBodyRe) {
      const byBody = bodies.findIndex(b => byBodyRe.test(b));
      if (byBody >= 0) return byBody;
    }
    // sem traço próprio: "Traços de origem" (fichas compactas) ou fica só no bloco do nível 1
    return names.findIndex(n => ORIGIN.test(n));
  });
}
