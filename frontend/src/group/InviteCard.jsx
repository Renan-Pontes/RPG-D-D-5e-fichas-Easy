import { useState } from 'react';
import { inviteText, t } from './group-model.js';

/** Copia texto com fallback para navegadores sem Clipboard API (http em rede local). */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* cai no fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

/**
 * Convite da mesa (só mestre): código grande + "Copiar link de convite".
 * hasJoinRoute: o app tem a rota /join/<código>? Sem ela, copia um texto com
 * o código e o caminho Campanhas › Entrar com código.
 */
export default function InviteCard({ campaign, lang, hasJoinRoute = false, compact = false }) {
  const [copied, setCopied] = useState('');
  const code = campaign.inviteCode || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = inviteText({ origin, code, campaignName: campaign.name, hasJoinRoute, lang });
  const players = (campaign.members || []).filter(m => m.role !== 'dm').length;

  const copy = async (what, text) => {
    const ok = await copyText(text);
    setCopied(ok ? what : 'fail');
    setTimeout(() => setCopied(''), 2500);
  };
  const share = async () => {
    try { await navigator.share({ title: campaign.name, text: link }); } catch { /* cancelado */ }
  };

  if (!code) return null;
  return (
    <section className={`grp-invite ${compact ? 'is-compact' : ''}`} aria-labelledby="grp-invite-title">
      <div className="grp-invite-text">
        <span className="eyebrow">{t(lang, 'Convite da mesa', 'Table invite')}</span>
        <h3 id="grp-invite-title">
          {players === 0
            ? t(lang, 'Chame seus jogadores', 'Bring in your players')
            : t(lang, 'Falta alguém na mesa?', 'Someone missing?')}
        </h3>
        <p className="muted small">
          {t(lang,
            'Mande o link no grupo da mesa. Cada jogador entra e escolhe a ficha que vai usar.',
            'Send the link to your group chat. Each player joins and picks the sheet they will use.')}
        </p>
      </div>
      <div className="grp-invite-code" aria-label={t(lang, `Código de convite ${code}`, `Invite code ${code}`)}>
        {code.split('').map((ch, i) => <span key={i}>{ch}</span>)}
      </div>
      <div className="grp-invite-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => copy('link', link)}>
          🔗 {copied === 'link' ? t(lang, 'Link copiado!', 'Link copied!') : t(lang, 'Copiar link de convite', 'Copy invite link')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy('code', code)}>
          {copied === 'code' ? t(lang, 'Código copiado!', 'Code copied!') : t(lang, 'Copiar código', 'Copy code')}
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={share}>{t(lang, 'Compartilhar…', 'Share…')}</button>
        )}
      </div>
      {copied === 'fail' && (
        <p className="grp-invite-fail small" role="alert">
          {t(lang, 'Não deu para copiar. Selecione e copie:', 'Could not copy. Select and copy:')} <code>{link}</code>
        </p>
      )}
      <span className="grp-sr-only" role="status" aria-live="polite">{copied && copied !== 'fail' ? t(lang, 'Copiado', 'Copied') : ''}</span>
    </section>
  );
}
