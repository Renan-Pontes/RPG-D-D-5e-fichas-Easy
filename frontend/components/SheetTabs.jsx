/* Spells / Inventory / Story / Notes tabs */
import { useRestMode } from '../src/sheet/rest-mode.jsx';
import { useSheetToast } from '../src/sheet/sheet-toast.jsx';
import { createPortal } from 'react-dom';
import { unknownSpells } from '../src/progression/known.js';
import { exhaustionLevel, setExhaustion, usedByAfterRest } from '../src/sheet/hp-logic.js';
import { errorMessage } from '../src/api/errors.js';
import { useId, useState, useMemo, useContext, useRef, useLayoutEffect } from 'react';
import { RespecContext } from '../src/progression/respec.js';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { restResources } from '../src/progression/resources.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Modal, NumStepper, Pips } from './Shared.jsx';
import ItemPickerModal from '../src/items/ItemPickerModal.jsx';
import { ITEMS, ITEMS_BY_ID } from '../data/items.js';
import { CLASS_START, BACKGROUND_START, TOOLS } from '../src/creator/start-data.js';
import { PACK_GEAR } from '../data/equipment-packs.js';
import { api } from '../src/api/client.js';
import * as FS from '../src/progression/fighting-styles.js';
import * as Book from '../src/progression/spellbook.js';
import { SpeciesChoicesModal, speciesSummary } from '../src/progression/SpeciesChoices.jsx';
import { speciesChoiceSpecs, speciesGrants } from '../src/progression/species.js';
import { grantedSpells } from '../src/creator/spell-helpers.js';
import { grantTakesOver, computeProgression } from '../src/progression/engine.js';
import { propLabel, armorTypeLabel } from '../src/creator/equipment-helpers.js';
import { schoolIcon, SCHOOL_EMOJI } from '../src/art.js';
import { itemArtFor } from '../src/items/item-art.js';
import { isPack, openPack, packPreview } from '../src/items/packs.js';
import { confirmDialog } from './ConfirmDialog.jsx';
import ArtThumb, { ArtIcon } from '../src/components/ArtThumb.jsx';
import FhTitle from '../src/sheet/FhTitle.jsx';
import FhAdv3 from '../src/sheet/FhAdv3.jsx';
import FhMedal, { FhMedalDefs } from '../src/sheet/FhMedal.jsx';
import FhFeatures from '../src/sheet/FhFeatures.jsx';
import { DiceText } from '../src/dice/dice-text.jsx';
import { RichText } from '../src/sheet/rich-text.jsx';
import { useSpellText, spellTextLoaded, ddbSpellUrl, spellMechanics, scaledDice, higherLevelText } from '../src/sheet/spell-text.js';
import SPELL_TAGS from '../data/spell-tags.json';
import { slotCircleLabel, gemLabel, lockedSlotTitle, slotSpent, slotTap, slotTapTitle } from '../src/sheet/gem-text.js';

// Siglas das moedas (PHB em pt: peça de cobre/prata/electro/ouro/platina).
const COIN_LABEL = { pt: { cp: 'PC', sp: 'PP', ep: 'PE', gp: 'PO', pp: 'PL' }, en: { cp: 'CP', sp: 'SP', ep: 'EP', gp: 'GP', pp: 'PP' } };
const COIN_NAME = { pt: { cp: 'cobre', sp: 'prata', ep: 'electro', gp: 'ouro', pp: 'platina' }, en: { cp: 'copper', sp: 'silver', ep: 'electrum', gp: 'gold', pp: 'platinum' } };
const WEAPON_GROUP = {
  'simple-melee': ['Simples corpo a corpo', 'Simple melee'], 'simple-ranged': ['Simples à distância', 'Simple ranged'],
  'martial-melee': ['Marciais corpo a corpo', 'Martial melee'], 'martial-ranged': ['Marciais à distância', 'Martial ranged'],
};
const propsText = (props, lang) => (props || []).map(p => propLabel(p, lang)).join(', ');

// Magias de talento/espécie (auto + feat/species): ficam fora das listas da classe.
const isGrantEntry = (s) => !!s && typeof s === 'object' && s.auto && (s.feat || s.species);

const idOf = (s) => (typeof s === 'string' ? s : s?.id);

// Magias de talento/espécie da ficha, já como ficam na próxima gravação
// (applyAutosToCharacter):
// - entries: as gravadas mais as que a ficha ainda não gravou (ficha salva antes de
//   a espécie ganhar a magia, ex.: Magia Firbolg), aparecem do mesmo jeito;
// - isTakenOver(s): entrada comum da classe com o id de uma delas (Firbolg druida que
//   preparou Detectar Magia pelo druida). O motor troca pela da espécie, então ela
//   já sai da lista da classe e não conta nas preparadas (engine.js grantTakesOver).
function grantStateOf(char) {
  const spells = char.spells || [];
  let granted = [];
  try { granted = grantedSpells(char).filter(g => g.source === 'feat' || g.source === 'species'); } catch { /* ficha incompleta */ }
  const isTakenOver = (s) => {
    if (isGrantEntry(s)) return false;
    const g = granted.find(x => x.id === idOf(s));
    return !!g && grantTakesOver(char, typeof s === 'string' ? { id: s, prepared: false } : s, g.level === 0);
  };
  const have = new Set(spells.filter(s => !isTakenOver(s)).map(idOf));
  const missing = granted.filter(g => !have.has(g.id)).map(g => ({ id: g.id, prepared: true, auto: true, [g.source]: true }));
  return { entries: [...spells.filter(isGrantEntry), ...missing], isTakenOver };
}
const grantEntriesOf = (char) => grantStateOf(char).entries;

// Usos fora do padrão das magias da espécie (Magia Firbolg: 1× por descanso curto;
// Gnomo da Floresta 2024: bônus de proficiência vezes por descanso longo).
const USES_TAG = {
  short: () => ({ pt: '1×/descanso curto', en: '1/short rest' }),
  atWill: () => ({ pt: 'à vontade', en: 'at will' }),
  profBonus: (char) => { const n = Utils.profBonus(char); return { pt: `${n}×/descanso longo`, en: `${n}/long rest` }; },
};
const UsesTag = ({ uses, char, lang }) => {
  const text = USES_TAG[uses]?.(char);
  return text ? <span className="spell-tag-uses">{text[lang] || text.pt}</span> : null;
};

/**
 * Botões de descanso. Em campanha: chama backend (recurso autorizado pra dono
 * ou DM). Em standalone: aplica local.
 */
const RestButtons = ({ char, lang, update, seals = false }) => {
  const [busy, setBusy] = useState(false);
  const rest = useRestMode();            // null fora da ficha: descansa direto, como antes
  const sheetToast = useSheetToast();    // null fora da ficha
  // Depois do descanso longo: exaustão −1 e o gasto de Dados de Vida por tipo acertado.
  const afterLong = (hitDiceUsed) => {
    const p = {};
    const lv = exhaustionLevel(char);
    if (lv > 0) Object.assign(p, setExhaustion(char, lv - 1));
    if (hitDiceUsed != null && char.hitDiceUsedBy) p.hitDiceUsedBy = usedByAfterRest(char, Utils.hitDiceByDie(char), hitDiceUsed);
    return p;
  };
  // Usos livres das magias de talento/espécie (SpellRow): voltam no descanso deles.
  const freeBack = (type) => ({
    ...(Object.keys(char.freeCastsShort || {}).length ? { freeCastsShort: {} } : {}),
    ...(type === 'long' && Object.keys(char.freeCasts || {}).length ? { freeCasts: {} } : {}),
  });
  const restore = async (type) => {
    setBusy(true);
    try {
      if (typeof char.id === 'number') {
        const res = await api.rest(char.id, { type });
        const d = res.character.data || {};
        // Servidor antigo não devolve os espaços do Pacto no descanso curto: fora de campanha
        // a ficha aplica a devolução aqui (em campanha o espaço é do servidor).
        let slotsUsed = d.spellSlotsUsed;
        if (type === 'short' && !char.inCampaign) {
          const pact = Utils.pactSlots(char);
          if (pact.some(Boolean)) slotsUsed = (slotsUsed || []).map((u, i) => Math.max(0, (u || 0) - (pact[i] || 0)));
        }
        update({
          spellSlotsUsed: slotsUsed,
          wildShapeUses: d.wildShapeUses,
          currentHp: d.currentHp,
          tempHp: d.tempHp,
          conditions: d.conditions,
          deathSaves: d.deathSaves,
          hitDiceUsed: d.hitDiceUsed,
          resourcesUsed: d.resourcesUsed || {},
          ...(char.starryForm?.active ? { starryForm: { active: false } } : {}),
          ...(type === 'long' ? afterLong(d.hitDiceUsed) : {}),
          ...freeBack(type),
        });
      } else {
        const patch = { ...freeBack(type) };
        if (char.starryForm?.active) patch.starryForm = { active: false };
        if (type === 'long') {
          patch.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
          patch.wildShapeUses = 0;
          patch.currentHp = char.maxHp;
          patch.tempHp = 0;
          patch.conditions = (char.conditions || []).filter(c => c !== 'unconscious');
          patch.deathSaves = { success: 0, fail: 0 };
          patch.hitDiceUsed = char.rulesVersion === '2024' ? 0 : Math.max(0, (char.hitDiceUsed || 0) - Math.max(1, Math.floor(char.level / 2)));
        } else {
          if (char.className === 'warlock' && !Utils.isMulticlass(char)) patch.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
          else if (Utils.isMulticlass(char)) {
            // Multiclasse com Pacto: o gasto conta primeiro nos espaços de pacto, que voltam aqui.
            const pact = Utils.pactSlots(char);
            if (pact.some(Boolean)) patch.spellSlotsUsed = (char.spellSlotsUsed || []).map((u, i) => Math.max(0, (u || 0) - (pact[i] || 0)));
          }
          if (Utils.hasClass(char, 'druid')) patch.wildShapeUses = char.rulesVersion === '2024' ? Math.max(0, (char.wildShapeUses || 0) - 1) : 0;
        }
        patch.resourcesUsed = restResources(char, type).resourcesUsed;
        if (type === 'long') Object.assign(patch, afterLong(patch.hitDiceUsed));
        update(patch);
      }
    } catch (e) { console.warn('rest failed', e); }
    finally { setBusy(false); }
  };
  // Interruptor: ligar mostra o que só existe no descanso (gastar Dados de Vida);
  // desligar conclui e aplica a recuperação; ✕ sai sem descansar.
  const press = async (type) => {
    if (!rest) return restore(type);
    if (rest.mode === type) { await restore(type); rest.setMode(null); }
    else rest.setMode(type);
  };
  const pt = lang === 'pt';
  const on = rest?.mode || null;
  const btn = (type, icon, label) => (
    <button type="button" className={`btn btn-sm fh-rest-toggle is-${type}${on === type ? ' is-on' : ' btn-ghost'}`}
      onClick={() => press(type)} disabled={busy} aria-pressed={rest ? on === type : undefined}
      title={on === type ? (pt ? 'Concluir o descanso' : 'Finish the rest') : label}>
      {icon} {on === type ? (pt ? 'Concluir' : 'Finish') : (type === 'short' ? (pt ? 'Curto' : 'Short') : (pt ? 'Longo' : 'Long'))}
    </button>
  );
  // Selos (linha do nome, depois da Inspiração): mesmo anel dos outros selos, com o nome
  // embaixo (no toque não existe o balão do title).
  //  · Longo: um passo só, com a confirmação do app — não há nada para fazer "durante".
  //  · Curto: liga o modo (libera gastar Dados de Vida na barra de PV). Ligado, o selo mostra
  //    uma ampulheta (ainda não descansou: nada de ✓) e uma faixa de texto logo abaixo do
  //    topo da ficha diz o que está acontecendo, com "Concluir descanso" e "Cancelar".
  if (seals) {
    const finishShort = async () => {
      await restore('short');
      rest?.setMode(null);
      sheetToast?.show({ tone: 'heal', ms: 3500, text: pt ? 'Descanso curto concluído.' : 'Short rest finished.' });
    };
    // o painel Vitalidade conclui o descanso com esta mesma função (src/sheet/HpTracker.jsx)
    if (rest?.finishRef) rest.finishRef.current = finishShort;
    const pressSeal = async (type) => {
      if (!rest) return restore(type);
      if (type === 'long') {
        const ok = await confirmDialog({
          lang,
          title: pt ? 'Fazer um descanso longo?' : 'Take a long rest?',
          message: pt
            ? 'Recupera os Pontos de Vida, os espaços de magia, Dados de Vida e os recursos de descanso longo.'
            : 'Restores hit points, spell slots, Hit Dice and long-rest resources.',
          confirmLabel: pt ? 'Descansar' : 'Rest',
        });
        if (!ok) return undefined;
        rest.setMode(null);
        await restore('long');
        sheetToast?.show({ tone: 'heal', ms: 3500, text: pt ? 'Descanso longo concluído.' : 'Long rest finished.' });
        return undefined;
      }
      if (on === 'short') return finishShort();
      rest.setMode('short');
      return undefined;
    };
    const seal = (type, icon, label, cap) => (
      <button key={type} type="button" className={`fh-seal hero-rest no-print is-${type}${on === type ? ' is-on' : ''}`}
        onClick={() => pressSeal(type)} disabled={busy} aria-pressed={rest && type === 'short' ? on === type : undefined}
        aria-label={on === type ? (pt ? `${label} em andamento: concluir` : `${label} in progress: finish`) : label}
        title={on === type ? (pt ? 'Concluir o descanso' : 'Finish the rest') : label}>
        <svg className="fh-seal-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="none" stroke="#e0b55e" strokeWidth="1.2" strokeDasharray="2 4"/>
          <circle cx="32" cy="32" r="27" fill="none" stroke="#9a7231" strokeWidth="0.8"/>
        </svg>
        <span className="fh-seal-core"><span className="hero-rest-icon" aria-hidden="true">{icon}</span></span>
        {on === type && <span className="hero-level-up hero-rest-pip" aria-hidden="true">⏳</span>}
        <span className="fh-seal-cap" aria-hidden="true">{cap}</span>
      </button>
    );
    const strip = on === 'short' && rest?.slot ? createPortal(
      <div className="fh-rest-strip no-print" role="status">
        <span className="fh-rest-strip-t">
          <strong>☕ {pt ? 'Descanso curto em andamento' : 'Short rest in progress'}</strong>
          <span>{pt ? 'Gaste Dados de Vida no painel Vitalidade (botão "Gastar 1 DV"). Os recursos voltam ao concluir.' : 'Spend Hit Dice in the Vitality panel ("Spend 1 HD" button). Resources come back when you finish.'}</span>
        </span>
        <span className="fh-rest-strip-acts">
          <button type="button" className="btn btn-primary btn-sm" onClick={finishShort} disabled={busy}>{pt ? 'Concluir descanso' : 'Finish rest'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rest.setMode(null)} disabled={busy}>{pt ? 'Cancelar' : 'Cancel'}</button>
        </span>
      </div>,
      rest.slot,
    ) : null;
    return (
      <>
        {seal('short', '☕', pt ? 'Descanso curto' : 'Short rest', pt ? 'Curto' : 'Short')}
        {seal('long', '🛌', pt ? 'Descanso longo' : 'Long rest', pt ? 'Longo' : 'Long')}
        {strip}
      </>
    );
  }
  return (
    <div className="row gap-1 fh-rest-toggles">
      {btn('short', '☕', pt ? 'Descanso curto' : 'Short rest')}
      {btn('long', '🛌', pt ? 'Descanso longo' : 'Long rest')}
      {on && (
        <button type="button" className="btn btn-sm btn-ghost fh-rest-cancel" onClick={() => rest.setMode(null)} disabled={busy}
          aria-label={pt ? 'Sair do descanso sem concluir' : 'Leave the rest without finishing'}>✕</button>
      )}
    </div>
  );
};

