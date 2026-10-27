import { useMemo, useRef, useState } from 'react';
import { findMonster } from '../../data/bestiary.js';
import SRD from '../../data/srd.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import { checkLabel } from '../checks/check-logic.js';
import ItemPickerModal from '../items/ItemPickerModal.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import { compressImage } from '../world/image.js';
import { ScenePalette, BlockFrame, TextBlock, PeopleBlock, FightBlock, CheckBlock } from './SceneBlocks.jsx';
import { encounterToFight, fightToEncounter, nodeCheckToCheck, checkToNodeCheck, fightEntry, SCENE_LIMITS } from './scene-model.js';
import {
  NODE_KINDS, EDGE_KINDS, COINS, COIN_LABEL, LIMITS, makeEdge, edgeKindLabel,
} from './prep-graph.js';
import './scene-sheet.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export const SAVE_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Rótulo de um teste sugerido: "perception" → Percepção; "save:dex" → Resistência de DES; "ability:str" → Força. */
export function checkText(skill, lang) {
  if (!skill) return '';
  if (skill.startsWith('save:')) return checkLabel({ kind: 'save', key: skill.slice(5) }, lang);
  if (skill.startsWith('ability:')) return checkLabel({ kind: 'ability', key: skill.slice(8) }, lang);
  if (SRD.SKILLS.some(s => s.id === skill)) return checkLabel({ kind: 'skill', key: skill }, lang);
  return skill;
}

export function monsterLookup() {
  const custom = loadCustomMonsters();
  return (id) => (id ? (findMonster(id) || custom.find(m => m.id === id) || null) : null);
}

/** Compressão de imagem: pipeline único em src/world/image.js (reexportado por compatibilidade). */
export { compressImage };

const ROOM_BLOCKS = ['read', 'show', 'refs', 'fight', 'check', 'notes'];
const FLASH_MS = 6000;
const ROOM_IMAGE_HELP = [
  'A imagem da sala. Usar na Tela: na mesa, 📺 mostra a sala com esta imagem (sem revelar nada no Mundo). Usar como mapa do combate: na mesa, 🗺 põe esta imagem no fundo do combate.',
  'The room image. Use on screen: at the table, 📺 shows the room with this image (nothing is revealed in the World). Use as combat map: at the table, 🗺 puts this image behind the combat.',
];

/**
 * Preparar › Aventuras › sala: a folha da Cena em modo sala (§3.5). Os mesmos blocos da
 * cena (📜 ler · 📺 imagem · 🎭 cartões · ⚔ combate · 🎯 testes · 🔒 notas) e o que só a
 * sala tem: tipo ("o tipo só muda o ícone"), tags, perigos (rótulo escrito em cima de cada
 * campo), tesouro e conexões. No PC, painel de 520 px à direita do mapa (o mapa continua
 * tocável). As mudanças sobem via onChange(patch): o PrepTab aplica e agenda o autosave da
 * aventura (a aventura inteira já está aberta aqui, com o mapa).
 */
