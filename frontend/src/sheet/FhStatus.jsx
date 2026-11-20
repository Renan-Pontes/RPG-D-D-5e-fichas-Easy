/* Estados da ficha em palavras (visual "Ficha Forjada"; estilos em ./condition-fx.css).
 * O efeito bonito fica em ./FhConditions.jsx; aqui a ficha DIZ o que cada estado faz:
 *
 * - FhStatusPanel: dentro do painel Vitalidade, abaixo das barras. Cada estado ativo é uma
 *   linha [ícone] [nome] [a regra em uma linha] [✕]; tocar no texto abre o artigo do Grimório.
 *   "+ Condição" abre as 15 condições em ordem alfabética, cada uma com a regra embaixo, e
 *   fecha em "Concluir · N ativas". "+ Efeito" abre nome e duração de um efeito personalizado
 *   logo abaixo da barra. Remover mostra o aviso da ficha com "Desfazer"; o ✕ da Exaustão
 *   desce um nível por vez. O controle tocado não sai de baixo do dedo (useHoldStill).
 * - FhStanceHint: UMA fileira de lembretes de uma linha sob o título de um painel: a SUGESTÃO
 *   para o "Próximo d20" (o jogador toca; nada é escolhido sozinho), "sem ações", a
 *   penalidade da Exaustão e a Inspiração (só o selo; a frase mora na lista de estados).
 * - attackMark / halfMark / FhSpeedBite / initMark: marcas discretas onde o estado pesa.
 *   Desvantagem com ressalva (Amedrontado, Agarrado) vira seta vazada ▽ + "se…".
 *
 * Tudo informativo: nenhum número, fórmula ou rolagem muda. As regras vêm de
 * ./condition-rules.js (textos do Grimório, na edição da ficha). */
