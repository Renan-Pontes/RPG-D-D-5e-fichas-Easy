/* Linha de ataque da ficha no visual "Ficha Forjada" (src/sheet/ficha.css). Só
 * apresentação: o bônus, o dano, as notas e os handlers de rolagem vêm de
 * components/Sheet.jsx (Utils.attackFor / Utils.unarmedStrike), como antes.
 *
 * [miniatura] [nome / tipo de dano]            [ATAQUE +5] [DANO 1d8+3]
 *             [notas: Artes Marciais, sem proficiência, Estilo, Maestria…]
 * No celular os dois botões descem para uma linha própria, lado a lado (alvos de
 * 44px), logo abaixo do nome. Sem `onDamage` (golpe sem dado), só o de ataque.
 * Sem `onAttack` (truque que pede resistência do alvo), `chip` ocupa o lugar do botão:
 * uma etiqueta parada ("CD 13 DES"), sem cara de botão — ali não há o que rolar. */
import { Children } from 'react';
import { t } from '../../data/i18n.js';

export default function FhAttackRow({ art, name, sub, atkText, onAttack, dmgText, onDamage, lang, chip = null, mark = null, children }) {
  const atkLabel = t('attackRoll', lang);
  const dmgLabel = t('damageRoll', lang);
  // `mark` (src/sheet/FhStatus.jsx: attackMark): um estado ativo pesa neste ataque. Só aviso
  // uma seta no botão ATAQUE (▽ vazada = só na situação da ressalva) e, na primeira nota, o
  // selo "Desv. · usar", que ARMA o "Próximo d20" quando o jogador toca (nunca sozinho; a
  // explicação fica uma vez só, no topo do painel). Sem ações: a linha esmaece, sem pílula.
  // O bônus e a rolagem não mudam.
  const bite = mark && onAttack ? mark : null;
  const use = bite?.use || null;
  const notes = [
    ...(use ? [
      <div key="bite" className="fh-atk-note is-use">
        <button type="button" className={`fh-atk-use is-${bite.kind}${bite.conditional ? ' is-cond' : ''}${use.armed ? ' is-armed' : ''}`}
          aria-pressed={use.armed} aria-label={use.aria} title={bite.aria} onClick={use.onUse}>
          {!use.armed && <span className="fh-atk-use-g" aria-hidden="true">{bite.glyph}</span>}{use.label}
        </button>
      </div>,
    ] : []),
    ...Children.toArray(children), // sem null/false: sem nota, sem a caixa vazia
  ];
  return (
    <div className={`fh-atk${bite?.kind === 'block' ? ' is-noact' : ''}`}>
      <span className="fh-atk-art">{art}</span>
      <div className="fh-atk-head">
        <div className="fh-atk-name">{name}</div>
        {sub && <div className="fh-atk-sub">{sub}</div>}
      </div>
      <div className="fh-atk-acts">
        {onAttack && (
          <button type="button" className="fh-atk-btn is-hit" onClick={onAttack} title={bite ? bite.aria : undefined} aria-label={`${name}: ${atkLabel} ${atkText}${bite ? `. ${bite.aria}` : ''}`}>
            {bite && <span className={`fh-atk-bite is-${bite.kind}${bite.conditional ? ' is-cond' : ''}`} aria-hidden="true">{bite.glyph}</span>}
            <span className="fh-atk-btn-k">{atkLabel}</span>
            <span className="fh-atk-btn-v">{atkText}</span>
          </button>
        )}
        {chip}
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
