/* Miniatura ilustrada com moldura dourada (itens, armas, monstros, ícones).
 * Sem imagem (ou se o arquivo falhar) mostra a moldura com um emoji temático e,
 * a partir de 64px, o aviso discreto "Ilustração em breve". Imagens são lazy. */
import { useEffect, useState } from 'react';
import './art-thumb.css';

export const SOON_TEXT = { pt: 'Ilustração em breve', en: 'Illustration coming soon' };

/**
 * props:
 *  - src: caminho da imagem (ou null → moldura vazia temática)
 *  - size: lado em px (padrão 40)
 *  - emoji: símbolo da moldura sem imagem
 *  - alt: texto alternativo ('' = decorativa)
 *  - round: moldura redonda (retratos/tokens)
 *  - lang: 'pt' | 'en' (texto do aviso)
 *  - eager: carrega já (só para imagens grandes acima da dobra)
 */
export default function ArtThumb({ src, size = 40, emoji = '✦', alt = '', round = false, lang = 'pt', eager = false, className = '', title }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  const show = !!src && !failed;
  const soon = !show && size >= 64;
  const style = { '--art-size': `${size}px` };
  return (
    <span
      className={`art-thumb ${round ? 'is-round' : ''} ${show ? 'has-img' : 'is-empty'} ${className}`}
      style={style}
      title={title || (soon ? undefined : (!show ? (lang === 'en' ? SOON_TEXT.en : SOON_TEXT.pt) : undefined))}
      role={alt && !show ? 'img' : undefined}
      aria-label={alt && !show ? alt : undefined}
      aria-hidden={!alt ? true : undefined}
    >
      {show ? (
        <img src={src} alt={alt} width={size} height={size} loading={eager ? 'eager' : 'lazy'} decoding="async"
          draggable={false} onError={() => setFailed(true)} />
      ) : (
        <>
          <span className="art-thumb-emoji" aria-hidden="true">{emoji}</span>
          {soon && <span className="art-thumb-soon">{lang === 'en' ? SOON_TEXT.en : SOON_TEXT.pt}</span>}
        </>
      )}
    </span>
  );
}

/** Ícone pequeno para chips (condição, escola, dano): imagem se houver, senão o emoji. */
export function ArtIcon({ src, emoji, size = 18, title, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (src && !failed) {
    return <img className={`art-icon ${className}`} src={src} alt="" width={size} height={size} loading="lazy" decoding="async"
      title={title} aria-hidden="true" onError={() => setFailed(true)} />;
  }
  if (!emoji) return null;
  return <span className={`art-icon art-icon-emoji ${className}`} style={{ '--art-size': `${size}px` }} title={title} aria-hidden="true">{emoji}</span>;
}
