import { useEffect, useRef, useState } from "react";
import chatbotService from "../services/chatbotService";

const quickSuggestions = [
  "Ver apartamentos disponíveis",
  "Abrir chamado",
  "Segunda via do boleto",
];

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Valor não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(amount);
}

function safeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function ChatbotResponseData({ data }) {
  if (!data || typeof data !== "object") return null;
  const units = Array.isArray(data.unidades) ? data.unidades : [];
  const tickets = Array.isArray(data.chamados) ? data.chamados : [];
  const charges = Array.isArray(data.cobrancas) ? data.cobrancas : [];
  const rules = Array.isArray(data.regras) ? data.regras : [];
  const paymentUrl = safeExternalUrl(data.paymentUrl);
  const hasTicketCreated = data.chamadoId !== undefined && data.chamadoId !== null;

  if (!units.length && !tickets.length && !charges.length && !rules.length && !paymentUrl && !hasTicketCreated) return null;

  return (
    <div className="hp-chat-data" aria-label="Detalhes da resposta">
      {units.length > 0 && (
        <section className="hp-chat-data__group">
          <p className="hp-chat-data__label">Apartamentos encontrados</p>
          {units.slice(0, 3).map((unit, index) => (
            <article key={unit.id ?? `${unit.bloco || "unidade"}-${unit.numero || index}`} className="hp-chat-unit-card">
              <div className="hp-chat-unit-card__top">
                <strong>{unit.numero ? `Apartamento ${unit.numero}` : `Unidade ${unit.id ?? index + 1}`}</strong>
                {unit.bloco && <span>Bloco {unit.bloco}</span>}
              </div>
              <div className="hp-chat-unit-card__meta">
                {unit.quartos !== undefined && unit.quartos !== null && <span>{unit.quartos} quarto(s)</span>}
                {unit.areaM2 !== undefined && unit.areaM2 !== null && <span>{unit.areaM2} m²</span>}
              </div>
              <p className="hp-chat-unit-card__price">{formatCurrency(unit.valorAluguelSugerido)}</p>
            </article>
          ))}
        </section>
      )}

      {paymentUrl && <a className="hp-chat-payment-link" href={paymentUrl} target="_blank" rel="noopener noreferrer">Abrir link de pagamento <span aria-hidden="true">↗</span></a>}

      {hasTicketCreated && (
        <div className="hp-chat-ticket-created">
          <span aria-hidden="true">✓</span>
          <div><strong>Chamado #{data.chamadoId} registrado</strong>{data.status && <small>Status: {data.status}</small>}</div>
        </div>
      )}

      {tickets.length > 0 && (
        <section className="hp-chat-data__group">
          <p className="hp-chat-data__label">Seus chamados</p>
          {tickets.slice(0, 4).map((ticket, index) => (
            <article key={ticket.id ?? index} className="hp-chat-mini-card">
              <div><strong>{ticket.nome || ticket.titulo || ticket.descricao || `Chamado #${ticket.id ?? index + 1}`}</strong>{ticket.equipamento && <small>Equipamento: {ticket.equipamento}</small>}</div>
              {ticket.status && <span>{ticket.status}</span>}
            </article>
          ))}
        </section>
      )}

      {charges.length > 0 && (
        <section className="hp-chat-data__group">
          <p className="hp-chat-data__label">Cobranças</p>
          {charges.slice(0, 3).map((charge, index) => (
            <article key={charge.id ?? index} className="hp-chat-mini-card">
              <div><strong>{charge.descricao || charge.competencia || `Cobrança #${charge.id ?? index + 1}`}</strong>{charge.status && <small>{charge.status}</small>}</div>
              <b>{formatCurrency(charge.valor)}</b>
            </article>
          ))}
        </section>
      )}

      {rules.length > 0 && (
        <section className="hp-chat-data__group">
          {rules.slice(0, 4).map((rule, index) => (
            <article key={rule.titulo ?? index} className="hp-chat-rule-card"><strong>{rule.titulo || "Regra do condomínio"}</strong>{rule.texto && <p>{rule.texto}</p>}</article>
          ))}
        </section>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="hp-chat-message hp-chat-message--assistant" role="status">
      <img src="/images/assistant/habita-bot-avatar.webp" alt="" className="hp-chat-message__avatar" />
      <div className="hp-chat-typing"><span /><span /><span /><span className="sr-only">O assistente está digitando</span></div>
    </div>
  );
}

function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { id: 0, role: "assistant", text: "Olá! Sou o assistente Habita+. Posso ajudar com apartamentos, chamados, cobranças e regras do condomínio." },
  ]);
  const nextId = useRef(1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [messages, loading, open]);

  async function sendText(value) {
    const text = value.trim();
    if (!text || loading) return;

    const userMessageId = nextId.current++;
    setMessages((current) => [...current, { id: userMessageId, role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(text);
      if (typeof response?.reply !== "string" || !response.reply.trim()) {
        throw new Error("O assistente retornou uma resposta inválida.");
      }
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: response.reply, data: response.data }]);
    } catch (requestError) {
      const status = requestError?.response?.status;
      const friendlyMessage = status === 401
        ? "Sua sessão precisa ser atualizada. Entre novamente para continuar usando o assistente."
        : status === 503 || !requestError?.response
          ? "No momento estou com dificuldade para me conectar ao serviço. Tente novamente em instantes ou continue navegando pelo Habita+."
          : "Não consegui concluir sua solicitação agora. Confira os dados e tente novamente.";
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: friendlyMessage }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void sendText(input);
  }

  return (
    <div className="hp-chatbot-root">
      {open && (
        <section role="dialog" aria-label="Assistente virtual Habita+" aria-modal="false" className="hp-chatbot-panel">
          <header className="hp-chatbot-header">
            <div className="hp-chatbot-header__identity">
              <span className="hp-chatbot-header__avatar"><img src="/images/assistant/habita-bot-avatar.webp" alt="Mascote do assistente Habita+" /></span>
              <span><strong>Assistente Habita+</strong><small>Seu parceiro no dia a dia do condomínio</small></span>
            </div>
            <div className="hp-chatbot-header__actions">
              <span className="hp-chatbot-online"><i /> Online</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar assistente" className="hp-chatbot-close">×</button>
            </div>
          </header>

          <div role="log" aria-live="polite" aria-relevant="additions" aria-busy={loading} className="hp-chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`hp-chat-message hp-chat-message--${message.role}`}>
                {message.role === "assistant" && <img src="/images/assistant/habita-bot-avatar.webp" alt="" className="hp-chat-message__avatar" />}
                <div className="hp-chat-message__bubble">
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  {message.role === "assistant" && <ChatbotResponseData data={message.data} />}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="hp-chat-suggestions">
                <p>Como posso ajudar agora?</p>
                {quickSuggestions.map((suggestion, index) => (
                  <button key={suggestion} type="button" onClick={() => void sendText(suggestion)} className="hp-chat-suggestion">
                    <span aria-hidden="true">{["⌂", "⚒", "▤"][index]}</span>{suggestion}<b aria-hidden="true">→</b>
                  </button>
                ))}
              </div>
            )}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="hp-chatbot-composer">
            <label htmlFor="chatbot-message" className="sr-only">Sua mensagem</label>
            <textarea
              ref={inputRef}
              id="chatbot-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendText(input);
                }
              }}
              maxLength={1000}
              rows={1}
              placeholder="Digite sua mensagem..."
              className="hp-chatbot-input"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensagem" className="hp-chatbot-send"><span aria-hidden="true">➤</span></button>
          </form>
          <p className="hp-chatbot-disclaimer">Respostas automáticas · Confirme informações importantes com a administração.</p>
        </section>
      )}

      {!open && (
        <button type="button" aria-label="Abrir assistente virtual" aria-expanded="false" onClick={() => setOpen(true)} className="hp-chatbot-launcher">
          <img src="/images/assistant/habita-bot-avatar.webp" alt="" />
          <span><strong>Assistente Habita+</strong><small>Posso ajudar você?</small></span>
          <i aria-hidden="true">↗</i>
        </button>
      )}
    </div>
  );
}

export default ChatbotWidget;