import { lazy, Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { tName } from '../../data/i18n.js';
import { STATE_SHORTS } from '../../data/grimoire/condition-shorts.js';
import { ArtIcon } from '../components/ArtThumb.jsx';
import { conditionIcon, CONDITION_EMOJI } from '../art.js';
import GrimoireHint from '../grimoire/GrimoireHint.jsx';
import { exhaustionLevel, toggleExhausted, setExhaustion, lowerExhaustion } from './hp-logic.js';
import {
  CONDITION_IDS, FAMILY, conditionLine, is2024, statusList, statusLabel, stanceHint, saveBite, speedBite, sourceNames,
} from './condition-rules.js';
import { FhStatusGlyph, FhStatusIcon, useStatusDiff, useGainMoment } from './FhConditions.jsx';
import { useSheetToast } from './sheet-toast.jsx';

const GrimoirePopup = lazy(() => import('../grimoire/GrimoirePopup.jsx'));

/** Artigo do Grimório aberto por cima da ficha: [abrir(id), nó]. O nó vai num contêiner sem transform. */
function useGrimoire(lang) {
  const [id, setId] = useState(null);
  const node = id ? <Suspense fallback={null}><GrimoirePopup id={id} lang={lang} onClose={() => setId(null)} /></Suspense> : null;
  return [setId, node];
}

const stateLine = (key, lang, rulesVersion) => {
  const e = STATE_SHORTS[key];
  if (!e) return '';
  const pick = !is2024(rulesVersion) && e.short2014 ? e.short2014 : e.short;
  return pick[lang === 'en' ? 'en' : 'pt'];
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * O controle tocado fica parado na tela. Ligar ou desligar um estado põe e tira coisas ACIMA
 * dele (a faixa de estados do celular, a fileira de lembretes sob "Vitalidade"); sem isto o
 * seletor andava ~50 px sob o dedo. `keep(el)` guarda onde o controle estava; depois que a
 * ficha redesenha (mudou `sig`), a página rola a diferença. Um mecanismo só: a âncora de
 * rolagem do navegador fica desligada por um instante para não compensar de novo.
 */
function useHoldStill(sig, fallbackRef) {
  const hold = useRef(null);
  const timer = useRef(0);
  const keep = (el) => {
    if (typeof window === 'undefined') return;
    const fb = fallbackRef.current;
    hold.current = {
      el: el || null, top: el ? el.getBoundingClientRect().top : null,
      fbTop: fb ? fb.getBoundingClientRect().top : null, at: Date.now(),
    };
    document.documentElement.style.overflowAnchor = 'none';
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { document.documentElement.style.overflowAnchor = ''; }, 500);
  };
  useLayoutEffect(() => {
    const h = hold.current;
    hold.current = null;
    if (!h || Date.now() - h.at > 1500) return;
    let el = h.el;
    let before = h.top;
    if (!el || !el.isConnected || before == null) { el = fallbackRef.current; before = h.fbTop; }
    if (!el || before == null) return;
    const delta = el.getBoundingClientRect().top - before;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimeout(timer.current); if (typeof document !== 'undefined') document.documentElement.style.overflowAnchor = ''; }, []);
  return keep;
}

// ── Lista de estados + seletor de condições ──
export function FhStatusPanel({ char, lang, update }) {
  const pt = lang !== 'en';
  const v = char.rulesVersion;
  const [open, setOpen] = useState(false);       // seletor das 15 condições
  const [adding, setAdding] = useState(false);   // campos do efeito personalizado
  const [draft, setDraft] = useState({ name: '', duration: '' });
  const [editing, setEditing] = useState(null);
  const [say, setSay] = useState('');
  const [openRule, popup] = useGrimoire(lang);
  const toast = useSheetToast();
  const btnRef = useRef(null);
  const fxBtnRef = useRef(null);
  const nameRef = useRef(null);
  const uid = useId();
  const pickId = `${uid}pick`;
  const addId = `${uid}add`;

  const conds = char.conditions || [];
  const temps = char.tempEffects || [];
  const exh = exhaustionLevel(char);
  const isOn = (id) => (id === 'exhausted' ? exh > 0 : conds.includes(id));
  const nameOf = (id) => (id === 'exhausted' && exh > 0 ? statusLabel({ kind: 'cond', id, level: exh }, lang) : tName('condition', id, lang));

  // a ficha mais recente, para o "Desfazer" não devolver uma lista velha de condições
  const live = useRef(char);
  live.current = char;
  const undoable = (text, back) => toast?.show({ text, ms: 6000, onAction: () => update(back(live.current)) });

  // Linhas: condições (a mais grave primeiro), Sangrando / à beira, Exaustão, efeitos e a
  // Inspiração (o lugar da frase dela). Caído, Estável e Morto já têm a frase deles na linha
  // dos testes contra a morte.
  const lines = statusList(char).filter(s => s.kind === 'cond' || s.kind === 'temp' || s.key === 'bloodied' || s.key === 'near' || s.key === 'inspired');
  const diff = useStatusDiff(lines.map(s => s.key), char.id, { leaveMs: 280, freshMs: 700 });
  const seen = useRef(new Map());
  for (const s of lines) seen.current.set(s.key, { s, label: statusLabel(s, lang) });
  const gone = diff.leaving.filter(k => !lines.some(s => s.key === k) && seen.current.has(k));
  const keep = useHoldStill(`${lines.map(s => s.key).join('|')}#${exh}`, btnRef);

  const toggle = (id, el) => {
    const on = isOn(id);
    const name = tName('condition', id, lang);
    keep(el);
    if (id === 'exhausted') {
      update(toggleExhausted(char));   // a mesma regra da barra de Exaustão
      // desligar pelo seletor apaga todos os níveis: dá para voltar ao nível de antes
      if (on && exh > 1) undoable(pt ? `Exaustão ${exh} removida` : `Exhaustion ${exh} removed`, c => setExhaustion(c, exh));
    } else {
      update({ conditions: on ? conds.filter(c => c !== id) : [...conds, id] });
    }
    setSay(on
      ? (pt ? `${name} removido` : `${name} removed`)
      : `${name} ${pt ? 'aplicado' : 'applied'}: ${conditionLine(id, lang, v)}`);
  };
  // ✕ de uma linha: remove (a Exaustão desce um nível) e oferece "Desfazer" no aviso da ficha
  const removeLine = (id, el) => {
    const name = tName('condition', id, lang);
    keep(el);
    if (id === 'exhausted') {
      update(lowerExhaustion(char));
      const now = exh - 1;
      const text = now > 0 ? (pt ? `Exaustão: ${exh} → ${now}` : `Exhaustion: ${exh} → ${now}`) : (pt ? 'Exaustão removida' : 'Exhaustion removed');
      undoable(text, c => setExhaustion(c, exh));
      setSay(text);
      return;
    }
    update({ conditions: conds.filter(c => c !== id) });
    undoable(pt ? `${name} removido` : `${name} removed`, c => ({ conditions: (c.conditions || []).includes(id) ? c.conditions || [] : [...(c.conditions || []), id] }));
    setSay(pt ? `${name} removido` : `${name} removed`);
  };
  const addTemp = () => {
    const name = draft.name.trim();
    if (!name) { nameRef.current?.focus({ preventScroll: true }); return; }
    keep(fxBtnRef.current);
    update({ tempEffects: [...temps, { id: Date.now().toString(), name, duration: draft.duration.trim() }] });
    setDraft({ name: '', duration: '' });
    setAdding(false);
    setSay(pt ? `Efeito ${name} aplicado` : `Effect ${name} applied`);
    requestAnimationFrame(() => fxBtnRef.current?.focus({ preventScroll: true }));
  };
  const removeTemp = (e, el) => {
    keep(el);
    update({ tempEffects: temps.filter(x => x.id !== e.id) });
    if (editing === e.id) setEditing(null);
    const text = pt ? `Efeito ${e.name} removido` : `Effect ${e.name} removed`;
    undoable(text, c => ({ tempEffects: (c.tempEffects || []).some(x => x.id === e.id) ? c.tempEffects : [...(c.tempEffects || []), e] }));
    setSay(text);
  };
  const updateTemp = (id, patch) => update({ tempEffects: temps.map(e => (e.id === id ? { ...e, ...patch } : e)) });

  const sorted = [...CONDITION_IDS].sort((a, b) => tName('condition', a, lang).localeCompare(tName('condition', b, lang), pt ? 'pt' : 'en'));
  const activeCount = CONDITION_IDS.filter(isOn).length;
  // Fechar o seletor: o foco volta para "+ Condição". Se a barra ficou fora da tela (o jogador
  // fechou lá embaixo, em "Concluir"), a página volta até ela: é onde estão as linhas dos estados.
  const close = (focus) => {
    setOpen(false);
    if (!focus) return;
    requestAnimationFrame(() => {
      const b = btnRef.current;
      if (!b) return;
      b.focus({ preventScroll: true });
      const r = b.getBoundingClientRect();
      if (r.top < 110 || r.bottom > window.innerHeight - 20) {
        const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        b.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  };
  const closeAdd = (focus) => { setAdding(false); if (focus) requestAnimationFrame(() => fxBtnRef.current?.focus({ preventScroll: true })); };

  // os campos ganham o foco ao abrir
  const editRef = useRef(null);
  useEffect(() => { if (editing) editRef.current?.focus({ preventScroll: true }); }, [editing]);
  useEffect(() => { if (adding) nameRef.current?.focus({ preventScroll: true }); }, [adding]);

  // A frase da Inspiração aparece UMA vez, no aviso da ficha, no momento em que ela chega
  // (sem empurrar nada); depois mora na linha "Inspirado" da lista.
  const inspNow = useGainMoment(!!char.inspiration, char.id, 400);
  useEffect(() => {
    if (!inspNow) return;
    toast?.show({ tone: 'info', ms: 6000, text: `${pt ? 'Inspiração' : 'Inspiration'}: ${stateLine('inspired', lang, v)}` });
  }, [inspNow]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = (k) => (diff.fresh.includes(k) ? ' is-fresh' : '');
  const rm = pt ? 'Remover' : 'Remove';
  const shown = lines.filter(s => !open || s.kind === 'temp');

  return (
    <section className="fh-status fh-cond-embed" aria-label={pt ? 'Condições e efeitos' : 'Conditions and effects'}>
      <div className="fh-cond-bar">
        <span className="fh-status-k">{pt ? 'Condições e efeitos' : 'Conditions & effects'}</span>
        {!lines.length && !open && !adding && <span className="fh-status-none">{pt ? 'nenhum ativo' : 'none active'}</span>}
        <GrimoireHint id="condicoes" lang={lang} />
        <button ref={fxBtnRef} type="button" className="btn btn-sm btn-ghost fh-status-add is-fx" aria-expanded={adding} aria-controls={addId}
          onClick={() => { setAdding(a => !a); if (open) setOpen(false); }}>
          {adding ? (pt ? 'Cancelar' : 'Cancel') : (pt ? '+ Efeito' : '+ Effect')}
        </button>
        <button ref={btnRef} type="button" className="btn btn-sm btn-ghost fh-status-add" aria-expanded={open} aria-controls={pickId}
          onClick={() => { setOpen(o => !o); if (adding) setAdding(false); }}>
          {open ? (pt ? 'Fechar' : 'Close') : (pt ? '+ Condição' : '+ Condition')}
        </button>
      </div>
      <div className="fh-sr" role="status" aria-live="polite">{say}</div>

      {adding && (
        <div id={addId} className="fh-cond-add" role="group" aria-label={pt ? 'Novo efeito personalizado' : 'New custom effect'}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTemp(); } else if (e.key === 'Escape') { e.stopPropagation(); closeAdd(true); } }}>
          <input ref={nameRef} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} maxLength={60}
            aria-label={pt ? 'Nome do efeito' : 'Effect name'} placeholder={pt ? 'Efeito (ex.: Bênção)' : 'Effect (e.g. Bless)'} />
          <input value={draft.duration} onChange={e => setDraft(d => ({ ...d, duration: e.target.value }))} maxLength={40}
            aria-label={pt ? 'Duração (opcional)' : 'Duration (optional)'} placeholder={pt ? 'Duração (ex.: 1 min)' : 'Duration (e.g. 1 min)'} />
          <button type="button" className="btn btn-sm fh-cond-add-ok" onClick={addTemp}>{pt ? 'Adicionar' : 'Add'}</button>
        </div>
      )}

      {open && (
        <div id={pickId} className="cond-chips fh-cond-pick" role="group" aria-label={pt ? 'Condições: toque para ligar ou desligar' : 'Conditions: tap to switch on or off'}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } }}>
          {sorted.map(id => {
            const on = isOn(id);
            return (
              <button key={id} type="button" className={`cond-chip${on ? ' on' : ''}`} data-cond={id} data-fam={FAMILY[id]}
                aria-pressed={on} aria-label={nameOf(id)} aria-describedby={`${uid}r-${id}`} onClick={(e) => toggle(id, e.currentTarget)}>
                <ArtIcon src={conditionIcon(id)} emoji={CONDITION_EMOJI[id]} size={30} />
                <span className="fh-pick-txt">
                  <span className="fh-pick-name">{nameOf(id)}{FAMILY[id] === 'boon' && <span className="fh-cond-boon" aria-hidden="true">▲</span>}</span>
                  <span id={`${uid}r-${id}`} className="fh-pick-rule">{conditionLine(id, lang, v)}</span>
                </span>
                <span className="fh-pick-state" aria-hidden="true">{on ? '✓' : '+'}</span>
              </button>
            );
          })}
          {/* fechar sem rolar de volta até o topo do seletor */}
          <button type="button" className="btn btn-sm fh-pick-done" onClick={() => close(true)}>
            {pt ? 'Concluir' : 'Done'}<span className="fh-pick-done-n"> · {activeCount} {pt ? (activeCount === 1 ? 'ativa' : 'ativas') : 'active'}</span>
          </button>
        </div>
      )}

      {(shown.length > 0 || (!open && gone.length > 0)) && (
        <ul className="fh-status-list">
          {shown.map(s => {
            if (s.kind === 'temp') {
              const e = temps.find(x => x.id === s.id) || { id: s.id, name: s.name, duration: s.duration };
              const dur = e.duration ? (pt ? `dura ${e.duration}` : `lasts ${e.duration}`) : (pt ? 'sem duração definida' : 'no duration set');
              return (
                <li key={s.key} className={`fh-cond-line is-temp${fresh(s.key)}`} data-fam="custom">
                  {editing === e.id ? (
                    <span className="fh-cond-edit" onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === 'Escape') { ev.stopPropagation(); setEditing(null); } }}>
                      <input ref={editRef} value={e.name} onChange={ev => updateTemp(e.id, { name: ev.target.value })}
                        aria-label={pt ? 'Nome do efeito' : 'Effect name'} placeholder={pt ? 'Nome do efeito' : 'Effect name'} />
                      <input value={e.duration || ''} onChange={ev => updateTemp(e.id, { duration: ev.target.value })}
                        aria-label={pt ? 'Duração' : 'Duration'} placeholder={pt ? 'Duração (ex.: 1 min)' : 'Duration (e.g. 1 min)'} />
                      <button type="button" className="fh-cond-done" onClick={() => setEditing(null)} aria-label={pt ? 'Concluir edição' : 'Done editing'}>✓</button>
                    </span>
                  ) : (
                    <button type="button" className="fh-cond-main" onClick={() => setEditing(e.id)}
                      aria-label={pt ? `Efeito ${e.name}: ${dur}. Toque para editar nome e duração` : `Effect ${e.name}: ${dur}. Tap to edit name and duration`}>
                      <span className="fh-cond-ico"><FhStatusIcon s={s} size={30} /></span>
                      <span className="fh-cond-txt">
                        <span className="fh-cond-name">{e.name || (pt ? 'Efeito' : 'Effect')}</span>
                        <span className="fh-cond-rule">{dur}</span>
                      </span>
                      <span className="fh-cond-pen" aria-hidden="true">✎</span>
                    </button>
                  )}
                  <button type="button" className="fh-cond-rm" onClick={(ev) => removeTemp(e, ev.currentTarget)} aria-label={`${rm} ${e.name}`}>✕</button>
                </li>
              );
            }
            const hp = s.kind !== 'cond';   // Sangrando, À beira da morte, Inspirado: sem ✕
            const isExh = s.id === 'exhausted';
            const name = statusLabel(s, lang);
            const rule = isExh ? (pt ? 'O efeito deste nível está na barra de Exaustão, acima' : 'This level\'s effect is on the Exhaustion bar, above')
              : hp ? cap(stateLine(s.key, lang, v)) : conditionLine(s.id, lang, v);
            const article = hp ? STATE_SHORTS[s.key].article : s.id;
            return (
              <li key={s.key} className={`fh-cond-line${hp ? ' is-hp' : ''}${fresh(s.key)}`} data-fam={s.fam} data-cond={hp ? undefined : s.id} data-state={hp ? s.key : undefined}>
                <button type="button" className="fh-cond-main" onClick={() => openRule(article)}
                  aria-label={`${name}: ${isExh ? conditionLine(s.id, lang, v) : rule}. ${pt ? 'Abrir a regra no Grimório' : 'Open the rule in the Grimoire'}`}>
                  <span className="fh-cond-ico"><FhStatusIcon s={s} size={30} /></span>
                  <span className="fh-cond-txt">
                    <span className="fh-cond-name">{name}{s.fam === 'boon' && <span className="fh-cond-boon"><span aria-hidden="true">▲ </span>{pt ? 'a seu favor' : 'in your favor'}</span>}</span>
                    <span className="fh-cond-rule">{rule}</span>
                  </span>
                </button>
                {!hp && (isExh && exh > 1
                  ? <button type="button" className="fh-cond-rm is-step" onClick={(ev) => removeLine(s.id, ev.currentTarget)} aria-label={pt ? `Reduzir Exaustão para ${exh - 1}` : `Lower Exhaustion to ${exh - 1}`}>−1</button>
                  : <button type="button" className="fh-cond-rm" onClick={(ev) => removeLine(s.id, ev.currentTarget)} aria-label={`${rm} ${tName('condition', s.id, lang)}`}>✕</button>)}
              </li>
            );
          })}
          {!open && gone.map(k => {
            const g = seen.current.get(k);
            return (
              <li key={`out-${k}`} className="fh-cond-line is-leaving" data-fam={g.s.fam} aria-hidden="true">
                <span className="fh-cond-main"><span className="fh-cond-ico"><FhStatusIcon s={g.s} size={30} /></span>
                  <span className="fh-cond-txt"><span className="fh-cond-name">{g.label}</span></span></span>
              </li>
            );
          })}
        </ul>
      )}
      {popup}
    </section>
  );
}

