// Teclado de dano (V8, especificação §4.6, W4): tocar na pílula de PV da linha abre
// esta folha baixa, que para ACIMA da barra da mesa (o Próximo turno continua à
// vista). Teclado próprio — nenhum <input>, o teclado do sistema não abre:
//
//   GOBLIN GUERREIRO #1 · PV 3/10 · CA 15                [✕]
//   [      7      ]       tipo: (cortante)(fogo)(＋)
//   [ 1 ][ 2 ][ 3 ]      [   − DANO 7   ]   vermelho, 56
//   [ 4 ][ 5 ][ 6 ]      [   + CURA 7   ]   verde, 56
//   [ 7 ][ 8 ][ 9 ]      [  + TEMP 7    ]   48
//   [ ½ ][ 0 ][ ⌫ ]      [ Vários alvos ]
//   Condições ›                       Ficha toda ›
//
// Dano = 3 toques (pílula · número · − Dano). Cada aplicação leva um opId (o mesmo
// toque 2× tira PV uma vez) e o aviso "Goblin #1 −7 (0/10, derrotado) · ↶ Desfazer"
// (6 s), que restaura a foto do combatente no servidor (POST …/undo). Servidor
// antigo (sem opId na resposta): aplica igual, sem o Desfazer.
// O opId fica o mesmo até dar certo (heldOpId): sem resposta (rede, os 15 s do
// servidor lento) o aviso diz "Talvez não enviado · Tentar de novo" e o novo toque
// reenvia o MESMO id — se o 1º tinha chegado, o servidor responde `duplicate` e o
// PV não sai 2×. Mudou o número, o alvo, a operação ou o tipo: id novo.
// O mesmo corpo (DamagePadBody) é a aba PV da folha do combatente.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MesaSheet, { topmostModal } from '../shell/MesaSheet.jsx';
import { DAMAGE_TYPES, damageTypeLabel } from '../combat/monster-i18n.js';
import { errorMessage } from '../api/errors.js';
import {
  PAD_KEYS, failText, heldOpId, hpFlash, manyFlash, multiTargets, padPress, padValue, readTypeMemory, rememberType,
  typeChips, writeTypeMemory,
} from './damage-model.js';
import { applyHp, undoHp } from './combat-actions.js';
import { useTable } from './table-store.js';
import { flash } from './flash.js';
import '../campaigns/combat-styles.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const KEY_LABEL = { half: '½', back: '⌫' };

/** O tipo do 1º ataque de quem está na vez (o mais provável de ter causado o dano). */
function actorType(combat) {
  const cur = combat?.active ? combat.combatants?.[combat.turnIndex] : null;
  const atk = (cur?.stats?.actions || []).find(a => a?.damageType && (a.type === 'melee' || a.type === 'ranged'));
  return atk?.damageType || null;
}

/** ↶ Desfazer de um opId (o aviso do teclado e o da folha usam este). */
export function undoFlash(campaignId, opId, lang, applyCombat) {
  return async () => {
    try {
      const r = await undoHp(campaignId, opId);
      applyCombat?.(r?.combat);
      flash(t(lang, '↶ Desfeito: o PV voltou como estava.', '↶ Undone: HP is back as it was.'));
    } catch (e) {
      if (e?.data?.combat) applyCombat?.(e.data.combat);
      if (e?.status === 409 && e?.data?.error === 'changed_since') {
        flash(t(lang, 'Mudou depois; ajuste à mão.', 'It changed since; adjust by hand.'), { error: true });
      } else if (e?.status === 409) {
        flash(t(lang, 'Não há o que desfazer.', 'Nothing to undo.'), { error: true });
      } else {
        flash(`${t(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang)}`, {
          error: true, action: { label: t(lang, 'Tentar de novo', 'Try again'), onClick: undoFlash(campaignId, opId, lang, applyCombat) },
        });
      }
    }
  };
}

/**
 * O teclado. Props: campaign, combat, lang, target (combatente) OU marks ({id:{half}}, vários
 * alvos), onApplied(combat), onMulti() ("Vários alvos": escolher na lista), onConditions(),
 * onSheet() ("Ficha toda ›"), keys (atalhos do teclado físico: só na folha).
 */
