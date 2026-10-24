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
 * - Voltar de nível abaixo do nível da subclasse apaga a subclasse, mas guarda a
 *   escolha (sealedSubclass): subir de novo devolve a mesma, sem virar uma nova
 *   primeira escolha.
 *
 * `view` é a ficha vista como uma classe (Utils.classView): subclass/landType daquela
 * classe, cheatMode e inCampaign da ficha. Funções puras, testáveis no Node.
 */
import { classEntries } from './multiclass.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

// O mesmo de Utils.subclassLevel (utils.js importa a engine, que usa este módulo).
const SUB_LEVEL_2014 = { cleric: 1, sorcerer: 1, warlock: 1, druid: 2, wizard: 2 };
export const subclassLevelOf = (char, classId = char?.className) =>
  (char?.rulesVersion === '2024' ? 3 : SUB_LEVEL_2014[classId] || 3);

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

/**
 * Edição da ficha (tela Editar): ao concluir, o que a ficha SALVA tem selado volta
 * como estava — classe inicial, subclasse e terreno —, mesmo que algum passo tenha
 * apagado. Defesa final: os passos já não oferecem a troca. `subs`: subclassesFor(saved).
 */
export function restoreSealed(saved, next, subs) {
  if (!saved || !next) return next;
  const out = { ...next };
  if (subclassLock(saved, subs).locked) {
    if (out.className !== saved.className) {
      out.className = saved.className;
      if ('saveProfs' in saved) out.saveProfs = saved.saveProfs;
    }
    if ((out.subclass || '') !== (saved.subclass || '')) {
      out.subclass = saved.subclass;
      out.landType = saved.landType || '';
      out.starFormType = saved.starFormType || '';
    }
  }
  // Terreno: só quando o círculo é o mesmo (escolher o primeiro continua livre).
  if (out.subclass === saved.subclass && landTypeLock(saved).locked) out.landType = saved.landType;
  return out;
}

const withEntry = (char, e, patch) => (e.primary
  ? { ...char, ...patch }
  : { ...char, multiclass: (char.multiclass || []).map(m => (m.id === e.id ? { ...m, ...patch } : m)) });

/**
 * Voltar de nível (`prev` → `next`, já sem o último nível): a classe que fica abaixo do
 * nível da subclasse perde a subclasse (e o terreno), e a que sai da ficha (multiclasse)
 * some com ela; nos dois casos a escolha fica guardada em
 * `sealedSubclass: { [classId]: { subclass, landType } }` para voltar na subida.
 */
export function dropSubclassesBelowLevel(prev, next) {
  let out = next;
  const kept = { ...(prev?.sealedSubclass || {}) };
  const now = classEntries(next);
  for (const e of classEntries(prev)) {
    if (!e.subclass) continue;
    const cur = now.find(x => x.id === e.id);
    if (cur && cur.level >= subclassLevelOf(next, e.id)) continue;
    kept[e.id] = { subclass: e.subclass, landType: e.landType || '' };
    if (cur) out = withEntry(out, cur, { subclass: '', landType: '' });
  }
  return Object.keys(kept).length ? { ...out, sealedSubclass: kept } : out;
}

/**
 * Subida de nível (e qualquer gravação, via applyAutosToCharacter): a classe que volta
 * ao nível da subclasse sem ter uma recebe a escolha guardada. Com o modo trapaça a
 * escolha guardada é ignorada (a troca é livre). Em campanha não mexe: lá o servidor
 * trava a subclasse e quem decide é o mestre.
 */
export function restoreSealedSubclass(char) {
  const kept = char?.sealedSubclass;
  if (!kept || typeof kept !== 'object' || char.inCampaign || char.cheatMode) return char;
  let out = char;
  const left = { ...kept };
  for (const e of classEntries(char)) {
    const k = kept[e.id];
    if (!k) continue;
    if (e.subclass) { delete left[e.id]; continue; } // já tem (escolhida com trapaça): sobra velha
    if (!k.subclass || e.level < subclassLevelOf(char, e.id)) continue;
    out = withEntry(out, e, { subclass: k.subclass, landType: k.landType || '' });
    delete left[e.id];
  }
  if (Object.keys(left).length === Object.keys(kept).length) return char;
  out = { ...out };
  if (Object.keys(left).length) out.sealedSubclass = left; else delete out.sealedSubclass;
  return out;
}

/** Dica curta mostrada no lugar do botão de trocar. */
export function sealHint(reason, lang = 'pt') {
  if (reason === 'campaign') return L(lang, 'Em campanha, só o mestre troca', 'In a campaign, only the DM can change it');
  if (reason === 'sealed') return L(lang, 'Para trocar, ligue o modo trapaça', 'To change it, turn on cheat mode');
  return '';
}
