/* Título de painel da mesa (src/shell/mesa.css), o mesmo desenho do FhTitle da
 * ficha e do .grim-ptitle do Grimório: losango dourado + texto em folha de ouro +
 * filete até a borda.
 * - `as`: h2/h3/h4 (padrão h3). O texto em folha de ouro usa filter (drop-shadow),
 *   então a ajuda (`hint`, um "?" que pode abrir modal sem portal) e as ações
 *   (`act`) ficam FORA do título.
 * - `sub`: linha de apoio embaixo do título. `id` vai no título (aria-labelledby). */
export default function MesaTitle({ children, as: Tag = 'h3', id, hint, act, sub, className = '' }) {
  return (
    <div className={`mesa-title ${className}`.trim()}>
      <div className="mesa-title-main">
        <span className="mesa-gem" aria-hidden="true" />
        <Tag className="mesa-foil" id={id}>{children}</Tag>
        {hint}
      </div>
      {act && <div className="mesa-title-act">{act}</div>}
      {sub && <div className="mesa-title-sub">{sub}</div>}
    </div>
  );
}
