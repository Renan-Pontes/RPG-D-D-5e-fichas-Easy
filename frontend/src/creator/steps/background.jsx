/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'background',
  title: { pt: 'Antecedente', en: 'Background' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Antecedente', 'Background')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
