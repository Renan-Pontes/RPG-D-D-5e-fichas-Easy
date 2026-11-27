import { useState } from 'react';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { ITEMS, ITEMS_BY_ID } from '../../../data/items.js';
import { CLASS_START, BACKGROUND_START, TOOLS } from '../../creator/start-data.js';
import { PACK_GEAR } from '../../../data/equipment-packs.js';
import * as FS from '../../progression/fighting-styles.js';
import { propLabel, armorTypeLabel } from '../../creator/equipment-helpers.js';
import { itemArtFor } from '../../items/item-art.js';
import { isPack, openPack, packPreview } from '../../items/packs.js';
import ItemPickerModal from '../../items/ItemPickerModal.jsx';
import ArtThumb from '../../components/ArtThumb.jsx';
import FhTitle from '../FhTitle.jsx';
import FhAdv3 from '../FhAdv3.jsx';
import { DiceText } from '../../dice/dice-text.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { undoRemoval } from '../sheet-undo-helpers.js';
// Siglas das moedas (PHB em pt: peça de cobre/prata/electro/ouro/platina).
export const COIN_LABEL = { pt: { cp: 'PC', sp: 'PP', ep: 'PE', gp: 'PO', pp: 'PL' }, en: { cp: 'CP', sp: 'SP', ep: 'EP', gp: 'GP', pp: 'PP' } };
export const COIN_NAME = { pt: { cp: 'cobre', sp: 'prata', ep: 'electro', gp: 'ouro', pp: 'platina' }, en: { cp: 'copper', sp: 'silver', ep: 'electrum', gp: 'gold', pp: 'platinum' } };
export const WEAPON_GROUP = {
  'simple-melee': ['Simples corpo a corpo', 'Simple melee'], 'simple-ranged': ['Simples à distância', 'Simple ranged'],
  'martial-melee': ['Marciais corpo a corpo', 'Martial melee'], 'martial-ranged': ['Marciais à distância', 'Martial ranged'],
};
export const propsText = (props, lang) => (props || []).map(p => propLabel(p, lang)).join(', ');

// Magias de talento/espécie (auto + feat/species): ficam fora das listas da classe.
const ITEM_GLYPH = { weapon: 'sword', armor: 'shield', shield: 'shield', potion: 'flask', scroll: 'scroll', ring: 'gem', wondrous: 'sparkle', magic: 'sparkle', rod: 'sparkle', staff: 'sparkle', wand: 'sparkle' };
const GEAR_GLYPH = [
  [/grim[oó]rio|livro|tomo|book|tome|di[aá]rio|journal/i, 'book'],
  [/pergaminho|papel|carta|scroll|parchment|paper|letter/i, 'scroll'],
  [/tinta|pena|cal[ií]graf|ink|quill|calligraph/i, 'feather'],
  [/tocha|lamparina|lanterna|vela|[oó]leo|torch|lamp|lantern|candle|oil/i, 'flame'],
  [/mapa|map/i, 'map'],
  [/chave|key/i, 'key'],
  [/po[cç][aã]o|frasco|vidro|[aá]cido|ant[ií]doto|potion|flask|vial|acid/i, 'flask'],
  [/moeda|bolsa de moedas|coin|purse/i, 'coins'],
  [/b[uú]ssola|compass/i, 'compass'],
];
const itemGlyph = (item) => {
  const cat = item?.magic?.category;
  if (cat && cat !== 'armor' && ITEM_GLYPH[cat]) return ITEM_GLYPH[cat];
  if (item?.type && item.type !== 'gear' && ITEM_GLYPH[item.type]) return ITEM_GLYPH[item.type];
  const name = String(item?.name || '');
  for (const [re, g] of GEAR_GLYPH) if (re.test(name)) return g;
  return 'toolbox';
};

