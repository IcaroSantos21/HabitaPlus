import Badge from "./Badge";
import Button from "./Button";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "Valor não informado";
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : String(value);
}

function formatNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(amount)
    : value;
}

function ApartmentCard({ apartment = {}, onViewDetails, className = "" }) {
  // Contrato alinhado à entidade Unidade do backend: id, bloco, numero,
  // quartos, areaM2, valorAluguelSugerido e disponivelLocacao.
  const title = apartment.numero
    ? `Apartamento ${apartment.numero}`
    : apartment.id !== undefined && apartment.id !== null
      ? `Unidade ${apartment.id}`
      : "Unidade habitacional";
  const blockLabel = apartment.bloco ? `Bloco ${apartment.bloco}` : null;
  const price = formatCurrency(apartment.valorAluguelSugerido);
  const status =
    typeof apartment.disponivelLocacao === "boolean"
      ? apartment.disponivelLocacao
        ? "DISPONIVEL"
        : "INDISPONIVEL"
      : null;

  return (
    <article className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div
        className="flex h-32 items-center justify-center bg-brand-mint/40 text-4xl text-brand-teal"
        aria-hidden="true"
      >
        <span>⌂</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-brand-navy">{title}</h3>
          {status && <Badge status={status} />}
        </div>

        {blockLabel && <p className="text-sm text-muted">{blockLabel}</p>}
        <p className="text-lg font-bold text-brand-teal">{price}</p>

        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {apartment.quartos !== undefined && apartment.quartos !== null && (
            <span>{formatNumber(apartment.quartos)} quarto(s)</span>
          )}
          {apartment.areaM2 !== undefined && apartment.areaM2 !== null && (
            <span>{formatNumber(apartment.areaM2)} m²</span>
          )}
        </div>

        {onViewDetails && (
          <Button className="w-full" onClick={() => onViewDetails(apartment)}>
            Ver detalhes
          </Button>
        )}
      </div>
    </article>
  );
}

export default ApartmentCard;
