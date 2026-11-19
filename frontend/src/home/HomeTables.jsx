/* Tela inicial: "Suas mesas" (um toque abre a campanha) e a faixa da criação em
 * andamento. As mesas vêm de GET /api/campaigns (app.jsx carrega ao abrir a inicial);
 * quem é mestre e ainda não tem herói deixa de ver só um estado vazio de jogador. */
import Icon from '../../components/Icons.jsx';
import { api } from '../api/client.js';
import { defaultCoverArt } from '../shell/shell-logic.js';
import { tName } from '../../data/i18n.js';
import { STEPS } from '../creator/steps.js';
import { HomeTitle } from './HomeActions.jsx';
import { L } from './home-utils.js';

const MAX_TABLES = 3;

/** Mesas abertas, com as que estão ao vivo primeiro (a ordem do servidor desempata). */
export function homeTables(campaigns) {
  return (campaigns || [])
    .filter(c => c && c.status !== 'closed')
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (Number(!!b.c.state?.live) - Number(!!a.c.state?.live)) || (a.i - b.i))
    .map(x => x.c);
}

/** id da ficha → nomes das mesas em que ela está sentada (para o selo do cartão). */
export function tablesByCharacter(campaigns) {
  const map = new Map();
  for (const c of campaigns || []) {
    if (!c || c.status === 'closed') continue;
    for (const m of c.myMemberships || (c.myMembership ? [c.myMembership] : [])) {
      if (m?.characterId == null) continue;
      const k = String(m.characterId);
      if (!map.has(k)) map.set(k, []);
      if (!map.get(k).includes(c.name)) map.get(k).push(c.name);
    }
  }
  return map;
}

function tableLine(c, lang) {
  const st = c.state || {};
  const who = c.role === 'dm' ? '' : (c.myMemberships || []).map(m => m.characterName).filter(Boolean).join(', ');
  return [
    who,
    st.session ? L(lang, `Sessão ${st.session}`, `Session ${st.session}`) : '',
    st.scene || c.tagline || '',
  ].filter(Boolean).join(' · ');
}

export function HomeTables({ lang, campaigns, onOpen, onAll }) {
  const list = homeTables(campaigns);
  if (!list.length || !onOpen) return null;
  const shown = list.slice(0, MAX_TABLES);
  const more = list.length - shown.length;
  return (
    <section className="home-tables" aria-labelledby="home-tables-t">
      <HomeTitle id="home-tables-t"
        extra={onAll && (
          <button type="button" className="home-ptitle-link" onClick={onAll}>
            {more > 0 ? L(lang, `Ver todas (${list.length})`, `See all (${list.length})`) : L(lang, 'Campanhas', 'Campaigns')}
            <Icon name="chevron-right" size={14} />
          </button>
        )}>
        {L(lang, 'Suas mesas', 'Your tables')}
      </HomeTitle>
      <ul className="home-tables-list">
        {shown.map(c => {
          const line = tableLine(c, lang);
          const fallback = defaultCoverArt(c);
          return (
            <li key={c.id}>
              <button type="button" className={`home-table${c.state?.live ? ' is-live' : ''}`} onClick={() => onOpen(c)}>
                <span className="home-table-cover" aria-hidden="true">
                  <img src={api.campaignCoverUrl(c) || fallback} alt="" loading="lazy" decoding="async"
                    onError={(e) => { if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback; }} />
                </span>
                <span className="home-table-txt">
                  <span className="home-table-tags">
                    <span className={`home-tag home-table-role is-${c.role === 'dm' ? 'dm' : 'player'}`}>{c.role === 'dm' ? L(lang, 'Mestre', 'DM') : L(lang, 'Jogador', 'Player')}</span>
                    {c.state?.live && <span className="home-table-live"><span aria-hidden="true" />{L(lang, 'Ao vivo', 'Live')}</span>}
                  </span>
                  <b>{c.name}</b>
                  {line && <span className="home-table-line">{line}</span>}
                </span>
                <Icon name="chevron-right" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Bárbaro · parou em Escolhas da classe" (ou só o nome / a classe que já houver). */
export function draftLine(draft, lang) {
  if (!draft?.char) return '';
  const step = STEPS.find(s => s.id === draft.stepId);
  return [
    String(draft.char.name || '').trim(),
    draft.char.className ? tName('class', draft.char.className, lang) : '',
    step ? L(lang, `parou em ${step.title.pt}`, `stopped at ${step.title.en}`) : '',
  ].filter(Boolean).join(' · ');
}

/** Faixa da criação em andamento (lista de heróis): continuar em um toque ou descartar. */
export function HomeDraft({ lang, draft, onContinue, onDiscard }) {
  if (!draft) return null;
  const line = draftLine(draft, lang);
  return (
    <section className="home-draft" aria-label={L(lang, 'Criação em andamento', 'Creation in progress')}>
      <span className="home-draft-ico" aria-hidden="true"><Icon name="feather" size={18} /></span>
      <p className="home-draft-txt">
        <b>{L(lang, 'Criação em andamento', 'Creation in progress')}</b>
        {line && <span>{line}</span>}
      </p>
      <span className="home-draft-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onContinue}>{L(lang, 'Continuar', 'Continue')}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscard}>{L(lang, 'Descartar', 'Discard')}</button>
      </span>
    </section>
  );
}
