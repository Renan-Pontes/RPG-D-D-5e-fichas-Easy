
import { tName } from '../../data/i18n.js';
import { apiUrl } from '../api/client.js';
import { nextStepId, stepLabel } from './next-session.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

/**
 * Um passo da sanfona: a linha de 56 px (número, nome, resumo) e, aberto, o corpo + "Próximo
 * passo →". No PC (`side`) a linha só escolhe: o corpo abre na coluna da direita.
 */
export function AccStep({ id, n, lang, open, side = false, summary, onToggle, onNext, children }) {
  const next = nextStepId(id);
  return (
    <section id={`ns-step-${id}`} className={`ns-step ${open ? 'is-open' : ''}`} aria-labelledby={`ns-h-${id}`}>
      <h3 className="ns-step-h" id={`ns-h-${id}`}>
        <button type="button" className="ns-step-head" aria-expanded={side ? undefined : open} aria-pressed={side ? open : undefined}
          aria-controls={side ? undefined : `ns-b-${id}`} onClick={onToggle}>
          <span className="ns-step-n" aria-hidden="true">{n}</span>
          <span className="ns-step-name">{stepLabel(id, lang, true)}</span>
          {(!open || side) && <span className="ns-step-sum">{summary}</span>}
          <span className="ns-step-chev" aria-hidden="true">{open && !side ? '⌄' : '›'}</span>
        </button>
      </h3>
      {open && !side && (
        <div className="ns-step-body" id={`ns-b-${id}`}>
          {children}
          <div className="ns-step-next">
            <button type="button" className="mesa-btn mesa-btn-lg" onClick={onNext}>
              {next ? t(lang, `Próximo passo: ${stepLabel(next, lang, true)} →`, `Next step: ${stepLabel(next, lang, true)} →`) : t(lang, 'Pronto para jogar →', 'Ready to play →')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** ① Quem joga: 1 linha por personagem (Raio-X, momentos deste plano, estilo); sem ficha → lembrete. */
export function PartyStep({ party, lang, raiox, insights, rx, onInvite, onRemind, onMoments, onXray }) {
  if (!party.length) {
    return (
      <div className="ns-empty">
        <p>{t(lang, 'Ninguém entrou na mesa ainda. Mande o link de convite: cada um entra e escolhe a ficha.', 'Nobody has joined yet. Send the invite link: each one joins and picks a sheet.')}</p>
        <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={onInvite}>{t(lang, 'Copiar link de convite', 'Copy invite link')}</button>
      </div>
    );
  }
  return (
    <>
      <ul className="ns-party">
        {party.map(m => {
          const d = m.character?.data || {};
          const sum = m.character?.summary || {};
          const cls = d.className || sum.className;
          const avatar = d.avatar || sum.avatar || apiUrl(m.character?.avatarUrl);
          const f = raiox?.byId[m.character?.id];
          const c = insights?.chars.find(x => x.id === m.character?.id);
          const name = m.character?.name || m.user?.displayName || '?';
          const inner = (
            <>
              {avatar ? <img className="mesa-row-pic" src={avatar} alt="" /> : <span className="mesa-row-pic" aria-hidden="true">🛡</span>}
              <span className="mesa-row-main">
                <span className="mesa-row-title">{name}</span>
                <span className="mesa-row-sub">{m.character
                  ? `${cls ? tName('class', cls, lang) : ''} ${t(lang, 'nível', 'level')} ${d.level || sum.level || 1}`.trim()
                  : t(lang, `${m.user?.displayName || name} ainda não tem personagem`, `${m.user?.displayName || name} has no character yet`)}</span>
                {f && <span className="ns-party-line">{rx.S.partyLine(f, raiox.facts, lang)}</span>}
                {c && (
                  <span className={`ns-party-line ${c.moments ? 'is-moment' : 'is-warn'}`}>{c.moments
                    ? t(lang, `★ ${c.moments} ${c.moments === 1 ? 'momento' : 'momentos'} neste plano`, `★ ${c.moments} ${c.moments === 1 ? 'moment' : 'moments'} in this plan`)
                      + (c.noScene ? t(lang, ` · ${c.noScene} sem cena ainda`, ` · ${c.noScene} with no scene yet`) : '')
                    : t(lang, '⚠ nenhum momento neste plano', '⚠ no moment in this plan')}</span>
                )}
                {c?.style.length > 0 && <span className="ns-party-line is-style">{c.style.join(' · ')}</span>}
              </span>
            </>
          );
          return (
            <li key={m.id}>
              {f ? (
                <button type="button" className="mesa-row is-tall ns-party-row" onClick={() => onMoments(f.id)}
                  aria-label={t(lang, `${name}: momentos`, `${name}: moments`)}>
                  {inner}
                  <span className="ns-step-chev" aria-hidden="true">›</span>
                </button>
              ) : (
                <div className="mesa-row is-tall ns-party-row">
                  {inner}
                  {!m.character && (
                    <button type="button" className="mesa-btn ns-remind" onClick={() => onRemind([m.user?.displayName || name])}>{t(lang, 'Copiar lembrete', 'Copy reminder')}</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {onXray && party.some(m => m.character?.data) && (
        <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={onXray}>✦ {t(lang, 'Ver o Raio-X do grupo', 'See the party X-ray')} →</button>
      )}
    </>
  );
}

/**
 * ③ Cenas: linhas de 64 px (aconteceu · nº · nome com os ícones do que a cena tem, escritos ·
 * ›); tocar abre a folha da Cena. ＋ Cena, ⇅ Mudar a ordem (↑ ↓ de 44 px no lugar do ›) e À mão
 * na sessão toda (no celular, as pílulas numa linha que rola de lado, com "Ver todas").
 */
