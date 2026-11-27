// Shared toast-undo removal helper
export const undoRemoval = (toast, key, idx, obj, text) => {
  if (!toast) return;
  toast.show({
    text,
    onAction: () => toast.patchChar?.((c) => {
      const list = [...(c[key] || [])];
      list.splice(Math.min(idx, list.length), 0, obj);
      return { [key]: list };
    }),
  });
};

// Campo de moeda: enquanto tem foco guarda o texto digitado (antes o valor voltava para 0
// ao apagar e digitar 25 dava "025"); grava ao sair ou no Enter. O foco seleciona tudo.
