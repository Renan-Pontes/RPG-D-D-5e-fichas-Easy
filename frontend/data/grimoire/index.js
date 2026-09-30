/* Grimório: artigos de regra de D&D 5e para jogadores (PT/EN).
 *
 * Carregado só sob demanda (tela do Grimório e dicas "?" da ficha), via import()
 * dinâmico — não entra no bundle inicial.
 *
 * Formato de cada artigo (um arquivo por categoria):
 *   {
 *     id: 'agarrado',               // slug PT, único; usado no link #grimorio/<id>
 *     aliases: ['grappled'],        // opcional: outros slugs aceitos no link (EN, chaves da ficha)
 *     cat: 'conditions',            // uma das chaves de CATEGORIES
 *     title:   { pt, en },
 *     simple:  { pt, en },          // explicação simples, 2–5 frases, texto ORIGINAL
 *     example: { pt, en },          // cena curta com números
 *     sheet:   { pt, en },          // opcional: onde aparece na ficha do app
 *     versions:{ pt, en },          // opcional: diferença 2014 × 2024
 *     srd:     { text, ref },       // opcional: citação literal do SRD 5.2.1 (inglês), com a seção
 *     keywords: 'agarrar grapple ...', // sinônimos PT e EN para a busca
 *     related: ['livrar-se', ...],  // ids de outros artigos
 *   }
 *
 * Política de texto (RULES.md): a explicação é original; só o campo `srd` cita o
 * SRD 5.2.1 (CC-BY 4.0), sempre em inglês e identificado como citação.
 */
import CHECKS from './checks.js';
import ACTIONS from './actions.js';
import COMBAT from './combat.js';
import HEALTH from './health.js';
import CONDITIONS from './conditions.js';
import MAGIC from './magic.js';
import EXPLORATION from './exploration.js';
import CHARACTER from './character.js';
import EQUIPMENT from './equipment.js';

export const CATEGORIES = [
  { id: 'checks',      icon: '🎲', name: { pt: 'Testes e perícias', en: 'Tests & skills' } },
  { id: 'actions',     icon: '⚔️', name: { pt: 'Ações em combate', en: 'Combat actions' } },
  { id: 'combat',      icon: '🛡️', name: { pt: 'Combate', en: 'Combat' } },
  { id: 'health',      icon: '❤️', name: { pt: 'Vida, morte e descanso', en: 'Health, death & rest' } },
  { id: 'conditions',  icon: '🌀', name: { pt: 'Condições', en: 'Conditions' } },
  { id: 'magic',       icon: '✨', name: { pt: 'Magia', en: 'Magic' } },
  { id: 'exploration', icon: '🧭', name: { pt: 'Exploração e ambiente', en: 'Exploration & environment' } },
  { id: 'character',   icon: '📜', name: { pt: 'Criação e progressão', en: 'Creation & progression' } },
  { id: 'equipment',   icon: '🎒', name: { pt: 'Equipamento', en: 'Equipment' } },
];

export const ARTICLES = [
  ...CHECKS, ...ACTIONS, ...COMBAT, ...HEALTH, ...CONDITIONS,
  ...MAGIC, ...EXPLORATION, ...CHARACTER, ...EQUIPMENT,
];

// Chaves de condição usadas na ficha (char.conditions) → id do artigo.
export const CONDITION_ARTICLE = {
  blinded: 'cego', charmed: 'encantado', deafened: 'surdo', exhausted: 'exaustao',
  frightened: 'amedrontado', grappled: 'agarrado', incapacitated: 'incapacitado',
  invisible: 'invisivel', paralyzed: 'paralisado', petrified: 'petrificado',
  poisoned: 'envenenado', prone: 'prono', restrained: 'restringido',
  stunned: 'atordoado', unconscious: 'inconsciente',
};
