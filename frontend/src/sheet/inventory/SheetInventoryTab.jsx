import { useId, useState, useRef, } from 'react';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { ITEMS, ITEMS_BY_ID } from '../../../data/items.js';
import { CLASS_START, BACKGROUND_START, TOOLS } from '../../creator/start-data.js';
import { PACK_GEAR } from '../../../data/equipment-packs.js';
import { armorTypeLabel } from '../../creator/equipment-helpers.js';
import * as FS from '../../progression/fighting-styles.js';
import { itemArtFor } from '../../items/item-art.js';
import ArtThumb from '../../components/ArtThumb.jsx';
import FhTitle from '../FhTitle.jsx';
import FhAdv3 from '../FhAdv3.jsx';
import FhFeatures from '../FhFeatures.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { undoRemoval } from '../sheet-undo-helpers.js';
import { COIN_LABEL, COIN_NAME, WEAPON_GROUP, propsText, InventoryList } from './InventoryList.jsx';
export const CoinInput = ({ value, onCommit, label }) => {
  const [draft, setDraft] = useState(null);
  const fresh = useRef(false); // acabou de ganhar foco: o clique que focou não desfaz a seleção
  // "+10" soma e "-5" gasta sobre o valor atual (pagar 5 PO sem fazer a conta de cabeça);
  // número sem sinal continua sendo o valor novo. Nunca fica negativo.
  const commit = () => {
    if (draft == null) return;
    const txt = String(draft).trim();
    const signed = /^[+\-−]\d+$/.test(txt);
    const num = Math.floor(+txt.replace(/^[+\-−]/, '').replace(',', '.')) || 0;
    const n = Math.max(0, signed ? (value || 0) + (txt[0] === '+' ? num : -num) : num);
    setDraft(null);
    if (n !== (value || 0)) onCommit(n);
  };
  return (
    <input
      type="text" inputMode="numeric" autoComplete="off"
      value={draft != null ? draft : String(value || 0)}
      aria-label={label}
      onFocus={e => { setDraft(String(value || 0)); fresh.current = true; const el = e.target; requestAnimationFrame(() => { try { el.select(); } catch { /* campo já saiu */ } }); }}
      onMouseUp={e => { if (fresh.current) { fresh.current = false; e.preventDefault(); e.currentTarget.select(); } }}
      onChange={e => { const v = e.target.value; const sign = (v.match(/^[+\-−]/) || [''])[0]; setDraft(sign + v.replace(/[^0-9]/g, '').slice(0, 9)); }}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); } }}
    />
  );
};

// Nome mostrado de uma arma / item que veio do catálogo: a ficha guarda o nome no idioma em
// que foi criada ("Bordão ×2"); se ele ainda é o nome do catálogo (não foi renomeado), a
// tela mostra o nome no idioma atual. Nome próprio dado pelo jogador fica como está.
const QTY_TAIL = /\s*[×x]\s*\d+\s*$/;
const sameName = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
export const weaponShownName = (w, lang) => {
  const name = w?.name || '';
  if (!w?.id || !name) return name;
  const tail = (name.match(QTY_TAIL) || [''])[0];
  const bare = name.replace(QTY_TAIL, '');
  const pt = tName('weapon', w.id, 'pt'); const en = tName('weapon', w.id, 'en');
  if (!sameName(bare, pt) && !sameName(bare, en)) return name;
  const now = tName('weapon', w.id, lang);
  return now && now !== w.id ? `${now}${tail}` : name;
};
let ITEM_NAME_INDEX = null;
const itemNameIndex = () => {
  if (ITEM_NAME_INDEX) return ITEM_NAME_INDEX;
  ITEM_NAME_INDEX = new Map();
  const add = (name) => {
    for (const k of ['pt', 'en']) { const key = String(name[k] || '').trim().toLowerCase(); if (key && !ITEM_NAME_INDEX.has(key)) ITEM_NAME_INDEX.set(key, name); }
  };
  for (const it of ITEMS) if (it?.name && typeof it.name === 'object') add(it.name);
  // equipamento inicial das classes e antecedentes, pacotes e ferramentas: os nomes que as
  // fichas prontas e a criação gravam ("Túnica", "Grimório", "Pacote de Erudito"…)
  const walk = (v, depth = 0) => {
    if (!v || typeof v !== 'object' || depth > 8) return;
    if (typeof v.pt === 'string' && typeof v.en === 'string') { add(v); return; }
    for (const x of (Array.isArray(v) ? v : Object.values(v))) walk(x, depth + 1);
  };
  try { walk(CLASS_START); walk(BACKGROUND_START); walk(PACK_GEAR); walk(TOOLS); } catch { /* tabela ausente: fica o nome gravado */ }
  return ITEM_NAME_INDEX;
};
export const itemShownName = (item, lang) => {
  const name = item?.name || '';
  if (!name || typeof name !== 'string') return name;
  const byId = item.sourceId && ITEMS_BY_ID[item.sourceId]?.name;
  if (byId && typeof byId === 'object') return (sameName(name, byId.pt) || sameName(name, byId.en)) ? (byId[lang] || name) : name;
  if (item.sourceId) return name;   // item da campanha / criado pelo jogador: nome próprio
  const hit = itemNameIndex().get(name.trim().toLowerCase());
  return hit?.[lang] || name;
};

