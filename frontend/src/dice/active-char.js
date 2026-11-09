// Ficha aberta agora (para o rolador global resolver vínculos: atributo, proficiência).
let current = null;
const subs = new Set();
export const setActiveChar = (c) => { current = c || null; subs.forEach(f => f()); };
export const getActiveChar = () => current;
export const subscribeActiveChar = (f) => { subs.add(f); return () => subs.delete(f); };
