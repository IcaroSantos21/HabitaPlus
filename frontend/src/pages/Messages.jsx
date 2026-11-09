import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import Card from "../components/Card";
import messagesService from "../services/messagesService";

function Messages() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await messagesService.inbox();
        if (active) setThreads(Array.isArray(response) ? response : []);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "Não foi possível carregar sua caixa de entrada.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [reloadKey]);

  function openThread(thread) {
    const params = new URLSearchParams({ anuncio: String(thread.anuncioId), usuarioId: String(thread.outroUsuario.id) });
    navigate(`/marketplace?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal">Marketplace</p>
          <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">Caixa de entrada</h1>
          <p className="mt-1 text-sm text-muted">Conversas com compradores e vendedores dos anúncios.</p>
        </div>
        <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Atualizar</Button>
      </header>
      {loading ? <div className="py-10 text-center"><Loading label="Carregando conversas..." /></div> : error ? (
        <Alert variant="error" title="Falha ao carregar mensagens">{error}<div className="mt-3"><Button size="sm" variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Tentar novamente</Button></div></Alert>
      ) : threads.length === 0 ? (
        <EmptyState title="Sua caixa de entrada está vazia" description="Quando alguém entrar em contato sobre um anúncio, a conversa aparecerá aqui." action={<Button onClick={() => navigate("/marketplace")}>Explorar marketplace</Button>} />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3">
          {threads.map((thread) => (
            <Card key={`${thread.anuncioId}-${thread.outroUsuario?.id}`} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-bold text-brand-navy">{thread.anuncioTitulo || `Anúncio #${thread.anuncioId}`}</h2>
                  {Number(thread.naoLidas) > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">{thread.naoLidas} não lida(s)</span>}
                </div>
                <p className="mt-1 text-sm text-muted">Conversa com {thread.outroUsuario?.nome || "Usuário"}</p>
                <p className="mt-2 break-words text-sm text-ink">{thread.ultimaMensagem?.texto || "Nenhuma mensagem"}</p>
                {thread.ultimaMensagem?.criadaEm && <time className="mt-1 block text-xs text-muted" dateTime={thread.ultimaMensagem.criadaEm}>{new Date(thread.ultimaMensagem.criadaEm).toLocaleString("pt-BR")}</time>}
              </div>
              <Button className="w-full shrink-0 sm:w-auto" onClick={() => openThread(thread)}>Abrir conversa</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Messages;
