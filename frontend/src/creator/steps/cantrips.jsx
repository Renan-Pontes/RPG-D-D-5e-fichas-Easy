/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'cantrips',
  title: { pt: 'Truques', en: 'Cantrips' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Truques', 'Cantrips')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
