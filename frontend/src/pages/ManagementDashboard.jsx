import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import dashboardService from "../services/dashboardService";

function unwrapObject(payload) {
  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload || {};
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function formatMonth(value) {
  if (!value) return "—";

  const normalized = /^\d{4}-\d{2}$/.test(String(value))
    ? `${value}-01T12:00:00`
    : value;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(date).replace(".", "");
}

function getMetric(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return Number(source[key]);
    }
  }

  return null;
}

function buildChartData(dashboard, prediction) {
  const history =
    dashboard?.monthlyHistory ||
    dashboard?.historicoMensal ||
    dashboard?.history ||
    [];

  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const historical = history.map((item) => ({
    month: formatMonth(item.month || item.mes || item.competencia),
    historical: Number(
      item.amount ?? item.total ?? item.valor ?? item.despesa ?? 0,
    ),
    forecast: null,
  }));

  const predictionItems = Array.isArray(prediction?.predictions)
    ? prediction.predictions
    : [];

  const predictedValue =
    prediction?.predicaoTotal ??
    prediction?.predictedAmount ??
    prediction?.total ??
    prediction?.amount ??
    (predictionItems.length
      ? predictionItems.reduce(
          (sum, item) =>
            sum + Number(item.predictedAmount ?? item.amount ?? item.valor ?? 0),
          0,
        )
      : null);

  if (predictedValue === null || !Number.isFinite(Number(predictedValue))) {
    return historical;
  }

  const forecastMonth =
    prediction?.mesDesejado ||
    prediction?.month ||
    prediction?.targetMonth;

  if (historical.length > 0) {
    historical[historical.length - 1].forecast =
      historical[historical.length - 1].historical;
  }

  historical.push({
    month: formatMonth(forecastMonth),
    historical: null,
    forecast: Number(predictedValue),
  });

  return historical;
}

function MetricCard({ title, value, subtitle, accent = "teal" }) {
  const accentStyles = {
    teal: "border-l-brand-teal",
    green: "border-l-brand-green",
    navy: "border-l-brand-navy",
    warning: "border-l-orange-400",
  };

  return (
    <Card className={`border-l-4 ${accentStyles[accent] || accentStyles.teal}`}>
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
        {value}
      </p>
      {subtitle && <p className="mt-2 text-xs text-muted">{subtitle}</p>}
    </Card>
  );
}

function ExpenseChart({ data, forecastError, loading }) {
  return (
    <Card
      title="Despesas e previsão"
      description="Histórico mensal e estimativa para o próximo mês"
    >
      {loading ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loading label="Carregando histórico e previsão..." />
        </div>
      ) : forecastError ? (
        <div className="space-y-4">
          <Alert variant="warning" title="Previsão indisponível">
            Não foi possível carregar a previsão do próximo mês. Os demais
            dados do painel continuam disponíveis.
          </Alert>
          {data.length > 0 ? (
            <Chart data={data} />
          ) : (
            <EmptyState
              title="Histórico indisponível"
              description="Não há histórico mensal para exibir."
            />
          )}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="Sem histórico financeiro"
          description="Ainda não há dados mensais suficientes para montar o gráfico."
        />
      ) : (
        <Chart data={data} />
      )}
    </Card>
  );
}

