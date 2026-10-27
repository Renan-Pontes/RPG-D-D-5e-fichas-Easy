// Folhas do Raio-X do grupo: Ajustar (o que o mestre customiza, gravado no servidor),
// "Por quê" (base → ficha → final e os motivos de cada personagem) e Escolher monstro
// (Contra quem?). Só apresentação: as contas vêm de party-metrics.js / versus.js.
import { useId, useMemo, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import { tName } from '../../data/i18n.js';
import * as PM from './party-metrics.js';
import { RESET_PATCH } from './insights-api.js';
import { searchMonsters } from './versus.js';

const t = PM.t;
// Tabela · · · Ficha (w = confiança na tabela: 1 só a tabela, 0 só a ficha)
const W_STEPS = [
  { w: 1, label: ['Só a tabela', 'Table only'] },
  { w: 0.75, label: ['Mais a tabela', 'Mostly the table'] },
  { w: 0.5, label: ['Meio a meio', 'Half and half'] },
  { w: 0.25, label: ['Mais a ficha', 'Mostly the sheet'] },
  { w: 0, label: ['Só a ficha', 'Sheet only'] },
];
const DCS = [10, 12, 15, 18, 20];

/** "?" de 44 px: folha pequena com 2–3 frases (explicar no lugar, nada só no hover). */
export function HelpButton({ title, text, lang }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="mesa-icon-btn ins-help" aria-label={t(lang, `Ajuda: ${title}`, `Help: ${title}`)} onClick={() => setOpen(true)}>?</button>
      {open && (
        <MesaSheet title={title} icon="?" size="auto" width="sm" lang={lang} onClose={() => setOpen(false)}
          footer={<button type="button" className="mesa-btn mesa-btn-lg" onClick={() => setOpen(false)}>{t(lang, 'Entendi', 'Got it')}</button>}>
          {text.map((p, i) => <p key={i} className="ins-help-text">{p}</p>)}
        </MesaSheet>
      )}
    </>
  );
}

export function Dot({ color }) {
  return <span className="ins-dot" style={{ background: color }} aria-hidden="true" />;
}

