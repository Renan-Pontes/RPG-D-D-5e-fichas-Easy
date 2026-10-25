/* Recursos com usos da ficha (Fúria, Canalizar Divindade, pontos de feitiçaria…).
 * Sem modo trapaça só se gasta: a recuperação vem do descanso (ou do mestre).
 * `features` (só a aba Jogar da ficha; src/sheet/feature-placement.js): os traços de classe
 * que usam cada recurso, embaixo da linha dele (a Fúria junto das gemas da Fúria); os que
 * não têm linha na ficha ficam no fim. O editor do mestre não passa: nada muda lá.
 * `showDesc` (só o editor do mestre): a descrição de cada recurso em texto, sob
 * "Recupera: …" — no toque não há hover para ler o `title`. A ficha não passa. */
import { Fragment, useState } from 'react';
import { computeResources, spendResource } from './resources.js';
import { api } from '../api/client.js';
import { tName } from '../../data/i18n.js';
import { gemLabel } from '../sheet/gem-text.js';
import FhFeatures from '../sheet/FhFeatures.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function ResourcesCard({ char, lang, update, canRestore = !!char.cheatMode && !char.inCampaign, local = false, features = [], multiclass = false, showDesc = false }) {
  const [busy, setBusy] = useState(false);
  const list = computeResources(char);
  const keys = new Set(list.map(r => r.key));
  const loose = features.filter(f => !keys.has(f.resourceKey));
  if (!list.length && !loose.length) return null;
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
      {!canRestore && list.length > 0 && <div className="text-xs muted" style={{ marginBottom: 6 }}>{t(lang, 'Gastos voltam no descanso indicado.', 'Spent uses return on the listed rest.')}</div>}
      {list.map(r => {
        const left = r.max - r.used;
        const rest = r.recharge === 'short'
          ? (r.shortRestRegain ? t(lang, `curto +${r.shortRestRegain} · longo`, `short +${r.shortRestRegain} · long`) : t(lang, 'curto', 'short'))
          : (r.shortRestRegain ? t(lang, `longo · curto +${r.shortRestRegain}`, `long · short +${r.shortRestRegain}`) : t(lang, 'longo', 'long'));
        const mine = features.filter(f => f.resourceKey === r.key);
        return (
          <Fragment key={r.key}>
            <div className={`slot-row${mine.length ? ' has-feats' : ''}`} title={r.desc?.[lang] || ''} style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--display)', color: 'var(--gold)' }}>
                  {r.name[lang]}{r.die ? ` (${r.die})` : ''}
                  {multi && <span className="text-xs muted"> · {r.classId === 'species' ? t(lang, 'espécie', 'species') : tName('class', r.classId, lang)}</span>}
                </div>
                <div className="text-xs muted">{t(lang, 'Recupera', 'Recovers')}: {rest}</div>
                {showDesc && r.desc?.[lang] && <div className="text-xs muted slot-desc">{r.desc[lang]}</div>}
              </div>
              {r.max <= 12 ? (
                <div className="slot-pips">
                  {Array.from({ length: r.max }).map((_, i) => {
                    const used = i < r.used;
                    const locked = used && !canRestore;
                    return (
                      <button key={i} type="button" className={`slot-pip ${used ? 'used' : ''} ${locked ? 'locked' : ''}`}
                        disabled={busy || locked}
                        aria-label={gemLabel(r.name[lang], i, r.max, used, lang)}
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
            {/* a linha já diz a classe quando há recursos de mais de uma: o traço só leva o nível */}
            <FhFeatures items={mine} multi={multiclass && !multi} lang={lang} label={null} className="fh-res-feats" />
          </Fragment>
        );
      })}
      {/* Sem linhas, o título "Recursos" já diz o que são; com linhas, um rótulo próprio */}
      <FhFeatures items={loose} multi={multiclass} lang={lang} place="resources" label={list.length ? undefined : null} />
    </div>
  );
}
