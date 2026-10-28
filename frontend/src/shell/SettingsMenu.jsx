// ⚙ Ajustes da campanha (DESIGN 1.2): identidade (nome, frase, capa, cor, tom),
// convite e link da Tela, modo de nível e multiclasse, e Ferramentas avançadas
// (Dados preparados pelo mestre — desligado por padrão), Mundo vivo (imersão
// do Mundo) e Zona de perigo (encerrar a campanha — 30 dias só leitura para
// baixar as fichas — ou reabrir, confirmando pelo nome).
//
// Uma folha da mesa (MesaSheet, plano F8 §5.J), com um só corpo rolável:
// - celular: a lista das 6 seções (linhas de 56 px com o resumo de cada uma) e,
//   ao tocar numa, a página dela com "← Ajustes" no cabeçalho. Aberta pelo Mais
//   já numa seção, cai direto na página;
// - PC (≥ 768): diálogo de 880 px com a navegação das 6 seções à esquerda (todas à
//   vista) e a seção à direita.
// Em Identidade o "Salvar" (nome, frase, tom e cor) fica no rodapé preso, sempre à
// vista; fechar com mudança não salva pergunta antes. A capa salva sozinha.
// Os Dados preparados são uma página dentro de Ferramentas avançadas (o Mais › 🎲
// abre direto nela). Nada mexe debaixo do dedo: no celular a folha tem a altura do
// conteúdo, então um toque nunca faz aparecer ou sumir um bloco — o que depende de
// uma opção fica sempre à vista (apagado com o motivo escrito) e a linha do "Salvo ✓"
// já guarda o lugar dela.
import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import CoverPicker from '../campaigns/CoverPicker.jsx';
import MesaSheet from './MesaSheet.jsx';
import ToneAccentFields from './ToneAccentFields.jsx';
import { defaultCoverArt, isHexColor, screenLink, SETTINGS_SECTIONS, settingsSectionLabel, settingsSummary, t } from './shell-logic.js';
import { confirmNameMatches, immersionOn } from '../world/living/living-logic.js';
import { flash } from '../play/flash.js';
import { clearWorld, worldErrorText } from '../world/world-api.js';
import '../world/living/living.css';
import { plansApi, showPlanLimit } from '../plans/plans-api.js';
import useMyPlan from '../plans/useMyPlan.js';
import { CLOSED_DAYS, closedInfo, closedText, formatDay, meterLevel, ratio, tableSlots } from '../plans/plans-logic.js';
import '../plans/plans.css';

const AdvancedDice = lazy(() => import('./AdvancedDice.jsx'));

const SECTIONS = SETTINGS_SECTIONS.map(s => s.id);

