// Ecos da mesa (jogador): como o SEU personagem se sentiu sobre este cartão,
// e a estrela "quero voltar aqui". O jogador nunca vê quem reagiu — só um
// sussurro de que a mesa reagiu e os ícones com quantos sentiram o mesmo.
import { REACTIONS, canReact, echoChips, echoLine, hasReacted, isFavorite } from './living-model.js';
import './living.css';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function ReactionBar({ entry, charName, lang = 'pt', onReact, onFavorite, error }) {
  if (!canReact(entry)) return null;
  const fav = isFavorite(entry);
  const chips = echoChips(entry, lang);
  const countOf = (kind) => chips.find(c => c.kind === kind)?.n || 0;
  const who = charName || L(lang, 'Seu personagem', 'Your character');
  return (
    <section className="lv-echo" aria-label={L(lang, 'Reação do seu personagem', "Your character's reaction")}>
      <div className="lv-echo-head">
        <span className="lv-echo-q">{L(lang, `O que ${who} sente?`, `How does ${who} feel?`)}</span>
        <button type="button" className={`lv-star ${fav ? 'on' : ''}`} aria-pressed={fav} onClick={() => onFavorite?.(entry)}
          title={fav ? L(lang, 'Tirar de "Quero voltar"', 'Remove from "Return here"') : L(lang, 'Quero voltar aqui', 'I want to return here')}>
          <span aria-hidden="true">{fav ? '★' : '☆'}</span>
          <span className="lv-star-txt">{L(lang, 'Quero voltar', 'Return here')}</span>
        </button>
      </div>
      <div className="lv-echo-row" role="group" aria-label={L(lang, 'Reações', 'Reactions')}>
        {REACTIONS.map(r => {
          const on = hasReacted(entry, r.kind);
          const n = countOf(r.kind);
          const label = L(lang, r.pt, r.en);
          return (
            <button key={r.kind} type="button" className={`lv-react ${on ? 'on' : ''}`} aria-pressed={on}
              onClick={() => onReact?.(entry, r.kind)} title={label}>
              <span className="lv-react-ico" aria-hidden="true">{r.icon}</span>
              <span className="lv-react-txt">{label}</span>
              {n > 1 && <span className="lv-react-n" aria-label={L(lang, `${n} à mesa`, `${n} at the table`)}>{n}</span>}
            </button>
          );
        })}
      </div>
      {chips.length > 0 && <p className="lv-echo-whisper">{echoLine(entry, lang)}</p>}
      {error && <p className="lv-echo-err" role="alert">{error}</p>}
    </section>
  );
}
