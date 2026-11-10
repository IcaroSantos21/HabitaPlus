import { useRef, useState } from "react";
import chatbotService from "../services/chatbotService";

function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: "assistant",
      text: "Olá! Posso ajudar com chamados, cobranças, locações e regras do condomínio.",
    },
  ]);
  const nextId = useRef(1);

  async function sendMessage(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessageId = nextId.current++;
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text },
    ]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(text);
      if (typeof response?.reply !== "string" || !response.reply.trim()) {
        throw new Error("O assistente retornou uma resposta inválida.");
      }
      const assistantMessageId = nextId.current++;
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          text: response.reply,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Não foi possível enviar a mensagem ao assistente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <section
          role="dialog"
          aria-label="Assistente virtual Habita+"
          className="mb-3 flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white">
            <div>
              <h2 className="font-bold">Assistente Habita+</h2>
              <p className="text-xs text-white/80">Atendimento do condomínio</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
              className="rounded px-2 py-1 text-xl leading-none hover:bg-white/10"
            >
              ×
            </button>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-brand-teal text-white"
                    : "bg-gray-100 text-ink"
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <p className="text-sm text-muted" role="status">
                Assistente está respondendo...
              </p>
            )}
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-100 p-3">
            <label htmlFor="chatbot-message" className="sr-only">
              Sua mensagem
            </label>
            <input
              id="chatbot-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={1000}
              placeholder="Digite sua mensagem..."
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-brand-teal px-3 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Fechar assistente virtual" : "Abrir assistente virtual"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex h-12 items-center justify-center rounded-full bg-brand-teal px-5 font-semibold text-white shadow-lg transition hover:bg-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
      >
        {open ? "Fechar chat" : "Chat"}
      </button>
    </div>
  );
}

export default ChatbotWidget;
