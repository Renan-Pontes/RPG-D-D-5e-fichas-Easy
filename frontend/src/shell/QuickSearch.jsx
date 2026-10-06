// 🔍 Busca rápida (Ctrl+K): Mundo, membros, aventuras, itens da campanha e monstros.
// Escolher um resultado navega com goTo (abre o cartão no Mundo, a aventura na
// Preparação etc.). Tudo local depois do primeiro carregamento: resposta imediata.
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { listWorld } from '../world/world-api.js';
import { kindIcon, kindLabel } from '../world/world-model.js';
import { searchItems, t } from './shell-logic.js';

const KIND_ORDER = ['npc', 'place', 'faction', 'item', 'lore', 'handout', 'member', 'adventure', 'citem', 'monster'];

function monsterName(m, lang) {
  if (!m) return '';
  if (typeof m.name === 'string') return m.name;
  return (lang === 'en' ? m.name?.en : m.name?.pt) || m.name?.en || m.name?.pt || m.id;
}

export default function QuickSearch({ campaign, lang, isDM, onClose, onPick, initialWorld = null }) {
  const [q, setQ] = useState('');
  const [world, setWorld] = useState(initialWorld || []);
  const [adventures, setAdventures] = useState([]);
  const [items, setItems] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Carrega as fontes em paralelo (cada uma falha sozinha sem quebrar a busca).
  useEffect(() => {
    let alive = true;
    listWorld(campaign.id).then(r => { if (alive) setWorld(r.entries || []); }).catch(() => {});
    if (isDM) {
      api.listAdventures(campaign.id).then(r => { if (alive) setAdventures(r.adventures || []); }).catch(() => {});
      api.campaignItems(campaign.id).then(r => { if (alive) setItems(r.items || []); }).catch(() => {});
      import('../../data/bestiary.js').then(m => { if (alive) setMonsters(m.BESTIARY || []); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [campaign.id, isDM]);

  const index = useMemo(() => {
    const out = [];
    for (const e of world) {
      out.push({
        id: `w${e.id}`, kind: e.kind, label: e.name, keywords: [e.summary, ...(e.tags || [])].filter(Boolean).join(' '),
        sub: [kindLabel(e.kind, lang), e.summary].filter(Boolean).join(' · '), icon: kindIcon(e.kind),
        go: ['world', 'atlas', { entryId: e.id }], entry: e,
      });
    }
    for (const m of campaign.members || []) {
      const name = m.character?.name || m.user?.displayName;
      if (!name) continue;
      out.push({
        id: `m${m.id}`, kind: 'member', label: name, keywords: m.user?.displayName || '',
        sub: m.role === 'dm' ? t(lang, 'Mestre', 'DM') : [t(lang, 'Jogador', 'Player'), m.character ? m.user?.displayName : null].filter(Boolean).join(' · '),
        icon: '🛡️', go: isDM ? ['group', 'players', { membershipId: m.id }] : ['group', null, { membershipId: m.id }],
      });
    }
    for (const a of adventures) {
      out.push({ id: `a${a.id}`, kind: 'adventure', label: a.name, keywords: a.summary || '', sub: t(lang, 'Aventura', 'Adventure'), icon: '🧭', go: ['prepare', 'adventures', { adventureId: a.id }] });
    }
    for (const it of items) {
      const name = it.item?.name;
      const label = typeof name === 'string' ? name : (lang === 'en' ? name?.en : name?.pt) || name?.en;
      if (!label) continue;
      out.push({ id: `i${it.id}`, kind: 'citem', label, sub: t(lang, 'Item da campanha', 'Campaign item'), icon: '💰', go: ['prepare', 'items', { itemId: it.id }] });
    }
    for (const m of monsters) {
      const label = monsterName(m, lang);
      const other = typeof m.name === 'object' ? (lang === 'en' ? m.name?.pt : m.name?.en) : '';
      out.push({ id: `x${m.id}`, kind: 'monster', label, keywords: other || '', sub: `${t(lang, 'Monstro', 'Monster')} · ${t(lang, 'ND', 'CR')} ${m.cr ?? '?'}`, icon: '🐉', go: ['play', 'combat', { monsterId: m.id }] });
    }
    return out;
  }, [world, adventures, items, monsters, campaign.members, lang, isDM]);

  const results = useMemo(() => searchItems(index, q, { limit: 30, kindOrder: KIND_ORDER }), [index, q]);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [sel]);

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); onPick(results[sel]); }
  };

  return (
    <div className="modal-backdrop shell-search-backdrop" onClick={onClose}>
      <div className="shell-search" role="dialog" aria-modal="true" aria-label={t(lang, 'Buscar', 'Search')} onClick={(e) => e.stopPropagation()}>
        <div className="shell-search-bar">
          <span aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            className="shell-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={isDM
              ? t(lang, 'Buscar NPC, lugar, jogador, aventura, item, monstro…', 'Search NPC, place, player, adventure, item, monster…')
              : t(lang, 'Buscar no mundo e no grupo…', 'Search the world and party…')}
            aria-label={t(lang, 'Buscar', 'Search')}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="shell-search-list"
            aria-activedescendant={results[sel] ? `qs-${results[sel].id}` : undefined}
          />
          <kbd className="shell-search-esc">Esc</kbd>
        </div>
        <ul className="shell-search-list" id="shell-search-list" role="listbox" ref={listRef}>
          {q && results.length === 0 && (
            <li className="shell-search-empty muted">{t(lang, 'Nada encontrado. Tente outra palavra.', 'Nothing found. Try another word.')}</li>
          )}
          {!q && (
            <li className="shell-search-empty muted">{t(lang, 'Digite um nome. ↑↓ para escolher, Enter para abrir.', 'Type a name. ↑↓ to choose, Enter to open.')}</li>
          )}
          {results.map((r, i) => (
            <li key={r.id} id={`qs-${r.id}`} role="option" aria-selected={i === sel}
              className={`shell-search-item ${i === sel ? 'active' : ''}`}
              onMouseEnter={() => setSel(i)} onClick={() => onPick(r)}>
              <span className="shell-search-ico" aria-hidden="true">{r.icon}</span>
              <span className="shell-search-text">
                <strong>{r.label}</strong>
                {r.sub && <span className="muted text-xs">{r.sub}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
