// Pedaços da Jogar › Agora (V7) que vieram da "Mesa agora" de antes (campaigns/TableNow.jsx),
// com as mesmas regras: só apresentação e um clique do mestre para cada mudança.
//   PartyCard   o personagem do Grupo: PV (com "PV" e "+n temp" escritos), CA, as passivas
//               com o NOME escrito, testes contra a morte, condições da ficha E do combate
//               juntas (a da ficha com a etiqueta "ficha"), concentração, espaços e
//               inspiração; ⋯ Editar ficha · Dar item · Registro (N) · Ver no Raio-X
//   SceneFields a folha "✎ Sessão, cena e clima" (os 3 campos de antes: Enter/sair salva,
//               Esc desfaz, "✓" por 1,5 s, o polling não atropela, 120 caracteres)
//   CombatStrip a faixa do combate (fora da casca; na casca, só o "montado e parado")
//   PlanClues   Pistas (recolhível e lembrada) + À mão na sessão toda + Anotações do plano
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import { concentrationOf, conditionLabel, stateWithConcentration } from '../campaigns/nudges.js';
import { editLogEntries } from '../campaigns/edit-log.js';
import MoreMenu from '../group/MoreMenu.jsx';
import { memberStats } from '../group/group-model.js';
import { HpBar, PcPortrait } from '../shell/MesaPc.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import { mediaNow } from './useMedia.js';
import { EntryRow } from './InScenePanel.jsx';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const safe = (fn, fallback = null) => { try { const v = fn(); return v ?? fallback; } catch { return fallback; } };

function classLine(data, lang) {
  if (!data) return '';
  const entries = safe(() => Utils.classEntries(data), []);
  const cls = entries.map(e => `${tName('class', e.id, lang)} ${e.level}`).join(' / ');
  return cls || (data.level ? `${L(lang, 'Nível', 'Level')} ${data.level}` : '');
}

// Resumo de espaços: "1º 3/4 · 2º 1/2" (restantes/máximo).
function slotSummary(data) {
  const max = safe(() => Utils.spellSlots(data), []) || [];
  const used = data?.spellSlotsUsed || [];
  return max.map((m, i) => ({ lvl: i + 1, max: m, left: Math.max(0, m - (Number(used[i]) || 0)) })).filter(s => s.max > 0);
}

