import { useId, useState } from 'react';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { api } from '../../api/client.js';
import { errorMessage } from '../../api/errors.js';
import { grantedSpells } from '../../creator/spell-helpers.js';
import { grantTakesOver } from '../../progression/engine.js';
import { DiceText } from '../../dice/dice-text.jsx';
import { RichText } from '../rich-text.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { useSpellText, spellTextLoaded, ddbSpellUrl, spellMechanics, scaledDice, higherLevelText } from '../spell-text.js';
import SPELL_TAGS from '../../../data/spell-tags.json';
import { slotCircleLabel } from '../gem-text.js';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import { SchoolBadge, SlotGems, SlotSlider } from './SlotMatrix.jsx';
import { RestButtons } from './RestButtons.jsx';
export const isGrantEntry = (s) => !!s && typeof s === 'object' && s.auto && (s.feat || s.species);

export const idOf = (s) => (typeof s === 'string' ? s : s?.id);

// Magias de talento/espécie da ficha, já como ficam na próxima gravação
// (applyAutosToCharacter):
// - entries: as gravadas mais as que a ficha ainda não gravou (ficha salva antes de
//   a espécie ganhar a magia, ex.: Magia Firbolg), aparecem do mesmo jeito;
// - isTakenOver(s): entrada comum da classe com o id de uma delas (Firbolg druida que
//   preparou Detectar Magia pelo druida). O motor troca pela da espécie, então ela
//   já sai da lista da classe e não conta nas preparadas (engine.js grantTakesOver).
export function grantStateOf(char) {
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
export const grantEntriesOf = (char) => grantStateOf(char).entries;

// Usos fora do padrão das magias da espécie (Magia Firbolg: 1× por descanso curto;
// Gnomo da Floresta 2024: bônus de proficiência vezes por descanso longo).
export const USES_TAG = {
  short: () => ({ pt: '1×/descanso curto', en: '1/short rest' }),
  atWill: () => ({ pt: 'à vontade', en: 'at will' }),
  profBonus: (char) => { const n = Utils.profBonus(char); return { pt: `${n}×/descanso longo`, en: `${n}/long rest` }; },
};
export const UsesTag = ({ uses, char, lang }) => {
  const text = USES_TAG[uses]?.(char);
  return text ? <span className="spell-tag-uses">{text[lang] || text.pt}</span> : null;
};

/**
 * Botões de descanso. Em campanha: chama backend (recurso autorizado pra dono
 * ou DM). Em standalone: aplica local.
 */
const SPELL_HL = /(At Higher Levels|Using a Higher-Level Spell Slot|Cantrip Upgrade|Em Níveis Superiores|Usando um Espaço de Magia de Círculo Superior|Aprimoramento de Truque)/i;

export const spellRollInfo = (text, { isCantrip, charLevel, spellLevel, slotLevel, abilityMod }) => {
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
export const freeUseOf = (char, uses) => {
  if (uses === 'atWill') return { atWill: true, max: Infinity, per: 'long' };
  if (uses === 'short') return { max: 1, per: 'short' };
  if (uses === 'profBonus') return { max: Utils.profBonus(char), per: 'long' };
  return { max: 1, per: 'long' };
};

export const SpellRow = ({ spell, lang, showPrepared, onTogglePrepared, onRemove, char, slots, update, spellAtk, roll, preparedDisabled, preparedIcon, tag = null, free = null }) => {
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
