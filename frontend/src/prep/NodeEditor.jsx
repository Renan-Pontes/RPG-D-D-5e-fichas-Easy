import { useMemo, useState } from 'react';
import { findMonster } from '../../data/bestiary.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import { checkLabel } from '../checks/check-logic.js';
import { DIFFICULTY_LABEL } from '../combat/encounter.js';
import MonsterPicker from '../campaigns/MonsterPicker.jsx';
import ItemPickerModal from '../items/ItemPickerModal.jsx';
import WorldRefs from './WorldRefs.jsx';
import { compressImage } from '../world/image.js';
import {
  NODE_KINDS, EDGE_KINDS, COINS, COIN_LABEL, LIMITS, encounterEntry, nodeEncounter, makeEdge, edgeKindLabel,
} from './prep-graph.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export const SAVE_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Rótulo de um teste sugerido: "perception" → Percepção; "save:dex" → Resistência de DES. */
export function checkText(skill, lang) {
  if (!skill) return '';
  if (skill.startsWith('save:')) return checkLabel({ kind: 'save', key: skill.slice(5) }, lang);
  if (SRD.SKILLS.some(s => s.id === skill)) return checkLabel({ kind: 'skill', key: skill }, lang);
  return skill;
}

export function monsterLookup() {
  const custom = loadCustomMonsters();
  return (id) => (id ? (findMonster(id) || custom.find(m => m.id === id) || null) : null);
}

/** Compressão de imagem: pipeline único em src/world/image.js (reexportado por compatibilidade). */
export { compressImage };

/**
 * Editor de um nó (modo Preparar). Alterações sobem via onChange(patch) — o
 * PrepTab aplica e agenda o autosave.
 */
