/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'species',
  title: { pt: 'Espécie', en: 'Species' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Espécie', 'Species')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