export function DamagePadBody({
  campaign, combat, lang = 'pt', target = null, marks = null, onApplied, onMulti, onConditions, onSheet, keys = false, compact = false,
  info = null,
}) {
  const table = useTable();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);           // {text, op} do pedido que falhou
  const [allTypes, setAllTypes] = useState(false);
  const opRef = useRef(null);                         // {key, id}: o opId até dar certo
  const [memory, setMemory] = useState(() => readTypeMemory(campaign.id));
  const multi = !!marks;
  const chipInfo = useMemo(() => typeChips(memory, target?.id ?? '*', actorType(combat)), [memory, target?.id, combat]);
  const [type, setType] = useState(chipInfo.type);
  const amount = padValue(text);
  const order = useMemo(() => (combat?.combatants || []).map(c => c.id), [combat]);

  const press = useCallback((k) => { setError(null); setText(v => padPress(v, k)); }, []);
  const apply = useCallback(async (op) => {
    if (!amount || busy) return;
    const targets = multi ? multiTargets(marks, amount, order) : [{ id: target.id, amount }];
    if (!targets.length) return;
    opRef.current = heldOpId(opRef.current, { op, targets, type });
    const opId = opRef.current.id;
    setBusy(op); setError(null);
    try {
      const r = await applyHp(campaign.id, { op, targets, damageType: type, opId, combat });
      opRef.current = null;
      const fresh = r?.combat;
      if (fresh) {
        if (table?.applyCombat) table.applyCombat(fresh);
        onApplied?.(fresh);
      }
      if (op === 'damage') {
        const next = targets.reduce((m, x) => rememberType(m, x.id, type), memory);
        setMemory(next); writeTypeMemory(campaign.id, next);
      }
      const after = (id) => (fresh?.combatants || []).find(c => c.id === id);
      const byId = new Map((r?.result?.targets || []).map(x => [x.id, x]));
      const msg = multi
        ? manyFlash(targets.map(x => ({ ...x, name: after(x.id)?.name || x.id, damage_taken: byId.get(x.id)?.damage_taken })), marks, lang, op)
        : hpFlash({ op, amount, taken: r?.result?.damage_taken, name: target.name, after: after(target.id) || target }, lang);
      flash(msg, r?.opId ? { action: { label: t(lang, '↶ Desfazer', '↶ Undo'), onClick: undoFlash(campaign.id, r.opId, lang, table?.applyCombat || onApplied) } } : {});
      setText('');
    } catch (e) {
      if (e?.data?.combat) table?.applyCombat?.(e.data.combat);
      setError({ text: `${failText(e, lang)} · ${errorMessage(e, lang)}`, op });
    } finally { setBusy(''); }
  }, [amount, busy, multi, marks, order, target, campaign.id, type, combat, table, onApplied, memory, lang]);

  // Teclado físico (PC): algarismos, ⌫, "/" = ½, Enter = − Dano. Só na folha de cima.
  const rootRef = useRef(null);
  useEffect(() => {
    if (!keys) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const sheet = rootRef.current?.closest('[aria-modal="true"]');
      if (!sheet || topmostModal() !== sheet) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
      else if (e.key === '/') { e.preventDefault(); press('half'); }
      else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); apply('damage'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, press, apply]);

  const n = amount || '';
  const typeChoices = allTypes ? DAMAGE_TYPES : [...new Set([...chipInfo.chips, type])];
  return (
    <div className={`dp ${compact ? 'is-compact' : ''}`} ref={rootRef}>
      <div className="dp-top">
        <div className="dp-screen" role="status" aria-live="polite" aria-label={t(lang, `Valor: ${amount}`, `Amount: ${amount}`)}>
          {text || <span className="dp-screen-ph">0</span>}
        </div>
        <div className="dp-types mesa-scroll" role="radiogroup" aria-label={t(lang, 'Tipo de dano', 'Damage type')}>
          {typeChoices.map(ty => (
            <button key={ty} type="button" role="radio" aria-checked={type === ty}
              className={`mesa-chip dp-type ${type === ty ? 'active' : ''}`} onClick={() => { setType(ty); setAllTypes(false); }}>
              {damageTypeLabel(ty, lang)}
            </button>
          ))}
          {!allTypes && (
            <button type="button" className="mesa-chip dp-type is-more" aria-expanded={false}
              aria-label={t(lang, 'Outros tipos de dano (13)', 'Other damage types (13)')} onClick={() => setAllTypes(true)}>＋</button>
          )}
        </div>
      </div>
      <div className="dp-main">
        <div className="dp-keys" role="group" aria-label={t(lang, 'Teclado', 'Keypad')}>
          {PAD_KEYS.map(k => (
            <button key={k} type="button" className={`dp-key ${k === 'half' || k === 'back' ? 'is-fn' : ''}`} onClick={() => press(k)}
              aria-label={k === 'half' ? t(lang, 'Metade', 'Half') : k === 'back' ? t(lang, 'Apagar', 'Delete') : k}>
              {KEY_LABEL[k] || k}
            </button>
          ))}
        </div>
        <div className="dp-acts">
          <button type="button" className="mesa-btn dp-act is-dmg" disabled={!amount || !!busy} onClick={() => apply('damage')}>
            {busy === 'damage' ? '…' : <><span>− {t(lang, 'Dano', 'Damage')}</span> <span className="dp-act-n">{n}</span></>}
          </button>
          <button type="button" className="mesa-btn dp-act is-heal" disabled={!amount || !!busy} onClick={() => apply('heal')}>
            {busy === 'heal' ? '…' : <><span>+ {t(lang, 'Cura', 'Heal')}</span> <span className="dp-act-n">{n}</span></>}
          </button>
          <button type="button" className="mesa-btn dp-act is-temp" disabled={!amount || !!busy} onClick={() => apply('temp')}>
            {busy === 'temp' ? '…' : <><span>+ {t(lang, 'Temp', 'Temp')}</span> <span className="dp-act-n">{n}</span></>}
          </button>
          {onMulti && (
            <button type="button" className="mesa-btn dp-act is-multi" onClick={onMulti} aria-pressed={multi}>
              {multi ? t(lang, '✎ Alvos', '✎ Targets') : t(lang, 'Vários alvos', 'Several targets')}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="cc-action-error dp-error" role="alert">
          <span>{error.text}</span>
          <button type="button" className="mesa-btn dp-retry" disabled={!!busy} onClick={() => apply(error.op)}>
            {t(lang, 'Tentar de novo', 'Try again')}
          </button>
        </p>
      )}
      {(onConditions || onSheet || info) && (
        <div className="dp-links">
          {onConditions ? <button type="button" className="mesa-btn is-quiet dp-link" onClick={onConditions}>{t(lang, 'Condições', 'Conditions')} ›</button> : <span />}
          {info && <span className="dp-info">{info}</span>}
          {onSheet ? <button type="button" className="mesa-btn is-quiet dp-link" onClick={onSheet}>{t(lang, 'Ficha toda', 'Full sheet')} ›</button> : <span />}
        </div>
      )}
    </div>
  );
}

