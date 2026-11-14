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
  tool: [/tool|ferrament|tinker|engenhoc|artific|training|treinamento|reveler|foliao|specialized|especializad|precision|precisao|maker|criador/, /tool|ferrament|artisan|artesao|instrument/],
  cantrip: [/cantrip|truque|magic|magia|lineage|linhagem|legacy|legado|light|luz|astral|fogo/, /cantrip|truque/],
  astralFire: [/astral fire|fogo astral|magic|magia|cantrip|truque/, /sacred flame|chama sagrada|cantrip|truque/],
  spellAbility: [
    /^(?!.*(?:resist|ancestral)).*(?:hex magic|magia de bruxa|magic|magia|psionic|lineage|linhagem|legacy|legado|gift of the svirfneblin|dom dos svirfneblin|dadiva dos svirfneblin|spells of the mark|magias da marca|fey step|passo feerico|reach to the blaze|alcancar as chamas|call to the wave|chamado da onda|unending breath|mingle with the wind|merge with stone|child of the sea|guardian emblem|floral|mata|infernal|celestial|spell|conjur)/,
    /spellcasting ability|atributo de conjuracao|intelligence wisdom or charisma|inteligencia sabedoria ou carisma|\bspell\b|\bmagia\b/,
  ],
  skill: [/skill|instinct|instinto|recall|knowledge|conhecimento|curiosity|curiosidade|precision|precisao|senses|sentidos|intuition|intuicao|pericia|skillful|habilidos|versatil|ancestral|legacy|legado|training|treinamento|nature|lore/, /\bskill|pericia/],
  feat: [/versatile|versatil|skillful|habilidos|feat|talento/, /origin feat|talento de origem|\bfeat\b|\btalento\b/],
  asi: [/ability score|valor de atributo|asi|aumento/, /ability score|valor de atributo/],
  bonus: [/variable|variavel|darkvision|visao no escuro|skill|pericia/, /darkvision|visao no escuro/],
  legacy: [/legacy|legado|kobold|dracon/, /cantrip|truque|fear|medo|sorcery|craftiness/],
  descent: [/descent|descendencia|versatility|versatilidade|ancestr/, /half elf|meio elfo|elven|elfic/],
  trait: [/descent|descendencia|versatility|versatilidade|keen|training|cantrip|fleet/, /keen|training|cantrip|fleet/],
  season: [/fey step|passo feerico|trance|transe|season|estacao/, /autumn|outono|winter|inverno|spring|primavera|summer|verao/],
  enhancement1: [/animal enhancement|aprimoramento animal/, /manta glide|nimble climber|underwater/],
  enhancement5: [/animal enhancement|aprimoramento animal/, /grappling|carapace|acid spit/],
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
    if (byNameRe && byBodyRe) {
      const both = names.findIndex((n, idx) => byNameRe.test(n) && byBodyRe.test(bodies[idx]));
      if (both >= 0) return both;
    }
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
