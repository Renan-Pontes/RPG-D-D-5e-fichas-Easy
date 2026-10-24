/**
 * Trava da subclasse ("selar" o círculo do druida, o domínio, o juramento, o patrono…).
 *
 * - A primeira escolha é livre: enquanto a classe não tem subclasse, a ficha oferece
 *   a escolha (e a subida de nível segue normal).
 * - Depois de escolhida ela fica selada: trocar só com o modo trapaça ligado.
 * - Em campanha o modo trapaça só libera magias (o servidor trava a subclasse e quem
 *   corrige é o mestre, pelo editor do mestre): lá a trava vale mesmo com ele ligado.
 * - Escolhas presas à subclasse seguem a mesma regra. Hoje: o terreno do Círculo da
 *   Terra (landType) — escolher a primeira vez é livre; trocar depois, só com trapaça.
 *
 * `view` é a ficha vista como uma classe (Utils.classView): subclass/landType daquela
 * classe, cheatMode e inCampaign da ficha. Funções puras, testáveis no Node.
 */

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

/**
 * { locked, reason } para um campo selado: reason 'campaign' (só o mestre troca),
 * 'sealed' (só com o modo trapaça) ou null (livre: ainda não escolhido, ou trapaça).
 */
export function sealLock(view, field = 'subclass') {
  if (!view?.[field]) return { locked: false, reason: null };
  if (view.inCampaign) return { locked: true, reason: 'campaign' };
  if (view.cheatMode) return { locked: false, reason: null };
  return { locked: true, reason: 'sealed' };
}

/**
 * `subs` (opcional): as subclasses que a ficha conhece (subclassesFor). Um id que a
 * lista não tem (ex.: de outra versão das regras) a ficha mostra como "escolher":
 * não conta como selado, para a escolha não ser barrada sem explicação.
 */
export const subclassLock = (view, subs) =>
  (!subs || subs.some(s => s.id === view?.subclass) ? sealLock(view, 'subclass') : { locked: false, reason: null });
export const landTypeLock = (view) => sealLock(view, 'landType');

/**
 * Trocar a classe inicial na edição da ficha apaga a subclasse dela (e daria para
 * escolher outra ao voltar): fica travada junto com a subclasse.
 */
export const classChangeLock = (char, subs) => subclassLock(char, subs);

/**
 * O patch sem as trocas que a trava proíbe. Escolher pela primeira vez (campo vazio)
 * passa; repetir o valor atual também. Defesa extra atrás dos botões travados.
 */
export function guardSealedPatch(view, patch, subs) {
  const out = { ...(patch || {}) };
  const changes = (f) => f in out && (out[f] || '') !== (view?.[f] || '');
  if (changes('subclass') && subclassLock(view, subs).locked) {
    delete out.subclass;
    delete out.landType; // o terreno vinha junto com a subclasse barrada
  }
  if (changes('landType') && landTypeLock(view).locked) delete out.landType;
  return out;
}

/** Dica curta mostrada no lugar do botão de trocar. */
export function sealHint(reason, lang = 'pt') {
  if (reason === 'campaign') return L(lang, 'Em campanha, só o mestre troca', 'In a campaign, only the DM can change it');
  if (reason === 'sealed') return L(lang, 'Para trocar, ligue o modo trapaça', 'To change it, turn on cheat mode');
  return '';
}
