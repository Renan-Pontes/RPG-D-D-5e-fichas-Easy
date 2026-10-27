/* "📺 Na Tela · 🔒 Só eu" das rolagens da ficha, na faixa da campanha (V15).
 *
 * O mesmo seletor do topo do rolador (components/DiceRoller.jsx), lembrado por
 * personagem no aparelho (src/dice/sheet-roll.js). Só eu: nada do que a ficha rola
 * sai do aparelho. A linha de baixo explica a regra em texto (nada só por ícone) e
 * diz quando o mestre deixou as rolagens das fichas fora da Tela.
 */
import { useSyncExternalStore } from 'react';
import { getSheetRolls, setSheetSecret, subscribeSheetRolls } from '../dice/sheet-roll.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export default function SheetRollTarget({ lang }) {
  const ctx = useSyncExternalStore(subscribeSheetRolls, getSheetRolls, getSheetRolls);
  if (!ctx || ctx.blocked) return null;
  const value = ctx.secret ? 'secret' : 'shown';
  const why = ctx.secret
    ? L(lang, 'Só você vê o que rola nesta ficha: nada sai do aparelho.', 'Only you see what you roll on this sheet: nothing leaves this device.')
    : ctx.allowed === false
      ? L(lang, 'O mestre deixou as rolagens das fichas fora da Tela: por enquanto tudo fica no seu aparelho.', 'The GM keeps sheet rolls off the screen: for now everything stays on your device.')
      : L(lang, 'Na sessão ao vivo, a Tela da mesa mostra o que você rola aqui (perícias, ataques, dano…).', 'During the live session, the table screen shows what you roll here (skills, attacks, damage…).');
  return (
    <div className="fh-camp-rolls">
      <span className="fh-camp-rolls-title" id="fh-camp-rolls-t">🎲 {L(lang, 'Suas rolagens', 'Your rolls')}</span>
      <div className="fh-camp-rolls-seg" role="radiogroup" aria-labelledby="fh-camp-rolls-t">
        {[['shown', L(lang, '📺 Na Tela', '📺 On screen')], ['secret', L(lang, '🔒 Só eu', '🔒 Only me')]].map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v}
            className={`fh-camp-rolls-btn ${value === v ? 'active' : ''}`} onClick={() => setSheetSecret(v === 'secret')}>
            {label}
          </button>
        ))}
      </div>
      <p className="fh-camp-rolls-why">{why}</p>
    </div>
  );
}