/** PC/tablet (≥ 768): navegação lateral; abaixo disso, lista → página. */
function useWide() {
  const q = '(min-width: 768px)';
  const get = () => { try { return window.matchMedia(q).matches; } catch { return false; } };
  const [wide, setWide] = useState(get);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

/** Página dos Dados preparados: fica dentro de Ferramentas avançadas. */
const DICE_PAGE = { id: 'dice', icon: '🎲', parent: 'advanced', pt: 'Dados preparados', en: 'Prepared dice' };

/**
 * initialSection: abre já numa seção (as linhas da folha "Mais" do celular).
 * 'dice' = a página dos Dados preparados. Sem seção, o celular abre na lista das 6.
 */
export default function SettingsMenu({ campaign, lang, onClose, onChange, worldCount = null, worldMax = 500, onMarkOnboarding, onDeleted, onWorldCleared, initialSection = null }) {
  const [section, setSection] = useState(() => (initialSection === 'dice' || SECTIONS.includes(initialSection) ? initialSection : 'identity'));
  // só no celular: 'list' (as 6 seções) ou 'page' (a seção escolhida)
  const [view, setView] = useState(initialSection ? 'page' : 'list');
  const wide = useWide();
  const identity = useIdentityForm(campaign, lang, onChange);
  const navId = useId();
  const showNav = wide || view === 'list';
  const showPage = wide || view === 'page';
  const sumOpts = { immersion: immersionOn(campaign), worldCount, worldMax };
  const isDice = section === 'dice';
  const cur = isDice ? DICE_PAGE : SETTINGS_SECTIONS.find(s => s.id === section);
  const curLabel = isDice ? t(lang, DICE_PAGE.pt, DICE_PAGE.en) : settingsSectionLabel(section, lang);
  const navCurrent = isDice ? DICE_PAGE.parent : section;

  const open = (id) => { setSection(id); setView('page'); };
  // da página dos dados, volta a Ferramentas avançadas; das seções, à lista das 6
  const back = isDice ? (
    <button type="button" className="shell-set-back" onClick={() => open(DICE_PAGE.parent)}>
      <span aria-hidden="true">←</span> {settingsSectionLabel(DICE_PAGE.parent, lang)}
    </button>
  ) : (
    <button type="button" className="shell-set-back" onClick={() => setView('list')}>
      <span aria-hidden="true">←</span> {t(lang, 'Ajustes', 'Settings')}
    </button>
  );

  return (
    <MesaSheet
      lang={lang} size="auto" width="lg"
      className={`shell-settings ${wide ? 'is-wide' : `is-${view}`}`}
      icon={!wide && view === 'page' ? cur?.icon : '⚙'}
      eyebrow={!wide && view === 'page' ? back : campaign.name}
      title={!wide && view === 'page' ? curLabel : t(lang, 'Ajustes da campanha', 'Campaign settings')}
      onClose={onClose}
      dirty={identity.dirty}
      dirtyText={t(lang, 'O nome, a frase, o tom ou a cor mudaram e ainda não foram salvos.', 'The name, tagline, tone or color changed and were not saved yet.')}
      footer={section === 'identity' && showPage ? <IdentityFooter form={identity} lang={lang} /> : null}
    >
      <div className={`shell-set-grid ${showNav && showPage ? 'has-nav' : ''}`}>
        {showNav && (
          <nav className="shell-set-nav" aria-label={t(lang, 'Seções dos ajustes', 'Settings sections')} id={navId}>
            {SETTINGS_SECTIONS.map(s => (
              <button key={s.id} type="button" className={`shell-set-nav-row ${s.id === 'danger' ? 'is-danger' : ''}`}
                aria-current={wide && s.id === navCurrent ? 'page' : undefined} onClick={() => open(s.id)}>
                <span className="shell-set-nav-ico" aria-hidden="true">{s.icon}</span>
                <span className="shell-set-nav-main">
                  <span className="shell-set-nav-title">{settingsSectionLabel(s.id, lang)}</span>
                  <span className="shell-set-nav-sub">{settingsSummary(s.id, campaign, lang, sumOpts)}</span>
                </span>
                {!wide && <span className="shell-set-nav-chev" aria-hidden="true">›</span>}
              </button>
            ))}
          </nav>
        )}
        {showPage && (
          <div className="shell-set-page" role="region" aria-label={curLabel}>
            {wide && isDice && back}
            {wide && <h3 className="shell-set-page-title"><span aria-hidden="true">{cur?.icon}</span> {curLabel}</h3>}
            {section === 'identity' && <IdentitySection form={identity} campaign={campaign} lang={lang} onChange={onChange} onMarkOnboarding={onMarkOnboarding} />}
            {section === 'table' && <TableSection campaign={campaign} lang={lang} onChange={onChange} onMarkOnboarding={onMarkOnboarding} />}
            {section === 'rules' && <RulesSection campaign={campaign} lang={lang} onChange={onChange} />}
            {section === 'world' && <LivingWorldSection campaign={campaign} lang={lang} onChange={onChange} />}
            {section === 'advanced' && <AdvancedSection campaign={campaign} lang={lang} onChange={onChange} worldCount={worldCount} worldMax={worldMax} onOpenDice={() => open('dice')} />}
            {isDice && <DiceSection campaign={campaign} lang={lang} onBack={() => open(DICE_PAGE.parent)} />}
            {section === 'danger' && <DangerSection campaign={campaign} lang={lang} onClose={onClose} onChange={onChange} onDeleted={onDeleted} worldCount={worldCount} onWorldCleared={onWorldCleared} />}
          </div>
        )}
      </div>
    </MesaSheet>
  );
}

/** "Salvo ✓"/erro de uma seção: a linha existe sempre (vazia), para nada pular quando o aviso chega. */
function StatusLine({ msg }) {
  return <p className="shell-set-status" role="status">{msg}</p>;
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

/** Nome, frase, tom e cor: o estado mora na folha (o Salvar fica no rodapé preso). */
function useIdentityForm(campaign, lang, onChange) {
  const [name, setName] = useState(campaign.name || '');
  const [tagline, setTagline] = useState(campaign.tagline || '');
  const [tone, setTone] = useState(campaign.tone || '');
  const [accent, setAccent] = useState(campaign.accent || '');
  const status = useStatus();
  // Nome e frase vão aparados: o espaço que o teclado do celular põe depois da
  // sugestão não conta como mudança (nem deixa "Há mudanças não salvas" depois do Salvar).
  const same = (a, b) => (a || '').trim() === (b || '').trim();
  const dirty = !same(name, campaign.name) || !same(tagline, campaign.tagline) || tone !== (campaign.tone || '') || accent !== (campaign.accent || '');
  const save = () => status.run(async () => {
    await api.patchCampaign(campaign.id, { name: name.trim() || campaign.name, tagline: tagline.trim(), tone, accent: isHexColor(accent) ? accent : '' });
    // o que foi salvo vira a nova base (o GET da campanha chega logo depois)
    setName(name.trim() || campaign.name || '');
    setTagline(tagline.trim());
    await onChange?.();
  }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);
  return { name, setName, tagline, setTagline, tone, setTone, accent, setAccent, dirty, save, msg: status.msg, busy: status.busy, setMsg: status.setMsg };
}

function IdentityFooter({ form, lang }) {
  const { dirty, busy, msg, save } = form;
  return (
    <div className="shell-set-save">
      <p className={`shell-set-save-msg ${dirty ? 'is-dirty' : ''}`} role="status">
        {busy ? t(lang, 'Salvando…', 'Saving…')
          : dirty ? t(lang, 'Há mudanças não salvas', 'Unsaved changes')
          : msg || t(lang, 'Nenhuma mudança para salvar', 'No changes to save')}
      </p>
      <button type="button" className="mesa-btn mesa-btn-lg is-primary shell-set-save-btn" onClick={save} disabled={busy || !dirty}>
        {busy ? '…' : t(lang, 'Salvar', 'Save')}
      </button>
    </div>
  );
}

function IdentitySection({ form, campaign, lang, onChange, onMarkOnboarding }) {
  const { name, setName, tagline, setTagline, tone, setTone, accent, setAccent, setMsg } = form;
  const coverStatus = useStatus();
  const nameId = useId();
  const tagId = useId();
  const edit = (fn) => (v) => { fn(v); setMsg(''); };

  const setCover = (dataUrl) => coverStatus.run(async () => {
    await api.setCampaignCover(campaign.id, dataUrl);
    if (dataUrl) onMarkOnboarding?.('cover');
    onChange?.();
  }, dataUrl ? t(lang, 'Capa atualizada ✓', 'Cover updated ✓') : t(lang, 'Capa removida', 'Cover removed'), lang);

  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Capa', 'Cover')}</h3>
        <p className="shell-set-hint">{t(lang, 'A capa é salva assim que você escolhe.', 'The cover is saved as soon as you pick it.')}</p>
        <CoverPicker lang={lang} name={name} tagline={tagline} accent={isHexColor(accent) ? accent : ''}
          currentSrc={api.campaignCoverUrl(campaign)} fallbackSrc={defaultCoverArt(campaign)}
          busy={coverStatus.busy} onPick={setCover} />
        {coverStatus.msg && <span className="shell-set-status" role="status">{coverStatus.msg}</span>}
      </section>
      <section className="col gap-3">
        <h3 className="shell-h3">{t(lang, 'Nome, tom e cor', 'Name, tone and color')}</h3>
        <div className="mesa-field">
          <label htmlFor={nameId}>{t(lang, 'Nome', 'Name')}</label>
          <input id={nameId} value={name} maxLength={120} onChange={(e) => edit(setName)(e.target.value)} />
        </div>
        <div className="mesa-field">
          <label htmlFor={tagId}>{t(lang, 'Frase de efeito', 'Tagline')}</label>
          <input id={tagId} value={tagline} maxLength={160} onChange={(e) => edit(setTagline)(e.target.value)}
            placeholder={t(lang, 'Onde a névoa guarda segredos…', 'Where the mist keeps its secrets…')} />
        </div>
        <ToneAccentFields lang={lang} tone={tone} accent={accent} onTone={edit(setTone)} onAccent={edit(setAccent)} />
      </section>
    </div>
  );
}

function TableSection({ campaign, lang, onChange, onMarkOnboarding }) {
  const { msg, busy, run } = useStatus();
  const tv = screenLink(window.location.origin, campaign.screenToken);
  const linkId = useId();
  const copy = async (text, flag) => {
    try { await navigator.clipboard?.writeText(text); } catch { /* sem clipboard */ }
    if (flag) onMarkOnboarding?.(flag);
    run(async () => {}, t(lang, 'Copiado ✓', 'Copied ✓'), lang);
  };
  const rotate = async (kind) => {
    const ok = await confirmDialog({
      message: kind === 'invite'
        ? t(lang, 'Gerar um novo código de convite? O antigo deixa de funcionar.', 'Generate a new invite code? The old one stops working.')
        : t(lang, 'Gerar um novo link da Tela? O antigo deixa de funcionar.', 'Generate a new screen link? The old one stops working.'),
      confirmLabel: t(lang, 'Gerar novo', 'Generate new'),
    });
    if (!ok) return;
    run(async () => {
      if (kind === 'invite') await api.rotateInviteCode(campaign.id); else await api.rotateScreenToken(campaign.id);
      onChange?.();
    }, kind === 'invite' ? t(lang, 'Novo código gerado ✓', 'New code generated ✓') : t(lang, 'Novo link gerado ✓', 'New link generated ✓'), lang);
  };
  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Convite', 'Invite')}</h3>
        <p className="shell-set-hint">{t(lang, 'Os jogadores entram em Campanhas › Entrar com código.', 'Players join under Campaigns › Join with code.')}</p>
        <div className="invite-code-display">{campaign.inviteCode}</div>
        <div className="shell-set-actions">
          <button type="button" className="mesa-btn is-primary" onClick={() => copy(campaign.inviteCode, 'invite')}>{t(lang, 'Copiar código', 'Copy code')}</button>
          <button type="button" className="mesa-btn" onClick={() => rotate('invite')} disabled={busy}>{t(lang, 'Gerar novo código', 'New code')}</button>
        </div>
      </section>
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Tela', 'Screen')}</h3>
        <div className="mesa-field">
          <label htmlFor={linkId}>{t(lang, 'Link da Tela', 'Screen link')}</label>
          <input id={linkId} className="shell-link-input" readOnly value={tv} onFocus={(e) => e.target.select()} />
        </div>
        <p className="shell-set-hint">{t(lang, 'Abra este link na TV ou tablet que a mesa vê.', 'Open this link on the TV or tablet the table watches.')}</p>
        <div className="shell-set-actions">
          <button type="button" className="mesa-btn is-primary" onClick={() => copy(tv, 'tv')}>{t(lang, 'Copiar link', 'Copy link')}</button>
          <a className="mesa-btn" href={tv} target="_blank" rel="noreferrer" onClick={() => onMarkOnboarding?.('tv')}>{t(lang, 'Abrir ↗', 'Open ↗')}</a>
          <button type="button" className="mesa-btn" onClick={() => rotate('tv')} disabled={busy}>{t(lang, 'Gerar novo link', 'New link')}</button>
        </div>
      </section>
      <SeatsSection campaign={campaign} lang={lang} />
      <StatusLine msg={msg} />
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
          <p className="shell-set-hint">
            {t(lang,
              `${used} de ${max} vagas usadas. Quem já está no limite de personagens do próprio plano entra usando uma vaga sua — e esse personagem não conta no limite dele.`,
              `${used} of ${max} seats used. Players already at their own plan's character limit join using one of your seats — and that character doesn't count toward their limit.`)}
          </p>
        </>
      ) : (
        <p className="shell-set-hint">
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
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <h3 className="shell-h3">{t(lang, 'Como os personagens sobem de nível', 'How characters level up')}</h3>
        <div className="mesa-seg shell-set-seg" role="radiogroup" aria-label={t(lang, 'Como os personagens sobem de nível', 'How characters level up')}>
          {[['milestone', t(lang, 'Marcos', 'Milestones')], ['xp', 'XP']].map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} disabled={busy}
              className={`mesa-seg-btn ${mode === id ? 'active' : ''}`} onClick={() => mode !== id && patch({ levelingMode: id })}>{label}</button>
          ))}
        </div>
        {/* as duas explicações sempre à vista: trocar a opção não muda a altura */}
        <ul className="shell-set-hint shell-set-opts">
          <li className={mode === 'milestone' ? 'is-on' : ''}><strong>{t(lang, 'Marcos', 'Milestones')}:</strong> {t(lang, 'você libera a subida de nível quando a história pede.', 'you unlock level ups when the story calls for it.')}</li>
          <li className={mode === 'xp' ? 'is-on' : ''}><strong>XP:</strong> {t(lang, 'você distribui XP; ao atingir o total, o jogador pode subir.', 'you award XP; at the threshold, the player may level up.')}</li>
          <li>{t(lang, 'As duas coisas ficam em Grupo › Pedidos.', 'Both live under Party › Requests.')}</li>
        </ul>
      </section>
      <section className="col gap-2">
        <label className="rule-toggle">
          <input type="checkbox" checked={multi} disabled={busy} onChange={() => patch({ allowMulticlass: !multi })} />
          <span>{t(lang, 'Permitir multiclasse', 'Allow multiclassing')}</span>
        </label>
      </section>
      <StatusLine msg={msg} />
    </div>
  );
}

