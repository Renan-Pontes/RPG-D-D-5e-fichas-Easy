/* Formulário de cadastro de item (mesmo formato de data/items.js).
 * Usado pelo mestre (catálogo da campanha) e pelo jogador (ficha pessoal).
 * `sheet`: dentro de uma folha da mesa (MesaSheet) — campos quebram em linhas no
 * celular (o select Tipo mostra "Equipamento" inteiro), alvos de 44 e a fileira
 * Cancelar / Salvar presa no pé da folha. Sem `sheet`, o desenho de sempre. */
import { errorMessage } from '../api/errors.js';
import { useState } from 'react';
import { ITEM_TYPES } from '../../data/items.js';
import { DAMAGE_TYPES } from '../combat/monster-i18n.js';
import {
  RARITIES, WEAPON_PROPS, dmgTypeLabel, formToItem, formWeightLb, toForm, typeLabel, weaponPropLabel,
} from './item-model.js';
import './items-styles.css';

// Reexporta os rótulos para quem já importava daqui.
export { dmgTypeLabel, formToItem, rarityLabel, typeLabel, weaponPropLabel, weightLabel } from './item-model.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);


export default function ItemForm({ lang, initial, submitLabel, onSubmit, onCancel, extra, sheet = false }) {
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
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className={`item-form ${sheet ? 'is-sheet' : ''}`.trim()}>
      <div className="row gap-2 item-form-row">
        <div className="item-form-f2">
          <label>{t(lang, 'Nome', 'Name')}</label>
          <input aria-label={t(lang, 'Nome', 'Name')} value={f.name} maxLength={120} onChange={e => set({ name: e.target.value })} autoFocus />
        </div>
        <div className="item-form-f1">
          <label>{t(lang, 'Tipo', 'Type')}</label>
          <select aria-label={t(lang, 'Tipo', 'Type')} value={f.type} onChange={e => set({ type: e.target.value })}>
            {ITEM_TYPES.map(ty => <option key={ty} value={ty}>{typeLabel(ty, lang)}</option>)}
          </select>
        </div>
      </div>

      {f.type === 'weapon' && (
        <div className="row gap-2 item-form-row">
          <div className="item-form-f1">
            <label>{t(lang, 'Dano', 'Damage')}</label>
            <input aria-label={t(lang, 'Dano', 'Damage')} value={f.damage} placeholder="1d8" onChange={e => set({ damage: e.target.value })} />
          </div>
          <div className="item-form-f1">
            <label>{t(lang, 'Tipo de dano', 'Damage type')}</label>
            <select aria-label={t(lang, 'Tipo de dano', 'Damage type')} value={f.dmgType} onChange={e => set({ dmgType: e.target.value })}>
              {DAMAGE_TYPES.map(d => <option key={d} value={d}>{dmgTypeLabel(d, lang)}</option>)}
            </select>
          </div>
        </div>
      )}
      {f.type === 'weapon' && (
        <div>
          <label>{t(lang, 'Propriedades', 'Properties')}</label>
          <div className="row gap-2 item-form-props" role="group" aria-label={t(lang, 'Propriedades', 'Properties')} style={{ flexWrap: 'wrap' }}>
            {WEAPON_PROPS.map(p => {
              const on = f.props.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on} className={sheet ? 'mesa-chip' : `btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => set({ props: on ? f.props.filter(x => x !== p) : [...f.props, p] })}>
                  {weaponPropLabel(p, lang)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(f.type === 'armor' || f.type === 'shield') && (
        <div className="row gap-2 item-form-row">
          <div className="item-form-f1">
            <label>{f.type === 'shield' ? t(lang, 'Bônus de CA', 'AC bonus') : 'CA'}</label>
            <input aria-label={f.type === 'shield' ? t(lang, 'Bônus de CA', 'AC bonus') : 'CA'} type="number" min="0" max="30" value={f.ac} onChange={e => set({ ac: e.target.value })} />
          </div>
          {f.type === 'armor' && (
            <div className="item-form-f1">
              <label>{t(lang, 'Categoria', 'Category')}</label>
              <select aria-label={t(lang, 'Categoria', 'Category')} value={f.armorType} onChange={e => set({ armorType: e.target.value })}>
                <option value="light">{t(lang, 'Leve', 'Light')}</option>
                <option value="medium">{t(lang, 'Média', 'Medium')}</option>
                <option value="heavy">{t(lang, 'Pesada', 'Heavy')}</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="row gap-2 item-form-row">
        <div className="item-form-f1">
          <label>{t(lang, 'Peso (kg)', 'Weight (lb)')}</label>
          <input aria-label={t(lang, 'Peso (kg)', 'Weight (lb)')} type="number" min="0" step="0.1" inputMode="decimal" value={f.weight} onChange={e => set({ weight: e.target.value })} />
          {lang === 'pt' && f.weight !== '' && formWeightLb(f) > 0 && <div className="muted small">≈ {String(formWeightLb(f)).replace('.', ',')} lb</div>}
        </div>
        <div className="item-form-f1">
          <label>{t(lang, 'Preço (PO)', 'Cost (GP)')}</label>
          <input aria-label={t(lang, 'Preço (PO)', 'Cost (GP)')} type="number" min="0" step="0.01" value={f.cost} onChange={e => set({ cost: e.target.value })} />
        </div>
      </div>

      {f.type !== 'magic' && (
        <label className="row gap-2 item-form-check" style={{ alignItems: 'center', margin: 0 }}>
          <input type="checkbox" checked={f.isMagic} onChange={e => set({ isMagic: e.target.checked })} style={{ width: 'auto', minHeight: 'auto' }} />
          {t(lang, 'É mágico', 'Is magical')}
        </label>
      )}
      {(f.isMagic || f.type === 'magic') && (
        <>
          <div className="row gap-2 item-form-row" style={{ alignItems: 'flex-end' }}>
            <div className="item-form-f1">
              <label>{t(lang, 'Raridade', 'Rarity')}</label>
              <select aria-label={t(lang, 'Raridade', 'Rarity')} value={f.rarity} onChange={e => set({ rarity: e.target.value })}>
                {RARITIES.map(([id, pt, en]) => <option key={id} value={id}>{lang === 'pt' ? pt : en}</option>)}
              </select>
            </div>
            <label className="row gap-2 item-form-f1 item-form-check" style={{ alignItems: 'center', margin: 0 }}>
              <input type="checkbox" checked={f.attunement} onChange={e => set({ attunement: e.target.checked })} style={{ width: 'auto', minHeight: 'auto' }} />
              {t(lang, 'Exige sintonia', 'Requires attunement')}
            </label>
          </div>
          <div>
            <label>{t(lang, 'Efeito mágico', 'Magic effect')}</label>
            <textarea aria-label={t(lang, 'Efeito mágico', 'Magic effect')} rows={2} value={f.effect} onChange={e => set({ effect: e.target.value })} />
          </div>
        </>
      )}

      <div>
        <label>{t(lang, 'Descrição', 'Description')}</label>
        <textarea aria-label={t(lang, 'Descrição', 'Description')} rows={2} value={f.description} onChange={e => set({ description: e.target.value })} />
      </div>

      {extra}
      <div className="item-form-actions">
        {error && <div className="text-sm item-form-error" role={sheet ? 'alert' : undefined} style={{ color: 'var(--blood-bright)' }}>{error}</div>}
        <div className="row gap-2 item-form-btns">
          {onCancel && <button type="button" className={sheet ? 'mesa-btn' : 'btn btn-ghost'} onClick={onCancel}>{t(lang, 'Cancelar', 'Cancel')}</button>}
          <button type="button" className={sheet ? 'mesa-btn mesa-btn-lg is-primary' : 'btn btn-primary'} style={{ flex: 1 }} onClick={submit} disabled={busy}>{busy ? '…' : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}
