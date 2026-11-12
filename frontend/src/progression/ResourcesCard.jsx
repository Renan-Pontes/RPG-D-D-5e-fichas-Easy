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
import FhFeatures, { FhFeatureBody } from '../sheet/FhFeatures.jsx';
import { levelTag } from '../sheet/feature-placement.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function ResourcesCard({ char, lang, update, canRestore = !!char.cheatMode && !char.inCampaign, local = false, features = [], multiclass = false, showDesc = false }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(() => new Set());   // recursos com a descrição aberta
  const [stale, setStale] = useState(() => new Set()); // recursos de talento que o servidor ainda não conhece
  const toggle = (k) => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const list = computeResources(char);
  const keys = new Set(list.map(r => r.key));
  const loose = features.filter(f => !keys.has(f.resourceKey));
  if (!list.length && !loose.length) return null;
  const multi = new Set(list.map(r => r.classId)).size > 1;
  // Por cadência: descanso curto, depois longo, depois o resto (ordem original dentro de cada uma).
  const cadence = (r) => (r.recharge === 'short' ? 'short' : r.recharge === 'long' ? 'long' : 'other');
  const RANK = { short: 0, long: 1, other: 2 };
  const grouped = list.map((r, i) => [r, i]).sort((a, b) => RANK[cadence(a[0])] - RANK[cadence(b[0])] || a[1] - b[1]).map(x => x[0]);

  const change = async (r, delta) => {
    if (busy) return;
    if (delta < 0 && !canRestore) return;
    setBusy(true);
    try {
      if (!local && typeof char.id === 'number') {
        const res = await api.resource(char.id, { key: r.key, action: delta > 0 ? 'use' : 'restore', amount: Math.abs(delta) });
        const used = res.character.data.resourcesUsed || {};
        // Servidor ainda sem a tabela de recursos de talento: a chave volta igual.
        if (r.key.startsWith('feat.') && (used[r.key] || 0) === r.used) setStale(x => new Set(x).add(r.key));
        update({ resourcesUsed: used });
      } else {
        update({ resourcesUsed: spendResource(char, r.key, delta).resourcesUsed });
      }
    } catch (e) { console.warn('resource failed', e); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{t(lang, 'Recursos', 'Resources')}</div>
      {grouped.map((r, i) => {
        const left = r.max - r.used;
        const cad = cadence(r);
        const head = i === 0 || cadence(grouped[i - 1]) !== cad ? (
          <div className={`fh-res-cadence is-${cad}`} role="heading" aria-level={4}>
            {cad === 'short' ? t(lang, '☕ Descanso curto', '☕ Short rest') : cad === 'long' ? t(lang, '🌙 Descanso longo', '🌙 Long rest') : t(lang, '✦ Outros', '✦ Other')}
          </div>
        ) : null;
        // O cabeçalho da cadência já diz quando volta; só o caso misto ganha nota.
        const partial = r.shortRestRegain && r.recharge !== 'short' ? t(lang, `+${r.shortRestRegain} no curto`, `+${r.shortRestRegain} on short`) : '';
        // O traço que É o recurso (o de menor nível) se funde à linha: tocar o nome abre a
        // descrição. Os outros traços do mesmo recurso seguem embaixo.
        const mine = features.filter(f => f.resourceKey === r.key).slice().sort((a, b) => (a.level || 0) - (b.level || 0));
        const [own, ...more] = mine;
        const isOpen = open.has(r.key);
        return (
          <Fragment key={r.key}>
            {head}
            <div className={`slot-row fh-res-row${more.length ? ' has-feats' : ''}${isOpen ? ' is-open' : ''}`} title={own ? undefined : (r.desc?.[lang] || '')} style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                {(() => {
                  const name = (
                    <>
                      <span className="fh-res-name">{r.name[lang]}{r.die ? ` (${r.die})` : ''}</span>
                      {multi && <span className="text-xs muted"> · {r.classId === 'species' ? t(lang, 'espécie', 'species') : r.classId === 'feat' ? t(lang, 'talento', 'feat') : tName('class', r.classId, lang)}</span>}
                      {stale.has(r.key) && <span className="text-xs muted fh-res-stale"> · {t(lang, 'aguardando atualização do servidor', 'waiting for server update')}</span>}
                      {own && <span className="fh-origin">{levelTag(own, multiclass && !multi, lang)}</span>}
                      {partial && <span className="text-xs muted fh-res-partial">{partial}</span>}
                    </>
                  );
                  return own ? (
                    <button type="button" className="fh-res-title is-toggle" aria-expanded={isOpen} onClick={() => toggle(r.key)}>
                      {name}<span className="fh-res-chev" aria-hidden="true">⌄</span>
                    </button>
                  ) : <div className="fh-res-title">{name}</div>;
                })()}
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
            {own && isOpen && <div className="fh-res-desc"><FhFeatureBody item={own} lang={lang} /></div>}
            {/* a linha já diz a classe quando há recursos de mais de uma: o traço só leva o nível */}
            <FhFeatures items={more} multi={multiclass && !multi} lang={lang} label={null} className="fh-res-feats" />
          </Fragment>
        );
      })}
      {/* Sem linhas, o título "Recursos" já diz o que são; com linhas, um rótulo próprio */}
      <FhFeatures items={loose} multi={multiclass} lang={lang} place="resources" label={list.length ? undefined : null} />
    </div>
  );
}
