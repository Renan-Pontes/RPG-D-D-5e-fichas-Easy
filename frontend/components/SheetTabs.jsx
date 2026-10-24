/* Spells / Inventory / Story / Notes tabs */
import { errorMessage } from '../src/api/errors.js';
import { useId, useState } from 'react';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { restResources } from '../src/progression/resources.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Modal, NumStepper, Pips } from './Shared.jsx';
import ItemPickerModal from '../src/items/ItemPickerModal.jsx';
import { api } from '../src/api/client.js';
import * as FS from '../src/progression/fighting-styles.js';
import * as Book from '../src/progression/spellbook.js';
import { SpeciesChoicesModal, speciesSummary } from '../src/progression/SpeciesChoices.jsx';
import { speciesChoiceSpecs, speciesGrants } from '../src/progression/species.js';
import { grantedSpells } from '../src/creator/spell-helpers.js';
import { grantTakesOver } from '../src/progression/engine.js';
import { propLabel, armorTypeLabel } from '../src/creator/equipment-helpers.js';
import { itemEmoji, schoolIcon, SCHOOL_EMOJI } from '../src/art.js';
import { itemArtFor } from '../src/items/item-art.js';
import { isPack, openPack, packPreview } from '../src/items/packs.js';
import { confirmDialog } from './ConfirmDialog.jsx';
import ArtThumb, { ArtIcon } from '../src/components/ArtThumb.jsx';
import FhTitle from '../src/sheet/FhTitle.jsx';
import FhMedal, { FhMedalDefs } from '../src/sheet/FhMedal.jsx';
import FhFeatures from '../src/sheet/FhFeatures.jsx';
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

// Aba Magias: espaços (compartilhados entre as classes) e uma seção por classe
// conjuradora — em multiclasse cada uma tem atributo, CD, limites e lista próprios.
// `placed` (src/sheet/feature-placement.js): os traços de magia e de truques de cada classe
// ficam na seção dela; os de classe sem seção (ex.: Monge das Sombras), num painel no fim.
const SheetSpells = ({ char, lang, update, slots, roll, placed }) => {
  const multi = Utils.isMulticlass(char);
  // Só conjura quem tem espaços ou truques no nível atual (Paladino/Patrulheiro 2014 só no nível 2).
  const singleCaster = !!Utils.spellcastingAbility(char) && (Utils.casterViews(char).length > 0 || Utils.spellSlots(char).some(Boolean));
  const casters = multi ? Utils.casterViews(char) : (singleCaster ? [char] : []);
  const hasGrants = grantEntriesOf(char).length > 0;
  const spellFeats = placed?.by.spells || [];
  const cantripFeats = placed?.by.cantrips || [];
  const featsOf = (classId) => ({ spells: spellFeats.filter(f => f.classId === classId), cantrips: cantripFeats.filter(f => f.classId === classId) });
  const withSection = new Set(casters.map(v => v.className));
  const looseSpells = spellFeats.filter(f => !withSection.has(f.classId));
  const looseCantrips = cantripFeats.filter(f => !withSection.has(f.classId));
  const loosePanel = (looseSpells.length > 0 || looseCantrips.length > 0) && (
    <section className="fh-panel">
      <FhTitle>{lang === 'pt' ? 'Traços de magia' : 'Spell features'}</FhTitle>
      <FhFeatures items={looseSpells} multi={placed.multi} lang={lang} label={null} className="fh-cf-first" />
      <FhFeatures items={looseCantrips} multi={placed.multi} lang={lang} place="cantrips" />
    </section>
  );
  if (!casters.length && !hasGrants) {
    return (
      <>
        <div className="card text-center" style={{ padding: 'var(--s-7)' }}>
          <Icon name="sparkle" size={36} style={{ color: 'var(--gold-deep)', marginBottom: 12 }}/>
          <p className="muted">{!multi && Utils.spellcastingAbility(char) && ['paladin', 'ranger'].includes(char.className)
            ? (lang === 'pt' ? 'Você ganha magias a partir do nível 2.' : 'You gain spells starting at level 2.')
            : t('notSpellcaster', lang)}</p>
        </div>
        {loosePanel}
      </>
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
      {slots && slots.length > 0 && slots.some(s => s) && (
        <section className="fh-panel">
          <FhTitle act={<RestButtons char={char} lang={lang} update={update} />}>{t('slots', lang)}</FhTitle>
          {char.inCampaign && (
            <div className="muted small" style={{ fontSize: '0.8em', marginBottom: 6 }}>
              🔒 {lang === 'pt' ? 'Em campanha: slots travados. Use "Conjurar" nas magias abaixo.' : 'In campaign: slots locked. Use "Cast" on spells below.'}
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

      {casters.map(v => {
        const { view, save } = scoped(v);
        return <ClassSpells key={v.className} char={view} lang={lang} update={save} slots={slots} roll={roll} showClass={multi}
          feats={featsOf(v.className)} multiFeats={!!placed?.multi} />;
      })}

      <GrantedSpellsSection char={char} lang={lang} update={update} slots={slots} roll={roll} />
      {loosePanel}
    </>
  );
};

// Magias de talento (Iniciado em Magia…) e de espécie (Tiferino, Elfo…): com a
// origem e o atributo próprios — aparecem até para quem não conjura pela classe.
const GrantedSpellsSection = ({ char, lang, update, slots, roll }) => {
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
  return (
    <section className="fh-panel fh-spells">
      <FhTitle>{pt ? 'Magias de talento e espécie' : 'Feat and species spells'}</FhTitle>
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
                tag={s.species && uses[s.id] ? <UsesTag uses={uses[s.id]} char={char} lang={lang} /> : null} />
            ))}
          </details>
        );
      })}
    </section>
  );
};

