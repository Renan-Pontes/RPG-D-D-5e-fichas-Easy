// Campo de texto que cresce com o que se escreve (segredos do cartão, Improvisar):
// o texto longo aparece inteiro, sem rolar dentro do campo. `minRows` é a altura
// mínima; o resto das props vai direto ao <textarea>.
// Mede de novo quando o texto muda e quando a LARGURA muda (celular deitado → em pé,
// janela do PC estreitando): mais estreito, o mesmo texto quebra em mais linhas. O CSS
// deixa `overflow-y: auto` de reserva, para o fim do texto nunca ficar inacessível.
import { useLayoutEffect, useRef } from 'react';

function fit(el) {
  if (!el) return;
  el.style.height = 'auto';
  // fora da tela (ainda sem medida) fica a altura das linhas mínimas
  if (el.scrollHeight) el.style.height = `${el.scrollHeight + 2}px`;
}

export default function GrowTextarea({ value, minRows = 2, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => { fit(ref.current); }, [value]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let width = el.clientWidth;
    // só a largura: a altura muda pelo próprio fit() e não pode medir de novo em laço
    const onResize = () => {
      const w = el.clientWidth;
      if (w === width) return;
      width = w;
      fit(el);
    };
    let ro;
    try { ro = new ResizeObserver(onResize); ro.observe(el); } catch { window.addEventListener('resize', onResize); }
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize); };
  }, []);
  return <textarea ref={ref} rows={minRows} value={value} {...rest} />;
}
