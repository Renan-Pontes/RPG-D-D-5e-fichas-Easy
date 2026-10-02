/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'spells',
  title: { pt: 'Magias', en: 'Spells' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Magias', 'Spells')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
