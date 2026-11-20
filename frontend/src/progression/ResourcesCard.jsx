/* Recursos com usos da ficha (Fúria, Canalizar Divindade, pontos de feitiçaria…).
 * Sem modo trapaça só se gasta: a recuperação vem do descanso (ou do mestre).
 * `features` (só a aba Jogar da ficha; src/sheet/feature-placement.js): os traços de classe
 * que usam cada recurso, embaixo da linha dele (a Fúria junto das gemas da Fúria); os que
 * não têm linha na ficha ficam no fim. O editor do mestre não passa: nada muda lá.
 * `showDesc` (só o editor do mestre): a descrição de cada recurso em texto, sob
 * "Recupera: …" — no toque não há hover para ler o `title`. A ficha não passa. */
import { Fragment, useEffect, useRef, useState } from 'react';
import { computeResources, spendResource } from './resources.js';
import { api } from '../api/client.js';
import { tName } from '../../data/i18n.js';
import { gemLabel } from '../sheet/gem-text.js';
import FhFeatures, { FhFeatureBody } from '../sheet/FhFeatures.jsx';
import { levelTag } from '../sheet/feature-placement.js';
import { useSheetToast } from '../sheet/sheet-toast.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function ResourcesCard({ char, lang, update, canRestore = !!char.cheatMode && !char.inCampaign, local = false, features = [], multiclass = false, showDesc = false }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(() => new Set());   // recursos com a descrição aberta
  const [stale, setStale] = useState(() => new Set()); // recursos de talento que o servidor ainda não conhece
  const [whyLocked, setWhyLocked] = useState(null);    // recurso cuja gema gasta foi tocada: mostra quando volta
  const toast = useSheetToast();                       // null no editor do mestre
  // Ficha da conta: o gasto pelo toque fica "em espera" por alguns segundos antes de ir ao
  // servidor (que só devolve usos no descanso ou pelo mestre). A gema já aparece gasta e o
  // aviso oferece "Desfazer", que só cancela o envio: um toque errado deixa de custar o uso.
  const [pending, setPending] = useState(null);        // { key, n }
  const pendingRef = useRef(null);                     // { r, n, timer }
  const live = useRef({});                             // sempre a última versão (envio depois do toque / ao sair da aba)
  const flushRef = useRef(() => {});
  useEffect(() => {
    const run = () => { flushRef.current(); };
    const onHide = () => { if (document.visibilityState === 'hidden') run(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', run);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', run);
      run();                                             // troca de aba da ficha: o gasto em espera é enviado
    };
  }, []);
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
    if (busy) return false;
    if (delta < 0 && !canRestore) return false;
    setBusy(true);
    try {
      if (!local && typeof char.id === 'number') {
        const res = await api.resource(char.id, { key: r.key, action: delta > 0 ? 'use' : 'restore', amount: Math.abs(delta) });
        const used = res.character.data.resourcesUsed || {};
        // Servidor ainda sem a tabela de recursos de talento: a chave volta igual.
        if (r.key.startsWith('feat.') && (used[r.key] || 0) === r.used) setStale(x => new Set(x).add(r.key));
        applyPatch({ resourcesUsed: used });
      } else {
        update({ resourcesUsed: spendResource(char, r.key, delta).resourcesUsed });
      }
      return true;
    } catch (e) { console.warn('resource failed', e); return false; }
    finally { setBusy(false); }
  };
  const remote = !local && typeof char.id === 'number';
  const applyPatch = (patch) => (toast?.patchChar ? toast.patchChar(patch) : update(patch));   // patchChar usa a ficha mais recente
  live.current = { change, applyPatch, toast, lang };
  const HOLD_MS = 5000;
  // envia o gasto em espera (fim do prazo, outro recurso tocado, saída da aba ou da página)
  const flush = async () => {
    const p = pendingRef.current;
    if (!p) return true;
    pendingRef.current = null;
    clearTimeout(p.timer);
    const ok = await live.current.change(p.r, p.n);
    setPending(null);
    if (!ok) live.current.toast?.show({ tone: 'hurt', ms: 5000, text: t(live.current.lang, `Não foi possível gastar ${p.r.name.pt}. Tente de novo.`, `Could not spend ${p.r.name.en}. Try again.`) });
    return ok;
  };
  const cancelPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    clearTimeout(p.timer);
    setPending(null);
  };
  flushRef.current = flush;
  const backWhen = (r) => (r.recharge === 'short'
    ? t(lang, 'volta no descanso curto', 'comes back on a short rest')
    : r.recharge === 'long' ? t(lang, 'volta no descanso longo', 'comes back on a long rest')
      : t(lang, 'volta quando a regra do recurso disser', 'comes back when the resource says so'));
  // Gastar pelo toque: SEMPRE um uso por toque (como as gemas de espaço de magia); o aviso
  // da ficha oferece "Desfazer" por alguns segundos.
  const spend = async (r, n = 1) => {
    const name = r.name[lang];
    if (remote && toast) {
      if (busy) return;
      // outro recurso em espera: envia antes; o mesmo recurso: soma ao gasto em espera
      if (pendingRef.current && pendingRef.current.r.key !== r.key) { if (!(await flush())) return; }
      const held = pendingRef.current?.r.key === r.key ? pendingRef.current.n : 0;
      const total = Math.min(r.max - r.used, held + n);
      if (total <= 0) return;
      clearTimeout(pendingRef.current?.timer);
      pendingRef.current = { r, n: total, timer: setTimeout(flush, HOLD_MS) };
      setPending({ key: r.key, n: total });
      setWhyLocked(null);
      const restNow = r.max - r.used - total;
      toast.show({
        ms: HOLD_MS,
        text: (total === 1 ? t(lang, `${name}: −1 uso`, `${name}: −1 use`) : t(lang, `${name}: −${total} usos`, `${name}: −${total} uses`))
          + t(lang, ` (restam ${restNow}/${r.max})`, ` (${restNow}/${r.max} left)`),
        onAction: cancelPending,
      });
      return;
    }
    const ok = await change(r, n);
    if (!ok) return;
    setWhyLocked(null);
    // "Desfazer" só aparece onde funciona: ficha do aparelho ou editor do mestre. Ficha da
    // conta: o servidor só devolve usos no descanso, pelo mestre ou no modo trapaça (regra
    // do backend), então o aviso só confirma o gasto e diz quanto resta.
    const canUndo = !!toast?.patchChar && (local || typeof char.id !== 'number');
    const rest = r.max - r.used - n;
    toast?.show({
      text: (n === 1 ? t(lang, `${name}: −1 uso`, `${name}: −1 use`) : t(lang, `${name}: −${n} usos`, `${name}: −${n} uses`))
        + t(lang, ` (restam ${rest}/${r.max})`, ` (${rest}/${r.max} left)`),
      onAction: canUndo ? () => toast.patchChar(c => ({ resourcesUsed: spendResource(c, r.key, -n).resourcesUsed })) : undefined,
    });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{t(lang, 'Recursos', 'Resources')}</div>
      {grouped.map((r0, i) => {
        // o gasto em espera já conta como gasto na tela (gema apagada, contagem menor)
        const held = pending?.key === r0.key ? pending.n : 0;
        const r = held ? { ...r0, used: Math.min(r0.max, r0.used + held) } : r0;
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
                      {name}<span className="fh-res-chev is-drawn" aria-hidden="true" />
                    </button>
                  ) : <div className="fh-res-title">{name}</div>;
                })()}
                {showDesc && r.desc?.[lang] && <div className="text-xs muted slot-desc">{r.desc[lang]}</div>}
              </div>
              {r.max <= 12 ? (
                <div className="slot-pips">
                  {Array.from({ length: r.max }).map((_, i) => {
                    const used = i < r.used;
                    // gema do gasto em espera: tocar nela desfaz (não é "gasta" ainda)
                    const heldGem = held > 0 && i >= r0.used && i < r.used;
                    const locked = used && !canRestore && !heldGem;
                    // gema gasta sem modo trapaça: continua tocável (aria-disabled) só para
                    // dizer quando o uso volta; gema livre: gasta UM uso, seja qual for a tocada
                    return (
                      <button key={i} type="button" className={`slot-pip ${used ? 'used' : ''} ${locked ? 'locked' : ''}`}
                        disabled={busy} aria-disabled={locked || undefined}
                        title={locked ? t(lang, `Gasto: ${backWhen(r)}`, `Spent: ${backWhen(r)}`) : heldGem ? t(lang, 'Toque para desfazer', 'Tap to undo') : undefined}
                        aria-label={gemLabel(r.name[lang], i, r.max, used, lang) + (locked ? t(lang, `. ${backWhen(r)}`, `. ${backWhen(r)}`) : '')}
                        onClick={() => (heldGem ? (cancelPending(), toast?.hide()) : locked ? setWhyLocked(k => (k === r.key ? null : r.key)) : used ? change(r0, -1) : spend(r0, 1))} />
                    );
                  })}
                </div>
              ) : (
                <div className="row gap-1">
                  <button className="btn btn-sm btn-ghost" disabled={busy || left <= 0} onClick={() => spend(r0, 1)}>−1</button>
                  <button className="btn btn-sm btn-ghost" disabled={busy || left < 5} onClick={() => spend(r0, 5)}>−5</button>
                  {canRestore && <button className="btn btn-sm btn-ghost" disabled={busy || !r.used} onClick={() => change(r0, -1)}>+1</button>}
                </div>
              )}
              <span className="text-xs muted mono">{left}/{r.max}</span>
            </div>
            {whyLocked === r.key && (
              <div className="fh-res-why" role="status">
                {t(lang, `Uso gasto: ${backWhen(r)}.`, `Use spent: it ${backWhen(r)}.`)}
              </div>
            )}
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
