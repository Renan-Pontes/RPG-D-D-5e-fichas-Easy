// Plural simples para os textos da mesa: `plural(n, 'cartão', 'cartões')`.
// Entra no lugar do "(s)" preguiçoso ("1 pedido(s) pendente(s)", "os 1 personagens").
// Puro (sem React): serve em pt e em en (a regra é a mesma: 1 é singular, o resto é plural).

/** A palavra certa para n: `one` quando n é 1, senão `many`. */
export const plural = (n, one, many) => (Number(n) === 1 ? one : many);

/** "1 cartão" / "3 cartões": o número já colado na palavra. */
export const count = (n, one, many) => `${n} ${plural(n, one, many)}`;

/** Atalho bilíngue: countL(lang, n, ['pedido', 'pedidos'], ['request', 'requests']). */
export const countL = (lang, n, pt, en) => (lang === 'en' ? count(n, en[0], en[1]) : count(n, pt[0], pt[1]));
