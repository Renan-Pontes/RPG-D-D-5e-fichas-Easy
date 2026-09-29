/* Recursos com usos da ficha (Fúria, Canalizar Divindade, pontos de feitiçaria…).
 * Sem modo trapaça só se gasta: a recuperação vem do descanso (ou do mestre). */
import { useState } from 'react';
import { computeResources, spendResource } from './resources.js';
import { api } from '../api/client.js';
import { tName } from '../../data/i18n.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function ResourcesCard({ char, lang, update, canRestore = !!char.cheatMode && !char.inCampaign, local = false }) {
  const [busy, setBusy] = useState(false);
  const list = computeResources(char);
  if (!list.length) return null;
  const multi = new Set(list.map(r => r.classId)).size > 1;

  const change = async (r, delta) => {
    if (busy) return;
    if (delta < 0 && !canRestore) return;
    setBusy(true);
    try {
      if (!local && typeof char.id === 'number') {
        const res = await api.resource(char.id, { key: r.key, action: delta > 0 ? 'use' : 'restore', amount: Math.abs(delta) });
        update({ resourcesUsed: res.character.data.resourcesUsed || {} });
      } else {
        update({ resourcesUsed: spendResource(char, r.key, delta).resourcesUsed });
      }
    } catch (e) { console.warn('resource failed', e); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{t(lang, 'Recursos', 'Resources')}</div>
      {!canRestore && <div className="text-xs muted" style={{ marginBottom: 6 }}>{t(lang, 'Gastos voltam no descanso indicado.', 'Spent uses return on the listed rest.')}</div>}
      {list.map(r => {
        const left = r.max - r.used;
        const rest = r.recharge === 'short'
          ? (r.shortRestRegain ? t(lang, `curto +${r.shortRestRegain} · longo`, `short +${r.shortRestRegain} · long`) : t(lang, 'curto', 'short'))
          : (r.shortRestRegain ? t(lang, `longo · curto +${r.shortRestRegain}`, `long · short +${r.shortRestRegain}`) : t(lang, 'longo', 'long'));
        return (
          <div key={r.key} className="slot-row" title={r.desc?.[lang] || ''} style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--display)', color: 'var(--gold)' }}>
                {r.name[lang]}{r.die ? ` (${r.die})` : ''}
                {multi && <span className="text-xs muted"> · {r.classId === 'species' ? t(lang, 'espécie', 'species') : tName('class', r.classId, lang)}</span>}
              </div>
              <div className="text-xs muted">{t(lang, 'Recupera', 'Recovers')}: {rest}</div>
            </div>
            {r.max <= 12 ? (
              <div className="slot-pips">
                {Array.from({ length: r.max }).map((_, i) => {
                  const used = i < r.used;
                  const locked = used && !canRestore;
                  return (
                    <button key={i} type="button" className={`slot-pip ${used ? 'used' : ''} ${locked ? 'locked' : ''}`}
                      disabled={busy || locked}
                      onClick={() => change(r, used ? -(r.used - i) : i + 1 - r.used)} />
                  );
                })}
              </div>
            ) : (
              <div className="row gap-1">
                <button className="btn btn-sm btn-ghost" disabled={busy || left <= 0} onClick={() => change(r, 1)}>−1</button>
                <button className="btn btn-sm btn-ghost" disabled={busy || left < 5} onClick={() => change(r, 5)}>−5</button>
                {canRestore && <button className="btn btn-sm btn-ghost" disabled={busy || !r.used} onClick={() => change(r, -1)}>+1</button>}
              </div>
            )}
            <span className="text-xs muted mono">{left}/{r.max}</span>
          </div>
        );
      })}
    </div>
  );
}
