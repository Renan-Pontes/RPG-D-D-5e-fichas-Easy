/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'details',
  title: { pt: 'Detalhes', en: 'Details' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Detalhes', 'Details')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
