/* Formulário de cadastro de item (mesmo formato de data/items.js).
 * Usado pelo mestre (catálogo da campanha) e pelo jogador (ficha pessoal). */
import { useState } from 'react';
import { ITEM_TYPES } from '../../data/items.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

const TYPE_LABEL = {
  weapon: ['Arma', 'Weapon'], armor: ['Armadura', 'Armor'], shield: ['Escudo', 'Shield'],
  gear: ['Equipamento', 'Gear'], potion: ['Poção', 'Potion'], magic: ['Item mágico', 'Magic item'],
};
const RARITIES = [
  ['common', 'Comum', 'Common'], ['uncommon', 'Incomum', 'Uncommon'], ['rare', 'Raro', 'Rare'],
  ['very rare', 'Muito raro', 'Very rare'], ['legendary', 'Lendário', 'Legendary'], ['artifact', 'Artefato', 'Artifact'],
];
const DMG_TYPES = ['bludgeoning', 'piercing', 'slashing', 'acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'];

export const typeLabel = (type, lang) => (TYPE_LABEL[type] || [type, type])[lang === 'pt' ? 0 : 1];

const text = (v, lang) => (typeof v === 'string' ? v : v?.[lang] || v?.en || v?.pt || '');

// Converte um item salvo em estado do formulário.
const toForm = (item, lang) => ({
  name: item?.name ? text(item.name, lang) : '',
  type: item?.type || 'gear',
  weight: item?.weight ?? '',
  cost: item?.cost ?? '',
  description: text(item?.description, lang),
  damage: item?.weapon?.damage || '',
  dmgType: item?.weapon?.dmgType || 'slashing',
  props: (item?.weapon?.props || []).join(', '),
  ac: item?.armor?.ac ?? '',
  armorType: item?.armor?.type || (item?.type === 'shield' ? 'shield' : 'light'),
  isMagic: !!item?.magic || item?.type === 'magic',
  rarity: item?.magic?.rarity || 'uncommon',
  attunement: !!item?.magic?.attunement,
  effect: text(item?.magic?.effect, lang),
});

// Estado do formulário → item (só inclui os blocos preenchidos).
export const formToItem = (f) => {
  const both = (s) => (s.trim() ? { pt: s.trim(), en: s.trim() } : undefined);
  const item = { name: f.name.trim(), type: f.type };
  if (f.weight !== '' && +f.weight >= 0) item.weight = +f.weight;
  if (f.cost !== '' && +f.cost >= 0) item.cost = +f.cost;
  if (both(f.description)) item.description = both(f.description);
  if (f.type === 'weapon' && f.damage.trim()) {
    item.weapon = { damage: f.damage.trim(), dmgType: f.dmgType, props: f.props.split(',').map(p => p.trim()).filter(Boolean) };
  }
  if ((f.type === 'armor' || f.type === 'shield') && f.ac !== '') {
    item.armor = { ac: Math.max(0, Math.min(30, parseInt(f.ac) || 0)), type: f.type === 'shield' ? 'shield' : f.armorType };
  }
  if (f.isMagic || f.type === 'magic') {
    item.magic = { rarity: f.rarity, attunement: f.attunement, effect: both(f.effect) || {} };
  }
  return item;
};

