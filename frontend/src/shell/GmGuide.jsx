// O Guia do mestre (§2.5): 5 cartões de 1 tela — Preparar · Começar a sessão · Mostrar na
// Tela · Combate · Encerrar —, cada um com 1 frase, 1 desenho simples (SVG à mão) e a
// tabela "Quero… → vou a…" daquele assunto. Rodapé: Fechar · Me leve lá · Próximo.
// Os números 1–5 no topo (44 px) pulam direto para um cartão. Só apresentação: o
// conteúdo e o destino do "Me leve lá" vêm de guide-model.js.
//
//   <GmGuide start={0} lang live closed onClose onGo={(target) => …} />
//   target = {area, sub} (a casca navega) ou {sheet: 'end'} (a folha Encerrar)
import { useState } from 'react';
import MesaSheet from './MesaSheet.jsx';
import { GUIDE_COUNT, guideCard, guideIndex, guideTarget } from './guide-model.js';
import './guide.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function GmGuide({ start = 0, lang = 'pt', live = false, closed = false, onClose, onGo }) {
  const [i, setI] = useState(() => guideIndex(start));
  const card = guideCard(i, lang);
  const last = i === GUIDE_COUNT - 1;
  const go = () => onGo?.(guideTarget(i, { live, closed }));
  return (
    <MesaSheet eyebrow={t(lang, 'Guia do mestre', 'GM guide')} title={card.title} icon={card.icon}
      size="auto" width="md" lang={lang} onClose={onClose} className="gm-guide"
      footer={(
        <div className="mesa-actions gm-guide-foot">
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Fechar', 'Close')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={go}>{t(lang, 'Me leve lá', 'Take me there')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg" onClick={() => setI(last ? 0 : i + 1)}>
            {last ? t(lang, 'Do começo', 'From the start') : <>{t(lang, 'Próximo', 'Next')} <span aria-hidden="true">→</span></>}
          </button>
        </div>
      )}>
      <nav className="gm-guide-steps" aria-label={t(lang, 'Cartões do guia', 'Guide cards')}>
        {Array.from({ length: GUIDE_COUNT }, (_, k) => {
          const c = guideCard(k, lang);
          return (
            <button key={c.id} type="button" className={`gm-guide-step${k === i ? ' is-on' : ''}`} aria-current={k === i ? 'step' : undefined}
              aria-label={`${k + 1}. ${c.title}`} onClick={() => setI(k)}>{k + 1}</button>
          );
        })}
        <span className="gm-guide-count">{t(lang, `${card.n} de ${card.total}`, `${card.n} of ${card.total}`)}</span>
      </nav>
      <div className="gm-guide-art" aria-hidden="true"><GuideArt kind={card.art} /></div>
      <p className="gm-guide-text">{card.text}</p>
      <section className="gm-guide-table" aria-label={t(lang, 'Quero… → vou a…', 'I want to… → I go to…')}>
        <p className="mesa-eyebrow gm-guide-head">{t(lang, 'Quero… → vou a…', 'I want to… → I go to…')}</p>
        <ul className="gm-guide-rows">
          {card.rows.map((r) => (
            <li key={r.want} className="gm-guide-row">
              <span className="gm-guide-want">{t(lang, 'Quero', 'I want to')} {r.want}</span>
              <span className="gm-guide-go"><span aria-hidden="true">→ </span>{r.go}</span>
            </li>
          ))}
        </ul>
      </section>
    </MesaSheet>
  );
}

/** Os 5 desenhos (traço dourado, 160×90): pergaminho, mesa com ▶, TV, espadas, livro. */
function GuideArt({ kind }) {
  const common = { viewBox: '0 0 160 90', width: 160, height: 90, className: 'gm-guide-svg' };
  if (kind === 'scroll') {
    return (
      <svg {...common}>
        <path d="M38 18 h80 a8 8 0 0 1 0 16 h-4 v38 a8 8 0 0 1 -8 8 h-76 a8 8 0 0 1 0 -16 h4 v-38 a8 8 0 0 1 4 -8 z" />
        <path d="M118 34 a8 8 0 0 1 -8 -8" /><path d="M34 64 a8 8 0 0 1 8 8 a8 8 0 0 1 -8 8" />
        <path className="is-soft" d="M52 36 h48 M52 46 h40 M52 56 h44" />
        <circle className="is-dot" cx="46" cy="36" r="2" /><circle className="is-dot" cx="46" cy="46" r="2" /><circle className="is-dot" cx="46" cy="56" r="2" />
      </svg>
    );
  }
  if (kind === 'play') {
    return (
      <svg {...common}>
        <ellipse cx="80" cy="60" rx="58" ry="16" />
        <path className="is-soft" d="M22 60 v8 a58 16 0 0 0 116 0 v-8" />
        <path d="M70 18 l26 15 l-26 15 z" className="is-fill" />
        <circle className="is-soft" cx="40" cy="52" r="4" /><circle className="is-soft" cx="120" cy="52" r="4" /><circle className="is-soft" cx="80" cy="70" r="4" />
      </svg>
    );
  }
  if (kind === 'screen') {
    return (
      <svg {...common}>
        <rect x="30" y="10" width="100" height="58" rx="5" />
        <path d="M70 68 l-6 12 h32 l-6 -12" />
        <path className="is-soft" d="M38 60 l22 -24 l14 14 l10 -10 l38 20" />
        <circle className="is-dot" cx="108" cy="24" r="5" />
      </svg>
    );
  }
  if (kind === 'swords') {
    return (
      <svg {...common}>
        <path d="M52 14 l52 52 M108 14 l-52 52" />
        <path d="M96 62 l12 -4 l-4 12 M64 62 l-12 -4 l4 12" />
        <path className="is-soft" d="M100 70 l10 10 M60 70 l-10 10" />
        <path className="is-soft" d="M52 14 l-4 -2 l2 4 M108 14 l4 -2 l-2 4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M44 16 h64 a6 6 0 0 1 6 6 v52 a6 6 0 0 1 -6 6 h-64 z" />
      <path d="M44 16 a6 6 0 0 0 -6 6 v52 a6 6 0 0 0 6 6" />
      <path className="is-soft" d="M56 32 h44 M56 42 h36" />
      <path d="M92 80 v8 l6 -5 l6 5 v-8" className="is-fill" />
    </svg>
  );
}
