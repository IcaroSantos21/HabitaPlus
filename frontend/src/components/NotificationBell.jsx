import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import notificationsService from "../services/notificationsService";

function notificationTarget(notification) {
  const id = notification?.refId;
  if (notification?.tipo === "ANUNCIO" || notification?.tipo === "MENSAGEM") {
    return id ? `/marketplace?anuncio=${id}` : "/messages";
  }
  if (notification?.tipo === "COBRANCA") return "/charges";
  if (notification?.tipo === "ALERTA") {
    return String(notification?.texto || "").toLocaleLowerCase("pt-BR").includes("contrato de locação") ? "/rentals" : "/tickets";
  }
  return "/notifications";
}

function dateLabel(value) {
  if (!value) return "Agora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function NotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshCount = useCallback(async () => {
    try {
      const response = await notificationsService.unreadCount();
      setCount(Number(response?.naoLidas ?? 0));
    } catch {
      // O sino não deve bloquear a navegação se a API estiver indisponível.
    }
  }, []);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await notificationsService.list({ pagina: 1, limite: 5 });
      setItems(Array.isArray(response?.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshCount();
    }, 0);

    const interval = window.setInterval(() => {
      void refreshCount();
    }, 30000);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (open) Promise.resolve().then(() => loadLatest());
  }, [open, loadLatest]);

  async function openNotification(notification) {
    if (!notification.lida) {
      try {
        await notificationsService.markAsRead(notification.id);
        setItems((current) => current.map((item) => item.id === notification.id ? { ...item, lida: true } : item));
        setCount((current) => Math.max(0, current - 1));
      } catch (requestError) {
        setError(requestError?.response?.data?.message || "Não foi possível marcar a notificação como lida.");
      }
    }
    setOpen(false);
    navigate(notificationTarget(notification));
  }

  async function markAll() {
    try {
      await notificationsService.markAllAsRead();
      setItems((current) => current.map((item) => ({ ...item, lida: true })));
      setCount(0);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível marcar todas como lidas.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notificações${count > 0 ? `, ${count} não lidas` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="hp-notification-trigger relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-white/30 px-3 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="hp-notification-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
        {count > 0 && <span className="hp-notification-count absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{count > 99 ? "99+" : count}</span>}
      </button>

      {open && (
        <div role="dialog" aria-label="Notificações recentes" className="hp-notification-popover absolute right-0 z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-xl border border-gray-200 bg-white text-ink shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <h2 className="font-bold text-brand-navy">Notificações</h2>
            <div className="flex items-center gap-2">
              {count > 0 && <button type="button" onClick={markAll} className="text-xs font-semibold text-brand-teal underline">Marcar todas como lidas</button>}
              <button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">×</button>
            </div>
          </div>
          {error && <p role="alert" className="px-4 py-2 text-sm text-danger">{error}</p>}
          {loading ? <p className="px-4 py-6 text-center text-sm text-muted">Carregando...</p> : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Você não tem notificações.</p>
          ) : (
            <ul className="max-h-[65vh] divide-y divide-gray-100 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => openNotification(item)} className={`w-full px-4 py-3 text-left transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal ${item.lida ? "bg-white" : "bg-blue-50/70"}`}>
                    <span className="flex items-start gap-2">
                      <span aria-hidden="true" className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.lida ? "bg-gray-300" : "bg-brand-teal"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium text-ink">{item.texto}</span>
                        <span className="mt-1 block text-xs text-muted">{dateLabel(item.criadaEm)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-100 px-4 py-3 text-center">
            <button type="button" onClick={() => { setOpen(false); navigate("/notifications"); }} className="text-sm font-semibold text-brand-teal underline">Ver todas as notificações</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