/** Ajustar: Tabela × Ficha, melhor × 2 melhores, CD, eixos (mostrar e importância), tabela de classes. */
export function AdjustSheet({ settings, update, lang, readOnly, saveLine, onClose }) {
  const [cls, setCls] = useState('wizard');
  const [advanced, setAdvanced] = useState(false);
  const wId = useId();
  const table = PM.baseTable(settings.base);
  const edited = Object.keys(settings.base || {});
  const setRow = (i, delta) => {
    const row = [...table[cls]];
    row[i] = Math.max(1, Math.min(5, row[i] + delta));
    const same = row.every((v, k) => v === PM.IVAN_BASE[cls][k]);
    update({ base: { [cls]: same ? null : row } });
  };
  const toggleHidden = (k) => {
    const hidden = settings.hidden.includes(k) ? settings.hidden.filter(x => x !== k) : [...settings.hidden, k];
    update({ hidden });
  };
  const dis = readOnly;
  return (
    <MesaSheet title={t(lang, 'Ajustar o Raio-X', 'Adjust the X-ray')} icon="⚙" size="tall" width="md" lang={lang} onClose={onClose}
      footer={<div className="ins-sheet-foot"><span className="ins-save-line" role="status">{saveLine}</span>
        <button type="button" className="mesa-btn is-primary mesa-btn-lg" onClick={onClose}>{t(lang, 'Pronto', 'Done')}</button></div>}>
      {readOnly && <p className="ins-note">{t(lang, 'Campanha encerrada: o Raio-X fica só para ler.', 'Campaign closed: the X-ray is read-only.')}</p>}

      <section className="ins-adj">
        <h3 className="ins-adj-title" id={wId}>{t(lang, 'Tabela · · · Ficha', 'Table · · · Sheet')}</h3>
        <p className="ins-adj-help">{t(lang, 'A tabela diz o que a classe costuma fazer; a ficha diz o que este personagem faz hoje.', 'The table says what the class usually does; the sheet says what this character does today.')}</p>
        <div className="ins-steps" role="radiogroup" aria-labelledby={wId}>
          <span className="ins-steps-end" aria-hidden="true">{t(lang, 'Tabela', 'Table')}</span>
          {W_STEPS.map(s => (
            <button key={s.w} type="button" role="radio" aria-checked={settings.w === s.w} disabled={dis}
              className={`ins-step ${settings.w === s.w ? 'is-on' : ''}`} aria-label={PM.t(lang, ...s.label)}
              onClick={() => update({ w: s.w })}><span aria-hidden="true" /></button>
          ))}
          <span className="ins-steps-end" aria-hidden="true">{t(lang, 'Ficha', 'Sheet')}</span>
        </div>
        <p className="ins-adj-now">{PM.t(lang, ...W_STEPS.find(s => s.w === settings.w)?.label || W_STEPS[2].label)}</p>
      </section>

      <section className="ins-adj">
        <h3 className="ins-adj-title">{t(lang, '"Melhor do grupo"', '"Party best"')}</h3>
        <div className="ins-pair" role="group" aria-label={t(lang, 'Melhor do grupo', 'Party best')}>
          {[['best', t(lang, 'Melhor', 'Best')], ['top2', t(lang, '2 melhores', 'Top 2')]].map(([v, l]) => (
            <button key={v} type="button" className="mesa-chip" aria-pressed={settings.rep === v} disabled={dis} onClick={() => update({ rep: v })}>{l}</button>
          ))}
        </div>
        <p className="ins-adj-help">{t(lang, '"2 melhores" mostra a média do melhor e do 2º: se alguém cair, há reserva?', '"Top 2" shows the average of the best and the 2nd: if someone goes down, is there backup?')}</p>
      </section>

      <section className="ins-adj">
        <h3 className="ins-adj-title">{t(lang, 'CD de referência', 'Reference DC')}</h3>
        <div className="ins-pair" role="group" aria-label={t(lang, 'CD de referência', 'Reference DC')}>
          {DCS.map(dc => (
            <button key={dc} type="button" className="mesa-chip ins-dc" aria-pressed={settings.dc === dc} disabled={dis} onClick={() => update({ dc })}>{dc}</button>
          ))}
        </div>
        <p className="ins-adj-help">{t(lang, 'A chance das perícias e das lacunas é contada nesta CD.', 'Skill and gap chances are counted at this DC.')}</p>
      </section>

      <section className="ins-adj">
        <h3 className="ins-adj-title">{t(lang, 'Eixos', 'Axes')}</h3>
        <p className="ins-adj-help">{t(lang, 'Esconder tira o eixo dos gráficos e das lacunas. Importante põe as lacunas dele primeiro (a nota não muda).', 'Hiding removes the axis from charts and gaps. Important puts its gaps first (the score does not change).')}</p>
        <ul className="ins-axis-list">
          {PM.AXES.map(k => {
            const shown = !settings.hidden.includes(k);
            const imp = settings.focus?.[k] === 2;
            return (
              <li key={k} className="ins-axis-row">
                <button type="button" className="mesa-chip ins-axis-show" aria-pressed={shown} disabled={dis} onClick={() => toggleHidden(k)}
                  aria-label={`${PM.axisLabel(k, lang)}: ${shown ? t(lang, 'à vista', 'shown') : t(lang, 'escondido', 'hidden')}`}>
                  <span aria-hidden="true">{shown ? '✓' : '—'}</span> {PM.axisLabel(k, lang)}
                </button>
                <span className="ins-pair is-small" role="group" aria-label={t(lang, `Importância de ${PM.axisLabel(k, lang)}`, `${PM.axisLabel(k, lang)} importance`)}>
                  <button type="button" className="mesa-chip" aria-pressed={!imp} disabled={dis} onClick={() => update({ focus: { [k]: null } })}>{t(lang, 'Normal', 'Normal')}</button>
                  <button type="button" className="mesa-chip" aria-pressed={imp} disabled={dis} onClick={() => update({ focus: { [k]: 2 } })}>{t(lang, 'Importante', 'Important')}</button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="ins-adj">
        <button type="button" className="mesa-btn is-quiet ins-adv-toggle" aria-expanded={advanced} onClick={() => setAdvanced(v => !v)}>
          <span aria-hidden="true">{advanced ? '▾' : '▸'}</span> {t(lang, 'Avançado › Tabela de classes', 'Advanced › Class table')}
        </button>
        {advanced && (
          <div className="ins-classtable">
            <p className="ins-adj-help">{t(lang, 'A tabela do Ivan dá de 1 a 5 o que cada classe costuma fazer. Mesa caseira? Mude aqui: vale só nesta campanha.', "Ivan's table rates 1 to 5 what each class usually does. Homebrew table? Change it here: it only applies to this campaign.")}</p>
            <label className="mesa-field">
              <span className="mesa-field-label">{t(lang, 'Classe', 'Class')}</span>
              <select value={cls} onChange={e => setCls(e.target.value)}>
                {PM.BASE_CLASSES.map(id => <option key={id} value={id}>{tName('class', id, lang)}{edited.includes(id) ? ` (${t(lang, 'editada', 'edited')})` : ''}</option>)}
              </select>
            </label>
            <ul className="ins-class-rows">
              {PM.AXES.map((k, i) => (
                <li key={k} className="ins-class-row">
                  <span className="ins-class-axis">{PM.axisLabel(k, lang)}
                    {table[cls][i] !== PM.IVAN_BASE[cls][i] && <span className="ins-class-ivan">{t(lang, `Ivan: ${PM.IVAN_BASE[cls][i]}`, `Ivan: ${PM.IVAN_BASE[cls][i]}`)}</span>}</span>
                  <button type="button" className="mesa-icon-btn ins-stepper" disabled={dis || table[cls][i] <= 1} onClick={() => setRow(i, -1)}
                    aria-label={t(lang, `${PM.axisLabel(k, lang)}: menos`, `${PM.axisLabel(k, lang)}: less`)}>−</button>
                  <strong className={`ins-class-val ${table[cls][i] !== PM.IVAN_BASE[cls][i] ? 'is-edited' : ''}`} aria-live="polite">{table[cls][i]}</strong>
                  <button type="button" className="mesa-icon-btn ins-stepper" disabled={dis || table[cls][i] >= 5} onClick={() => setRow(i, 1)}
                    aria-label={t(lang, `${PM.axisLabel(k, lang)}: mais`, `${PM.axisLabel(k, lang)}: more`)}>+</button>
                </li>
              ))}
            </ul>
            <div className="mesa-actions">
              <button type="button" className="mesa-btn" disabled={dis || !edited.length} onClick={() => update({ base: null })}>
                {t(lang, 'Restaurar a do Ivan', "Restore Ivan's")}
              </button>
            </div>
            {!edited.length && <p className="ins-adj-help">{t(lang, 'Nenhuma classe editada: vale a tabela do Ivan.', "No class edited: Ivan's table applies.")}</p>}
          </div>
        )}
      </section>

      <section className="ins-adj">
        <button type="button" className="mesa-btn" disabled={dis} onClick={() => update(RESET_PATCH)}>{t(lang, 'Restaurar padrão', 'Restore defaults')}</button>
        <p className="ins-adj-help">{t(lang, 'Volta Tabela × Ficha, eixos, melhor, CD e a tabela de classes. Quem entra fica.', "Resets Table × Sheet, axes, best, DC and the class table. Who's in stays.")}</p>
      </section>
    </MesaSheet>
  );
}

/** "Por quê": um eixo (base → ficha → final + motivos), uma perícia ou um tipo de dano. */
export function WhySheet({ why, facts, calc, settings, lang, onClose }) {
  const { kind, key } = why;
  let title = '';
  let body = null;
  if (kind === 'axis') {
    const a = calc.axes.axes[key];
    title = t(lang, `${PM.axisLabel(key, lang)}: por quê`, `${PM.axisLabel(key, lang)}: why`);
    body = (
      <>
        <p className="ins-why-lead">
          {t(lang, `Média ${PM.fmt(a.avg, lang)} · melhor ${PM.fmt(a.best, lang)} (${a.bestWho.map(PM.firstName).join(', ')}) · 2º ${PM.fmt(a.second, lang)}`,
            `Average ${PM.fmt(a.avg, lang)} · best ${PM.fmt(a.best, lang)} (${a.bestWho.map(PM.firstName).join(', ')}) · 2nd ${PM.fmt(a.second, lang)}`)}
        </p>
        <p className="ins-adj-help">{t(lang, 'Base da classe (tabela) → o que a ficha mostra → nota final, de 1 a 5 (3 = o normal do nível).', 'Class base (table) → what the sheet shows → final score, 1 to 5 (3 = level standard).')}</p>
        <ul className="ins-why-list">
          {facts.map(f => {
            const w = PM.whyAxis(f, key, { w: settings.w, base: settings.base });
            return (
              <li key={f.id} className="ins-why-row">
                <div className="ins-why-who"><Dot color={f.color} /><strong>{f.name}</strong></div>
                <p className="ins-why-nums">
                  {t(lang, 'base', 'base')} {PM.fmt(w.base, lang)} → {t(lang, 'ficha', 'sheet')} {PM.fmt(w.sheet, lang)} → <strong>{PM.fmt(w.final, lang)}</strong>
                </p>
                {w.chips.length > 0 && <div className="ins-why-chips">{w.chips.map(c => <span key={c} className="ins-why-chip">{c}</span>)}</div>}
              </li>
            );
          })}
        </ul>
      </>
    );
  } else if (kind === 'skill') {
    const s = calc.skills.find(x => x.skill === key);
    title = t(lang, `${PM.skillLabel(key, lang)}: quem passa`, `${PM.skillLabel(key, lang)}: who passes`);
    body = (
      <>
        <p className="ins-why-lead">{t(lang, `Passiva do melhor ${s.passive} · CD ${settings.dc}: pelo menos 1 passa ${s.chanceGroup}% se todos tentarem`,
          `Best passive ${s.passive} · DC ${settings.dc}: at least 1 passes ${s.chanceGroup}% if everyone tries`)}</p>
        <ul className="ins-why-list">
          {facts.slice().sort((a, b) => b.skills[key] - a.skills[key]).map(f => (
            <li key={f.id} className="ins-why-row is-line">
              <div className="ins-why-who"><Dot color={f.color} /><strong>{f.name}</strong></div>
              <span className="ins-why-nums">{PM.fmtMod(f.skills[key])} · {t(lang, 'passiva', 'passive')} {10 + f.skills[key]} · {PM.pct(PM.chance(f.skills[key], settings.dc))}%</span>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (kind === 'damage') {
    const who = calc.damage[key] || [];
    title = t(lang, `Dano ${PM.damageLabel(key, lang)}`, `${key} damage`);
    body = who.length ? (
      <ul className="ins-why-list">
        {who.map(x => {
          const f = facts.find(y => y.id === x.id);
          return (
            <li key={x.id} className="ins-why-row">
              <div className="ins-why-who"><Dot color={f?.color} /><strong>{x.name}</strong></div>
              <div className="ins-why-chips">{(f?.dmgTypes[key] || []).map(v => <span key={v.src} className="ins-why-chip">{v.src}{v.exp ? ` · ${PM.fmt(v.exp, lang)}/${t(lang, 'rodada', 'round')}` : ''}</span>)}</div>
            </li>
          );
        })}
      </ul>
    ) : <p className="ins-why-lead">{t(lang, 'Ninguém de quem entra causa este dano. Um inimigo vulnerável a ele pediria outro plano.', 'Nobody in the party deals this damage. An enemy vulnerable to it would need another plan.')}</p>;
  }
  return (
    <MesaSheet title={title} icon="?" size="tall" width="md" lang={lang} onClose={onClose}
      footer={<button type="button" className="mesa-btn mesa-btn-lg" onClick={onClose}>{t(lang, 'Fechar', 'Close')}</button>}>
      {body}
    </MesaSheet>
  );
}

/** Escolher monstro: busca no bestiário do app e nos monstros do mestre (neste navegador). */
export function MonsterSheet({ monsters, lang, onPick, onClose }) {
  const [q, setQ] = useState('');
  const found = useMemo(() => searchMonsters(monsters, q, 12), [monsters, q]);
  const name = (m) => (typeof m.name === 'string' ? m.name : m.name?.[lang] || m.name?.pt || m.id);
  return (
    <MesaSheet title={t(lang, 'Escolher monstro', 'Pick a monster')} icon="🐉" size="tall" width="md" lang={lang} onClose={onClose} initialFocus="input">
      <label className="mesa-field">
        <span className="mesa-field-label">{t(lang, 'Nome do monstro', 'Monster name')}</span>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t(lang, 'Ex.: fantasma, goblin', 'E.g.: ghost, goblin')} autoComplete="off" />
      </label>
      {q.trim() && !found.length && <p className="ins-adj-help">{t(lang, 'Nenhum monstro com esse nome.', 'No monster with that name.')}</p>}
      <ul className="ins-mon-list">
        {found.map(m => (
          <li key={m.id}>
            <button type="button" className="mesa-row ins-mon-row" onClick={() => onPick(m)}>
              <span className="mesa-row-main"><span className="mesa-row-title">{name(m)}</span>
                <span className="mesa-row-sub">{t(lang, `ND ${m.cr ?? '?'}`, `CR ${m.cr ?? '?'}`)}{m.custom ? ` · ${t(lang, 'meu', 'mine')}` : ''}</span></span>
              <span aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </MesaSheet>
  );
}
