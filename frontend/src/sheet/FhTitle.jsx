/* Título de painel da ficha (visual "Ficha Forjada", src/sheet/ficha.css):
 * losango dourado + texto em folha de ouro + filete até a borda.
 * - O texto é um <h3> (no celular o app força 1.1rem; nunca <h2>).
 * - A dica do Grimório (`hint`) e as ações (`act`) ficam FORA do <h3>: o texto
 *   dourado usa filter (drop-shadow) e a dica abre um Modal, que não é portal —
 *   dentro de um ancestral com filter o fundo fixo deixaria de cobrir a tela.
 * - `sub`: linha de apoio embaixo do título (círculo, CR, percepção passiva…). */
export default function FhTitle({ children, hint, act, sub }) {
  return (
    <div className="fh-title">
      <div className="fh-title-main">
        <span className="fh-gem-mark" aria-hidden="true" />
        <h3 className="fh-foil">{children}</h3>
        {hint}
      </div>
      {act && <div className="fh-title-act">{act}</div>}
      {sub && <div className="fh-title-sub">{sub}</div>}
    </div>
  );
}
