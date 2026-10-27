// Os blocos da folha da Cena (§3.3, W2): a paleta "Pôr nesta cena" e cada bloco
// (📜 ler · 📺 imagem · 🎭 quem aparece · ⚔ combate · 🎯 teste · ★ momento · 🔒 notas).
// Só apresentação: a folha da Cena (SceneSheet.jsx) e o modo sala das Aventuras
// (NodeEditor.jsx) dizem de onde vem cada valor e para onde vai (prep/scene-model.js).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../api/client.js';
import { findMonster } from '../../data/bestiary.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import { checkLabel, ABILITIES } from '../checks/check-logic.js';
import { bestAt, firstName } from '../group/party-best.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import { CR_TABLE } from '../combat/cr-estimate.js';
import MonsterPicker from '../campaigns/MonsterPicker.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import WorldRefs from './WorldRefs.jsx';
import { entryImage, kindIcon, kindLabel, visLabel } from './prep-world.js';
import { SCENE_BLOCKS, DC_CHIPS, DC_RANGE, parseDc, customDc, blockLabel, fightDifficulty } from './scene-model.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
export const HANDY_KINDS = ['npc', 'faction', 'place'];

/** Monstro pelo id: catálogo, "meus monstros" deste navegador ou o snap guardado na cena. */
export function useMonsterLookup() {
  return useMemo(() => {
    const custom = loadCustomMonsters();
    return (id, snap = null) => (id ? (findMonster(id) || custom.find(m => m.id === id) || snap || null) : snap || null);
  }, []);
}

