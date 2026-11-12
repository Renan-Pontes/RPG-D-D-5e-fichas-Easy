/* Troca do talento de origem (antecedente 2024 / humano variante 2014) ou das sub-escolhas
 * dele, a partir da linha do tempo. A ficha nova sai de changeFeatEntry (respec.js); quem
 * chama decide se salva direto ou manda para o mestre aprovar. */
import { useState } from 'react';
import { Modal } from '../../components/Shared.jsx';
import FeatPicker from './FeatPicker.jsx';
import { findFeat } from '../../data/feats.js';
import { featRules, featPicksIssues } from './feat-rules.js';
import { changeFeatEntry } from './respec.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function OriginFeatModal({ char, index, lang, onConfirm, onClose }) {
  const entry = (char.feats || [])[index] || {};
  const [value, setValue] = useState({ type: 'feat', featId: entry.id || null, feat: entry.name || '', asi: entry.asi || {}, picks: entry.picks || {}, note: entry.note || '' });
  const [busy, setBusy] = useState(false);
  const feat = value.featId ? findFeat(value.featId) : null;
  // a ficha vista sem o talento antigo: as escolhas dele não contam como "já tem"
  const without = { ...char, feats: (char.feats || []).filter((_, i) => i !== index) };
  const issues = feat ? featPicksIssues(feat, value.picks, entry.level || 1) : [L(lang, 'Escolha um talento', 'Pick a feat')];
  const kind = featRules(char) === '2024' ? 'origin' : 'asi';
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(changeFeatEntry(char, index, value)); onClose(); }
    finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title={entry.origin === 'species' ? L(lang, 'Talento da espécie', 'Species feat') : L(lang, 'Talento de origem', 'Origin feat')}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', marginBottom: 12 }}>
        <FeatPicker char={without} lang={lang} level={entry.level || 1} kind={kind} value={value} onChange={setValue} />
      </div>
      {issues.length > 0 && <div className="text-xs" style={{ color: 'var(--blood-bright)', marginBottom: 8 }}>{issues.join(' · ')}</div>}
      <div className="row gap-2">
        <button className="btn btn-ghost" onClick={onClose}>{L(lang, 'Cancelar', 'Cancel')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || issues.length > 0} onClick={confirm}>{L(lang, 'Trocar', 'Change')}</button>
      </div>
    </Modal>
  );
}