// Cartão da arma (src/sheet/ficha-tabs.css: .fh-wpn): por padrão é LEITURA (miniatura, nome,
// dano e tipo, ATAQUE / DANO); o lápis abre os três campos, cada um com rótulo visível.
// Antes os campos ficavam sempre abertos e um toque perdido no nome mudava a regra da arma.
export const WeaponCard = ({ w, char, lang, roll, locked, onPatch, onRemove }) => {
  const pt = lang === 'pt';
  const [editing, setEditing] = useState(!w.name && !locked);
  const formId = useId();
  const wDef = w.id ? SRD.weaponFor(w.id, char.rulesVersion) : null;
  // Regra da ficha: proficiência, Artes Marciais do Monge e Estilos de Luta.
  const a = Utils.attackFor(char, w);
  const fs = a.fs;
  const atk = a.bonus;
  const dmgMod = a.dmgMod;
  const atkLabel = t('attackRoll', lang);
  const dmgLabel = t('damageRoll', lang);
  const shown = weaponShownName(w, lang) || (pt ? 'Arma sem nome' : 'Unnamed weapon');
  const typeText = w.dmgType ? Utils.damageLabel(w.dmgType, lang) : '';
  return (
    <div className={`card fh-wpn${editing ? ' is-editing' : ''}${w.fromItem ? ' is-from-item' : ''}`}>
      <div className="fh-wpn-top">
        <ArtThumb src={itemArtFor(w)} emoji={<Icon name="sword" size={20} />} size={44} lang={lang} className="fh-glyph-thumb" />
        <div className="fh-wpn-id">
          <span className={`fh-wpn-title${w.name ? '' : ' is-unnamed'}`}>{shown}</span>
          <span className="fh-wpn-sub">{[w.damage, typeText].filter(Boolean).join(' ') || (pt ? 'sem dano definido' : 'no damage set')}</span>
          {/* arma que vem de um item equipado: só leitura aqui (muda pelo item, em Equipamento) */}
          {w.fromItem && (
            <span className="fh-wpn-from" title={pt ? 'Vem de um item equipado no Equipamento. Para tirar, desequipe o item.' : 'Comes from an item equipped under Equipment. Unequip the item to remove it.'}>
              <Icon name="check" size={11} aria-hidden="true" /> {pt ? 'do inventário (equipada)' : 'from inventory (equipped)'}
            </span>
          )}
        </div>
        {!locked && (
          <button type="button" className="btn btn-icon btn-ghost fh-wpn-edit" aria-expanded={editing} aria-controls={formId}
            onClick={() => setEditing(e => !e)}
            aria-label={editing ? (pt ? `Fechar edição de ${shown}` : `Close editing ${shown}`) : (pt ? `Editar ${shown}` : `Edit ${shown}`)}
            title={editing ? (pt ? 'Fechar edição' : 'Close editing') : (pt ? 'Editar arma' : 'Edit weapon')}>
            <Icon name={editing ? 'check' : 'edit'} size={16} />
          </button>
        )}
      </div>
      {editing && !locked && (
        <div className="fh-wpn-form" id={formId}>
          <label className="fh-mini is-wide">
            <span>{pt ? 'Nome' : 'Name'}</span>
            <input className="fh-wpn-name" aria-label={pt ? 'Nome da arma' : 'Weapon name'} value={w.name || ''} onChange={e => onPatch({ name: e.target.value })} />
          </label>
          <label className="fh-mini">
            <span>{pt ? 'Dano' : 'Damage'}</span>
            <input className="fh-wpn-dmg" aria-label={pt ? 'Dano da arma' : 'Weapon damage'} value={w.damage || ''} onChange={e => onPatch({ damage: e.target.value })} placeholder="1d8" />
          </label>
          <label className="fh-mini">
            <span>{pt ? 'Tipo de dano' : 'Damage type'}</span>
            <input className="fh-wpn-type" aria-label={pt ? 'Tipo de dano da arma' : 'Weapon damage type'} value={typeText} onChange={e => onPatch({ dmgType: e.target.value })} placeholder={pt ? 'cortante' : 'slashing'} />
          </label>
          <button type="button" className="btn btn-sm btn-ghost btn-danger fh-wpn-del" onClick={onRemove}>
            <Icon name="trash" size={14} /> {pt ? 'Remover arma' : 'Remove weapon'}
          </button>
        </div>
      )}
      <div className="fh-wpn-rolls">
        <button type="button" className="fh-atk-btn is-hit" aria-label={`${shown}: ${atkLabel} ${Utils.fmtMod(atk)}`}
          onClick={() => roll({ die: 20, mod: atk, label: shown + ' ' + t('attackRoll', lang) })}>
          <span className="fh-atk-btn-k">{atkLabel}</span>
          <span className="fh-atk-btn-v">{Utils.fmtMod(atk)}</span>
        </button>
        <button type="button" className="fh-atk-btn is-dmg" aria-label={`${shown}: ${dmgLabel} ${a.damage}`} onClick={() => {
          const m = String(a.dice || '').match(/(\d+)d(\d+)/);
          if (m) roll({ die: +m[2], count: +m[1], mod: dmgMod, label: shown + ' ' + t('damageRoll', lang) });
        }}>
          <span className="fh-atk-btn-k">{dmgLabel}</span>
          <span className="fh-atk-btn-v">{a.damage}</span>
        </button>
      </div>
      {((wDef && wDef.props && wDef.props.length > 0) || fs.attackParts.length > 0 || fs.damageParts.length > 0 || fs.mastery || fs.notes.length > 0 || a.monk || a.magic || a.assumed || !a.proficient) && (
        <div className="fh-atk-notes fh-wpn-notes">
          {/* o mesmo aviso da linha de ataque da aba Jogar: explica por que o bônus é menor */}
          {!a.proficient && <div className="fh-atk-note is-warn">{pt ? 'Sem proficiência: não soma o bônus de proficiência' : 'Not proficient: no proficiency bonus'}</div>}
          {a.magic ? <div className="fh-atk-note is-gold">{pt ? `Item mágico: ${Utils.fmtMod(a.magic)} no ataque e no dano` : `Magic item: ${Utils.fmtMod(a.magic)} to attack and damage`}</div> : null}
          {a.assumed && (
            <div className="fh-atk-note">
              {pt
                ? `Arma fora do catálogo: o ataque usa ${a.ability === 'dex' ? 'DES' : 'FOR'} e conta a proficiência. Sem treino com ela, peça ao mestre para ajustar.`
                : `Not a catalog weapon: the attack uses ${a.ability === 'dex' ? 'DEX' : 'STR'} and counts proficiency. If you are not trained with it, ask the DM to adjust.`}
            </div>
          )}
          {wDef && wDef.props && wDef.props.length > 0 && (
            <div className="fh-atk-note fh-wpn-props">{propsText(wDef.props, lang)}</div>
          )}
          {(fs.attackParts.length > 0 || fs.damageParts.length > 0) && (
            <div className="fh-atk-note is-gold">
              {fs.attackParts.length > 0 && <>{pt ? 'Ataque' : 'Attack'} {FS.partsLabel(fs.attackParts, lang)} </>}
              {fs.damageParts.length > 0 && <>{pt ? 'Dano' : 'Damage'} {FS.partsLabel(fs.damageParts, lang)}</>}
            </div>
          )}
          {fs.mastery && (
            <div className="fh-atk-note is-mastery">
              {pt ? 'Maestria' : 'Mastery'}: <strong>{fs.mastery.name[lang]}</strong> — {fs.mastery.desc[lang]}
            </div>
          )}
          {fs.notes.map((n, k) => <div key={k} className="fh-atk-note">{n[lang]}</div>)}
          {a.monk && <div className="fh-atk-note is-gold">{pt ? `Artes Marciais: arma de monge (usa ${a.ability === 'dex' ? 'DES' : 'FOR'})` : `Martial Arts: Monk weapon (uses ${a.ability === 'dex' ? 'DEX' : 'STR'})`}</div>}
        </div>
      )}
    </div>
  );
};

