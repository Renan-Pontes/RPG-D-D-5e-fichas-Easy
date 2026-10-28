// Campo de texto que cresce com o que se escreve (segredos do cartão, Improvisar):
// o texto longo aparece inteiro, sem rolar dentro do campo. `minRows` é a altura
// mínima; o resto das props vai direto ao <textarea>.
import { useLayoutEffect, useRef } from 'react';

export default function GrowTextarea({ value, minRows = 2, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    // fora da tela (ainda sem medida) fica a altura das linhas mínimas
    if (el.scrollHeight) el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} {...rest} />;
}
