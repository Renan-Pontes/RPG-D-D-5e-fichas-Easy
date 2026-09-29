// Opções selecionáveis de classe (invocações, metamagia, manobras…). Formato em README.md.
import artificer from './artificer.js';
import barbarian from './barbarian.js';
import bard from './bard.js';
import cleric from './cleric.js';
import druid from './druid.js';
import fighter from './fighter.js';
import monk from './monk.js';
import paladin from './paladin.js';
import ranger from './ranger.js';
import rogue from './rogue.js';
import sorcerer from './sorcerer.js';
import warlock from './warlock.js';
import wizard from './wizard.js';

export const CLASS_OPTIONS = Object.fromEntries(
  [artificer, barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard]
    .map(c => [c.classId, c]),
);
