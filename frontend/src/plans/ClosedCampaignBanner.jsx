// Aviso de campanha encerrada (30 dias somente leitura antes de sumir):
// data limite + botões de baixar a ficha (PDF/JSON). O jogador vê as próprias
// fichas; o mestre vê as de toda a mesa e pode reabrir a campanha.
import { useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { L, closedInfo, closedText, isSponsored } from './plans-logic.js';
import { plansApi, showPlanLimit } from './plans-api.js';
import './plans.css';

const myId = () => (typeof window !== 'undefined' ? window.__currentUserId__ : null);

/** Fichas que este usuário pode baixar (o servidor só manda `data` para o dono e o mestre). */
export function downloadableSheets(campaign, isDM, userId = myId()) {
  return (campaign?.members || [])
    .filter(m => m.character && m.character.data && (isDM || m.user?.id === userId || m.userId === userId))
    .map(m => ({
      id: m.character.id,
      name: m.character.name || m.character.data.name || '',
      sponsored: isSponsored(m),
      owner: m.user?.displayName || '',
      char: { ...m.character.data, id: m.character.id, name: m.character.name || m.character.data.name },
    }));
}

export async function downloadSheetPdf(char, lang) {
  const [{ downloadDnd5ePdf }, { speciesSummary }] = await Promise.all([
    import('../pdf/export-pdf.js'), import('../progression/SpeciesChoices.jsx'),
  ]);
  await downloadDnd5ePdf(char, lang, { speciesSummary });
}

export function downloadSheetJson(char) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' }));
  a.download = `${(char.name || 'character').replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export default function ClosedCampaignBanner({ campaign, lang = 'pt', isDM = false, onReopened }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const info = closedInfo(campaign);
  if (!info) return null;
  const sheets = downloadableSheets(campaign, isDM);

  const pdf = async (s) => {
    setBusy(`pdf-${s.id}`); setMsg('');
    try { await downloadSheetPdf(s.char, lang); }
    catch (e) { console.error(e); setMsg(L(lang, 'Não deu para gerar o PDF. Tente o JSON.', 'Could not create the PDF. Try the JSON.')); }
    finally { setBusy(''); }
  };
  const reopen = async () => {
    setBusy('reopen'); setMsg('');
    try { await plansApi.reopenCampaign(campaign.id); setMsg(L(lang, 'Campanha reaberta ✓', 'Campaign reopened ✓')); onReopened?.(); }
    catch (e) { if (!showPlanLimit(e)) setMsg(errorMessage(e, lang)); }
    finally { setBusy(''); }
  };

  return (
    <section className="pl-closed" role="status" aria-live="polite">
      <div className="pl-closed-icon" aria-hidden="true">⌛</div>
      <div className="pl-closed-main">
        <strong className="pl-closed-title">{closedText(campaign, lang)}</strong>
        <p className="pl-closed-sub">
          {L(lang, 'Agora ela é só para leitura. ', 'It is read-only now. ')}
          {info.daysLeft != null && (info.daysLeft > 0
            ? L(lang, `Faltam ${info.daysLeft} ${info.daysLeft === 1 ? 'dia' : 'dias'}; depois o mundo, as aventuras e o diário somem.`,
              `${info.daysLeft} ${info.daysLeft === 1 ? 'day' : 'days'} left; after that the world, adventures and diary are gone.`)
            : L(lang, 'O prazo acabou: ela será apagada em breve.', 'The window is over: it will be deleted soon.'))}
          {sheets.some(s => s.sponsored) && L(lang,
            ' Personagens em vaga da mesa ficam com o jogador se o plano dele tiver espaço; senão, somem junto.',
            " Characters in a table seat stay with the player if their plan has room; otherwise they go too.")}
        </p>
        {sheets.length > 0 && (
          <ul className="pl-closed-sheets">
            {sheets.map(s => (
              <li key={s.id}>
                <span className="pl-closed-sheet-name">{s.name || L(lang, 'Sem nome', 'Unnamed')}{isDM && s.owner && <span className="muted"> · {s.owner}</span>}</span>
                <span className="pl-closed-sheet-btns">
                  <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => pdf(s)}>
                    {busy === `pdf-${s.id}` ? '…' : L(lang, '⬇ PDF', '⬇ PDF')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => downloadSheetJson(s.char)}>⬇ JSON</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {msg && <p className="pl-closed-msg" role="status">{msg}</p>}
      </div>
      {isDM && (
        <button type="button" className="btn btn-ghost btn-sm pl-closed-reopen" disabled={!!busy} onClick={reopen}>
          {busy === 'reopen' ? L(lang, 'Reabrindo…', 'Reopening…') : L(lang, '↺ Reabrir campanha', '↺ Reopen campaign')}
        </button>
      )}
    </section>
  );
}
