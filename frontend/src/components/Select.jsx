import { useId } from "react";

function Select({
  label,
  options = [],
  error,
  helperText,
  placeholder = "Selecione uma opção",
  id,
  name,
  className = "",
  disabled = false,
  required = false,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || name || generatedId;
  const message = typeof error === "string" ? error : helperText;
  const describedBy = message ? `${selectId}-message` : undefined;

  const selectStyles = disabled
    ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500"
    : error
      ? "border-danger text-ink focus:border-danger focus:ring-danger"
      : "border-muted text-ink focus:border-brand-teal focus:ring-brand-teal";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-1 ${selectStyles} ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {message && (
        <p id={describedBy} className={`mt-1 text-xs ${error ? "text-danger" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Select;