// ── Lembretes sob o título de um painel ──
const WORD = {
  pt: { adv: 'Vant.', dis: 'Desv.', advFull: 'Vantagem', disFull: 'Desvantagem', attacks: 'em ataques', checks: 'em testes', initiative: 'na iniciativa', iff: 'se…', use: 'usar', armed: 'armado', sources: 'fontes' },
  en: { adv: 'Adv.', dis: 'Dis.', advFull: 'Advantage', disFull: 'Disadvantage', attacks: 'on attacks', checks: 'on checks', initiative: 'on Initiative', iff: 'if…', use: 'use', armed: 'set', sources: 'sources' },
};
// seta cheia = vale sempre; seta vazada = só na situação da ressalva (Amedrontado, Agarrado)
const arrow = (side, conditional) => (side === 'dis' ? (conditional ? '▽' : '▼') : (conditional ? '△' : '▲'));
const clauseText = (h, pt) => h.clauses.join(pt ? ' ou ' : ' or ');
/** "Desvantagem em ataques com a fonte do medo à vista (Amedrontado (…))" para leitor de tela e title. */
const fullHint = (h, kind, W, pt) => {
  const list = h[h.suggest];
  return `${W[`${h.suggest}Full`]}${kind ? ` ${W[kind]}` : ''}${h.conditional ? ` ${clauseText(h, pt)}` : ''} (${h.conditional ? list.map(s => s.name).join(' · ') : sourceNames(list)})`;
};

