// Folha "Mesa do mestre" — a casa "Mais" da barra inferior do celular (plano §2.1).
// Junta o que no desktop fica na capa, em linhas de 56 px com texto:
//   cabeçalho: nome completo, frase, Mestre, Sessão N, Ao vivo e a cena inteira;
//   Sessão (▶ Começar sessão N / ■ Encerrar sessão) · 🔍 Buscar;
//   📺 Telão (o mesmo TvPanel do popover: lê o telão a cada 4 s só enquanto a
//   folha está aberta) · 🎲 Dados preparados (só com a opção ligada);
//   ⚙ Ajustes: as 6 seções, cada uma abrindo os Ajustes já nela;
//   ← Voltar para Campanhas.
// Quem chama fecha a folha antes de abrir a próxima janela (ver CampaignDetail).
import { useId } from 'react';
import MesaSheet from './MesaSheet.jsx';
import MesaTitle from './MesaTitle.jsx';
import { TvPanel } from './CampaignHeader.jsx';
import { nextSessionNumber, SETTINGS_SECTIONS, settingsSectionLabel, settingsSummary, t } from './shell-logic.js';
import { immersionOn } from '../world/living/living-logic.js';

function Row({ icon, title, sub, onClick, disabled, className = '' }) {
  return (
    <button type="button" className={`mesa-row shell-more-row ${className}`.trim()} onClick={onClick} disabled={disabled}>
      <span className="mesa-row-pic shell-more-ico" aria-hidden="true">{icon}</span>
      <span className="mesa-row-main">
        <span className="mesa-row-title">{title}</span>
        {sub && <span className="mesa-row-sub">{sub}</span>}
      </span>
      <span className="shell-more-chev" aria-hidden="true">›</span>
    </button>
  );
}

export default function MoreSheet({
  campaign, lang, busy = false, worldCount = null, worldMax = 500,
  onClose, onStartSession, onEndSession, onSearch, onSettings, onBack, onTvOpened, onClearScreen, onChooseScreen,
}) {
  const tvId = useId();
  const setId = useId();
  const st = campaign.state || {};
  const live = !!st.live;
  const closed = campaign.status === 'closed';
  const session = parseInt(st.session, 10);
  const next = nextSessionNumber(st);
  const sumOpts = { immersion: immersionOn(campaign), worldCount, worldMax };

  return (
    <MesaSheet
      lang={lang} size="auto" width="md" className="shell-more"
      eyebrow={t(lang, 'Mesa do mestre', "DM's table")}
      title={campaign.name}
      onClose={onClose}
    >
      <div className="shell-more-intro">
        {campaign.tagline && <p className="shell-more-tagline">{campaign.tagline}</p>}
        <div className="shell-more-meta">
          <span className="role-pill role-dm">{t(lang, 'Mestre', 'DM')}</span>
          {live && <span className="shell-live"><span className="shell-live-dot" aria-hidden="true" />{t(lang, 'Ao vivo', 'Live')}</span>}
          {Number.isFinite(session) && session > 0 && <span className="shell-session">{t(lang, 'Sessão', 'Session')} {session}</span>}
          {closed && <span className="pl-tag pl-tag-closed" style={{ marginLeft: 0 }}>⌛ {t(lang, 'Encerrada', 'Closed')}</span>}
        </div>
        {st.scene && (
          <p className="shell-more-scene"><span className="muted">{t(lang, 'Cena: ', 'Scene: ')}</span>{st.scene}</p>
        )}
      </div>

      <div className="shell-more-list mesa-panel is-sunk">
        {!closed && (live ? (
          <Row icon="■" className="is-session" disabled={busy} onClick={onEndSession}
            title={t(lang, 'Encerrar sessão', 'End session')}
            sub={t(lang, 'Continuar jogando, encerrar ou escrever o recap', 'Keep playing, end, or write the recap')} />
        ) : (
          <Row icon="▶" className="is-session is-start" disabled={busy} onClick={onStartSession}
            title={t(lang, `Começar sessão ${next}`, `Start session ${next}`)}
            sub={t(lang, 'Liga o "Ao vivo" e abre Jogar › Cena', 'Turns on "Live" and opens Play › Scene')} />
        ))}
        <Row icon="🔍" onClick={onSearch}
          title={t(lang, 'Buscar', 'Search')}
          sub={t(lang, 'NPC, lugar, jogador, aventura, item, monstro', 'NPC, place, player, adventure, item, monster')} />
      </div>

      <section className="shell-more-tv mesa-panel is-sunk" aria-labelledby={tvId}>
        <MesaTitle as="h3" id={tvId}>{t(lang, 'Telão', 'TV screen')}</MesaTitle>
        <TvPanel campaign={campaign} lang={lang} onOpened={onTvOpened} onClear={onClearScreen} onChoose={onChooseScreen} />
      </section>

      {campaign.advancedDice && (
        <div className="shell-more-list mesa-panel is-sunk">
          <Row icon="🎲" onClick={() => onSettings('dice')}
            title={t(lang, 'Dados preparados', 'Prepared dice')}
            sub={t(lang, 'Próximos resultados das rolagens do app', 'Next results of the rolls made in the app')} />
        </div>
      )}

      <section className="shell-more-settings" aria-labelledby={setId}>
        <MesaTitle as="h3" id={setId}>{t(lang, 'Ajustes', 'Settings')}</MesaTitle>
        <div className="shell-more-list mesa-panel is-sunk">
          {SETTINGS_SECTIONS.map(s => (
            <Row key={s.id} icon={s.icon} className={s.id === 'danger' ? 'is-danger' : ''} onClick={() => onSettings(s.id)}
              title={settingsSectionLabel(s.id, lang)}
              sub={settingsSummary(s.id, campaign, lang, sumOpts)} />
          ))}
        </div>
      </section>

      <div className="shell-more-list mesa-panel is-sunk">
        <Row icon="←" onClick={onBack} title={t(lang, 'Voltar para Campanhas', 'Back to Campaigns')} />
      </div>
    </MesaSheet>
  );
}
