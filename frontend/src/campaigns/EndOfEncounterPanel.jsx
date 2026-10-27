// Fim de encontro guiado (opt-in). Folha da mesa (MesaSheet "tall", pela Cena e
// pelo Combate) com passos opcionais; cada passo só chama a API quando o mestre
// toca. Não empurra mais o topo da tela. Com a nota do Diário mexida e ainda não
// salva, ✕/Esc/toque fora perguntam antes de fechar.
// V8: o combate que veio de uma sala (combat.map.scene, gravado pelo POST /encounter)
// mostra o tesouro dela no passo Tesouro, com "🎁 Entregar o tesouro da cena" (a mesma
// folha do "Na mesa" das Aventuras). A sala é lida 1 vez, quando o painel abre.
import { errorMessage } from '../api/errors.js';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { findMonster } from '../../data/bestiary.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import GiveItemModal from './GiveItemModal.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import { getAdventure } from '../play/play-api.js';
import { hasTreasure, treasureSummary } from '../prep/prep-graph.js';
import './table-now.css';
import { diaryDraft, encounterSummary, suggestXp, wizardSteps, xpRecipients } from './end-of-encounter.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const TreasureModal = lazy(() => import('../prep/PlayPanel.jsx').then(m => ({ default: m.TreasureModal })));

/** A sala de onde veio o combate ({adventure, node}) ou null. */
function useSceneRoom(campaignId, scene) {
  const [room, setRoom] = useState(null);
  useEffect(() => {
    if (scene?.advId == null || !scene?.nodeId) return undefined;
    let alive = true;
    getAdventure(campaignId, scene.advId).then(r => {
      const adv = r?.adventure || r;
      const node = (adv?.data?.nodes || []).find(n => n.id === scene.nodeId);
      if (alive && node) setRoom({ adventure: adv, node });
    }).catch(() => {});
    return () => { alive = false; };
  }, [campaignId, scene?.advId, scene?.nodeId]);
  return room;
}

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
  const room = useSceneRoom(campaign.id, combat?.map?.scene);
  const [givingScene, setGivingScene] = useState(false);

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

  const noteDirty = !done.diary && (title !== draft.title || body !== draft.body);
  const roundsText = L(lang, `${summary.rounds} rodada${summary.rounds > 1 ? 's' : ''}`, `${summary.rounds} round${summary.rounds > 1 ? 's' : ''}`);
  const footer = (
    <div className="mesa-actions">
      <button type="button" className="mesa-btn mesa-btn-lg is-primary eoe-done" onClick={onClose}>✓ {L(lang, 'Pronto', 'Done')}</button>
    </div>
  );

  return (
    <MesaSheet title={<>{roundsText}{summary.defeated.length > 0 && <> · {L(lang, 'derrotados', 'defeated')}: {summary.defeated.length}</>}</>}
      eyebrow={L(lang, 'Fim de encontro', 'End of encounter')} icon="⚑" size="tall" width="md" lang={lang}
      onClose={onClose} footer={footer} dirty={noteDirty}
      dirtyText={L(lang, 'A nota do Diário ainda não foi salva.', 'The Diary note has not been saved yet.')}
      className="eoe-sheet" bodyClassName="eoe-sheet-body" dock="play">
      <p className="mesa-sheet-text">{L(lang, 'Passos opcionais — nada é aplicado sem o seu toque.', 'Optional steps — nothing is applied without your tap.')}</p>
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
                  <button type="button" className="mesa-chip" aria-pressed={xpAmount === String(xp.total)} onClick={() => setXpAmount(String(xp.total))}>
                    {L(lang, 'Todos', 'All')} {xp.estimated ? '≈' : ''}{xp.total}
                  </button>
                  {xp.defeatedXp !== xp.total && (
                    <button type="button" className="mesa-chip" aria-pressed={xpAmount === String(xp.defeatedXp)} onClick={() => setXpAmount(String(xp.defeatedXp))}>
                      {L(lang, 'Só derrotados', 'Defeated only')} {xp.defeatedXp}
                    </button>
                  )}
                  <button type="button" className="mesa-btn is-primary" disabled={!!busy || !(amount > 0) || !!done.xp || !nRecipients}
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
                  <button type="button" className="mesa-btn" disabled={!!busy || !!done.shortRest}
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
                {room && hasTreasure(room.node) && (
                  <div className="eoe-scene-treasure">
                    <p className="eoe-scene-text">
                      <strong>{L(lang, `Tesouro da cena ${room.node.name}`, `Treasure of scene ${room.node.name}`)}:</strong> {treasureSummary(room.node.treasure, lang)}
                    </p>
                    <button type="button" className="mesa-btn is-primary" onClick={() => setGivingScene(true)}>
                      🎁 {L(lang, 'Entregar o tesouro da cena', 'Hand out the scene treasure')}
                    </button>
                  </div>
                )}
                <div className="eoe-row">
                  {onNavigate && (
                    <button type="button" className="mesa-btn" onClick={() => onNavigate('items')}>
                      {L(lang, 'Itens da campanha', 'Campaign items')} →
                    </button>
                  )}
                  {players.map(m => (
                    <button key={m.id} type="button" className="mesa-chip" onClick={() => setGivingTo({ id: m.character.id, name: m.character.name })}>
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
                  <button type="button" className="mesa-btn is-primary" disabled={!!busy || !!done.diary || !(title.trim() || body.trim())}
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

      {givingScene && room && (
        <Suspense fallback={null}>
          <TreasureModal node={room.node} campaign={campaign} adventure={room.adventure} lang={lang}
            onClose={() => setGivingScene(false)}
            onDone={(text) => { setGivingScene(false); setDone(d => ({ ...d, treasure: `${d.treasure ? `${d.treasure}, ` : ''}${text}` })); onChange?.(); }} />
        </Suspense>
      )}
      {givingTo && (
        <GiveItemModal campaign={campaign} character={givingTo} lang={lang}
          onClose={() => setGivingTo(null)}
          onGiven={() => {
            setDone(d => ({ ...d, treasure: `${d.treasure ? `${d.treasure}, ` : ''}${givingTo.name}` }));
            setGivingTo(null);
            onChange?.();
          }} />
      )}
    </MesaSheet>
  );
}
