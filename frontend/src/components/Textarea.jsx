import { useId } from "react";

function Textarea({
  label,
  error,
  helperText,
  id,
  name,
  className = "",
  disabled = false,
  required = false,
  rows = 4,
  ...props
}) {
  const generatedId = useId();
  const textareaId = id || name || generatedId;
  const message = typeof error === "string" ? error : helperText;
  const describedBy = message ? `${textareaId}-message` : undefined;

  const textareaStyles = disabled
    ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 placeholder:text-gray-400"
    : error
      ? "border-danger text-ink placeholder:text-muted focus:border-danger focus:ring-danger"
      : "border-muted text-ink placeholder:text-muted focus:border-brand-teal focus:ring-brand-teal";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`min-h-24 w-full resize-y rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-1 ${textareaStyles} ${className}`}
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

export default Textarea;
