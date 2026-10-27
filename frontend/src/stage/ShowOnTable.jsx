// O 📺 único (especificação §4.8): o mesmo botão e o mesmo comportamento nos 9
// lugares de "mostrar" (Jogar › Tela, Agora, Mundo, editor do cartão, mapa do
// Mundo, Conduzir, Crônica, 📺 do cabeçalho e Testes).
//
//   <ShowOnTable campaign={c} target={{kind:'card', entry}} lang={lang} className="mesa-btn" />
//
// target:
//   {kind:'card', entry}           cartão do Mundo (lista leve ou completo)
//   {kind:'map', entry}            o mapa de um lugar ("Mostrar este mapa": imagem inteira)
//   {kind:'image', ref, name}      imagem de sala ({advId, nodeId})
//   {kind:'scene', sceneId|advId+nodeId, name}
//   {kind:'text', text} · {kind:'recap', title, text}
//   {kind:'check', check}          o teste na Tela (mostrar/tirar)
//
// Ao tocar:
//   revelado/conhecido, cena, texto, mapa → vai na hora;
//   cartão OCULTO → folha pequena: 🖼 Mostrar só a imagem (com legenda) ou
//     ◐ Mostrar só o nome (sem imagem) · 👁 Revelar e mostrar · Cancelar;
//   documento só para alguns jogadores → botão apagado com o motivo ESCRITO;
//   durante o combate → a mesma folha pequena: vai por cima do combate, com
//     "Guardar para depois do combate" como link secundário (cartão oculto: a
//     caixa "☐ Guardar para depois do combate", que vale para o botão tocado).
// Mostrar nunca revela; revelar é sempre o toque do mestre num botão que diz
// revelar (as regras da folha: show-model.js › decideActions).
// onRevealed(entry): a entrada que o reveal devolveu, para a lista de quem
// chamou parar de mostrar o cartão como oculto.
import { useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import { revealEntry } from '../world/world-api.js';
import { cardShowMode, frontLabel, L, privateReason, privateShort } from './stage-now.js';
import { CAPTION_MAX, decideActions } from './show-model.js';
import { sendToStage, showCheckOnStage, showOnStage } from './stage-api.js';
import './stage.css';

const LOG_KEY = 'forja.world.logDiary';
const logPref = () => { try { return localStorage.getItem(LOG_KEY) !== '0'; } catch { return true; } };

/** Nome do que vai à Tela, como o mestre lê no aviso. */
function targetName(target, lang) {
  const k = target.kind;
  if (k === 'card' || k === 'map') return target.entry?.name || '';
  if (k === 'check') return target.check?.label || '';
  if (k === 'recap') return target.title || L(lang, 'Anteriormente em…', 'Previously on…');
  if (k === 'text') return frontLabel({ kind: 'text', text: target.text }, lang);
  return target.name || '';
}

/** O alvo como o POST /stage espera (sem a entrada inteira). */
function apiTarget(target) {
  const k = target.kind;
  if (k === 'card') return { kind: 'card', entryId: target.entry.id, ...(target.secretIds?.length ? { secretIds: target.secretIds } : {}) };
  if (k === 'map') return { kind: 'image', ref: { mapOf: target.entry.id } };
  if (k === 'image') return { kind: 'image', ref: target.ref };
  if (k === 'scene') return target.sceneId ? { kind: 'scene', sceneId: target.sceneId } : { kind: 'scene', advId: target.advId, nodeId: target.nodeId };
  if (k === 'text') return { kind: 'text', text: target.text };
  if (k === 'recap') return { kind: 'recap', title: target.title || '', text: target.text || '' };
  return null;
}

export default function ShowOnTable({
  campaign, target, lang = 'pt', className = 'mesa-btn', children, disabled = false,
  reason = 'full', onShown, onRevealed, ariaLabel,
}) {
  const [decide, setDecide] = useState(false);
  const [busy, setBusy] = useState(false);
  const cid = campaign?.id;
  const kind = target?.kind;
  const entry = kind === 'card' || kind === 'map' ? target.entry : null;
  const mode = kind === 'card' ? cardShowMode(entry) : (kind === 'map' && cardShowMode(entry) === 'private' ? 'private' : 'show');
  const fighting = !!campaign?.combatNow?.active;
  const label = children ?? (kind === 'check'
    ? <>📺 {target.check?.showOnScreen ? L(lang, 'Tirar da Tela', 'Remove from screen') : L(lang, 'Mostrar na Tela', 'Show on screen')}</>
    : <>📺 {L(lang, 'Mostrar', 'Show')}</>);

  if (!target || cid == null) return null;

  if (mode === 'private') {
    const why = privateReason(entry, campaign.members, lang);
    return (
      <span className={`sot-blocked ${reason === 'short' ? 'is-short' : ''}`}>
        <button type="button" className={className} disabled aria-describedby={`sot-why-${entry.id}`}>{label}</button>
        <span className="sot-why" id={`sot-why-${entry.id}`}>{reason === 'short' ? privateShort(entry, campaign.members, lang) : why}</span>
      </span>
    );
  }

  const name = targetName(target, lang);
  const run = async (send, shownName = name, undo, done) => {
    setBusy(true);
    try {
      const r = await sendToStage(cid, send, { lang, name: shownName, undo, done, onDone: () => onShown?.() });
      if (r) setDecide(false);
      return r;
    } finally { setBusy(false); }
  };

  const go = (focus = true) => {
    if (kind === 'check') {
      const show = !target.check.showOnScreen;
      return run(() => showCheckOnStage(target.check.id, show), name, () => showCheckOnStage(target.check.id, !show),
        show ? undefined : L(lang, 'Fora da Tela ✓', 'Off screen ✓'));
    }
    return run(() => showOnStage(cid, apiTarget(target), { focus }));
  };

  const onTap = (e) => {
    e?.stopPropagation?.();
    if (busy) return;
    if (kind !== 'check' && (mode === 'image' || mode === 'name' || fighting)) { setDecide(true); return; }
    go(true);
  };

  return (
    <>
      <button type="button" className={className} disabled={disabled || busy} onClick={onTap}
        aria-label={ariaLabel || (children == null ? `${L(lang, 'Mostrar na Tela', 'Show on screen')}: ${name}` : undefined)}>
        {busy ? <>📺 …</> : label}
      </button>
      {decide && (
        <DecideSheet lang={lang} name={name} mode={mode} fighting={fighting} busy={busy}
          onClose={() => setDecide(false)}
          onShow={(focus) => go(focus)}
          onImage={(caption, focus) => run(
            () => showOnStage(cid, { kind: 'image', ref: { entryId: entry.id } }, { focus, caption }),
            `${name} ${L(lang, '(só a imagem)', '(image only)')}`)}
          onReveal={(visibility, focus) => run(async () => {
            const next = await revealEntry(entry.id, { visibility, logDiary: logPref(), lang });
            if (next) onRevealed?.(next);
            return showOnStage(cid, { kind: 'card', entryId: entry.id }, { focus });
          })} />
      )}
    </>
  );
}

/** A folha pequena de decisão: cartão oculto e/ou combate na Tela (regras em decideActions). */
function DecideSheet({ lang, name, mode, fighting, busy, onClose, onShow, onImage, onReveal }) {
  const [caption, setCaption] = useState('');
  const [keep, setKeep] = useState(false);
  const { buttons, keep: keepKind } = decideActions(mode, { fighting, keep });
  const LABEL = {
    image: `🖼 ${L(lang, 'Mostrar só a imagem', 'Show image only')}`,
    name: `◐ ${L(lang, 'Mostrar só o nome', 'Show name only')}`,
    reveal: `👁 ${L(lang, 'Revelar e mostrar', 'Reveal and show')}`,
    show: `📺 ${L(lang, 'Mostrar por cima do combate', 'Show over the combat')}`,
    keep: L(lang, 'Guardar para depois do combate', 'Keep for after combat'),
  };
  const press = (b) => {
    if (b.op === 'image') return onImage(caption.trim(), b.focus);
    if (b.op === 'reveal') return onReveal(b.visibility, b.focus);
    return onShow(b.focus);
  };
  return (
    <MesaSheet title={name || L(lang, 'Mostrar na Tela', 'Show on screen')} icon="📺" size="auto" width="sm" lang={lang} dock="play"
      onClose={onClose} className="sot-sheet"
      footer={(
        <div className="sot-foot">
          {keepKind === 'toggle' && (
            <label className="sot-keep-box">
              <input type="checkbox" checked={keep} disabled={busy} onChange={e => setKeep(e.target.checked)} />
              <span>{L(lang, 'Guardar para depois do combate', 'Keep for after combat')}</span>
            </label>
          )}
          {buttons.map(b => (
            <button key={b.id} type="button" disabled={busy} onClick={() => press(b)}
              className={b.link ? 'mesa-btn is-quiet sot-keep' : `mesa-btn mesa-btn-lg ${b.primary ? 'is-primary' : ''}`.trim()}>
              {LABEL[b.id]}
            </button>
          ))}
          <button type="button" className="mesa-btn is-quiet" disabled={busy} onClick={onClose}>{L(lang, 'Cancelar', 'Cancel')}</button>
        </div>
      )}>
      {mode === 'image' && (
        <>
          <p className="mesa-sheet-text">{L(lang, 'Oculto no Mundo: a Tela mostra só a imagem; os jogadores não aprendem o nome.', "Hidden in the World: the screen shows only the image; players don't learn the name.")}</p>
          <label className="mesa-field">
            <span className="mesa-field-label">{L(lang, 'Legenda (opcional)', 'Caption (optional)')}</span>
            <input className="input" value={caption} maxLength={CAPTION_MAX} onChange={e => setCaption(e.target.value)}
              placeholder={L(lang, 'Uma figura encapuzada', 'A hooded figure')} />
          </label>
        </>
      )}
      {mode === 'name' && (
        <p className="mesa-sheet-text">{L(lang, 'Oculto no Mundo e sem imagem. "Só o nome" deixa o cartão conhecido de nome (os jogadores veem o nome e a frase).', 'Hidden in the World and without an image. "Name only" makes the card known by name (players see the name and tagline).')}</p>
      )}
      {fighting && (
        <p className="mesa-sheet-text">{keepKind === 'toggle'
          ? L(lang, 'Há um combate na Tela. Isto vai por cima, grande, com a tarja do turno; marcando "Guardar para depois do combate", espera o combate acabar (revelar continua sendo só o botão que diz revelar).', 'There is a combat on screen. This goes over it, full size, with the turn banner; ticking "Keep for after combat" makes it wait for the combat to end (revealing is still only the button that says reveal).')
          : L(lang, 'Há um combate na Tela. Isto vai por cima, grande, com a tarja do turno; ⚔ Voltar ao combate tira.', 'There is a combat on screen. This goes over it, full size, with the turn banner; ⚔ Back to combat removes it.')}</p>
      )}
    </MesaSheet>
  );
}