export default function NodeEditor({
  node, data, adventures, currentAdventureId, campaign, campaignItems, levels, lang,
  world, onCreateEntry, onOpenEntry,
  onChange, onDelete, onDataChange, onSelectEdge,
}) {
  const [picker, setPicker] = useState(null); // 'monster' | 'item'
  const [linkTo, setLinkTo] = useState('');
  const [linkKind, setLinkKind] = useState('door');
  const [imgError, setImgError] = useState('');

  const lookup = useMemo(() => monsterLookup(), []);
  const enc = nodeEncounter(node, levels, lookup);
  const set = (patch) => onChange(patch);
  const setList = (key, list) => set({ [key]: list });
  const others = (data.nodes || []).filter(n => n.id !== node.id);
  const edges = (data.edges || []).filter(e => e.from === node.id || e.to === node.id);
  const nameOf = (id) => (data.nodes || []).find(n => n.id === id)?.name || '?';

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

  const diffLabel = DIFFICULTY_LABEL[enc.rating]?.[lang] || DIFFICULTY_LABEL[enc.rating]?.en;

  return (
    <div className="prep-editor">
      <div className="prep-field-row">
        <label className="prep-field grow">
          <span>{t(lang, 'Nome', 'Name')}</span>
          <input className="input" value={node.name} maxLength={120} onChange={e => set({ name: e.target.value })} />
        </label>
        <label className="prep-field">
          <span>{t(lang, 'Tipo', 'Type')}</span>
          <select className="input" value={node.kind} onChange={e => set({ kind: e.target.value })}>
            {NODE_KINDS.map(k => <option key={k.id} value={k.id}>{k.icon} {t(lang, k.pt, k.en)}</option>)}
          </select>
        </label>
      </div>

      <label className="prep-field">
        <span>{t(lang, 'Tags (separadas por vírgula; “início” marca a entrada)', 'Tags (comma-separated; “start” marks the entrance)')}</span>
        <input className="input" defaultValue={(node.tags || []).join(', ')} key={`tags-${node.id}`}
          onBlur={e => set({ tags: [...new Set(e.target.value.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20) })} />
      </label>

      <label className="prep-field">
        <span>📜 {t(lang, 'Texto para ler em voz alta', 'Read-aloud text')}</span>
        <textarea className="input" rows={4} maxLength={5000} value={node.readAloud || ''} onChange={e => set({ readAloud: e.target.value })}
          placeholder={t(lang, 'O que os jogadores ouvem ao entrar…', 'What the players hear when they enter…')} />
      </label>

      <label className="prep-field">
        <span>🔒 {t(lang, 'Notas do mestre (secretas)', 'DM notes (secret)')}</span>
        <textarea className="input" rows={4} maxLength={10000} value={node.notes || ''} onChange={e => set({ notes: e.target.value })} />
      </label>

      {/* ----- Cartões do Mundo ----- */}
      <section className="prep-section prep-world-refs">
        <header><h4>🌍 {t(lang, 'Cartões do Mundo nesta sala', 'World cards in this room')}</h4></header>
        <p className="muted small prep-note">{t(lang,
          'Quem está aqui, onde fica, que segredo se esconde. Em “Conduzir” eles aparecem prontos para revelar ou mostrar no telão.',
          'Who is here, where it is, what secret hides here. In “Run” they show up ready to reveal or show on the TV.')}</p>
        <WorldRefs entries={world} ids={node.refs || []} lang={lang} max={LIMITS.refs} compact
          onToggle={(id) => {
            const cur = node.refs || [];
            set({ refs: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(0, LIMITS.refs) });
          }}
          onCreate={onCreateEntry} onOpen={onOpenEntry}
          addLabel={t(lang, 'Ligar NPC, lugar, item…', 'Link NPC, place, item…')} />
      </section>

      {/* ----- Encontro ----- */}
      <section className="prep-section">
        <header>
          <h4>⚔ {t(lang, 'Encontro', 'Encounter')}</h4>
          {enc.monsters > 0 && (
            <span className={`enc-label ${enc.rating}`} title={t(lang,
              `${enc.estimated ? '≈ ' : ''}${enc.totalXp} XP · dificuldade para o grupo: fácil até ${enc.budget.low} · média até ${enc.budget.moderate} · difícil até ${enc.budget.high} XP`,
              `${enc.estimated ? '≈ ' : ''}${enc.totalXp} XP · difficulty for the party: easy up to ${enc.budget.low} · medium up to ${enc.budget.moderate} · hard up to ${enc.budget.high} XP`)}>
              {levels.length ? diffLabel : t(lang, 'sem PJs', 'no PCs')}
            </span>
          )}
        </header>
        {(node.encounter || []).map((en, i) => {
          const src = lookup(en.monsterId);
          const name = src ? (src.name?.[lang] || src.name?.en || en.name) : en.name;
          return (
            <div key={i} className="adv-row">
              <input type="number" className="input prep-num" min={1} max={50} value={en.count}
                aria-label={t(lang, 'Quantidade', 'Count')}
                onChange={e => setList('encounter', node.encounter.map((x, j) => (j === i ? { ...x, count: Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)) } : x)))} />
              <span className="grow">× {name} <span className="muted small">{src?.cr != null ? `ND ${src.cr}` : en.crNum != null ? `ND ${en.crNum}` : ''}{en.snapshot ? t(lang, ' · meu', ' · mine') : ''}</span></span>
              <button type="button" className="btn btn-ghost btn-icon danger" aria-label={t(lang, 'Remover', 'Remove')}
                onClick={() => setList('encounter', node.encounter.filter((_, j) => j !== i))}>×</button>
            </div>
          );
        })}
        {enc.monsters > 0 && (
          <p className="muted small prep-note">
            {enc.estimated ? '≈ ' : ''}{enc.totalXp.toLocaleString()} XP · {levels.length
              ? t(lang, `${levels.length} PJ(s) na mesa agora`, `${levels.length} PC(s) at the table now`)
              : t(lang, 'a campanha ainda não tem personagens', 'the campaign has no characters yet')}
          </p>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicker('monster')}>+ {t(lang, 'Monstro', 'Monster')}</button>
      </section>

      {/* ----- Armadilhas / perigos ----- */}
      <section className="prep-section">
        <header><h4>⚠ {t(lang, 'Armadilhas e perigos', 'Traps & hazards')}</h4></header>
        {(node.hazards || []).map((h, i) => {
          const upd = (patch) => setList('hazards', node.hazards.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="prep-card">
              <div className="adv-row">
                <input className="input grow" placeholder={t(lang, 'Nome', 'Name')} value={h.name} maxLength={120} onChange={e => upd({ name: e.target.value })} aria-label={t(lang, 'Nome do perigo', 'Hazard name')} />
                <input type="number" className="input prep-num" placeholder={t(lang, 'CD', 'DC')} min={1} max={40} value={h.dc ?? ''} aria-label={t(lang, 'CD', 'DC')}
                  onChange={e => upd({ dc: e.target.value === '' ? null : parseInt(e.target.value, 10) })} />
                <input className="input prep-dmg" placeholder={t(lang, 'Dano', 'Damage')} value={h.damage || ''} maxLength={60} onChange={e => upd({ damage: e.target.value })} aria-label={t(lang, 'Dano', 'Damage')} />
                <button type="button" className="btn btn-ghost btn-icon danger" aria-label={t(lang, 'Remover', 'Remove')} onClick={() => setList('hazards', node.hazards.filter((_, j) => j !== i))}>×</button>
              </div>
              <input className="input" placeholder={t(lang, 'Efeito (ex.: SAL DES; cai no fosso)', 'Effect (e.g. DEX save; falls into the pit)')} value={h.effect || ''} maxLength={1000}
                onChange={e => upd({ effect: e.target.value })} aria-label={t(lang, 'Efeito', 'Effect')} />
            </div>
          );
        })}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList('hazards', [...(node.hazards || []), { name: '', dc: 13, effect: '', damage: '' }])}>+ {t(lang, 'Perigo', 'Hazard')}</button>
      </section>

      {/* ----- Testes sugeridos ----- */}
      <section className="prep-section">
        <header><h4>🎲 {t(lang, 'Testes sugeridos', 'Suggested checks')}</h4></header>
        {(node.checks || []).map((c, i) => {
          const upd = (patch) => setList('checks', node.checks.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="adv-row wrap">
              <select className="input" value={c.skill} onChange={e => upd({ skill: e.target.value })} aria-label={t(lang, 'Perícia', 'Skill')}>
                {SRD.SKILLS.map(s => <option key={s.id} value={s.id}>{tName('skill', s.id, lang)}</option>)}
                {SAVE_KEYS.map(k => <option key={k} value={`save:${k}`}>{checkText(`save:${k}`, lang)}</option>)}
              </select>
              <input type="number" className="input prep-num" min={1} max={40} placeholder={t(lang, 'CD', 'DC')} value={c.dc ?? ''} aria-label={t(lang, 'CD', 'DC')}
                onChange={e => upd({ dc: e.target.value === '' ? null : parseInt(e.target.value, 10) })} />
              <input className="input grow" placeholder={t(lang, 'O que revela', 'What it reveals')} value={c.note || ''} maxLength={300} onChange={e => upd({ note: e.target.value })} aria-label={t(lang, 'Nota', 'Note')} />
              <button type="button" className="btn btn-ghost btn-icon danger" aria-label={t(lang, 'Remover', 'Remove')} onClick={() => setList('checks', node.checks.filter((_, j) => j !== i))}>×</button>
            </div>
          );
        })}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList('checks', [...(node.checks || []), { skill: 'perception', dc: 13, note: '' }])}>+ {t(lang, 'Teste', 'Check')}</button>
      </section>

      {/* ----- Tesouro ----- */}
      <section className="prep-section">
        <header><h4>💰 {t(lang, 'Tesouro', 'Treasure')}</h4></header>
        {(node.treasure?.items || []).map((it, i) => (
          <div key={it.id || i} className="adv-row">
            <input type="number" className="input prep-num" min={1} max={999} value={it.qty || 1} aria-label={t(lang, 'Quantidade', 'Qty')}
              onChange={e => set({ treasure: { ...node.treasure, items: node.treasure.items.map((x, j) => (j === i ? { ...x, qty: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)) } })} />
            <span className="grow">× {it.name}</span>
            <button type="button" className="btn btn-ghost btn-icon danger" aria-label={t(lang, 'Remover', 'Remove')}
              onClick={() => set({ treasure: { ...node.treasure, items: node.treasure.items.filter((_, j) => j !== i) } })}>×</button>
          </div>
        ))}
        <div className="prep-coins">
          {COINS.map(c => (
            <label key={c}>
              <input type="number" className="input" min={0} value={node.treasure?.coins?.[c] || ''} placeholder="0"
                onChange={e => set({ treasure: { items: node.treasure?.items || [], coins: { ...(node.treasure?.coins || {}), [c]: Math.max(0, parseInt(e.target.value, 10) || 0) } } })} />
              <span>{COIN_LABEL[c][lang] || c}</span>
            </label>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicker('item')}>+ {t(lang, 'Item', 'Item')}</button>
      </section>

      {/* ----- Imagem ----- */}
      <section className="prep-section">
        <header><h4>🖼 {t(lang, 'Imagem / mapa', 'Image / map')}</h4></header>
        {node.image && <img className="prep-image" src={node.image} alt={t(lang, `Imagem de ${node.name}`, `Image of ${node.name}`)} />}
        <div className="adv-row">
          <label className="btn btn-ghost btn-sm">
            {node.image ? t(lang, 'Trocar imagem', 'Replace image') : t(lang, 'Enviar imagem', 'Upload image')}
            <input type="file" accept="image/*" onChange={onImage} hidden />
          </label>
          {node.image && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ image: '' })}>{t(lang, 'Remover', 'Remove')}</button>}
        </div>
        {imgError && <p className="prep-error">{imgError}</p>}
      </section>

      {/* ----- Conexões ----- */}
      <section className="prep-section">
        <header><h4>↔ {t(lang, 'Conexões', 'Connections')}</h4></header>
        {edges.length === 0 && <p className="muted small">{t(lang, 'Nenhuma ainda. Puxe o ● no mapa ou use abaixo.', 'None yet. Pull the ● on the map or use below.')}</p>}
        {edges.map(e => (
          <button type="button" key={e.id} className="prep-link-row" onClick={() => onSelectEdge(e.id)}>
            <span>{e.from === node.id ? '→' : '←'}</span>
            <span className="grow">{e.to ? nameOf(e.from === node.id ? e.to : e.from) : `↗ ${e.toAdventureName || t(lang, 'outra aventura', 'another adventure')}`}</span>
            <span className="muted small">{edgeKindLabel(e.kind, lang)}{e.label ? ` · ${e.label}` : ''}{e.oneWay ? t(lang, ' · só ida', ' · one-way') : ''}</span>
          </button>
        ))}
        <div className="adv-row wrap">
          <select className="input grow" value={linkTo} onChange={e => setLinkTo(e.target.value)} aria-label={t(lang, 'Conectar a', 'Connect to')}>
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
          <button type="button" className="btn btn-ghost btn-sm" disabled={!linkTo} onClick={addLink}>{t(lang, 'Conectar', 'Connect')}</button>
        </div>
      </section>

      <div className="prep-editor-foot">
        <button type="button" className="btn btn-ghost btn-sm danger" onClick={onDelete}>🗑 {t(lang, 'Apagar sala', 'Delete room')}</button>
      </div>

      {picker === 'monster' && (
        <MonsterPicker lang={lang} levelingMode={campaign.state?.levelingMode || 'milestone'} showInitiative={false}
          confirmLabel={t(lang, 'Adicionar ao encontro', 'Add to encounter')}
          onClose={() => setPicker(null)}
          onPick={(monster, count) => {
            setList('encounter', [...(node.encounter || []), encounterEntry(monster, count, lang)].slice(0, 30));
            setPicker(null);
          }} />
      )}
      {picker === 'item' && (
        <ItemPickerModal lang={lang} title={`💰 ${t(lang, 'Tesouro de', 'Treasure of')} ${node.name}`}
          confirmLabel={t(lang, 'Adicionar', 'Add')}
          campaignItems={campaignItems}
          onClose={() => setPicker(null)}
          onPick={async (instance) => {
            set({ treasure: { coins: node.treasure?.coins || {}, items: [...(node.treasure?.items || []), instance].slice(0, 40) } });
          }} />
      )}
    </div>
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
