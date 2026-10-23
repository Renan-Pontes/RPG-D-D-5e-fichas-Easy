/* Artigo do Grimório num modal, aberto pelos "?" da ficha (carregado sob demanda).
 * Uma barra fixa no topo do modal tem "‹ regra anterior" (quando se navegou por um
 * termo ou por "Veja também"), "Abrir no Grimório" e o Fechar — que não somem ao rolar. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../components/Shared.jsx';
import Icon from '../../components/Icons.jsx';
import { ARTICLES, CATEGORIES } from '../../data/grimoire/index.js';
import { findArticle, grimoireHash } from './search.js';
import { onGrimoireLinkClick } from './link.js';
import ArticleView from './ArticleView.jsx';
import './grimoire.css';

export default function GrimoirePopup({ id, lang, onClose }) {
  const byId = useMemo(() => new Map(ARTICLES.map((a) => [a.id, a])), []);
  // Pilha das regras abertas aqui dentro: a última é a da tela; "‹" desempilha.
  const [stack, setStack] = useState(() => { const a = findArticle(ARTICLES, id); return a ? [a.id] : []; });
  const cur = stack[stack.length - 1] || null;
  const article = cur ? byId.get(cur) : null;
  const prev = stack.length > 1 ? byId.get(stack[stack.length - 2]) : null;
  const ref = useRef(null);
  const pt = lang === 'pt';
  const openLabel = pt ? 'Abrir no Grimório' : 'Open in the Grimoire';

  const openHere = (next) => setStack((s) => (s[s.length - 1] === next ? s : [...s, next]));
  // "Abrir no Grimório": entrada marcada no histórico (o "Voltar à ficha" usa o voltar de verdade).
  const openFull = (e) => { onGrimoireLinkClick(e, grimoireHash(article?.id)); onClose(); };
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  // Trocou de regra: o modal volta ao topo.
  useEffect(() => {
    const box = ref.current?.closest('.modal');
    if (box) box.scrollTop = 0;
  }, [cur]);

  return (
    <Modal onClose={onClose}>
      <div className="grim-popup" ref={ref}>
        <div className="grim-popup-bar">
          {prev ? (
            <button type="button" className="grim-popup-prev" onClick={back}
              title={pt ? `Voltar para: ${prev.title.pt}` : `Back to: ${prev.title.en}`}>
              <Icon name="chevron-left" size={18} /> <span>{prev.title[lang]}</span>
            </button>
          ) : (
            <span className="grim-popup-brand"><span aria-hidden>✦</span> {pt ? 'Grimório' : 'Grimoire'}</span>
          )}
          <a className="grim-popup-go" href={grimoireHash(article?.id)} onClick={openFull} title={openLabel}>
            <Icon name="book" size={16} /> <span>{openLabel}</span>
          </a>
          <button type="button" className="grim-popup-close" onClick={onClose} aria-label={pt ? 'Fechar' : 'Close'} title={pt ? 'Fechar' : 'Close'}>
            <Icon name="x" size={20} />
          </button>
        </div>
        {article ? (
          <ArticleView article={article} lang={lang} categories={CATEGORIES} byId={byId} onOpen={openHere} compact />
        ) : (
          <p className="muted">{pt ? 'Regra não encontrada.' : 'Rule not found.'}</p>
        )}
        <a className="btn btn-ghost grim-popup-open" href={grimoireHash(article?.id)} onClick={openFull}>
          <Icon name="book" size={16} /> {openLabel}
        </a>
      </div>
    </Modal>
  );
}
