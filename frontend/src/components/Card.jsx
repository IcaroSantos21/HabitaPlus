function Card({
  title,
  description,
  children,
  footer,
  className = "",
  padding = "md",
  ...props
}) {
  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <section
      className={`rounded-xl border border-gray-100 bg-white shadow-sm ${paddingStyles[padding] || paddingStyles.md} ${className}`}
      {...props}
    >
      {(title || description) && (
        <header className="mb-4">
          {title && <h3 className="text-base font-bold text-brand-navy">{title}</h3>}
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </header>
      )}
      {children}
      {footer && <footer className="mt-5 border-t border-gray-100 pt-4">{footer}</footer>}
    </section>
  );
}

export default Card;