/**
 * InventoryList — lista de equipamento com estado (flags broken/equipped/qty/
 * attunement/notes).
 *
 * Modo standalone: edita tudo localmente via `update`. Mostra botão "Adicionar".
 * Modo campanha: usa endpoints (PATCH/DELETE/consume). Esconde "Adicionar"
 * (item dado pelo mestre). A regra da campanha é dita no topo da aba (SheetInventory).
 *
 * Items "legacy" sem `id` (antiga estrutura {name, qty}) ainda aparecem
 * — convertidos para nova estrutura na primeira edição via `update`.
 *
 * Pacotes de equipamento (Pacote de Aventureiro…): no lugar da quantidade, o
 * botão "Abrir pacote" troca o pacote pelos itens de dentro (src/items/packs.js).
 * Ficha do servidor (conta/campanha) abre pelo backend.
 *
 * Quantidade: − N + em todo item (antes só havia "Consumir", inclusive em livro e roupa, e
 * depois de chegar a ×0 não havia como voltar). Excluir: aviso com "Desfazer"; item mágico,
 * em sintonia ou guardado no servidor pede confirmação antes.
 */
const isBodyArmorItem = (it) => !!it?.armor && it.type !== 'shield' && ['light', 'medium', 'heavy'].includes(it.armor.type);
const isShieldItem = (it) => it?.type === 'shield' || it?.armor?.type === 'shield';
// Cura de uma poção: o campo `heal` do catálogo ("2d4+2") ou, nas antigas, o texto
// "Recupera 2d4+2 HP". Só poções; qualquer outro dado no texto continua sendo o chip de rolar.
const potionHealDice = (it) => {
  if (!it || (it.type !== 'potion' && it.magic?.category !== 'potion')) return null;
  if (it.magic?.heal) return String(it.magic.heal).replace(/\s+/g, '');
  const texts = [it.magic?.effect, it.description].flatMap(v => (typeof v === 'string' ? [v] : v ? [v.pt, v.en] : [])).filter(Boolean);
  for (const s of texts) {
    const m = /(?:recupera|regains?)\s+(\d+d\d+(?:\s*\+\s*\d+)?)\s*(?:hp|pv|pontos de vida|hit points)/i.exec(s);
    if (m) return m[1].replace(/\s+/g, '');
  }
  return null;
};

