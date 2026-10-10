const variantStyles = {
  available: "bg-brand-mint text-brand-teal",
  success: "bg-brand-mint text-brand-teal",
  pending: "bg-orange-100 text-orange-800",
  warning: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-danger",
  danger: "bg-red-100 text-danger",
  closed: "bg-gray-100 text-gray-600",
  info: "bg-blue-100 text-brand-navy",
  default: "bg-gray-100 text-gray-700",
};

const statusVariants = {
  disponivel: "available",
  disponível: "available",
  ativo: "available",
  sucesso: "success",
  pendente: "pending",
  aguardando: "pending",
  erro: "error",
  atrasado: "error",
  encerrado: "closed",
  fechado: "closed",
  concluido: "closed",
  concluído: "closed",
  informacao: "info",
  informação: "info",
};

function Badge({ children, status, variant, className = "" }) {
  const text = children ?? status ?? "Status";
  const normalized = String(variant || status || "default").toLowerCase();
  const resolvedVariant = variant || statusVariants[normalized] || normalized;
  const styles = variantStyles[resolvedVariant] || variantStyles.default;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles} ${className}`}>
      {text}
    </span>
  );
}

export default Badge;
