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

const statusConfig = {
  DISPONIVEL: { variant: "available", label: "Disponível" },
  INDISPONIVEL: { variant: "closed", label: "Indisponível" },
  AVAILABLE: { variant: "available", label: "Disponível" },
  SUCCESS: { variant: "success", label: "Sucesso" },
  PENDING: { variant: "pending", label: "Pendente" },
  WARNING: { variant: "warning", label: "Aviso" },
  ERROR: { variant: "error", label: "Erro" },
  DANGER: { variant: "danger", label: "Erro" },
  CLOSED: { variant: "closed", label: "Encerrado" },
  INFO: { variant: "info", label: "Informação" },
  PENDENTE: { variant: "pending", label: "Pendente" },
  PAGA: { variant: "success", label: "Paga" },
  ATRASADA: { variant: "error", label: "Atrasada" },
  VENDIDO: { variant: "closed", label: "Vendido" },
  ATIVO: { variant: "available", label: "Ativo" },
  SUCESSO: { variant: "success", label: "Sucesso" },
  AGUARDANDO: { variant: "pending", label: "Aguardando" },
  ERRO: { variant: "error", label: "Erro" },
  ATRASADO: { variant: "error", label: "Atrasado" },
  ENCERRADO: { variant: "closed", label: "Encerrado" },
  FECHADO: { variant: "closed", label: "Fechado" },
  CONCLUIDO: { variant: "closed", label: "Concluído" },
  INFORMACAO: { variant: "info", label: "Informação" },
};

function normalize(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function Badge({ children, status, variant, className = "" }) {
  const normalizedStatus = normalize(status);
  const normalizedVariant = normalize(variant).toLowerCase();
  const config = statusConfig[normalizedStatus];
  const variantConfig = statusConfig[normalize(variant)];

  const resolvedVariant = variantStyles[variant]
    ? variant
    : variantStyles[normalizedVariant]
      ? normalizedVariant
      : config?.variant || variantConfig?.variant || "default";

  const text = children ?? config?.label ?? variantConfig?.label ?? status ?? "Status";
  const styles = variantStyles[resolvedVariant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles} ${className}`}
    >
      {text}
    </span>
  );
}

export default Badge;