// feats: { spells, cantrips } — traços desta classe (src/sheet/feature-placement.js): os de magia
// embaixo dos medalhões; os de truque logo acima dos truques.
const ClassSpells = ({ char, lang, update, slots, roll, showClass, feats = { spells: [], cantrips: [] }, multiFeats = false }) => {
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

  const allEntries = char.spells || [];
  // Magias de talento/espécie ficam na seção própria (GrantedSpellsSection), fora das
  // listas e dos limites da classe, inclusive as que a ficha ainda não gravou.
  const grants = grantStateOf(char);
  const grantIds = new Set(grants.entries.map(s => s.id));
  const spellEntries = allEntries.filter(s => !isGrantEntry(s) && !grants.isTakenOver(s));
  const autoIds = new Set(spellEntries.filter(s => s.auto).map(s => s.id));
  // Entradas da classe fora da lista dela (sobras de outra classe, Segredos Mágicos…): sinalizadas.
  const offList = new Set(cheat ? [] : spellEntries.filter(s => {
    if (s.auto) return false;
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
  const available = Utils.spellCatalog(char).filter(sp => inList(sp) && sp.level <= maxLvl && !grantIds.has(sp.id) && !allEntries.find(s => s.id === sp.id));
  const addKnownSpell = (id) => {
    const def = Utils.spellCatalog(char).find(s => s.id === id);
    const count = (def?.level === 0 ? cantripIds : preparedIds).filter(id => !autoIds.has(id)).length;
    const limit = def?.level === 0 ? cantripLimit : (cheat ? Infinity : Utils.knownSpellLimit(char));
    if (!def || count >= limit || allEntries.some(s => s.id === id)) return;
    update({ spells: [...allEntries, { id, prepared: true }] });
  };

  return (
    <section className={`fh-panel fh-spells${showClass ? ' class-spells' : ''}`}>
      <FhTitle>{lang === 'pt' ? `Magias de ${tName('class', char.className, lang)}` : `${tName('class', char.className, lang)} spells`}</FhTitle>
      {/* Atributo de conjuração, CD e bônus de ataque em três medalhões (o antigo cartão) */}
      <div className="fh-spell-stats">
        <FhMedal shape="hex" value={spellAb ? t(spellAb + 'Sh', lang) : '—'} label={t('spellAbility', lang)} sub={spellAb ? t(spellAb, lang) : null} />
        <FhMedal shape="shield" value={spellDc || '—'} label={t('spellSaveDc', lang)} />
        <FhMedal shape="circle" value={spellAtk !== null ? Utils.fmtMod(spellAtk) : '—'} label={t('spellAttack', lang)} />
      </div>
      <FhFeatures items={feats.spells} multi={multiFeats} lang={lang} place="spells" className="fh-cf-spells" />

      {isPrepared ? (
        <PreparedSpellsView
          lang={lang}
          char={char}
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
          cantripFeats={<FhFeatures items={feats.cantrips} multi={multiFeats} lang={lang} place="cantrips" className="fh-cf-cantrips" />}
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
          cantripFeats={<FhFeatures items={feats.cantrips} multi={multiFeats} lang={lang} place="cantrips" className="fh-cf-cantrips" />}
        />
      )}
    </section>
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
const PreparedSpellsView = ({ lang, char, classCantrips, classSpells, autoIds, cantripLimit, preparedLimit, maxLvl, spellAtk, roll, slots, update, book = false, offList = new Set(), onRemove, cantripFeats = null, isTakenOver = () => false }) => {
  const pt = lang === 'pt';
  const [picking, setPicking] = useState(false);
  const catalog = Utils.spellCatalog(char);
  // Mago: magias do grimório não preparadas ficam só na seção Grimório.
  const ready = (char.spells || [])
    .map(cs => ({ ...cs, def: catalog.find(s => s.id === cs.id) }))
    .filter(s => s.def && !isGrantEntry(s) && !isTakenOver(s) && !(book && Book.isInBook(char, s) && !Book.isPreparedEntry(s)));
  const byLevel = groupByLevel(ready);
  const nonAuto = (lvl0) => ready.filter(s => !autoIds.has(s.id) && (s.def.level === 0) === lvl0).length;
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
      {cantripFeats}

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <details key={lvl} className="spell-group fh-by-level">
          <summary>
            <span>{levelLabel(lvl, lang)}</span>
            <span className="spell-group-count mono">{byLevel[lvl].length}</span>
          </summary>
          {byLevel[lvl].map(s => (
            <SpellRow key={s.id} spell={s} lang={lang} showPrepared={false} char={char} slots={slots} update={update} spellAtk={spellAtk} roll={roll}
              tag={offList.has(s.id) ? <OffListTag lang={lang} /> : null} />
          ))}
        </details>
      ))}

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
  const list = Book.spellbookCandidates(char, { maxLevel: cheat ? 9 : Math.max(1, maxLvl), anyList: cheat })
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
        <details key={lvl} className="spell-group" open={!!q}>
          <summary>
            <span>{levelLabel(lvl, lang)}</span>
            <span className="spell-group-count mono">{Book.copyCost(+lvl).gp} PO · {Book.copyCost(+lvl).hours} h</span>
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
        <input aria-label={pt ? 'Buscar magia…' : 'Search spell…'} placeholder={pt ? 'Buscar magia…' : 'Search spell…'} value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {Object.keys(groups).sort((a, b) => +a - +b).map(lvl => {
        const list = groups[lvl];
        const picked = list.filter(sp => draft.includes(sp.id) || autoIds.has(sp.id)).length;
        return (
          <details key={lvl} className="spell-group" open={!!q}>
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
                  <button type="button" className="prep-toggle" disabled={auto || blocked} onClick={() => toggle(sp)}>
                    <span className="prep-check">{on && <Icon name="check" size={13}/>}</span>
                    <span className="prep-name">
                      {tName('spellName', sp.id, lang)}
                      {auto && <span className="prep-tag">{pt ? 'sempre' : 'always'}</span>}
                      {sp.concentration && <span className="prep-tag c">C</span>}
                      {sp.ritual && <span className="prep-tag r">R</span>}
                    </span>
                    <span className="prep-meta"><ArtIcon src={schoolIcon(sp.school)} emoji={SCHOOL_EMOJI[sp.school]} size={14} /> {tName('school', sp.school, lang)} · {Utils.spellMeta(sp, lang).castingTime}</span>
                  </button>
                  <button type="button" className="prep-info" aria-label="info" onClick={() => setOpenInfo(openInfo === sp.id ? null : sp.id)}>
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
      {cantripFeats}

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <details key={lvl} className="spell-group fh-by-level">
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
const SpellRow = ({ spell, lang, showPrepared, onTogglePrepared, onRemove, char, slots, update, spellAtk, roll, preparedDisabled, preparedIcon, tag = null }) => {
  const [open, setOpen] = useState(false);
  const [casting, setCasting] = useState(false);
  const [error, setError] = useState('');
  const bodyId = useId();
  const sp = spell.def;
  const isCantrip = sp.level === 0;
  const inCampaign = !!char?.inCampaign;
  const pt = lang === 'pt';
  const name = tName('spellName', sp.id, lang);
  const meta = Utils.spellMeta(sp, lang);

  // Slot selecionado pra conjurar (default: nível mínimo possível = nível da magia)
  const available = (slots || []).map((max, i) => {
    const used = (char.spellSlotsUsed || [])[i] || 0;
    return { level: i + 1, max, used, free: max - used };
  }).filter(x => x.level >= sp.level && x.free > 0);
  const [chosenSlot, setChosenSlot] = useState(sp.level || 1);
  // sincronia: se o nível escolhido não está disponível, escolhe o mínimo disponível
  const effectiveSlot = available.find(x => x.level === chosenSlot) ? chosenSlot : (available[0]?.level || sp.level);

  const cast = async () => {
    setError('');
    setCasting(true);
    try {
      const lvl = isCantrip ? 0 : effectiveSlot;
      if (typeof char.id === 'number' && inCampaign) {
        // Backend faz o desconto atomicamente
        const res = await api.castSpell(char.id, { spellId: sp.id, slotLevel: lvl });
        // res.character.data tem o novo spellSlotsUsed; propaga via update merge
        const data = res.character.data || {};
        update({ spellSlotsUsed: data.spellSlotsUsed || char.spellSlotsUsed });
      } else if (!isCantrip) {
        // Standalone (local OR remoto sem campanha): aplica local
        const arr = [...(char.spellSlotsUsed || [])];
        while (arr.length < 9) arr.push(0);
        arr[lvl - 1] = (arr[lvl - 1] || 0) + 1;
        update({ spellSlotsUsed: arr });
      }
      // Rolagem de ataque, se aplicável
      if (spellAtk !== null && spellAtk !== undefined) {
        roll({ die: 20, mod: spellAtk, label: tName('spellName', sp.id, lang) + ' ' + t('attackRoll', lang) });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCasting(false);
    }
  };

  const canCast = isCantrip || available.length > 0;
  const starTitle = spell.prepared ? t('prepared', lang) : (preparedDisabled ? (pt ? 'Limite atingido' : 'Limit reached') : (pt ? 'Preparar' : 'Prepare'));

  return (
    <div className={`spell-row fh-spell${open ? ' open' : ''}${showPrepared && !spell.prepared ? ' unprepared' : ''}${canCast ? '' : ' no-slot'}`}>
      <div className="fh-spell-head">
        {showPrepared && (
          <button
            type="button"
            className={`spell-prepared fh-spell-star ${spell.prepared ? 'on' : ''}`}
            onClick={() => { if (!preparedDisabled || spell.prepared) onTogglePrepared(); }}
            disabled={preparedDisabled && !spell.prepared}
            title={starTitle}
            aria-label={`${t('prepared', lang)}: ${name}`}
            aria-pressed={!!spell.prepared}
          >
            <Icon name={spell.prepared ? 'star-fill' : (preparedIcon || 'star')} size={18} aria-hidden="true"/>
          </button>
        )}
        <button type="button" className="spell-row-header fh-spell-toggle" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(!open)}>
          <SchoolBadge school={sp.school} lang={lang} size={38} />
          <span className="fh-spell-main">
            <span className="spell-row-name">{name}{tag}</span>
            <span className="spell-meta">
              <span>{tName('school', sp.school, lang)}</span>
              <span>{meta.castingTime}</span>
              <span>{meta.range}</span>
              {sp.concentration && <span className="fh-mark is-c" title={pt ? 'Concentração' : 'Concentration'}>C</span>}
              {sp.ritual && <span className="fh-mark is-r" title="Ritual">R</span>}
            </span>
          </span>
          <span className="fh-lvl">{isCantrip ? (pt ? 'Truque' : 'Cantrip') : slotCircleLabel(sp.level, lang)}</span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} className="fh-spell-chev" aria-hidden="true"/>
        </button>
      </div>
      {open && (
        <div className="spell-row-body fh-spell-body" id={bodyId}>
          <div className="fh-spell-facts">
            <span className="fh-chipline"><span className="fh-chipline-k">{t('components', lang)}:</span> {meta.components}</span>
            <span className={`fh-chipline${sp.concentration ? ' conc' : ''}`}><span className="fh-chipline-k">{t('duration', lang)}:</span> {meta.duration}</span>
          </div>
          <div className="fh-spell-desc">{sp.desc[lang]}</div>
          {error && <div className="fh-spell-error">{error}</div>}
          <div className="fh-spell-acts">
            {!isCantrip && available.length > 0 && (
              <label className="fh-spell-slot">
                <span className="fh-spell-slot-k">Slot:</span>
                <select
                  value={effectiveSlot}
                  onChange={e => setChosenSlot(parseInt(e.target.value))}
                  className="input"
                  onClick={e => e.stopPropagation()}
                >
                  {available.map(x => (
                    <option key={x.level} value={x.level}>
                      {slotCircleLabel(x.level, lang)} ({x.free}/{x.max}){x.level > sp.level ? ' ↑' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="btn btn-sm btn-primary fh-spell-cast"
              onClick={cast}
              disabled={!canCast || casting}
              title={!canCast ? (pt ? 'Sem slot disponível neste nível' : 'No slot available') : undefined}
            >
              <Icon name="dice" size={14} aria-hidden="true"/> {casting ? '…' : (isCantrip ? (pt ? 'Conjurar truque' : 'Cast cantrip') : (pt ? 'Conjurar' : 'Cast'))}
            </button>
            {!isCantrip && !canCast && (
              <span className="fh-spell-noslot">
                {pt ? 'sem slot' : 'no slot'}
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

/**
 * Botões de descanso. Em campanha: chama backend (recurso autorizado pra dono
 * ou DM). Em standalone: aplica local.
 */
const RestButtons = ({ char, lang, update }) => {
  const [busy, setBusy] = useState(false);
  const restore = async (type) => {
    setBusy(true);
    try {
      if (typeof char.id === 'number') {
        const res = await api.rest(char.id, { type });
        const d = res.character.data || {};
        update({
          spellSlotsUsed: d.spellSlotsUsed,
          wildShapeUses: d.wildShapeUses,
          currentHp: d.currentHp,
          tempHp: d.tempHp,
          conditions: d.conditions,
          deathSaves: d.deathSaves,
          hitDiceUsed: d.hitDiceUsed,
          resourcesUsed: d.resourcesUsed || {},
          // Forma Estelar dura 10 min; qualquer descanso a encerra.
          ...(char.starryForm?.active ? { starryForm: { active: false } } : {}),
        });
      } else {
        // Local — aplica via merge
        const patch = {};
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
          // Pacto em multiclasse fica somado aos outros espaços: não zera tudo (igual ao servidor).
          if (char.className === 'warlock' && !Utils.isMulticlass(char)) patch.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
          if (Utils.hasClass(char, 'druid')) patch.wildShapeUses = char.rulesVersion === '2024' ? Math.max(0, (char.wildShapeUses || 0) - 1) : 0;
        }
        patch.resourcesUsed = restResources(char, type).resourcesUsed;
        update(patch);
      }
    } catch (e) { console.warn('rest failed', e); }
    finally { setBusy(false); }
  };
  return (
    <div className="row gap-1">
      <button className="btn btn-sm btn-ghost" onClick={() => restore('short')} disabled={busy} title={lang === 'pt' ? 'Descanso curto' : 'Short rest'}>
        ☕ {lang === 'pt' ? 'Curto' : 'Short'}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={() => restore('long')} disabled={busy} title={lang === 'pt' ? 'Descanso longo' : 'Long rest'}>
        🛌 {lang === 'pt' ? 'Longo' : 'Long'}
      </button>
    </div>
  );
};

// ===== Inventory =====
// placed (src/sheet/feature-placement.js): traços de itens (infusões, sintonia…) no Equipamento.
// Os demais traços de classe ficam espalhados pela ficha (a antiga lista "Características de
// Classe" daqui virou o painel Outros traços, na aba Atributos).
const SheetInventory = ({ char, lang, update, roll, cls, bg, placed }) => {
  const cls_ = cls;
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
  const removeWeapon = (idx) => update({ weapons: char.weapons.filter((_, i) => i !== idx) });
  const updateWeapon = (idx, patch) => update({ weapons: char.weapons.map((w, i) => i === idx ? { ...w, ...patch } : w) });

  const addItem = () => update({ equipment: [...(char.equipment || []), { name: '', qty: 1 }] });
  const updateItem = (idx, patch) => update({ equipment: char.equipment.map((e, i) => i === idx ? { ...e, ...patch } : e) });
  const removeItem = (idx) => update({ equipment: char.equipment.filter((_, i) => i !== idx) });

  return (
    <>
      <section className="fh-panel fh-armor">
        <FhTitle>{t('armorChoice', lang)}</FhTitle>
        <select value={char.armor || ''} onChange={e => update({ armor: e.target.value || null })}>
          <option value="">{t('noArmor', lang)}</option>
          {SRD.ARMOR.filter(a => a.type !== 'shield').map(a => (
            <option key={a.id} value={a.id}>{tName('armor', a.id, lang)} ({lang === 'pt' ? 'CA' : 'AC'} {a.ac}, {armorTypeLabel(a.type, lang)})</option>
          ))}
        </select>
        <div className="fh-shield-row">
          <input type="checkbox" id="shield2" checked={char.hasShield}
            onChange={e => update({ hasShield: e.target.checked })}/>
          <label htmlFor="shield2">{t('shield', lang)} (+2 CA)</label>
        </div>
      </section>

      <section className="fh-panel">
      <FhTitle>{t('weapons', lang)}</FhTitle>
      <select className="fh-wpn-add" value="" onChange={e => { if (e.target.value) { addWeapon(e.target.value); e.target.value = ''; } }}>
        <option value="">+ {t('addWeapon', lang)}...</option>
        {['simple-melee','simple-ranged','martial-melee','martial-ranged'].map(t_ => (
          <optgroup key={t_} label={WEAPON_GROUP[t_][lang === 'pt' ? 0 : 1]}>
            {SRD.weaponsFor(char.rulesVersion).filter(w => w.type === t_).map(w =>
              <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage})</option>
            )}
          </optgroup>
        ))}
      </select>
      {(char.weapons || []).map((w, i) => {
        const wDef = w.id ? SRD.weaponFor(w.id, char.rulesVersion) : null;
        // Regra da ficha: proficiência, Artes Marciais do Monge e Estilos de Luta.
        const a = Utils.attackFor(char, w);
        const fs = a.fs;
        const atk = a.bonus;
        const dmgMod = a.dmgMod;
        // Cartão da arma (src/sheet/ficha.css: .fh-wpn): [miniatura][nome][lixeira] /
        // [dano][tipo] [ATAQUE +5][DANO 1d8+3] (os botões da aba Jogar) / notas.
        const atkLabel = t('attackRoll', lang);
        const dmgLabel = t('damageRoll', lang);
        return (
          <div key={i} className="card fh-wpn">
            <div className="fh-wpn-top">
              <ArtThumb src={itemArtFor(w)} emoji="⚔️" size={44} lang={lang} />
              <input className="fh-wpn-name" aria-label={lang === 'pt' ? 'Nome da arma' : 'Weapon name'} value={w.name} onChange={e => updateWeapon(i, { name: e.target.value })}/>
              <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeWeapon(i)} aria-label={`${lang === 'pt' ? 'Remover' : 'Remove'} ${w.name}`}>
                <Icon name="trash" size={14}/>
              </button>
            </div>
            <div className="fh-wpn-mid">
              <div className="fh-wpn-fields">
                <input className="fh-wpn-dmg" aria-label="1d8" value={w.damage} onChange={e => updateWeapon(i, { damage: e.target.value })} placeholder="1d8"/>
                <input className="fh-wpn-type" aria-label={lang === 'pt' ? 'tipo' : 'type'} value={w.dmgType ? Utils.damageLabel(w.dmgType, lang) : ''} onChange={e => updateWeapon(i, { dmgType: e.target.value })} placeholder={lang === 'pt' ? 'tipo' : 'type'}/>
              </div>
              <div className="fh-wpn-rolls">
                <button type="button" className="fh-atk-btn is-hit" aria-label={`${w.name}: ${atkLabel} ${Utils.fmtMod(atk)}`}
                  onClick={() => roll({ die: 20, mod: atk, label: w.name + ' ' + t('attackRoll', lang) })}>
                  <span className="fh-atk-btn-k">{atkLabel}</span>
                  <span className="fh-atk-btn-v">{Utils.fmtMod(atk)}</span>
                </button>
                <button type="button" className="fh-atk-btn is-dmg" aria-label={`${w.name}: ${dmgLabel} ${a.damage}`} onClick={() => {
                  const m = String(a.dice || '').match(/(\d+)d(\d+)/);
                  if (m) roll({ die: +m[2], count: +m[1], mod: dmgMod, label: w.name + ' ' + t('damageRoll', lang) });
                }}>
                  <span className="fh-atk-btn-k">{dmgLabel}</span>
                  <span className="fh-atk-btn-v">{a.damage}</span>
                </button>
              </div>
            </div>
            {((wDef && wDef.props && wDef.props.length > 0) || fs.attackParts.length > 0 || fs.damageParts.length > 0 || fs.mastery || fs.notes.length > 0 || a.monk) && (
              <div className="fh-atk-notes fh-wpn-notes">
                {wDef && wDef.props && wDef.props.length > 0 && (
                  <div className="fh-atk-note fh-wpn-props">{propsText(wDef.props, lang)}</div>
                )}
                {(fs.attackParts.length > 0 || fs.damageParts.length > 0) && (
                  <div className="fh-atk-note is-gold">
                    {fs.attackParts.length > 0 && <>{lang === 'pt' ? 'Ataque' : 'Attack'} {FS.partsLabel(fs.attackParts, lang)} </>}
                    {fs.damageParts.length > 0 && <>{lang === 'pt' ? 'Dano' : 'Damage'} {FS.partsLabel(fs.damageParts, lang)}</>}
                  </div>
                )}
                {fs.mastery && (
                  <div className="fh-atk-note is-mastery">
                    {lang === 'pt' ? 'Maestria' : 'Mastery'}: <strong>{fs.mastery.name[lang]}</strong> — {fs.mastery.desc[lang]}
                  </div>
                )}
                {fs.notes.map((n, k) => <div key={k} className="fh-atk-note">{n[lang]}</div>)}
                {a.monk && <div className="fh-atk-note is-gold">{lang === 'pt' ? `Artes Marciais: arma de monge (usa ${a.ability === 'dex' ? 'DES' : 'FOR'})` : `Martial Arts: Monk weapon (uses ${a.ability === 'dex' ? 'DEX' : 'STR'})`}</div>}
              </div>
            )}
          </div>
        );
      })}
      </section>

      <section className="fh-panel">
      <FhTitle>{t('equipmentList', lang)}</FhTitle>
      <InventoryList char={char} lang={lang} update={update} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <FhFeatures items={placed?.by.items} multi={!!placed?.multi} lang={lang} place="items" />
      </section>

      <section className="fh-panel">
        <FhTitle>{t('coins', lang)}</FhTitle>
        {/* 5 moedas redondas no metal de cada uma (só visual), o campo embaixo */}
        <div className="fh-coins">
          {['cp','sp','ep','gp','pp'].map(c => (
            <div key={c} className="fh-coin" data-coin={c}>
              <div className="eyebrow text-xs fh-coin-face" title={COIN_NAME[lang === 'pt' ? 'pt' : 'en'][c]}>{COIN_LABEL[lang === 'pt' ? 'pt' : 'en'][c]}</div>
              <input
                type="number" min="0"
                value={(char.coins || {})[c] || 0}
                aria-label={`${COIN_LABEL[lang === 'pt' ? 'pt' : 'en'][c]} (${COIN_NAME[lang === 'pt' ? 'pt' : 'en'][c]})`}
                onChange={ev => update({ coins: { ...(char.coins || {}), [c]: +ev.target.value || 0 } })}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

// ===== Story =====
const SheetStory = ({ char, lang, update, cls, race }) => (
  <>
    <section className="fh-panel fh-story">
    <FhTitle>{t('stepStory', lang)}</FhTitle>
    {/* Campos de pergaminho escuro com filete dourado (src/sheet/ficha.css: .fh-story) */}
    <div className="fh-story-fields">
      {['personality','ideals','bonds','flaws','backstory','appearance','allies','treasure'].map(field => (
        <div key={field} className="fh-field">
          <label>{t(field, lang)}</label>
          <textarea aria-label={t(field, lang)} value={char[field] || ''} onChange={e => update({ [field]: e.target.value })} className={field === 'backstory' ? 'is-long' : undefined}/>
        </div>
      ))}
      <div className="fh-story-short">
        {['age','height','weight','eyes','skin','hair'].map(f => (
          <div key={f} className="fh-field">
            <label>{t(f, lang)}</label>
            <input aria-label={t(f, lang)} value={char[f] || ''} onChange={e => update({ [f]: e.target.value })}/>
          </div>
        ))}
      </div>
      <div className="fh-field">
        <label>{t('symbol', lang)}</label>
        <input aria-label={t('symbol', lang)} value={char.symbol || ''} onChange={e => update({ symbol: e.target.value })}/>
      </div>
    </div>
    </section>

    {race && <SpeciesTraits char={char} lang={lang} update={update} race={race} />}
  </>
);

// Traços da espécie + resumo das escolhas (linhagem, resistências, magias…).
// Em campanha a troca fica com o mestre; pendências aparecem na faixa do topo.
const SpeciesTraits = ({ char, lang, update, race }) => {
  const [open, setOpen] = useState(false);
  const rows = speciesSummary(char, lang);
  const canEdit = speciesChoiceSpecs(char).length > 0 && !char.inCampaign;
  return (
    <section className="fh-panel">
      <FhTitle>{lang === 'pt' ? 'Traços da Espécie' : 'Species Traits'}</FhTitle>
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
        {race.traits.map((tr, i) => {
          const later = tr.level && (char.level || 1) < tr.level;
          return (
            <div key={i} className={`fh-trait${later ? ' is-later' : ''}`}>
              <div className="fh-trait-name">
                <span>{tr.name[lang]}</span>
                {tr.level ? <span className="fh-origin">{lang === 'pt' ? 'nível' : 'level'} {tr.level}</span> : null}
              </div>
              <div className="fh-trait-text">{tr.desc[lang]}</div>
            </div>
          );
        })}
      </div>
      {open && <SpeciesChoicesModal char={char} lang={lang} onSave={update} onClose={() => setOpen(false)} />}
    </section>
  );
};

// ===== Notes / Journal =====
const SheetNotes = ({ char, lang, update }) => {
  const addNote = () => {
    const date = new Date().toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
    update({ notes: [{ id: Date.now(), date, text: '' }, ...(char.notes || [])] });
  };
  const updateNote = (id, text) => {
    update({ notes: char.notes.map(n => n.id === id ? { ...n, text } : n) });
  };
  const removeNote = (id) => update({ notes: char.notes.filter(n => n.id !== id) });

  return (
    <section className="fh-panel">
      <FhTitle>{t('tabNotes', lang)}</FhTitle>
      <button className="btn btn-primary btn-sm fh-note-add" onClick={addNote}>
        <Icon name="plus" size={14}/> {t('addNote', lang)}
      </button>
      {(char.notes || []).length === 0 && (
        <div className="card fh-empty">
          {t('noNotes', lang)}
        </div>
      )}
      {/* Cada anotação é uma página de pergaminho escuro, com a data em mono */}
      {(char.notes || []).map(n => (
        <div key={n.id} className="card fh-note">
          <div className="fh-note-head">
            <span className="fh-note-date mono">{n.date}</span>
            <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeNote(n.id)} aria-label={lang === 'pt' ? `Excluir anotação de ${n.date}` : `Delete note from ${n.date}`}>
              <Icon name="trash" size={14}/>
            </button>
          </div>
          <textarea aria-label={lang === 'pt' ? 'Aventura, encontro, descoberta...' : 'Adventure, encounter, discovery...'} value={n.text} onChange={e => updateNote(n.id, e.target.value)} placeholder={lang === 'pt' ? 'Aventura, encontro, descoberta...' : 'Adventure, encounter, discovery...'}/>
        </div>
      ))}
    </section>
  );
};

/**
 * InventoryList — lista de equipamento com estado (flags broken/equipped/qty/
 * attunement/notes).
 *
 * Modo standalone: edita tudo localmente via `update`. Mostra botão "Adicionar".
 * Modo campanha: usa endpoints (PATCH/DELETE/consume). Esconde "Adicionar"
 * (item dado pelo mestre). Mostra mensagem clara.
 *
 * Items "legacy" sem `id` (antiga estrutura {name, qty}) ainda aparecem
 * — convertidos para nova estrutura na primeira edição via `update`.
 *
 * Pacotes de equipamento (Pacote de Aventureiro…): no lugar de "Consumir", o
 * botão "Abrir pacote" troca o pacote pelos itens de dentro (src/items/packs.js).
 * Ficha do servidor (conta/campanha) abre pelo backend, como consumir.
 */
function InventoryList({ char, lang, update, addItem, updateItem, removeItem }) {
  const inCampaign = !!char.inCampaign;
  const [picking, setPicking] = useState(false);
  const items = char.equipment || [];

  const callBackend = async (fn) => {
    if (typeof char.id !== 'number') return null;
    try { return await fn(); } catch (e) {
      alert(errorMessage(e));
      return null;
    }
  };

  const toggleEquipped = async (it, idx) => {
    if (typeof char.id === 'number' && inCampaign && it.id) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { equipped: !it.equipped }));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      updateItem(idx, { equipped: !it.equipped });
    }
  };

  const toggleAttuned = async (it, idx) => {
    if (!it.attunement) return;
    const newVal = !it.attuned;
    // Limite de 3 attuned em standalone (validado no backend em campanha)
    if (newVal && !inCampaign) {
      const count = items.filter(x => x.attuned).length;
      if (count >= 3) { alert(lang === 'pt' ? 'Limite de 3 itens em sintonia.' : 'Limit of 3 attuned items.'); return; }
    }
    if (typeof char.id === 'number' && inCampaign && it.id) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { attuned: newVal }));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      updateItem(idx, { attuned: newVal });
    }
  };

  const consume = async (it, idx) => {
    if (typeof char.id === 'number' && it.id) {
      const r = await callBackend(() => api.invConsume(char.id, it.id));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      const nq = Math.max(0, (it.qty || 1) - 1);
      if (nq === 0 && it.type === 'potion') {
        const next = items.filter((_, i) => i !== idx);
        update({ equipment: next });
      } else {
        updateItem(idx, { qty: nq });
      }
    }
  };

  const openPackAt = async (it, idx) => {
    const pt = lang === 'pt';
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
        } else alert(errorMessage(e));
      }
    } else {
      const patch = openPack(char, it, lang);
      if (patch) update(patch);
    }
  };

  const removeOne = async (it, idx) => {
    if (inCampaign && typeof char.id === 'number') {
      // Em campanha, dono não remove. DM remove via DM editor.
      alert(lang === 'pt' ? 'Em campanha, apenas o mestre remove itens.' : 'In campaign, only the DM removes items.');
      return;
    }
    if (typeof char.id === 'number' && it.id) {
      const r = await callBackend(() => api.invDelete(char.id, it.id));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      removeItem(idx);
    }
  };

  const setNotes = async (it, idx, notes) => {
    if (typeof char.id === 'number' && inCampaign && it.id) {
      await callBackend(() => api.invPatch(char.id, it.id, { notes }));
    } else {
      updateItem(idx, { notes });
    }
  };

  return (
    <>
      {inCampaign && (
        <div className="muted small fh-inv-lock">
          🔒 {lang === 'pt'
            ? 'Em campanha: o mestre entrega os equipamentos. Você pode equipar, consumir, abrir pacotes e anotar.'
            : 'In campaign: the DM gives items. You can equip, consume, open packs, and add notes.'}
        </div>
      )}
      {items.length === 0 && (
        <p className="muted small fh-empty">{lang === 'pt' ? 'Sem itens.' : 'No items.'}</p>
      )}
      {items.map((it, i) => (
        <InventoryRow rulesVersion={char.rulesVersion} key={it.id || `legacy-${i}`} item={it} idx={i} lang={lang}
          inCampaign={inCampaign}
          onToggleEquipped={() => toggleEquipped(it, i)}
          onToggleAttuned={() => toggleAttuned(it, i)}
          onConsume={() => consume(it, i)}
          onOpenPack={() => openPackAt(it, i)}
          onRemove={() => removeOne(it, i)}
          onSetNotes={(n) => setNotes(it, i, n)}
          onPatchLocal={(p) => updateItem(i, p)}
        />
      ))}
      {!inCampaign && (
        <div className="fh-inv-add">
          <button className="btn btn-sm btn-primary" onClick={() => setPicking(true)}>
            <Icon name="plus" size={14}/> {lang === 'pt' ? 'Adicionar / cadastrar item' : 'Add / create item'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={addItem}>{lang === 'pt' ? 'Linha rápida' : 'Quick row'}</button>
        </div>
      )}
      {picking && (
        <ItemPickerModal
          lang={lang}
          title={lang === 'pt' ? '🎒 Adicionar item' : '🎒 Add item'}
          confirmLabel={lang === 'pt' ? 'Adicionar' : 'Add'}
          onPick={async (inst) => update({ equipment: [...items, inst] })}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

function InventoryRow({ item, idx, lang, rulesVersion, inCampaign, onToggleEquipped, onToggleAttuned, onConsume, onOpenPack, onRemove, onSetNotes, onPatchLocal }) {
  const [open, setOpen] = useState(false);
  const isLegacy = !item.id;
  const broken = !!item.broken;
  const equipped = !!item.equipped;
  const attuned = !!item.attuned;
  const canAttune = !!item.attunement;
  const pack = isPack(item);
  const type = item.type || (isLegacy ? 'gear' : '');
  const art = itemArtFor(item);
  const emoji = itemEmoji({ ...item, type });
  const descText = item.description
    ? (typeof item.description === 'string' ? item.description : (item.description[lang] || item.description.en || item.description.pt || ''))
    : '';

  // Linha do item (src/sheet/ficha.css: .inv-row-v2): o cabeçalho virou <button
  // aria-expanded> (antes, div clicável) — miniatura redonda, nome, ×N, etiquetas e chevron.
  return (
    <div className={`inv-row-v2 ${broken ? 'broken' : ''} ${equipped ? 'equipped' : ''} ${open ? 'open' : ''}`}>
      <button type="button" className="inv-row-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ArtThumb src={art} emoji={emoji} size={36} lang={lang} className="inv-type-icon" />
        <span className="inv-main">
          <span className="inv-name">{item.name || '?'}</span>
          {item.qty != null && item.qty !== 1 && <span className="muted small inv-qty">×{item.qty}</span>}
          {broken && <span className="inv-tag broken-tag">{lang === 'pt' ? 'QUEBRADO' : 'BROKEN'}</span>}
          {equipped && <span className="inv-tag equip-tag">{lang === 'pt' ? 'equipado' : 'equipped'}</span>}
          {attuned && <span className="inv-tag attune-tag">⚝ {lang === 'pt' ? 'em sintonia' : 'attuned'}</span>}
        </span>
        <span className="inv-chev" aria-hidden="true"><Icon name={open ? 'chevron-up' : 'chevron-down'} size={16}/></span>
      </button>
      {open && (
        <div className="inv-row-body">
          <div className="item-detail">
            <ArtThumb src={art} emoji={emoji} size={96} lang={lang} alt={item.name || ''} />
            {descText ? (
              <div className="item-detail-text text-sm muted item-desc">{descText}</div>
            ) : <div className="item-detail-text" />}
          </div>
          {item.weapon && (() => {
            // Números de 2024 (lança de montaria, tridente…) quando a ficha é 2024.
            const w = rulesVersion === '2024' && item.weapon.v2024 ? { ...item.weapon, ...item.weapon.v2024 } : item.weapon;
            return <div className="text-xs muted">⚔ {w.damage} {Utils.damageLabel(w.dmgType, lang)}{w.props?.length ? ` · ${propsText(w.props, lang)}` : ''}{w.range ? ` · ${w.range}` : ''}</div>;
          })()}
          {item.armor && (
            <div className="text-xs muted">🛡 {lang === 'pt' ? 'CA' : 'AC'} {item.armor.ac} ({armorTypeLabel(item.armor.type, lang)}){item.armor.stealth === 'disadv' ? (lang === 'pt' ? ' · desvantagem em Furtividade' : ' · Stealth disadvantage') : ''}{item.armor.strReq ? (lang === 'pt' ? ` · exige FOR ${item.armor.strReq}` : ` · STR ${item.armor.strReq} required`) : ''}</div>
          )}
          {item.magic && (
            <div className="text-xs inv-magic">✨ {item.magic.effect?.[lang] || item.magic.effect?.en}</div>
          )}
          <div className="inv-acts">
            {(item.type === 'weapon' || item.type === 'armor' || item.type === 'shield' || canAttune) && (
              <button className={`btn btn-sm ${equipped ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleEquipped}>
                {equipped ? '✓ ' : ''}{lang === 'pt' ? 'Equipado' : 'Equipped'}
              </button>
            )}
            {canAttune && (
              <button className={`btn btn-sm ${attuned ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleAttuned}>
                ⚝ {lang === 'pt' ? 'Sintonia' : 'Attune'}
              </button>
            )}
            {/* Pacote: consumir = abrir (os itens de dentro entram no inventário).
                Também com ×0: antes, consumir um pacote só tirava 1 e não dava nada. */}
            {pack ? (
              <button className="btn btn-sm btn-primary inv-open-pack" onClick={onOpenPack}
                title={lang === 'pt' ? 'Troca o pacote pelos itens que vêm dentro' : 'Replaces the pack with the items inside'}>
                🎒 {lang === 'pt' ? 'Abrir pacote' : 'Open pack'}
              </button>
            ) : (item.qty || 0) > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={onConsume} title={lang === 'pt' ? 'Consumir 1' : 'Consume 1'}>
                − {lang === 'pt' ? 'Consumir' : 'Consume'}
              </button>
            )}
            {/* Em campanha não permite remover */}
            {!inCampaign && (
              <button className="btn btn-sm btn-ghost btn-danger inv-del" onClick={onRemove} aria-label={`${lang === 'pt' ? 'Remover' : 'Remove'} ${item.name || '?'}`}>
                <Icon name="trash" size={12}/>
              </button>
            )}
          </div>
          <label className="inv-notes">
            <span className="muted small">{lang === 'pt' ? 'Notas' : 'Notes'}:</span>
            <input aria-label={lang === 'pt' ? '...' : '...'}
              value={item.notes || ''}
              onChange={e => onPatchLocal({ notes: e.target.value })}
              onBlur={e => onSetNotes(e.target.value)}
              placeholder={lang === 'pt' ? '...' : '...'}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export { SheetSpells, SheetInventory, SheetStory, SheetNotes, RestButtons, SchoolBadge };
