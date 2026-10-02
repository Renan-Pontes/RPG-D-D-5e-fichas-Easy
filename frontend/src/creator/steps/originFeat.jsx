/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'originFeat',
  title: { pt: 'Talento de origem', en: 'Origin feat' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Talento de origem', 'Origin feat')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