/**
 * A folha baixa do teclado (dock="bar": para acima da barra da mesa). Para caber em
 * ~420 px, o PV e a CA (ou os alvos marcados) vão na linha de baixo, entre
 * "Condições ›" e "Ficha toda ›", e não num 2º título.
 */
export default function DamagePad({ campaign, combat, lang = 'pt', target = null, marks = null, onClose, onApplied, onMulti, onConditions, onSheet }) {
  const multi = !!marks;
  const ids = multi ? Object.keys(marks) : [];
  const names = ids.map(id => (combat?.combatants || []).find(c => c.id === id)?.name).filter(Boolean);
  const title = multi ? t(lang, `Vários alvos (${ids.length})`, `Several targets (${ids.length})`) : target?.name;
  const info = multi ? names.join(' · ')
    : `${t(lang, 'PV', 'HP')} ${target?.current_hp ?? '?'}/${target?.stats?.max_hp ?? '?'}${target?.temp_hp ? ` +${target.temp_hp} temp` : ''}${target?.stats?.ac != null ? ` · ${t(lang, 'CA', 'AC')} ${target.stats.ac}` : ''}`;
  return (
    <MesaSheet title={title} size="auto" width="sm" lang={lang} onClose={onClose} dock="bar"
      className="dp-sheet" bodyClassName="dp-sheet-body">
      <DamagePadBody campaign={campaign} combat={combat} lang={lang} target={target} marks={marks} keys info={info}
        onApplied={(c) => { onApplied?.(c); onClose?.(); }} onMulti={onMulti} onConditions={onConditions} onSheet={onSheet} />
    </MesaSheet>
  );
}
