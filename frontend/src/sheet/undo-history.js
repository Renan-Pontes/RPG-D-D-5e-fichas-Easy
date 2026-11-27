import { applyPatches, enablePatches, produceWithPatches } from 'immer';

enablePatches();

export function createUndoHistory(limit = 20) {
  let past = [];
  let future = [];

  return {
    apply(current, recipe, label = '') {
      const [next, patches, inversePatches] = produceWithPatches(current, recipe);
      if (!patches.length) return { state: current, changed: false, label };
      past.push({ patches, inversePatches, label });
      if (past.length > limit) past = past.slice(past.length - limit);
      future = [];
      return { state: next, changed: true, label };
    },
    record(prev, next, label = '') {
      return this.apply(prev, () => next, label);
    },
    undo(current) {
      const entry = past.pop();
      if (!entry) return null;
      future.push(entry);
      return { state: applyPatches(current, entry.inversePatches), label: entry.label };
    },
    redo(current) {
      const entry = future.pop();
      if (!entry) return null;
      past.push(entry);
      return { state: applyPatches(current, entry.patches), label: entry.label };
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    size: () => past.length,
    clear: () => { past = []; future = []; },
  };
}
