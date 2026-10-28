// "Mostrar na Tela" (§5.3.3): segmentado Imagens · Cenas · Texto · Mapa. É o
// corpo de Jogar › Tela › Mostrar e da folha "Mostrar na Tela" (ShowSheet,
// aberta pelo 📺 Mostrar… das ações de Jogar). Lê o Mundo, a aventura em jogo
// e o plano UMA vez ao abrir (sem polling); cada linha tem o 📺 único.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import { EntryImage, VisibilitySeal } from '../world/EntryCard.jsx';
import { getSessionPlan, listWorld } from '../world/world-api.js';
import { KIND_META, kindLabel } from '../world/world-model.js';
import { getAdventure, listAdventures } from '../play/play-api.js';
import { activeScene } from '../play/scene-model.js';
import RecapEditor from '../play/RecapEditor.jsx';
import { flash } from '../play/flash.js';
import { L, normalizeStage, cardShowMode } from './stage-now.js';
import { imageRows, mapRows, sceneRows, TEXT_MAX } from './show-model.js';
import { sendToStage, stageBg } from './stage-api.js';
import ShowOnTable from './ShowOnTable.jsx';
import './stage.css';

const TABS = [
  ['images', '🖼', 'Imagens', 'Images'],
  ['scenes', '🎭', 'Cenas', 'Scenes'],
  ['text', '📝', 'Texto', 'Text'],
  ['map', '🗺', 'Mapa', 'Map'],
];

/** Mundo, aventura em jogo (sala atual) e plano — lidos uma vez. */
function useShowData(campaignId) {
  const [data, setData] = useState({ entries: null, adventure: null, node: null, plan: null });
  const load = useCallback(async () => {
    const [w, advs, p] = await Promise.allSettled([listWorld(campaignId), listAdventures(campaignId), getSessionPlan(campaignId)]);
    let adventure = null;
    let node = null;
    if (advs.status === 'fulfilled') {
      const pick = activeScene(advs.value.adventures || []);
      if (pick) {
        try {
          const full = await getAdventure(campaignId, pick.id);
          adventure = full.adventure || full;
          node = (adventure.data?.nodes || []).find(n => n.id === (adventure.play?.current || pick.currentNodeId)) || null;
        } catch { /* sem a sala em jogo */ }
      }
    }
    setData({
      entries: w.status === 'fulfilled' ? (w.value.entries || []) : [],
      adventure, node,
      plan: p.status === 'fulfilled' ? (p.value || null) : null,
    });
  }, [campaignId]);
  useEffect(() => { load(); }, [load]);
  // "👁 Revelar e mostrar" / "◐ Só o nome" pela folha do 📺: a linha deixa de dizer
  // "🔒 só a imagem" na hora (sem ler a lista de novo).
  const patchEntry = useCallback((full) => {
    if (!full?.id) return;
    setData(d => ({ ...d, entries: (d.entries || []).map(e => (e.id === full.id
      ? { ...e, visibility: full.visibility, revealedAt: full.revealedAt, version: full.version } : e)) }));
  }, []);
  return [data, load, patchEntry];
}

/**
 * sceneNow (V7, a Agora): {id, refs, show} da cena agora do plano — a imagem dela e quem
 * aparece abrem as Imagens ("Da cena agora") e ela é a 1ª das Cenas.
 */
