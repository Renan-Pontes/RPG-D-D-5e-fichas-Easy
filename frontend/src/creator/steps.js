/* Ordem das etapas da criação (ver README.md). */
import welcomeStep from './steps/welcome.jsx';
import classStep from './steps/class.jsx';
import classChoicesStep from './steps/classChoices.jsx';
import skillsStep from './steps/skills.jsx';
import backgroundStep from './steps/background.jsx';
import originFeatStep from './steps/originFeat.jsx';
import speciesStep from './steps/species.jsx';
import speciesChoicesStep from './steps/speciesChoices.jsx';
import languagesStep from './steps/languages.jsx';
import abilitiesStep from './steps/abilities.jsx';
import abilityBonusStep from './steps/abilityBonus.jsx';
import equipmentStep from './steps/equipment.jsx';
import cantripsStep from './steps/cantrips.jsx';
import spellsStep from './steps/spells.jsx';
import alignmentStep from './steps/alignment.jsx';
import detailsStep from './steps/details.jsx';
import reviewStep from './steps/review.jsx';

export const STEPS = [
  welcomeStep,
  classStep,
  classChoicesStep,
  skillsStep,
  backgroundStep,
  originFeatStep,
  speciesStep,
  speciesChoicesStep,
  languagesStep,
  abilitiesStep,
  abilityBonusStep,
  equipmentStep,
  cantripsStep,
  spellsStep,
  alignmentStep,
  detailsStep,
  reviewStep,
];
