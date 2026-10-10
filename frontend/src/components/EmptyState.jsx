function EmptyState({ icon = "⌕", title = "Nada por aqui", description = "Não há informações para exibir no momento.", action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center ${className}`}>
      <div aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-mint/50 text-2xl text-brand-teal">
        {icon}
      </div>
      <h3 className="text-base font-bold text-brand-navy">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
