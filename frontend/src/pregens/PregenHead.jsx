/* Cabeçalho sanfona das fichas prontas. Fica fora do chunk da galeria para a tela
 * inicial desenhar o mesmo cabeçalho (com a mesma altura) enquanto o chunk chega. */
import Icon from '../../components/Icons.jsx';
import { classArt, hideOnError } from '../art.js';
import './pregens.css';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

/** Três retratos de classe da porta (arte fixa: não precisa baixar o JSON). */
const DOOR_FACES = ['fighter', 'wizard', 'rogue'];

export const pregenTitle = (variant, lang) => (variant === 'door'
  ? L(lang, 'Pegar uma ficha pronta', 'Grab a ready-made character')
  : variant === 'list'
    ? L(lang, 'Fichas prontas', 'Ready-made characters')
    : L(lang, 'Nunca jogou? Pegue uma ficha pronta', 'Never played? Grab a ready-made character'));

export function PregenHead({ lang, variant, open, onToggle }) {
  const door = variant === 'door';
  const Wrap = door ? 'h3' : 'div';
  return (
    <Wrap className="pg-head-wrap">
      <button type="button" className="pg-head" onClick={onToggle} aria-expanded={open}>
        {door
          ? <span className="pg-faces" aria-hidden="true">{DOOR_FACES.map(id => <img key={id} src={classArt(id)} alt="" decoding="async" onError={hideOnError} />)}</span>
          : <span className="pg-head-icon" aria-hidden>✦</span>}
        <span className="pg-head-text">
          <strong>{pregenTitle(variant, lang)}</strong>
          <span className="muted">{L(lang, '12 heróis de nível 1 montados pelas regras, prontos para a primeira sessão.', '12 level-1 heroes built by the rules, ready for your first session.')}</span>
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
      </button>
    </Wrap>
  );
}

/** Classes da <section> da galeria (as mesmas no substituto do Suspense). */
export const pregenSectionClass = (variant, open) =>
  `pg ${open ? 'open' : ''} ${variant === 'door' ? 'pg-door' : variant === 'list' ? 'pg-list' : ''}`.trim();
