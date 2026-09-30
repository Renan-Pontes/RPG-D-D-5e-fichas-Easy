/* Artigo do Grimório num modal, aberto pelos "?" da ficha (carregado sob demanda). */
import { useMemo, useState } from 'react';
import { Modal } from '../../components/Shared.jsx';
import Icon from '../../components/Icons.jsx';
import { ARTICLES, CATEGORIES } from '../../data/grimoire/index.js';
import { findArticle, grimoireHash } from './search.js';
import ArticleView from './ArticleView.jsx';
import './grimoire.css';

export default function GrimoirePopup({ id, lang, onClose }) {
  const byId = useMemo(() => new Map(ARTICLES.map((a) => [a.id, a])), []);
  const [cur, setCur] = useState(() => findArticle(ARTICLES, id)?.id || null);
  const article = cur ? byId.get(cur) : null;
  return (
    <Modal onClose={onClose}>
      <div className="grim-popup">
        {article ? (
          <ArticleView article={article} lang={lang} categories={CATEGORIES} byId={byId} onOpen={setCur} compact />
        ) : (
          <p className="muted">{lang === 'pt' ? 'Regra não encontrada.' : 'Rule not found.'}</p>
        )}
        <a className="btn btn-ghost btn-sm grim-popup-open" href={grimoireHash(article?.id)} onClick={onClose}>
          <Icon name="book" size={14} /> {lang === 'pt' ? 'Abrir no Grimório' : 'Open in the Grimoire'}
        </a>
      </div>
    </Modal>
  );
}
