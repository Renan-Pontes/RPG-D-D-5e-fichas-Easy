/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'languages',
  title: { pt: 'Idiomas', en: 'Languages' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Idiomas', 'Languages')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
