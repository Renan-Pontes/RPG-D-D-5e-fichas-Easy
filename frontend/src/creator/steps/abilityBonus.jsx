/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'abilityBonus',
  title: { pt: 'Bônus de atributo', en: 'Ability bonus' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Bônus de atributo', 'Ability bonus')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
