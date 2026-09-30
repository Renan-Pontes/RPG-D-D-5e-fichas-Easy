// Fim de encontro guiado (opt-in). Painel não bloqueante com passos opcionais;
// cada passo só chama a API quando o mestre clica.
import { errorMessage } from '../api/errors.js';
import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { findMonster } from '../../data/bestiary.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import GiveItemModal from './GiveItemModal.jsx';
import './table-now.css';
import { diaryDraft, encounterSummary, suggestXp, wizardSteps, xpRecipients } from './end-of-encounter.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function EndOfEncounterPanel({ campaign, combat, lang, onClose, onNavigate, onChange }) {
  const steps = wizardSteps(campaign.state);
  const summary = useMemo(() => encounterSummary(combat), [combat]);
  const xp = useMemo(() => {
    const custom = loadCustomMonsters();
    const lookup = (id) => (id ? (findMonster(id) || custom.find(m => m.id === id) || null) : null);
    return suggestXp(combat, lookup);
  }, [combat]);
  const recipients = useMemo(() => xpRecipients(combat, campaign), [combat, campaign]);
  const draft = useMemo(() => diaryDraft(combat, { lang, scene: campaign.state?.scene || '' }), [combat, lang, campaign.state?.scene]);
  const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);

  const [xpAmount, setXpAmount] = useState(String(xp.total || ''));
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [done, setDone] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [givingTo, setGivingTo] = useState(null);

  const run = async (id, fn) => {
    setBusy(id); setError('');
    try { const msg = await fn(); setDone(d => ({ ...d, [id]: msg || true })); onChange?.(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  };

  const recipientNames = recipients === 'all'
    ? L(lang, 'a mesa toda', 'the whole party')
    : players.filter(m => recipients.includes(m.character.id)).map(m => m.character.name).join(', ');
  const amount = parseInt(xpAmount, 10);
  const nRecipients = recipients === 'all' ? players.length : recipients.length;

  return (
    <section className="eoe-panel" aria-label={L(lang, 'Fim de encontro', 'End of encounter')}>
      <header className="eoe-head">
        <div>
          <span className="eoe-eyebrow">{L(lang, 'Fim de encontro', 'End of encounter')}</span>
          <strong className="eoe-title">
            {L(lang, `${summary.rounds} rodada${summary.rounds > 1 ? 's' : ''}`, `${summary.rounds} round${summary.rounds > 1 ? 's' : ''}`)}
            {summary.defeated.length > 0 && <> · {L(lang, 'derrotados', 'defeated')}: {summary.defeated.length}</>}
          </strong>
          <span className="muted small">{L(lang, 'Passos opcionais — nada é aplicado sem o seu clique.', 'Optional steps — nothing is applied without your click.')}</span>
        </div>
        <button type="button" className="btn-icon" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close')}>×</button>
      </header>
      {error && <div className="nudge-error" role="alert">{error}</div>}

      <ol className="eoe-steps">
        {steps.map(({ id }) => (
          <li key={id} className={`eoe-step ${done[id] ? 'is-done' : ''}`}>
            {id === 'xp' && (
              <>
                <div className="eoe-step-title">✦ {L(lang, 'Dar XP', 'Award XP')}</div>
                <div className="eoe-row">
                  <input className="input eoe-xp" type="number" min="1" inputMode="numeric" value={xpAmount}
                    onChange={e => setXpAmount(e.target.value)} aria-label="XP" />
                  <button type="button" className="gc-chip" onClick={() => setXpAmount(String(xp.total))}>
                    {L(lang, 'Todos', 'All')} {xp.estimated ? '≈' : ''}{xp.total}
                  </button>
                  {xp.defeatedXp !== xp.total && (
                    <button type="button" className="gc-chip" onClick={() => setXpAmount(String(xp.defeatedXp))}>
                      {L(lang, 'Só derrotados', 'Defeated only')} {xp.defeatedXp}
                    </button>
                  )}
                  <button type="button" className="btn btn-primary btn-sm" disabled={!!busy || !(amount > 0) || !!done.xp || !nRecipients}
                    onClick={() => run('xp', async () => {
                      const r = await api.awardXp(campaign.id, { amount, characterIds: recipients, split: true });
                      return L(lang, `+${r.each} XP para cada`, `+${r.each} XP each`);
                    })}>
                    {done.xp ? `✓ ${done.xp}` : L(lang, 'Dar XP', 'Give XP')}
                  </button>
                </div>
                <span className="muted small">
                  {L(lang, 'Dividido entre', 'Split among')} {recipientNames}
                  {amount > 0 && nRecipients > 0 && <> (≈{Math.floor(amount / nRecipients)} {L(lang, 'cada', 'each')})</>}
                </span>
              </>
            )}
            {id === 'shortRest' && (
              <>
                <div className="eoe-step-title">☕ {L(lang, 'Descanso curto', 'Short rest')}</div>
                <div className="eoe-row">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy || !!done.shortRest}
                    onClick={() => run('shortRest', async () => {
                      const r = await api.campaignShortRestAll(campaign.id);
                      return L(lang, `${r.restedCharacters.length} descansaram`, `${r.restedCharacters.length} rested`);
                    })}>
                    {done.shortRest ? `✓ ${done.shortRest}` : L(lang, 'Descanso curto da mesa', 'Party short rest')}
                  </button>
                </div>
                <span className="muted small">{L(lang,
                  'Recupera o que volta no descanso curto. Dados de vida cada jogador gasta na própria ficha.',
                  'Restores short-rest resources. Each player spends Hit Dice on their own sheet.')}</span>
              </>
            )}
            {id === 'treasure' && (
              <>
                <div className="eoe-step-title">🎁 {L(lang, 'Tesouro', 'Treasure')}</div>
                <div className="eoe-row">
                  {onNavigate && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('items')}>
                      {L(lang, 'Itens da campanha', 'Campaign items')} →
                    </button>
                  )}
                  {players.map(m => (
                    <button key={m.id} type="button" className="gc-chip" onClick={() => setGivingTo({ id: m.character.id, name: m.character.name })}>
                      {L(lang, 'Dar a', 'Give to')} {m.character.name}
                    </button>
                  ))}
                </div>
                {done.treasure && <span className="muted small">✓ {done.treasure}</span>}
              </>
            )}
            {id === 'diary' && (
              <>
                <div className="eoe-step-title">📖 {L(lang, 'Nota no Diário', 'Diary note')}</div>
                <input className="input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} aria-label={L(lang, 'Título', 'Title')} />
                <textarea className="input eoe-body" rows={4} value={body} onChange={e => setBody(e.target.value)} aria-label={L(lang, 'Texto', 'Text')} />
                <div className="eoe-row">
                  <button type="button" className="btn btn-primary btn-sm" disabled={!!busy || !!done.diary || !(title.trim() || body.trim())}
                    onClick={() => run('diary', async () => {
                      await api.createDiaryNote(campaign.id, { title: title.trim(), body: body.trim() });
                      return L(lang, 'salvo', 'saved');
                    })}>
                    {done.diary ? `✓ ${done.diary}` : L(lang, 'Salvar no Diário', 'Save to Diary')}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>

      {givingTo && (
        <GiveItemModal campaign={campaign} character={givingTo} lang={lang}
          onClose={() => setGivingTo(null)}
          onGiven={() => {
            setDone(d => ({ ...d, treasure: `${d.treasure ? `${d.treasure}, ` : ''}${givingTo.name}` }));
            setGivingTo(null);
            onChange?.();
          }} />
      )}
    </section>
  );
}