/**
 * kind: 'attacks' | 'checks'. Uma fileira de selos de UMA linha (o painel não perde 200 px):
 * - "Sem ações nem reações" quando uma fonte tira as ações (aí não há o que sugerir);
 * - a SUGESTÃO para o "Próximo d20": um botão ("usar") que arma o seletor do painel
 *   (onStance); tocar de novo desarma. Nada é escolhido sozinho. Com várias fontes, ou com
 *   ressalva, um segundo botão (▾) abre os nomes;
 * - a penalidade da Exaustão ("−4 d20", 2024) e o selo da Inspiração (abre o Grimório).
 */
export function FhStanceHint({ bites, kind, stance, onStance, lang, rulesVersion, noActions = true }) {
  const [openRule, popup] = useGrimoire(lang);
  const [more, setMore] = useState(false);
  const srcId = useId();
  if (!bites) return null;
  const pt = lang !== 'en';
  const W = WORD[pt ? 'pt' : 'en'];
  const pen = bites.d20Penalty;
  const na = noActions && bites.noActions.length ? bites.noActions : null;
  const h = stanceHint(bites, kind);   // sem ações → null: fica só a placa
  if (!h && !pen && !na && !bites.inspiration) return null;
  const side = h && h.suggest !== 'normal' ? h.suggest : null;
  const armed = !!side && stance === side;
  const list = side ? h[side] : [];
  const needMore = !!h && (side ? (list.length > 1 || h.conditional) : (h.adv.length + h.dis.length > 2));
  const srcText = !h ? '' : side ? sourceNames(list) : `${sourceNames(h.adv)} × ${sourceNames(h.dis)}`;
  const inspLine = stateLine('inspired', lang, rulesVersion);
  return (
    <div className="fh-bites" role="group" aria-label={pt ? 'Lembretes dos estados ativos' : 'Reminders from active statuses'}>
      {na && (
        <span className="fh-bite is-block" title={sourceNames(na)}>
          <span className="fh-bite-g" aria-hidden="true">✕</span>
          <span className="fh-bite-t"><b>{pt ? 'Sem ações nem reações' : 'No actions or reactions'}</b></span>
          <span className="fh-bite-src">{na[0].name}{na.length > 1 ? ` +${na.length - 1}` : ''}</span>
        </span>
      )}
      {h && !side && (
        <span className="fh-bite is-normal">
          <span className="fh-bite-g" aria-hidden="true">=</span>
          <span className="fh-bite-t"><b>{W.adv} + {W.dis} = Normal</b> {W[kind]}</span>
          {!needMore && <span className="fh-bite-src">{srcText}</span>}
          {needMore && (
            <button type="button" className="fh-bite-more" aria-expanded={more} aria-controls={srcId} onClick={() => setMore(m => !m)}
              aria-label={pt ? `Ver as fontes: ${srcText}` : `Show the sources: ${srcText}`}>
              {h.adv.length + h.dis.length} {W.sources}<span className="fh-bite-caret" aria-hidden="true">▾</span>
            </button>
          )}
        </span>
      )}
      {side && (
        <span className={`fh-bite is-hint is-${side}${h.conditional ? ' is-cond' : ''}${armed ? ' is-armed' : ''}`}>
          <button type="button" className="fh-bite-use" aria-pressed={armed} title={fullHint(h, kind, W, pt)}
            onClick={() => onStance?.(armed ? 'normal' : side)}
            aria-label={pt
              ? `Sugestão: ${fullHint(h, kind, W, pt)}. ${armed ? 'Armada para o próximo d20; toque para desarmar' : 'Toque para armar no próximo d20'}`
              : `Suggestion: ${fullHint(h, kind, W, pt)}. ${armed ? 'Set for the next d20; tap to clear' : 'Tap to set it for the next d20'}`}>
            <span className="fh-bite-g" aria-hidden="true">{arrow(side, h.conditional)}</span>
            <span className="fh-bite-t"><b>{W[side]}</b> {W[kind]}{h.conditional && <i className="fh-bite-if"> {W.iff}</i>}</span>
            {list.length === 1 && <span className="fh-bite-src">{list[0].name}</span>}
            <span className="fh-bite-act" aria-hidden="true">{armed ? `✓ ${W.armed}` : W.use}</span>
          </button>
          {needMore && (
            <button type="button" className="fh-bite-more" aria-expanded={more} aria-controls={srcId} onClick={() => setMore(m => !m)}
              aria-label={pt ? `Ver de onde vem: ${srcText}` : `Show where it comes from: ${srcText}`}>
              {list.length > 1 ? `${list.length} ${W.sources}` : ''}<span className="fh-bite-caret" aria-hidden="true">▾</span>
            </button>
          )}
        </span>
      )}
      {pen && (
        <span className="fh-bite is-pen" title={`${pen.src.name}: ${pt ? `−${pen.n} em todo Teste de d20 (desconte você)` : `−${pen.n} on every D20 Test (subtract it yourself)`}`}>
          <span className="fh-bite-g" aria-hidden="true"><FhStatusGlyph k="exhausted" size={13} /></span>
          <span className="fh-bite-t"><b>−{pen.n}</b> d20</span>
          <span className="fh-bite-src">{pt ? 'desconte você' : 'subtract it'}</span>
          <span className="fh-sr">, {pen.src.name}</span>
        </span>
      )}
      {bites.inspiration && (
        <button type="button" className="fh-bite is-insp" onClick={() => openRule('inspiracao-heroica')} title={`${pt ? 'Inspiração' : 'Inspiration'}: ${inspLine}`}
          aria-label={`${pt ? 'Inspiração' : 'Inspiration'}: ${inspLine}. ${pt ? 'Abrir a regra no Grimório' : 'Open the rule in the Grimoire'}`}>
          <span className="fh-bite-g" aria-hidden="true">★</span>
          <span className="fh-bite-t"><b>{pt ? 'Inspiração' : 'Inspiration'}</b></span>
        </button>
      )}
      {more && needMore && <span id={srcId} className="fh-bite-srcs">{srcText}</span>}
      {popup}
    </div>
  );
}

