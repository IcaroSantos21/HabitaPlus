import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { useAuth } from "../hooks/useAuth";
import chargesService from "../services/chargesService";
import { getUserRole } from "../utils/roles";

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function errorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ??
    error?.response?.data?.error?.message ??
    error?.message;
  if (Array.isArray(message)) return message.filter(Boolean).join(" ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("pt-BR").format(date);
}

function competenceLabel(value) {
  if (!value) return "—";
  const [year, month] = String(value).split("-");
  return `${month}/${year}`;
}

function chargeDescription(charge) {
  return (
    charge.descricao ||
    `Taxa condominial · ${competenceLabel(charge.competencia)}`
  );
}

function unitLabel(charge) {
  const unit = charge.unidade;
  if (!unit) return "Unidade não informada";
  return `Bloco ${unit.bloco || "—"} · Unidade ${unit.numero || unit.id}`;
}

function Charges() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getUserRole(user);
  const isManager = ["SINDICO", "ADMIN"].includes(role);

  const [competencia, setCompetencia] = useState(currentMonth);
  const [statusFilter, setStatusFilter] = useState("TODAS");
  const [managerView, setManagerView] = useState("all");
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkoutId, setCheckoutId] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadCharges = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pagina: 1,
        limite: 100,
        ...(competencia ? { competencia } : {}),
        ...(managerView === "overdue"
          ? { status: "ATRASADA" }
          : statusFilter !== "TODAS"
            ? { status: statusFilter }
            : {}),
      };
      const response = isManager
        ? await chargesService.list(params)
        : await chargesService.listMine(params);
      setCharges(toList(response));
    } catch (requestError) {
      setCharges([]);
      setError(
        errorMessage(
          requestError,
          "Não foi possível carregar as cobranças.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [competencia, isManager, managerView, statusFilter]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadCharges();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadCharges]);

  const overdueSummary = useMemo(() => {
    const overdue = charges.filter((charge) => charge.status === "ATRASADA");
    return {
      count: overdue.length,
      amount: overdue.reduce((sum, charge) => sum + Number(charge.valor || 0), 0),
    };
  }, [charges]);

  async function handleGenerate() {
    setGenerating(true);
    setNotice("");
    setError("");
    try {
      const result = await chargesService.generate(competencia);
      setNotice(
        `Geração concluída: ${result.criadas ?? 0} cobrança(s) criada(s); ${result.jaExistentes ?? 0} já existiam.`,
      );
      await loadCharges();
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Não foi possível gerar as cobranças desta competência.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCheckout(charge) {
    setCheckoutId(charge.id);
    setCheckoutError("");
    try {
      const checkout = await chargesService.checkout(charge.id);
      if (!checkout?.url) {
        throw new Error("A API não retornou a URL de pagamento do Stripe.");
      }
      const checkoutUrl = new URL(checkout.url, window.location.origin);
      const isLocalMockCheckout =
        checkoutUrl.origin === window.location.origin &&
        checkoutUrl.searchParams.get("mock") === "1";

      if (isLocalMockCheckout) {
        // Mantém a navegação dentro do React para preservar o estado em memória do MSW.
        navigate(`${checkoutUrl.pathname}${checkoutUrl.search}${checkoutUrl.hash}`);
        return;
      }

      // No Stripe real, a navegação externa precisa sair da aplicação.
      window.location.assign(checkoutUrl.toString());
    } catch (requestError) {
      setCheckoutError(
        errorMessage(
          requestError,
          "Não foi possível iniciar o pagamento. Tente novamente.",
        ),
      );
      setCheckoutId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
            Habita+ · Financeiro
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">
            {isManager ? "Cobranças e inadimplência" : "Minhas cobranças"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {isManager
              ? "Consulte as cobranças do condomínio, acompanhe atrasos e gere a competência mensal."
              : "Consulte suas cobranças e pague em ambiente seguro do Stripe."}
          </p>
        </div>
        {isManager && (
          <Link
            to="/transactions"
            className="text-sm font-semibold text-brand-teal underline underline-offset-4"
          >
            Ir para receitas e despesas
          </Link>
        )}
      </header>

      {notice && (
        <Alert variant="success" title="Operação concluída" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Não foi possível carregar as cobranças">
          {error}
        </Alert>
      )}
      {checkoutError && (
        <Alert variant="error" title="Falha ao iniciar pagamento">
          {checkoutError}
        </Alert>
      )}

      <Card title="Filtros" description="Selecione a competência e, se desejar, o status.">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-medium text-ink">
            Competência
            <input
              type="month"
              value={competencia}
              onChange={(event) => setCompetencia(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
            />
          </label>
          {managerView === "all" && (
            <label className="block text-sm font-medium text-ink">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
              >
                <option value="TODAS">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGA">Paga</option>
                <option value="ATRASADA">Atrasada</option>
              </select>
            </label>
          )}
          {isManager && (
            <Button onClick={handleGenerate} loading={generating}>
              Gerar cobranças do mês
            </Button>
          )}
        </div>
      </Card>

      {isManager && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm font-medium text-muted">Cobranças listadas</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{charges.length}</p>
            </Card>
            <Card className="border-l-4 border-l-orange-400">
              <p className="text-sm font-medium text-muted">Inadimplentes</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{overdueSummary.count}</p>
            </Card>
            <Card className="border-l-4 border-l-red-400">
              <p className="text-sm font-medium text-muted">Total em atraso</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{currency(overdueSummary.amount)}</p>
            </Card>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Visualização de cobranças">
            <Button
              size="sm"
              variant={managerView === "all" ? "primary" : "secondary"}
              onClick={() => setManagerView("all")}
            >
              Todas as cobranças
            </Button>
            <Button
              size="sm"
              variant={managerView === "overdue" ? "primary" : "secondary"}
              onClick={() => setManagerView("overdue")}
            >
              Inadimplência
            </Button>
          </div>
        </>
      )}

      <Card
        title={managerView === "overdue" && isManager ? "Cobranças em atraso" : "Lista de cobranças"}
        description={
          isManager
            ? "Os dados respeitam a competência e os filtros selecionados."
            : "As cobranças exibidas pertencem às unidades vinculadas à sua conta."
        }
      >
        {loading ? (
          <Loading label="Carregando cobranças..." />
        ) : error ? (
          <EmptyState
            title="Cobranças indisponíveis"
            description="Verifique sua conexão e tente novamente."
            action={<Button variant="secondary" onClick={loadCharges}>Tentar novamente</Button>}
          />
        ) : charges.length === 0 ? (
          <EmptyState
            title={managerView === "overdue" ? "Nenhuma cobrança em atraso" : "Nenhuma cobrança encontrada"}
            description="Não há registros para a competência e os filtros selecionados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Competência</th>
                  {isManager && <th className="px-4 py-3">Unidade</th>}
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  {!isManager && <th className="px-4 py-3">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {charges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">{competenceLabel(charge.competencia)}</td>
                    {isManager && <td className="whitespace-nowrap px-4 py-3">{unitLabel(charge)}</td>}
                    <td className="px-4 py-3">{chargeDescription(charge)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateLabel(charge.vencimento)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{currency(charge.valor)}</td>
                    <td className="px-4 py-3"><Badge status={charge.status} /></td>
                    {!isManager && (
                      <td className="px-4 py-3">
                        {charge.status === "PAGA" ? (
                          <span className="text-xs text-muted">Pagamento confirmado</span>
                        ) : (
                          <Button
                            size="sm"
                            loading={checkoutId === charge.id}
                            disabled={checkoutId !== null}
                            onClick={() => handleCheckout(charge)}
                          >
                            Pagar
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {!isManager && (
        <p className="text-xs leading-5 text-muted">
          A confirmação do pagamento depende da notificação segura do Stripe para o backend. A página de retorno apenas consulta o status atualizado.
        </p>
      )}
    </div>
  );
}

export default Charges;
