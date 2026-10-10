import { useId } from "react";

function Input({
  label,
  error,
  helperText,
  id,
  name,
  className = "",
  disabled = false,
  required = false,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const message = typeof error === "string" ? error : helperText;
  const describedBy = message ? `${inputId}-message` : undefined;

  const inputStyles = disabled
    ? "cursor-not-allowed border-gray-500 bg-gray-100 text-gray-500 placeholder:text-gray-400"
    : error
      ? "border-danger bg-white text-ink placeholder:text-muted focus:border-danger focus:ring-danger"
      : "border-muted bg-white text-ink placeholder:text-muted focus:border-brand-teal focus:ring-brand-teal";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-1 ${inputStyles} ${className}`}
        {...props}
      />
      {message && (
        <p id={describedBy} className={`mt-1 text-xs ${error ? "text-danger" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Input;
