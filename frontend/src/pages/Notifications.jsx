import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import notificationsService from "../services/notificationsService";

function targetFor(notification) {
  if (notification.tipo === "ANUNCIO" || notification.tipo === "MENSAGEM") {
    return notification.refId ? `/marketplace?anuncio=${notification.refId}` : "/messages";
  }
  if (notification.tipo === "COBRANCA") return "/charges";
  if (notification.tipo === "ALERTA") {
    return String(notification.texto || "").toLocaleLowerCase("pt-BR").includes("contrato de locação") ? "/rentals" : "/tickets";
  }
  return "/marketplace";
}

function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ pagina: 1, totalPaginas: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await notificationsService.list({ pagina: page, limite: 15, ...(onlyUnread ? { apenasNaoLidas: true } : {}) });
        if (active) {
          setItems(Array.isArray(response?.data) ? response.data : []);
          setMeta(response?.meta || { pagina: page, totalPaginas: 1, total: 0 });
        }
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "Não foi possível carregar as notificações.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [page, onlyUnread, reloadKey]);

  async function markOne(item) {
    if (!item.lida) {
      try {
        await notificationsService.markAsRead(item.id);
        setItems((current) => current.map((row) => row.id === item.id ? { ...row, lida: true } : row));
      } catch (requestError) {
        setError(requestError?.response?.data?.message || "Não foi possível marcar a notificação como lida.");
        return;
      }
    }
    navigate(targetFor(item));
  }

  async function markAll() {
    try {
      await notificationsService.markAllAsRead();
      setItems((current) => current.map((item) => ({ ...item, lida: true })));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Não foi possível marcar todas como lidas.");
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal">Central de alertas</p>
          <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">Notificações</h1>
          <p className="mt-1 text-sm text-muted">Acompanhe anúncios, mensagens, cobranças e alertas do condomínio.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>Atualizar</Button>
          <Button size="sm" onClick={markAll} disabled={items.length === 0 || items.every((item) => item.lida)}>Marcar todas como lidas</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={onlyUnread} onChange={(event) => { setOnlyUnread(event.target.checked); setPage(1); }} className="h-4 w-4 rounded border-gray-300 accent-brand-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal" />
          Mostrar somente não lidas
        </label>
        {!loading && <span className="text-sm text-muted">{meta.total ?? items.length} notificação(ões)</span>}
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {loading ? <div className="py-10 text-center"><Loading label="Carregando notificações..." /></div> : items.length === 0 ? (
        <EmptyState title={onlyUnread ? "Nenhuma notificação não lida" : "Nenhuma notificação"} description={onlyUnread ? "Você está em dia! Não há notificações pendentes." : "Quando houver novidades, elas aparecerão aqui."} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={`flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${item.lida ? "" : "border-l-4 border-l-brand-teal"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.lida ? "default" : "info"}>{item.tipo || "Notificação"}</Badge>
                  {!item.lida && <Badge variant="success">Nova</Badge>}
                </div>
                <p className="mt-2 break-words text-sm font-medium text-ink">{item.texto}</p>
                <time className="mt-1 block text-xs text-muted" dateTime={item.criadaEm}>{item.criadaEm ? new Date(item.criadaEm).toLocaleString("pt-BR") : ""}</time>
              </div>
              <Button variant="secondary" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => markOne(item)}>Abrir</Button>
            </Card>
          ))}
        </div>
      )}
      {!loading && Number(meta.totalPaginas || 1) > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
          <span className="text-sm text-muted">Página {page} de {meta.totalPaginas}</span>
          <Button size="sm" variant="secondary" disabled={page >= Number(meta.totalPaginas)} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}

export default Notifications;
