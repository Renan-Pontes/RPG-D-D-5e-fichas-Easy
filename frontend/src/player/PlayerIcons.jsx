// Ícones de linha da visão do jogador e da Tela (TV): o mesmo traço dos ícones da mesa
// (src/shell/MesaIcon.jsx), na cor do texto. Entram no lugar dos emoji coloridos onde o
// desenho é GRANDE ou faz parte da moldura (medalhão do cartão sem imagem, estados vazios,
// clima, sobrelinha do teste): o emoji muda de desenho e de cor em cada sistema e quebra o
// metal único do DESIGN.md §2. Dentro do conteúdo (reações, nome de cena) o emoji continua.
//
//   <KindIcon kind="npc" />      tipo de cartão do Mundo (lugar, NPC, facção, item, história, documento)
//   <FrontIcon kind="recap" />   o que está na Tela (recap, cena, imagem, texto) ou o tipo do cartão
//   <WeatherIcon />              nuvem do clima
// Sempre decorativos (aria-hidden): o texto ao lado diz o que é.
import MesaIcon from '../shell/MesaIcon.jsx';

const svg = (size, className, body) => (
  <svg className={`mesa-ico ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {body}
  </svg>
);

/** Tipo do cartão → nome do desenho em MesaIcon (o NPC e a facção têm desenho próprio aqui). */
const KIND_ICON = { place: 'castle', item: 'items', lore: 'book', handout: 'requests' };
const FRONT_ICON = { recap: 'chronicle', scene: 'scene', image: 'eye', text: 'documents', map: 'map' };

export function KindIcon({ kind, size = '1.15em', className = '' }) {
  if (kind === 'npc') return svg(size, className, <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
  if (kind === 'faction') return svg(size, className, <><path d="M5 3v18" /><path d="M5 4h13l-3 4.5 3 4.5H5" /></>);
  return <MesaIcon name={KIND_ICON[kind] || 'insights'} size={size} className={className} />;
}

export function FrontIcon({ kind, entryKind, size = '1.15em', className = '' }) {
  if (FRONT_ICON[kind]) return <MesaIcon name={FRONT_ICON[kind]} size={size} className={className} />;
  return <KindIcon kind={entryKind} size={size} className={className} />;
}

export function WeatherIcon({ size = 16, className = '' }) {
  return svg(size, className, <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 7 18z" />);
}

/** Chave (segredos descobertos) e ampulheta/bússola dos estados vazios: nomes de MesaIcon. */
export { default as LineIcon } from '../shell/MesaIcon.jsx';
