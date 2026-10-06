// Documento entregue pelo mestre (handout) com moldura de época:
// pergaminho, carta com lacre, cartaz de procurado ou bilhete rasgado.
//
// Props: entry (WorldEntryFull filtrado do jogador, ou leve), lang,
//        onMention(id) — clique num nome @mencionado; compact — miniatura da lista.
import { useState } from 'react';
import { worldImageUrl } from '../world/world-api.js';
import { handoutStyleLabel } from '../world/world-model.js';
import { handoutStyle, L, paragraphs } from './player-model.js';
import MentionText from './MentionText.jsx';
import './player-styles.css';

export default function Handout({ entry, lang = 'pt', onMention, compact = false, onOpen }) {
  const style = handoutStyle(entry?.data?.style || entry?.style);
  const img = worldImageUrl(entry);
  const [imgOk, setImgOk] = useState(true);
  if (!entry) return null;
  const body = entry.body || '';
  const paras = paragraphs(body);

  if (compact) {
    return (
      <button type="button" className={`pl-handout-thumb pl-ho-${style}`} onClick={() => onOpen?.(entry)}>
        <span className="pl-handout-thumb-name">{entry.name}</span>
        {entry.summary && <span className="pl-handout-thumb-sum">{entry.summary}</span>}
      </button>
    );
  }

  return (
    <article className={`pl-handout pl-ho-${style}`} aria-label={`${handoutStyleLabel(style, lang)}: ${entry.name}`}>
      {style === 'scroll' && <div className="pl-ho-roll top" aria-hidden="true" />}
      <div className="pl-ho-paper">
        {style === 'wanted' && <div className="pl-ho-wanted-head">{L(lang, 'Procura-se', 'Wanted')}</div>}
        {style === 'wanted' && img && imgOk && (
          <div className="pl-ho-wanted-img"><img src={img} alt="" onError={() => setImgOk(false)} /></div>
        )}
        <h3 className="pl-ho-title">{entry.name}</h3>
        {style !== 'wanted' && img && imgOk && (
          <div className="pl-ho-img"><img src={img} alt="" onError={() => setImgOk(false)} /></div>
        )}
        {paras.length > 0
          ? <div className="pl-ho-body">{paras.map((p, i) => <p key={i}><MentionText text={p} onMention={onMention} /></p>)}</div>
          : entry.summary && <div className="pl-ho-body"><p>{entry.summary}</p></div>}
        {style === 'wanted' && entry.summary && paras.length > 0 && <div className="pl-ho-reward">{entry.summary}</div>}
        {style === 'letter' && <div className="pl-ho-seal" aria-hidden="true">✦</div>}
      </div>
      {style === 'scroll' && <div className="pl-ho-roll bottom" aria-hidden="true" />}
    </article>
  );
}
