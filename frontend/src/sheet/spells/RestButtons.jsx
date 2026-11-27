import { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import Utils from '../../../utils.js';
import { t } from '../../../data/i18n.js';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import { restResources } from '../../progression/resources.js';
import { exhaustionLevel, hitDicePools, setExhaustion, usedByAfterRest } from '../hp-logic.js';
import { useRestMode } from '../rest-mode.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { errorMessage } from '../../api/errors.js';
import { api } from '../../api/client.js';
export const RestButtons = ({ char, lang, update, seals = false }) => {
  const [busy, setBusy] = useState(false);
  const rest = useRestMode();            // null fora da ficha: descansa direto, como antes
  const sheetToast = useSheetToast();    // null fora da ficha
  // Depois do descanso longo: exaustão −1 e o gasto de Dados de Vida por tipo acertado.
  const afterLong = (hitDiceUsed) => {
    const p = {};
    const lv = exhaustionLevel(char);
    if (lv > 0) Object.assign(p, setExhaustion(char, lv - 1));
    if (hitDiceUsed != null && char.hitDiceUsedBy) p.hitDiceUsedBy = usedByAfterRest(char, Utils.hitDiceByDie(char), hitDiceUsed);
    return p;
  };
  // Usos livres das magias de talento/espécie (SpellRow): voltam no descanso deles.
  const freeBack = (type) => ({
    ...(Object.keys(char.freeCastsShort || {}).length ? { freeCastsShort: {} } : {}),
    ...(type === 'long' && Object.keys(char.freeCasts || {}).length ? { freeCasts: {} } : {}),
  });
  const restore = async (type) => {
    setBusy(true);
    try {
      if (typeof char.id === 'number') {
        const res = await api.rest(char.id, { type });
        const d = res.character.data || {};
        // Servidor antigo não devolve os espaços do Pacto no descanso curto: fora de campanha
        // a ficha aplica a devolução aqui (em campanha o espaço é do servidor).
        let slotsUsed = d.spellSlotsUsed;
        if (type === 'short' && !char.inCampaign) {
          const pact = Utils.pactSlots(char);
          if (pact.some(Boolean)) slotsUsed = (slotsUsed || []).map((u, i) => Math.max(0, (u || 0) - (pact[i] || 0)));
        }
        update({
          spellSlotsUsed: slotsUsed,
          wildShapeUses: d.wildShapeUses,
          currentHp: d.currentHp,
          tempHp: d.tempHp,
          conditions: d.conditions,
          deathSaves: d.deathSaves,
          hitDiceUsed: d.hitDiceUsed,
          resourcesUsed: d.resourcesUsed || {},
          ...(char.starryForm?.active ? { starryForm: { active: false } } : {}),
          ...(type === 'long' ? afterLong(d.hitDiceUsed) : {}),
          ...freeBack(type),
        });
      } else {
        const patch = { ...freeBack(type) };
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
          if (char.className === 'warlock' && !Utils.isMulticlass(char)) patch.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
          else if (Utils.isMulticlass(char)) {
            // Multiclasse com Pacto: o gasto conta primeiro nos espaços de pacto, que voltam aqui.
            const pact = Utils.pactSlots(char);
            if (pact.some(Boolean)) patch.spellSlotsUsed = (char.spellSlotsUsed || []).map((u, i) => Math.max(0, (u || 0) - (pact[i] || 0)));
          }
          if (Utils.hasClass(char, 'druid')) patch.wildShapeUses = char.rulesVersion === '2024' ? Math.max(0, (char.wildShapeUses || 0) - 1) : 0;
        }
        patch.resourcesUsed = restResources(char, type).resourcesUsed;
        if (type === 'long') Object.assign(patch, afterLong(patch.hitDiceUsed));
        update(patch);
      }
    } catch (e) { console.warn('rest failed', e); }
    finally { setBusy(false); }
  };
  // Interruptor: ligar mostra o que só existe no descanso (gastar Dados de Vida);
  // desligar conclui e aplica a recuperação; ✕ sai sem descansar.
  const press = async (type) => {
    if (!rest) return restore(type);
    if (rest.mode === type) { await restore(type); rest.setMode(null); }
    else rest.setMode(type);
  };
  const pt = lang === 'pt';
  const on = rest?.mode || null;
  const btn = (type, icon, label) => (
    <button type="button" className={`btn btn-sm fh-rest-toggle is-${type}${on === type ? ' is-on' : ' btn-ghost'}`}
      onClick={() => press(type)} disabled={busy} aria-pressed={rest ? on === type : undefined}
      title={on === type ? (pt ? 'Concluir o descanso' : 'Finish the rest') : label}>
      {icon} {on === type ? (pt ? 'Concluir' : 'Finish') : (type === 'short' ? (pt ? 'Curto' : 'Short') : (pt ? 'Longo' : 'Long'))}
    </button>
  );
  // Selos (linha do nome, depois da Inspiração): mesmo anel dos outros selos, com o nome
  // embaixo (no toque não existe o balão do title).
  //  · Longo: um passo só, com a confirmação do app — não há nada para fazer "durante".
  //  · Curto: liga o modo (libera gastar Dados de Vida na barra de PV). Ligado, o selo mostra
  //    uma ampulheta (ainda não descansou: nada de ✓) e uma faixa de texto logo abaixo do
  //    topo da ficha diz o que está acontecendo, com "Concluir descanso" e "Cancelar".
  if (seals) {
    const finishShort = async () => {
      await restore('short');
      rest?.setMode(null);
      sheetToast?.show({ tone: 'heal', ms: 3500, text: pt ? 'Descanso curto concluído.' : 'Short rest finished.' });
    };
    // o painel Vitalidade conclui o descanso com esta mesma função (src/sheet/HpTracker.jsx)
    if (rest?.finishRef) rest.finishRef.current = finishShort;
    const pressSeal = async (type) => {
      if (!rest) return restore(type);
      if (type === 'long') {
        const ok = await confirmDialog({
          lang,
          title: pt ? 'Fazer um descanso longo?' : 'Take a long rest?',
          message: pt
            ? 'Recupera os Pontos de Vida, os espaços de magia, Dados de Vida e os recursos de descanso longo.'
            : 'Restores hit points, spell slots, Hit Dice and long-rest resources.',
          confirmLabel: pt ? 'Descansar' : 'Rest',
        });
        if (!ok) return undefined;
        rest.setMode(null);
        await restore('long');
        sheetToast?.show({ tone: 'heal', ms: 3500, text: pt ? 'Descanso longo concluído.' : 'Long rest finished.' });
        return undefined;
      }
      if (on === 'short') return finishShort();
      rest.setMode('short');
      return undefined;
    };
    const seal = (type, icon, label, cap) => (
      <button key={type} type="button" className={`fh-seal hero-rest no-print is-${type}${on === type ? ' is-on' : ''}`}
        onClick={() => pressSeal(type)} disabled={busy} aria-pressed={rest && type === 'short' ? on === type : undefined}
        aria-label={on === type ? (pt ? `${label} em andamento: concluir` : `${label} in progress: finish`) : label}
        title={on === type ? (pt ? 'Concluir o descanso' : 'Finish the rest') : label}>
        <svg className="fh-seal-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="none" stroke="#e0b55e" strokeWidth="1.2" strokeDasharray="2 4"/>
          <circle cx="32" cy="32" r="27" fill="none" stroke="#9a7231" strokeWidth="0.8"/>
        </svg>
        <span className="fh-seal-core"><span className="hero-rest-icon" aria-hidden="true">{icon}</span></span>
        {on === type && <span className="hero-level-up hero-rest-pip" aria-hidden="true">⏳</span>}
        <span className="fh-seal-cap" aria-hidden="true">{cap}</span>
      </button>
    );
    const strip = on === 'short' && rest?.slot ? createPortal(
      <div className="fh-rest-strip no-print" role="status">
        <span className="fh-rest-strip-t">
          <strong>☕ {pt ? 'Descanso curto em andamento' : 'Short rest in progress'}</strong>
          <span>{pt ? 'Gaste Dados de Vida no painel Vitalidade (botão "Gastar 1 DV"). Os recursos voltam ao concluir.' : 'Spend Hit Dice in the Vitality panel ("Spend 1 HD" button). Resources come back when you finish.'}</span>
        </span>
        <span className="fh-rest-strip-acts">
          <button type="button" className="btn btn-primary btn-sm" onClick={finishShort} disabled={busy}>{pt ? 'Concluir descanso' : 'Finish rest'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rest.setMode(null)} disabled={busy}>{pt ? 'Cancelar' : 'Cancel'}</button>
        </span>
      </div>,
      rest.slot,
    ) : null;
    return (
      <>
        {seal('short', '☕', pt ? 'Descanso curto' : 'Short rest', pt ? 'Curto' : 'Short')}
        {seal('long', '🛌', pt ? 'Descanso longo' : 'Long rest', pt ? 'Longo' : 'Long')}
        {strip}
      </>
    );
  }
  return (
    <div className="row gap-1 fh-rest-toggles">
      {btn('short', '☕', pt ? 'Descanso curto' : 'Short rest')}
      {btn('long', '🛌', pt ? 'Descanso longo' : 'Long rest')}
      {on && (
        <button type="button" className="btn btn-sm btn-ghost fh-rest-cancel" onClick={() => rest.setMode(null)} disabled={busy}
          aria-label={pt ? 'Sair do descanso sem concluir' : 'Leave the rest without finishing'}>✕</button>
      )}
    </div>
  );
};

/**
 * HUD unificado e compacto de conjuração: Atributo, CD de Resistência, Bônus de Ataque,
 * Descanso Curto/Longo e Espaços de Magia numa única interface contínua.
 */
/**
 * Matriz de espaços: uma linha por círculo (1–9, só os que existem), gemas alinhadas à
 * esquerda. Colunas da esquerda = espaços comuns (descanso longo); à direita, separadas,
 * as de Magia de Pacto (descanso curto). O gasto de um círculo conta primeiro no pacto.
 */
