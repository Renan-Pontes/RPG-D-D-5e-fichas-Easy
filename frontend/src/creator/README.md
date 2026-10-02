# Criação de personagem (assistente passo a passo)

Público: quem **nunca jogou D&D**. Um conceito novo por tela, linguagem simples,
todo termo técnico com `<Term>` (glossário), e o botão "Avançar" sempre diz o
que falta. Segue a ordem do PHB 2024 (Classe → Origem → Atributos → Detalhes) e
serve também para fichas 2014 (`char.rulesVersion`).

Só personagens **novos** usam este assistente. A edição de fichas existentes
continua em `components/Creator.jsx`.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `CreatorWizard.jsx` | Orquestra as etapas: barra de progresso com nomes, Voltar/Avançar, pula etapas que não se aplicam, botão Concluir só na revisão. |
| `steps.js` | Lista ordenada das etapas (importa cada `steps/*.jsx`). |
| `steps/<id>.jsx` | Uma etapa por arquivo (contrato abaixo). |
| `ui.jsx` | Peças comuns: `StepIntro`, `Term`, `ChoiceGrid`/`ChoiceCard`, `Callout`, `IssueList`, `L`. |
| `glossary.js` | Termos explicados em uma frase (pt/en). |
| `start-data.js` | Dados de início por regra: classe (perícias, proficiências, salvaguardas, equipamento A/B, magias no nível 1) e antecedente (ferramenta, equipamento, idiomas 2014). |
| `creation.js` | Funções puras: `newCharacter`, `finalizeCharacter` e helpers compartilhados. |

## Contrato de uma etapa

```js
// steps/skills.jsx
export default {
  id: 'skills',
  title: { pt: 'Perícias', en: 'Skills' },           // nome curto na barra de progresso
  applies: (char) => true,                             // opcional; false = etapa pulada
  issues: (char) => [{ pt: 'Escolha mais 2 perícias.', en: 'Pick 2 more skills.' }], // [] = pode avançar
  Comp: ({ char, set, lang }) => <div>…</div>,         // set(patch) faz merge raso em char
};
```

- `issues` é **pura** (sem React) e é a única trava do "Avançar"; a revisão
  final junta os `issues` de todas as etapas que se aplicam.
- Ao mudar algo de que outras etapas dependem, a etapa **limpa** o que ficou
  inválido (ex.: trocar a classe zera perícias de classe, magias, `classOptions`,
  subclasse e equipamento da classe).
- Textos sempre em pt e en (`lang === 'pt'`). Nada de jargão sem `<Term>`.
- Regras: `char.rulesVersion === '2024'` (SRD 5.2.1) ou `'2014'` (SRD 5.1).
  Para 2024 use os dados 2024 (nunca `SRD.CLASSES` para perícias/proficiências).

## Ordem das etapas

`welcome` (regras + progressão) → `class` → `classChoices` → `skills` →
`background` → `originFeat` → `species` → `speciesChoices` → `languages` →
`abilities` (gerar valores) → `abilityBonus` (+2/+1 do antecedente ou bônus
racial 2014) → `equipment` → `cantrips` → `spells` → `alignment` → `details`
(nome, foto, aparência, história) → `review`.

## Onde ficam os dados no `char`

Os mesmos campos da ficha (`utils.js makeNew`): `className`, `subclass`,
`classOptions`, `skillProfs`, `skillExpertise`, `saveProfs`, `background`,
`feats` (talento de origem com `origin: 'background'`), `race`,
`speciesChoices`, `languages`, `abilities`, `raceBonus` (2024: bônus do
antecedente; 2014: bônus racial), `armor`, `hasShield`, `weapons`,
`equipment`, `coins`, `spells`, `alignment`, `name`… Escolhas novas da criação
ficam em `char.creation` (ex.: `creation.abilityMethod`, `creation.classPack`,
`creation.backgroundPack`) e são removidas no `finalizeCharacter`.

## `start-data.js` (formato)

```js
const b = (pt, en) => ({ pt, en });
export const CLASS_START = {
  '2024': {
    fighter: {
      hitDie: 10,
      primary: ['str', 'dex'],                 // atributo(s) principal(is) (sugestões)
      complexity: 'low',                       // 'low' | 'average' | 'high' (tabela Class Overview do SRD 5.2.1)
      role: b('Luta bem com qualquer arma…', 'Fights well with any weapon…'),  // 1 frase p/ iniciante
      saves: ['str', 'con'],
      skills: { count: 2, from: ['acrobatics', 'animalHandling', …] },   // ids de SRD.SKILLS
      armor: ['light', 'medium', 'heavy', 'shield'],                       // categorias treinadas
      weapons: { categories: ['simple', 'martial'], ids: [] },            // ids extras (ex.: 2014 bardo: 'handCrossbow')
      tools: { fixed: [], choose: 0, from: [] },                           // ex.: druida 2024 fixed ['herbalismKit']
      equipment: [                                                         // opções A/B(/C) — o jogador escolhe uma
        { id: 'A', items: [{ kind: 'armor', id: 'chainMail' }, { kind: 'weapon', id: 'greatsword' },
                           { kind: 'shield' }, { kind: 'item', name: b('Pacote de Aventureiro', "Explorer's Pack"), qty: 1 }], gp: 4 },
        { id: 'B', items: [], gp: 155 },
      ],
      spells: { cantrips: 0, prepared: 0, spellbook: 0 },                 // no nível 1 (prepared = magias de 1º círculo)
    },
  },
  '2014': { … mesmo formato; equipment usa as escolhas (a)/(b) achatadas em opções completas … },
};
export const BACKGROUND_START = {
  '2024': { sage: { tool: { fixed: ['calligraphersSupplies'] }, equipment: [{ id: 'A', items: […], gp: 8 }, { id: 'B', items: [], gp: 50 }] } },
  '2014': { sage: { tool: { fixed: [] }, languages: 2, equipment: [{ id: 'A', items: […], gp: 10 }], feature: b('Pesquisador', 'Researcher') } },
};
export const classStart = (char, classId = char.className) => CLASS_START[char.rulesVersion === '2014' ? '2014' : '2024'][classId] || null;
export const backgroundStart = (char, bgId = char.background) => BACKGROUND_START[…][bgId] || null;
export const TOOLS = { calligraphersSupplies: b('Suprimentos de Caligrafia', "Calligrapher's Supplies"), … };  // nomes de ferramentas
```

Ids de arma/armadura são os de `SRD.weaponsFor(rules)` / `SRD.ARMOR`. A escolha
do jogador fica em `char.creation.classPack` / `char.creation.backgroundPack`
('A' | 'B' …) e a etapa de equipamento aplica os itens e o ouro em
`weapons`/`armor`/`hasShield`/`equipment`/`coins`. Ferramentas treinadas vão em
`char.toolProfs` (array de ids de `TOOLS`).
