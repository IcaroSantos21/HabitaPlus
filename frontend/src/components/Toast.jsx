import { useEffect } from "react";
import Alert from "./Alert";

function Toast({ open = true, variant = "success", title, message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!open || !onClose || duration <= 0) return undefined;
    const timer = window.setTimeout(() => onClose(), duration);
    return () => window.clearTimeout(timer);
  }, [open, onClose, duration]);

  if (!open) return null;

  return (
    <div className="fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm" aria-live="polite">
      <Alert variant={variant} title={title || "Notificação"} onClose={onClose}>
        {message}
      </Alert>
    </div>
  );
}

export default Toast;
