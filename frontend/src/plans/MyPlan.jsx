// Tela "Meu plano": o que a conta usa (imagens, campanhas, personagens, vagas
// de mesa), a comparação dos planos e os extras. Pagamento ainda não existe:
// "Assinar"/"Adicionar" passam por startCheckout() e mostram "Pagamento em breve".
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/errors.js';
import {
  CARDS_MAX, L, amountText, formatDay, formatInt, formatMb, formatPrice, meterLevel, planName, ratio, usageBars,
} from './plans-logic.js';
import { loadCatalog, loadMyPlan, startCheckout } from './plans-api.js';
import { PaymentSoonDialog } from './LimitDialog.jsx';
import './plans.css';

const SEALS = { free: '✦', player: '🛡', dm: '📜', legend: '👑' };

export default function MyPlan({ lang = 'pt', onBack }) {
  const [my, setMy] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [soon, setSoon] = useState(null); // {kind, name}

  const load = useCallback(async () => {
    setLoading(true);
    const cat = await loadCatalog();
    setCatalog(cat);
    try { setMy(await loadMyPlan()); setError(''); }
    catch (e) { setError(errorMessage(e, lang)); }
    finally { setLoading(false); }
  }, [lang]);
  useEffect(() => { load(); }, [load]);

  const buy = async (kind, item) => {
    const r = await startCheckout({ kind, slug: item.slug });
    if (r?.status === 'soon') setSoon({ kind, email: r.email, name: kind === 'plan' ? planName(item, lang) : L(lang, item.namePt, item.nameEn) });
  };

  const cur = my?.plan;
  const curOrder = catalog?.plans.find(p => p.slug === cur?.slug)?.order ?? -1;
  const bars = usageBars(my, lang);
  const activeAddons = my ? Object.entries(my.addons).filter(([, q]) => q > 0) : [];

  return (
    <div className="pl-page">
      {onBack && <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← {L(lang, 'Voltar', 'Back')}</button>}
      <header className="pl-head">
        <p className="eyebrow">{L(lang, 'Sua conta', 'Your account')}</p>
        <h1 className="pl-title">{L(lang, 'Meu plano', 'My plan')}</h1>
        <p className="pl-sub">{L(lang,
          'A Forja só limita o que custa para manter no ar: espaço de imagens, campanhas e personagens — sempre somando a conta toda.',
          'The Forge only limits what costs money to keep online: image space, campaigns and characters — always for the whole account.')}</p>
      </header>

      {loading && !my && <p className="muted">{L(lang, 'Carregando seu plano…', 'Loading your plan…')}</p>}
      {error && (
        <div className="pl-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>{L(lang, 'Tentar de novo', 'Try again')}</button>
        </div>
      )}

      {my && (
        <section className="pl-current" aria-labelledby="pl-current-name">
          <div className="pl-current-seal" aria-hidden="true">{SEALS[cur.slug] || '✦'}</div>
          <div className="pl-current-main">
            <span className="eyebrow">{L(lang, 'Plano atual', 'Current plan')}</span>
            <h2 id="pl-current-name" className="pl-current-name">{planName(cur, lang)}</h2>
            <p className="pl-current-meta">
              {cur.priceCents > 0
                ? <><strong>{formatPrice(cur.priceCents, lang)}</strong><span className="muted">/{L(lang, 'mês', 'month')}</span></>
                : <span className="muted">{L(lang, 'Sem mensalidade', 'No monthly fee')}</span>}
              {my.validUntil && <span className="muted"> · {L(lang, 'válido até', 'valid until')} {formatDay(my.validUntil, lang, { year: true })}</span>}
              {my.source === 'admin' && <span className="pl-tag">{L(lang, 'liberado pela equipe', 'granted by the team')}</span>}
            </p>
            {activeAddons.length > 0 && (
              <ul className="pl-addon-chips" aria-label={L(lang, 'Extras ativos', 'Active add-ons')}>
                {activeAddons.map(([slug, q]) => {
                  const a = catalog?.addons.find(x => x.slug === slug);
                  return <li key={slug}>{q}× {a ? L(lang, a.namePt, a.nameEn) : slug}</li>;
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {my && (
        <section className="pl-section" aria-labelledby="pl-usage-h">
          <h2 id="pl-usage-h" className="pl-h2">{L(lang, 'O que você está usando', "What you're using")}</h2>
          <div className="pl-meters">
            {bars.map(b => <Meter key={b.key} bar={b} lang={lang} />)}
            {(my.limits.slots > 0 || my.tables.length > 0) && (
              <div className="pl-meter pl-meter-slots">
                <div className="pl-meter-top">
                  <span className="pl-meter-label"><span aria-hidden="true">🪑</span> {L(lang, 'Vagas de jogador por campanha', 'Player seats per campaign')}</span>
                  <span className="pl-meter-num mono">{formatInt(my.limits.slots, lang)}</span>
                </div>
                <p className="pl-meter-hint">{L(lang,
                  'Jogadores no limite do próprio plano entram na sua mesa usando uma vaga sua — e esse personagem não conta no limite deles.',
                  "Players at their own plan's limit join your table using one of your seats — and that character doesn't count toward their limit.")}</p>
                {my.tables.length > 0 ? (
                  <ul className="pl-tables">
                    {my.tables.map(tb => (
                      <li key={tb.id ?? tb.name} className={`pl-table lvl-${meterLevel(tb.used, tb.max)}`}>
                        <span className="pl-table-name">{tb.name}{tb.status === 'closed' && <span className="pl-tag pl-tag-closed">{L(lang, 'encerrada', 'closed')}</span>}</span>
                        <span className="pl-mini-track" aria-hidden="true"><span style={{ width: `${ratio(tb.used, tb.max) * 100}%` }} /></span>
                        <span className="mono pl-table-num">{tb.used}/{tb.max}</span>
                      </li>
                    ))}
                  </ul>
                ) : my.limits.slots > 0 && (
                  <p className="pl-meter-hint muted">{L(lang, 'Nenhuma vaga ocupada ainda.', 'No seats in use yet.')}</p>
                )}
              </div>
            )}
          </div>
          <p className="pl-note">{L(lang,
            `Cartões do Mundo não têm limite de plano (cada campanha comporta até ${formatInt(CARDS_MAX, lang)}). Se você passar de um limite — por exemplo, ao trocar de plano — nada é apagado: só não dá para criar mais daquele tipo.`,
            `World cards have no plan limit (each campaign holds up to ${formatInt(CARDS_MAX, lang)}). If you go over a limit — say, after changing plans — nothing is deleted: you just can't create more of that kind.`)}</p>
        </section>
      )}

      {catalog && (
        <section className="pl-section" aria-labelledby="pl-plans-h">
          <h2 id="pl-plans-h" className="pl-h2">{L(lang, 'Planos', 'Plans')}</h2>
          <div className="pl-plans">
            {catalog.plans.map(p => {
              const isCur = p.slug === cur?.slug;
              const up = p.order > curOrder;
              return (
                <article key={p.slug} className={`pl-plan ${isCur ? 'is-current' : ''} plan-${p.slug}`}>
                  {isCur && <span className="pl-plan-ribbon">{L(lang, 'Seu plano', 'Your plan')}</span>}
                  <div className="pl-plan-seal" aria-hidden="true">{SEALS[p.slug] || '✦'}</div>
                  <h3 className="pl-plan-name">{planName(p, lang)}</h3>
                  <p className="pl-plan-price">
                    <strong>{formatPrice(p.priceCents, lang)}</strong>
                    {p.priceCents > 0 && <span className="muted">/{L(lang, 'mês', 'month')}</span>}
                  </p>
                  <ul className="pl-plan-feats">
                    <li><span aria-hidden="true">🛡</span> {amountText('characters', p.characters, lang)}</li>
                    <li><span aria-hidden="true">🏰</span> {amountText('campaigns', p.campaigns, lang)} {L(lang, 'como mestre', 'as GM')}</li>
                    <li className={p.slots ? '' : 'is-off'}><span aria-hidden="true">🪑</span> {p.slots ? amountText('slots', p.slots, lang) : L(lang, 'sem vagas de mesa', 'no table seats')}</li>
                    <li><span aria-hidden="true">🖼</span> {formatMb(p.imagesMb, lang)} {L(lang, 'de imagens', 'of images')}</li>
                  </ul>
                  {isCur
                    ? <button type="button" className="btn btn-ghost btn-sm pl-plan-btn" disabled>{L(lang, 'Plano atual', 'Current plan')}</button>
                    : p.priceCents === 0
                      ? <span className="pl-plan-free muted">{L(lang, 'Todo mundo começa aqui', 'Everyone starts here')}</span>
                      : <button type="button" className={`btn ${up ? 'btn-primary' : 'btn-ghost'} btn-sm pl-plan-btn`} onClick={() => buy('plan', p)}>
                        {up ? L(lang, 'Assinar', 'Subscribe') : L(lang, 'Mudar para este', 'Switch to this')}
                      </button>}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {catalog && catalog.addons.length > 0 && (
        <section className="pl-section" aria-labelledby="pl-addons-h">
          <h2 id="pl-addons-h" className="pl-h2">{L(lang, 'Extras', 'Add-ons')}</h2>
          <p className="pl-note" style={{ marginTop: 0 }}>{L(lang, 'Somam ao seu plano, quantos quiser. Valem para a conta toda.', 'They add to your plan, as many as you like. They apply to the whole account.')}</p>
          <ul className="pl-addons">
            {catalog.addons.map(a => {
              const q = my?.addons?.[a.slug] || 0;
              return (
                <li key={a.slug} className="pl-addon">
                  <div className="pl-addon-main">
                    <strong>{L(lang, a.namePt, a.nameEn)}</strong>
                    <span className="muted text-sm">{formatPrice(a.priceCents, lang, { free: false })}/{L(lang, 'mês', 'month')}{q > 0 && <> · {L(lang, `você tem ${q}`, `you have ${q}`)}</>}</span>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => buy('addon', a)}>{L(lang, 'Adicionar', 'Add')}</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {soon && <PaymentSoonDialog lang={lang} kind={soon.kind} name={soon.name} email={soon.email || my?.contactEmail || catalog?.contactEmail} onClose={() => setSoon(null)} />}
    </div>
  );
}

function Meter({ bar, lang }) {
  const pct = Math.round(ratio(bar.used, bar.max) * 100);
  return (
    <div className={`pl-meter lvl-${bar.level}`}>
      <div className="pl-meter-top">
        <span className="pl-meter-label"><span aria-hidden="true">{bar.icon}</span> {bar.label}</span>
        <span className="pl-meter-num mono">{bar.text}</span>
      </div>
      <div className="pl-track" role="meter" aria-label={bar.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={bar.text}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {bar.level === 'over' && <p className="pl-meter-warn">{L(lang, 'Acima do limite: nada foi apagado, mas não dá para criar mais.', "Over the limit: nothing was deleted, but you can't create more.")}</p>}
      {bar.level === 'full' && <p className="pl-meter-warn">{L(lang, 'No limite: para criar mais, libere espaço ou aumente o plano.', 'At the limit: to create more, free some up or upgrade.')}</p>}
      <p className="pl-meter-hint">{bar.hint}</p>
    </div>
  );
}