// ===== Inventory =====
// placed (src/sheet/feature-placement.js): traços de itens (infusões, sintonia…) no Equipamento.
// Os demais traços de classe ficam espalhados pela ficha (a antiga lista "Características de
// Classe" daqui virou o painel Outros traços, na aba Atributos).
// Em campanha (ficha da conta) o servidor trava armadura, escudo, armas e a lista de itens
// (só o mestre muda); moedas, equipar, quantidade e notas continuam com o jogador. A regra é
// dita UMA vez, no topo da aba, e os controles travados ficam desabilitados (antes pareciam
// editáveis e a ficha recusava a mudança só na hora de salvar).
export const SheetInventory = ({ char, lang, update, roll, cls, bg, placed, stance = null, onStance = null }) => {
  const pt = lang === 'pt';
  const toast = useSheetToast();
  const locked = !!char.inCampaign && typeof char.id === 'number';
  const addWeapon = (id) => {
    const w = SRD.weaponFor(id, char.rulesVersion);
    if (!w) return;
    update({
      weapons: [...(char.weapons || []), {
        id: w.id, name: tName('weapon', w.id, lang), damage: w.damage, dmgType: w.dmgType, props: w.props,
        ...(w.range ? { range: w.range } : {}), ...(w.mastery ? { mastery: w.mastery } : {}),
      }]
    });
  };
  const removeWeapon = (idx) => {
    const w = char.weapons[idx];
    update({ weapons: char.weapons.filter((_, i) => i !== idx) });
    undoRemoval(toast, 'weapons', idx, w, pt ? `${w?.name || 'Arma'} removida.` : `${w?.name || 'Weapon'} removed.`);
  };
  const updateWeapon = (idx, patch) => update({ weapons: char.weapons.map((w, i) => i === idx ? { ...w, ...patch } : w) });

  const addItem = () => update({ equipment: [...(char.equipment || []), { name: '', qty: 1, type: 'gear' }] });
  const updateItem = (idx, patch) => update({ equipment: char.equipment.map((e, i) => i === idx ? { ...e, ...patch } : e) });
  const removeItem = (idx) => update({ equipment: char.equipment.filter((_, i) => i !== idx) });

  // Armas da ficha + as armas equipadas do inventário (só leitura); CA com armadura e escudo
  // da ficha ou, sem eles, os equipados no inventário (utils.js: sheetWeapons, acBreakdown).
  const ownCount = (char.weapons || []).length;
  const weapons = Utils.sheetWeapons(char);
  const acb = Utils.acBreakdown(char);
  const partLabel = (p) => (p.label?.id ? tName('armor', p.label.id, lang) : (p.label?.[lang] || p.label?.pt || ''));
  const acSumOk = acb.parts.length > 1 && acb.parts.reduce((n, p) => n + p.value, 0) === acb.total;
  const acSum = acb.parts.map((p, i) => `${i ? (p.value < 0 ? '− ' : '+ ') : (p.value < 0 ? '−' : '')}${Math.abs(p.value)} ${partLabel(p)}`).join(' ');
  const armorText = acb.armor
    ? (acb.armor.item
      ? (pt ? `com ${itemShownName(acb.armor.item, lang) || 'armadura'} (item equipado)` : `with ${itemShownName(acb.armor.item, lang) || 'armor'} (equipped item)`)
      : (pt ? `com ${tName('armor', acb.armor.id, lang)}` : `with ${tName('armor', acb.armor.id, lang)}`))
    : (pt ? 'sem armadura' : 'unarmored');
  const shieldText = acb.shield
    ? (acb.shield.item
      ? (pt ? ` e ${itemShownName(acb.shield.item, lang) || 'escudo'} (item equipado)` : ` and ${itemShownName(acb.shield.item, lang) || 'a shield'} (equipped item)`)
      : (pt ? ' e escudo' : ' and a shield'))
    : (pt ? ', sem escudo' : ', no shield');
  const attuneItems = (char.equipment || []).filter(it => it?.attunement);
  const attuned = attuneItems.filter(it => it.attuned).length;

  return (
    <div className="fh-inv-grid">
      {locked && (
        <p className="fh-inv-lock fh-inv-rule" role="note">
          <Icon name="lock" size={14} aria-hidden="true" />
          <span>
            {pt
              ? 'Em campanha: os itens vêm do mestre. Equipe a armadura, o escudo e as armas que recebeu para valerem na CA e nos ataques; você também ajusta quantidades, abre pacotes, anota e cuida das moedas.'
              : 'In a campaign: items come from the DM. Equip the armor, shield and weapons you received so they count for AC and attacks; you also adjust quantities, open packs, add notes and manage your coins.'}
          </span>
        </p>
      )}
      <div className="fh-inv-col">
      <section className="fh-panel fh-armor">
        <FhTitle>{t('armorChoice', lang)}</FhTitle>
        <select aria-label={t('armorChoice', lang)} value={char.armor || ''} disabled={locked} onChange={e => update({ armor: e.target.value || null })}>
          <option value="">{t('noArmor', lang)}</option>
          {SRD.ARMOR.filter(a => a.type !== 'shield').map(a => (
            <option key={a.id} value={a.id}>{tName('armor', a.id, lang)} ({pt ? 'CA' : 'AC'} {a.ac}, {armorTypeLabel(a.type, lang)})</option>
          ))}
        </select>
        <div className="fh-shield-row">
          <input type="checkbox" id="shield2" checked={!!char.hasShield} disabled={locked}
            onChange={e => update({ hasShield: e.target.checked })}/>
          <label htmlFor="shield2">{t('shield', lang)} ({pt ? '+2 CA' : '+2 AC'})</label>
        </div>
        {/* o resultado da escolha, com o mesmo cálculo do medalhão de CA do topo */}
        <p className="fh-armor-result" role="status">
          <span className="fh-armor-ac"><span className="fh-armor-ac-k">{pt ? 'CA' : 'AC'}</span> <b>{acb.total}</b></span>
          <span className="fh-armor-with">{armorText}{shieldText}</span>
          {/* a conta: a opção diz "CA 11" e o resultado "CA 14"; aqui aparece de onde vêm os 3 */}
          {acSumOk && <span className="fh-armor-sum mono">= {acSum}</span>}
        </p>
        {locked && !acb.armor && !acb.shield && (
          <p className="fh-armor-how">{pt ? 'Para vestir: abra o item em Equipamento e toque em Equipar.' : 'To wear it: open the item under Equipment and tap Equip.'}</p>
        )}
      </section>

      <section className="fh-panel fh-weapons">
      <FhTitle act={stance ? <FhAdv3 value={stance} onChange={onStance} lang={lang} /> : null}>{t('weapons', lang)}</FhTitle>
      {!weapons.length && (
        <p className="fh-empty-state">
          {locked
            ? (pt ? 'Nenhuma arma ainda. Equipe uma arma do Equipamento (abra o item e toque em Equipar) para ter os botões de ataque e dano.' : 'No weapons yet. Equip a weapon from Equipment (open the item and tap Equip) to get its attack and damage buttons.')
            : (pt ? 'Nenhuma arma ainda. Escolha uma abaixo, ou equipe uma arma do Equipamento, para ter os botões de ataque e dano.' : 'No weapons yet. Pick one below, or equip a weapon from Equipment, to get its attack and damage buttons.')}
        </p>
      )}
      {weapons.map((w, i) => (
        <WeaponCard key={`${w.id || 'w'}-${w.itemId || i}`} w={w} char={char} lang={lang} roll={roll} locked={locked || !!w.fromItem || i >= ownCount}
          onPatch={(p) => updateWeapon(i, p)} onRemove={() => removeWeapon(i)} />
      ))}
      {!locked && (
        <select className="fh-wpn-add" aria-label={t('addWeapon', lang)} value="" onChange={e => { if (e.target.value) { addWeapon(e.target.value); e.target.value = ''; } }}>
          <option value="">+ {t('addWeapon', lang)}...</option>
          {['simple-melee','simple-ranged','martial-melee','martial-ranged'].map(t_ => (
            <optgroup key={t_} label={WEAPON_GROUP[t_][pt ? 0 : 1]}>
              {SRD.weaponsFor(char.rulesVersion).filter(w => w.type === t_).map(w =>
                <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage})</option>
              )}
            </optgroup>
          ))}
        </select>
      )}
      </section>
      </div>

      <div className="fh-inv-col">
      <section className="fh-panel fh-equipment">
      <FhTitle sub={attuneItems.length > 0 ? (
        <span className={`fh-attune-count${attuned >= 3 ? ' is-full' : ''}`}>{pt ? `Sintonia ${attuned}/3` : `Attunement ${attuned}/3`}</span>
      ) : null}>{t('equipmentList', lang)}</FhTitle>
      <InventoryList char={char} lang={lang} update={update} addItem={addItem} updateItem={updateItem} removeItem={removeItem} roll={roll} />
      <FhFeatures items={placed?.by.items} multi={!!placed?.multi} lang={lang} place="items" />
      </section>

      <section className="fh-panel">
        <FhTitle>{t('coins', lang)}</FhTitle>
        {/* 5 moedas redondas no metal de cada uma (só visual), o campo embaixo */}
        <div className="fh-coins">
          {['cp','sp','ep','gp','pp'].map(c => (
            <div key={c} className="fh-coin" data-coin={c}>
              <div className="eyebrow text-xs fh-coin-face" title={COIN_NAME[pt ? 'pt' : 'en'][c]} aria-hidden="true">{COIN_LABEL[pt ? 'pt' : 'en'][c]}</div>
              <CoinInput
                value={(char.coins || {})[c] || 0}
                label={`${COIN_LABEL[pt ? 'pt' : 'en'][c]} (${COIN_NAME[pt ? 'pt' : 'en'][c]})`}
                onCommit={(n) => update({ coins: { ...(char.coins || {}), [c]: n } })}
              />
              <span className="fh-coin-name">{COIN_NAME[pt ? 'pt' : 'en'][c]}</span>
            </div>
          ))}
        </div>
        <p className="fh-coin-hint">{pt ? 'Digite +10 para somar ou -5 para gastar.' : 'Type +10 to add or -5 to spend.'}</p>
      </section>
      </div>
    </div>
  );
};

// Campo de texto que cresce com o conteúdo (sem barra de rolagem interna nem alça de
// redimensionar): a altura acompanha o que foi escrito, ao abrir e a cada tecla.
