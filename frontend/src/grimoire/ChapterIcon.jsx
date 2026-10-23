/* Ícone de um capítulo do Grimório: a arte (chapter-art.js) ou, sem ela ou se a
 * imagem falhar, o emoji do capítulo (data/grimoire/index.js). */
import { useState } from 'react';
import { chapterArt } from './chapter-art.js';

export default function ChapterIcon({ cat, size = 18, className = '' }) {
  const [failed, setFailed] = useState(null); // id do capítulo cuja imagem falhou
  if (!cat) return null;
  const src = failed === cat.id ? null : chapterArt(cat.id);
  if (!src) return <span className={`grim-ci grim-ci-emoji ${className}`} style={{ '--ci': `${size}px` }} aria-hidden>{cat.icon}</span>;
  return (
    <img className={`grim-ci ${className}`} src={src} alt="" width={size} height={size} loading="lazy" decoding="async"
      style={{ '--ci': `${size}px` }} onError={() => setFailed(cat.id)} />
  );
}