export default function ItemForm({ lang, initial, submitLabel, onSubmit, onCancel, extra }) {
  const [f, setF] = useState(() => toForm(initial, lang));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF(prev => ({ ...prev, ...patch }));

  const submit = async () => {
    if (!f.name.trim()) { setError(t(lang, 'Nome obrigatório', 'Name required')); return; }
    if (f.type === 'weapon' && !/^\d+d\d+([+-]\d+)?$/i.test(f.damage.trim())) {
      setError(t(lang, 'Dano no formato 1d8 (ou 2d6+1)', 'Damage like 1d8 (or 2d6+1)')); return;
    }
    setError(''); setBusy(true);
    try { await onSubmit(formToItem(f)); }
    catch (e) { setError(e?.data?.error || e?.message || 'failed'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="row gap-2">
        <div style={{ flex: 2 }}>
          <label>{t(lang, 'Nome', 'Name')}</label>
          <input value={f.name} maxLength={120} onChange={e => set({ name: e.target.value })} autoFocus />
        </div>
        <div style={{ flex: 1 }}>
          <label>{t(lang, 'Tipo', 'Type')}</label>
          <select value={f.type} onChange={e => set({ type: e.target.value })}>
            {ITEM_TYPES.map(ty => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
          </select>
        </div>
      </div>

      {f.type === 'weapon' && (
        <div className="row gap-2">
          <div style={{ flex: 1 }}>
            <label>{t(lang, 'Dano', 'Damage')}</label>
            <input value={f.damage} placeholder="1d8" onChange={e => set({ damage: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label>{t(lang, 'Tipo de dano', 'Damage type')}</label>
            <select value={f.dmgType} onChange={e => set({ dmgType: e.target.value })}>
              {DMG_TYPES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label>{t(lang, 'Propriedades', 'Properties')}</label>
            <input value={f.props} placeholder="finesse, light" onChange={e => set({ props: e.target.value })} />
          </div>
        </div>
      )}

      {(f.type === 'armor' || f.type === 'shield') && (
        <div className="row gap-2">
          <div style={{ flex: 1 }}>
            <label>{f.type === 'shield' ? t(lang, 'Bônus de CA', 'AC bonus') : 'CA'}</label>
            <input type="number" min="0" max="30" value={f.ac} onChange={e => set({ ac: e.target.value })} />
          </div>
          {f.type === 'armor' && (
            <div style={{ flex: 1 }}>
              <label>{t(lang, 'Categoria', 'Category')}</label>
              <select value={f.armorType} onChange={e => set({ armorType: e.target.value })}>
                <option value="light">{t(lang, 'Leve', 'Light')}</option>
                <option value="medium">{t(lang, 'Média', 'Medium')}</option>
                <option value="heavy">{t(lang, 'Pesada', 'Heavy')}</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="row gap-2">
        <div style={{ flex: 1 }}>
          <label>{t(lang, 'Peso (lb)', 'Weight (lb)')}</label>
          <input type="number" min="0" step="0.1" value={f.weight} onChange={e => set({ weight: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <label>{t(lang, 'Preço (PO)', 'Cost (GP)')}</label>
          <input type="number" min="0" step="0.01" value={f.cost} onChange={e => set({ cost: e.target.value })} />
        </div>
      </div>

      {f.type !== 'magic' && (
        <label className="row gap-2" style={{ alignItems: 'center', margin: 0 }}>
          <input type="checkbox" checked={f.isMagic} onChange={e => set({ isMagic: e.target.checked })} style={{ width: 'auto', minHeight: 'auto' }} />
          {t(lang, 'É mágico', 'Is magical')}
        </label>
      )}
      {(f.isMagic || f.type === 'magic') && (
        <>
          <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label>{t(lang, 'Raridade', 'Rarity')}</label>
              <select value={f.rarity} onChange={e => set({ rarity: e.target.value })}>
                {RARITIES.map(([id, pt, en]) => <option key={id} value={id}>{lang === 'pt' ? pt : en}</option>)}
              </select>
            </div>
            <label className="row gap-2" style={{ flex: 1, alignItems: 'center', margin: 0 }}>
              <input type="checkbox" checked={f.attunement} onChange={e => set({ attunement: e.target.checked })} style={{ width: 'auto', minHeight: 'auto' }} />
              {t(lang, 'Exige sintonia', 'Requires attunement')}
            </label>
          </div>
          <div>
            <label>{t(lang, 'Efeito mágico', 'Magic effect')}</label>
            <textarea rows={2} value={f.effect} onChange={e => set({ effect: e.target.value })} />
          </div>
        </>
      )}

      <div>
        <label>{t(lang, 'Descrição', 'Description')}</label>
        <textarea rows={2} value={f.description} onChange={e => set({ description: e.target.value })} />
      </div>

      {extra}
      {error && <div className="text-sm" style={{ color: 'var(--blood-bright)' }}>{error}</div>}
      <div className="row gap-2">
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>{t(lang, 'Cancelar', 'Cancel')}</button>}
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>{busy ? '…' : submitLabel}</button>
      </div>
    </div>
  );
}
