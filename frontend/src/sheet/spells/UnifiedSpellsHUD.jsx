import { useId, useState, useMemo, useContext } from 'react';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import { Modal } from '../../../components/Shared.jsx';
import { unknownSpells } from '../../progression/known.js';
import { grantedSpells } from '../../creator/spell-helpers.js';
import { grantTakesOver, computeProgression } from '../../progression/engine.js';
import { useSheetToast } from '../sheet-toast.jsx';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import { RespecContext } from '../../progression/respec.js';
import { exhaustionLevel, setExhaustion } from '../hp-logic.js';
import FhTitle from '../FhTitle.jsx';
import FhAdv3 from '../FhAdv3.jsx';
import { SlotMatrix, SlotGems } from './SlotMatrix.jsx';
import { isGrantEntry, idOf, grantStateOf, grantEntriesOf, UsesTag, freeUseOf, SpellRow } from './SpellRow.jsx';
import { PreparedSpellsView, KnownSpellsView, SpellbookSection, CopySpellModal, PrepareSpellsModal } from './SpellViews.jsx';
export const UnifiedSpellsHUD = ({ char, lang, update, slots, casters, spellAb: propSpellAb, spellDc: propSpellDc, spellAtk: propSpellAtk }) => {
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
export const SheetSpells = ({ char, lang, update, slots, roll, placed, stance = null, onStance = null }) => {
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
export const SpellcastingPanel = ({ char, lang, update, slots, roll, casters, multi, scoped, hasGrants, stance = null, onStance = null }) => {
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
export const AllSpellsList = ({ char, lang, update, slots, roll, casters, multi, scoped }) => {
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
export const GrantedSpellsSection = ({ char, lang, update, slots, roll, bare = false }) => {
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
export const ClassSpells = ({ char, lang, update, slots, roll, showClass, hud = true, bare = false, feats = { spells: [], cantrips: [] }, multiFeats = false }) => {
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