export function InventoryList({ char, lang, update, addItem, updateItem, removeItem, roll = null }) {
  const pt = lang === 'pt';
  const inCampaign = !!char.inCampaign;
  const toast = useSheetToast();
  const [picking, setPicking] = useState(false);
  const [freshIdx, setFreshIdx] = useState(null); // "item livre" recém-criado: abre com o cursor no nome
  const items = char.equipment || [];

  // Avisos no pé da ficha (antes eram alert() do navegador); fora da ficha (sem o aviso), alert.
  const warn = (text) => (toast ? toast.show({ tone: 'info', ms: 5000, text }) : alert(text));
  const callBackend = async (fn) => {
    if (typeof char.id !== 'number') return null;
    try { return await fn(); } catch (e) {
      warn(errorMessage(e));
      return null;
    }
  };
  const onServer = (it) => typeof char.id === 'number' && inCampaign && !!it.id;

  // Equipar VALE na ficha (utils.js: wornArmor, wornShield, sheetWeapons): a armadura e o
  // escudo equipados entram na CA e a arma equipada ganha os botões de ataque e dano.
  // Só uma armadura e um escudo por vez: equipar um tira o outro. O aviso diz o que mudou.
  const toggleEquipped = async (it, idx) => {
    const on = !it.equipped;
    const kind = isBodyArmorItem(it) ? 'armor' : isShieldItem(it) ? 'shield' : it.weapon ? 'weapon' : 'other';
    const rivals = on && (kind === 'armor' || kind === 'shield')
      ? items.map((x, i) => ({ x, i })).filter(({ x, i }) => i !== idx && x?.equipped && (kind === 'armor' ? isBodyArmorItem(x) : isShieldItem(x)))
      : [];
    let next = null;
    if (onServer(it)) {
      let r = await callBackend(() => api.invPatch(char.id, it.id, { equipped: on }));
      if (!r) return;
      for (const { x } of rivals) if (x.id) r = (await callBackend(() => api.invPatch(char.id, x.id, { equipped: false }))) || r;
      next = r.character.data.equipment || [];
    } else {
      next = items.map((e, i) => (i === idx ? { ...e, equipped: on } : rivals.some(rv => rv.i === i) ? { ...e, equipped: false } : e));
    }
    update({ equipment: next });
    if (!toast) return;
    if (kind === 'other') { acToast(it, next); return; }
    const name = itemShownName(it, lang) || (pt ? 'Item' : 'Item');
    if (kind === 'weapon') {
      toast.show({ ms: 5000, text: on
        ? (pt ? `${name} em mãos: os botões de ataque e dano estão em Armas e na aba Jogar.` : `${name} in hand: its attack and damage buttons are under Weapons and on the Play tab.`)
        : (pt ? `${name} guardada: saiu das Armas.` : `${name} put away: removed from Weapons.`) });
      return;
    }
    let before = null; let after = null;
    try { before = Utils.computeAc(char); after = Utils.computeAc({ ...char, equipment: next }); } catch { /* ficha incompleta */ }
    const acTxt = before == null ? '' : before === after
      ? (pt ? ` A CA continua ${after}.` : ` AC stays ${after}.`)
      : (pt ? ` CA ${before} → ${after}.` : ` AC ${before} → ${after}.`);
    const why = on && before === after
      ? (it.broken ? (pt ? ' Item quebrado não conta.' : ' A broken item does not count.')
        : kind === 'armor' && char.armor ? (pt ? ' A armadura escolhida no painel Armadura vale primeiro.' : ' The armor picked in the Armor panel comes first.')
          : kind === 'shield' && char.hasShield ? (pt ? ' O escudo já estava marcado no painel Armadura.' : ' The shield was already ticked in the Armor panel.') : '')
      : '';
    const swapped = rivals.length ? (pt ? ` ${itemShownName(rivals[0].x, lang)} foi guardado.` : ` ${itemShownName(rivals[0].x, lang)} was put away.`) : '';
    toast.show({ ms: 5500, text: `${name} ${on ? (pt ? 'equipado' : 'equipped') : (pt ? 'guardado' : 'put away')}.${acTxt}${why}${swapped}` });
  };

  const toggleAttuned = async (it, idx) => {
    if (!it.attunement) return;
    const newVal = !it.attuned;
    // Limite de 3 attuned em standalone (validado no backend em campanha)
    if (newVal && !inCampaign) {
      const count = items.filter(x => x.attuned).length;
      if (count >= 3) { warn(pt ? 'Limite de 3 itens em sintonia. Desfaça uma para trocar.' : 'Limit of 3 attuned items. End one to swap.'); return; }
    }
    let next;
    if (onServer(it)) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { attuned: newVal }));
      if (!r) return;
      next = r.character.data.equipment || [];
    } else {
      next = items.map((e, i) => (i === idx ? { ...e, attuned: newVal } : e));
    }
    update({ equipment: next });
    acToast(it, next);
  };

  // Item mágico que mexe na CA (anel, capa…): o aviso só aparece quando o número mudou.
  function acToast(it, next) {
    if (!toast) return;
    let before = null; let after = null;
    try { before = Utils.computeAc(char); after = Utils.computeAc({ ...char, equipment: next }); } catch { return; }
    if (before === after) return;
    const name = itemShownName(it, lang) || (pt ? 'Item' : 'Item');
    toast.show({ ms: 5000, text: pt ? `${name}: CA ${before} → ${after}.` : `${name}: AC ${before} → ${after}.` });
  }

  // Beber a poção num toque: rola a cura, gasta 1 e soma os PV (até o máximo). O aviso desfaz.
  // Na Forma Selvagem de 2014 a cura vai para a fera: ali só rola e gasta, os PV ficam com o jogador.
  const drink = async (it, idx) => {
    const dice = potionHealDice(it);
    const qty = it.qty ?? 1;
    if (!dice || qty <= 0) return;
    const name = itemShownName(it, lang) || (pt ? 'Poção' : 'Potion');
    const entry = roll ? roll({ formula: dice, label: pt ? `${name}: cura` : `${name}: healing`, isSave: false, isCheck: false, isAttack: false }) : null;
    const healed = Number(entry?.total);
    const snap = { equipment: items, currentHp: char.currentHp, deathSaves: char.deathSaves, stabilized: char.stabilized ?? null };
    let next;
    if (onServer(it)) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { qty: qty - 1 }));
      if (!r) return;
      next = r.character.data.equipment || [];
    } else {
      next = items.map((e, i) => (i === idx ? { ...e, qty: qty - 1 } : e));
    }
    const beast = !!char.wildShape?.active && char.rulesVersion !== '2024';
    const canHeal = Number.isFinite(healed) && healed > 0 && !beast && Number.isFinite(+char.maxHp);
    const cur = +char.currentHp || 0;
    const newHp = canHeal ? Math.min(+char.maxHp, cur + healed) : cur;
    update({ equipment: next, ...(canHeal && newHp !== cur ? { currentHp: newHp } : {}) });
    if (!toast) return;
    const left = pt ? `Restam ×${qty - 1}.` : `×${qty - 1} left.`;
    const text = !Number.isFinite(healed)
      ? (pt ? `${name} usada. Role ${dice} e some os PV na aba Jogar. ${left}` : `${name} used. Roll ${dice} and add the HP on the Play tab. ${left}`)
      : !canHeal
        ? (pt ? `${name}: ${healed} de cura. Some na Vitalidade (aba Jogar). ${left}` : `${name}: ${healed} healing. Add it under Vitality (Play tab). ${left}`)
        : (pt ? `${name}: +${newHp - cur} PV (${cur} → ${newHp}). ${left}` : `${name}: +${newHp - cur} HP (${cur} → ${newHp}). ${left}`);
    toast.show({
      tone: 'heal', ms: 9000, text,
      onAction: async () => {
        if (onServer(it)) {
          const r = await callBackend(() => api.invPatch(char.id, it.id, { qty }));
          if (r) toast.patchChar?.({ equipment: r.character.data.equipment || [], currentHp: snap.currentHp, deathSaves: snap.deathSaves, stabilized: snap.stabilized });
        } else toast.patchChar?.(snap);
      },
    });
  };

  // Quantidade nos dois sentidos (gastar uma poção, recuperar flechas). Em campanha o
  // servidor aceita a quantidade vinda do dono (o resto do item é do mestre).
  const setQty = async (it, idx, qty) => {
    const nq = Math.max(0, Math.min(9999, Math.floor(+qty) || 0));
    if (nq === (it.qty ?? 1)) return;
    if (typeof char.id === 'number' && inCampaign && it.id) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { qty: nq }));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      updateItem(idx, { qty: nq });
    }
  };

  const openPackAt = async (it, idx) => {
    const preview = packPreview(char, it, lang);
    if (!preview) return;
    const many = (+it.qty || 0) > 1 ? (pt ? ` Abre 1 de ${it.qty}.` : ` Opens 1 of ${it.qty}.`) : '';
    const ok = await confirmDialog({
      lang,
      title: pt ? `Abrir ${it.name || preview.name}?` : `Open ${it.name || preview.name}?`,
      message: (pt ? `Entram no inventário (regras ${preview.rules}): ` : `Goes into your inventory (${preview.rules} rules): `)
        + preview.lines.join(', ') + '. '
        + (pt ? 'Itens que você já tem são somados.' : 'Items you already have are added up.') + many,
      confirmLabel: pt ? 'Abrir pacote' : 'Open pack',
    });
    if (!ok) return;
    if (typeof char.id === 'number') {
      try {
        const r = await api.invOpenPack(char.id, it.id ? { itemId: it.id, lang } : { index: idx, name: it.name, lang });
        update({ equipment: r.character.data.equipment || [] });
      } catch (e) {
        // Servidor ainda sem a rota (404 sem código de erro): fora de campanha abre aqui e
        // salva como qualquer edição; em campanha o inventário só muda pelo servidor.
        if (e?.status === 404 && !e?.data?.error && !inCampaign) {
          const patch = openPack(char, it, lang);
          if (patch) update(patch);
        } else warn(errorMessage(e));
      }
    } else {
      const patch = openPack(char, it, lang);
      if (patch) update(patch);
    }
  };

  const removeOne = async (it, idx) => {
    if (inCampaign && typeof char.id === 'number') {
      // Em campanha, dono não remove. DM remove via DM editor.
      warn(pt ? 'Em campanha, apenas o mestre remove itens.' : 'In campaign, only the DM removes items.');
      return;
    }
    const name = it.name || (pt ? 'Item sem nome' : 'Unnamed item');
    const onServer = typeof char.id === 'number' && it.id;
    if (onServer || it.magic || it.attuned) {
      const ok = await confirmDialog({
        lang, danger: true,
        title: pt ? `Remover ${name}?` : `Remove ${name}?`,
        message: it.attuned
          ? (pt ? 'O item está em sintonia e sai do inventário.' : 'The item is attuned and leaves your inventory.')
          : (pt ? 'O item sai do inventário.' : 'The item leaves your inventory.'),
        confirmLabel: pt ? 'Remover' : 'Remove',
      });
      if (!ok) return;
    }
    if (onServer) {
      const r = await callBackend(() => api.invDelete(char.id, it.id));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      removeItem(idx);
      undoRemoval(toast, 'equipment', idx, it, pt ? `${name} removido do inventário.` : `${name} removed from the inventory.`);
    }
  };

  const setNotes = async (it, idx, notes) => {
    if (typeof char.id === 'number' && inCampaign && it.id) {
      await callBackend(() => api.invPatch(char.id, it.id, { notes }));
    } else {
      updateItem(idx, { notes });
    }
  };

  // Por que um item equipado NÃO está valendo (ou o que ele faz valendo), dito na própria linha.
  const worn = (() => { try { return { armor: Utils.wornArmor(char), shield: Utils.wornShield(char) }; } catch { return { armor: null, shield: null }; } })();
  const wornNoteOf = (it) => {
    // item mágico que soma na CA (Anel de Proteção…): vale equipado e, se pede, em sintonia
    const acB = Number(it?.magic?.acBonus) || 0;
    if (acB && it.magic.category !== 'armor' && !it.broken) {
      const saves = Number(it.magic.saveBonus) || 0;
      const savesTxt = saves ? (pt ? ` O +${saves} nos testes de resistência você soma na rolagem.` : ` Add the +${saves} to saving throws when you roll.`) : '';
      let counted = 0;
      try { counted = Utils.wornItemAcBonus(char, it); } catch { counted = 0; }
      if (counted) return (pt ? `Em uso: +${counted} na CA.` : `In use: +${counted} AC.`) + savesTxt;
      if (it.equipped && it.attunement && !it.attuned) return pt ? `Não conta ainda: falta a sintonia para o +${acB} na CA valer.` : `Not counted yet: attune it for the +${acB} AC to apply.`;
      if (!it.equipped && (it.attuned || !it.attunement)) return pt ? `Não conta ainda: equipe para o +${acB} na CA valer.` : `Not counted yet: equip it for the +${acB} AC to apply.`;
      if (it.equipped) return pt ? `Não conta: o +${acB} na CA só vale sem armadura e sem escudo.` : `Not counted: the +${acB} AC only applies with no armor and no shield.`;
      return null;
    }
    if (!it?.equipped) return null;
    if (it.broken && (it.weapon || it.armor || isShieldItem(it))) return pt ? 'Quebrado: não conta na CA nem nos ataques.' : 'Broken: does not count for AC or attacks.';
    if (isBodyArmorItem(it)) {
      if (worn.armor?.item === it) return pt ? 'Vestida: conta na CA.' : 'Worn: counts for AC.';
      if (char.armor) return pt ? `Não conta: a armadura escolhida no painel Armadura (${tName('armor', char.armor, lang)}) vale primeiro.` : `Not counted: the armor picked in the Armor panel (${tName('armor', char.armor, lang)}) comes first.`;
      return pt ? 'Não conta: outra armadura está vestida.' : 'Not counted: another armor is worn.';
    }
    if (isShieldItem(it)) {
      if (worn.shield?.item === it) return pt ? `Empunhado: +${worn.shield.ac + worn.shield.bonus} na CA.` : `Wielded: +${worn.shield.ac + worn.shield.bonus} AC.`;
      if (char.hasShield) return pt ? 'O escudo já está marcado no painel Armadura (+2 na CA).' : 'The shield is already ticked in the Armor panel (+2 AC).';
      return pt ? 'Não conta: outro escudo está em uso.' : 'Not counted: another shield is in use.';
    }
    if (it.weapon) return pt ? 'Em mãos: ataque e dano no painel Armas e na aba Jogar.' : 'In hand: attack and damage under Weapons and on the Play tab.';
    return null;
  };

  const addFree = () => { setFreshIdx(items.length); addItem(); };
  const addBtns = !inCampaign && (
    <div className="fh-inv-add">
      <button className="btn btn-sm btn-primary" onClick={() => setPicking(true)}>
        <Icon name="plus" size={14}/> {pt ? 'Adicionar item' : 'Add item'}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={addFree}
        title={pt ? 'Uma linha em branco para você dar nome e quantidade' : 'A blank row for you to name and count'}>
        <Icon name="plus" size={14}/> {pt ? 'Item livre' : 'Custom item'}
      </button>
    </div>
  );

  return (
    <>
      {items.length === 0 && (
        <div className="fh-empty-state">
          <p>
            {inCampaign
              ? (pt ? 'Mochila vazia. Os itens que o mestre entregar aparecem aqui.' : 'Empty pack. Items the DM hands out show up here.')
              : (pt ? 'Mochila vazia. Adicione itens das regras básicas ou crie os seus.' : 'Empty pack. Add items from the basic rules or create your own.')}
          </p>
        </div>
      )}
      {items.map((it, i) => (
        <InventoryRow rulesVersion={char.rulesVersion} key={it.id || `legacy-${i}`} item={it} idx={i} lang={lang}
          inCampaign={inCampaign} editable={!(inCampaign && typeof char.id === 'number')}
          startOpen={freshIdx === i && !it.name}
          onToggleEquipped={() => toggleEquipped(it, i)}
          onToggleAttuned={() => toggleAttuned(it, i)}
          healDice={roll ? potionHealDice(it) : null}
          onDrink={() => drink(it, i)}
          wornNote={wornNoteOf(it)}
          onSetQty={(q) => setQty(it, i, q)}
          onOpenPack={() => openPackAt(it, i)}
          onRemove={() => removeOne(it, i)}
          onSetNotes={(n) => setNotes(it, i, n)}
          onPatchLocal={(p) => updateItem(i, p)}
        />
      ))}
      {addBtns}
      {picking && (
        <ItemPickerModal
          lang={lang}
          sheet
          title={pt ? 'Adicionar item' : 'Add item'}
          confirmLabel={pt ? 'Adicionar' : 'Add'}
          onPick={async (inst) => update({ equipment: [...items, inst] })}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

export function InventoryRow({ item, idx, lang, rulesVersion, inCampaign, editable = true, startOpen = false, onToggleEquipped, onToggleAttuned, onSetQty, onOpenPack, onRemove, onSetNotes, onPatchLocal, healDice = null, onDrink = null, wornNote = null }) {
  const pt = lang === 'pt';
  const [open, setOpen] = useState(startOpen);
  const bodyId = useId();
  const isLegacy = !item.id;
  const broken = !!item.broken;
  const equipped = !!item.equipped;
  const attuned = !!item.attuned;
  const canAttune = !!item.attunement;
  const pack = isPack(item);
  const type = item.type || (isLegacy ? 'gear' : '');
  const art = itemArtFor(item);
  const glyph = <Icon name={itemGlyph({ ...item, type })} size={18} />;
  const descText = item.description
    ? (typeof item.description === 'string' ? item.description : (item.description[lang] || item.description.en || item.description.pt || ''))
    : '';
  const qty = item.qty ?? 1;
  const shown = itemShownName(item, lang) || (pt ? 'Item sem nome' : 'Unnamed item');
  // item livre (sem origem no catálogo) ou cadastrado pelo jogador: nome editável aqui mesmo
  const canRename = editable && (!item.sourceId || item.sourceId === 'custom');

  // Linha do item (src/sheet/ficha.css: .inv-row-v2): o cabeçalho virou <button
  // aria-expanded> (antes, div clicável) — miniatura redonda, nome, ×N, etiquetas e chevron.
  return (
    <div className={`inv-row-v2 ${broken ? 'broken' : ''} ${equipped ? 'equipped' : ''} ${open ? 'open' : ''} ${qty === 0 ? 'is-spent' : ''}`}>
      <button type="button" className="inv-row-head" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(!open)}>
        <ArtThumb src={art} emoji={glyph} size={36} lang={lang} className="inv-type-icon fh-glyph-thumb" />
        <span className="inv-main">
          <span className={`inv-name${item.name ? '' : ' is-unnamed'}`}>{shown}</span>
          {item.qty != null && item.qty !== 1 && <span className="muted small inv-qty">×{item.qty}</span>}
          {broken && <span className="inv-tag broken-tag">{pt ? 'QUEBRADO' : 'BROKEN'}</span>}
          {equipped && <span className="inv-tag equip-tag">{pt ? 'equipado' : 'equipped'}</span>}
          {attuned && <span className="inv-tag attune-tag">{pt ? 'em sintonia' : 'attuned'}</span>}
        </span>
        <span className="inv-chev" aria-hidden="true"><Icon name={open ? 'chevron-up' : 'chevron-down'} size={16}/></span>
      </button>
      {open && (
        <div className="inv-row-body" id={bodyId}>
          {canRename && (
            <label className="fh-mini inv-rename">
              <span>{pt ? 'Nome' : 'Name'}</span>
              <input autoFocus={startOpen} value={item.name || ''} onChange={e => onPatchLocal({ name: e.target.value })}
                aria-label={pt ? 'Nome do item' : 'Item name'} placeholder={pt ? 'Ex.: Corda de cânhamo (15 m)' : 'E.g. Hempen rope (50 ft)'} />
            </label>
          )}
          {/* sem ilustração e sem descrição não sobra uma caixa vazia: vai direto às ações */}
          {(art || descText) && (
            <div className={`item-detail${art ? '' : ' is-text-only'}`}>
              {art && <ArtThumb src={art} emoji={glyph} size={96} lang={lang} alt={item.name || ''} />}
              {descText ? (
                <RichText className="item-detail-text text-sm muted item-desc" text={descText} lang={lang} />
              ) : <div className="item-detail-text" />}
            </div>
          )}
          {item.weapon && (() => {
            // Números de 2024 (lança de montaria, tridente…) quando a ficha é 2024.
            const w = rulesVersion === '2024' && item.weapon.v2024 ? { ...item.weapon, ...item.weapon.v2024 } : item.weapon;
            return <div className="text-xs muted inv-fact"><Icon name="sword" size={13} aria-hidden="true" /> <span><DiceText text={w.damage} lang={lang} /> {Utils.damageLabel(w.dmgType, lang)}{w.props?.length ? ` · ${propsText(w.props, lang)}` : ''}{w.range ? ` · ${w.range}` : ''}</span></div>;
          })()}
          {item.armor && (
            <div className="text-xs muted inv-fact"><Icon name="shield" size={13} aria-hidden="true" /> <span>{pt ? 'CA' : 'AC'} {item.armor.ac} ({armorTypeLabel(item.armor.type, lang)}){item.armor.stealth === 'disadv' ? (pt ? ' · desvantagem em Furtividade' : ' · Stealth disadvantage') : ''}{item.armor.strReq ? (pt ? ` · exige FOR ${item.armor.strReq}` : ` · STR ${item.armor.strReq} required`) : ''}</span></div>
          )}
          {item.magic && (item.magic.effect?.[lang] || item.magic.effect?.en) && (
            <div className="text-xs inv-magic inv-fact"><Icon name="sparkle" size={13} aria-hidden="true" /> <span>{item.magic.effect?.[lang] || item.magic.effect?.en}</span></div>
          )}
          {/* o que o item equipado está fazendo na ficha (ou por que não conta) */}
          {wornNote && <p className={`inv-worn-note${/^(Não conta|Not counted|Quebrado|Broken)/.test(wornNote) ? ' is-off' : ''}`} role="status">{wornNote}</p>}
          <div className="inv-acts">
            {/* desligado o botão diz a AÇÃO ("Equipar"); ligado, o ESTADO ("✓ Equipado") */}
            {(item.type === 'weapon' || item.type === 'armor' || item.type === 'shield' || item.weapon || item.armor || canAttune) && (
              <button type="button" className={`btn btn-sm ${equipped ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={equipped} onClick={onToggleEquipped}
                title={equipped ? (pt ? 'Toque para guardar (desequipar)' : 'Tap to put away (unequip)') : undefined}>
                {equipped ? <><Icon name="check" size={13} aria-hidden="true" /> {pt ? 'Equipado' : 'Equipped'}</> : (pt ? 'Equipar' : 'Equip')}
              </button>
            )}
            {canAttune && (
              <button type="button" className={`btn btn-sm ${attuned ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={attuned} onClick={onToggleAttuned}
                title={attuned ? (pt ? 'Toque para encerrar a sintonia' : 'Tap to end the attunement') : (pt ? 'Sintonizar leva um descanso curto; no máximo 3 itens' : 'Attuning takes a short rest; 3 items at most')}>
                {attuned ? <><Icon name="check" size={13} aria-hidden="true" /> {pt ? 'Em sintonia' : 'Attuned'}</> : (pt ? 'Sintonizar' : 'Attune')}
              </button>
            )}
            {/* Poção de cura: um toque rola, gasta 1 e soma os PV (o − da quantidade fica para correções) */}
            {healDice && onDrink && !pack && (
              <button type="button" className="btn btn-sm btn-primary inv-drink" onClick={onDrink} disabled={qty <= 0}
                title={qty <= 0 ? (pt ? 'Acabou' : 'None left') : (pt ? 'Rola a cura, gasta 1 e soma os PV' : 'Rolls the healing, uses 1 and adds the HP')}>
                <Icon name="flask" size={14} aria-hidden="true" /> {pt ? 'Beber' : 'Drink'} <span className="mono inv-drink-dice">{healDice.replace(/\+/g, ' + ')}</span>
              </button>
            )}
            {/* Pacote: consumir = abrir (os itens de dentro entram no inventário).
                Também com ×0: antes, consumir um pacote só tirava 1 e não dava nada. */}
            {pack ? (
              <button className="btn btn-sm btn-primary inv-open-pack" onClick={onOpenPack}
                title={pt ? 'Troca o pacote pelos itens que vêm dentro' : 'Replaces the pack with the items inside'}>
                {pt ? 'Abrir pacote' : 'Open pack'}
              </button>
            ) : (
              <div className="inv-stepper" role="group" aria-label={pt ? `Quantidade de ${shown}` : `Quantity of ${shown}`}>
                <span className="inv-stepper-k">{pt ? 'Qtd' : 'Qty'}</span>
                <button type="button" className="inv-step" disabled={qty <= 0} onClick={() => onSetQty(qty - 1)}
                  aria-label={pt ? `Usar ou tirar 1 ${shown}` : `Use or remove 1 ${shown}`} title={pt ? 'Usar / tirar 1' : 'Use / remove 1'}>−</button>
                <span className="inv-step-n" aria-live="polite">{qty}</span>
                <button type="button" className="inv-step" onClick={() => onSetQty(qty + 1)}
                  aria-label={pt ? `Somar 1 ${shown}` : `Add 1 ${shown}`} title={pt ? 'Somar 1' : 'Add 1'}>+</button>
              </div>
            )}
            {/* Em campanha não permite remover */}
            {!inCampaign && (
              <button className="btn btn-sm btn-ghost btn-danger inv-del" onClick={onRemove} aria-label={`${pt ? 'Remover' : 'Remove'} ${shown}`} title={pt ? 'Remover do inventário' : 'Remove from inventory'}>
                <Icon name="trash" size={14}/>
              </button>
            )}
          </div>
          <label className="inv-notes">
            <span className="muted small">{pt ? 'Notas' : 'Notes'}:</span>
            <input aria-label={pt ? `Notas de ${shown}` : `Notes for ${shown}`}
              value={item.notes || ''}
              onChange={e => onPatchLocal({ notes: e.target.value })}
              onBlur={e => onSetNotes(e.target.value)}
              placeholder={pt ? 'Onde está, de quem ganhou…' : 'Where it is, who gave it…'}
            />
          </label>
        </div>
      )}
    </div>
  );
}