/** A paleta "Pôr nesta cena": 7 chips de 44 px (4 + 3 a 320), "✓" quando o bloco existe. */
export function ScenePalette({ ids, present, lang, onPick, disabled = false }) {
  return (
    <div className="ss-palette-wrap">
      <p className="mesa-eyebrow" id="ss-palette-h">{t(lang, 'Pôr nesta cena', 'Add to this scene')}</p>
      <div className="ss-palette" role="group" aria-labelledby="ss-palette-h">
        {SCENE_BLOCKS.filter(b => ids.includes(b.id)).map(b => {
          const on = present.has(b.id);
          return (
            <button key={b.id} type="button" className={`ss-chip ${on ? 'is-on' : ''}`} aria-pressed={on} disabled={disabled}
              aria-label={`${b.icon} ${blockLabel(b.id, lang)}${on ? t(lang, ' (já na cena)', ' (already in the scene)') : ''}`}
              onClick={() => onPick(b.id)}>
              <span className="ss-chip-ico" aria-hidden="true">{b.icon}</span>
              <span className="ss-chip-label" aria-hidden="true">{blockLabel(b.id, lang, true)}</span>
              {on && <span className="ss-chip-ok" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HELP = {
  read: ['O que você lê em voz alta quando a cena começa. Com "Mostrar ao começar" ligado, vai à Tela junto com o nome. Ex.: "A ponte range. A névoa sobe do rio…"',
    'What you read aloud when the scene starts. With "Show when it starts" on, it goes to the screen with the name. E.g. "The bridge creaks. Mist rises from the river…"'],
  show: ['Uma imagem para mostrar na Tela nesta cena. Cartão oculto no Mundo vai como "só a imagem": os jogadores não aprendem o nome. Na mesa, 📺 mostra com 1 toque.',
    'An image to show on screen in this scene. A card hidden in the World goes as "image only": players don\'t learn the name. At the table, 📺 shows it in 1 tap.'],
  refs: ['Pessoas e lugares que aparecem nesta cena. O cartão novo nasce oculto no Mundo; você revela quando quiser.',
    'People and places that show up in this scene. A new card starts hidden in the World; you reveal it when you want.'],
  fight: ['Os monstros desta cena. A dificuldade é contra os personagens da mesa agora. Na mesa, ⚔ Começar o combate monta tudo de uma vez.',
    'The monsters in this scene. The difficulty is against the characters at the table now. At the table, ⚔ Start combat sets it all up at once.'],
  check: ['Um teste que a cena pede (perícia, salvaguarda ou atributo) e a CD. Na mesa, 🎯 Pedir a todos manda com 1 toque. 🔒 CD secreta: os jogadores não veem a CD.',
    'A check the scene calls for (skill, save or ability) and the DC. At the table, 🎯 Ask everyone sends it in 1 tap. 🔒 Secret DC: players don\'t see the DC.'],
  spots: ['Um momento para um personagem brilhar nesta cena (o "holofote"). As ideias vêm do Raio-X e do teste e do combate da cena. Na mesa, a cena lembra você dele.',
    'A moment for a character to shine in this scene (the "spotlight"). Ideas come from the X-ray and the scene\'s check and fight. At the table, the scene reminds you of it.'],
  notes: ['Só você vê. Lembretes, segredos, o que fazer se o grupo fugir.', 'Only you see this. Reminders, secrets, what to do if the party runs.'],
};

/** Moldura de um bloco: título com o ícone, "?" (2–3 frases) e ✕ (tira, com Desfazer). */
export function BlockFrame({ id, lang, onRemove, removeLabel, help, title, extra = null, children }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const b = SCENE_BLOCKS.find(x => x.id === id);
  const h = help || HELP[id];
  const label = title || blockLabel(id, lang);
  return (
    <section className="ss-block" id={`ss-b-${id}`} aria-labelledby={`ss-bh-${id}`}>
      <header className="ss-block-head">
        <h3 className="ss-block-h" id={`ss-bh-${id}`}><span aria-hidden="true">{b?.icon}</span> {label}</h3>
        {extra}
        {h && (
          <button type="button" className="mesa-icon-btn ss-help" aria-expanded={helpOpen} onClick={() => setHelpOpen(v => !v)}
            aria-label={t(lang, `Ajuda: ${label}`, `Help: ${label}`)}>?</button>
        )}
        {onRemove && (
          <button type="button" className="mesa-icon-btn ss-x" onClick={onRemove}
            aria-label={removeLabel || t(lang, `Tirar ${label} da cena`, `Remove ${label} from the scene`)}>✕</button>
        )}
      </header>
      {helpOpen && h && <p className="ss-help-text">{t(lang, h[0], h[1])}</p>}
      {children}
    </section>
  );
}

/** 📜 Ler em voz alta (ou 🔒 Notas: o mesmo campo que cresce). */
export function TextBlock({ id, lang, value, max, disabled, placeholder, onChange, onRemove, note = null, help }) {
  return (
    <BlockFrame id={id} lang={lang} onRemove={disabled ? null : onRemove} help={help}>
      {note}
      <textarea id={`ss-f-${id}`} className="input ss-text" rows={id === 'read' ? 4 : 3} maxLength={max} value={value} disabled={disabled}
        aria-label={blockLabel(id, lang)} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </BlockFrame>
  );
}

const visWord = (e, lang) => {
  if (!e) return '';
  if (e.visibility === 'revealed') return t(lang, 'Revelado no Mundo: vai o cartão inteiro.', 'Revealed in the World: the whole card goes.');
  if (e.visibility === 'partial') return t(lang, 'Conhecido de nome: a Tela mostra o nome e a imagem.', 'Known by name: the screen shows the name and the image.');
  return t(lang, 'Oculto no Mundo: a Tela mostra só a imagem; os jogadores não aprendem o nome.', "Hidden in the World: the screen shows only the image; players don't learn the name.");
};
const CARD_KINDS = ['place', 'npc', 'faction', 'item', 'lore'];

/**
 * 📺 Imagem para a Tela: escolher do Mundo (cartões com imagem; os ocultos vão como "só a
 * imagem") ou subir uma (vira um cartão OCULTO do tipo Lugar, com o nome da cena; o tipo
 * muda num chip). A cena guarda só a referência. `roomName` = a imagem é a da sala ligada.
 */
export function ImageBlock({ lang, show, showFrom, world, roomName, disabled, busy, error, fresh, onPickWorld, onUpload, onRemove, onKind, onRemoveBlock }) {
  const inputRef = useRef(null);
  const [changing, setChanging] = useState(false);
  const entry = show?.kind === 'entry' ? (world || []).find(e => e.id === show.id) : null;
  const pickFile = () => inputRef.current?.click();
  const buttons = (
    <div className="ss-row-btns">
      <button type="button" className="mesa-btn" disabled={disabled || busy} onClick={() => { setChanging(false); onPickWorld(); }}>🌍 {t(lang, 'Escolher do Mundo', 'Pick from the World')}</button>
      <button type="button" className="mesa-btn" disabled={disabled || busy} onClick={pickFile}>{busy ? t(lang, 'Enviando…', 'Uploading…') : `⬆ ${t(lang, 'Subir imagem', 'Upload image')}`}</button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setChanging(false); onUpload(f); } }} />
    </div>
  );
  return (
    <BlockFrame id="show" lang={lang} onRemove={disabled ? null : onRemoveBlock}>
      {entry ? (
        <div className="ss-image">
          <img className="ss-image-pic" src={entryImage(entry, API_BASE)} alt="" loading="lazy" />
          <div className="ss-image-text">
            <p className="ss-image-name"><strong>{entry.name}</strong> · {kindIcon(entry.kind)} {kindLabel(entry.kind, lang)}</p>
            <p className="ss-hint">{visWord(entry, lang)}</p>
            {showFrom === 'ref' && (
              <p className="ss-hint">{t(lang, 'Vem do 1º cartão com imagem em 🎭 Quem aparece. Tirar não tira o cartão da sala.', 'Comes from the 1st card with an image in 🎭 Who shows up. Removing it keeps the card in the room.')}</p>
            )}
          </div>
        </div>
      ) : show?.kind === 'entry' ? (
        <p className="ss-hint">{t(lang, 'O cartão desta imagem não está mais no Mundo.', 'The card of this image is no longer in the World.')}</p>
      ) : showFrom === 'room' ? (
        <p className="ss-hint">🖼 {t(lang, `A imagem da sala ${roomName || ''} vai à Tela. Ela muda em Preparar › Aventuras; ✕ tira só desta cena.`, `The image of the room ${roomName || ''} goes to the screen. It changes in Prepare › Adventures; ✕ removes it only from this scene.`)}</p>
      ) : null}
      {entry && fresh === entry.id && !disabled && (
        <div className="ss-kinds" role="group" aria-label={t(lang, 'Tipo do cartão', 'Card type')}>
          {CARD_KINDS.map(k => (
            <button key={k} type="button" className="mesa-chip" aria-pressed={entry.kind === k} disabled={busy} onClick={() => onKind(k)}>
              {kindIcon(k)} {kindLabel(k, lang)}
            </button>
          ))}
        </div>
      )}
      {(!show || changing || showFrom === 'room') && buttons}
      {show && showFrom !== 'room' && !changing && !disabled && (
        <div className="ss-row-btns">
          <button type="button" className="mesa-btn" disabled={busy} onClick={() => setChanging(true)}>{t(lang, 'Trocar', 'Change')}</button>
          <button type="button" className="mesa-btn is-quiet" disabled={busy} onClick={onRemove}>{t(lang, 'Tirar', 'Remove')}</button>
        </div>
      )}
      {error && <p className="ss-error" role="alert">{error}</p>}
    </BlockFrame>
  );
}

/** Folha "Imagem do Mundo": os cartões com imagem (os ocultos vão como "só a imagem"). */
export function WorldImagePicker({ lang, world, onPick, onClose }) {
  const [q, setQ] = useState('');
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = (world || []).filter(e => e.imageVer && e.kind !== 'handout' && (!q.trim() || fold(e.name).includes(fold(q.trim()))))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <MesaSheet title={t(lang, 'Imagem do Mundo', 'Image from the World')} icon="📺" size="tall" width="md" lang={lang} onClose={onClose}
      initialFocus=".ss-pick-search" footer={<button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>}>
      <input className="input ss-pick-search" value={q} onChange={e => setQ(e.target.value)} maxLength={120}
        aria-label={t(lang, 'Buscar no Mundo', 'Search the World')} placeholder={t(lang, 'Buscar pelo nome…', 'Search by name…')} />
      {list.length === 0 && <p className="ss-hint">{t(lang, 'Nenhum cartão com imagem. Use "Subir imagem" na cena.', 'No card with an image. Use "Upload image" in the scene.')}</p>}
      <ul className="ss-pick-list">
        {list.map(e => (
          <li key={e.id}>
            <button type="button" className="pw-row" onClick={() => onPick(e)}>
              <img src={entryImage(e, API_BASE)} alt="" loading="lazy" />
              <span className="pw-chip-text">
                <strong>{e.name}</strong>
                <span className="pw-chip-sub">{kindIcon(e.kind)} {kindLabel(e.kind, lang)} · {e.visibility === 'hidden' ? t(lang, '🔒 oculto: só a imagem', '🔒 hidden: image only') : visLabel(e.visibility, lang)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </MesaSheet>
  );
}

/** 🎭 Quem aparece: pílulas de pessoas e lugares + "＋ Pessoa ou lugar" (cria oculto). */
export function PeopleBlock({ lang, world, ids, max, disabled, kinds = HANDY_KINDS, onToggle, onCreate, onOpen, onRemove }) {
  return (
    <BlockFrame id="refs" lang={lang} onRemove={disabled ? null : onRemove}>
      <WorldRefs entries={world} ids={ids} kinds={kinds} lang={lang} max={max} readOnly={disabled} pills
        onToggle={onToggle} onCreate={onCreate} onOpen={onOpen} addLabel={t(lang, 'Pessoa ou lugar', 'Person or place')}
        emptyText={t(lang, 'Ninguém ainda. O cartão novo nasce oculto no Mundo.', 'Nobody yet. A new card starts hidden in the World.')} />
    </BlockFrame>
  );
}

/**
 * ⚔ Combate: "Goblin Guerreiro [−] 2 [+] [×]", a dificuldade escrita contra a mesa, a linha
 * "× grupo" por monstro e "＋ Monstro" (o Escolher monstro de sempre, com "Pôr na cena (N)").
 */
export function FightBlock({ lang, fight, levels, members, levelingMode, disabled, maxRows, maxCount, versusLine, onChange, onAdd, onRemove, error, confirmLabel, title }) {
  const lookup = useMonsterLookup();
  const [picker, setPicker] = useState(false);
  const diff = fightDifficulty(fight, levels, (id) => lookup(id), lang);
  const setCount = (i, n) => onChange(fight.map((f, j) => (j === i ? { ...f, count: Math.max(1, Math.min(maxCount, n)) } : f)));
  return (
    <BlockFrame id="fight" lang={lang} title={title} onRemove={disabled ? null : onRemove}>
      {fight.length === 0 && <p className="ss-hint">{t(lang, 'Nenhum monstro ainda.', 'No monsters yet.')}</p>}
      <ul className="ss-fight">
        {fight.map((f, i) => {
          const m = lookup(f.monsterId, f.snap);
          const name = m ? (typeof m.name === 'object' ? (m.name?.[lang] || m.name?.en || f.name) : (m.name || f.name)) : f.name;
          const vs = m && versusLine ? versusLine(m) : '';
          return (
            <li key={`${f.monsterId}-${i}`} className="ss-fight-row">
              <div className="ss-fight-line">
                <span className="ss-fight-name">{name}<span className="ss-hint"> · {t(lang, 'ND', 'CR')} {m?.cr ?? CR_TABLE.find(r => r.numeric === f.cr)?.cr ?? f.cr ?? '?'}{f.snap ? t(lang, ' · meu', ' · mine') : ''}</span></span>
                <span className="ss-count" role="group" aria-label={t(lang, `Quantos ${name}`, `How many ${name}`)}>
                  <button type="button" className="mesa-icon-btn" disabled={disabled || f.count <= 1} onClick={() => setCount(i, f.count - 1)} aria-label={t(lang, `Um ${name} a menos`, `One less ${name}`)}>−</button>
                  <span className="ss-count-n" aria-live="polite">{f.count}</span>
                  <button type="button" className="mesa-icon-btn" disabled={disabled || f.count >= maxCount} onClick={() => setCount(i, f.count + 1)} aria-label={t(lang, `Mais um ${name}`, `One more ${name}`)}>+</button>
                </span>
                {!disabled && <button type="button" className="mesa-icon-btn" onClick={() => onChange(fight.filter((_, j) => j !== i))} aria-label={t(lang, `Tirar ${name}`, `Remove ${name}`)}>×</button>}
              </div>
              {vs && <p className="ss-vs">× {t(lang, 'grupo', 'party')}: {vs}</p>}
            </li>
          );
        })}
      </ul>
      {diff.text && <p className="ss-diff">{diff.text}</p>}
      {error && <p className="ss-error" role="alert">{error}</p>}
      {!disabled && (
        <button type="button" className="mesa-btn mesa-btn-lg ss-wide" disabled={fight.length >= maxRows} onClick={() => setPicker(true)}>＋ {t(lang, 'Monstro', 'Monster')}</button>
      )}
      {fight.length >= maxRows && <p className="ss-hint">{t(lang, `Até ${maxRows} tipos de monstro por cena.`, `Up to ${maxRows} monster types per scene.`)}</p>}
      {picker && (
        <MonsterPicker lang={lang} levelingMode={levelingMode} showInitiative={false} members={members}
          confirmLabel={confirmLabel || t(lang, 'Pôr na cena', 'Put in the scene')}
          onClose={() => setPicker(false)}
          onPick={(monster, count) => { if (onAdd(monster, count) !== false) setPicker(false); }} />
      )}
    </BlockFrame>
  );
}

const SKILL_IDS = SRD.SKILLS.map(s => s.id);
const checkValue = (c) => `${c.kind}:${c.key}`;
/**
 * 🎯 Teste: perícia, salvaguarda ou atributo + CD (chips) + 🔒 CD secreta, e embaixo
 * "melhor do grupo: Elarion +4 · 50% · pelo menos 1 passa: 91%". `multi` (cena ligada): a
 * sala guarda vários (todos viram botões na mesa).
 */
export function CheckBlock({ lang, checks, members, multi, disabled, onChange, onRemove }) {
  const uid = useId();
  const [freeAt, setFreeAt] = useState(null);   // o teste com o campo "Outra CD" aberto
  const list = checks.length ? checks : [];
  const set = (i, patch) => onChange(list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <BlockFrame id="check" lang={lang} onRemove={disabled ? null : onRemove}>
      {list.map((c, i) => {
        const dc = Number.isInteger(c.dc) ? c.dc : 15;
        const best = c.kind === 'ability' ? null : bestAt(members, c.kind === 'save' ? 'save' : 'skill', c.key, dc);
        const other = customDc(c.dc);
        return (
          <div key={i} className="ss-check">
            <div className="ss-check-line">
              <select className="input ss-check-sel" value={checkValue(c)} disabled={disabled} id={`${uid}-${i}`}
                aria-label={t(lang, 'O que testar', 'What to check')}
                onChange={e => { const [kind, key] = e.target.value.split(':'); set(i, { kind, key }); }}>
                <optgroup label={t(lang, 'Perícias', 'Skills')}>
                  {SKILL_IDS.map(k => <option key={k} value={`skill:${k}`}>{tName('skill', k, lang)}</option>)}
                </optgroup>
                <optgroup label={t(lang, 'Salvaguardas', 'Saves')}>
                  {ABILITIES.map(k => <option key={k} value={`save:${k}`}>{checkLabel({ kind: 'save', key: k }, lang)}</option>)}
                </optgroup>
                <optgroup label={t(lang, 'Atributos', 'Abilities')}>
                  {ABILITIES.map(k => <option key={k} value={`ability:${k}`}>{checkLabel({ kind: 'ability', key: k }, lang)}</option>)}
                </optgroup>
              </select>
              {multi && !disabled && (
                <button type="button" className="mesa-icon-btn" onClick={() => onChange(list.filter((_, j) => j !== i))}
                  aria-label={t(lang, `Tirar o teste de ${checkLabel(c, lang)}`, `Remove the ${checkLabel(c, lang)} check`)}>×</button>
              )}
            </div>
            <div className="ss-dcs" role="group" aria-label={t(lang, 'CD', 'DC')}>
              <span className="ss-dc-label" aria-hidden="true">{t(lang, 'CD', 'DC')}</span>
              {DC_CHIPS.map(v => (
                <button key={v} type="button" className="mesa-chip ss-dc" aria-pressed={c.dc === v} disabled={disabled}
                  aria-label={t(lang, `CD ${v}`, `DC ${v}`)} onClick={() => set(i, { dc: c.dc === v ? undefined : v })}>{v}</button>
              ))}
              {/* a CD que não é chip (14, 11, 25…): marcada no "14 ✎"; tocar abre o campo (1 a 40) no mesmo lugar */}
              {freeAt === i && !disabled ? (
                <input type="number" inputMode="numeric" min={DC_RANGE.min} max={DC_RANGE.max} className="input ss-dc ss-dc-free" autoFocus
                  defaultValue={other ?? ''} aria-label={t(lang, 'Outra CD (1 a 40)', 'Other DC (1 to 40)')}
                  onChange={e => { const v = parseDc(e.target.value); if (v) set(i, { dc: v }); }}
                  onBlur={() => setFreeAt(null)}
                  onKeyDown={e => {
                    // Enter/Esc fecham só o campo (o Esc não fecha a folha inteira)
                    if (e.key === 'Escape') e.stopPropagation();
                    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                  }} />
              ) : (
                <button type="button" className="mesa-chip ss-dc ss-dc-free" aria-pressed={!!other} disabled={disabled}
                  aria-label={other ? t(lang, `CD ${other} (mudar)`, `DC ${other} (change)`) : t(lang, 'Outra CD (1 a 40)', 'Other DC (1 to 40)')}
                  onClick={() => setFreeAt(i)}>{other ? `${other} ✎` : t(lang, 'Outra…', 'Other…')}</button>
              )}
              <button type="button" className="mesa-chip ss-dc" aria-pressed={!!c.dcHidden} disabled={disabled}
                aria-label={t(lang, 'CD secreta', 'Secret DC')} onClick={() => set(i, { dcHidden: !c.dcHidden })}>🔒</button>
            </div>
            {c.dcHidden && <p className="ss-hint">🔒 {t(lang, 'CD secreta: os jogadores não veem a CD.', "Secret DC: players don't see the DC.")}</p>}
            {multi && (
              <input className="input" value={c.note || ''} maxLength={300} disabled={disabled}
                aria-label={t(lang, `O que o teste de ${checkLabel(c, lang)} revela`, `What the ${checkLabel(c, lang)} check reveals`)}
                placeholder={t(lang, 'O que revela (opcional)', 'What it reveals (optional)')} onChange={e => set(i, { note: e.target.value })} />
            )}
            {best && (
              <p className="ss-best">{t(lang,
                `melhor do grupo: ${best.who.map(firstName).join(', ')} ${best.best >= 0 ? '+' : ''}${best.best} · ${best.p}% na CD ${dc} · pelo menos 1 passa: ${best.group}%`,
                `party's best: ${best.who.map(firstName).join(', ')} ${best.best >= 0 ? '+' : ''}${best.best} · ${best.p}% at DC ${dc} · at least 1 passes: ${best.group}%`)}
                {!Number.isInteger(c.dc) && <span className="ss-hint"> {t(lang, '(sem CD escolhida: conta a 15)', '(no DC picked: counts 15)')}</span>}</p>
            )}
          </div>
        );
      })}
      {multi && !disabled && list.length < 20 && (
        <button type="button" className="mesa-btn ss-wide" onClick={() => onChange([...list, { kind: 'skill', key: 'perception', dc: 13 }])}>＋ {t(lang, 'Teste', 'Check')}</button>
      )}
    </BlockFrame>
  );
}

/**
 * ★ Momento: os momentos ligados à cena (≤ 4) e "＋ Momento": tocar num personagem mostra as
 * ideias que combinam com esta cena (o teste e o combate dela) e o estilo do jogador.
 * `api` vem do Plano (o Raio-X já carregado): facts, ideasFor, styleOf, accept, write, save.
 */
export function MomentBlock({ lang, items, api, ideasFor, disabled, max, onAccept, onWrite, onUnlink, onRemove, busy, note }) {
  const [adding, setAdding] = useState(false);
  const [who, setWho] = useState(null);
  const [own, setOwn] = useState('');
  useEffect(() => { setOwn(''); }, [who]);
  const full = items.length >= max;
  const fact = who != null ? api?.facts.find(f => f.id === who) : null;
  const ideas = fact ? ideasFor(fact.id) : [];
  return (
    <BlockFrame id="spots" lang={lang} onRemove={disabled || !items.length ? null : onRemove}>
      {note && <p className="ss-hint">{note}</p>}
      {items.length > 0 && (
        <ul className="ss-moments">
          {items.map(x => (
            <li key={x.key} className="ss-moment">
              <span className="ss-moment-text">{api?.kindIcon(x.moment.kind) || '★'} {api ? api.firstName(api.nameOf(x.charId)) : ''}: {x.moment.text}</span>
              {!disabled && <button type="button" className="mesa-icon-btn" disabled={busy} onClick={() => onUnlink(x)}
                aria-label={t(lang, 'Tirar o momento da cena', 'Remove the moment from the scene')}>×</button>}
            </li>
          ))}
        </ul>
      )}
      {!disabled && api && !adding && (
        <button type="button" className="mesa-btn ss-wide" disabled={full || busy} onClick={() => setAdding(true)}>＋ {t(lang, 'Momento', 'Moment')}</button>
      )}
      {full && <p className="ss-hint">{t(lang, `Até ${max} momentos por cena.`, `Up to ${max} moments per scene.`)}</p>}
      {adding && api && (
        <div className="ss-mom-add">
          <div className="ss-who" role="group" aria-label={t(lang, 'Para quem?', 'For whom?')}>
            {api.facts.map(f => (
              <button key={f.id} type="button" className="mesa-chip" aria-pressed={who === f.id} onClick={() => setWho(who === f.id ? null : f.id)}>
                {api.firstName(f.name)}
              </button>
            ))}
            <button type="button" className="mesa-btn is-quiet" onClick={() => { setAdding(false); setWho(null); }}>{t(lang, 'Fechar', 'Close')}</button>
          </div>
          {fact && (
            <>
              {api.styleOf(fact.id).length > 0 && <p className="ss-hint">{t(lang, 'Estilo do jogador', 'Player style')}: {api.styleOf(fact.id).join(' · ')}</p>}
              <ul className="ss-ideas">
                {ideas.slice(0, 4).map(s => (
                  <li key={s.auto} className={`ss-idea ${s.why ? 'is-match' : ''}`}>
                    <p className="ss-idea-text">{api.kindIcon(s.kind)} {api.firstName(fact.name)}: {s.text}{s.why ? <><br /><span className="ss-idea-why">↳ {s.why}</span></> : null}</p>
                    <button type="button" className="mesa-btn" disabled={busy} onClick={async () => { if (await onAccept(fact.id, s)) { setAdding(false); setWho(null); } }}>{t(lang, 'Aceitar', 'Accept')}</button>
                  </li>
                ))}
              </ul>
              {ideas.length === 0 && <p className="ss-hint">{t(lang, 'Sem ideias da ficha agora. Escreva o seu.', 'No ideas from the sheet now. Write your own.')}</p>}
              <div className="ss-own">
                <input className="input" value={own} maxLength={160} onChange={e => setOwn(e.target.value)}
                  aria-label={t(lang, `Momento de ${api.firstName(fact.name)}`, `${api.firstName(fact.name)}'s moment`)}
                  placeholder={t(lang, 'Escrever o meu: ex. a fechadura que só ele abre', 'Write my own: e.g. the lock only they can open')} />
                <button type="button" className="mesa-btn" disabled={busy || !own.trim()} onClick={async () => { if (await onWrite(fact.id, own)) { setAdding(false); setWho(null); } }}>{t(lang, 'Pôr na cena', 'Put in the scene')}</button>
              </div>
            </>
          )}
        </div>
      )}
    </BlockFrame>
  );
}
