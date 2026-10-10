const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2";

const variantStyles = {
  primary: "bg-brand-teal text-white hover:bg-brand-navy",
  secondary: "border border-muted bg-white text-brand-navy hover:bg-gray-50",
  danger: "bg-danger text-white hover:brightness-95",
};

const sizeStyles = {
  sm: "min-h-8 px-3 text-xs",
  md: "min-h-9 px-4 text-sm",
  lg: "min-h-11 px-6 text-base",
};

function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const selectedVariant = variantStyles[variant] || variantStyles.primary;
  const selectedSize = sizeStyles[size] || sizeStyles.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${baseStyles} ${selectedSize} ${
        isDisabled
          ? "cursor-not-allowed bg-gray-500 text-white opacity-100"
          : selectedVariant
      } ${className}`}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}

export default Button;