function Chart({ data }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de despesas mensais e previsão">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#687280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={76}
            tickFormatter={formatCompactCurrency}
            tick={{ fill: "#687280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(value),
              name === "historical" ? "Despesas realizadas" : "Previsão",
            ]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E5E7EB",
              boxShadow: "0 8px 24px rgba(18, 65, 112, 0.08)",
            }}
          />
          <Legend
            formatter={(value) =>
              value === "historical" ? "Despesas realizadas" : "Previsão"
            }
          />
          <Bar
            dataKey="historical"
            name="historical"
            fill="#215B63"
            radius={[5, 5, 0, 0]}
            maxBarSize={42}
          />
          <Line
            dataKey="forecast"
            name="forecast"
            type="monotone"
            stroke="#67C090"
            strokeWidth={3}
            strokeDasharray="6 4"
            dot={{ r: 4, fill: "#67C090", strokeWidth: 2, stroke: "#FFFFFF" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ManagementDashboard() {
  const [finance, setFinance] = useState({
    loading: true,
    data: null,
    error: "",
  });
  const [prediction, setPrediction] = useState({
    loading: true,
    data: null,
    error: "",
  });

  useEffect(() => {
    let active = true;

    dashboardService
      .getFinanceDashboard()
      .then((result) => {
        if (active) {
          setFinance({ loading: false, data: unwrapObject(result), error: "" });
        }
      })
      .catch((error) => {
        if (active) {
          setFinance({
            loading: false,
            data: null,
            error:
              error?.response?.data?.message ||
              error?.response?.data?.error?.message ||
              "Não foi possível carregar os indicadores financeiros.",
          });
        }
      });

    dashboardService
      .getExpensePrediction()
      .then((result) => {
        if (active) {
          setPrediction({
            loading: false,
            data: unwrapObject(result),
            error: "",
          });
        }
      })
      .catch((error) => {
        if (active) {
          setPrediction({
            loading: false,
            data: null,
            error:
              error?.response?.data?.message ||
              error?.response?.data?.error?.message ||
              "O serviço de previsão não está disponível neste momento.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = finance.data?.metrics || finance.data?.indicadores || finance.data || {};
  const delinquency =
    metrics.delinquency || metrics.inadimplencia || metrics.overdue || {};
  const revenue = getMetric(metrics, ["revenue", "receita", "totalReceita"]);
  const expenses = getMetric(metrics, ["expenses", "despesas", "totalDespesas"]);
  const balance = getMetric(metrics, ["balance", "saldo", "saldoMes"]);
  const delinquencyAmount =
    typeof delinquency === "number"
      ? delinquency
      : getMetric(delinquency, ["amount", "valor", "total"]);
  const delinquencyCount =
    typeof delinquency === "object"
      ? getMetric(delinquency, ["count", "quantidade", "totalCobrancas"])
      : null;
  const delinquencyRate =
    typeof delinquency === "object"
      ? getMetric(delinquency, ["rate", "percentage", "percentual", "taxa"])
      : null;

  const alertsSource = finance.data?.alerts || finance.data?.alertas || [];
  const alerts = Array.isArray(alertsSource) ? alertsSource : [];

  const chartData = buildChartData(finance.data, prediction.data);

  const monthLabel = formatMonth(
    finance.data?.month || finance.data?.mes || finance.data?.competencia,
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
            Habita+ · Painel administrativo
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">
            Visão geral do condomínio
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Acompanhe os indicadores financeiros, a previsão de despesas e os
            alertas mais recentes.
          </p>
        </div>
        {monthLabel !== "—" && (
          <Badge variant="info">Referência: {monthLabel}</Badge>
        )}
      </header>

      {finance.error && (
        <Alert variant="error" title="Não foi possível carregar o painel financeiro">
          {finance.error}
        </Alert>
      )}

      {finance.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item}>
              <Loading label="Carregando indicador..." variant="skeleton" />
            </Card>
          ))}
        </div>
      ) : finance.data ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores do mês">
          <MetricCard
            title="Receita do mês"
            value={formatCurrency(revenue)}
            subtitle="Total recebido no período"
            accent="green"
          />
          <MetricCard
            title="Despesa do mês"
            value={formatCurrency(expenses)}
            subtitle="Total de despesas no período"
            accent="navy"
          />
          <MetricCard
            title="Saldo do mês"
            value={formatCurrency(balance)}
            subtitle="Receita menos despesas"
            accent="teal"
          />
          <MetricCard
            title="Inadimplência"
            value={formatCurrency(delinquencyAmount)}
            subtitle={[
              delinquencyCount !== null ? `${delinquencyCount} cobranças` : null,
              delinquencyRate !== null ? `${delinquencyRate}% do total` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Valores em aberto"}
            accent="warning"
          />
        </section>
      ) : (
        <EmptyState
          title="Indicadores indisponíveis"
          description="Não foi possível obter os valores financeiros. Tente novamente mais tarde."
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <ExpenseChart
          data={chartData}
          forecastError={prediction.error}
          loading={prediction.loading}
        />

        <Card
          title="Últimos alertas"
          description="Avisos recentes da administração"
        >
          {finance.loading ? (
            <Loading label="Carregando alertas..." />
          ) : finance.error ? (
            <EmptyState
              title="Alertas indisponíveis"
              description="Não foi possível carregar os alertas."
            />
          ) : alerts.length === 0 ? (
            <EmptyState
              title="Nenhum alerta recente"
              description="Quando houver novos avisos, eles aparecerão aqui."
            />
          ) : (
            <ul className="space-y-3">
              {alerts.slice(0, 5).map((item, index) => (
                <li
                  key={item.id || `${item.title || item.titulo}-${index}`}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-navy">
                      {item.title || item.titulo || "Alerta"}
                    </p>
                    <Badge
                      variant={
                        item.type === "error" || item.tipo === "ERRO"
                          ? "error"
                          : item.type === "warning" || item.tipo === "AVISO"
                            ? "warning"
                            : "info"
                      }
                    >
                      {item.label || item.tipo || item.type || "Aviso"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {item.description || item.descricao || item.message || ""}
                  </p>
                  {(item.createdAt || item.criadoEm || item.data) && (
                    <p className="mt-2 text-xs text-muted">
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(item.createdAt || item.criadoEm || item.data),
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
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

export default ManagementDashboard;