export default function NodeEditor({
  node, data, adventures, currentAdventureId, campaign, campaignItems, levels, lang, saveState = 'saved',
  world, onCreateEntry, onOpenEntry,
  onChange, onDelete, onDataChange, onSelectEdge, onClose,
}) {
  const [picker, setPicker] = useState(null); // 'item'
  const [linkTo, setLinkTo] = useState('');
  const [linkKind, setLinkKind] = useState('door');
  const [imgError, setImgError] = useState('');
  const [fightError, setFightError] = useState('');
  const [opened, setOpened] = useState(() => new Set());
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  const fileRef = useRef(null);

  const set = (patch) => onChange(patch);
  const setList = (key, list) => set({ [key]: list });
  const others = (data.nodes || []).filter(n => n.id !== node.id);
  const edges = (data.edges || []).filter(e => e.from === node.id || e.to === node.id);
  const nameOf = (id) => (data.nodes || []).find(n => n.id === id)?.name || '?';
  const fight = useMemo(() => (node.encounter || []).map(e => encounterToFight(e, { limit: SCENE_LIMITS.nodeCount, raw: true })), [node.encounter]);
  const checks = useMemo(() => (node.checks || []).map(nodeCheckToCheck).filter(Boolean), [node.checks]);
  const present = new Set([
    (node.readAloud || '').trim() && 'read', node.image && 'show', (node.refs || []).length && 'refs',
    fight.length && 'fight', checks.length && 'check', (node.notes || '').trim() && 'notes',
  ].filter(Boolean));
  const shown = (id) => present.has(id) || opened.has(id);

  const say = (text, undo = null) => {
    clearTimeout(flashTimer.current);
    setFlash({ text, undo });
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };
  const FIELD = { read: 'readAloud', show: 'image', refs: 'refs', fight: 'encounter', check: 'checks', notes: 'notes' };
  const EMPTY = { read: '', show: '', refs: [], fight: [], check: [], notes: '' };
  const openBlock = (id) => {
    setOpened(s => new Set(s).add(id));
    if (id === 'check' && !checks.length) setList('checks', [{ skill: 'perception', dc: 13, note: '' }]);
    setTimeout(() => {
      const el = document.getElementById(`ss-b-${id}`);
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      el?.querySelector('textarea, input:not([type="file"]), select')?.focus({ preventScroll: true });
    }, 30);
  };
  const removeBlock = (id) => {
    const key = FIELD[id];
    const before = node[key];
    set({ [key]: EMPTY[id] });
    setOpened(s => { const n = new Set(s); n.delete(id); return n; });
    say(t(lang, 'Tirado da sala.', 'Removed from the room.'), () => { set({ [key]: before }); setOpened(s => new Set(s).add(id)); });
  };

  const addLink = () => {
    if (!linkTo) return;
    let edge;
    if (linkTo.startsWith('adv:')) {
      const adv = adventures.find(a => String(a.id) === linkTo.slice(4));
      edge = makeEdge(node.id, null, 'adventure', { toAdventureId: adv?.id ?? null, toAdventureName: adv?.name || '' });
    } else {
      edge = makeEdge(node.id, linkTo, linkKind);
    }
    onDataChange(edge);
    setLinkTo('');
  };

  const onImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setImgError('');
    try {
      const { url } = await compressImage(f);
      set({ image: url });
    } catch (err) {
      setImgError(err.message === 'image_too_large'
        ? t(lang, 'Imagem grande demais mesmo depois de comprimir.', 'Image still too large after compression.')
        : t(lang, 'Não consegui ler a imagem.', 'Could not read the image.'));
    }
  };

  const addMonster = (monster, count) => {
    setFightError('');
    const { entry } = fightEntry(monster, count, { lang, linked: true });
    const same = fight.findIndex(f => f.monsterId && f.monsterId === entry.monsterId);
    const next = same >= 0
      ? fight.map((f, i) => (i === same ? { ...f, count: Math.min(SCENE_LIMITS.nodeCount, f.count + entry.count) } : f))
      : [...fight, entry];
    setList('encounter', next.slice(0, SCENE_LIMITS.nodeFight).map(fightToEncounter));
    return true;
  };

  const saveText = { saved: t(lang, '✓ Salvo', '✓ Saved'), dirty: t(lang, 'Alterado…', 'Edited…'), saving: t(lang, 'Salvando…', 'Saving…'), error: t(lang, 'Erro ao salvar', 'Save failed') }[saveState];
  const saveCls = saveState === 'error' ? 's-error' : saveState === 'saved' ? 's-saved' : 's-dirty';
  const kind = NODE_KINDS.find(k => k.id === node.kind) || NODE_KINDS[0];

  return (
    <MesaSheet title={node.name || t(lang, 'Sala', 'Room')} icon={kind.icon} eyebrow={t(lang, 'Sala', 'Room')} size="tall" width="md" lang={lang} side className="ss"
      onClose={onClose} aside={<span className={`ss-save ${saveCls}`} role="status">{saveText}</span>}
      footer={(
        <div className="ss-foot">
          <button type="button" className="mesa-btn mesa-btn-lg is-quiet ss-del" onClick={onDelete}>🗑 {t(lang, 'Apagar sala', 'Delete room')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary ss-done" onClick={onClose}>{t(lang, 'Pronto', 'Done')}</button>
        </div>
      )}>
      <div className="ss-body">
        <div className="ss-field">
          <label className="ss-label" htmlFor={`ss-room-name-${node.id}`}>{t(lang, 'Nome da sala', 'Room name')}</label>
          <input id={`ss-room-name-${node.id}`} className="input ss-input" value={node.name} maxLength={120} onChange={e => set({ name: e.target.value })} />
        </div>
        <div className="ss-room-grid">
          <div className="ss-field">
            <label className="ss-label" htmlFor={`ss-room-kind-${node.id}`}>{t(lang, 'Tipo', 'Type')}</label>
            <select id={`ss-room-kind-${node.id}`} className="input" value={node.kind} onChange={e => set({ kind: e.target.value })}>
              {NODE_KINDS.map(k => <option key={k.id} value={k.id}>{k.icon} {t(lang, k.pt, k.en)}</option>)}
            </select>
            <p className="ss-hint">{t(lang, 'o tipo só muda o ícone', 'the type only changes the icon')}</p>
          </div>
          <div className="ss-field">
            <label className="ss-label" htmlFor={`ss-room-tags-${node.id}`}>{t(lang, 'Tags (separadas por vírgula)', 'Tags (comma-separated)')}</label>
            <input id={`ss-room-tags-${node.id}`} className="input" defaultValue={(node.tags || []).join(', ')} key={`tags-${node.id}`}
              onBlur={e => set({ tags: [...new Set(e.target.value.split(',').map(x => x.trim()).filter(Boolean))].slice(0, 20) })} />
            <p className="ss-hint">{t(lang, '“início” marca a entrada', '“start” marks the entrance')}</p>
          </div>
        </div>

        <ScenePalette ids={ROOM_BLOCKS} present={new Set([...present, ...opened])} lang={lang} onPick={openBlock} />

        {shown('read') && (
          <TextBlock id="read" lang={lang} value={node.readAloud || ''} max={SCENE_LIMITS.nodeRead}
            placeholder={t(lang, 'O que os jogadores ouvem ao entrar…', 'What the players hear when they enter…')}
            onChange={v => set({ readAloud: v })} onRemove={() => removeBlock('read')} />
        )}
        {shown('show') && (
          <BlockFrame id="show" lang={lang} help={ROOM_IMAGE_HELP} onRemove={node.image ? () => removeBlock('show') : null}>
            {node.image && <img className="ss-room-pic" src={node.image} alt={t(lang, `Imagem de ${node.name}`, `Image of ${node.name}`)} />}
            <p className="ss-hint">📺 {t(lang, 'Usar na Tela: na mesa, 📺 mostra a sala com esta imagem.', 'Use on screen: at the table, 📺 shows the room with this image.')}</p>
            <p className="ss-hint">🗺 {t(lang, 'Usar como mapa do combate: na mesa, 🗺 põe esta imagem no fundo do combate.', 'Use as combat map: at the table, 🗺 puts this image behind the combat.')}</p>
            <div className="ss-row-btns">
              <button type="button" className="mesa-btn" onClick={() => fileRef.current?.click()}>⬆ {node.image ? t(lang, 'Trocar imagem', 'Replace image') : t(lang, 'Subir imagem', 'Upload image')}</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onImage} hidden />
            </div>
            {imgError && <p className="ss-error" role="alert">{imgError}</p>}
          </BlockFrame>
        )}
        {shown('refs') && (
          <PeopleBlock lang={lang} world={world} ids={node.refs || []} max={LIMITS.refs} kinds={null}
            onToggle={(id) => { const cur = node.refs || []; set({ refs: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(0, LIMITS.refs) }); }}
            onCreate={onCreateEntry} onOpen={onOpenEntry} onRemove={() => removeBlock('refs')} />
        )}
        {shown('fight') && (
          <FightBlock lang={lang} fight={fight} levels={levels} members={campaign.members} levelingMode={campaign.state?.levelingMode || 'milestone'}
            maxRows={SCENE_LIMITS.nodeFight} maxCount={SCENE_LIMITS.nodeCount} error={fightError}
            confirmLabel={t(lang, 'Pôr na sala', 'Put in the room')} title={t(lang, 'Combate desta sala', "This room's combat")}
            onChange={v => setList('encounter', v.map(fightToEncounter))} onAdd={addMonster} onRemove={() => removeBlock('fight')} />
        )}
        {shown('check') && (
          <CheckBlock lang={lang} checks={checks} members={campaign.members} multi
            onChange={list => setList('checks', list.map(checkToNodeCheck).filter(Boolean))} onRemove={() => removeBlock('check')} />
        )}
        {shown('notes') && (
          <TextBlock id="notes" lang={lang} value={node.notes || ''} max={SCENE_LIMITS.nodeNotes}
            placeholder={t(lang, 'Notas do mestre (secretas): o que ninguém sabe desta sala.', 'DM notes (secret): what nobody knows about this room.')}
            onChange={v => set({ notes: v })} onRemove={() => removeBlock('notes')} />
        )}

        {/* ----- Perigos: o rótulo escrito em cima de cada campo ----- */}
        <section className="ss-block" aria-labelledby={`ss-hz-${node.id}`}>
          <header className="ss-block-head"><h3 className="ss-block-h" id={`ss-hz-${node.id}`}>⚠ {t(lang, 'Perigos e armadilhas', 'Hazards & traps')}</h3></header>
          {(node.hazards || []).map((h, i) => {
            const upd = (patch) => setList('hazards', node.hazards.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            const id = `ss-hz-${node.id}-${i}`;
            return (
              <div key={i} className="ss-hazard">
                <div className="ss-hazard-head">
                  <p className="mesa-eyebrow">{t(lang, `Perigo ${i + 1}`, `Hazard ${i + 1}`)}</p>
                  <button type="button" className="mesa-icon-btn" aria-label={t(lang, `Tirar o perigo ${i + 1}`, `Remove hazard ${i + 1}`)} onClick={() => setList('hazards', node.hazards.filter((_, j) => j !== i))}>×</button>
                </div>
                <div className="ss-hazard-grid">
                  <div className="ss-field"><label className="ss-label" htmlFor={`${id}-n`}>{t(lang, 'Nome', 'Name')}</label>
                    <input id={`${id}-n`} className="input" value={h.name} maxLength={120} onChange={e => upd({ name: e.target.value })} placeholder={t(lang, 'Ex.: Fosso', 'E.g. Pit')} /></div>
                  <div className="ss-field"><label className="ss-label" htmlFor={`${id}-c`}>{t(lang, 'CD', 'DC')}</label>
                    <input id={`${id}-c`} type="number" inputMode="numeric" className="input" min={1} max={40} value={h.dc ?? ''}
                      onChange={e => upd({ dc: e.target.value === '' ? null : parseInt(e.target.value, 10) })} /></div>
                  <div className="ss-field"><label className="ss-label" htmlFor={`${id}-d`}>{t(lang, 'Dano', 'Damage')}</label>
                    <input id={`${id}-d`} className="input" value={h.damage || ''} maxLength={60} onChange={e => upd({ damage: e.target.value })} placeholder="2d6" /></div>
                </div>
                <div className="ss-field"><label className="ss-label" htmlFor={`${id}-e`}>{t(lang, 'Efeito', 'Effect')}</label>
                  <input id={`${id}-e`} className="input" value={h.effect || ''} maxLength={1000} onChange={e => upd({ effect: e.target.value })}
                    placeholder={t(lang, 'Ex.: salvaguarda de DES; cai no fosso', 'E.g. DEX save; falls into the pit')} /></div>
              </div>
            );
          })}
          <button type="button" className="mesa-btn ss-wide" onClick={() => setList('hazards', [...(node.hazards || []), { name: '', dc: 13, effect: '', damage: '' }])}>＋ {t(lang, 'Perigo', 'Hazard')}</button>
        </section>

        {/* ----- Tesouro ----- */}
        <section className="ss-block" aria-labelledby={`ss-tr-${node.id}`}>
          <header className="ss-block-head"><h3 className="ss-block-h" id={`ss-tr-${node.id}`}>💰 {t(lang, 'Tesouro', 'Treasure')}</h3></header>
          {(node.treasure?.items || []).length > 0 && (
            <ul className="ss-treasure">
              {node.treasure.items.map((it, i) => (
                <li key={it.id || i}>
                  <input type="number" inputMode="numeric" className="input" min={1} max={999} value={it.qty || 1} aria-label={t(lang, `Quantidade de ${it.name}`, `Quantity of ${it.name}`)}
                    onChange={e => set({ treasure: { ...node.treasure, items: node.treasure.items.map((x, j) => (j === i ? { ...x, qty: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)) } })} />
                  <span className="ss-treasure-name">× {it.name}</span>
                  <button type="button" className="mesa-icon-btn" aria-label={t(lang, `Tirar ${it.name}`, `Remove ${it.name}`)}
                    onClick={() => set({ treasure: { ...node.treasure, items: node.treasure.items.filter((_, j) => j !== i) } })}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="ss-coins">
            {COINS.map(c => (
              <label key={c}>
                <span>{COIN_LABEL[c][lang] || c}</span>
                <input type="number" inputMode="numeric" className="input" min={0} value={node.treasure?.coins?.[c] || ''} placeholder="0"
                  onChange={e => set({ treasure: { items: node.treasure?.items || [], coins: { ...(node.treasure?.coins || {}), [c]: Math.max(0, parseInt(e.target.value, 10) || 0) } } })} />
              </label>
            ))}
          </div>
          <button type="button" className="mesa-btn ss-wide" onClick={() => setPicker('item')}>＋ {t(lang, 'Item', 'Item')}</button>
        </section>

        {/* ----- Conexões ----- */}
        <section className="ss-block" aria-labelledby={`ss-cx-${node.id}`}>
          <header className="ss-block-head"><h3 className="ss-block-h" id={`ss-cx-${node.id}`}>↔ {t(lang, 'Conexões', 'Connections')}</h3></header>
          {edges.length === 0 && <p className="ss-hint">{t(lang, 'Nenhuma ainda. Puxe o ● no mapa ou use abaixo.', 'None yet. Pull the ● on the map or use below.')}</p>}
          {edges.length > 0 && (
            <ul className="ss-links">
              {edges.map(e => (
                <li key={e.id}>
                  <button type="button" className="ss-link-row" onClick={() => onSelectEdge(e.id)}>
                    <span aria-hidden="true">{e.from === node.id ? '→' : '←'}</span>
                    <span>{e.to ? nameOf(e.from === node.id ? e.to : e.from) : `↗ ${e.toAdventureName || t(lang, 'outra aventura', 'another adventure')}`}</span>
                    <span className="ss-hint">{edgeKindLabel(e.kind, lang)}{e.label ? ` · ${e.label}` : ''}{e.oneWay ? t(lang, ' · só ida', ' · one-way') : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="ss-connect">
            <select className="input" value={linkTo} onChange={e => setLinkTo(e.target.value)} aria-label={t(lang, 'Conectar a', 'Connect to')}>
              <option value="">{t(lang, 'Conectar a…', 'Connect to…')}</option>
              {others.map(n => <option key={n.id} value={n.id}>{n.name || '?'}</option>)}
              {adventures.filter(a => a.id !== currentAdventureId).length > 0 && (
                <optgroup label={t(lang, 'Outra aventura', 'Another adventure')}>
                  {adventures.filter(a => a.id !== currentAdventureId).map(a => <option key={a.id} value={`adv:${a.id}`}>↗ {a.name}</option>)}
                </optgroup>
              )}
            </select>
            {!linkTo.startsWith('adv:') && (
              <select className="input" value={linkKind} onChange={e => setLinkKind(e.target.value)} aria-label={t(lang, 'Tipo de conexão', 'Connection type')}>
                {EDGE_KINDS.filter(k => k.id !== 'adventure').map(k => <option key={k.id} value={k.id}>{k.icon} {t(lang, k.pt, k.en)}</option>)}
              </select>
            )}
            <button type="button" className="mesa-btn" disabled={!linkTo} onClick={addLink}>{t(lang, 'Conectar', 'Connect')}</button>
          </div>
        </section>
      </div>

      {flash && (
        <div className="ss-flash" role="status" aria-live="polite">
          <span>{flash.text}</span>
          {flash.undo && <button type="button" className="mesa-btn" onClick={() => { flash.undo(); setFlash(null); }}>↶ {t(lang, 'Desfazer', 'Undo')}</button>}
        </div>
      )}
      {picker === 'item' && (
        <ItemPickerModal lang={lang} sheet icon="💰" title={`${t(lang, 'Tesouro de', 'Treasure of')} ${node.name}`}
          confirmLabel={t(lang, 'Adicionar', 'Add')}
          campaignItems={campaignItems}
          onClose={() => setPicker(null)}
          onPick={async (instance) => {
            set({ treasure: { coins: node.treasure?.coins || {}, items: [...(node.treasure?.items || []), instance].slice(0, 40) } });
          }} />
      )}
    </MesaSheet>
  );
}

/** Editor de uma conexão (aresta). */
export function EdgeEditor({ edge, data, adventures, currentAdventureId, lang, onChange, onDelete, onReverse, onSelectNode }) {
  const nameOf = (id) => (data.nodes || []).find(n => n.id === id)?.name || '?';
  return (
    <div className="prep-editor">
      <p className="prep-edge-title">
        <button type="button" className="linklike" onClick={() => onSelectNode(edge.from)}>{nameOf(edge.from)}</button>
        {' '}{edge.oneWay || !edge.to ? '→' : '↔'}{' '}
        {edge.to
          ? <button type="button" className="linklike" onClick={() => onSelectNode(edge.to)}>{nameOf(edge.to)}</button>
          : <span>↗ {edge.toAdventureName || t(lang, 'outra aventura', 'another adventure')}</span>}
      </p>
      <label className="prep-field">
        <span>{t(lang, 'Tipo', 'Type')}</span>
        <select className="input" value={edge.kind} onChange={e => onChange({ kind: e.target.value })}>
          {EDGE_KINDS.filter(k => k.id !== 'adventure' || !edge.to || edge.kind === 'adventure').map(k => (
            <option key={k.id} value={k.id} disabled={k.id !== 'adventure' && !edge.to}>{k.icon} {t(lang, k.pt, k.en)}</option>
          ))}
        </select>
      </label>
      {edge.kind === 'adventure' && (
        <label className="prep-field">
          <span>{t(lang, 'Aventura de destino', 'Target adventure')}</span>
          <select className="input" value={edge.toAdventureId ?? ''} onChange={e => {
            const adv = adventures.find(a => String(a.id) === e.target.value);
            onChange({ toAdventureId: adv?.id ?? null, toAdventureName: adv?.name || edge.toAdventureName || '' });
          }}>
            <option value="">{edge.toAdventureName ? `${edge.toAdventureName} (${t(lang, 'não encontrada', 'not found')})` : '—'}</option>
            {adventures.filter(a => a.id !== currentAdventureId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      )}
      <label className="prep-field">
        <span>{t(lang, 'Rótulo', 'Label')}</span>
        <input className="input" maxLength={80} value={edge.label || ''} onChange={e => onChange({ label: e.target.value })}
          placeholder={t(lang, 'ex.: Porta de ferro', 'e.g. Iron door')} />
      </label>
      <label className="prep-field">
        <span>{t(lang, 'Condição (opcional)', 'Condition (optional)')}</span>
        <input className="input" maxLength={200} value={edge.condition || ''} onChange={e => onChange({ condition: e.target.value })}
          placeholder={t(lang, 'ex.: precisa da chave de bronze', 'e.g. needs the bronze key')} />
      </label>
      {edge.to && (
        <label className="me-check">
          <input type="checkbox" checked={!!edge.oneWay} onChange={e => onChange({ oneWay: e.target.checked })} />
          {t(lang, 'Só ida (não dá para voltar por aqui)', 'One-way (no way back through here)')}
        </label>
      )}
      <div className="prep-editor-foot">
        {edge.to && <button type="button" className="btn btn-ghost btn-sm" onClick={onReverse}>⇄ {t(lang, 'Inverter sentido', 'Reverse')}</button>}
        <button type="button" className="btn btn-ghost btn-sm danger" onClick={onDelete}>{t(lang, 'Apagar conexão', 'Delete connection')}</button>
      </div>
    </div>
  );
}