/**
 * HUD unificado e compacto de conjuração: Atributo, CD de Resistência, Bônus de Ataque,
 * Descanso Curto/Longo e Espaços de Magia numa única interface contínua.
 */
/**
 * Matriz de espaços: uma linha por círculo (1–9, só os que existem), gemas alinhadas à
 * esquerda. Colunas da esquerda = espaços comuns (descanso longo); à direita, separadas,
 * as de Magia de Pacto (descanso curto). O gasto de um círculo conta primeiro no pacto.
 */
const SlotMatrix = ({ char, lang, slots, update }) => {
  const pt = lang === 'pt';
  const pact = Utils.pactSlots ? Utils.pactSlots(char) : [];
  const rows = (slots || []).map((max, i) => {
    const p = Math.min(max || 0, pact[i] || 0);
    const r = Math.max(0, (max || 0) - p);
    const used = Math.min(max || 0, (char.spellSlotsUsed || [])[i] || 0);
    const pSpent = Math.min(used, p);
    return { i, max: max || 0, r, p, used, rSpent: used - pSpent, pSpent };
  }).filter(x => x.max > 0);
  if (!rows.length) return null;
  const colsR = Math.max(0, ...rows.map(x => x.r));
  const colsP = Math.max(0, ...rows.map(x => x.p));
  const locked = !!char.inCampaign;
  const toast = useSheetToast();   // null fora da ficha
  const setUsed = (i, used) => {
    const arr = [...(char.spellSlotsUsed || [])];
    while (arr.length <= i) arr.push(0);
    arr[i] = used;
    update({ spellSlotsUsed: arr });
  };
  const gem = (row, k, n, spentN, kind) => {
    const spent = slotSpent(k, n, spentN);
    const circle = slotCircleLabel(row.i + 1, lang);
    return (
      <button key={`${kind}${k}`} type="button" disabled={locked}
        className={`fh-sm-gem is-${kind}${spent ? ' is-spent' : ''}`}
        aria-label={gemLabel(kind === 'pact' ? `${circle} (${pt ? 'pacto' : 'pact'})` : circle, k, n, spent, lang)}
        title={locked ? lockedSlotTitle(true, lang) : slotTapTitle(spent, lang)}
        onClick={locked ? undefined : () => {
          const next = slotTap(spentN, n, spent);
          const before = [...(char.spellSlotsUsed || [])];
          setUsed(row.i, kind === 'pact' ? row.rSpent + next : row.pSpent + next);
          // Mesmo retorno das gemas de recurso: o aviso diz o que mudou e desfaz. Devolver um
          // espaço pelo toque continua valendo (Recuperação Arcana, Fonte de Magia, Pérola do Poder…).
          const left = row.max - row.used + (spent ? 1 : -1);
          toast?.show({
            ms: 5000,
            text: spent
              ? (pt ? `${circle}: +1 espaço devolvido (${left}/${row.max})` : `${circle}: +1 slot restored (${left}/${row.max})`)
              : (pt ? `${circle}: −1 espaço (${left === 1 ? 'resta' : 'restam'} ${left}/${row.max})` : `${circle}: −1 slot (${left}/${row.max} left)`),
            onAction: toast.patchChar ? () => toast.patchChar({ spellSlotsUsed: before }) : undefined,
          });
        }} />
    );
  };
  const tmpl = `auto ${colsR ? `repeat(${colsR}, var(--fh-sm-cell))` : ''} ${colsP ? `var(--fh-sm-gap-col) repeat(${colsP}, var(--fh-sm-cell))` : ''} 1fr`;
  return (
    <div className="fh-slot-matrix" role="group" aria-label={pt ? 'Espaços de magia' : 'Spell slots'}
      style={{ gridTemplateColumns: tmpl }}>
      <span className="fh-sm-head fh-sm-corner">{pt ? 'Círculo' : 'Level'}</span>
      {colsR > 0 && <span className="fh-sm-head is-long" style={{ gridColumn: `span ${colsR}` }}>🌙 {pt ? 'Descanso longo' : 'Long rest'}</span>}
      {colsP > 0 && <span className="fh-sm-sep" aria-hidden="true" />}
      {colsP > 0 && <span className="fh-sm-head is-short" style={{ gridColumn: `span ${colsP}` }}>☕ {pt ? 'Descanso curto · Pacto' : 'Short rest · Pact'}</span>}
      <span className="fh-sm-head fh-sm-count" />
      {rows.map(row => (
        <div key={row.i} className="fh-sm-row" style={{ display: 'contents' }}>
          <span className="fh-sm-lvl">{row.i + 1}</span>
          {Array.from({ length: colsR }, (_, k) => (k < row.r ? gem(row, k, row.r, row.rSpent, 'slot') : <span key={`e${k}`} className="fh-sm-empty" />))}
          {colsP > 0 && <span className="fh-sm-sep" aria-hidden="true" />}
          {Array.from({ length: colsP }, (_, k) => (k < row.p ? gem(row, k, row.p, row.pSpent, 'pact') : <span key={`ep${k}`} className="fh-sm-empty" />))}
          <span className="fh-sm-count">{row.max - row.used}/{row.max}</span>
        </div>
      ))}
    </div>
  );
};

