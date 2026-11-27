import { useState, useMemo } from 'react';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import { Modal } from '../../../components/Shared.jsx';
import { unknownSpells } from '../../progression/known.js';
import * as Book from '../../progression/spellbook.js';
import { SchoolBadge, SlotGems } from './SlotMatrix.jsx';
import { SpellRow } from './SpellRow.jsx';
export const groupByLevel = (list) => {
  const out = {};
  list.forEach(s => { (out[s.def.level] ||= []).push(s); });
  return out;
};

// "Nível 1" virou "1º círculo", o mesmo texto da linha de espaços (src/sheet/gem-text.js)
export const levelLabel = (lvl, lang) => (+lvl === 0 ? t('cantrips', lang) : slotCircleLabel(+lvl, lang));

// Conjuradores preparados: a ficha mostra só o que está pronto, agrupado por círculo
// (fechado até tocar). A escolha diária acontece no modal "Preparar magias".
// cantripFeats: os traços de truque da classe (ClassSpells), desenhados logo acima dos truques.
export const PreparedSpellsView = ({ lang, char, spellEntries, classCantrips, classSpells, autoIds, cantripLimit, preparedLimit, maxLvl, spellAtk, roll, slots, update, book = false, offList = new Set(), onRemove, cantripFeats = null, isTakenOver = () => false }) => {
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
export const SpellbookSection = ({ lang, char, preparedLimit, maxLvl, spellAtk, roll, slots, update }) => {
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
export const CopySpellModal = ({ lang, char, maxLvl, update, onClose }) => {
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
export const PrepareSpellsModal = ({ lang, char, classCantrips, classSpells, autoIds, cantripLimit, preparedLimit, update, onClose, book = false }) => {
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

export const KnownSpellsView = ({ lang, char, spellEntries, available, onAddSpell, onRemove, spellAtk, roll, slots, update, offList = new Set(), cantripFeats = null }) => {
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
