/* Rota de convite (/join/<código> ou #join=<código>): mostra a mesa e pergunta como entrar.
 * Folha da mesa (plano F8): sobe de baixo no celular (altura do conteúdo, a saída
 * sempre à vista no rodapé) e vira diálogo central no PC; Esc, ✕ e toque fora fecham. */
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { TableInviteCard } from '../creator/JoinTable.jsx';
import { joinFromInvite, inviteCheckMessage } from '../creator/creation.js';
import MesaSheet from '../shell/MesaSheet.jsx';

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

  // Mesa que a pessoa mestra (ou código inválido): só "Fechar".
  const onlyClose = !!error || !!table?.isDm;
  return (
    <MesaSheet lang={lang} size="auto" width="md" className="join-choice" icon="🗝"
      title={t(lang, 'Convite para uma mesa', 'Table invite')}
      onClose={onClose}
      footer={(
        <div className="mesa-actions">
          <button type="button" className="mesa-btn" onClick={onClose}>{onlyClose ? t(lang, 'Fechar', 'Close') : t(lang, 'Agora não', 'Not now')}</button>
        </div>
      )}>
      {!table && !error && <p className="muted">{t(lang, 'Procurando a mesa…', 'Looking for the table…')}</p>}
      {error && (
        <>
          <div className="join-error" role="alert">{error[lang] || error.pt}</div>
          <p className="muted text-sm">{t(lang, 'Código', 'Code')}: <span className="mono">{code}</span></p>
        </>
      )}
      {table && (
        <>
          <TableInviteCard table={table} lang={lang} />
          {/* Mesa que a pessoa mestra: o cartão explica e não há como entrar com ficha. */}
          {!table.isDm && <div className="join-choice-options">
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
          </div>}
        </>
      )}
    </MesaSheet>
  );
}