const UnifiedSpellsHUD = ({ char, lang, update, slots, casters, spellAb: propSpellAb, spellDc: propSpellDc, spellAtk: propSpellAtk }) => {
  const pt = lang === 'pt';
  const hasSlots = slots && slots.length > 0 && slots.some(s => s);

  const groups = useMemo(() => {
    const list = casters && casters.length > 0 ? casters : [char];
    const map = new Map();
    list.forEach(c => {
      const ab = (Utils.spellcastingAbilityOfClass ? Utils.spellcastingAbilityOfClass(c) : Utils.spellcastingAbility(c)) || propSpellAb || 'int';
      const dc = propSpellDc != null ? propSpellDc : (8 + Utils.profBonus(char) + Utils.abilityMod(char, ab));
      const atk = propSpellAtk != null ? propSpellAtk : (Utils.profBonus(char) + Utils.abilityMod(char, ab));
      const rawSh = String(t(ab + 'Sh', lang) || ab);
      const abilSh = rawSh.charAt(0).toUpperCase() + rawSh.slice(1).toLowerCase();
      const cName = c.className || char.className || '';
      if (!map.has(ab)) {
        map.set(ab, { ability: ab, abilSh, dc, atk, classes: [cName] });
      } else {
        map.get(ab).classes.push(cName);
      }
    });
    return Array.from(map.values());
  }, [casters, char, lang, propSpellAb, propSpellDc, propSpellAtk]);

  return (
    <div className="fh-spells-unified-hud">
      <div className="fh-spells-hud-top">
        <div className="fh-spell-stats-cards">
          {groups.map(g => (
            <div key={g.ability} className="fh-spell-stat-card-pair">
              <div className="fh-spell-stat-card card-dc" title={pt ? `Classe de Dificuldade de Magia (${g.abilSh})` : `Spell Save DC (${g.abilSh})`}>
                <span className="fh-spell-stat-val">{g.dc}</span>
                <span className="fh-spell-stat-lbl">{pt ? 'CD de magia' : 'Spell save DC'} <span className="fh-spell-stat-ab">{g.abilSh}</span></span>
              </div>
              <div className="fh-spell-stat-card card-atk" title={pt ? `Bônus de Ataque Mágico (${g.abilSh})` : `Spell Attack Bonus (${g.abilSh})`}>
                <span className="fh-spell-stat-val">{Utils.fmtMod(g.atk)}</span>
                <span className="fh-spell-stat-lbl">{pt ? 'Ataque mágico' : 'Spell attack'} <span className="fh-spell-stat-ab">{g.abilSh}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {hasSlots && (
        <div className="fh-spells-hud-slots">
          {char.inCampaign && (
            <div className="fh-slots-lock">
              <Icon name="lock" size={12} aria-hidden="true" /> {pt ? 'Em campanha: os espaços são gastos pelo Conjurar ou pelo mestre.' : 'In a campaign: slots are spent by Cast or by the DM.'}
            </div>
          )}
          <SlotMatrix char={char} lang={lang} slots={slots} update={update} />
        </div>
      )}
    </div>
  );
};

// Mesmo bloco do topo do painel Conjuração da aba Magias (CD, ataque e espaços), para a
// aba Jogar mostrar o mesmo painel. null para quem não conjura pela classe.
// onOpenSpells (só a aba Jogar): botão no pé do painel que leva à aba Magias, onde se conjura.
export const SpellcastingSummary = ({ char, lang, update, slots, onOpenSpells = null }) => {
  const multi = Utils.isMulticlass(char);
  const single = !!Utils.spellcastingAbility(char) && (Utils.casterViews(char).length > 0 || Utils.spellSlots(char).some(Boolean));
  const casters = multi ? Utils.casterViews(char) : (single ? [char] : []);
  if (!casters.length) return null;
  return (
    <section className="fh-panel fh-spells fh-spellcasting">
      <FhMedalDefs />
      <FhTitle>{lang === 'pt' ? 'Conjuração' : 'Spellcasting'}</FhTitle>
      <UnifiedSpellsHUD char={char} lang={lang} update={update} slots={slots} casters={casters} />
      {onOpenSpells && (
        <button type="button" className="fh-atk-more" onClick={onOpenSpells}>
          {lang === 'pt' ? 'Abrir Magias: lista e Conjurar' : 'Open Spells: list and Cast'} <span aria-hidden="true">›</span>
        </button>
      )}
    </section>
  );
};

// Aba Magias: espaços (compartilhados entre as classes) e uma seção por classe
// conjuradora — em multiclasse cada uma tem atributo, CD, limites e lista próprios.
// `placed` (src/sheet/feature-placement.js): os traços de magia e de truques de cada classe
// ficam na seção dela; os de classe sem seção (ex.: Monge das Sombras), num painel no fim.
const SheetSpells = ({ char, lang, update, slots, roll, placed, stance = null, onStance = null }) => {
  const multi = Utils.isMulticlass(char);
  // Só conjura quem tem espaços ou truques no nível atual (Paladino/Patrulheiro 2014 só no nível 2).
  const singleCaster = !!Utils.spellcastingAbility(char) && (Utils.casterViews(char).length > 0 || Utils.spellSlots(char).some(Boolean));
  const casters = multi ? Utils.casterViews(char) : (singleCaster ? [char] : []);
  const hasGrants = grantEntriesOf(char).length > 0;
  if (!casters.length && !hasGrants) {
    return (
      <div className="card text-center" style={{ padding: 'var(--s-7)' }}>
        <Icon name="sparkle" size={36} style={{ color: 'var(--gold-deep)', marginBottom: 12 }}/>
        <p className="muted">{!multi && Utils.spellcastingAbility(char) && ['paladin', 'ranger'].includes(char.className)
          ? (lang === 'pt' ? 'Você ganha magias a partir do nível 2.' : 'You gain spells starting at level 2.')
          : t('notSpellcaster', lang)}</p>
      </div>
    );
  }

  // Magias sem `cls` pertencem à classe inicial.
  const scoped = (view) => {
    if (!multi) return { view: char, save: update };
    const mine = (s) => (s.cls || char.className) === view.className;
    const tag = view.className === char.className ? {} : { cls: view.className };
    return {
      view: { ...view, spells: (char.spells || []).filter(mine) },
      save: (patch) => ('spells' in patch
        ? update({ ...patch, spells: [...(char.spells || []).filter(s => !mine(s)), ...patch.spells.map(s => ({ ...s, ...tag }))] })
        : update(patch)),
    };
  };

  return (
    <>
      {/* degradê dourado dos medalhões de CD e ataque: um só por aba (id único) */}
      <FhMedalDefs />
      {slots && slots.length > 0 && slots.some(s => s) && casters.length === 0 && (
        <section className="fh-panel">
          <FhTitle>{t('slots', lang)}</FhTitle>
          {char.inCampaign && (
            <div className="fh-slots-lock">
              <Icon name="lock" size={12} aria-hidden="true" /> {lang === 'pt' ? 'Em campanha: os espaços são gastos pelo Conjurar ou pelo mestre.' : 'In a campaign: slots are spent by Cast or by the DM.'}
            </div>
          )}
          {slots.map((max, idx) => {
            if (!max) return null;
            const used = (char.spellSlotsUsed && char.spellSlotsUsed[idx]) || 0;
            const campaignLocked = !!char.inCampaign;
            const circle = slotCircleLabel(idx + 1, lang);
            return (
              <div key={idx} className="slot-row fh-slot-line">
                <div className="slot-level">{circle}</div>
                <div className="slot-pips">
                  {Array.from({ length: max }).map((_, i) => {
                    // Gasta da direita para a esquerda; tocar de novo devolve (toque errado).
                    const spent = slotSpent(i, max, used);
                    return (
                      <button
                        key={i} type="button"
                        className={`slot-pip ${spent ? 'used' : ''} ${campaignLocked ? 'locked' : ''}`}
                        disabled={campaignLocked}
                        aria-label={gemLabel(circle, i, max, spent, lang)}
                        title={campaignLocked ? lockedSlotTitle(true, lang) : slotTapTitle(spent, lang)}
                        onClick={campaignLocked ? undefined : () => {
                          const arr = [...(char.spellSlotsUsed || [])];
                          while (arr.length <= idx) arr.push(0);
                          arr[idx] = slotTap(used, max, spent);
                          update({ spellSlotsUsed: arr });
                        }}
                      />
                    );
                  })}
                </div>
                <span className="fh-gem-count">{max - used}/{max}</span>
              </div>
            );
          })}
        </section>
      )}


      {/* Forma Selvagem fica na aba Jogar (painel completo, com Forma Estelar). */}

      {(casters.length > 0 || hasGrants) && (
        <SpellcastingPanel char={char} lang={lang} update={update} slots={slots} roll={roll}
          casters={casters} multi={multi} scoped={scoped} hasGrants={hasGrants} stance={stance} onStance={onStance} />
      )}
    </>
  );
};

// Painel único de Conjuração: CD/ataque por atributo, matriz de espaços e abas —
// "Todas" (padrão: toda magia pronta, de todas as fontes, por círculo), uma aba por
// classe conjuradora (preparar/aprender) e "Talento e espécie" quando houver.
const SpellcastingPanel = ({ char, lang, update, slots, roll, casters, multi, scoped, hasGrants, stance = null, onStance = null }) => {
  const pt = lang === 'pt';
  const [tab, setTab] = useState('all');
  const tabs = [
    { id: 'all', label: pt ? 'Todas' : 'All spells' },
    ...casters.map(v => ({ id: `cls:${v.className}`, label: tName('class', v.className, lang) })),
    ...(hasGrants ? [{ id: 'grants', label: pt ? 'Talento e espécie' : 'Feat & species' }] : []),
  ];
  const active = tabs.some(x => x.id === tab) ? tab : 'all';
  return (
    <section className="fh-panel fh-spells fh-spellcasting">
      {/* "Próximo d20": vale para a jogada de ataque das magias de ataque (as outras não rolam d20) */}
      <FhTitle act={stance && onStance ? <FhAdv3 value={stance} onChange={onStance} lang={lang} /> : null}>{pt ? 'Conjuração' : 'Spellcasting'}</FhTitle>
      {casters.length > 0 && <UnifiedSpellsHUD char={char} lang={lang} update={update} slots={slots} casters={casters} />}
      <div className="fh-spell-tabs" role="tablist" aria-label={pt ? 'Magias' : 'Spells'}>
        {tabs.map(x => (
          <button key={x.id} type="button" role="tab" aria-selected={active === x.id}
            className={`fh-spell-tab${active === x.id ? ' is-on' : ''}`} onClick={() => setTab(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="fh-spell-tabpanel" role="tabpanel">
        {active === 'all' && <AllSpellsList char={char} lang={lang} update={update} slots={slots} roll={roll} casters={casters} multi={multi} scoped={scoped} />}
        {casters.map(v => {
          if (active !== `cls:${v.className}`) return null;
          const { view, save } = scoped(v);
          return <ClassSpells key={v.className} char={view} lang={lang} update={save} slots={slots} roll={roll} showClass={multi} hud={false} bare />;
        })}
        {active === 'grants' && <GrantedSpellsSection char={char} lang={lang} update={update} slots={slots} roll={roll} bare />}
      </div>
    </section>
  );
};

// Lista consolidada: o que está pronto para conjurar agora (preparadas, conhecidas,
// sempre preparadas da subclasse, truques e magias de talento/espécie), por círculo.
const AllSpellsList = ({ char, lang, update, slots, roll, casters, multi, scoped }) => {
  const pt = lang === 'pt';
  const catalog = Utils.spellCatalog(char);
  const seen = new Set();
  const items = [];
  const push = (entry, def, atk, src, save) => {
    if (!def || seen.has(entry.id)) return;
    seen.add(entry.id);
    items.push({ ...entry, def, atk, src, save });
  };
  casters.forEach(v => {
    const { view, save } = scoped(v);
    const ab = Utils.spellcastingAbilityOfClass(view);
    const atk = ab ? Utils.profBonus(char) + Utils.abilityMod(char, ab) : null;
    let prog = null;
    try { prog = computeProgression(view); } catch { prog = null; }
    const auto = new Set([...(prog?.autoSpells || []), ...(prog?.autoCantrips || [])]);
    const entries = [...(view.spells || [])];
    auto.forEach(id => { if (!entries.some(e => e.id === id)) entries.push({ id, auto: true, prepared: true, alwaysPrepared: true }); });
    const prepared = Utils.isPreparedCaster(view);
    const book = Book.usesSpellbook(view);
    entries.forEach(e => {
      if (isGrantEntry(e)) return;
      const def = catalog.find(x => x.id === e.id);
      if (!def) return;
      const isAuto = auto.has(e.id) || e.auto || e.alwaysPrepared;
      const ready = def.level === 0 || isAuto || !prepared || (book ? Book.isPreparedEntry(e) : e.prepared !== false);
      if (ready) push({ ...e, alwaysPrepared: isAuto || e.alwaysPrepared }, def, atk, multi ? tName('class', v.className, lang) : null, save);
    });
  });
  let grantUses = {};
  try { grantUses = speciesGrants(char).spellUses || {}; } catch { /* sem espécie */ }
  grantEntriesOf(char).forEach(e => {
    const def = catalog.find(x => x.id === e.id);
    const src = grantedSpells(char).find(g => g.id === e.id);
    const atk = src?.ability ? Utils.profBonus(char) + Utils.abilityMod(char, src.ability) : null;
    // magia de talento/espécie de 1º círculo ou mais: tem uso livre (sem gastar espaço)
    push({ ...e, free: def && def.level > 0 ? freeUseOf(char, e.species ? grantUses[e.id] : null) : null },
      def, atk, src?.from?.[lang] || (pt ? 'Talento/espécie' : 'Feat/species'), update);
  });
  const byLevel = groupByLevel(items);
  const levels = Object.keys(byLevel).sort((a, b) => +a - +b);
  if (!levels.length) {
    return <div className="fh-spells-empty">{pt ? 'Nenhuma magia pronta. Use as abas das classes para preparar ou aprender.' : 'No spells ready. Use the class tabs to prepare or learn spells.'}</div>;
  }
  return (
    <>
      {levels.map(lvl => {
        const max = +lvl > 0 ? ((slots || [])[+lvl - 1] || 0) : 0;
        return (
          <details key={lvl} className={`spell-group fh-by-level${max > 0 ? ' has-gems' : ''}`} open>
            <summary>
              <span>{levelLabel(lvl, lang)}</span>
              {max > 0
                ? <SlotGems lang={lang} lvl={+lvl} max={max} used={((char.spellSlotsUsed || [])[+lvl - 1]) || 0} />
                : <span className="spell-group-count mono">{byLevel[lvl].length}</span>}
            </summary>
            {byLevel[lvl].sort((a, b) => tName('spellName', a.id, lang).localeCompare(tName('spellName', b.id, lang))).map(s => (
              <SpellRow key={s.id} spell={s} lang={lang} showPrepared={false} char={char} slots={slots} update={update}
                spellAtk={s.atk} roll={roll} free={s.free || null}
                tag={s.src ? <span className="fh-spell-src">{s.src}</span> : null} />
            ))}
          </details>
        );
      })}
    </>
  );
};

// Magias de talento (Iniciado em Magia…) e de espécie (Tiferino, Elfo…): com a
// origem e o atributo próprios — aparecem até para quem não conjura pela classe.
const GrantedSpellsSection = ({ char, lang, update, slots, roll, bare = false }) => {
  const pt = lang === 'pt';
  const catalog = Utils.spellCatalog(char);
  const entries = grantEntriesOf(char)
    .map(s => ({ ...s, def: catalog.find(x => x.id === s.id) })).filter(s => s.def);
  if (!entries.length) return null;
  const sources = grantedSpells(char);
  let uses = {};
  try { uses = speciesGrants(char).spellUses || {}; } catch { /* sem espécie */ }
  const groups = [];
  for (const s of entries) {
    const src = sources.find(g => g.id === s.id && g.source === (s.feat ? 'feat' : 'species'));
    const label = src?.from?.[lang] || (s.feat ? (pt ? 'Talento' : 'Feat') : (pt ? 'Espécie' : 'Species'));
    const ability = src?.ability || null;
    let g = groups.find(x => x.label === label && x.ability === ability);
    if (!g) groups.push(g = { label, ability, list: [] });
    g.list.push(s);
  }
  const Wrap = bare ? 'div' : 'section';
  return (
    <Wrap className={bare ? 'fh-spells-bare' : 'fh-panel fh-spells'}>
      {!bare && <FhTitle>{pt ? 'Magias de talento e espécie' : 'Feat and species spells'}</FhTitle>}
      <div className="fh-spells-note">
        {pt ? 'Não dependem da classe: truques à vontade; magias de 1º círculo ou mais 1× por descanso longo sem gastar espaço (ou com seus espaços, se tiver).'
          : 'Not tied to your class: cantrips at will; level 1+ spells once per long rest without a slot (or with your slots, if you have them).'}
      </div>
      {groups.map(g => {
        const atk = g.ability ? Utils.profBonus(char) + Utils.abilityMod(char, g.ability) : null;
        return (
          <details key={`${g.label}-${g.ability}`} className="spell-group" open>
            <summary>
              <span>{g.label}</span>
              <span className={`spell-group-count mono${g.ability ? ' fh-group-info' : ''}`}>
                {g.ability ? `${t(g.ability, lang)} · ${t('spellSaveDc', lang)} ${8 + atk} · ${Utils.fmtMod(atk)}` : g.list.length}
              </span>
            </summary>
            {g.list.map(s => (
              <SpellRow key={s.id} spell={s} lang={lang} showPrepared={false} char={char} slots={slots} update={update} spellAtk={atk} roll={roll}
                free={s.def.level > 0 ? freeUseOf(char, s.species ? uses[s.id] : null) : null}
                tag={s.species && uses[s.id] ? <UsesTag uses={uses[s.id]} char={char} lang={lang} /> : null} />
            ))}
          </details>
        );
      })}
    </Wrap>
  );
};

// feats: { spells, cantrips } — traços desta classe (src/sheet/feature-placement.js): os de magia
// embaixo dos medalhões; os de truque logo acima dos truques.
const ClassSpells = ({ char, lang, update, slots, roll, showClass, hud = true, bare = false, feats = { spells: [], cantrips: [] }, multiFeats = false }) => {
  const spellAb = Utils.spellcastingAbilityOfClass(char);
  const spellDc = spellAb ? 8 + Utils.profBonus(char) + Utils.abilityMod(char, spellAb) : null;
  const spellAtk = spellAb ? Utils.profBonus(char) + Utils.abilityMod(char, spellAb) : null;

  // Modo trapaça: qualquer lista, qualquer nível, sem limite.
  const cheat = !!char.cheatMode;
  const isPrepared = Utils.isPreparedCaster(char);
  const maxLvl = cheat ? 9 : Utils.maxSpellLevel(char);
  const cantripLimit = cheat ? Infinity : Utils.cantripsKnown(char);
  const preparedLimit = isPrepared ? (cheat ? Infinity : Utils.preparedSpellsLimit(char)) : null;
  const inList = sp => cheat || Utils.inSpellList(char, sp);

  const prog = useMemo(() => {
    try { return computeProgression(char); } catch { return null; }
  }, [char]);
  const progAutoSpells = prog?.autoSpells || [];
  const progAutoCantrips = prog?.autoCantrips || [];
  const progAutoSet = useMemo(() => new Set([...progAutoSpells, ...progAutoCantrips]), [progAutoSpells, progAutoCantrips]);

  const allEntries = char.spells || [];
  const existingMap = new Map(allEntries.map(s => [s.id, s]));
  const synthesizedEntries = [...allEntries];
  [...progAutoSpells, ...progAutoCantrips].forEach(id => {
    if (!existingMap.has(id)) {
      synthesizedEntries.push({ id, auto: true, prepared: true, alwaysPrepared: true });
    }
  });

  const grants = grantStateOf(char);
  const grantIds = new Set(grants.entries.map(s => s.id));
  const spellEntries = synthesizedEntries.filter(s => !isGrantEntry(s) && !grants.isTakenOver(s));
  const autoIds = new Set([
    ...spellEntries.filter(s => s.auto || s.alwaysPrepared).map(s => s.id),
    ...progAutoSet,
  ]);
  // Entradas da classe fora da lista dela (sobras de outra classe, Segredos Mágicos…): sinalizadas.
  const offList = new Set(cheat ? [] : spellEntries.filter(s => {
    if (s.auto || s.alwaysPrepared || autoIds.has(s.id)) return false;
    const def = Utils.spellCatalog(char).find(x => x.id === s.id);
    return def && !Utils.inSpellList(char, def);
  }).map(s => s.id));
  const cantripIds = spellEntries.filter(s => {
    const def = Utils.spellCatalog(char).find(x => x.id === s.id);
    return def && def.level === 0;
  }).map(s => s.id);
  const preparedIds = spellEntries.filter(s => {
    const def = Utils.spellCatalog(char).find(x => x.id === s.id);
    return def && def.level > 0;
  }).map(s => s.id);

  // Mago: prepara só magias do grimório.
  const book = Book.usesSpellbook(char);
  const bookIds = new Set(book ? Book.spellbookIds(char) : []);
  const classSpells = Utils.spellCatalog(char).filter(sp => !grantIds.has(sp.id) && (((book ? bookIds.has(sp.id) : inList(sp)) && sp.level <= maxLvl) || autoIds.has(sp.id)));
  const classCantrips = Utils.spellCatalog(char).filter(sp => !grantIds.has(sp.id) && (inList(sp) || autoIds.has(sp.id)) && sp.level === 0);

  const removeSpell = (id) => {
    if (autoIds.has(id)) return;
    update({ spells: allEntries.filter(s => isGrantEntry(s) || s.id !== id) });
  };

  // Known caster: ability to add new known spells via dropdown
  // Fonte única do "já tem" (src/progression/known.js): ficha, talentos, espécie, opções.
  const available = unknownSpells(char, Utils.spellCatalog(char)).filter(sp => inList(sp) && sp.level <= maxLvl && !grantIds.has(sp.id));
  const addKnownSpell = (id) => {
    const def = Utils.spellCatalog(char).find(s => s.id === id);
    const count = (def?.level === 0 ? cantripIds : preparedIds).filter(id => !autoIds.has(id)).length;
    const limit = def?.level === 0 ? cantripLimit : (cheat ? Infinity : Utils.knownSpellLimit(char));
    if (!def || count >= limit || allEntries.some(s => s.id === id)) return;
    update({ spells: [...allEntries, { id, prepared: true }] });
  };

  const Wrap = bare ? 'div' : 'section';
  return (
    <Wrap className={bare ? 'fh-spells-bare' : `fh-panel fh-spells${showClass ? ' class-spells' : ''}`}>
      {!bare && <FhTitle>{lang === 'pt' ? `Magias de ${tName('class', char.className, lang)}` : `${tName('class', char.className, lang)} spells`}</FhTitle>}
      
      {/* HUD unificado de conjuração: Cartões CD/Ataque com atributo e Espaços Horizontais */}
      {hud && <UnifiedSpellsHUD char={char} lang={lang} update={update} slots={slots} spellAb={spellAb} spellDc={spellDc} spellAtk={spellAtk} />}

      {isPrepared ? (
        <PreparedSpellsView
          lang={lang}
          char={char}
          spellEntries={spellEntries}
          classCantrips={classCantrips}
          classSpells={classSpells}
          autoIds={autoIds}
          cantripLimit={cantripLimit}
          preparedLimit={preparedLimit}
          maxLvl={maxLvl}
          spellAtk={spellAtk}
          roll={roll}
          slots={slots}
          update={update}
          book={book}
          offList={offList}
          onRemove={removeSpell}
          
          isTakenOver={grants.isTakenOver}
        />
      ) : (
        <KnownSpellsView
          lang={lang}
          char={char}
          spellEntries={spellEntries}
          available={available}
          onAddSpell={addKnownSpell}
          onRemove={removeSpell}
          offList={offList}
          spellAtk={spellAtk}
          roll={roll}
          slots={slots}
          update={update}
          
        />
      )}
    </Wrap>
  );
};

// Agrupa entradas de magia por círculo: { 0: [...], 1: [...] }.
const groupByLevel = (list) => {
  const out = {};
  list.forEach(s => { (out[s.def.level] ||= []).push(s); });
  return out;
};

// "Nível 1" virou "1º círculo", o mesmo texto da linha de espaços (src/sheet/gem-text.js)
const levelLabel = (lvl, lang) => (+lvl === 0 ? t('cantrips', lang) : slotCircleLabel(+lvl, lang));

// Conjuradores preparados: a ficha mostra só o que está pronto, agrupado por círculo
// (fechado até tocar). A escolha diária acontece no modal "Preparar magias".
// cantripFeats: os traços de truque da classe (ClassSpells), desenhados logo acima dos truques.
const PreparedSpellsView = ({ lang, char, spellEntries, classCantrips, classSpells, autoIds, cantripLimit, preparedLimit, maxLvl, spellAtk, roll, slots, update, book = false, offList = new Set(), onRemove, cantripFeats = null, isTakenOver = () => false }) => {
  const pt = lang === 'pt';
  const [picking, setPicking] = useState(false);
  const catalog = Utils.spellCatalog(char);
  const entries = spellEntries || char.spells || [];
  // Mago: magias do grimório não preparadas ficam só na seção Grimório.
  const ready = entries
    .map(cs => {
      const isAuto = autoIds.has(cs.id) || cs.auto || cs.alwaysPrepared;
      return {
        ...cs,
        auto: isAuto,
        alwaysPrepared: isAuto,
        prepared: isAuto ? true : cs.prepared,
        def: catalog.find(s => s.id === cs.id),
      };
    })
    .filter(s => s.def && !isGrantEntry(s) && !isTakenOver(s) && !(book && Book.isInBook(char, s) && !Book.isPreparedEntry(s)));
  const byLevel = groupByLevel(ready);
  const nonAuto = (lvl0) => ready.filter(s => !s.alwaysPrepared && !s.auto && !autoIds.has(s.id) && (s.def.level === 0) === lvl0).length;
  const fmt = (n) => (Number.isFinite(n) ? n : '∞');
  const hasSpells = classSpells.some(s => s.level > 0);
  // 2024: Bardo, Feiticeiro e Bruxo trocam as preparadas ao subir de nível (os demais, no descanso longo).
  const swapOnLevel = char.rulesVersion === '2024' && ['bard', 'sorcerer', 'warlock'].includes(char.className);

  return (
    <>
      <div className="spells-toolbar">
        <div className="spells-counters">
          {cantripLimit > 0 && (
            <span className="spell-count"><span className="muted">{t('cantrips', lang)}</span> <b className="mono">{nonAuto(true)}/{fmt(cantripLimit)}</b></span>
          )}
          {maxLvl > 0 && (
            <span className={`spell-count ${nonAuto(false) > preparedLimit ? 'over' : ''}`}><span className="muted">{pt ? 'Preparadas' : 'Prepared'}</span> <b className="mono">{nonAuto(false)}/{fmt(preparedLimit)}</b></span>
          )}
        </div>
        {(hasSpells || cantripLimit > 0) && (
          <button className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>
            <Icon name="sparkle" size={14}/> {pt ? 'Preparar magias' : 'Prepare spells'}
          </button>
        )}
      </div>

      {swapOnLevel && maxLvl > 0 && (
        <div className="fh-spells-note">
          {pt ? 'Você troca uma magia preparada quando sobe de nível (não no descanso).' : 'You swap one prepared spell when you level up (not on a rest).'}
        </div>
      )}
      <OffListWarning lang={lang} char={char} offList={offList} onRemove={onRemove} />
      

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => {
        const max = +lvl > 0 ? ((slots || [])[+lvl - 1] || 0) : 0;
        return (
        <details key={lvl} className={`spell-group fh-by-level${max > 0 ? ' has-gems' : ''}`} open>
          <summary>
            <span>{levelLabel(lvl, lang)}</span>
            {max > 0
              ? <SlotGems lang={lang} lvl={+lvl} max={max} used={((char.spellSlotsUsed || [])[+lvl - 1]) || 0} />
              : <span className="spell-group-count mono">{byLevel[lvl].length}</span>}
          </summary>
          {byLevel[lvl].map(s => (
            <SpellRow key={s.id} spell={s} lang={lang} showPrepared={false} char={char} slots={slots} update={update} spellAtk={spellAtk} roll={roll}
              tag={offList.has(s.id) ? <OffListTag lang={lang} /> : null} />
          ))}
        </details>
        );
      })}

      {!ready.length && (
        <div className="empty-card">
          <Icon name="sparkle" size={28}/>
          <div>{maxLvl > 0 || cantripLimit > 0 ? (pt ? 'Nenhuma magia preparada ainda.' : 'No spells prepared yet.') : (pt ? 'Nenhum espaço de magia ainda — aumente de nível.' : 'No spell slots yet — level up.')}</div>
          {(hasSpells || cantripLimit > 0) && (
            <button className="btn btn-sm btn-primary" onClick={() => setPicking(true)}>{pt ? 'Preparar magias' : 'Prepare spells'}</button>
          )}
        </div>
      )}

      {book && (
        <SpellbookSection lang={lang} char={char} preparedLimit={preparedLimit} maxLvl={maxLvl}
          spellAtk={spellAtk} roll={roll} slots={slots} update={update} />
      )}

      {picking && (
        <PrepareSpellsModal
          lang={lang} char={char}
          classCantrips={classCantrips} classSpells={classSpells.filter(s => s.level > 0)}
          autoIds={autoIds} cantripLimit={cantripLimit} preparedLimit={preparedLimit}
          update={update} onClose={() => setPicking(false)} book={book}
        />
      )}
    </>
  );
};

// Magia da classe fora da lista dela (ex.: Mísseis Mágicos num Druida, que sobrou de outra classe).
const OffListTag = ({ lang }) => (
  <span className="spell-tag-warn" title={lang === 'pt' ? 'Não é da lista desta classe' : 'Not on this class list'}>
    {lang === 'pt' ? 'fora da lista' : 'off-list'}
  </span>
);

const OffListWarning = ({ lang, char, offList, onRemove }) => {
  if (!offList.size) return null;
  const pt = lang === 'pt';
  return (
    <div className="card fh-offlist">
      <div className="text-sm">
        {pt ? `Estas magias não são da lista de ${tName('class', char.className, lang)} — provavelmente sobraram de outra classe. Se não vierem de um recurso especial (como Segredos Mágicos), remova-as:`
          : `These spells aren't on the ${tName('class', char.className, lang)} list — probably left over from another class. Unless a special feature grants them (like Magical Secrets), remove them:`}
      </div>
      <div className="fh-offlist-acts">
        {[...offList].map(id => (
          <button key={id} type="button" className="btn btn-ghost btn-sm" onClick={() => onRemove && onRemove(id)}>
            <Icon name="x" size={12}/> {tName('spellName', id, lang)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Grimório do Mago: todas as magias do livro, com a estrela de preparada
// (respeita o limite, exceto no modo trapaça) e cópia de magias achadas.
const SpellbookSection = ({ lang, char, preparedLimit, maxLvl, spellAtk, roll, slots, update }) => {
  const pt = lang === 'pt';
  const [copying, setCopying] = useState(false);
  const catalog = Utils.spellCatalog(char);
  const entries = (char.spells || [])
    .filter(s => Book.isInBook(char, s))
    .map(s => ({ ...s, prepared: Book.isPreparedEntry(s), def: catalog.find(x => x.id === s.id) }))
    .filter(s => s.def);
  const byLevel = groupByLevel(entries);
  const nPrepared = Book.preparedFromBook(char).length;
  const atLimit = nPrepared >= preparedLimit;
  const expected = Book.spellbookSize(char.level || 1);
  const toggle = (id) => {
    const spells = Book.togglePreparedInBook(char, id, preparedLimit);
    if (spells) update({ spells });
  };
  const remove = (id) => {
    const name = tName('spellName', id, lang);
    if (window.confirm(pt ? `Tirar ${name} do livro de magias?` : `Remove ${name} from the spellbook?`)) update({ spells: Book.removeFromSpellbook(char, id) });
  };

  return (
    <div className="spellbook fh-book">
      <div className="spells-toolbar">
        <div className="spells-counters">
          <span className="eyebrow fh-book-title"><Icon name="book" size={15} aria-hidden="true"/> {pt ? 'Livro de magias' : 'Spellbook'}</span>
          <span className="spell-count" title={pt ? `Sem cópias: 6 + 2 por nível de Mago = ${expected}` : `Without copies: 6 + 2 per Wizard level = ${expected}`}>
            <span className="muted">{pt ? 'Magias' : 'Spells'}</span> <b className="mono">{entries.length}</b><span className="muted text-xs"> / {expected}</span>
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setCopying(true)}>
          <Icon name="plus" size={14}/> {pt ? 'Copiar magia para o livro de magias' : 'Copy spell into spellbook'}
        </button>
      </div>
      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <details key={lvl} className="spell-group fh-by-level">
          <summary>
            <span>{levelLabel(lvl, lang)}</span>
            <span className="spell-group-count mono">{byLevel[lvl].filter(s => s.prepared).length}/{byLevel[lvl].length}</span>
          </summary>
          {byLevel[lvl].map(s => (
            <SpellRow key={s.id} spell={s} lang={lang} showPrepared
              onTogglePrepared={() => toggle(s.id)} preparedDisabled={atLimit || s.def.level > maxLvl}
              onRemove={() => remove(s.id)}
              char={char} slots={slots} update={update} spellAtk={spellAtk} roll={roll} />
          ))}
        </details>
      ))}
      {!entries.length && (
        <div className="fh-spells-empty">
          {pt ? 'Livro de magias vazio. Copie magias de Mago para ele (6 de nível 1 no começo).' : 'Empty spellbook. Copy Wizard spells into it (6 level 1 spells to start).'}
        </div>
      )}
      {copying && <CopySpellModal lang={lang} char={char} maxLvl={maxLvl} update={update} onClose={() => setCopying(false)} />}
    </div>
  );
};

// Copiar magia achada (pergaminho, outro grimório): qualquer magia de Mago de
// círculo que o mago possa preparar; custo em ouro/tempo só informativo.
const CopySpellModal = ({ lang, char, maxLvl, update, onClose }) => {
  const pt = lang === 'pt';
  const cheat = !!char.cheatMode;
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = unknownSpells(char, Book.spellbookCandidates(char, { maxLevel: cheat ? 9 : Math.max(1, maxLvl), anyList: cheat }))
    .filter(sp => !q || `${tName('spellName', sp.id, 'pt')} ${tName('spellName', sp.id, 'en')}`.toLowerCase().includes(q));
  const groups = groupByLevel(list.map(def => ({ id: def.id, def })));
  const copy = (id) => { update({ spells: Book.addToSpellbook(char, [id]) }); onClose(); };
  return (
    <Modal onClose={onClose} title={pt ? 'Copiar magia para o livro de magias' : 'Copy spell into spellbook'}>
      <div className="prep-sticky">
        <div className="muted text-xs" style={{ marginBottom: 6 }}>
          {pt ? 'Custo por círculo: 2 horas e 50 PO (tinta e materiais). Desconte o ouro no inventário.' : 'Cost per spell level: 2 hours and 50 GP (ink and materials). Deduct the gold in your inventory.'}
          {cheat && (pt ? ' Modo trapaça: qualquer magia.' : ' Cheat mode: any spell.')}
        </div>
        <input aria-label={pt ? 'Buscar magia…' : 'Search spell…'} placeholder={pt ? 'Buscar magia…' : 'Search spell…'} value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      {Object.keys(groups).sort((a, b) => +a - +b).map(lvl => (
        <details key={lvl} className="spell-group" open={!!q || Object.keys(groups).length <= 3}>
          <summary>
            <span>{levelLabel(lvl, lang)}</span>
            <span className="spell-group-count mono">{Book.copyCost(+lvl).gp} {pt ? 'PO' : 'GP'} · {Book.copyCost(+lvl).hours} h</span>
          </summary>
          {groups[lvl].map(({ def: sp }) => (
            <div key={sp.id} className="prep-row">
              <button type="button" className="prep-toggle" onClick={() => copy(sp.id)}>
                <span className="prep-check"><Icon name="plus" size={13}/></span>
                <span className="prep-name">
                  {tName('spellName', sp.id, lang)}
                  {sp.ritual && <span className="prep-tag r">R</span>}
                </span>
                <span className="prep-meta"><ArtIcon src={schoolIcon(sp.school)} emoji={SCHOOL_EMOJI[sp.school]} size={14} /> {tName('school', sp.school, lang)} · {Utils.spellMeta(sp, lang).castingTime}</span>
              </button>
            </div>
          ))}
        </details>
      ))}
      {!list.length && <div className="muted text-sm" style={{ padding: 12 }}>{pt ? 'Nenhuma magia encontrada.' : 'No spells found.'}</div>}
      <div className="modal-actions sticky">
        <button className="btn btn-ghost" onClick={onClose}>{pt ? 'Fechar' : 'Close'}</button>
      </div>
    </Modal>
  );
};

// Modal de preparação: rascunho local, salva tudo de uma vez.
// Entradas fora da lista da classe (talentos, itens) e automáticas são preservadas.
const PrepareSpellsModal = ({ lang, char, classCantrips, classSpells, autoIds, cantripLimit, preparedLimit, update, onClose, book = false }) => {
  const pt = lang === 'pt';
  const listIds = new Set([...classCantrips, ...classSpells].map(s => s.id));
  const initial = (char.spells || []).filter(s => listIds.has(s.id) && !autoIds.has(s.id)
    && !(book && Book.isInBook(char, s) && !Book.isPreparedEntry(s))).map(s => s.id);
  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState('');
  const [openInfo, setOpenInfo] = useState(null);
  const q = query.trim().toLowerCase();
  const match = (sp) => !q || `${tName('spellName', sp.id, 'pt')} ${tName('spellName', sp.id, 'en')}`.toLowerCase().includes(q);

  const cantripSet = new Set(classCantrips.map(s => s.id));
  const nCantrips = draft.filter(id => cantripSet.has(id)).length;
  const nSpells = draft.length - nCantrips;
  const full = (sp) => (sp.level === 0 ? nCantrips >= cantripLimit : nSpells >= preparedLimit);
  const toggle = (sp) => {
    if (autoIds.has(sp.id)) return;
    if (draft.includes(sp.id)) setDraft(draft.filter(id => id !== sp.id));
    else if (!full(sp)) setDraft([...draft, sp.id]);
  };

  const save = () => {
    // Mago: as magias continuam no grimório; só muda `prepared`.
    if (book) { update({ spells: Book.applyPreparedDraft(char, draft, listIds, autoIds) }); onClose(); return; }
    const kept = (char.spells || []).filter(s => !listIds.has(s.id) || autoIds.has(s.id));
    const prev = new Map((char.spells || []).map(s => [s.id, s]));
    update({ spells: [...kept, ...draft.map(id => prev.get(id) || { id, prepared: true })] });
    onClose();
  };

  const groups = {};
  [...(cantripLimit > 0 ? classCantrips : []), ...classSpells].filter(match).forEach(sp => { (groups[sp.level] ||= []).push(sp); });
  const fmt = (n) => (Number.isFinite(n) ? n : '∞');

  return (
    <Modal onClose={onClose} title={pt ? 'Preparar magias' : 'Prepare spells'}>
      <div className="prep-sticky">
        <div className="spells-counters">
          {cantripLimit > 0 && <span className={`spell-count ${nCantrips >= cantripLimit ? 'full' : ''}`}><span className="muted">{t('cantrips', lang)}</span> <b className="mono">{nCantrips}/{fmt(cantripLimit)}</b></span>}
          {classSpells.length > 0 && <span className={`spell-count ${nSpells >= preparedLimit ? 'full' : ''}`}><span className="muted">{pt ? 'Preparadas' : 'Prepared'}</span> <b className="mono">{nSpells}/{fmt(preparedLimit)}</b></span>}
        </div>
        {((cantripLimit > 0 && nCantrips >= cantripLimit) || (classSpells.length > 0 && nSpells >= preparedLimit)) && (
          <p className="prep-limit-note" role="status">
            {pt ? 'Limite atingido: desmarque uma para trocar por outra.' : 'Limit reached: uncheck one to swap it for another.'}
          </p>
        )}
        <input aria-label={pt ? 'Buscar magia…' : 'Search spell…'} placeholder={pt ? 'Buscar magia…' : 'Search spell…'} value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {Object.keys(groups).sort((a, b) => +a - +b).map(lvl => {
        const list = groups[lvl];
        const picked = list.filter(sp => draft.includes(sp.id) || autoIds.has(sp.id)).length;
        return (
          <details key={lvl} className="spell-group" open={!!q || Object.keys(groups).length <= 3}>
            <summary>
              <span>{levelLabel(lvl, lang)}</span>
              <span className="spell-group-count mono">{picked}/{list.length}</span>
            </summary>
            {list.map(sp => {
              const auto = autoIds.has(sp.id);
              const on = auto || draft.includes(sp.id);
              const blocked = !on && full(sp);
              return (
                <div key={sp.id} className={`prep-row ${on ? 'on' : ''} ${blocked ? 'blocked' : ''}`}>
                  <button type="button" className="prep-toggle" disabled={auto || blocked} onClick={() => toggle(sp)}
                    role="checkbox" aria-checked={on}
                    aria-label={`${tName('spellName', sp.id, lang)}${auto ? (pt ? ' (sempre preparada)' : ' (always prepared)') : ''}`}
                    title={blocked ? (pt ? 'Limite atingido: desmarque uma para trocar' : 'Limit reached: uncheck one to swap') : undefined}>
                    <span className="prep-check">{on && <Icon name="check" size={13}/>}</span>
                    <span className="prep-name">
                      {tName('spellName', sp.id, lang)}
                      {auto && <span className="prep-tag">{pt ? 'sempre' : 'always'}</span>}
                      {sp.concentration && <span className="prep-tag c">C</span>}
                      {sp.ritual && <span className="prep-tag r">R</span>}
                    </span>
                    <span className="prep-meta"><ArtIcon src={schoolIcon(sp.school)} emoji={SCHOOL_EMOJI[sp.school]} size={14} /> {tName('school', sp.school, lang)} · {Utils.spellMeta(sp, lang).castingTime}</span>
                  </button>
                  <button type="button" className="prep-info" aria-expanded={openInfo === sp.id}
                    aria-label={pt ? `Descrição de ${tName('spellName', sp.id, lang)}` : `Description of ${tName('spellName', sp.id, lang)}`}
                    onClick={() => setOpenInfo(openInfo === sp.id ? null : sp.id)}>
                    <Icon name={openInfo === sp.id ? 'chevron-up' : 'chevron-down'} size={14}/>
                  </button>
                  {openInfo === sp.id && (
                    <div className="prep-desc">
                      <div className="text-xs muted">{Utils.spellMeta(sp, lang).range} · {Utils.spellMeta(sp, lang).components} · {Utils.spellMeta(sp, lang).duration}</div>
                      <div className="text-sm">{sp.desc?.[lang]}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </details>
        );
      })}
      {!Object.keys(groups).length && <div className="muted text-sm" style={{ padding: 12 }}>{pt ? 'Nenhuma magia encontrada.' : 'No spells found.'}</div>}

      <div className="modal-actions sticky">
        <button className="btn btn-ghost" onClick={onClose}>{pt ? 'Cancelar' : 'Cancel'}</button>
        <button className="btn btn-primary" onClick={save}>{pt ? 'Salvar' : 'Save'}</button>
      </div>
    </Modal>
  );
};

const KnownSpellsView = ({ lang, char, spellEntries, available, onAddSpell, onRemove, spellAtk, roll, slots, update, offList = new Set(), cantripFeats = null }) => {
  const known = spellEntries.map(cs => {
    const def = Utils.spellCatalog(char).find(s => s.id === cs.id);
    return { ...cs, def };
  }).filter(s => s.def);

  const byLevel = {};
  known.forEach(s => {
    if (!byLevel[s.def.level]) byLevel[s.def.level] = [];
    byLevel[s.def.level].push(s);
  });

  return (
    <>
      <div className="fh-spell-add">
        <select value="" aria-label={lang === 'pt' ? 'Adicionar magia' : 'Add spell'} onChange={e => { if (e.target.value) onAddSpell(e.target.value); }}>
          <option value="">+ {lang === 'pt' ? 'Adicionar magia' : 'Add spell'}...</option>
          {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
            const list = available.filter(s => s.level === lvl);
            if (list.length === 0) return null;
            return (
              <optgroup key={lvl} label={levelLabel(lvl, lang)}>
                {list.map(s => <option key={s.id} value={s.id}>{tName('spellName', s.id, lang)}</option>)}
              </optgroup>
            );
          })}
        </select>
      </div>

      <OffListWarning lang={lang} char={char} offList={offList} onRemove={onRemove} />
      

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <details key={lvl} className="spell-group fh-by-level" open>
          <summary>
            <span>{levelLabel(lvl, lang)}</span>
            <span className="spell-group-count mono">{byLevel[lvl].length}</span>
          </summary>
          {byLevel[lvl].map(s => (
            <SpellRow
              key={s.id} spell={s} lang={lang}
              showPrepared={false}
              tag={offList.has(s.id) ? <OffListTag lang={lang} /> : null}
              onRemove={() => onRemove(s.id)}
              char={char}
              slots={slots}
              update={update}
              spellAtk={spellAtk}
              roll={roll}
            />
          ))}
        </details>
      ))}

      {known.length === 0 && (
        <div className="fh-spells-empty">
          {lang === 'pt' ? 'Nenhuma magia conhecida.' : 'No spells known.'}
        </div>
      )}
    </>
  );
};

/** Emblema da escola de magia (ícone ilustrado quando houver; senão o símbolo da escola). */
const SchoolBadge = ({ school, lang, size = 30 }) => (
  <ArtThumb src={schoolIcon(school)} emoji={SCHOOL_EMOJI[school] || '✦'} size={size} round lang={lang}
    title={tName('school', school, lang)} className="school-badge" />
);

// Linha de magia no visual "Ficha Forjada" (src/sheet/ficha.css). Só design: abrir/fechar,
// a estrela de preparada, o seletor de espaço, Conjurar e remover são os de antes.
// - O cabeçalho é um <button aria-expanded>; a estrela é um botão IRMÃO (antes ficava
//   dentro do cabeçalho clicável; botão dentro de botão é HTML inválido).
// - Etiqueta de círculo ("Truque" / "1º círculo"), sub "escola · tempo · alcance" e as
//   marcas C/R. Sem espaço livre para conjurar (o mesmo canCast do botão), a linha esmaece.
// Espaços de um círculo como diamantes à direita do cabeçalho: aceso = disponível,
// apagado = gasto. Só leitura (gastar é pelo Conjurar / descanso).
const SlotGems = ({ lang, lvl, max, used }) => {
  const left = Math.max(0, max - used);
  const pt = lang === 'pt';
  return (
    <span className="fh-slot-gems" role="img"
      aria-label={pt ? `${left} de ${max} espaços de ${lvl}º círculo disponíveis` : `${left} of ${max} level ${lvl} slots available`}
      title={pt ? `${left}/${max} espaços disponíveis` : `${left}/${max} slots available`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`fh-slot-gem${i < left ? ' is-on' : ' is-spent'}`} aria-hidden="true" />
      ))}
    </span>
  );
};

// Seletor de círculo em 9 seções: abaixo do círculo da magia e acima do maior espaço
// livre ficam apagados; círculos sem espaço livre no meio, travados. Mostra como a
// magia escala (dados) no círculo escolhido, ou a regra do texto quando não são dados.
const SlotSlider = ({ lang, spellLevel, slots, char, value, onChange, spellId, text }) => {
  const pt = lang === 'pt';
  const free = (i) => ((slots || [])[i] || 0) - ((char.spellSlotsUsed || [])[i] || 0);
  const maxFree = [...Array(9).keys()].reverse().find(i => free(i) > 0);
  const top = maxFree == null ? 0 : maxFree + 1;
  const sc = scaledDice(spellId, spellLevel, value);
  const rule = higherLevelText(text);
  // Só os círculos que existem para este personagem, do círculo da magia até o maior
  // espaço que ele tem (um mago de nível 1 via 8 seções mortas). Um círculo só: sem seletor.
  const have = [...Array(9).keys()].reverse().find(i => ((slots || [])[i] || 0) > 0);
  const last = Math.max(spellLevel, have == null ? 0 : have + 1);
  const span = last - spellLevel + 1;
  return (
    <div className={`fh-slot-slider${span <= 1 ? ' is-single' : ''}`}>
      {span > 1 && <div className="fh-ss-k">{pt ? 'Conjurar com espaço de' : 'Cast with a slot of'}</div>}
      {span > 1 && <div className="fh-ss-track" role="radiogroup" aria-label={pt ? 'Círculo do espaço' : 'Slot level'} style={{ '--fh-ss-n': span }}>
        {Array.from({ length: span }, (_, k) => {
          const i = spellLevel - 1 + k;
          const lvl = i + 1;
          const out = lvl < spellLevel || lvl > top;
          const none = !out && free(i) <= 0;
          const on = lvl === value && !out && !none;
          return (
            <button key={lvl} type="button" role="radio" aria-checked={on} disabled={out || none}
              className={`fh-ss-seg${out ? ' is-out' : ''}${none ? ' is-none' : ''}${on ? ' is-on' : ''}${lvl > spellLevel && !out ? ' is-up' : ''}`}
              title={out ? (lvl < spellLevel ? (pt ? 'Abaixo do círculo da magia' : 'Below the spell level') : (pt ? 'Sem espaço deste círculo' : 'No slot this high'))
                : none ? (pt ? 'Espaços deste círculo gastos' : 'Slots of this level spent')
                  : `${slotCircleLabel(lvl, lang)} · ${free(i)}/${(slots || [])[i]}`}
              onClick={() => onChange(lvl)}>
              {lvl}º
            </button>
          );
        })}
      </div>}
      {value > spellLevel && (sc?.plus || rule) && (
        <div className="fh-ss-hint">
          ↑ {slotCircleLabel(value, lang)}: {sc?.at ? <><b>{sc.base}</b> → <b className="fh-ss-up">{sc.at}</b></> : sc?.plus ? <b className="fh-ss-up">{sc.plus}</b> : <span>{rule}</span>}
        </div>
      )}
      {value === spellLevel && sc?.base && <div className="fh-ss-hint muted">{sc.base}{rule ? ` · ${pt ? 'sobe por círculo' : 'scales per level'}` : ''}</div>}
    </div>
  );
};

// Dano ou cura de uma magia, lido do MESMO texto de regra que a linha mostra (nada de tabela
// à parte): o primeiro dado antes de "Em Níveis Superiores", "+ modificador de conjuração"
// quando o texto diz, os degraus do truque (5º, 11º e 17º nível) e o aumento por círculo do
// espaço quando o texto os traz. Sem certeza, devolve null (ficam os dados roláveis do texto).
const SPELL_HL = /(At Higher Levels|Using a Higher-Level Spell Slot|Cantrip Upgrade|Em Níveis Superiores|Usando um Espaço de Magia de Círculo Superior|Aprimoramento de Truque)/i;
const spellRollInfo = (text, { isCantrip, charLevel, spellLevel, slotLevel, abilityMod }) => {
  const s = String(text || '');
  if (!s) return null;
  const cut = s.search(SPELL_HL);
  const main = cut > 0 ? s.slice(0, cut) : s;
  const m = /(\d+)d(\d+)(?:\s*\+\s*(\d+)(?!\s*d))?/.exec(main);
  if (!m) return null;
  let count = +m[1];
  const sides = +m[2];
  const flat = m[3] ? +m[3] : 0;
  const after = main.slice(m.index + m[0].length, m.index + m[0].length + 90);
  const around = main.slice(Math.max(0, m.index - 90), m.index + m[0].length + 60);
  const plusMod = /^\s*(\+|plus|mais)\s*(your|o seu|seu|a sua|sua)\s*(spellcasting ability modifier|modificador de (habilidade|atributo) de conjuração)/i.test(after);
  const heal = /(hit points|pontos de vida)/i.test(around) && /(regains?|restores?|recupera|restaura)/i.test(around);
  const dmg = !heal && /^[^.]{0,40}(damage|dano)/i.test(after);
  if (!heal && !dmg) return null;
  if (plusMod && abilityMod == null) return null;
  if (isCantrip) {
    const tiers = [...s.matchAll(/(\d{1,2})\s*(?:th|º|°)?(?:\s*(?:level|nível))?\s*\((\d+)d(\d+)\)/gi)]
      .map(t => ({ at: +t[1], n: +t[2], d: +t[3] })).filter(t => [5, 11, 17].includes(t.at) && t.d === sides);
    const scales = /(damage increases|dano (desta magia |da magia )?aumenta)/i.test(s);
    if (scales && tiers.length < 3 && (charLevel || 1) >= 5) return null;
    for (const t of tiers) if ((charLevel || 1) >= t.at) count = Math.max(count, t.n);
  } else if (slotLevel > spellLevel) {
    const hl = cut > 0 ? s.slice(cut) : '';
    const inc = /(?:increases by|aumenta em)\s+(\d+)d(\d+)\s+(?:for each|para cada)/i.exec(hl);
    if (!inc || +inc[2] !== sides) return null;
    count += +inc[1] * (slotLevel - spellLevel);
  }
  const multi = /(three|two|três|dois|duas)\s+(glowing\s+)?(darts|rays|beams|dardos|raios|feixes)/i.test(main);
  const mod = flat + (plusMod ? abilityMod : 0);
  return { count, sides, mod, kind: heal ? 'heal' : 'dmg', multi, text: `${count}d${sides}${mod ? ` ${mod < 0 ? '−' : '+'} ${Math.abs(mod)}` : ''}` };
};

// Uso livre de uma magia de talento/espécie: quantas vezes sem gastar espaço e em qual descanso
// volta. { max, per: 'long' | 'short', atWill }. Gasto fica em char.freeCasts (descanso longo)
// ou char.freeCastsShort (descanso curto); RestButtons zera.
const freeUseOf = (char, uses) => {
  if (uses === 'atWill') return { atWill: true, max: Infinity, per: 'long' };
  if (uses === 'short') return { max: 1, per: 'short' };
  if (uses === 'profBonus') return { max: Utils.profBonus(char), per: 'long' };
  return { max: 1, per: 'long' };
};

const SpellRow = ({ spell, lang, showPrepared, onTogglePrepared, onRemove, char, slots, update, spellAtk, roll, preparedDisabled, preparedIcon, tag = null, free = null }) => {
  const [open, setOpen] = useState(false);
  const [casting, setCasting] = useState(false);
  const [error, setError] = useState('');
  const bodyId = useId();
  const toast = useSheetToast(); // null fora da ficha (editor do mestre)
  const sp = spell.def;
  const isCantrip = sp.level === 0;
  const inCampaign = !!char?.inCampaign;
  const pt = lang === 'pt';
  const name = tName('spellName', sp.id, lang);
  // "Reação, que você realiza quando…" enchia a linha fechada (139px contra 80 das outras):
  // ela mostra só "Reação" e o gatilho inteiro vai para o corpo aberto (castTrigger).
  const metaFull = Utils.spellMeta(sp, lang);
  const castFull = String(metaFull.castingTime || '');
  const castShort = castFull.split(/,\s| que você | which you | when you /i)[0].trim() || castFull;
  const castTrigger = castShort !== castFull ? castFull : '';
  const meta = { ...metaFull, castingTime: castShort };
  // Linha fechada: escola (componentes sem o material), duração, alcance e salvaguarda/ataque.
  const comps = String(meta.components || sp.components || '').replace(/\s*\([^)]*\)/g, '').trim();
  const material = (String(meta.components || sp.components || '').match(/\(([^)]+)\)/) || [])[1] || '';
  const mech = spellMechanics(sp.id);
  const tags = (sp.rulesVersion === '2024' || !SPELL_TAGS.legacy?.[sp.id]) ? SPELL_TAGS.spells?.[sp.id] : SPELL_TAGS.legacy[sp.id];
  const saveAb = mech?.save || (tags?.save ? null : undefined); // null = salvaguarda sem atributo conhecido
  const isAtk = !!(mech?.atk || (!mech && tags?.atk));
  const dc = spellAtk != null ? 8 + spellAtk : null;
  // Ficha 2014 lê o SRD 5.1; magia que não está nele (nem no SRD 5.2.1, na ficha 2024) não tem
  // texto livre: fica o resumo e o link para a D&D Beyond (src/sheet/spell-text.js)
  const legacy = char?.rulesVersion !== '2024';
  const fullText = useSpellText(sp.id, open, legacy);
  const ddb = open && !fullText && spellTextLoaded(legacy) ? ddbSpellUrl(tName('spellName', sp.id, 'en')) : null;

  // Slot selecionado pra conjurar (default: nível mínimo possível = nível da magia)
  const available = (slots || []).map((max, i) => {
    const used = (char.spellSlotsUsed || [])[i] || 0;
    return { level: i + 1, max, used, free: max - used };
  }).filter(x => x.level >= sp.level && x.free > 0);
  const [chosenSlot, setChosenSlot] = useState(sp.level || 1);
  // sincronia: se o nível escolhido não está disponível, escolhe o mínimo disponível
  const effectiveSlot = available.find(x => x.level === chosenSlot) ? chosenSlot : (available[0]?.level || sp.level);

  // Uso livre (magia de talento/espécie de 1º círculo ou mais): conjura sem gastar espaço
  const freeKey = free?.per === 'short' ? 'freeCastsShort' : 'freeCasts';
  const freeUsed = free && !free.atWill ? Math.max(0, +((char?.[freeKey] || {})[sp.id]) || 0) : 0;
  const freeLeft = free && !isCantrip ? (free.atWill ? Infinity : Math.max(0, free.max - freeUsed)) : 0;
  const restName = free?.per === 'short' ? (pt ? 'descanso curto' : 'short rest') : (pt ? 'descanso longo' : 'long rest');

  // Dano / cura num botão grande ao lado do Conjurar (como ATAQUE | DANO das armas)
  const abilityMod = spellAtk != null ? spellAtk - Utils.profBonus(char) : null;
  const rollText = open ? (fullText?.en || sp.desc?.en || fullText?.pt || sp.desc?.pt || '') : '';
  const slotForDice = isCantrip ? 0 : (freeLeft > 0 ? sp.level : effectiveSlot);
  const dice = open && roll ? spellRollInfo(rollText, { isCantrip, charLevel: char?.level || 1, spellLevel: sp.level, slotLevel: slotForDice, abilityMod }) : null;

  const castFree = () => {
    setError('');
    const prev = { ...(char[freeKey] || {}) };
    if (!free.atWill) update({ [freeKey]: { ...prev, [sp.id]: freeUsed + 1 } });
    if (isAtk && spellAtk != null) roll({ die: 20, mod: spellAtk, label: name + ' ' + t('attackRoll', lang), isAttack: true });
    const parts = [pt ? `Você conjurou ${name} sem gastar espaço.` : `You cast ${name} without a slot.`];
    if (saveAb !== undefined && dc != null) {
      const ab = saveAb ? (t(saveAb + 'Sh', lang) || saveAb.toUpperCase()) : '';
      parts.push(pt ? `Alvo faz salvaguarda${ab ? ` de ${ab}` : ''}, CD ${dc}.` : `Target makes a${ab ? ` ${ab}` : ''} save, DC ${dc}.`);
    }
    if (!free.atWill) {
      const left = free.max - freeUsed - 1;
      parts.push(left > 0
        ? (pt ? `Usos livres: ${left} de ${free.max}.` : `Free uses: ${left} of ${free.max}.`)
        : (pt ? `Uso livre gasto: volta no ${restName}.` : `Free use spent: back on a ${restName}.`));
    }
    toast?.show({
      tone: 'spell', text: parts.join(' '), ms: free.atWill ? 4500 : 6000,
      ...(free.atWill ? {} : { onAction: () => (toast?.patchChar ? toast.patchChar({ [freeKey]: prev }) : update({ [freeKey]: prev })) }),
    });
  };

  const cast = async () => {
    setError('');
    setCasting(true);
    try {
      const lvl = isCantrip ? 0 : effectiveSlot;
      const prevUsed = [...(char.spellSlotsUsed || [])];
      let usedNow = prevUsed;
      let undo = null;
      if (typeof char.id === 'number' && inCampaign) {
        // Backend faz o desconto atomicamente
        const res = await api.castSpell(char.id, { spellId: sp.id, slotLevel: lvl });
        // res.character.data tem o novo spellSlotsUsed; propaga via update merge
        const data = res.character.data || {};
        usedNow = data.spellSlotsUsed || char.spellSlotsUsed || [];
        update({ spellSlotsUsed: usedNow });
      } else if (!isCantrip) {
        // Standalone (local OR remoto sem campanha): aplica local
        const arr = [...prevUsed];
        while (arr.length < 9) arr.push(0);
        arr[lvl - 1] = (arr[lvl - 1] || 0) + 1;
        usedNow = arr;
        update({ spellSlotsUsed: arr });
        // fora de campanha o gasto é só da ficha: dá para desfazer um toque errado
        undo = () => (toast?.patchChar ? toast.patchChar({ spellSlotsUsed: prevUsed }) : update({ spellSlotsUsed: prevUsed }));
      }
      // Só magia de ATAQUE rola o d20 (Raio de Fogo). Salvaguarda (Sono), acerto automático
      // (Mísseis Mágicos) e utilidade (Luz) não têm jogada de ataque: o retorno é um aviso
      // com o que o alvo faz e quantos espaços sobraram.
      if (isAtk && spellAtk !== null && spellAtk !== undefined) {
        roll({ die: 20, mod: spellAtk, label: tName('spellName', sp.id, lang) + ' ' + t('attackRoll', lang), isAttack: true });
      }
      const parts = [pt ? `Você conjurou ${name}.` : `You cast ${name}.`];
      if (saveAb !== undefined && dc != null) {
        const ab = saveAb ? (t(saveAb + 'Sh', lang) || saveAb.toUpperCase()) : '';
        parts.push(pt ? `Alvo faz salvaguarda${ab ? ` de ${ab}` : ''}, CD ${dc}.` : `Target makes a${ab ? ` ${ab}` : ''} save, DC ${dc}.`);
      }
      if (!isCantrip) {
        const max = (slots || [])[lvl - 1] || 0;
        const left = Math.max(0, max - (usedNow[lvl - 1] || 0));
        parts.push(pt ? `Espaços de ${slotCircleLabel(lvl, lang)}: ${left} de ${max}.` : `${slotCircleLabel(lvl, lang)} slots: ${left} of ${max} left.`);
      }
      // truque de ataque: a rolagem na tela já é o retorno (não há espaço gasto para contar)
      if (!(isAtk && isCantrip)) toast?.show({ tone: 'spell', text: parts.join(' '), ...(undo ? { onAction: undo } : {}), ms: undo ? 6000 : 4500 });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCasting(false);
    }
  };

  const isAlwaysPrepared = !!(spell.alwaysPrepared || spell.auto);
  const hasSlot = isCantrip || available.length > 0;
  const canCast = hasSlot || freeLeft > 0;
  const starTitle = isAlwaysPrepared
    ? (pt ? 'Magia sempre preparada pela subclasse (fixa)' : 'Always prepared by subclass (fixed)')
    : (spell.prepared ? t('prepared', lang) : (preparedDisabled ? (pt ? 'Limite atingido' : 'Limit reached') : (pt ? 'Preparar' : 'Prepare')));

  return (
    <div className={`spell-row fh-spell${open ? ' open' : ''}${isAlwaysPrepared ? ' is-always-prepared' : ''}${showPrepared && !spell.prepared && !isAlwaysPrepared ? ' unprepared' : ''}${canCast ? '' : ' no-slot'}`}>
      <div className="fh-spell-head">
        {showPrepared && (
          <button
            type="button"
            className={`spell-prepared fh-spell-star ${spell.prepared || isAlwaysPrepared ? 'on' : ''}${isAlwaysPrepared ? ' is-fixed' : ''}`}
            onClick={() => { if (!isAlwaysPrepared && (!preparedDisabled || spell.prepared)) onTogglePrepared(); }}
            disabled={isAlwaysPrepared || (preparedDisabled && !spell.prepared)}
            title={starTitle}
            aria-label={`${t('prepared', lang)}: ${name}`}
            aria-pressed={!!(spell.prepared || isAlwaysPrepared)}
          >
            <Icon name={spell.prepared || isAlwaysPrepared ? 'star-fill' : (preparedIcon || 'star')} size={18} aria-hidden="true"/>
          </button>
        )}
        <button type="button" className="spell-row-header fh-spell-toggle" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(!open)}>
          <SchoolBadge school={sp.school} lang={lang} size={38} />
          <span className="fh-spell-main">
            <span className={`spell-row-name${isAlwaysPrepared ? ' is-always-prepared-name' : ''}`}>
              {name}
              {tag}
            </span>
            <span className="spell-meta fh-spell-meta">
              <span className="fh-sm-school">{tName('school', sp.school, lang)}{comps ? ` (${comps})` : ''}</span>
              <span className="fh-sm-time">{meta.castingTime}</span>
              <span>{meta.duration}</span>
              <span>{meta.range}</span>
              {sp.concentration && <span className="fh-mark is-c" title={pt ? 'Concentração' : 'Concentration'}>C</span>}
              {sp.ritual && <span className="fh-mark is-r" title="Ritual">R</span>}
              {saveAb !== undefined && dc != null && (
                <span className="fh-spell-badge is-save" title={pt ? 'Salvaguarda do alvo contra a sua CD' : 'Target saving throw vs your DC'}>
                  {saveAb ? `${t(saveAb + 'Sh', lang) || saveAb.toUpperCase()} ` : (pt ? 'Salv. ' : 'Save ')}{pt ? 'CD' : 'DC'} {dc}
                </span>
              )}
              {isAtk && spellAtk != null && (
                <span className="fh-spell-badge is-atk" title={pt ? 'Ataque mágico' : 'Spell attack'}>{pt ? 'Atq' : 'Atk'} {Utils.fmtMod(spellAtk)}</span>
              )}
            </span>
          </span>
          <span className="fh-lvl">{isCantrip ? (pt ? 'Truque' : 'Cantrip') : slotCircleLabel(sp.level, lang)}</span>
          {!isCantrip && (() => {
            const spellLvl = sp.level || 1;
            const maxSlots = (slots || [])[spellLvl - 1] || 0;
            const usedSlots = ((char.spellSlotsUsed || [])[spellLvl - 1]) || 0;
            // com uso livre disponível a linha mostra ELE (não gasta espaço); gasto, voltam as gemas
            if (free && !free.atWill && freeLeft > 0) {
              return (
                <span className="fh-free-pip" title={pt ? `Uso livre: ${freeLeft} de ${free.max} por ${restName}, sem gastar espaço` : `Free use: ${freeLeft} of ${free.max} per ${restName}, no slot spent`}>
                  <span className="fh-slot-gem is-on" aria-hidden="true" />
                  <span>{pt ? `livre ${freeLeft}/${free.max}` : `free ${freeLeft}/${free.max}`}</span>
                </span>
              );
            }
            if (maxSlots <= 0) return null;
            return <SlotGems lang={lang} lvl={spellLvl} max={maxSlots} used={usedSlots} />;
          })()}
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} className="fh-spell-chev" aria-hidden="true"/>
        </button>
      </div>
      {open && (
        <div className="spell-row-body fh-spell-body" id={bodyId}>
          {/* tempo, duração e alcance já estão na linha fechada; aqui só o que ela não mostra:
              o material do componente M (a linha fechada mostra "V, S, M" sem o parêntese) */}
          {(material || castTrigger) && (
            <div className="fh-spell-facts">
              {castTrigger && <span className="fh-chipline"><span className="fh-chipline-k">{pt ? 'Tempo' : 'Casting time'}:</span> {castTrigger}</span>}
              {material && <span className="fh-chipline"><span className="fh-chipline-k">{pt ? 'Material' : 'Material'}:</span> {material}</span>}
            </div>
          )}
          <div className="fh-spell-desc">
            <RichText text={fullText?.[lang] || (lang === 'pt' && sp.desc?.pt) || fullText?.en || sp.desc[lang]} lang={lang} />
          </div>
          {ddb && (
            <a className="fh-spell-ddb" href={ddb} target="_blank" rel="noopener noreferrer">
              {pt ? 'Texto completo na D&D Beyond (livro pago)' : 'Full text on D&D Beyond (paid book)'} ↗
            </a>
          )}
          {error && <div className="fh-spell-error">{error}</div>}
          <div className="fh-spell-acts">
            {!isCantrip && freeLeft <= 0 && (
              <SlotSlider lang={lang} spellLevel={sp.level} slots={slots} char={char} value={effectiveSlot}
                onChange={setChosenSlot} spellId={sp.id} text={fullText?.[lang] || fullText?.en || ''} />
            )}
            {/* Uso livre disponível: o botão principal NÃO gasta espaço; "Usar espaço" fica ao lado */}
            {freeLeft > 0 ? (
              <>
                <button type="button" className="btn btn-sm btn-primary fh-spell-cast" onClick={castFree} disabled={casting}>
                  <Icon name="dice" size={14} aria-hidden="true"/> {free.atWill
                    ? (pt ? 'Conjurar (à vontade)' : 'Cast (at will)')
                    : (pt ? 'Conjurar (uso livre)' : 'Cast (free use)')}{isAtk && spellAtk != null ? ` · ${pt ? 'ataque' : 'attack'} ${Utils.fmtMod(spellAtk)}` : ''}
                </button>
                {!free.atWill && hasSlot && (
                  <button type="button" className="btn btn-sm btn-ghost fh-spell-useslot" onClick={cast} disabled={casting}
                    title={pt ? `Gasta um espaço de ${slotCircleLabel(effectiveSlot, lang)} e guarda o uso livre` : `Spends a ${slotCircleLabel(effectiveSlot, lang)} slot and keeps the free use`}>
                    {casting ? '…' : (pt ? 'Usar espaço' : 'Use a slot')}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary fh-spell-cast"
                onClick={cast}
                disabled={!canCast || casting}
                title={!canCast ? (pt ? 'Sem espaço de magia livre' : 'No spell slot left') : undefined}
              >
                <Icon name="dice" size={14} aria-hidden="true"/> {casting ? '…' : (isAtk && spellAtk != null
                  ? `${pt ? 'Conjurar · ataque' : 'Cast · attack'} ${Utils.fmtMod(spellAtk)}`
                  : (isCantrip ? (pt ? 'Conjurar truque' : 'Cast cantrip') : (pt ? 'Conjurar' : 'Cast')))}
              </button>
            )}
            {/* Dano / cura: o segundo toque da sequência, do tamanho do DANO das armas */}
            {dice && (
              <button type="button" className={`fh-atk-btn fh-spell-dice ${dice.kind === 'heal' ? 'is-heal' : 'is-dmg'}`}
                aria-label={`${name}: ${dice.kind === 'heal' ? (pt ? 'rolar cura' : 'roll healing') : (pt ? 'rolar dano' : 'roll damage')} ${dice.text}${dice.multi ? (pt ? ' (cada)' : ' (each)') : ''}`}
                onClick={() => roll({ die: dice.sides, count: dice.count, mod: dice.mod, label: `${name} · ${dice.kind === 'heal' ? (pt ? 'cura' : 'healing') : (pt ? 'dano' : 'damage')}`, isAttack: false, isCheck: false, isSave: false })}>
                <span className="fh-atk-btn-k">{dice.kind === 'heal' ? (pt ? 'Cura' : 'Healing') : (pt ? 'Dano' : 'Damage')}{dice.multi ? (pt ? ' (cada)' : ' (each)') : ''}</span>
                <span className="fh-atk-btn-v">{dice.text}</span>
              </button>
            )}
            {!isCantrip && !canCast && (
              <span className="fh-spell-noslot">
                {pt ? 'sem espaço livre' : 'no slot left'}
              </span>
            )}
            {free && !free.atWill && !isCantrip && freeLeft <= 0 && (
              <span className="fh-spell-freenote">
                {pt ? `Uso livre gasto: volta no ${restName}.` : `Free use spent: back on a ${restName}.`}
              </span>
            )}
            {!inCampaign && onRemove && (
              <button className="btn btn-sm btn-ghost btn-danger fh-spell-remove" onClick={onRemove} title={pt ? 'Remover magia' : 'Remove'} aria-label={pt ? `Remover magia: ${name}` : `Remove: ${name}`}>
                <Icon name="trash" size={16} aria-hidden="true"/>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



// Aviso com "Desfazer" depois de apagar algo de uma lista da ficha (item, arma, anotação):
// devolve o objeto no mesmo lugar. `key` é o campo da ficha (equipment, weapons, notes).
const undoRemoval = (toast, key, idx, obj, text) => {
  if (!toast) return;
  toast.show({
    text,
    onAction: () => toast.patchChar?.((c) => {
      const list = [...(c[key] || [])];
      list.splice(Math.min(idx, list.length), 0, obj);
      return { [key]: list };
    }),
  });
};

// Campo de moeda: enquanto tem foco guarda o texto digitado (antes o valor voltava para 0
// ao apagar e digitar 25 dava "025"); grava ao sair ou no Enter. O foco seleciona tudo.
const CoinInput = ({ value, onCommit, label }) => {
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
const weaponShownName = (w, lang) => {
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
const itemShownName = (item, lang) => {
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
const WeaponCard = ({ w, char, lang, roll, locked, onPatch, onRemove }) => {
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
const SheetInventory = ({ char, lang, update, roll, cls, bg, placed, stance = null, onStance = null }) => {
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
const AutoTextarea = ({ value, minRows = 2, ...props }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} {...props} />;
};

// ===== Story =====
// Três painéis em vez de uma parede de 15 caixas: Personalidade, História e Aparência.
// Cada campo vazio tem uma pergunta que ajuda a escrever (placeholder).
const STORY_HINT = {
  personality: ['O que seu herói faz quando ninguém está olhando? Um jeito, um hábito, uma mania.', 'What does your hero do when no one is watching? A manner, a habit, a quirk.'],
  ideals: ['No que ele acredita a ponto de arriscar a vida?', 'What does the hero believe in enough to risk their life?'],
  bonds: ['Uma pessoa, um lugar ou uma promessa que ele não abandona.', 'A person, a place or a promise the hero will not abandon.'],
  flaws: ['A fraqueza que um inimigo esperto usaria contra ele.', 'The weakness a clever enemy would use against the hero.'],
  backstory: ['De onde veio, o que perdeu, por que saiu para a estrada.', 'Where they came from, what they lost, why they took to the road.'],
  allies: ['Guildas, ordens, famílias e contatos que conhecem o herói.', 'Guilds, orders, families and contacts that know the hero.'],
  treasure: ['Lembranças e riquezas que não são equipamento: uma carta, uma joia de família.', 'Keepsakes and riches that are not gear: a letter, a family jewel.'],
  appearance: ['O que se nota primeiro: cicatrizes, roupas, o jeito de andar.', 'What people notice first: scars, clothes, the way they walk.'],
  symbol: ['Ex.: brasão da família, símbolo sagrado, marca da guilda.', 'E.g. family crest, holy symbol, guild mark.'],
};
const SheetStory = ({ char, lang, update, cls, race }) => {
  const pt = lang === 'pt';
  const hint = (f) => STORY_HINT[f]?.[pt ? 0 : 1];
  const area = (field, long = false, label = null) => (
    <div key={field} className="fh-field">
      <label htmlFor={`story-${field}`}>{label || t(field, lang)}</label>
      <AutoTextarea id={`story-${field}`} minRows={long ? 5 : 2} value={char[field] || ''} placeholder={hint(field)}
        onChange={e => update({ [field]: e.target.value })} className={long ? 'is-long' : undefined} />
    </div>
  );
  return (
    <div className="fh-story-grid">
      <div className="fh-story-col">
        <section className="fh-panel fh-story">
          <FhTitle sub={pt ? 'quem o herói é' : 'who the hero is'}>{pt ? 'Personalidade' : 'Personality'}</FhTitle>
          <div className="fh-story-fields is-quad">
            {['personality', 'ideals', 'bonds', 'flaws'].map(f => area(f))}
          </div>
        </section>
        <section className="fh-panel fh-story">
          <FhTitle sub={pt ? 'como os outros o veem' : 'how others see the hero'}>{t('appearance', lang)}</FhTitle>
          {/* Campos de pergaminho escuro com filete dourado (src/sheet/ficha.css: .fh-story) */}
          <div className="fh-story-fields">
            {area('appearance', false, pt ? 'Descrição física' : 'Physical description')}
            <div className="fh-story-short">
              {['age','height','weight','eyes','skin','hair'].map(f => (
                <div key={f} className="fh-field">
                  <label htmlFor={`story-${f}`}>{t(f, lang)}</label>
                  <input id={`story-${f}`} value={char[f] || ''} onChange={e => update({ [f]: e.target.value })}/>
                </div>
              ))}
            </div>
            <div className="fh-field">
              <label htmlFor="story-symbol">{t('symbol', lang)}</label>
              <input id="story-symbol" value={char.symbol || ''} placeholder={hint('symbol')} onChange={e => update({ symbol: e.target.value })}/>
            </div>
          </div>
        </section>
      </div>
      <div className="fh-story-col">
        <section className="fh-panel fh-story">
          <FhTitle sub={pt ? 'de onde veio e quem conhece' : 'where they came from and who they know'}>{t('stepStory', lang)}</FhTitle>
          <div className="fh-story-fields">
            {area('backstory', true)}
            {area('allies')}
            {area('treasure')}
          </div>
        </section>
      </div>
    </div>
  );
};

// Traços da espécie + resumo das escolhas (linhagem, resistências, magias…).
// Em campanha a troca fica com o mestre; pendências aparecem na faixa do topo.
export const SpeciesTraits = ({ char, lang, update, race, hideTraits = false, embedded = false }) => {
  const [open, setOpen] = useState(false);
  const rows = speciesSummary(char, lang);
  // Numa campanha a troca vira pedido ao mestre (RespecContext); fora dela salva direto.
  const respec = useContext(RespecContext);
  const canEdit = speciesChoiceSpecs(char).length > 0 && (!char.inCampaign || !!respec);
  // na aba Características os traços vão para a linha do tempo; aqui ficam as escolhas
  const traits = hideTraits ? [] : (race?.traits || []);

  if (hideTraits && !rows.length && !canEdit) return null;
  // `embedded`: dentro do nível 1 da linha do tempo (sem painel; título pequeno)
  const Shell = embedded ? 'div' : 'section';
  return (
    <Shell className={embedded ? 'fh-tl-embed fh-tl-species' : 'fh-panel'}>
      {embedded ? <div className="fh-tl-embed-h">{lang === 'pt' ? 'Escolhas da espécie' : 'Species choices'}</div> : <FhTitle>{lang === 'pt' ? (hideTraits ? 'Escolhas da Espécie' : 'Traços da Espécie') : (hideTraits ? 'Species Choices' : 'Species Traits')}</FhTitle>}
      {(rows.length > 0 || canEdit) && (
        <div className="card fh-species-sum">
          {rows.map(([k, v]) => (
            <div key={k} className="fh-species-row">
              <strong>{k}:</strong> <span>{v}</span>
            </div>
          ))}
          {canEdit && (
            <button className="btn btn-sm btn-ghost no-print" onClick={() => setOpen(true)}>
              <Icon name="edit" size={12}/> {lang === 'pt' ? 'Alterar escolhas' : 'Change choices'}
            </button>
          )}
        </div>
      )}
      {/* Traços em linhas (losango + nome); os de nível futuro esmaecidos, com "· nível N" */}
      <div className="fh-traits fh-feats">
        {traits.map((tr, i) => {
          const later = tr.level && (char.level || 1) < tr.level;
          const trName = typeof tr?.name === 'object' ? (tr.name[lang] || tr.name.pt || tr.name.en) : (tr?.name || '');
          const trDesc = typeof tr?.desc === 'object' ? (tr.desc[lang] || tr.desc.pt || tr.desc.en) : (tr?.desc || '');
          return (
            <div key={i} className={`fh-trait${later ? ' is-later' : ''}`}>
              <div className="fh-trait-name">
                <span>{trName}</span>
                {tr.level ? <span className="fh-origin">{lang === 'pt' ? 'nível' : 'level'} {tr.level}</span> : null}
              </div>
              <RichText className="fh-trait-text" text={trDesc} lang={lang} />
            </div>
          );
        })}
      </div>
      {open && <SpeciesChoicesModal char={char} lang={lang} onClose={() => setOpen(false)} askDm={!!(char.inCampaign && respec)}
        onSave={char.inCampaign && respec ? (patch) => respec.submit({ ...char, ...patch }, lang === 'pt' ? 'Escolhas da espécie' : 'Species choices') : update} />}
    </Shell>
  );
};

// ===== Notes / Journal =====
// Data da anotação como "dd/mm/aaaa · hh:mm" (o id é o instante em que ela nasceu; notas
// antigas só têm o texto da data, com segundos: tira os segundos).
const noteDateLabel = (n, lang) => {
  if (typeof n.id === 'number' && n.id > 1e11) {
    const d = new Date(n.id);
    const loc = lang === 'pt' ? 'pt-BR' : 'en-US';
    return `${d.toLocaleDateString(loc)} · ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`;
  }
  return String(n.date || '').replace(/(\d{1,2}:\d{2}):\d{2}/, '$1').replace(', ', ' · ');
};

const SheetNotes = ({ char, lang, update }) => {
  const pt = lang === 'pt';
  const toast = useSheetToast();
  const [fresh, setFresh] = useState(null); // anotação recém-criada: o cursor já entra nela
  const notes = char.notes || [];
  const addNote = () => {
    const id = Date.now();
    const date = new Date(id).toLocaleString(pt ? 'pt-BR' : 'en-US');
    setFresh(id);
    update({ notes: [{ id, date, text: '' }, ...notes] });
  };
  const updateNote = (id, text) => {
    update({ notes: char.notes.map(n => n.id === id ? { ...n, text } : n) });
  };
  // Apagar: anotação com texto pede confirmação; toda exclusão pode ser desfeita no aviso.
  const removeNote = async (n) => {
    if ((n.text || '').trim()) {
      const ok = await confirmDialog({
        lang, danger: true,
        title: pt ? 'Excluir esta anotação?' : 'Delete this note?',
        message: (n.text || '').trim().slice(0, 140) + ((n.text || '').trim().length > 140 ? '…' : ''),
        confirmLabel: pt ? 'Excluir' : 'Delete',
      });
      if (!ok) return;
    }
    const idx = notes.findIndex(x => x.id === n.id);
    update({ notes: notes.filter(x => x.id !== n.id) });
    undoRemoval(toast, 'notes', Math.max(0, idx), n, pt ? 'Anotação excluída.' : 'Note deleted.');
  };
  const addBtn = (
    <button className="btn btn-primary btn-sm fh-note-add" onClick={addNote}>
      <Icon name="plus" size={14}/> {pt ? 'Adicionar anotação' : 'Add note'}
    </button>
  );

  return (
    <section className="fh-panel fh-notes">
      <FhTitle act={notes.length > 0 ? addBtn : null}>{t('tabNotes', lang)}</FhTitle>
      {notes.length === 0 && (
        <div className="fh-empty-state is-cta">
          <p>{pt ? 'Nenhuma anotação ainda. Registre o que aconteceu na sessão: pistas, nomes, promessas.' : 'No notes yet. Write down what happened in the session: clues, names, promises.'}</p>
          {addBtn}
        </div>
      )}
      {/* Cada anotação é uma página de pergaminho escuro, com a data em mono */}
      {notes.map(n => {
        const when = noteDateLabel(n, lang);
        return (
          <div key={n.id} className="card fh-note">
            <div className="fh-note-head">
              <span className="fh-note-date mono">{when}</span>
              <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeNote(n)} aria-label={pt ? `Excluir anotação de ${when}` : `Delete note from ${when}`} title={pt ? 'Excluir anotação' : 'Delete note'}>
                <Icon name="trash" size={14}/>
              </button>
            </div>
            <AutoTextarea minRows={3} autoFocus={fresh === n.id}
              aria-label={pt ? `Anotação de ${when}` : `Note from ${when}`} value={n.text} onChange={e => updateNote(n.id, e.target.value)}
              placeholder={pt ? 'Aventura, encontro, descoberta...' : 'Adventure, encounter, discovery...'}/>
          </div>
        );
      })}
    </section>
  );
};

// Desenho da miniatura de um item sem ilustração: um traço dourado pelo tipo (ou pelo nome,
// para o equipamento comum), no lugar do emoji colorido que destoava do couro e ouro.
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

function InventoryList({ char, lang, update, addItem, updateItem, removeItem, roll = null }) {
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

function InventoryRow({ item, idx, lang, rulesVersion, inCampaign, editable = true, startOpen = false, onToggleEquipped, onToggleAttuned, onSetQty, onOpenPack, onRemove, onSetNotes, onPatchLocal, healDice = null, onDrink = null, wornNote = null }) {
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

export { SheetSpells, SheetInventory, SheetStory, SheetNotes, RestButtons, SchoolBadge };
