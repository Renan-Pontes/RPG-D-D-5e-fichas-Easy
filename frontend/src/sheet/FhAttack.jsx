/* Linha de ataque da ficha no visual "Ficha Forjada" (src/sheet/ficha.css). Só
 * apresentação: o bônus, o dano, as notas e os handlers de rolagem vêm de
 * components/Sheet.jsx (Utils.attackFor / Utils.unarmedStrike), como antes.
 *
 * [miniatura] [nome / tipo de dano]            [ATAQUE +5] [DANO 1d8+3]
 *             [notas: Artes Marciais, sem proficiência, Estilo, Maestria…]
 * No celular os dois botões descem para uma linha própria, lado a lado (alvos de
 * 44px), logo abaixo do nome. Sem `onDamage` (golpe sem dado), só o de ataque. */
import { Children } from 'react';
import { t } from '../../data/i18n.js';

export default function FhAttackRow({ art, name, sub, atkText, onAttack, dmgText, onDamage, lang, children }) {
  const atkLabel = t('attackRoll', lang);
  const dmgLabel = t('damageRoll', lang);
  const notes = Children.toArray(children); // sem null/false: sem nota, sem a caixa vazia
  return (
    <div className="fh-atk">
      <span className="fh-atk-art">{art}</span>
      <div className="fh-atk-head">
        <div className="fh-atk-name">{name}</div>
        {sub && <div className="fh-atk-sub">{sub}</div>}
      </div>
      <div className="fh-atk-acts">
        <button type="button" className="fh-atk-btn is-hit" onClick={onAttack} aria-label={`${name}: ${atkLabel} ${atkText}`}>
          <span className="fh-atk-btn-k">{atkLabel}</span>
          <span className="fh-atk-btn-v">{atkText}</span>
        </button>
        {onDamage && (
          <button type="button" className="fh-atk-btn is-dmg" onClick={onDamage} aria-label={`${name}: ${dmgLabel} ${dmgText}`}>
            <span className="fh-atk-btn-k">{dmgLabel}</span>
            <span className="fh-atk-btn-v">{dmgText}</span>
          </button>
        )}
      </div>
      {notes.length > 0 && <div className="fh-atk-notes">{notes}</div>}
    </div>
  );
}
