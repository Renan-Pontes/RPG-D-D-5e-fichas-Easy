import Utils from '../../utils.js';
import Icon from '../../components/Icons.jsx';

export const SHEET_TABS = [
  { id: 'play',     labelPt: 'Jogar',           labelEn: 'Play' },
  { id: 'stats',    labelPt: 'Atributos',       labelEn: 'Ability Scores' },
  { id: 'skills',   labelPt: 'Perícias',        labelEn: 'Skills' },
  { id: 'features', labelPt: 'Características', labelEn: 'Features' },
  { id: 'spells',   labelPt: 'Magias',          labelEn: 'Spells' },
  { id: 'inv',      labelPt: 'Inventário',      labelEn: 'Inventory' },
  { id: 'story',    labelPt: 'História',        labelEn: 'Story' },
  { id: 'notes',    labelPt: 'Diário',          labelEn: 'Journal' },
  { id: 'npcs',     labelPt: 'NPCs',            labelEn: 'NPCs' },
];

// Mesmo fluxo do painel de Progressão: fora de campanha abre a subida guiada;
// em campanha pede liberação ao mestre.
const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
export const canLevelUp = (char) => {
  const mode = Utils.levelingMode(char);
  const canLevelXp = mode === 'xp' && char.level < 20 && (char.xp || 0) >= (XP_THRESHOLDS[char.level] || Infinity);
  return char.level < 20 && (mode === 'milestone' || canLevelXp || char.cheatMode);
};
export const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };

export const SUBCLASS_LEVEL = {
  artificer: 3,
  barbarian: 3, bard: 3, cleric: 1, druid: 2, fighter: 3,
  monk: 3, paladin: 3, ranger: 3, rogue: 3, sorcerer: 1, warlock: 1, wizard: 2,
};

export const SUBCLASS_LABEL = {
  barbarian: { pt: 'Caminho', en: 'Path' },
  bard:      { pt: 'Colégio', en: 'College' },
  cleric:    { pt: 'Domínio Divino', en: 'Divine Domain' },
  druid:     { pt: 'Círculo Druídico', en: 'Druid Circle' },
  fighter:   { pt: 'Arquétipo Marcial', en: 'Martial Archetype' },
  monk:      { pt: 'Tradição Monástica', en: 'Monastic Tradition' },
  paladin:   { pt: 'Juramento Sagrado', en: 'Sacred Oath' },
  ranger:    { pt: 'Arquétipo de Ranger', en: 'Ranger Archetype' },
  rogue:     { pt: 'Arquétipo Ladino', en: 'Roguish Archetype' },
  sorcerer:  { pt: 'Origem de Feiticeiro', en: 'Sorcerous Origin' },
  warlock:   { pt: 'Patrono Sobrenatural', en: 'Otherworldly Patron' },
  wizard:    { pt: 'Tradição Arcana', en: 'Arcane Tradition' },
};


// Escolhas de subclasse (e de espécie pendentes) dobradas no pé do painel do personagem:
// o resumo diz o que já foi escolhido. Com escolha pendente fica FECHADA, com o ponto laranja
// e "Escolha pendente" ao lado da classe: um toque abre. (Aberta sozinha, somava ~150px ao
// topo e a mesma pendência aparecia três vezes: aqui e em duas linhas da Progressão.)

export const saveLabel = (askDm, lang) => (askDm ? (lang === 'pt' ? 'Pedir ao mestre' : 'Ask the DM') : (lang === 'pt' ? 'Salvar' : 'Save'));
export const AskDmNote = ({ lang }) => (
  <p className="fh-ask-dm" role="note">
    <Icon name="lock" size={13} aria-hidden="true" />
    <span>{lang === 'pt' ? 'Em campanha, o mestre aprova esta troca. A ficha só muda quando ele aceitar.' : 'In a campaign, the DM approves this change. The sheet only changes once they accept.'}</span>
  </p>
);
