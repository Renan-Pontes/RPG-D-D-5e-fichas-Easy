import { errorMessage } from '../api/errors.js';
import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { monsterForCombat } from '../../data/bestiary.js';
import { DIFFICULTY_LABEL } from '../combat/encounter.js';
import { buildCheckPayload } from '../checks/check-logic.js';
import GiveItemModal from '../campaigns/GiveItemModal.jsx';
import {
  NODE_KIND, pathsFrom, nodeEncounter, encounterCombatants, edgeText, treasureSummary, hasTreasure,
  coinsText, addCoins, COINS, COIN_LABEL,
} from './prep-graph.js';
import { checkText, monsterLookup } from './NodeEditor.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

/**
 * Painel "em jogo" de um nó: ler em voz alta, caminhos disponíveis, encontro,
 * perigos, testes, tesouro. Cada ação é um clique do mestre; nada automático.
 */
export default function PlayPanel({
  adventure, node, campaign, levels, lang, logDiary, onLogDiary, onPlay, onOpenAdventure, onOpenTab, onSelectNode,
}) {
  const data = adventure.data;
  const play = adventure.play;
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [startNow, setStartNow] = useState(false);
  const [withPcs, setWithPcs] = useState(true);
  const [giving, setGiving] = useState(false);
  const lookup = useMemo(() => monsterLookup(), []);
  const kind = NODE_KIND[node.kind] || NODE_KIND.other;
  const isCurrent = play.current === node.id;
  const visited = play.visited.includes(node.id);
  const paths = pathsFrom(data, play, node.id);
  const enc = nodeEncounter(node, levels, lookup);

  const run = async (key, fn, ok) => {
    setBusy(key); setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) {
      setMsg(`${t(lang, 'Falhou', 'Failed')}: ${errorMessage(e)}`);
    } finally { setBusy(''); }
  };

  const startEncounter = () => run('enc', async () => {
    const bodies = encounterCombatants(node, {
      resolve: (e) => lookup(e.monsterId) || e.snapshot || null, toCombat: monsterForCombat, lang,
    });
    if (!bodies.length) throw new Error(t(lang, 'monstros não encontrados no catálogo', 'monsters not found in the catalog'));
    let pcs = [];
    if (withPcs) {
      const combat = await api.getCombat(campaign.id).catch(() => null);
      const inFight = new Set((combat?.combat?.combatants || []).filter(c => c.type === 'pc').map(c => c.character_id));
      pcs = (campaign.members || []).filter(m => m.role !== 'dm' && m.character && !inFight.has(m.character.id));
    }
    for (const b of bodies) await api.addCombatant(campaign.id, b);
    for (const [i, m] of pcs.entries()) {
      await api.addCombatant(campaign.id, {
        type: 'pc', characterId: m.character.id, initiative: 10, position: { x: 100 + i * 60, y: 220 }, tokenScale: 1,
      });
    }
    if (startNow) await api.startCombat(campaign.id);
  }, t(lang,
    `${enc.monsters} monstro(s) no combate${withPcs ? ' + PJs' : ''}${startNow ? ' · combate iniciado' : ''}. Ajuste as iniciativas na aba Combate.`,
    `${enc.monsters} monster(s) added${withPcs ? ' + PCs' : ''}${startNow ? ' · combat started' : ''}. Adjust initiative in the Combat tab.`));

  const askCheck = (c) => run(`chk-${c.skill}`, async () => {
    const isSave = c.skill.startsWith('save:');
    await api.createCheck(campaign.id, buildCheckPayload({
      kind: isSave ? 'save' : 'skill', key: isSave ? c.skill.slice(5) : c.skill,
      label: checkText(c.skill, lang), dc: c.dc ?? '', dcHidden: true, targets: [],
    }, lang));
  }, t(lang, 'Pedido enviado à mesa (CD oculta).', 'Check sent to the table (hidden DC).'));

  const toScreen = (text) => run('tv', () => api.adventureScreen(campaign.id, adventure.id, { nodeId: node.id, text }),
    text ? t(lang, 'Nome e texto no telão.', 'Name and text on the TV.') : t(lang, 'Nome da cena no telão.', 'Scene name on the TV.'));
  const clearScreen = () => run('tv', () => api.adventureScreen(campaign.id, adventure.id, { nodeId: null }),
    t(lang, 'Texto tirado do telão.', 'Text removed from the TV.'));

  const imageToMap = () => {
    if (!confirm(t(lang, 'Usar esta imagem como mapa do combate/telão? O mapa atual será substituído.', 'Use this image as the combat/TV map? The current map will be replaced.'))) return;
    run('map', () => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => api.setCombatMap(campaign.id, { background_image: node.image, width_px: img.width, height_px: img.height }).then(resolve, reject);
      img.onerror = () => reject(new Error('image'));
      img.src = node.image;
    }), t(lang, 'Mapa do combate atualizado.', 'Combat map updated.'));
  };

  const diffLabel = DIFFICULTY_LABEL[enc.rating]?.[lang] || DIFFICULTY_LABEL[enc.rating]?.en;

  return (
    <div className="prep-play">
      <header className="prep-play-head">
        <div>
          <span className="prep-kind-pill">{kind.icon} {t(lang, kind.pt, kind.en)}</span>
          {isCurrent && <span className="prep-state-pill current">▶ {t(lang, 'O grupo está aqui', 'The party is here')}</span>}
          {!isCurrent && visited && <span className="prep-state-pill visited">✓ {t(lang, 'Visitado', 'Visited')}</span>}
          <h3>{node.name}</h3>
          {(node.tags || []).length > 0 && <div className="adv-tags">{node.tags.map(tg => <span key={tg} className="adv-tag">{tg}</span>)}</div>}
        </div>
      </header>

      <div className="prep-play-actions">
        {!isCurrent && (
          <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => onPlay('enter', { nodeId: node.id })}>
            ▶ {t(lang, 'O grupo entrou aqui', 'The party entered here')}
          </button>
        )}
        {isCurrent && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPlay('leave')}>{t(lang, 'Tirar marcação de atual', 'Clear current')}</button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPlay(visited ? 'unvisit' : 'visit', { nodeId: node.id })}>
          {visited ? t(lang, 'Desmarcar visitado', 'Unmark visited') : t(lang, 'Marcar visitado', 'Mark visited')}
        </button>
        <label className="me-check small">
          <input type="checkbox" checked={logDiary} onChange={e => onLogDiary(e.target.checked)} />
          {t(lang, 'Registrar no Diário', 'Log to Diary')}
        </label>
      </div>

      {node.readAloud && (
        <section className="prep-section">
          <header>
            <h4>📜 {t(lang, 'Ler em voz alta', 'Read aloud')}</h4>
          </header>
          <blockquote className="prep-read-aloud">{node.readAloud}</blockquote>
        </section>
      )}
      <div className="adv-row wrap">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'tv'} onClick={() => toScreen(false)}>📺 {t(lang, 'Nome no telão', 'Name on TV')}</button>
        {node.readAloud && <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'tv'} onClick={() => toScreen(true)}>📺 {t(lang, 'Nome + texto no telão', 'Name + text on TV')}</button>}
        {campaign.state?.sceneText && <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'tv'} onClick={clearScreen}>{t(lang, 'Tirar texto do telão', 'Remove text from TV')}</button>}
        {node.image && <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'map'} onClick={imageToMap}>🗺 {t(lang, 'Imagem como mapa do combate', 'Image as combat map')}</button>}
      </div>

      {node.notes && (
        <section className="prep-section">
          <header><h4>🔒 {t(lang, 'Notas do mestre', 'DM notes')}</h4></header>
          <p className="prep-notes">{node.notes}</p>
        </section>
      )}

      <section className="prep-section">
        <header><h4>↔ {t(lang, 'Caminhos daqui', 'Paths from here')}</h4></header>
        {paths.length === 0 && <p className="muted small">{t(lang, 'Nenhuma saída preparada.', 'No exits prepared.')}</p>}
        <ul className="prep-paths">
          {paths.map(p => (
            <li key={p.edge.id} className={`prep-path s-${p.status}`}>
              <div className="grow">
                <strong>{p.target ? p.target.name : `↗ ${p.edge.toAdventureName || t(lang, 'outra aventura', 'another adventure')}`}</strong>
                {p.visited && <span className="muted small"> ✓</span>}
                <div className="muted small">{edgeText(p.edge, lang)}{p.unlocked ? t(lang, ' · liberada', ' · unlocked') : ''}</div>
              </div>
              {p.status === 'open' && p.target && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onPlay('enter', { nodeId: p.targetId })}>{t(lang, 'Ir', 'Go')} →</button>
              )}
              {p.status === 'locked' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPlay('unlock', { edgeId: p.edge.id })}>🔓 {t(lang, 'Destrancar', 'Unlock')}</button>
              )}
              {p.status === 'secret' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPlay('unlock', { edgeId: p.edge.id })}>👁 {t(lang, 'Descobriram', 'Found it')}</button>
              )}
              {p.unlocked && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPlay('lock', { edgeId: p.edge.id })} title={t(lang, 'Voltar a trancar/ocultar', 'Lock/hide again')}>↺</button>
              )}
              {p.status === 'external' && (
                p.edge.toAdventureId
                  ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenAdventure(p.edge.toAdventureId)}>{t(lang, 'Abrir aventura', 'Open adventure')} ↗</button>
                  : <span className="muted small">{t(lang, 'sem aventura ligada', 'no linked adventure')}</span>
              )}
              {p.target && p.status !== 'open' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelectNode(p.targetId)} aria-label={t(lang, `Ver ${p.target.name}`, `View ${p.target.name}`)}>👁‍🗨</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {enc.monsters > 0 && (
        <section className="prep-section">
          <header>
            <h4>⚔ {t(lang, 'Encontro', 'Encounter')}</h4>
            <span className={`enc-label ${enc.rating}`}>{levels.length ? diffLabel : t(lang, 'sem PJs', 'no PCs')}</span>
          </header>
          <ul className="prep-plain">
            {node.encounter.map((e, i) => {
              const src = lookup(e.monsterId);
              return <li key={i}>{e.count} × {src ? (src.name?.[lang] || src.name?.en) : e.name} {src?.cr != null && <span className="muted small">ND {src.cr}</span>}</li>;
            })}
          </ul>
          <p className="muted small prep-note">{enc.estimated ? '≈ ' : ''}{enc.totalXp.toLocaleString()} XP · {t(lang, 'orçamento', 'budget')} {enc.budget.low}/{enc.budget.moderate}/{enc.budget.high}</p>
          <div className="adv-row wrap">
            <label className="me-check small"><input type="checkbox" checked={withPcs} onChange={e => setWithPcs(e.target.checked)} />{t(lang, 'Incluir PJs que faltam', 'Add missing PCs')}</label>
            <label className="me-check small"><input type="checkbox" checked={startNow} onChange={e => setStartNow(e.target.checked)} />{t(lang, 'Já iniciar o combate', 'Start combat now')}</label>
          </div>
          <div className="adv-row wrap">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy === 'enc'} onClick={startEncounter}>
              ⚔ {busy === 'enc' ? '…' : t(lang, 'Começar encontro', 'Start encounter')}
            </button>
            {onOpenTab && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenTab('combat')}>{t(lang, 'Ir para Combate', 'Go to Combat')} →</button>}
          </div>
        </section>
      )}

      {(node.hazards || []).length > 0 && (
        <section className="prep-section">
          <header><h4>⚠ {t(lang, 'Armadilhas e perigos', 'Traps & hazards')}</h4></header>
          <ul className="prep-plain">
            {node.hazards.map((h, i) => (
              <li key={i}><strong>{h.name}</strong>{h.dc != null && <> · {t(lang, 'CD', 'DC')} {h.dc}</>}{h.damage && <> · {h.damage}</>}
                {h.effect && <div className="muted small">{h.effect}</div>}</li>
            ))}
          </ul>
        </section>
      )}

      {(node.checks || []).length > 0 && (
        <section className="prep-section">
          <header><h4>🎲 {t(lang, 'Testes sugeridos', 'Suggested checks')}</h4></header>
          <ul className="prep-plain">
            {node.checks.map((c, i) => (
              <li key={i} className="adv-row">
                <span className="grow"><strong>{checkText(c.skill, lang)}</strong>{c.dc != null && <> · {t(lang, 'CD', 'DC')} {c.dc}</>}
                  {c.note && <span className="muted small"> — {c.note}</span>}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy === `chk-${c.skill}`} onClick={() => askCheck(c)}>{t(lang, 'Pedir à mesa', 'Ask the table')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasTreasure(node) && (
        <section className="prep-section">
          <header><h4>💰 {t(lang, 'Tesouro', 'Treasure')}</h4></header>
          <p>{treasureSummary(node.treasure, lang)}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setGiving(true)}>🎁 {t(lang, 'Entregar tesouro', 'Hand out treasure')}</button>
        </section>
      )}

      {msg && <p className="prep-msg" role="status">{msg}</p>}

      {giving && (
        <TreasureModal node={node} campaign={campaign} adventure={adventure} lang={lang}
          onClose={() => setGiving(false)} onDone={(text) => { setGiving(false); setMsg(text); }} />
      )}
    </div>
  );
}

/**
 * Entregar tesouro do nó a um personagem: escolhe itens e moedas; itens vão por
 * api.invAdd (o diário registra sozinho), moedas pela edição do mestre.
 */
function TreasureModal({ node, campaign, adventure, lang, onClose, onDone }) {
  const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
  const [charId, setCharId] = useState(players[0]?.character.id || '');
  const [picked, setPicked] = useState(() => new Set((node.treasure?.items || []).map((_, i) => i)));
  const [coins, setCoins] = useState(() => ({ ...(node.treasure?.coins || {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [other, setOther] = useState(false);
  const character = players.find(m => m.character.id === Number(charId))?.character;

  const give = async () => {
    if (!character) return;
    setBusy(true); setError('');
    try {
      const items = (node.treasure?.items || []).filter((_, i) => picked.has(i));
      for (const it of items) {
        const { id, ...rest } = it;
        await api.invAdd(character.id, { item: { ...rest, qty: it.qty || 1 } });
      }
      const total = COINS.reduce((s, c) => s + (parseInt(coins[c], 10) || 0), 0);
      if (total > 0) {
        const fresh = await api.getCharacter(character.id);
        const cur = fresh?.character?.data?.coins || {};
        await api.dmEditCharacter(character.id, { data: { coins: addCoins(cur, coins) } });
        await api.adventurePlay(campaign.id, adventure.id, {
          action: 'log', nodeId: node.id, text: `${character.name} recebeu ${coinsText(coins, 'pt')}`.slice(0, 200),
        }).catch(() => {});
      }
      onDone(t(lang, `Entregue a ${character.name}.`, `Given to ${character.name}.`));
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal prep-modal" role="dialog" aria-label={t(lang, 'Entregar tesouro', 'Hand out treasure')} onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
        <h2 style={{ marginTop: 0 }}>🎁 {t(lang, 'Entregar tesouro', 'Hand out treasure')}</h2>
        {players.length === 0 ? <p>{t(lang, 'Nenhum personagem na campanha.', 'No characters in the campaign.')}</p> : (
          <>
            <label className="prep-field">
              <span>{t(lang, 'Para', 'To')}</span>
              <select className="input" value={charId} onChange={e => setCharId(e.target.value)}>
                {players.map(m => <option key={m.character.id} value={m.character.id}>{m.character.name}</option>)}
              </select>
            </label>
            {(node.treasure?.items || []).map((it, i) => (
              <label key={i} className="me-check">
                <input type="checkbox" checked={picked.has(i)} onChange={e => {
                  const next = new Set(picked); if (e.target.checked) next.add(i); else next.delete(i); setPicked(next);
                }} />
                {it.name}{it.qty > 1 ? ` ×${it.qty}` : ''}
              </label>
            ))}
            <div className="prep-coins">
              {COINS.map(c => (
                <label key={c}>
                  <input type="number" className="input" min={0} value={coins[c] || ''} placeholder="0"
                    onChange={e => setCoins({ ...coins, [c]: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                  <span>{COIN_LABEL[c][lang] || c}</span>
                </label>
              ))}
            </div>
            <p className="muted small">{t(lang, 'Para dividir, entregue em partes para cada personagem.', 'To split, hand out in parts to each character.')}</p>
            {error && <p className="prep-error">{error}</p>}
            <div className="prep-modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOther(true)} disabled={!character}>{t(lang, 'Outro item…', 'Other item…')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || !character} onClick={give}>{busy ? '…' : t(lang, 'Entregar', 'Give')}</button>
            </div>
          </>
        )}
        {other && character && (
          <GiveItemModal campaign={campaign} character={character} lang={lang}
            onClose={() => setOther(false)} onGiven={() => setOther(false)} />
        )}
      </div>
    </div>
  );
}