export function ShowPicker({ campaign, stage, lang = 'pt', onChange, sceneNow = null }) {
  const [tab, setTab] = useState('images');
  const [data, reload, patchEntry] = useShowData(campaign.id);
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const st = normalizeStage(stage);
  const loading = data.entries === null;
  const sceneRefs = useMemo(() => [...(sceneNow?.show?.kind === 'entry' ? [sceneNow.show.id] : []), ...(sceneNow?.refs || [])], [sceneNow]);
  const imgs = useMemo(() => imageRows({ entries: data.entries || [], adventure: data.adventure, node: data.node, query, sceneRefs }),
    [data, query, sceneRefs]);
  const scenes = useMemo(() => sceneRows({ plan: data.plan, adventure: data.adventure, node: data.node, nowSceneId: sceneNow?.id || null }), [data, sceneNow]);
  const maps = useMemo(() => mapRows(data.entries || []), [data]);
  const done = () => onChange?.();

  const entryRow = (row) => {
    const e = row.entry;
    const meta = KIND_META[e.kind] || KIND_META.lore;
    const vis = e.visibility || 'hidden';
    const how = cardShowMode(e);
    return (
      <div key={row.key} className="mesa-row stage-row" style={{ '--wl-kind': meta.color }}>
        <span className="mesa-row-pic stage-row-pic"><EntryImage entry={e} className="stage-row-img" /></span>
        <span className="mesa-row-main">
          <span className="mesa-row-title"><span aria-hidden="true">{meta.icon}</span> {e.name}</span>
          <span className="mesa-row-sub stage-row-sub">
            <VisibilitySeal visibility={vis} lang={lang} small />
            <span>{kindLabel(e.kind, lang)}</span>
            {how === 'image' && <span className="stage-tag">🔒 {L(lang, 'só a imagem', 'image only')}</span>}
            {how === 'name' && <span className="stage-tag">🔒 {L(lang, 'só o nome', 'name only')}</span>}
          </span>
        </span>
        <span className="mesa-row-act">
          <ShowOnTable campaign={campaign} target={{ kind: 'card', entry: e }} lang={lang} className="mesa-btn stage-show" reason="short"
            onShown={done} onRevealed={patchEntry} />
        </span>
      </div>
    );
  };
  const roomRow = (row) => (
    <div key={row.key} className="mesa-row stage-row">
      <span className="mesa-row-pic stage-row-pic"><img className="stage-row-img" src={row.image} alt="" /></span>
      <span className="mesa-row-main">
        <span className="mesa-row-title"><span aria-hidden="true">🚪</span> {row.name}</span>
        <span className="mesa-row-sub">{L(lang, 'Imagem da sala', 'Room image')}{data.adventure ? ` · ${data.adventure.name}` : ''}</span>
      </span>
      <span className="mesa-row-act">
        <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn stage-show" onShown={done}
          target={{ kind: 'image', ref: { advId: row.advId, nodeId: row.nodeId }, name: row.name }} />
      </span>
    </div>
  );
  const row = (r) => (r.type === 'room' ? roomRow(r) : entryRow(r));

  const roomToCombatMap = async () => {
    const node = data.node;
    if (!node?.image) return;
    const yes = await confirmDialog({
      lang, confirmLabel: L(lang, 'Usar imagem', 'Use image'),
      message: L(lang, 'Esta imagem vira o mapa do combate (e da Tela). O mapa atual será substituído.', 'This image becomes the combat map (and the screen map). The current map will be replaced.'),
    });
    if (!yes) return;
    setBusy(true);
    try {
      const size = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = () => reject(new Error('image'));
        img.src = node.image;
      });
      await api.setCombatMap(campaign.id, { background_image: node.image, width_px: size.w, height_px: size.h });
      flash(L(lang, 'Mapa do combate atualizado.', 'Combat map updated.'));
    } catch { flash(L(lang, 'Não consegui usar esta imagem.', 'Could not use this image.'), { error: true }); }
    finally { setBusy(false); }
  };

  const mapBg = st.bg === 'map';
  return (
    <div className="stage-pick">
      <div className="mesa-seg stage-tabs" role="tablist" aria-label={L(lang, 'O que mostrar', 'What to show')}>
        {TABS.map(([k, icon, pt, en]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k}
            className={`mesa-seg-btn stage-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            <span aria-hidden="true">{icon}</span> <span>{L(lang, pt, en)}</span>
          </button>
        ))}
      </div>

      {loading && <p className="muted small">{L(lang, 'Carregando…', 'Loading…')}</p>}

      {!loading && tab === 'images' && (
        <div className="stage-pane" role="tabpanel">
          <input className="input stage-search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={L(lang, 'Buscar cartão ou sala…', 'Find a card or room…')} aria-label={L(lang, 'Buscar', 'Search')} />
          {imgs.now.length > 0 && <>
            <p className="mesa-eyebrow stage-sub">{L(lang, 'Da cena agora', 'From the current scene')}</p>
            <div className="stage-list">{imgs.now.map(row)}</div>
          </>}
          <p className="mesa-eyebrow stage-sub">{L(lang, 'Todas', 'All')}</p>
          {imgs.all.length === 0 && imgs.now.length === 0 && (
            <p className="mesa-hint">{query ? L(lang, 'Nada com esse nome.', 'Nothing with that name.') : L(lang, 'O Mundo ainda não tem cartões. Crie em Mundo › Cartões.', 'The World has no cards yet. Create them in World › Cards.')}</p>
          )}
          <div className="stage-list">{imgs.all.map(row)}</div>
          {imgs.more > 0 && <p className="mesa-hint">{L(lang, `E mais ${imgs.more}: use a busca.`, `And ${imgs.more} more: use search.`)}</p>}
          <p className="mesa-hint">{L(lang, 'Cartão oculto vai como "só a imagem" (ou "só o nome"): a Tela pergunta antes e nada é revelado.', 'A hidden card goes as "image only" (or "name only"): the screen asks first and nothing is revealed.')}</p>
        </div>
      )}

      {!loading && tab === 'scenes' && (
        <div className="stage-pane" role="tabpanel">
          {scenes.length === 0 && (
            <p className="mesa-hint">{L(lang, 'Nenhuma cena no plano nem sala em jogo. Monte as cenas em Preparar.', 'No scene in the plan nor room in play. Set scenes up in Prepare.')}</p>
          )}
          <div className="stage-list">
            {scenes.map(s => (
              <div key={s.key} className="mesa-row stage-row">
                <span className="mesa-row-main">
                  <span className="mesa-row-title">{s.now ? '▶ ' : s.done ? '✓ ' : '○ '}{s.name}</span>
                  <span className="mesa-row-sub">{s.now ? `${L(lang, 'Cena agora', 'Current scene')}${s.sub ? ` · ${s.sub}` : ''}` : L(lang, 'Cena do plano', 'Plan scene')}</span>
                </span>
                <span className="mesa-row-act">
                  <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn stage-show" onShown={done}
                    target={{ ...s.target, name: s.name }} ariaLabel={`${L(lang, 'Mostrar a cena', 'Show the scene')}: ${s.name}`}>
                    📺 {L(lang, 'Mostrar a cena', 'Show the scene')}
                  </ShowOnTable>
                </span>
              </div>
            ))}
          </div>
          <p className="mesa-hint">{L(lang, 'A Tela mostra o nome da cena; a sala de uma aventura leva também a imagem e o texto para ler.', 'The screen shows the scene name; an adventure room also brings its image and read-aloud text.')}</p>
        </div>
      )}

      {!loading && tab === 'text' && (
        <div className="stage-pane" role="tabpanel">
          <RecapEditor campaign={campaign} lang={lang} inline onShown={done} />
          {data.node?.readAloud && (
            <div className="stage-read">
              <p className="mesa-eyebrow stage-sub">{L(lang, 'Ler em voz alta · cena agora', 'Read aloud · current scene')}</p>
              <p className="stage-read-text">{data.node.readAloud}</p>
              <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn" onShown={done}
                target={{ kind: 'scene', advId: data.adventure.id, nodeId: data.node.id, name: data.node.name }}>
                📺 {L(lang, 'Mostrar o texto da cena', 'Show the scene text')}
              </ShowOnTable>
            </div>
          )}
          <label className="mesa-field stage-free">
            <span className="mesa-field-label">{L(lang, 'Texto livre', 'Free text')} <span className="muted">({text.length}/{TEXT_MAX})</span></span>
            <textarea className="input" rows={3} maxLength={TEXT_MAX} value={text} onChange={e => setText(e.target.value)}
              placeholder={L(lang, 'Ex.: "O sino toca três vezes."', 'E.g. "The bell rings three times."')} />
          </label>
          <div className="mesa-actions stage-free-act">
            <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn is-primary stage-show" disabled={!text.trim()} onShown={done}
              target={{ kind: 'text', text: text.trim() }}>📺 {L(lang, 'Mostrar o texto', 'Show the text')}</ShowOnTable>
          </div>
          {/* O motivo do botão apagado, escrito (princípio 6); a linha fica sempre, para nada pular ao digitar. */}
          <p className="mesa-hint stage-why" aria-live="polite">{text.trim()
            ? L(lang, 'A Tela mostra o texto grande, na frente; ✕ tira.', 'The screen shows the text large, in front; ✕ removes it.')
            : L(lang, 'Escreva o texto acima para mostrar.', 'Write the text above to show it.')}</p>
        </div>
      )}

      {!loading && tab === 'map' && (
        <div className="stage-pane" role="tabpanel">
          <div className="stage-read">
            <p className="mesa-eyebrow stage-sub">{L(lang, 'Mapa do combate como fundo', 'Combat map as background')}</p>
            <p className="mesa-hint">{L(lang, 'Sem combate, a Tela mostra o mapa com os tokens, sem a ordem dos turnos (bom para mostrar a masmorra antes da luta).', 'Without combat, the screen shows the map with the tokens and no turn order (good for showing the dungeon before the fight).')}</p>
            <div className="mesa-actions stage-map-act">
              <button type="button" className={`mesa-btn ${mapBg ? '' : 'is-primary'}`} disabled={busy}
                onClick={() => sendToStage(campaign.id, () => stageBg(campaign.id, mapBg ? 'auto' : 'map'), {
                  lang, done: mapBg ? L(lang, 'Mapa tirado ✓', 'Map removed ✓') : undefined,
                  name: mapBg ? '' : L(lang, 'mapa do combate', 'combat map'), onDone: done,
                })}>
                {mapBg ? `✕ ${L(lang, 'Tirar o mapa', 'Remove the map')}` : `🗺 ${L(lang, 'Pôr o mapa do combate como fundo', 'Use the combat map as background')}`}
              </button>
              {data.node?.image && (
                <button type="button" className="mesa-btn" disabled={busy} onClick={roomToCombatMap}>
                  🚪 {L(lang, 'Imagem da sala como mapa do combate', 'Room image as combat map')}
                </button>
              )}
            </div>
          </div>
          <p className="mesa-eyebrow stage-sub">{L(lang, 'Mapas de lugar do Mundo', 'Place maps from the World')}</p>
          {maps.length === 0 && <p className="mesa-hint">{L(lang, 'Nenhum lugar com mapa. Em Mundo › Mapas, use a imagem de um lugar como mapa.', 'No place with a map. In World › Maps, use a place image as a map.')}</p>}
          <div className="stage-list">
            {maps.map(m => (
              <div key={m.key} className="mesa-row stage-row">
                <span className="mesa-row-pic stage-row-pic"><EntryImage entry={m.entry} className="stage-row-img" /></span>
                <span className="mesa-row-main">
                  <span className="mesa-row-title">🗺 {m.name}</span>
                  <span className="mesa-row-sub"><VisibilitySeal visibility={m.entry.visibility} lang={lang} small /> {L(lang, 'a imagem inteira, sem marcadores', 'the whole image, no pins')}</span>
                </span>
                <span className="mesa-row-act">
                  <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn stage-show" onShown={done}
                    target={{ kind: 'map', entry: m.entry }} ariaLabel={`${L(lang, 'Mostrar o mapa', 'Show the map')}: ${m.name}`}>
                    📺 {L(lang, 'Mostrar', 'Show')}
                  </ShowOnTable>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && (
        <button type="button" className="mesa-btn is-quiet stage-reload" onClick={reload}>⟳ {L(lang, 'Atualizar a lista', 'Refresh the list')}</button>
      )}
    </div>
  );
}

/** A folha "Mostrar na Tela" (o mesmo conteúdo de Jogar › Tela › Mostrar). */
export default function ShowSheet({ campaign, stage, lang = 'pt', onClose, onChange, sceneNow = null }) {
  return (
    <MesaSheet title={L(lang, 'Mostrar na Tela', 'Show on screen')} icon="📺" size="tall" width="md" lang={lang} onClose={onClose} dock="play">
      <ShowPicker campaign={campaign} stage={stage} lang={lang} onChange={onChange} sceneNow={sceneNow} />
    </MesaSheet>
  );
}
