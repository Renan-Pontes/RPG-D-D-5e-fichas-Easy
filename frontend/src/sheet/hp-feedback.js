/* Pontos de vida da ficha: estado visual e retorno quando o PV muda (só design).
 * Nada aqui grava a ficha nem mexe nas regras de applyHp (components/Sheet.jsx). */
import { useEffect, useRef, useState } from 'react';

// Limites da demo "Ficha Forjada": mais de 50% firme, mais de 25% ferido, acima de 0
// à beira da morte, 0 caído (é quando aparecem os testes contra a morte).
export function hpState(currentHp, maxHp) {
  const cur = currentHp || 0;
  if (cur <= 0) return 'down';
  const pct = (cur / Math.max(1, maxHp || 0)) * 100;
  return pct > 50 ? 'ok' : pct > 25 ? 'warn' : 'crit';
}

const STATE_LABEL = {
  pt: { ok: 'Firme', warn: 'Ferido', crit: 'À beira da morte', down: 'Caído' },
  en: { ok: 'Steady', warn: 'Wounded', crit: 'Near death', down: 'Down' },
};
export const hpStateLabel = (state, lang) => (STATE_LABEL[lang] || STATE_LABEL.en)[state];

// Quanto o PV mudou desde a renderização anterior, para o número que sobe, o tremor e o
// clarão. Vale para qualquer origem (botões, descanso, servidor, mestre), e não dispara:
// - na 1ª renderização (abrir a ficha ou voltar para a aba Jogar);
// - ao trocar de ficha, nem ao entrar ou sair da Forma Selvagem (o PV troca de dono);
// - enquanto o jogador digita no campo de PV temporário (.fh-hp-temp).
// Dano absorvido pelo PV temporário também conta como dano. Volta a null em 1,2 s.
export function useHpFeedback(char) {
  const now = {
    id: char.id,
    hp: char.currentHp || 0,
    temp: char.tempHp || 0,
    ws: !!char.wildShape?.active,
  };
  const prev = useRef(null);
  const [fx, setFx] = useState(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = now;
    if (!p || p.id !== now.id || p.ws !== now.ws) return;
    const dHp = now.hp - p.hp;
    const editingTemp = typeof document !== 'undefined' && !!document.activeElement?.closest?.('.fh-hp-temp');
    const dTemp = editingTemp ? 0 : Math.min(0, now.temp - p.temp);
    const delta = dHp > 0 ? dHp : dHp + dTemp;
    if (!delta) return;
    setFx(f => ({ id: (f?.id || 0) + 1, delta }));
  }, [now.id, now.hp, now.temp, now.ws]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fx) return undefined;
    const timer = setTimeout(() => setFx(null), 1200);
    return () => clearTimeout(timer);
  }, [fx]);
  return fx;
}
