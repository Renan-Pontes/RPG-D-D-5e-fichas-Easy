/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'speciesChoices',
  title: { pt: 'Escolhas da espécie', en: 'Species choices' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Escolhas da espécie', 'Species choices')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
