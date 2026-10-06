// Texto com @[Nome](id): nomes viram links para o cartão do Mundo.
// O backend já troca menções a cartões ocultos por texto puro (o jogador só
// recebe links para o que pode ver); `knownIds` permite filtrar mais ainda.
import { parseMentions } from '../world/world-model.js';

export default function MentionText({ text, onMention, knownIds }) {
  const parts = parseMentions(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type !== 'mention') return <span key={i}>{p.text}</span>;
        const ok = onMention && (!knownIds || knownIds.has(p.id));
        return ok
          ? <button key={i} type="button" className="pl-mention" onClick={(e) => { e.stopPropagation(); onMention(p.id); }}>{p.name}</button>
          : <strong key={i} className="pl-mention-plain">{p.name}</strong>;
      })}
    </>
  );
}