function AdvancedSection({ campaign, lang, onChange, worldCount, worldMax, onOpenDice }) {
  const on = !!campaign.advancedDice;
  const { msg, busy, run } = useStatus();
  const toggle = () => run(async () => {
    await api.patchCampaign(campaign.id, { advancedDice: !on });
    onChange?.();
  }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);
  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <label className="rule-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={toggle} />
          <span>{t(lang, 'Dados preparados pelo mestre', 'DM-prepared dice')}</span>
        </label>
        <p className="shell-set-hint">
          {t(lang,
            'Para quem gosta: define os próximos resultados das rolagens feitas pelo app. A maioria das mesas não precisa disto — com dados físicos, o jogador digita o resultado.',
            'For those who want it: sets the next results of rolls made in the app. Most tables do not need this — with physical dice, players type the result.')}
        </p>
        {/* sempre à vista (ligar e desligar não mudam a altura); desligado, o motivo fica escrito */}
        <button type="button" className="mesa-btn shell-set-open" onClick={onOpenDice} disabled={!on}>
          🎲 {t(lang, 'Abrir dados preparados', 'Open prepared dice')} <span aria-hidden="true">›</span>
        </button>
        <p className="shell-set-hint shell-set-why">
          {on
            ? t(lang, 'Filas por jogador, próximo resultado e histórico.', 'Queues per player, next result and history.')
            : t(lang, 'Ligue a opção acima para abrir.', 'Turn on the option above to open it.')}
        </p>
        <StatusLine msg={msg} />
      </section>
      {worldCount != null && (
        <section className="col gap-2">
          <h3 className="shell-h3">{t(lang, 'Tamanho do mundo', 'World size')}</h3>
          <div className="shell-meter" role="meter" aria-valuemin={0} aria-valuemax={worldMax} aria-valuenow={worldCount}
            aria-label={t(lang, 'Cartões do Mundo', 'World cards')}>
            <span style={{ width: `${Math.min(100, (worldCount / (worldMax || 500)) * 100)}%` }} />
          </div>
          <span className="shell-set-hint">{t(lang, `${worldCount} de ${worldMax} cartões (lugares, NPCs, facções, itens…). Cada campanha comporta até ${worldMax}.`, `${worldCount} of ${worldMax} cards (places, NPCs, factions, items…). Each campaign holds up to ${worldMax}.`)}</span>
        </section>
      )}
    </div>
  );
}

