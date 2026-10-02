/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'review',
  title: { pt: 'Revisão', en: 'Review' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Revisão', 'Review')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