/**
 * Marca de uma linha de ataque (o bônus não muda):
 * null | { kind: 'block'|'normal'|'dis'|'adv', glyph, aria, conditional?, use? }
 * `use` (só com sugestão): { label, armed, aria, onUse } — o selo "▼ usar" da linha, que arma
 * o "Próximo d20" como o botão do topo do painel (nunca sozinho; tocar de novo desarma).
 * Sem ações: nenhuma pílula por linha (a placa do painel já diz); a linha só esmaece.
 */
export function attackMark(bites, lang, stance = null, onStance = null) {
  if (!bites) return null;
  const pt = lang !== 'en';
  const W = WORD[pt ? 'pt' : 'en'];
  if (bites.noActions.length) {
    const words = pt ? 'Sem ações' : 'No actions';
    return { kind: 'block', glyph: '✕', aria: `${words} (${sourceNames(bites.noActions)})` };
  }
  const h = stanceHint(bites, 'attacks');
  if (!h) return null;
  if (h.suggest === 'normal') {
    return { kind: 'normal', glyph: '=', aria: `${W.advFull} + ${W.disFull} = Normal (${sourceNames(h.adv)}; ${sourceNames(h.dis)})` };
  }
  const side = h.suggest;
  const armed = stance === side;
  const aria = fullHint(h, '', W, pt);
  return {
    kind: side,
    glyph: arrow(side, h.conditional),
    conditional: h.conditional,
    aria,
    use: onStance ? {
      armed,
      label: armed ? `✓ ${W.armed}` : `${W[side]}${h.conditional ? ` ${W.iff}` : ''} · ${W.use}`,
      aria: pt
        ? `Sugestão: ${aria}. ${armed ? 'Armada para o próximo d20; toque para desarmar' : 'Toque para armar no próximo d20'}`
        : `Suggestion: ${aria}. ${armed ? 'Set for the next d20; tap to clear' : 'Tap to set it for the next d20'}`,
      onUse: () => onStance(armed ? 'normal' : side),
    } : null,
  };
}

