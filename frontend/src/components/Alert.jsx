const alertStyles = {
  success: { bar: "bg-brand-mint text-brand-teal", icon: "✓", title: "Sucesso", border: "border-brand-green/30" },
  info: { bar: "bg-blue-100 text-brand-navy", icon: "i", title: "Informação", border: "border-blue-200" },
  warning: { bar: "bg-orange-100 text-orange-700", icon: "!", title: "Aviso", border: "border-orange-200" },
  error: { bar: "bg-red-100 text-danger", icon: "×", title: "Erro", border: "border-red-200" },
};

function Alert({ variant = "info", title, children, className = "", onClose }) {
  const current = alertStyles[variant] || alertStyles.info;

  return (
    <div role={variant === "error" ? "alert" : "status"} className={`flex overflow-hidden rounded-md border ${current.border} bg-white shadow-sm ${className}`}>
      <div className={`flex w-12 shrink-0 items-center justify-center text-xl font-bold ${current.bar}`} aria-hidden="true">
        {current.icon}
      </div>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">{title || current.title}</p>
          {children && <p className="mt-1 text-xs leading-5 text-muted">{children}</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar alerta" className="rounded px-1 text-lg leading-none text-muted hover:bg-gray-100">×</button>
        )}
      </div>
    </div>
  );
}

export default Alert;
