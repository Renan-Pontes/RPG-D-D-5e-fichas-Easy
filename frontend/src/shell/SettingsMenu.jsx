// ⚙ Ajustes da campanha (DESIGN 1.2): identidade (nome, frase, capa, cor, tom),
// convite e link do telão, modo de nível e multiclasse, e Ferramentas avançadas
// (Dados preparados pelo mestre — desligado por padrão), Mundo vivo (imersão
// do Mundo) e Zona de perigo (encerrar a campanha — 30 dias só leitura para
// baixar as fichas — ou reabrir, confirmando pelo nome).
import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import CoverPicker from '../campaigns/CoverPicker.jsx';
import ToneAccentFields from './ToneAccentFields.jsx';
import { defaultCoverArt, isHexColor, screenLink, t } from './shell-logic.js';
import { confirmNameMatches, immersionOn } from '../world/living/living-logic.js';
import { flash } from '../play/flash.js';
import '../world/living/living.css';
import { plansApi, showPlanLimit } from '../plans/plans-api.js';
import useMyPlan from '../plans/useMyPlan.js';
import { CLOSED_DAYS, closedInfo, closedText, formatDay, meterLevel, ratio, tableSlots } from '../plans/plans-logic.js';
import '../plans/plans.css';

const AdvancedDice = lazy(() => import('./AdvancedDice.jsx'));

const SECTIONS = ['identity', 'table', 'rules', 'world', 'advanced', 'danger'];