/**
 * Marca de uma metade de hexágono. half: { ability, isCheck, isSave, isAttack }.
 * → null | { kind: 'dis'|'adv'|'fail'|'normal', glyph, aria } (▽/△: só na situação da ressalva)
 */
export function halfMark(bites, half, lang) {
  if (!bites) return null;
  const pt = lang !== 'en';
  const W = WORD[pt ? 'pt' : 'en'];
  if (half.isSave) {
    const b = saveBite(bites, half.ability);
    if (!b) return null;
    return b.kind === 'fail'
      ? { kind: 'fail', glyph: '✕', aria: `${pt ? 'falha automática' : 'automatic failure'} (${sourceNames(b.sources)})` }
      : { kind: 'dis', glyph: '▼', aria: `${W.disFull} (${sourceNames(b.sources)})` };
  }
  if (half.isAttack && bites.noActions.length) return { kind: 'fail', glyph: '✕', aria: `${pt ? 'sem ações' : 'no actions'} (${sourceNames(bites.noActions)})` };
  const h = stanceHint(bites, half.isAttack ? 'attacks' : 'checks');
  if (!h) return null;
  if (h.suggest === 'normal') return { kind: 'normal', glyph: '=', aria: `${W.advFull} + ${W.disFull} = Normal` };
  return { kind: h.suggest, glyph: arrow(h.suggest, h.conditional), aria: fullHint(h, '', W, pt) };
}

