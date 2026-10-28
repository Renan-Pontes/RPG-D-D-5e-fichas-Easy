// Jogar › Agora › Cena agora › "da aventura ▸" (V7, especificação §4.4): o painel "Na mesa"
// da sala da cena ligada (prep/PlayPanel.jsx, o mesmo das Aventuras), dentro do cartão —
// visitado e Registrar na Crônica, texto lido, nome e texto na Tela, imagem como mapa do
// combate, cartões da sala (Só o nome / Revelar / 📺), notas, caminhos (Ir →, 🔓 Destrancar,
// 👁 Descobriram, ↺ Trancar de novo, Abrir aventura, ver a sala), combate, perigos, testes
// e tesouro. Antes isso ficava a 6 toques, fora de Jogar.
// A aventura inteira (com as imagens das salas) só é lida aqui, ao abrir, e de novo quando
// o `advRev` do pulso muda com o painel aberto — nunca no polling da Agora.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import PlayPanel from '../prep/PlayPanel.jsx';
import { emptyPlay, partyLevels } from '../prep/prep-graph.js';
import { readLogRoom, writeLogRoom } from './scene-actions.js';
import { useOnRev, useTable } from './table-store.js';
import '../prep/prep-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function AdventureNow({ campaign, lang = 'pt', advId, nodeId, world, goTo, onWorldChange, onOpenEntry, onChange }) {
  const table = useTable();
  const [adv, setAdv] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(nodeId);
  const [log, setLog] = useState(() => readLogRoom(campaign.id));
  useEffect(() => { setSel(nodeId); }, [nodeId]);

  const load = useCallback(async () => {
    try {
      const r = await api.getAdventure(campaign.id, advId);
      setAdv({ ...r.adventure, play: r.adventure.play || emptyPlay() });
      setError('');
    } catch (e) { setError(errorMessage(e, lang)); }
  }, [campaign.id, advId, lang]);
  useEffect(() => { load(); }, [load]);
  useOnRev(table?.pulse?.advRev ?? null, load, { table, fallbackMs: Infinity, safetyMs: Infinity, initial: false });

  const onPlay = async (action, extra = {}) => {
    try {
      const r = await api.adventurePlay(campaign.id, advId, { action, ...extra, log });
      setAdv(a => ({ ...a, play: r.adventure.play, status: r.adventure.status }));
      if (action === 'enter' && extra.nodeId) setSel(extra.nodeId);
      onChange?.();
    } catch (e) { setError(errorMessage(e, lang)); }
  };

  if (error && !adv) return <p className="prep-error" role="alert">{error}</p>;
  if (!adv) return <p className="muted small">{L(lang, 'Carregando a aventura…', 'Loading the adventure…')}</p>;
  const node = (adv.data?.nodes || []).find(n => n.id === sel) || null;
  return (
    <div className="adv-now">
      <div className="adv-now-head">
        <span className="mesa-row-sub">{adv.name}</span>
        {goTo && (
          <button type="button" className="mesa-btn is-quiet" onClick={() => goTo('prepare', 'adventures', { adventureId: adv.id, nodeId: sel })}>
            {L(lang, 'Abrir o mapa da aventura', 'Open the adventure map')} ↗
          </button>
        )}
      </div>
      {sel !== nodeId && (
        <button type="button" className="mesa-btn adv-now-back" onClick={() => setSel(nodeId)}>← {L(lang, 'Voltar à sala da cena', 'Back to the scene room')}</button>
      )}
      {error && <p className="prep-error" role="alert">{error}</p>}
      {node ? (
        <PlayPanel key={node.id} adventure={adv} node={node} campaign={campaign} levels={partyLevels(campaign)} lang={lang}
          logDiary={log} onLogDiary={(v) => { setLog(v); writeLogRoom(campaign.id, v); }} onPlay={onPlay}
          onOpenAdventure={(id) => goTo?.('prepare', 'adventures', { adventureId: id })}
          onSelectNode={setSel} goTo={goTo} world={world} onWorldChange={onWorldChange} onOpenEntry={onOpenEntry} />
      ) : (
        <p className="muted small">{L(lang, 'A sala desta cena não existe mais na aventura.', "This scene's room no longer exists in the adventure.")}</p>
      )}
    </div>
  );
}
