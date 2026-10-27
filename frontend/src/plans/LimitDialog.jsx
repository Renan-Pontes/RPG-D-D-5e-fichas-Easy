// Aviso amigável quando a API devolve {error:'plan_limit'}.
// <LimitDialogHost> fica montado uma vez (app.jsx) e abre sozinho quando alguém
// chama showPlanLimit(e) (plans-api.js). Também exporta <PaymentSoonDialog>,
// usado aqui e na tela "Meu plano".
// Os dois são folhas da mesa (MesaSheet, plano F8): no celular sobem de baixo com
// a altura do conteúdo e a ação no rodapé preso (cabem em 320 × 568); no PC viram
// diálogo central. Ficam por cima de tudo (z-index em plans.css).
import { useEffect, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import { L, contactHref, limitMessage } from './plans-logic.js';
import { CONTACT_EMAIL, loadCatalog, onPlanLimit, openMyPlan, startCheckout } from './plans-api.js';
import './plans.css';

const ICONS = { images: '🖼', campaigns: '🏰', characters: '🛡', slots: '🪑', cards: '🗺' };

export function LimitDialog({ info, catalog, lang, onClose, onSeePlans }) {
  const [soon, setSoon] = useState(null);
  const msg = limitMessage(info, catalog, lang);
  if (!msg) return null;
  const pickSuggestion = async (s) => {
    const r = await startCheckout({ kind: s.type, slug: s.slug });
    if (r?.status === 'soon') setSoon({ ...s, email: r.email });
  };
  return (
    <MesaSheet lang={lang} size="auto" width="sm" role="alertdialog" className="pl-sheet pl-limit-sheet"
      icon={ICONS[info.limit] || '✦'} title={msg.title} describedBy="pl-limit-body"
      onClose={onClose}
      footer={(
        <div className="pl-limit-actions">
          <button type="button" className="mesa-btn" onClick={onClose}>{L(lang, 'Entendi', 'Got it')}</button>
          {info.limit !== 'cards' && (
            <button type="button" className="mesa-btn is-primary" onClick={() => { onClose(); onSeePlans?.(); }}>
              {L(lang, 'Ver meu plano', 'See my plan')}
            </button>
          )}
        </div>
      )}>
      {(msg.usedText || msg.planName) && (
        <p className="pl-limit-used">
          {msg.usedText && <><span className="mono">{msg.usedText}</span>{msg.planName ? ' · ' : ''}</>}
          {msg.planName && <>{L(lang, 'plano', 'plan')} <strong>{msg.planName}</strong></>}
        </p>
      )}
      <p id="pl-limit-body" className="pl-limit-body">{msg.body}</p>
      {msg.suggestions.length > 0 && (
        <ul className="pl-limit-sugs">
          {msg.suggestions.map(s => (
            <li key={`${s.type}-${s.slug}`} className={`pl-limit-sug is-${s.type}`}>
              <span>{s.text}</span>
              {s.type !== 'hint' && (
                <button type="button" className="mesa-btn" onClick={() => pickSuggestion(s)}>
                  {s.type === 'plan' ? L(lang, 'Assinar', 'Subscribe') : L(lang, 'Adicionar', 'Add')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="pl-limit-safe">✓ {L(lang, 'Nada foi apagado. Estourar um limite só impede criar coisas novas desse tipo.', 'Nothing was deleted. Hitting a limit only stops creating new things of that kind.')}</p>
      {soon && <PaymentSoonDialog lang={lang} kind={soon.type} name={soon.name} email={soon.email || catalog?.contactEmail} onClose={() => setSoon(null)} />}
    </MesaSheet>
  );
}

/** "Pagamento em breve — fale com a gente" (até o Mercado Pago entrar). */
export function PaymentSoonDialog({ lang, kind = 'plan', name = '', email = '', onClose }) {
  const to = email || CONTACT_EMAIL;
  return (
    <MesaSheet lang={lang} size="auto" width="sm" className="pl-sheet pl-soon-sheet" icon="✉"
      title={L(lang, 'Pagamento em breve', 'Payments coming soon')}
      onClose={onClose}
      footer={(
        <div className="pl-limit-actions">
          <button type="button" className="mesa-btn" onClick={onClose}>{L(lang, 'Fechar', 'Close')}</button>
          <a className="mesa-btn is-primary" href={contactHref(to, { kind, name, lang })}>{L(lang, 'Fale com a gente', 'Contact us')}</a>
        </div>
      )}>
      <p className="pl-limit-body">
        {L(lang,
          'Ainda não dá para pagar pelo site. Fale com a gente que liberamos o plano ou o extra na sua conta.',
          "You can't pay on the site yet. Get in touch and we'll enable the plan or add-on on your account.")}
      </p>
    </MesaSheet>
  );
}

/** Montado uma vez: escuta showPlanLimit() e abre o aviso. */
export default function LimitDialogHost({ lang }) {
  const [info, setInfo] = useState(null);
  const [catalog, setCatalog] = useState(null);
  useEffect(() => onPlanLimit((d) => {
    setInfo(d);
    loadCatalog().then(setCatalog).catch(() => {});
  }), []);
  if (!info) return null;
  return <LimitDialog info={info} catalog={catalog} lang={lang} onClose={() => setInfo(null)} onSeePlans={openMyPlan} />;
}