/** Etiqueta sob o medalhão de Deslocamento: "→ 0 · Agarrado" (o número do medalhão não muda). */
export function FhSpeedBite({ bites, lang }) {
  const b = speedBite(bites, lang);
  if (!b) return null;
  return (
    <div className={`fh-medal-bite is-${b.kind}`} title={sourceNames(b.sources)}>
      <b>{b.text}</b><span>{b.sources[0].name}{b.sources.length > 1 ? ` +${b.sources.length - 1}` : ''}</span>
    </div>
  );
}

/**
 * Marca da Iniciativa (dentro do botão do medalhão): → null | { kind, text, src, aria }.
 * Com ressalva, `kind` leva também a classe da borda tracejada ("dis is-cond").
 */
export function initMark(bites, lang) {
  const h = stanceHint(bites, 'initiative');
  if (!h) return null;
  const pt = lang !== 'en';
  const W = WORD[pt ? 'pt' : 'en'];
  if (h.suggest === 'normal') return { kind: 'normal', text: '= Normal', src: `${W.adv} + ${W.dis}`, aria: `${W.advFull} + ${W.disFull} = Normal (${sourceNames(h.adv)}; ${sourceNames(h.dis)})` };
  const list = h[h.suggest];
  return {
    kind: h.conditional ? `${h.suggest} is-cond` : h.suggest,
    text: `${arrow(h.suggest, h.conditional)} ${W[h.suggest]}${h.conditional ? ` ${W.iff}` : ''}`,
    src: `${list[0].name}${list.length > 1 ? ` +${list.length - 1}` : ''}`,
    aria: fullHint(h, '', W, pt),
  };
}
