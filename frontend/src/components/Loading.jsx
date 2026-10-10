function Loading({ label = "Carregando...", size = "md", variant = "spinner", className = "" }) {
  const spinnerSizes = { sm: "h-4 w-4", md: "h-7 w-7", lg: "h-10 w-10" };

  if (variant === "skeleton") {
    return (
      <div role="status" aria-label={label} className={`animate-pulse space-y-3 ${className}`}>
        <span className="sr-only">{label}</span>
        <div className="h-4 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div role="status" className={`inline-flex items-center gap-3 text-sm text-muted ${className}`}>
      <span aria-hidden="true" className={`${spinnerSizes[size] || spinnerSizes.md} animate-spin rounded-full border-2 border-brand-green border-r-transparent`} />
      <span>{label}</span>
    </div>
  );
}

export default Loading;
