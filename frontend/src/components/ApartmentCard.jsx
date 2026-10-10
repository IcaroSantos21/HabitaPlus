import Badge from "./Badge";
import Button from "./Button";

function ApartmentCard({ apartment = {}, onViewDetails, className = "" }) {
  const title = apartment.title || apartment.name || "Apartamento disponível";
  const address = apartment.address || "Endereço não informado";
  const price = apartment.price || "Consulte o valor";
  const bedrooms = apartment.bedrooms ?? apartment.quartos;
  const bathrooms = apartment.bathrooms ?? apartment.banheiros;
  const area = apartment.area;
  const status = apartment.status || "Disponível";
  const imageUrl = apartment.imageUrl || apartment.image;

  return (
    <article className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-brand-mint/40 text-4xl" aria-hidden="true">
          <span>⌂</span>
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-brand-navy">{title}</h3>
          <Badge status={status} />
        </div>
        <p className="text-sm text-muted">{address}</p>
        <p className="text-lg font-bold text-brand-teal">{price}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {bedrooms !== undefined && <span>{bedrooms} quarto(s)</span>}
          {bathrooms !== undefined && <span>{bathrooms} banheiro(s)</span>}
          {area !== undefined && <span>{area} m²</span>}
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
