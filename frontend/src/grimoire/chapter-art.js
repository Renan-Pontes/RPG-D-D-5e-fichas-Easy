/* Arte dos capítulos do Grimório: tudo arte que o site já tem (escolhas de classe,
 * itens, condições e escolas de magia). Sem arte (ou se a imagem falhar), a tela
 * usa o emoji do capítulo em data/grimoire/index.js. */
import { optionArt, itemArt, conditionIcon, schoolIcon } from '../art.js';

const CHAPTER_ART = {
  checks: () => optionArt('wis'),               // elmo com olho (Sabedoria/Percepção)
  actions: () => optionArt('commandersStrike'), // manopla com lâmina
  combat: () => optionArt('longsword'),         // espada longa
  health: () => itemArt('potionHealing'),       // poção de cura
  conditions: () => conditionIcon('stunned'),   // atordoado
  magic: () => schoolIcon('evocation'),         // evocação
  exploration: () => optionArt('deftExplorer'), // bússola
  character: () => optionArt('int'),            // escudo com mente (atributos)
  equipment: () => itemArt('backpack'),         // mochila
};

export const chapterArt = (id) => CHAPTER_ART[id]?.() || null;
