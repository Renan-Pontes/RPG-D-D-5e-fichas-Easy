// "Anteriormente em…" — rascunho editável montado a partir da Crônica (sem IA).
// Só aparece quando o mestre toca no botão; ir à Tela é outro toque (o palco:
// a frente vira o "Anteriormente em…", com o aviso "Na tela ✓ · ↶ Desfazer").
// asSheet: abre numa folha da mesa (Jogar › Cena), com "📺 Mostrar na Tela"
// preso no rodapé; sem asSheet, fica dentro da página (Jogar › Tela › Texto).
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { buildRecap, groupEntries, pickRecapGroup } from '../campaigns/diary-summary.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import { sendToStage, showOnStage } from '../stage/stage-api.js';
import { flash } from './flash.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export async function draftRecapFor(campaign, lang) {
  const r = await api.listDiary(campaign.id);
  const groups = groupEntries(r.entries || []);
  const g = groups.find(x => x.key === pickRecapGroup(groups));
  return buildRecap(g?.entries || [], { lang, session: g?.session ?? null, campaignName: campaign.name });
}

export default function RecapCard({ campaign, lang = 'pt', autoDraft = false, onClose, onShown, asSheet = false }) {
  const [recap, setRecap] = useState({ title: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [drafted, setDrafted] = useState(false);
  // Texto mexido à mão e ainda não mostrado: a folha pergunta antes de fechar.
  const [touched, setTouched] = useState(false);

  const draft = async () => {
    setBusy(true);
    try { setRecap(await draftRecapFor(campaign, lang)); setDrafted(true); setTouched(false); }
    catch (e) { flash(errorMessage(e, lang), { error: true }); }
    finally { setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoDraft) draft(); }, []);

  const show = async () => {
    setBusy(true);
    try {
      const r = await sendToStage(campaign.id,
        () => showOnStage(campaign.id, { kind: 'recap', title: recap.title, text: recap.text }),
        { lang, name: L(lang, 'Anteriormente em…', 'Previously on…') });
      if (r) { setTouched(false); onShown?.(); }
    } finally { setBusy(false); }
  };

  const edit = (patch) => { setRecap(r => ({ ...r, ...patch })); setTouched(true); };
  const canShow = !busy && !!(recap.title.trim() || recap.text.trim());
  const showBtn = (
    <button type="button" className="mesa-btn is-primary recap-show" disabled={!canShow} onClick={show}>
      📺 {L(lang, 'Mostrar na Tela', 'Show on screen')}
    </button>
  );
  const body = (
    <>
      <button type="button" className="mesa-btn recap-draft" disabled={busy} onClick={draft}>
        ✨ {drafted ? L(lang, 'Escrever de novo a partir da Crônica', 'Redraft from the Chronicle') : L(lang, 'Escrever rascunho a partir da Crônica', 'Draft it from the Chronicle')}
      </button>
      <label className="mesa-field">
        <span className="mesa-field-label">{L(lang, 'Título', 'Title')}</span>
        <input className="input" value={recap.title} maxLength={200} onChange={e => edit({ title: e.target.value })}
          placeholder={L(lang, `Anteriormente em ${campaign.name}…`, `Previously on ${campaign.name}…`)} />
      </label>
      <label className="mesa-field">
        <span className="mesa-field-label">{L(lang, 'Texto', 'Text')}</span>
        <textarea className="input recap-text" rows={6} maxLength={5000} value={recap.text} onChange={e => edit({ text: e.target.value })}
          placeholder={L(lang, 'O que aconteceu na última sessão… (leia em voz alta ou mostre na Tela)', 'What happened last session… (read it aloud or show it on screen)')} />
      </label>
    </>
  );

  if (asSheet) {
    return (
      <MesaSheet title={L(lang, 'Anteriormente em…', 'Previously on…')} icon="📜" size="tall" width="md" lang={lang} dock="play"
        onClose={onClose} dirty={touched}
        dirtyText={L(lang, 'O texto que você mexeu não foi para a Tela e não fica guardado.', 'The text you edited did not go to the screen and is not kept.')}
        bodyClassName="recap-card is-sheet"
        footer={<div className="mesa-actions recap-foot">{showBtn}</div>}>
        <p className="mesa-sheet-text">{L(lang, 'Um rascunho montado da Crônica. Ajuste, leia em voz alta ou mostre na Tela.', 'A draft built from the Chronicle. Tweak it, read it aloud or show it on screen.')}</p>
        {body}
      </MesaSheet>
    );
  }

  return (
    <div className="recap-card">
      <div className="recap-head">
        <span className="mesa-eyebrow">📜 {L(lang, 'Anteriormente em…', 'Previously on…')}</span>
        {onClose && <button type="button" className="mesa-icon-btn" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close')}>✕</button>}
      </div>
      {body}
      <div>{showBtn}</div>
    </div>
  );
}
