/* Etapa provisória — substituir pela implementação real (ver ../README.md). */
import { StepIntro, L } from '../ui.jsx';

export default {
  id: 'equipment',
  title: { pt: 'Equipamento', en: 'Equipment' },
  issues: () => [],
  Comp: ({ lang }) => <StepIntro title={L(lang, 'Equipamento', 'Equipment')}>{L(lang, 'Em construção.', 'Under construction.')}</StepIntro>,
};