// ---------------------------------------------------------------- o personagem
export function PartyCard({ p, campaign, lang, onSaveState, onToggleInspiration, onEdit, onGive, onLog, onRaioX, closed = false }) {
  const d = p.data || {};
  const [editConc, setEditConc] = useState(false);
  const [concText, setConcText] = useState('');
  const conc = concentrationOf(campaign.state, { characterId: p.characterId, data: d });
  const pct = p.maxHp ? Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) : 0;
  const tone = p.hp != null && p.hp <= 0 ? 'down' : pct <= 25 ? 'crit' : pct <= 60 ? 'warn' : 'ok';
  const ac = safe(() => Utils.computeAc(d), d.armorClass);
  const pp = safe(() => Utils.passivePerception(d));
  const inv = safe(() => 10 + Utils.skillBonus(d, 'investigation'));
  const ins = safe(() => 10 + Utils.skillBonus(d, 'insight'));
  const slots = slotSummary(d);
  const conds = p.conditions.filter(c => c !== 'unconscious' || p.hp > 0);
  // Em combate as condições vêm do combatente; as da ficha aparecem junto, marcadas "ficha".
  const sheetConds = p.inCombat
    ? [...new Set((Array.isArray(d.conditions) ? d.conditions : []).filter(c => typeof c === 'string' && c && !p.conditions.includes(c)))]
    : [];
  const ds = p.deathSaves || {};
  const member = (campaign.members || []).find(m => m.character?.id === p.characterId);
  const stats = member ? memberStats(member) : null;
  const log = editLogEntries(d);
  const menu = [
    onEdit && { id: 'edit', label: `🛠 ${L(lang, 'Editar ficha', 'Edit sheet')}`, onSelect: onEdit },
    onGive && !closed && { id: 'give', label: `🎁 ${L(lang, 'Dar item', 'Give item')}`, onSelect: onGive },
    onLog && log.length > 0 && { id: 'log', label: `📜 ${L(lang, 'Registro', 'Edit log')} (${log.length})`, onSelect: onLog },
    onRaioX && { id: 'xray', label: `✦ ${L(lang, 'Ver no Raio-X', 'See in the X-ray')}`, onSelect: onRaioX },
  ].filter(Boolean);

  const saveConc = async (spell) => {
    await onSaveState({ concentration: stateWithConcentration(campaign.state, `char:${p.characterId}`, spell).concentration });
    setEditConc(false); setConcText('');
  };

  return (
    <article className={`tn-card tone-${tone}`}>
      <header className="tn-card-head">
        <PcPortrait stats={stats} name={p.name} size={40} className="tn-card-pic" />
        <div className="tn-card-who">
          <strong className="tn-card-name">{p.name}</strong>
          <span className="tn-card-class">
            <span>{classLine(d, lang)}</span>
            {slots.length > 0 && (
              <span className="tn-slots" title={L(lang, 'Espaços de magia restantes / máximo', 'Spell slots left / max')}>
                <span className="tn-slots-label">{L(lang, 'Espaços', 'Slots')}</span>
                {slots.map(s => (
                  <span key={s.lvl} className={`tn-slot ${s.left === 0 ? 'empty' : ''}`}>{s.lvl}º <strong>{s.left}</strong>/{s.max}</span>
                ))}
              </span>
            )}
          </span>
        </div>
        <button type="button" className={`tn-insp ${d.inspiration ? 'on' : ''}`} onClick={onToggleInspiration} disabled={closed}
          aria-pressed={!!d.inspiration} aria-label={L(lang, `Inspiração de ${p.name}`, `${p.name}'s inspiration`)}>
          <span aria-hidden="true">{d.inspiration ? '★' : '☆'}</span><span className="tn-insp-label" aria-hidden="true">{L(lang, 'Insp.', 'Insp.')}</span>
        </button>
        {menu.length > 0 && <MoreMenu items={menu} lang={lang} label={L(lang, `Mais de ${p.name}`, `More for ${p.name}`)} sheetTitle={p.name} className="now-card-more" />}
      </header>

      <HpBar hp={p.hp} max={p.maxHp} temp={p.tempHp} lang={lang} units className="tn-hp" />

      <dl className="tn-stats">
        <div><dt>{L(lang, 'CA', 'AC')}</dt><dd>{ac ?? '—'}</dd></div>
        <div><dt>{L(lang, 'Percepção', 'Perception')}</dt><dd>{pp ?? '—'}</dd></div>
        <div><dt>{L(lang, 'Investigação', 'Investigation')}</dt><dd>{inv ?? '—'}</dd></div>
        <div><dt>{L(lang, 'Intuição', 'Insight')}</dt><dd>{ins ?? '—'}</dd></div>
      </dl>

      {p.hp != null && p.hp <= 0 && (
        <div className="tn-death">
          <span>{L(lang, 'Contra a morte', 'Death saves')}</span>
          <span className="tn-ds ok"><span className="tn-ds-word">{L(lang, 'sucessos', 'successes')}</span> <span aria-hidden="true">{'●'.repeat(ds.success || 0)}{'○'.repeat(Math.max(0, 3 - (ds.success || 0)))}</span><span className="tn-sr">{ds.success || 0}/3</span></span>
          <span className="tn-ds bad"><span className="tn-ds-word">{L(lang, 'falhas', 'failures')}</span> <span aria-hidden="true">{'●'.repeat(ds.fail || 0)}{'○'.repeat(Math.max(0, 3 - (ds.fail || 0)))}</span><span className="tn-sr">{ds.fail || 0}/3</span></span>
        </div>
      )}

      <div className="tn-card-extra">
        {conds.map(c => <span key={c} className="tn-cond">{conditionLabel(c, lang)}{p.inCombat && <em> {L(lang, 'combate', 'combat')}</em>}</span>)}
        {sheetConds.map(c => (
          <span key={`f-${c}`} className="tn-cond is-sheet">
            {conditionLabel(c, lang)} <em>{L(lang, 'ficha', 'sheet')}</em>
          </span>
        ))}
        <div className={`tn-conc ${editConc ? 'is-editing' : ''}`}>
          {editConc ? (
            <form className="tn-conc-form" onSubmit={e => { e.preventDefault(); saveConc(concText); }}>
              <input className="input" autoFocus value={concText} maxLength={80} onChange={e => setConcText(e.target.value)}
                placeholder={L(lang, 'Magia (ex.: Bênção)', 'Spell (e.g. Bless)')} aria-label={L(lang, 'Concentrando em', 'Concentrating on')} />
              <button type="submit" className="mesa-btn is-primary" disabled={!concText.trim()}>OK</button>
              <button type="button" className="mesa-icon-btn" onClick={() => setEditConc(false)} aria-label={L(lang, 'Cancelar', 'Cancel')}>✕</button>
            </form>
          ) : conc ? (
            <span className="tn-conc-on">
              <span>◎ {L(lang, 'Concentrando', 'Concentrating')}: <strong>{conc.spell}</strong></span>
              {!conc.fromSheet && !closed && (
                <button type="button" className="mesa-btn is-quiet tn-conc-end" onClick={() => saveConc('')}>{L(lang, 'encerrar', 'end')}</button>
              )}
            </span>
          ) : !closed ? (
            <button type="button" className="mesa-btn is-quiet tn-conc-add" onClick={() => setEditConc(true)}>◎ {L(lang, 'marcar concentração', 'mark concentration')}</button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- ✎ Sessão, cena e clima
/** Campo que cresce com o texto (Cena e Clima quebram linha). */
function GrowField({ value, multiline, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !multiline) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value, multiline]);
  return multiline
    ? <textarea ref={ref} rows={1} value={value} {...rest} />
    : <input ref={ref} value={value} {...rest} />;
}

/**
 * Sessão / cena / clima (salva ao sair do campo ou com Enter; Esc desfaz; "✓" por 1,5 s;
 * o que chega do servidor não atropela o campo em edição). Trocar o nome da cena à mão
 * solta a cena do plano (o `sceneId` sai): a cena agora passa a ser só esse nome.
 */
export function SceneFields({ campaign, lang, onSave, closed = false }) {
  const fields = [
    ['session', L(lang, 'Sessão', 'Session'), 'ex: 12'],
    ['scene', L(lang, 'Cena', 'Scene'), L(lang, 'ex: Taverna do Javali Cego', 'e.g.: Blind Boar Tavern')],
    ['weather', L(lang, 'Clima', 'Weather'), L(lang, 'ex: chuva fina', 'e.g.: drizzle')],
  ];
  const st = campaign.state || {};
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(([k]) => [k, st[k] || ''])));
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    setVals(v => Object.fromEntries(fields.map(([k]) => [k, k === editing ? v[k] : (st[k] || '')])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.session, st.scene, st.weather, editing]);

  const commit = async (k) => {
    setEditing(null);
    if ((st[k] || '') === vals[k]) return;
    const patch = { [k]: vals[k] };
    if (k === 'scene' && 'sceneId' in st) patch.sceneId = null;
    try { await onSave(patch); setSaved(k); setTimeout(() => setSaved(s => (s === k ? null : s)), 1500); } catch { /* o próximo pulso corrige */ }
  };
  return (
    <div className="tn-scene-fields now-fields">
      {fields.map(([k, label, ph]) => (
        <label key={k} className={`tn-scene-field tn-scene-${k}`}>
          <span className="tn-eyebrow">{label}{saved === k && <span className="tn-saved"> ✓</span>}</span>
          <GrowField className="tn-scene-input" value={vals[k]} placeholder={ph} maxLength={120} multiline={k !== 'session'} disabled={closed}
            onFocus={() => setEditing(k)}
            onChange={e => setVals(v => ({ ...v, [k]: e.target.value.replace(/\n/g, ' ') }))}
            onBlur={() => commit(k)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
              if (e.key === 'Escape') { e.stopPropagation(); setVals(v => ({ ...v, [k]: st[k] || '' })); setEditing(null); }
            }} />
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- a faixa do combate
/**
 * Ativo (fora da casca): Rodada · Vez de (PV) · Próximo, [Próximo turno →] e [⚔ Combate].
 * Montado e parado (também na casca): "Combate montado, parado", Fim de combate guiado e
 * Abrir combate.
 */
export function CombatStrip({ combat, lang, active, wizardOn, onOpen, onNext, onWrapUp, busy }) {
  const list = combat.combatants || [];
  const cur = list[combat.turnIndex];
  let next = null;
  for (let i = 1; i <= list.length; i++) {
    const c = list[(combat.turnIndex + i) % list.length];
    if (c && !c.defeated && c.id !== cur?.id) { next = c; break; }
  }
  if (!active) {
    return (
      <div className="mesa-panel tn-combat is-idle">
        <span className="tn-combat-label">⚔ {L(lang, 'Combate montado, parado', 'Combat set up, paused')} · {list.length} {L(lang, 'combatentes', 'combatants')}</span>
        <div className="tn-combat-actions">
          {wizardOn && <button type="button" className="mesa-btn" onClick={onWrapUp}>{L(lang, 'Fim de combate', 'Wrap up')}</button>}
          <button type="button" className="mesa-btn" onClick={onOpen}>{L(lang, 'Abrir combate', 'Open combat')} →</button>
        </div>
      </div>
    );
  }
  return (
    <div className="tn-turn-wrap">
      <div className="mesa-turn is-now tn-turn" role="region" aria-label={L(lang, 'Turno do combate', 'Combat turn')}>
        <button type="button" className="tn-turn-who" onClick={onOpen}>
          <span className="mesa-turn-label">{L(lang, 'Rodada', 'Round')} {combat.round} · {L(lang, 'Vez de', 'Now')}</span>
          <span className="tn-turn-name">{cur?.name || '—'}</span>
          <span className="tn-turn-sub">
            {cur && <span className="tn-turn-hp">{L(lang, 'PV', 'HP')} {cur.current_hp}/{cur.stats?.max_hp ?? '?'}</span>}
            {next && <span className="tn-turn-next">{cur ? ' · ' : ''}{L(lang, 'Próximo', 'Next')}: {next.name}</span>}
          </span>
        </button>
        <button type="button" className="mesa-btn mesa-btn-lg is-primary tn-next" disabled={busy} onClick={onNext}>
          <span>{L(lang, 'Próximo turno', 'Next turn')}{' '}<span aria-hidden="true">→</span></span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pistas, À mão e anotações
const OPEN_KEY = (id) => `forja.play.planOpen.${id}`;
function readOpen(id) {
  const byDefault = mediaNow('(min-width: 768px)', true);
  try { const v = window.localStorage.getItem(OPEN_KEY(id)); return v == null ? byDefault : v === '1'; } catch { return byDefault; }
}

/**
 * "Pistas · 2 de 8 achadas" (recolhível, lembrado por aparelho): ☐ achada; marcar uma pista
 * NUNCA revela nada — ligada a um cartão, só PERGUNTA "Revelar também no cartão?" (com
 * "Registrar na Crônica"). Embaixo, À mão na sessão toda (os cartões do plano, com Quem vê e
 * 📺) e as Anotações do plano (o começo forte, os monstros e as recompensas em texto).
 */
export function PlanClues({ campaign, lang, view, handy = [], ask, busy, closed = false, onToggleClue, onReveal, onDismissAsk, onOpenEntry, onRevealEntry, onRevealed, onEditPlan }) {
  const [open, setOpen] = useState(() => readOpen(campaign.id));
  const [log, setLog] = useState(true);
  const pg = view.progress;
  const has = view.clues.length || handy.length || view.monsters || view.rewards || view.strongStart;
  if (!has) return null;
  const toggle = (e) => {
    const next = e.currentTarget.open;
    setOpen(next);
    try { window.localStorage.setItem(OPEN_KEY(campaign.id), next ? '1' : '0'); } catch { /* sem storage */ }
  };
  return (
    <details className="mesa-panel spp now-clues" open={open} onToggle={toggle}>
      <summary className="spp-summary">
        <span className="mesa-gem" aria-hidden="true" />
        <span className="spp-title"><span className="mesa-foil">{L(lang, 'Pistas e à mão', 'Clues and handy')}</span></span>
        {pg.clues > 0 && <span className="spp-progress">{L(lang, `${pg.cluesFound} de ${pg.clues} achadas`, `${pg.cluesFound} of ${pg.clues} found`)}</span>}
        <span className="spp-toggle-word" aria-hidden="true">{open ? '▴' : '▸'}</span>
      </summary>
      <div className="spp-body">
        {view.clues.length > 0 && (
          <div className="spp-block">
            <span className="spp-eyebrow">🗝 {L(lang, 'Pistas', 'Clues')}</span>
            <ul className="spp-list">
              {view.clues.map(c => (
                <li key={c.id} className={`spp-item ${c.discovered ? 'is-done' : ''}`}>
                  <label className="spp-check">
                    <input type="checkbox" checked={c.discovered} disabled={closed} onChange={() => onToggleClue(c.id)} />
                    <span className="spp-check-label">{L(lang, 'achada', 'found')}</span>
                  </label>
                  <div className="spp-text">
                    {c.text && <span className="spp-pre">{c.text}</span>}
                    {c.entryName && <span className="spp-room">🔗 {c.entryName}</span>}
                  </div>
                  {ask?.secretItemId === c.id && (
                    <div className="spp-ask" role="group" aria-label={L(lang, 'Revelar no cartão?', 'Reveal on the card?')}>
                      <span>{L(lang, `Revelar também no cartão “${ask.entryName || '…'}”?`, `Also reveal it on “${ask.entryName || '…'}”?`)}</span>
                      <label className="spp-log"><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} /> {L(lang, 'Registrar na Crônica', 'Log to the Chronicle')}</label>
                      <button type="button" className="mesa-btn is-primary" disabled={busy} onClick={() => onReveal(log)}>👁 {L(lang, 'Revelar', 'Reveal')}</button>
                      <button type="button" className="mesa-btn is-quiet" disabled={busy} onClick={onDismissAsk}>{L(lang, 'Agora não', 'Not now')}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {handy.length > 0 && (
          <div className="spp-block">
            <span className="spp-eyebrow">🎭 {L(lang, 'À mão na sessão toda', 'Handy all session')}</span>
            <div className="ins-list">
              {handy.map(e => (
                <EntryRow key={e.id} entry={e} lang={lang} onOpen={onOpenEntry} openLabel={L(lang, 'Abrir o cartão', 'Open the card')}
                  onReveal={onRevealEntry} campaign={campaign} onRevealed={onRevealed} />
              ))}
            </div>
          </div>
        )}
        {(view.monsters || view.rewards || view.strongStart) && (
          <div className="spp-block spp-two">
            <span className="spp-eyebrow">📝 {L(lang, 'Anotações do plano', 'Plan notes')}</span>
            {view.strongStart && <div><span className="spp-sub">⚡ {L(lang, 'Começo forte', 'Strong start')}</span><p className="spp-pre">{view.strongStart}</p></div>}
            {view.monsters && <div><span className="spp-sub">🐉 {L(lang, 'Monstros', 'Monsters')}</span><p className="spp-pre">{view.monsters}</p></div>}
            {view.rewards && <div><span className="spp-sub">💎 {L(lang, 'Recompensas', 'Rewards')}</span><p className="spp-pre">{view.rewards}</p></div>}
          </div>
        )}
        {onEditPlan && (
          <button type="button" className="mesa-btn is-quiet spp-edit" onClick={onEditPlan}>✎ {L(lang, 'Editar o plano em Preparar', 'Edit the plan in Prepare')}</button>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------- ⋯ Ferramentas
/** A folha ⋯ Ferramentas: o que era "Ações rápidas" (menos o Pedir teste, que subiu à linha de ações). */
export function ToolsSheet({ lang, onClose, onPick, wizardOn, onWizard, busy, partyCount, closed = false }) {
  const rows = [
    ['improvise', '🎲', L(lang, 'Improvisar', 'Improvise'), L(lang, 'NPC, taverna ou nomes na hora', 'NPC, tavern or names on the spot')],
    ['recap', '📜', L(lang, 'Anteriormente em…', 'Previously on…'), L(lang, 'Um rascunho da Crônica para ler ou mostrar na Tela', 'A draft from the Chronicle to read or show')],
    ['short', '☕', L(lang, 'Descanso curto (mesa)', 'Short rest (party)'), L(lang, 'Em todos os personagens, com confirmação', 'On every character, asks first')],
    ['long', '🛌', L(lang, 'Descanso longo (mesa)', 'Long rest (party)'), L(lang, 'Em todos os personagens, com confirmação', 'On every character, asks first')],
    ['grimoire', '📖', L(lang, 'Abrir Grimório', 'Open Grimoire'), L(lang, 'As magias e regras do livro', 'Spells and rules')],
    ['fields', '✎', L(lang, 'Sessão, cena e clima', 'Session, scene and weather'), L(lang, 'O nome da cena e o clima que a Mesa dos jogadores mostra', "The scene name and weather the players' Table shows")],
  ];
  return (
    <MesaSheet title={L(lang, 'Ferramentas', 'Tools')} icon="⋯" size="auto" width="md" lang={lang} onClose={onClose} dock="bar" className="now-tools">
      <div className="now-tools-list">
        {rows.map(([id, icon, label, sub]) => (
          <button key={id} type="button" className="mesa-row now-tool" onClick={() => onPick(id)}
            disabled={closed && id !== 'grimoire' && id !== 'recap' || (busy && (id === 'short' || id === 'long')) || (!partyCount && (id === 'short' || id === 'long'))}>
            <span className="now-tool-ico" aria-hidden="true">{icon}</span>
            <span className="mesa-row-main"><span className="mesa-row-title">{label}</span><span className="mesa-row-sub">{sub}</span></span>
          </button>
        ))}
        <label className="tn-toggle now-tool-toggle">
          <input type="checkbox" checked={wizardOn} disabled={busy || closed} onChange={e => onWizard(e.target.checked)} />
          <span>
            <strong>☐ {L(lang, 'Fim de combate guiado', 'Guided end of combat')}</strong>
            <span className="tn-toggle-hint">{L(lang,
              'Ao encerrar o combate: XP, descanso, tesouro e nota no Diário (tudo opcional).',
              'When combat ends: XP, rest, treasure and a Diary note (all optional).')}</span>
          </span>
        </label>
      </div>
    </MesaSheet>
  );
}
