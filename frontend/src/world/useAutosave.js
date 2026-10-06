// Autosave com debounce (cópia adaptada do PrepTab, para o editor do Mundo).
//
//   const { state, queue, flush, hasPending, discard, resume, peek } = useAutosave(save, { delay: 700, maxWait: 3000 });
//   queue({ name: 'Novo nome' })   // junta com o que estiver pendente
//
// `save(patch)` é async. Se lançar um erro com `isConflict(e)` verdadeiro, o
// estado vira 'conflict', o patch volta para a fila e o autosave PAUSA (nada
// do texto local se perde) até `resume()` (gravar por cima) ou `discard()`.
// Estados: 'saved' | 'dirty' | 'saving' | 'error' | 'conflict'.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAutosave(save, { delay = 700, maxWait = 3000, isConflict = () => false, onError } = {}) {
  const [state, setState] = useState('saved');
  const pending = useRef({});
  const timer = useRef(null);
  const dirtySince = useRef(0);
  const chain = useRef(Promise.resolve());
  const paused = useRef(false);
  const saveRef = useRef(save);
  const optsRef = useRef({ isConflict, onError });
  saveRef.current = save;
  optsRef.current = { isConflict, onError };

  const hasPending = useCallback(() => Object.keys(pending.current).length > 0, []);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (paused.current) return chain.current;
    chain.current = chain.current.then(async () => {
      const body = pending.current;
      pending.current = {};
      if (!Object.keys(body).length || paused.current) { pending.current = { ...body, ...pending.current }; return; }
      setState('saving');
      try {
        await saveRef.current(body);
        setState(Object.keys(pending.current).length ? 'dirty' : 'saved');
        if (Object.keys(pending.current).length && !paused.current) timer.current = setTimeout(flush, delay);
      } catch (e) {
        pending.current = { ...body, ...pending.current };
        if (optsRef.current.isConflict(e)) { paused.current = true; setState('conflict'); } else { setState('error'); }
        optsRef.current.onError?.(e);
      }
    });
    return chain.current;
  }, [delay]);

  const queue = useCallback((patch) => {
    if (!Object.keys(pending.current).length) dirtySince.current = Date.now();
    pending.current = { ...pending.current, ...patch };
    if (paused.current) return;
    setState('dirty');
    clearTimeout(timer.current);
    if (Date.now() - dirtySince.current > maxWait) flush();
    else timer.current = setTimeout(flush, delay);
  }, [delay, maxWait, flush]);

  /** Joga fora o que está pendente (ex.: "Recarregar" depois de um conflito). */
  const discard = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = {};
    paused.current = false;
    setState('saved');
  }, []);

  /** Sai da pausa e tenta gravar de novo (ex.: "Manter o meu"). */
  const resume = useCallback(() => {
    paused.current = false;
    return flush();
  }, [flush]);

  // Salva o que faltar ao desmontar / esconder a página.
  useEffect(() => () => { flush(); }, [flush]);
  useEffect(() => {
    const onUnload = (e) => { if (Object.keys(pending.current).length && !paused.current) { flush(); e.preventDefault(); e.returnValue = ''; } };
    const onHide = () => { if (document.visibilityState === 'hidden' && Object.keys(pending.current).length) flush(); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('visibilitychange', onHide); };
  }, [flush]);

  /** Cópia do que ainda não foi gravado. */
  const peek = useCallback(() => ({ ...pending.current }), []);

  return { state, queue, flush, hasPending, discard, resume, peek };
}

export const saveStateLabel = (state, lang) => {
  const pt = lang !== 'en';
  return {
    saved: pt ? 'Salvo' : 'Saved',
    dirty: pt ? 'Alterado…' : 'Edited…',
    saving: pt ? 'Salvando…' : 'Saving…',
    error: pt ? 'Erro ao salvar' : 'Save failed',
    conflict: pt ? 'Conflito' : 'Conflict',
  }[state] || '';
};

export default useAutosave;
