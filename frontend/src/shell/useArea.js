// Navegação entre as áreas da campanha (contrato C4).
//
//   const { area, sub, params, goTo } = useArea();
//   goTo('world', 'atlas', { entryId: 12 });   // abre o Atlas com o cartão 12
//   goTo('play', 'combat');
//   goTo('group');                              // subvista padrão da área
//
// Substitui `onNavigate(tab)` / `onOpenTab(tab)`. Para componentes antigos que
// ainda chamam esses callbacks com o id da aba velha ('combat', 'approvals'…),
// use `legacyNavigate(goTo)` — ele converte para a área nova.
//
// `params` é efêmero (não fica salvo): serve para "abrir este cartão",
// "rolar até esta pista" etc. Quem consome pode chamar `clearParams()` depois.
import { createContext, useContext } from 'react';
import { legacyTabToArea } from './shell-logic.js';

const noop = () => {};

export const AreaContext = createContext({
  area: null,
  sub: null,
  params: {},
  goTo: noop,
  clearParams: noop,
  isDM: false,
  lang: 'pt',
  campaign: null,
  reload: noop,
  openSearch: noop,
  openSettings: noop,
});

export function useArea() {
  return useContext(AreaContext);
}

/** Converte um id de aba antiga em goTo(área, sub). */
export function legacyNavigate(goTo) {
  return (tab, params) => {
    const m = legacyTabToArea(tab);
    if (m) goTo(m[0], m[1], params);
  };
}

export default useArea;
