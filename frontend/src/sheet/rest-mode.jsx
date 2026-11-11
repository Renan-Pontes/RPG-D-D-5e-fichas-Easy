// Modo descanso da ficha: os botões Curto/Longo do herói viram interruptores. Ligado, a
// ficha muda de cara (classe .is-resting-*) e libera o que só existe no descanso — gastar
// Dados de Vida no painel de PV. Desligar conclui o descanso (aplica a recuperação).
// Sem provedor (prévia, editor do mestre) os botões descansam direto, como antes.
import { createContext, useContext } from 'react';

export const RestModeContext = createContext(null);

/** { mode: null | 'short' | 'long', setMode } ou null fora da ficha. */
export const useRestMode = () => useContext(RestModeContext);
