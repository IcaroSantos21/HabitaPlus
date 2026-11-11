import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { useAuth } from "../hooks/useAuth";
import announcementsService from "../services/announcementsService";
import chargesService from "../services/chargesService";
import ticketsService from "../services/ticketsService";

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getRequestError(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    "Não foi possível carregar esta informação."
  );
}

function isPendingCharge(charge) {
  const status = String(charge.status || "").trim().toUpperCase();
  return ["PENDENTE", "PENDING", "ATRASADA", "OVERDUE"].includes(status);
}

function isOpenTicket(ticket) {
  const status = String(ticket.status || "").trim().toUpperCase();
  return !["FECHADO", "CONCLUIDO", "CANCELADO", "CLOSED", "COMPLETED", "CANCELLED"].includes(status);
}

function sortNewest(items, dateKeys) {
  return [...items].sort((a, b) => {
    const dateA = new Date(dateKeys.map((key) => a[key]).find(Boolean) || 0).getTime();
    const dateB = new Date(dateKeys.map((key) => b[key]).find(Boolean) || 0).getTime();
    return dateB - dateA;
  });
}

function ResidentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({
    loading: true,
    charges: [],
    tickets: [],
    announcements: [],
    errors: {},
  });
  const [payment, setPayment] = useState({
    id: null,
    message: "",
    error: "",
  });

  useEffect(() => {
    if (location.hash !== "#comunicados") return;
    document.getElementById("comunicados")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [location.hash]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      chargesService.listMine({ pagina: 1, limite: 10 }),
      ticketsService.list({ limite: 10 }),
      announcementsService.list({ pagina: 1, limite: 5 }),
    ]).then(([chargesResult, ticketsResult, announcementsResult]) => {
      if (!active) return;

      const errors = {};
      let charges = [];
      let tickets = [];
      let announcements = [];

      if (chargesResult.status === "fulfilled") {
        charges = toList(chargesResult.value);
      } else {
        errors.charges = getRequestError(chargesResult.reason);
      }

      if (ticketsResult.status === "fulfilled") {
        tickets = toList(ticketsResult.value);
      } else {
        errors.tickets = getRequestError(ticketsResult.reason);
      }

      if (announcementsResult.status === "fulfilled") {
        announcements = toList(announcementsResult.value);
      } else {
        errors.announcements = getRequestError(announcementsResult.reason);
      }

      setState({
        loading: false,
        charges,
        tickets,
        announcements,
        errors,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const pendingCharges = useMemo(
    () => state.charges.filter(isPendingCharge),
    [state.charges],
  );
  const openTickets = useMemo(
    () => state.tickets.filter(isOpenTicket),
    [state.tickets],
  );
  const latestAnnouncements = useMemo(
    () => sortNewest(state.announcements, ["criadaEm", "criadoEm", "createdAt", "data"]).slice(0, 3),
    [state.announcements],
  );
  const nextCharge = pendingCharges[0];

  async function handlePayment(charge) {
    setPayment({ id: charge.id, message: "", error: "" });

    try {
      const checkout = await chargesService.checkout(charge.id);
      if (!checkout?.url) {
        throw new Error("A API não retornou a URL de pagamento do Stripe.");
      }
      window.location.assign(checkout.url);
    } catch (error) {
      setPayment({
        id: null,
        message: "",
        error: getRequestError(error),
      });
    }
  }

  return (
    <div className="space-y-6 hp-page hp-page--resident">
      <header className="hp-resident-hero">
        <div className="hp-resident-hero__copy">
          <p className="hp-page-eyebrow"><span /> HABITA+ · ÁREA DO MORADOR</p>
          <h1>Olá, {user?.nome || user?.name || "morador"}!</h1>
          <p>Seu condomínio mais perto de você. Acompanhe cobranças, chamados e novidades em um só lugar.</p>
          <div className="hp-resident-hero__meta"><span>⌂ Sua rotina, mais simples</span><span>•</span><span>Informações atualizadas</span></div>
        </div>
        <div className="hp-resident-hero__art" aria-hidden="true">
          <div className="hp-resident-hero__building hp-resident-hero__building--back" />
          <div className="hp-resident-hero__building hp-resident-hero__building--front" />
          <div className="hp-resident-hero__leaf hp-resident-hero__leaf--one" />
          <div className="hp-resident-hero__leaf hp-resident-hero__leaf--two" />
        </div>
      </header>

      <nav className="hp-quick-actions" aria-label="Atalhos rápidos">
        <Link to="/charges" className="hp-quick-action"><span className="hp-quick-action__icon hp-quick-action__icon--mint">▤</span><span><strong>Minhas cobranças</strong><small>Consulte e pague</small></span><b>→</b></Link>
        <Link to="/tickets" className="hp-quick-action"><span className="hp-quick-action__icon hp-quick-action__icon--blue">⚒</span><span><strong>Abrir chamado</strong><small>Peça manutenção</small></span><b>→</b></Link>
        <Link to="/marketplace" className="hp-quick-action"><span className="hp-quick-action__icon hp-quick-action__icon--violet">▦</span><span><strong>Marketplace</strong><small>Veja oportunidades</small></span><b>→</b></Link>
        <Link to="/messages" className="hp-quick-action"><span className="hp-quick-action__icon hp-quick-action__icon--amber">✉</span><span><strong>Mensagens</strong><small>Fale com a comunidade</small></span><b>→</b></Link>
      </nav>

      {payment.message && (
        <Alert variant="success" title="Solicitação registrada">
          {payment.message}
        </Alert>
      )}
      {payment.error && (
        <Alert variant="error" title="Não foi possível solicitar o pagamento">
          {payment.error}
        </Alert>
      )}

      {state.loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <Loading label="Carregando resumo..." variant="skeleton" />
            </Card>
          ))}
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-3 hp-metric-grid" aria-label="Resumo do morador">
          <Card className="border-l-4 border-l-orange-400">
            <p className="text-sm font-medium text-muted">Cobranças pendentes</p>
            <p className="mt-3 text-3xl font-bold text-brand-navy">
              {pendingCharges.length}
            </p>
            <p className="mt-2 text-xs text-muted">
              {pendingCharges.length
                ? formatCurrency(
                    pendingCharges.reduce(
                      (sum, item) => sum + Number(item.valor ?? item.amount ?? 0),
                      0,
                    ),
                  ) + " em aberto"
                : "Nenhum valor em aberto"}
            </p>
          </Card>
          <Card className="border-l-4 border-l-brand-teal">
            <p className="text-sm font-medium text-muted">Chamados abertos</p>
            <p className="mt-3 text-3xl font-bold text-brand-navy">
              {openTickets.length}
            </p>
            <p className="mt-2 text-xs text-muted">Solicitações em acompanhamento</p>
          </Card>
          <Card className="border-l-4 border-l-brand-green">
            <p className="text-sm font-medium text-muted">Anúncios recentes</p>
            <p className="mt-3 text-3xl font-bold text-brand-navy">
              {latestAnnouncements.length}
            </p>
            <p className="mt-2 text-xs text-muted">Comunicados do condomínio</p>
          </Card>
        </section>
      )}

      <section className="grid items-start gap-6 xl:grid-cols-2 hp-dashboard-panels">
        <Card
          title="Cobrança pendente"
          description="Consulte e solicite o pagamento da sua próxima cobrança"
        >
          {state.loading ? (
            <Loading label="Carregando cobranças..." />
          ) : state.errors.charges ? (
            <Alert variant="error" title="Cobranças indisponíveis">
              {state.errors.charges}
            </Alert>
          ) : !nextCharge ? (
            <EmptyState
              title="Tudo em dia!"
              description="Você não possui cobranças pendentes no momento."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-navy">
                    {nextCharge.descricao || nextCharge.description || "Cobrança condominial"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Vencimento: {nextCharge.vencimento || nextCharge.dueDate || "Não informado"}
                  </p>
                </div>
                <Badge status={nextCharge.status} />
              </div>
              <p className="text-2xl font-bold text-brand-navy">
                {formatCurrency(nextCharge.valor ?? nextCharge.amount)}
              </p>
              <Button
                className="w-full sm:w-auto"
                disabled={payment.id === nextCharge.id}
                loading={payment.id === nextCharge.id}
                onClick={() => handlePayment(nextCharge)}
              >
                Pagar cobrança
              </Button>
            </div>
          )}
        </Card>

        <Card
          title="Meus chamados"
          description="Acompanhe as solicitações em andamento"
        >
          {state.loading ? (
            <Loading label="Carregando chamados..." />
          ) : state.errors.tickets ? (
            <Alert variant="error" title="Chamados indisponíveis">
              {state.errors.tickets}
            </Alert>
          ) : openTickets.length === 0 ? (
            <EmptyState
              title="Nenhum chamado aberto"
              description="Quando você abrir uma solicitação, poderá acompanhá-la aqui."
              action={
                <Link
                  to="/tickets"
                  className="text-sm font-semibold text-brand-teal underline underline-offset-4"
                >
                  Ver chamados
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {openTickets.slice(0, 4).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy">
                      {ticket.nome || ticket.title || "Solicitação"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Prioridade: {ticket.prioridade || ticket.priority || "Normal"}
                    </p>
                  </div>
                  <Badge status={ticket.status} />
                </div>
              ))}
              <Link
                to="/tickets"
                className="inline-flex text-sm font-semibold text-brand-teal underline underline-offset-4"
              >
                Ver todos os chamados
              </Link>
            </div>
          )}
        </Card>
      </section>

      <section id="comunicados" className="scroll-mt-6">
        <Card
        title="Últimos anúncios"
        description="Fique por dentro dos comunicados do condomínio"
      >
        {state.loading ? (
          <Loading label="Carregando anúncios..." />
        ) : state.errors.announcements ? (
          <Alert variant="error" title="Anúncios indisponíveis">
            {state.errors.announcements}
          </Alert>
        ) : latestAnnouncements.length === 0 ? (
          <EmptyState
            title="Nenhum anúncio publicado"
            description="Os comunicados mais recentes aparecerão aqui."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {latestAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-lg border border-gray-100 p-4"
              >
                <h3 className="font-semibold text-brand-navy">
                  {announcement.titulo || announcement.title || "Comunicado"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {announcement.conteudo || announcement.descricao || announcement.description || ""}
                </p>
                <p className="mt-3 text-xs text-muted">
                  {announcement.criadaEm || announcement.criadoEm || announcement.createdAt || announcement.data || ""}
                </p>
              </article>
            ))}
          </div>
        )}
        </Card>
      </section>

      {import.meta.env.VITE_USE_MOCKS === "true" && (
        <p className="text-xs text-muted">
          Dados demonstrativos: o modo de mocks está ativado.
        </p>
      )}
    </div>
  );
}

export default ResidentDashboard;