export default function SettingsMenu({ campaign, lang, onClose, onChange, worldCount = null, worldMax = 500, onMarkOnboarding, onDeleted }) {
  const [section, setSection] = useState('identity');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const labels = {
    identity: t(lang, 'Identidade', 'Identity'),
    table: t(lang, 'Convite e telão', 'Invite & TV'),
    rules: t(lang, 'Regras da mesa', 'Table rules'),
    world: t(lang, 'Mundo vivo', 'Living world'),
    advanced: t(lang, 'Ferramentas avançadas', 'Advanced tools'),
    danger: t(lang, 'Zona de perigo', 'Danger zone'),
  };
  return (
    <div className="modal-backdrop shell-settings-backdrop" onClick={onClose}>
      <div className="modal shell-settings" role="dialog" aria-modal="true" aria-labelledby="shell-settings-title" onClick={(e) => e.stopPropagation()}>
        <div className="shell-settings-head">
          <h2 id="shell-settings-title">⚙ {t(lang, 'Ajustes da campanha', 'Campaign settings')}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>✕</button>
        </div>
        <div className="shell-subchips" role="tablist">
          {SECTIONS.map(s => (
            <button key={s} type="button" role="tab" aria-selected={section === s}
              className={`shell-subchip ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>{labels[s]}</button>
          ))}
        </div>
        <div className="shell-settings-body">
          {section === 'identity' && <IdentitySection campaign={campaign} lang={lang} onChange={onChange} onMarkOnboarding={onMarkOnboarding} />}
          {section === 'table' && <TableSection campaign={campaign} lang={lang} onChange={onChange} onMarkOnboarding={onMarkOnboarding} />}
          {section === 'rules' && <RulesSection campaign={campaign} lang={lang} onChange={onChange} />}
          {section === 'world' && <LivingWorldSection campaign={campaign} lang={lang} onChange={onChange} />}
          {section === 'advanced' && <AdvancedSection campaign={campaign} lang={lang} onChange={onChange} worldCount={worldCount} worldMax={worldMax} />}
          {section === 'danger' && <DangerSection campaign={campaign} lang={lang} onClose={onClose} onChange={onChange} onDeleted={onDeleted} />}
        </div>
      </div>
    </div>
  );
}

function useStatus() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok, lang) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); } catch (e) { showPlanLimit(e); setMsg(errorMessage(e, lang)); } finally { setBusy(false); }
  };
  return { msg, busy, run, setMsg };
}

function IdentitySection({ campaign, lang, onChange, onMarkOnboarding }) {
  const [name, setName] = useState(campaign.name || '');
  const [tagline, setTagline] = useState(campaign.tagline || '');
  const [tone, setTone] = useState(campaign.tone || '');
  const [accent, setAccent] = useState(campaign.accent || '');
  const { msg, busy, run } = useStatus();
  const coverStatus = useStatus();
  const dirty = name !== (campaign.name || '') || tagline !== (campaign.tagline || '') || tone !== (campaign.tone || '') || accent !== (campaign.accent || '');

  const save = () => run(async () => {
    await api.patchCampaign(campaign.id, { name: name.trim() || campaign.name, tagline: tagline.trim(), tone, accent: isHexColor(accent) ? accent : '' });
    onChange?.();
  }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);

  const setCover = (dataUrl) => coverStatus.run(async () => {
    await api.setCampaignCover(campaign.id, dataUrl);
    if (dataUrl) onMarkOnboarding?.('cover');
    onChange?.();
  }, dataUrl ? t(lang, 'Capa atualizada ✓', 'Cover updated ✓') : t(lang, 'Capa removida', 'Cover removed'), lang);

  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Capa', 'Cover')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'A capa é salva assim que você escolhe.', 'The cover is saved as soon as you pick it.')}</p>
        <CoverPicker lang={lang} name={name} tagline={tagline} accent={isHexColor(accent) ? accent : ''}
          currentSrc={api.campaignCoverUrl(campaign)} fallbackSrc={defaultCoverArt(campaign)}
          busy={coverStatus.busy} onPick={setCover} />
        {coverStatus.msg && <span className="muted text-sm" role="status">{coverStatus.msg}</span>}
      </section>
      <section className="col gap-3">
        <h3 className="shell-h3">{t(lang, 'Nome, tom e cor', 'Name, tone and color')}</h3>
        <label className="col gap-1">
          <span>{t(lang, 'Nome', 'Name')}</span>
          <input className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="col gap-1">
          <span>{t(lang, 'Frase de efeito', 'Tagline')}</span>
          <input className="input" value={tagline} maxLength={160} onChange={(e) => setTagline(e.target.value)}
            placeholder={t(lang, 'Onde a névoa guarda segredos…', 'Where the mist keeps its secrets…')} />
        </label>
        <ToneAccentFields lang={lang} tone={tone} accent={accent} onTone={setTone} onAccent={setAccent} />
        <div className="row gap-2 shell-save-row">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty}>{t(lang, 'Salvar', 'Save')}</button>
          {msg
            ? <span className="muted text-sm" role="status">{msg}</span>
            : dirty && <span className="muted text-sm">{t(lang, 'Há mudanças não salvas', 'Unsaved changes')}</span>}
        </div>
      </section>
    </div>
  );
}

function TableSection({ campaign, lang, onChange, onMarkOnboarding }) {
  const { msg, busy, run } = useStatus();
  const tv = screenLink(window.location.origin, campaign.screenToken);
  const copy = async (text, flag) => {
    try { await navigator.clipboard?.writeText(text); } catch { /* sem clipboard */ }
    if (flag) onMarkOnboarding?.(flag);
    run(async () => {}, t(lang, 'Copiado ✓', 'Copied ✓'), lang);
  };
  const rotate = async (kind) => {
    const ok = await confirmDialog({
      message: kind === 'invite'
        ? t(lang, 'Gerar um novo código de convite? O antigo deixa de funcionar.', 'Generate a new invite code? The old one stops working.')
        : t(lang, 'Gerar um novo link do telão? O antigo deixa de funcionar.', 'Generate a new TV link? The old one stops working.'),
      confirmLabel: t(lang, 'Gerar novo', 'Generate new'),
    });
    if (!ok) return;
    run(async () => {
      if (kind === 'invite') await api.rotateInviteCode(campaign.id); else await api.rotateScreenToken(campaign.id);
      onChange?.();
    }, t(lang, 'Novo código gerado ✓', 'New code generated ✓'), lang);
  };
  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Convite', 'Invite')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'Os jogadores entram em Campanhas › Entrar com código.', 'Players join under Campaigns › Join with code.')}</p>
        <div className="invite-code-display">{campaign.inviteCode}</div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(campaign.inviteCode, 'invite')}>{t(lang, 'Copiar código', 'Copy code')}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rotate('invite')} disabled={busy}>{t(lang, 'Gerar novo código', 'New code')}</button>
        </div>
      </section>
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Telão', 'TV screen')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>{t(lang, 'Abra este link na TV ou tablet que a mesa vê.', 'Open this link on the TV or tablet the table watches.')}</p>
        <input className="input shell-link-input" readOnly value={tv} onFocus={(e) => e.target.select()} aria-label={t(lang, 'Link do telão', 'TV link')} />
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy(tv, 'tv')}>{t(lang, 'Copiar link', 'Copy link')}</button>
          <a className="btn btn-ghost btn-sm" href={tv} target="_blank" rel="noreferrer" onClick={() => onMarkOnboarding?.('tv')}>{t(lang, 'Abrir', 'Open')}</a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rotate('tv')} disabled={busy}>{t(lang, 'Gerar novo link', 'New link')}</button>
        </div>
      </section>
      <SeatsSection campaign={campaign} lang={lang} />
      {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}

/** Vagas da mesa: jogadores no limite do próprio plano entram ocupando uma vaga sua. */
function SeatsSection({ campaign, lang }) {
  const my = useMyPlan(true);
  const { used, max } = tableSlots(campaign, my);
  if (max == null) return null;
  const level = meterLevel(used, max);
  return (
    <section className={`col gap-2 pl-seats lvl-${level}`}>
      <h3 className="shell-h3">{t(lang, 'Vagas da mesa', 'Table seats')}</h3>
      {max > 0 ? (
        <>
          <div className="pl-seats-row">
            <span className="pl-track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={used}
              aria-label={t(lang, 'Vagas da mesa usadas', 'Table seats used')}>
              <span style={{ width: `${ratio(used, max) * 100}%` }} />
            </span>
            <strong className="mono">{used}/{max}</strong>
          </div>
          <p className="muted text-sm" style={{ margin: 0 }}>
            {t(lang,
              `${used} de ${max} vagas usadas. Quem já está no limite de personagens do próprio plano entra usando uma vaga sua — e esse personagem não conta no limite dele.`,
              `${used} of ${max} seats used. Players already at their own plan's character limit join using one of your seats — and that character doesn't count toward their limit.`)}
          </p>
        </>
      ) : (
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t(lang,
            'Seu plano não empresta vagas: cada jogador usa o limite de personagens do próprio plano. Nos planos de mestre, você pode receber jogadores que já estão no limite.',
            "Your plan doesn't lend seats: each player uses their own plan's character limit. On GM plans you can host players who are already at their limit.")}
        </p>
      )}
    </section>
  );
}

function RulesSection({ campaign, lang, onChange }) {
  const st = campaign.state || {};
  const mode = st.levelingMode === 'xp' ? 'xp' : 'milestone';
  const multi = st.allowMulticlass !== false;
  const { msg, busy, run } = useStatus();
  const patch = (p) => run(async () => { await api.patchCampaignState(campaign.id, p); onChange?.(); }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);
  return (
    <div className="col gap-4">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Como os personagens sobem de nível', 'How characters level up')}</h3>
        <div className="shell-segmented" role="radiogroup">
          {[['milestone', t(lang, 'Marcos', 'Milestones')], ['xp', 'XP']].map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} disabled={busy}
              className={`shell-seg ${mode === id ? 'active' : ''}`} onClick={() => mode !== id && patch({ levelingMode: id })}>{label}</button>
          ))}
        </div>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {mode === 'xp'
            ? t(lang, 'Você distribui XP em Grupo › Jogadores; ao atingir o total, o jogador pode subir.', 'You award XP under Party › Players; at the threshold, the player may level up.')
            : t(lang, 'Você libera a subida de nível quando a história pede (Grupo › Jogadores).', 'You unlock level ups when the story calls for it (Party › Players).')}
        </p>
      </section>
      <label className="rule-toggle">
        <input type="checkbox" checked={multi} disabled={busy} onChange={() => patch({ allowMulticlass: !multi })} />
        <span>{t(lang, 'Permitir multiclasse', 'Allow multiclassing')}</span>
      </label>
      {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}

function AdvancedSection({ campaign, lang, onChange, worldCount, worldMax }) {
  const on = !!campaign.advancedDice;
  const [open, setOpen] = useState(false);
  const { msg, busy, run } = useStatus();
  const toggle = () => run(async () => {
    await api.patchCampaign(campaign.id, { advancedDice: !on });
    if (on) setOpen(false);
    onChange?.();
  }, '', lang);
  return (
    <div className="col gap-4">
      <section className="col gap-2">
        <label className="rule-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={toggle} />
          <span>{t(lang, 'Dados preparados pelo mestre', 'DM-prepared dice')}</span>
        </label>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t(lang,
            'Para quem gosta: define os próximos resultados das rolagens feitas pelo app. A maioria das mesas não precisa disto — com dados físicos, o jogador digita o resultado.',
            'For those who want it: sets the next results of rolls made in the app. Most tables do not need this — with physical dice, players type the result.')}
        </p>
        {on && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(v => !v)} aria-expanded={open} style={{ alignSelf: 'flex-start' }}>
            {open ? t(lang, 'Fechar dados preparados', 'Close prepared dice') : t(lang, 'Abrir dados preparados', 'Open prepared dice')}
          </button>
        )}
        {on && open && (
          <Suspense fallback={<p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}>
            <AdvancedDice campaign={campaign} lang={lang} />
          </Suspense>
        )}
        {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
      </section>
      {worldCount != null && (
        <section className="col gap-1">
          <h3 className="shell-h3">{t(lang, 'Tamanho do mundo', 'World size')}</h3>
          <div className="shell-meter" role="meter" aria-valuemin={0} aria-valuemax={worldMax} aria-valuenow={worldCount}>
            <span style={{ width: `${Math.min(100, (worldCount / (worldMax || 500)) * 100)}%` }} />
          </div>
          <span className="muted text-sm">{t(lang, `${worldCount} de ${worldMax} cartões (lugares, NPCs, facções, itens…). Cada campanha comporta até ${worldMax}.`, `${worldCount} of ${worldMax} cards (places, NPCs, factions, items…). Each campaign holds up to ${worldMax}.`)}</span>
        </section>
      )}
    </div>
  );
}

function LivingWorldSection({ campaign, lang, onChange }) {
  const on = immersionOn(campaign);
  const fog = campaign.fogHint === true;
  const { msg, busy, run } = useStatus();
  const patch = (body) => run(async () => { await api.patchCampaign(campaign.id, body); onChange?.(); }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);
  return (
    <div className="col gap-4">
      <section className="col gap-2">
        <label className="rule-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={() => patch({ immersion: !on })} />
          <span>{t(lang, 'Mundo vivo', 'Living world')}</span>
        </label>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t(lang,
            'O Atlas ganha o céu do seu mundo (cada cartão uma estrela), as páginas em branco do cronista, os rumores da taverna e os ecos da mesa — os jogadores podem se arrepiar, desconfiar ou querer voltar ao que você revelou, e você ouve. Nada é decidido por você; desligue quando quiser silêncio.',
            'The Atlas gains your world\'s sky (each card a star), the chronicler\'s blank pages, tavern rumors and echoes from the table — players can shiver, doubt or long to return to what you revealed, and you hear it. Nothing is decided for you; turn it off when you want silence.')}
        </p>
      </section>
      {on && (
        <section className="col gap-2">
          <label className="rule-toggle">
            <input type="checkbox" checked={fog} disabled={busy} onChange={() => patch({ fogHint: !fog })} />
            <span>{t(lang, 'Deixar os jogadores pressentirem o desconhecido', 'Let players sense the unknown')}</span>
          </label>
          <p className="muted text-sm" style={{ margin: 0 }}>
            {t(lang,
              'Na névoa do Mundo deles aparece uma noção vaga ("alguns lugares", "muitos segredos") do que ainda não conhecem — nunca nomes nem números.',
              'The fog in their World shows a vague sense ("a few places", "many secrets") of what they do not know yet — never names or numbers.')}
          </p>
        </section>
      )}
      {msg && <p className="muted text-sm" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}

function DangerSection({ campaign, lang, onClose, onChange }) {
  const [confirming, setConfirming] = useState(false);
  const { msg, busy, run } = useStatus();
  const closed = closedInfo(campaign);
  if (closed) {
    const reopen = () => run(async () => {
      await plansApi.reopenCampaign(campaign.id);
      onChange?.();
    }, t(lang, 'Campanha reaberta ✓', 'Campaign reopened ✓'), lang);
    return (
      <div className="col gap-4">
        <section className="col gap-2 lv-danger pl-closing">
          <h3 className="shell-h3">{t(lang, 'Campanha encerrada', 'Campaign closed')}</h3>
          <p className="text-sm" style={{ margin: 0 }}>{closedText(campaign, lang)}</p>
          <p className="muted text-sm" style={{ margin: 0 }}>
            {t(lang,
              'Até lá ela fica só para leitura. Reabrindo, tudo volta como estava (se couber no número de campanhas do seu plano).',
              'Until then it is read-only. Reopening brings everything back as it was (if it fits in your plan\'s campaign count).')}
          </p>
          <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', minHeight: 40 }} onClick={reopen} disabled={busy}>
            {busy ? t(lang, 'Reabrindo…', 'Reopening…') : t(lang, '↺ Reabrir campanha', '↺ Reopen campaign')}
          </button>
          {msg && <span className="muted text-sm" role="status">{msg}</span>}
        </section>
      </div>
    );
  }
  return (
    <div className="col gap-4">
      <section className="col gap-2 lv-danger">
        <h3 className="shell-h3">{t(lang, 'Encerrar campanha', 'Close campaign')}</h3>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t(lang,
            `A mesa fica ${CLOSED_DAYS} dias só para leitura, com um aviso para todos baixarem as fichas. Nesse prazo você pode reabrir. Depois disso, o mundo, as aventuras e o diário são apagados de vez.`,
            `The table stays read-only for ${CLOSED_DAYS} days, with a notice for everyone to download their sheets. You can reopen it during that time. After that, the world, adventures and diary are deleted for good.`)}
        </p>
        <button type="button" className="lv-btn-danger" onClick={() => setConfirming(true)}>
          ⌛ {t(lang, 'Encerrar campanha…', 'Close campaign…')}
        </button>
      </section>
      {confirming && <DeleteCampaignDialog campaign={campaign} lang={lang} onCancel={() => setConfirming(false)}
        onDone={(res) => {
          const purge = res?.campaign?.purgeAt || res?.purgeAt || new Date(Date.now() + CLOSED_DAYS * 86400000).toISOString();
          flash(t(lang, `A campanha "${campaign.name}" foi encerrada. Todos podem baixar as fichas até ${formatDay(purge, lang)}.`,
            `The campaign "${campaign.name}" was closed. Everyone can download their sheets until ${formatDay(purge, lang)}.`), { ms: 5200 });
          setConfirming(false);
          onClose?.();
          onChange?.();
        }} />}
    </div>
  );
}

function DeleteCampaignDialog({ campaign, lang, onCancel, onDone }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = confirmNameMatches(typed, campaign.name);
  const submit = async (e) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setErr('');
    try {
      const res = await plansApi.closeCampaign(campaign.id);
      onDone(res);
    } catch (ex) {
      showPlanLimit(ex);
      setErr(errorMessage(ex, lang));
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }} onClick={(e) => { e.stopPropagation(); if (!busy) onCancel(); }}>
      <form className="modal col gap-3" role="alertdialog" aria-modal="true" aria-labelledby="lv-del-title" aria-describedby="lv-del-desc"
        onClick={(e) => e.stopPropagation()} onSubmit={submit}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!busy) onCancel(); } }}>
        <h2 id="lv-del-title" style={{ margin: 0 }}>{t(lang, 'Encerrar esta campanha?', 'Close this campaign?')}</h2>
        <div id="lv-del-desc" className="col gap-2">
          <p style={{ margin: 0 }}>
            <span className="lv-confirm-name">{campaign.name}</span>
            {t(lang, ` fica ${CLOSED_DAYS} dias só para leitura (dá para reabrir nesse prazo). Depois, apaga para sempre:`,
              ` stays read-only for ${CLOSED_DAYS} days (you can reopen it meanwhile). After that, it permanently deletes:`)}
          </p>
          <ul className="lv-danger-list">
            <li>{t(lang, 'todo o mundo: lugares, NPCs, facções, segredos, mapas e imagens;', 'the whole world: places, NPCs, factions, secrets, maps and images;')}</li>
            <li>{t(lang, 'as aventuras e o plano da próxima sessão;', 'the adventures and the next-session plan;')}</li>
            <li>{t(lang, 'o diário, a crônica, o combate e os itens da mesa.', 'the diary, the chronicle, combat and the table\'s items.')}</li>
          </ul>
          <p className="muted text-sm" style={{ margin: 0 }}>
            {t(lang, 'As fichas dos jogadores continuam com eles. Quem entrou usando uma vaga da sua mesa fica com a ficha se o próprio plano tiver espaço; senão, ela é apagada no fim do prazo — por isso todos veem o aviso para baixar.',
              "Players keep their sheets. Anyone who joined using one of your table seats keeps the sheet if their own plan has room; otherwise it is deleted at the end of the window — that's why everyone sees the download notice.")}
          </p>
        </div>
        <label className="col gap-1" style={{ marginTop: 8 }}>
          <span>{t(lang, 'Para confirmar, digite o nome da campanha:', 'To confirm, type the campaign name:')}</span>
          <input className="input" value={typed} autoFocus autoComplete="off" spellCheck={false}
            onChange={(e) => setTyped(e.target.value)} placeholder={campaign.name} aria-invalid={typed !== '' && !ok} />
        </label>
        {err && <p role="alert" style={{ margin: 0, color: 'var(--blood-bright)' }}>{err}</p>}
        <div className="row gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button type="submit" className="lv-btn-danger" disabled={!ok || busy}>
            {busy ? t(lang, 'Encerrando…', 'Closing…') : t(lang, 'Encerrar campanha', 'Close campaign')}
          </button>
        </div>
      </form>
    </div>
  );
}