/** A página dos Dados preparados (Ferramentas avançadas › Abrir, ou Mais › 🎲). */
function DiceSection({ campaign, lang, onBack }) {
  if (!campaign.advancedDice) {
    return (
      <div className="col gap-3 shell-settings-form">
        <p className="shell-set-hint">{t(lang, 'Os dados preparados estão desligados. Ligue em Ferramentas avançadas.', 'Prepared dice are off. Turn them on under Advanced tools.')}</p>
        <button type="button" className="mesa-btn shell-set-open" onClick={onBack}>{t(lang, 'Ir para Ferramentas avançadas', 'Go to Advanced tools')}</button>
      </div>
    );
  }
  return (
    <Suspense fallback={<p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}>
      <AdvancedDice campaign={campaign} lang={lang} />
    </Suspense>
  );
}

function LivingWorldSection({ campaign, lang, onChange }) {
  const on = immersionOn(campaign);
  const fog = campaign.fogHint === true;
  const { msg, busy, run } = useStatus();
  const patch = (body) => run(async () => { await api.patchCampaign(campaign.id, body); onChange?.(); }, t(lang, 'Salvo ✓', 'Saved ✓'), lang);
  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2">
        <label className="rule-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={() => patch({ immersion: !on })} />
          <span>{t(lang, 'Mundo vivo', 'Living world')}</span>
        </label>
        <p className="shell-set-hint">
          {t(lang,
            'O Atlas ganha o céu do seu mundo (cada cartão uma estrela), as páginas em branco do cronista, os rumores da taverna e os ecos da mesa — os jogadores podem se arrepiar, desconfiar ou querer voltar ao que você revelou, e você ouve. Nada é decidido por você; desligue quando quiser silêncio.',
            'The Atlas gains your world\'s sky (each card a star), the chronicler\'s blank pages, tavern rumors and echoes from the table — players can shiver, doubt or long to return to what you revealed, and you hear it. Nothing is decided for you; turn it off when you want silence.')}
        </p>
      </section>
      {/* sempre à vista: sem o Mundo vivo fica apagado, com o motivo escrito */}
      <section className="col gap-2">
        <label className={`rule-toggle ${on ? '' : 'is-off'}`}>
          <input type="checkbox" checked={on && fog} disabled={busy || !on} onChange={() => patch({ fogHint: !fog })} />
          <span>{t(lang, 'Deixar os jogadores pressentirem o desconhecido', 'Let players sense the unknown')}</span>
        </label>
        <p className="shell-set-hint">
          {t(lang,
            'Na névoa do Mundo deles aparece uma noção vaga ("alguns lugares", "muitos segredos") do que ainda não conhecem — nunca nomes nem números. Só vale com o Mundo vivo ligado.',
            'The fog in their World shows a vague sense ("a few places", "many secrets") of what they do not know yet — never names or numbers. Only works with the Living world on.')}
        </p>
      </section>
      <StatusLine msg={msg} />
    </div>
  );
}

