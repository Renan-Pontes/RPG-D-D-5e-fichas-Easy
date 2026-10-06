// Cartão "Primeiros passos" do mestre (DESIGN 1.5). Os itens se marcam sozinhos
// (ver onboardingStatus em shell-logic.js); o cartão pode ser dispensado e some
// quando tudo está concluído. Flags ficam em Campaign.dm_settings.onboarding.
import { useState } from 'react';
import { ONBOARDING_STEPS, t } from './shell-logic.js';

const STEP_TEXT = {
  cover:      ['Dê uma cara ao seu mundo', 'Give your world a face', 'Escolha uma capa, uma cor e o tom da campanha.', 'Pick a cover, a color and the campaign tone.', 'Escolher capa', 'Pick cover'],
  firstEntry: ['Crie seu primeiro lugar ou NPC', 'Create your first place or NPC', 'Só o nome já basta — o resto vem depois.', 'Just the name is enough — the rest comes later.', 'Criar no Mundo', 'Create in World'],
  invite:     ['Convide os jogadores', 'Invite your players', 'Mande o código para a mesa entrar.', 'Send the code so the table can join.', 'Copiar código de convite', 'Copy invite code'],
  prepare:    ['Prepare a 1ª sessão', 'Prepare session 1', 'Um começo forte, algumas cenas e pistas.', 'A strong start, a few scenes and clues.', 'Abrir Próxima sessão', 'Open Next session'],
  tv:         ['Abra o telão na TV', 'Open the TV screen', 'Os jogadores veem a capa, as revelações e o combate.', 'Players see the cover, reveals and combat.', 'Abrir o telão', 'Open TV screen'],
};

export default function Onboarding({ lang, status, onAction, onDismiss, onSample, sampleBusy = false, worldEmpty = false }) {
  const [copied, setCopied] = useState(false);
  if (!status) return null;
  const tx = (k, i) => (lang === 'en' ? STEP_TEXT[k][i + 1] : STEP_TEXT[k][i]);
  const act = async (k) => {
    const r = await onAction?.(k);
    if (k === 'invite' && r !== false) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };
  return (
    <section className="shell-onboarding" aria-labelledby="shell-ob-title">
      <div className="shell-ob-head">
        <div>
          <span className="eyebrow">{t(lang, 'Primeiros passos', 'First steps')}</span>
          <h2 id="shell-ob-title" className="shell-ob-title">{t(lang, 'Sua campanha está nascendo', 'Your campaign is being born')}</h2>
        </div>
        <div className="shell-ob-progress" aria-label={t(lang, `${status.count} de ${status.total} concluídos`, `${status.count} of ${status.total} done`)}>
          <span className="shell-ob-count">{status.count}/{status.total}</span>
          <span className="shell-ob-bar"><span style={{ width: `${(status.count / status.total) * 100}%` }} /></span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm shell-ob-dismiss" onClick={onDismiss}>{t(lang, 'Dispensar', 'Dismiss')}</button>
      </div>
      <ol className="shell-ob-list">
        {ONBOARDING_STEPS.map(k => {
          const done = status.done[k];
          return (
            <li key={k} className={`shell-ob-item ${done ? 'done' : ''}`}>
              <span className="shell-ob-check" aria-hidden="true">{done ? '✓' : ''}</span>
              <span className="shell-ob-text">
                <strong>{tx(k, 0)}</strong>
                <span className="muted text-sm">{tx(k, 2)}</span>
              </span>
              {!done && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(k)}>
                  {k === 'invite' && copied ? t(lang, 'Copiado ✓', 'Copied ✓') : tx(k, 4)}
                </button>
              )}
              <span className="sr-only">{done ? t(lang, 'concluído', 'done') : t(lang, 'pendente', 'pending')}</span>
            </li>
          );
        })}
      </ol>
      {worldEmpty && onSample && (
        <div className="shell-ob-sample">
          <span className="muted text-sm">{t(lang, 'Quer ver como fica um mundo pronto?', 'Want to see a finished world?')}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSample} disabled={sampleBusy}>
            {sampleBusy ? t(lang, 'Criando…', 'Creating…') : t(lang, 'Começar com o exemplo "Vale de Brumafria"', 'Start with the "Mistfrost Vale" sample')}
          </button>
        </div>
      )}
    </section>
  );
}
