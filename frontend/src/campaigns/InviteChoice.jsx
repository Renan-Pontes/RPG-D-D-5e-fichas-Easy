/* Rota de convite (/join/<código> ou #join=<código>): mostra a mesa e pergunta como entrar. */
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { TableInviteCard } from '../creator/JoinTable.jsx';
import { joinFromInvite, inviteCheckMessage } from '../creator/creation.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function InviteChoice({ code, lang = 'pt', hasCharacters = true, onCreate, onUseExisting, onClose }) {
  const [table, setTable] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setTable(null); setError(null);
    api.campaignInvite(code)
      .then(res => {
        if (!alive) return;
        const j = joinFromInvite(code, res);
        if (j) setTable(j); else setError(inviteCheckMessage({ status: 404 }));
      })
      .catch(err => { if (alive) setError(inviteCheckMessage(err)); });
    return () => { alive = false; };
  }, [code]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal join-choice" role="dialog" aria-modal="true" aria-labelledby="join-choice-title" onClick={e => e.stopPropagation()}>
        <h2 id="join-choice-title">{t(lang, 'Convite para uma mesa', 'Table invite')}</h2>
        {!table && !error && <p className="muted">{t(lang, 'Procurando a mesa…', 'Looking for the table…')}</p>}
        {error && (
          <>
            <div className="join-error" role="alert">{error[lang] || error.pt}</div>
            <p className="muted text-sm">{t(lang, 'Código', 'Code')}: <span className="mono">{code}</span></p>
            <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 'var(--s-3)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>{t(lang, 'Fechar', 'Close')}</button>
            </div>
          </>
        )}
        {table && (
          <>
            <TableInviteCard table={table} lang={lang} />
            <div className="join-choice-options">
              <button type="button" className="join-choice-opt primary" onClick={() => onCreate(table)} autoFocus>
                <strong>{t(lang, 'Criar personagem para esta mesa', 'Create a character for this table')}</strong>
                <span className="muted text-sm">{t(lang, 'O assistente abre com a mesa já escolhida.', 'The builder opens with this table already chosen.')}</span>
              </button>
              <button type="button" className="join-choice-opt" onClick={() => onUseExisting(table)}>
                <strong>{t(lang, 'Usar um personagem que já tenho', 'Use a character I already have')}</strong>
                <span className="muted text-sm">{hasCharacters
                  ? t(lang, 'Escolha uma das suas fichas para levar à mesa.', 'Pick one of your sheets to bring to the table.')
                  : t(lang, 'Você ainda não tem fichas: dá para entrar agora e escolher depois.', "You don't have sheets yet: you can join now and pick later.")}</span>
              </button>
            </div>
            <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 'var(--s-3)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>{t(lang, 'Agora não', 'Not now')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
