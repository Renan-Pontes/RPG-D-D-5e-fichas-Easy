/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'welcome',
  title: { pt: 'Começo', en: 'Start' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Começo', 'Start')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