function DangerSection({ campaign, lang, onClose, onChange, worldCount, onWorldCleared }) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { msg, busy, run } = useStatus();
  const closed = closedInfo(campaign);
  if (closed) {
    const reopen = () => run(async () => {
      await plansApi.reopenCampaign(campaign.id);
      onChange?.();
    }, t(lang, 'Campanha reaberta ✓', 'Campaign reopened ✓'), lang);
    return (
      <div className="col gap-4 shell-settings-form">
        <section className="col gap-2 lv-danger pl-closing">
          <h3 className="shell-h3">{t(lang, 'Campanha encerrada', 'Campaign closed')}</h3>
          <p className="text-sm" style={{ margin: 0 }}>{closedText(campaign, lang)}</p>
          <p className="shell-set-hint">
            {t(lang,
              'Até lá ela fica só para leitura. Reabrindo, tudo volta como estava (se couber no número de campanhas do seu plano).',
              'Until then it is read-only. Reopening brings everything back as it was (if it fits in your plan\'s campaign count).')}
          </p>
          <button type="button" className="mesa-btn is-primary shell-set-reopen" onClick={reopen} disabled={busy}>
            {busy ? t(lang, 'Reabrindo…', 'Reopening…') : t(lang, '↺ Reabrir campanha', '↺ Reopen campaign')}
          </button>
          <StatusLine msg={msg} />
        </section>
      </div>
    );
  }
  return (
    <div className="col gap-4 shell-settings-form">
      <section className="col gap-2 lv-danger">
        <h3 className="shell-h3">{t(lang, 'Esvaziar o Mundo', 'Empty the World')}</h3>
        <p className="shell-set-hint">
          {t(lang,
            'Apaga todos os cartões do Mundo (lugares, NPCs, facções, itens, segredos, mapas e imagens) para começar outro do zero. A campanha, os jogadores, o diário e o combate continuam.',
            'Deletes every World card (places, NPCs, factions, items, secrets, maps and images) so you can start another from scratch. The campaign, players, diary and combat stay.')}
        </p>
        <button type="button" className="lv-btn-danger" onClick={() => setClearing(true)} disabled={worldCount === 0}>
          🗑 {worldCount === 0 ? t(lang, 'O Mundo já está vazio', 'The World is already empty') : t(lang, 'Esvaziar o Mundo…', 'Empty the World…')}
        </button>
      </section>
      {clearing && <ClearWorldDialog campaign={campaign} lang={lang} worldCount={worldCount} onCancel={() => setClearing(false)}
        onDone={async (res) => {
          setClearing(false);
          const n = res?.deleted?.entries ?? 0;
          flash(t(lang, `O Mundo foi esvaziado (${n} ${n === 1 ? 'cartão apagado' : 'cartões apagados'}).`, `The World was emptied (${n} ${n === 1 ? 'card' : 'cards'} deleted).`), { ms: 4200 });
          onClose?.();
          await onWorldCleared?.();
        }} />}
      <section className="col gap-2 lv-danger">
        <h3 className="shell-h3">{t(lang, 'Encerrar campanha', 'Close campaign')}</h3>
        <p className="shell-set-hint">
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

/** Rodapé das confirmações de digitar o nome: Cancelar e a ação em vermelho (empilhados no celular). */
function NameConfirmFoot({ formId, lang, busy, ok, label, busyLabel, onCancel }) {
  return (
    <div className="mesa-actions is-stack">
      <button type="button" className="mesa-btn" onClick={onCancel} disabled={busy}>{t(lang, 'Cancelar', 'Cancel')}</button>
      <button type="submit" form={formId} className="mesa-btn is-danger" disabled={!ok || busy}>{busy ? busyLabel : label}</button>
    </div>
  );
}

function ClearWorldDialog({ campaign, lang, worldCount, onCancel, onDone }) {
  const [typed, setTyped] = useState('');
  const [adventures, setAdventures] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const formId = useId();
  const nameId = useId();
  const ok = confirmNameMatches(typed, campaign.name);
  const submit = async (e) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setErr('');
    try {
      const res = await clearWorld(campaign.id, typed, { adventures });
      onDone(res);
    } catch (ex) {
      setErr(worldErrorText(ex, lang));
      setBusy(false);
    }
  };
  return (
    <MesaSheet lang={lang} size="auto" width="sm" role="alertdialog" className="shell-name-confirm"
      title={t(lang, 'Esvaziar o Mundo?', 'Empty the World?')} icon="🗑"
      onClose={() => { if (!busy) onCancel(); }} initialFocus={`#${CSS.escape(nameId)}`}
      footer={<NameConfirmFoot formId={formId} lang={lang} busy={busy} ok={ok} onCancel={onCancel}
        label={t(lang, 'Esvaziar o Mundo', 'Empty the World')} busyLabel={t(lang, 'Apagando…', 'Deleting…')} />}>
      <form id={formId} className="col gap-3" onSubmit={submit}>
        <p style={{ margin: 0 }}>
          {worldCount != null
            ? t(lang, `Os ${worldCount} cartões do Mundo de `, `The ${worldCount} World cards of `)
            : t(lang, 'Todos os cartões do Mundo de ', 'All World cards of ')}
          <span className="lv-confirm-name">{campaign.name}</span>
          {t(lang, ' serão apagados para sempre, com segredos, mapas e imagens. Não dá para desfazer.', ' will be deleted for good, with secrets, maps and images. This cannot be undone.')}
        </p>
        <label className="rule-toggle shell-name-check">
          <input type="checkbox" checked={adventures} onChange={(e) => setAdventures(e.target.checked)} />
          <span>{t(lang, 'Apagar também as aventuras da campanha', "Also delete the campaign's adventures")}</span>
        </label>
        <div className="mesa-field">
          <label htmlFor={nameId}>{t(lang, 'Para confirmar, digite o nome da campanha:', 'To confirm, type the campaign name:')}</label>
          <input id={nameId} value={typed} autoComplete="off" spellCheck={false}
            onChange={(e) => setTyped(e.target.value)} placeholder={campaign.name} aria-invalid={typed !== '' && !ok} />
        </div>
        {err && <p role="alert" style={{ margin: 0, color: 'var(--blood-bright)' }}>{err}</p>}
      </form>
    </MesaSheet>
  );
}

