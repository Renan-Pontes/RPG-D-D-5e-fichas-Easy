// "Anteriormente em…" — rascunho editável montado a partir da Crônica (sem IA).
// Só aparece quando o mestre toca no botão; ir ao telão é outro toque.
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { buildRecap, groupEntries, pickRecapGroup } from '../campaigns/diary-summary.js';
import { setScreenCard } from './play-api.js';
import { flash } from './flash.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export async function draftRecapFor(campaign, lang) {
  const r = await api.listDiary(campaign.id);
  const groups = groupEntries(r.entries || []);
  const g = groups.find(x => x.key === pickRecapGroup(groups));
  return buildRecap(g?.entries || [], { lang, session: g?.session ?? null, campaignName: campaign.name });
}

export default function RecapCard({ campaign, lang = 'pt', autoDraft = false, onClose, onShown }) {
  const [recap, setRecap] = useState({ title: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [drafted, setDrafted] = useState(false);

  const draft = async () => {
    setBusy(true);
    try { setRecap(await draftRecapFor(campaign, lang)); setDrafted(true); }
    catch (e) { flash(errorMessage(e, lang), { error: true }); }
    finally { setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoDraft) draft(); }, []);

  const show = async () => {
    setBusy(true);
    try {
      await setScreenCard(campaign.id, { type: 'recap', title: recap.title, text: recap.text });
      flash(L(lang, 'Recapitulação no telão.', 'Recap on screen.'));
      onShown?.();
    } catch (e) {
      flash(errorMessage(e, lang), { error: true });
    } finally { setBusy(false); }
  };

  return (
    <div className="recap-card">
      <div className="recap-head">
        <span className="ins-eyebrow">📜 {L(lang, 'Anteriormente em…', 'Previously on…')}</span>
        {onClose && <button type="button" className="btn-icon" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close')}>×</button>}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={draft}>
        ✨ {drafted ? L(lang, 'Escrever de novo a partir da Crônica', 'Redraft from the Chronicle') : L(lang, 'Escrever rascunho a partir da Crônica', 'Draft it from the Chronicle')}
      </button>
      <input className="input" value={recap.title} maxLength={200} onChange={e => setRecap(r => ({ ...r, title: e.target.value }))}
        placeholder={L(lang, `Anteriormente em ${campaign.name}…`, `Previously on ${campaign.name}…`)} aria-label={L(lang, 'Título', 'Title')} />
      <textarea className="input recap-text" rows={6} maxLength={5000} value={recap.text} onChange={e => setRecap(r => ({ ...r, text: e.target.value }))}
        placeholder={L(lang, 'O que aconteceu na última sessão… (leia em voz alta ou mostre no telão)', 'What happened last session… (read it aloud or show it on screen)')}
        aria-label={L(lang, 'Texto', 'Text')} />
      <div>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !(recap.title.trim() || recap.text.trim())} onClick={show}>
          📺 {L(lang, 'Mostrar no telão', 'Show on screen')}
        </button>
      </div>
    </div>
  );
}
