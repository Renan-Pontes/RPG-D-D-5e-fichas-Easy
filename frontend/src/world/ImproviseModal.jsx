// 🎲 Improvisar — NPC, taverna ou nomes na hora, com rerrolagem por campo.
// "Gostei, salvar no mundo" cria o cartão OCULTO (o mestre revela depois).
//
//   <ImproviseModal campaignId lang onClose onSaved={(entry) => …} initialType="npc" />
import { useEffect, useState } from 'react';
import { createEntry, worldErrorText } from './world-api.js';
import { FIELDS, fieldLabel, generate, rerollField, toEntryPayload, toPlainText } from './generators.js';
import { t } from './world-model.js';
import './world-styles.css';

const TYPES = [
  { id: 'npc', icon: '🧑', pt: 'NPC', en: 'NPC' },
  { id: 'tavern', icon: '🍺', pt: 'Taverna', en: 'Tavern' },
  { id: 'names', icon: '✒️', pt: 'Nomes', en: 'Names' },
];

const NAME_KIND = { person: ['NPC', 'NPC'], person2: ['NPC', 'NPC'], place: ['lugar', 'place'], tavern: ['lugar', 'place'], faction: ['facção', 'faction'] };

export default function ImproviseModal({ campaignId, lang = 'pt', onClose, onSaved, initialType = 'npc' }) {
  const [type, setType] = useState(initialType);
  const [gen, setGen] = useState(() => generate(initialType, lang));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchType = (id) => { setType(id); setGen(generate(id, lang)); setSaved(''); setError(''); };
  const rollAll = () => { setGen(generate(type, lang)); setSaved(''); };
  const reroll = (f) => { setGen(g => rerollField(g, f)); setSaved(''); };
  const edit = (f, v) => setGen(g => ({ ...g, [f]: v }));

  const save = async (field) => {
    if (!campaignId) return;
    setBusy(true); setError('');
    try {
      const entry = await createEntry(campaignId, toEntryPayload(gen, field));
      setSaved(entry.name);
      onSaved?.(entry);
    } catch (e) {
      setError(worldErrorText(e, lang));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(toPlainText(gen)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sem clipboard */ }
  };

  const long = (f) => ['appearance', 'mannerism', 'wants', 'secret', 'atmosphere', 'specialty', 'clientele', 'rumor'].includes(f);

  return (
    <div className="modal-backdrop wl-impro-backdrop" onClick={onClose}>
      <div className="modal wl-impro" role="dialog" aria-modal="true" aria-labelledby="wl-impro-title" onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close wl-impro-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
        <h2 id="wl-impro-title" className="wl-impro-title">🎲 {t(lang, 'Improvisar', 'Improvise')}</h2>
        <p className="wl-hint">{t(lang, 'Os jogadores perguntaram algo que você não preparou? Role, ajuste e use. Nada aparece para eles.', "Players asked something you didn't prep? Roll, tweak and use it. Nothing is shown to them.")}</p>

        <div className="wl-seg" role="tablist">
          {TYPES.map(tp => (
            <button key={tp.id} type="button" role="tab" aria-selected={type === tp.id} className={type === tp.id ? 'is-on' : ''} onClick={() => switchType(tp.id)}>
              <span aria-hidden="true">{tp.icon}</span> {t(lang, tp.pt, tp.en)}
            </button>
          ))}
        </div>

        <div className={`wl-impro-sheet wl-impro-${type}`}>
          {FIELDS[type].map(f => (
            <div key={f} className={`wl-impro-row${f === 'name' ? ' is-name' : ''}${f === 'secret' || f === 'rumor' ? ' is-secret' : ''}`}>
              <div className="wl-impro-label">
                {f === 'secret' || f === 'rumor' ? '🔒 ' : ''}{fieldLabel(f, lang)}
              </div>
              <div className="wl-impro-value">
                {long(f)
                  ? <textarea rows={2} value={gen[f]} onChange={e => edit(f, e.target.value)} aria-label={fieldLabel(f, lang)} />
                  : <input value={gen[f]} onChange={e => edit(f, e.target.value)} aria-label={fieldLabel(f, lang)} />}
              </div>
              <div className="wl-impro-btns">
                <button type="button" className="wl-die" onClick={() => reroll(f)} title={t(lang, 'Rolar de novo só este', 'Reroll just this')} aria-label={t(lang, `Rolar ${fieldLabel(f, lang)} de novo`, `Reroll ${fieldLabel(f, lang)}`)}>🎲</button>
                {type === 'names' && (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save(f)}>
                    ＋ {t(lang, `Criar ${NAME_KIND[f][0]}`, `Create ${NAME_KIND[f][1]}`)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {saved && <p className="wl-ok" role="status">✓ {t(lang, `"${saved}" salvo no mundo, oculto dos jogadores.`, `"${saved}" saved to the world, hidden from players.`)}</p>}
        {error && <p className="wl-error" role="alert">{error}</p>}

        <div className="wl-impro-foot">
          <button type="button" className="btn btn-ghost" onClick={rollAll}>🎲 {t(lang, 'Rolar tudo', 'Roll all')}</button>
          <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? t(lang, 'Copiado!', 'Copied!') : t(lang, 'Copiar', 'Copy')}</button>
          {type !== 'names' && campaignId && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save()}>
              {busy ? t(lang, 'Salvando…', 'Saving…') : t(lang, 'Gostei, salvar no mundo', 'Love it, save to world')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