function DeleteCampaignDialog({ campaign, lang, onCancel, onDone }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const formId = useId();
  const nameId = useId();
  const descId = useId();
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
    <MesaSheet lang={lang} size="auto" width="md" role="alertdialog" className="shell-name-confirm" describedBy={descId}
      title={t(lang, 'Encerrar esta campanha?', 'Close this campaign?')} icon="⌛"
      onClose={() => { if (!busy) onCancel(); }} initialFocus={`#${CSS.escape(nameId)}`}
      footer={<NameConfirmFoot formId={formId} lang={lang} busy={busy} ok={ok} onCancel={onCancel}
        label={t(lang, 'Encerrar campanha', 'Close campaign')} busyLabel={t(lang, 'Encerrando…', 'Closing…')} />}>
      <form id={formId} className="col gap-3" onSubmit={submit}>
        <div id={descId} className="col gap-2">
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
          <p className="shell-set-hint">
            {t(lang, 'As fichas dos jogadores continuam com eles. Quem entrou usando uma vaga da sua mesa fica com a ficha se o próprio plano tiver espaço; senão, ela é apagada no fim do prazo — por isso todos veem o aviso para baixar.',
              "Players keep their sheets. Anyone who joined using one of your table seats keeps the sheet if their own plan has room; otherwise it is deleted at the end of the window — that's why everyone sees the download notice.")}
          </p>
        </div>
        <div className="mesa-field">
          <label htmlFor={nameId}>{t(lang, 'Para confirmar, digite o nome da campanha:', 'To confirm, type the campaign name:')}</label>
          <input id={nameId} value={typed} autoComplete="off" spellCheck={false}
            onChange={(e) => setTyped(e.target.value)} placeholder={campaign.name} aria-invalid={typed !== '' && !ok} />
        </div>
        {err && <p role="alert" style={{ margin: 0, color: 'var(--blood-bright)' }}>{err}</p>}
      </form>
    </MesaSheet>
  );
}
