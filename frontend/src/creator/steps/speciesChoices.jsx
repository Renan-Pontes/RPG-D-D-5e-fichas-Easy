/* Etapa Escolhas da espécie (linhagem, tamanho, perícia, talento…). Lógica em ../species-helpers.js. */
import { tName, t as tr } from '../../../data/i18n.js';
import SpeciesChoices from '../../progression/SpeciesChoices.jsx';
import { speciesChoiceSpecs } from '../../progression/species.js';
import { StepIntro, Term, Callout, IssueList, L } from '../ui.jsx';
import { hasSpeciesChoices, speciesChoicesIssues, recommendedSpellAbility } from '../species-helpers.js';

/** Uma frase simples por tipo de escolha. */
const HELP = {
  size: { pt: 'Tamanho: Médio é a altura de um humano; Pequeno é a de uma criança. Quase não muda o jogo.', en: 'Size: Medium is human height; Small is child height. It barely changes play.' },
  lineage: { pt: 'Linhagem: o ramo da sua família. Dá magias ou poderes diferentes.', en: 'Lineage: your family branch. It grants different spells or powers.' },
  ancestry: { pt: 'Ancestral: o tipo de dragão ou gigante de quem você descende. Define seu poder especial.', en: 'Ancestry: the kind of dragon or giant you descend from. Sets your special power.' },
  spellAbility: { pt: 'Atributo de conjuração: o atributo usado nas magias da espécie. Escolha o mesmo da sua classe, se ela usa magia.', en: 'Spellcasting ability: the ability used for your species spells. Pick the same as your class, if it casts spells.' },
  skill: { pt: 'Perícia: uma área em que você é treinado. As que você já tem aparecem bloqueadas.', en: 'Skill: an area you are trained in. Ones you already have are locked.' },
  feat: { pt: 'Talento: uma habilidade especial extra. Os que você já tem aparecem bloqueados.', en: 'Feat: an extra special ability. Ones you already have are locked.' },
  cantrip: { pt: 'Truque: uma magia simples que você pode usar à vontade.', en: 'Cantrip: a simple spell you can use at will.' },
  asi: { pt: 'Bônus de atributo: some pontos aos atributos escolhidos.', en: 'Ability bonus: add points to the chosen abilities.' },
  bonus: { pt: 'Traço variável: escolha entre enxergar no escuro ou ganhar uma perícia.', en: 'Variable trait: pick darkvision or an extra skill.' },
};

/** Termos do glossário para o rótulo de cada escolha. */
const TERM = { skill: 'skill', feat: 'feat', cantrip: 'cantrip' };

function SpeciesChoicesStep({ char, set, lang }) {
  const specs = speciesChoiceSpecs(char);
  const name = tName('race', char.race, lang);
  const keys = [...new Set(specs.map(c => c.key))];
  const issues = speciesChoicesIssues(char);
  return (
    <div>
      <StepIntro title={L(lang, `Escolhas: ${name}`, `${name} choices`)}>
        <p>
          {L(lang, `Sua `, `Your `)}<Term id="species" lang={lang}>{L(lang, 'espécie', 'species')}</Term>
          {L(lang, ` (${name}) deixa você decidir alguns detalhes. Como você já escolheu classe e antecedente, o que você já tem aparece bloqueado para não repetir.`,
            ` (${name}) lets you decide a few details. Since you already picked class and background, what you already have is locked so you don't repeat it.`)}
        </p>
      </StepIntro>
      <Callout kind="info">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {keys.filter(k => HELP[k]).map(k => (
            <li key={k}>
              {TERM[k] ? <><Term id={TERM[k]} lang={lang} />: {HELP[k][lang].split(': ').slice(1).join(': ')}</> : HELP[k][lang]}
              {k === 'size' && <strong> {L(lang, 'Recomendado: Médio.', 'Recommended: Medium.')}</strong>}
              {k === 'spellAbility' && <strong> {L(lang, 'Recomendado', 'Recommended')}: {tr(recommendedSpellAbility(char), lang)}.</strong>}
            </li>
          ))}
        </ul>
      </Callout>
      <div className="card" style={{ padding: 14 }}>
        <SpeciesChoices char={char} lang={lang} onChange={patch => set(patch)} />
      </div>
      {issues.length > 0 && (
        <Callout kind="warn"><IssueList issues={issues} lang={lang} /></Callout>
      )}
    </div>
  );
}

export default {
  id: 'speciesChoices',
  title: { pt: 'Escolhas da espécie', en: 'Species choices' },
  applies: hasSpeciesChoices,
  issues: speciesChoicesIssues,
  Comp: SpeciesChoicesStep,
};
