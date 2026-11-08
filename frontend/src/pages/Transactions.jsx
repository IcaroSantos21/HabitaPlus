import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { useAuth } from "../hooks/useAuth";
import transactionsService from "../services/transactionsService";
import { getUserRole } from "../utils/roles";

const expenseCategories = [
  "água",
  "energia",
  "limpeza",
  "manutenção",
  "salários",
  "outros",
];
const revenueCategories = ["condomínio", "locação", "multa", "rendimento", "outros"];

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function monthRangeLabel(value) {
  if (!value) return "—";
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

function emptyForm(month) {
  return {
    tipo: "DESPESA",
    categoria: "energia",
    valor: "",
    competencia: month,
    data: today(),
    descricao: "",
  };
}

function Transactions() {
  const { user } = useAuth();
  const isManager = ["SINDICO", "ADMIN"].includes(getUserRole(user));

  const [competencia, setCompetencia] = useState(currentMonth);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(currentMonth()));

  const categories = form.tipo === "DESPESA" ? expenseCategories : revenueCategories;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [listResult, summaryResult] = await Promise.allSettled([
      transactionsService.list({
        competencia,
        pagina: 1,
        limite: 100,
      }),
      transactionsService.monthlySummary({
        from: competencia,
        to: competencia,
      }),
    ]);

    if (listResult.status === "fulfilled") {
      setTransactions(toList(listResult.value));
    } else {
      setTransactions([]);
      setError(errorMessage(listResult.reason, "Não foi possível carregar as transações."));
    }

    if (summaryResult.status === "fulfilled") {
      setSummary(toList(summaryResult.value)[0] || null);
    } else {
      setSummary(null);
      setError((current) =>
        current || errorMessage(summaryResult.reason, "Não foi possível carregar o resumo mensal."),
      );
    }
    setLoading(false);
  }, [competencia]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const totals = useMemo(() => {
    const receitas = Number(summary?.receitas ?? 0);
    const despesas = Number(summary?.despesas ?? 0);
    const saldo = Number(summary?.saldo ?? receitas - despesas);
    return { receitas, despesas, saldo };
  }, [summary]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "tipo"
        ? { categoria: value === "DESPESA" ? expenseCategories[1] : revenueCategories[0] }
        : {}),
    }));
  }

  async function createTransaction(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");

    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      valor: Number(form.valor),
      competencia: form.competencia,
      data: form.data,
      ...(form.descricao.trim() ? { descricao: form.descricao.trim() } : {}),
    };

    try {
      await transactionsService.create(payload);
      setNotice("Lançamento financeiro registrado com sucesso.");
      setForm(emptyForm(competencia));
      await loadData();
    } catch (requestError) {
      setFormError(
        errorMessage(
          requestError,
          "Não foi possível registrar o lançamento. Confira os dados informados.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isManager) {
    return (
      <Card title="Acesso restrito">
        <Alert variant="warning" title="Área administrativa">
          Apenas síndico e administrador podem consultar e lançar transações financeiras.
        </Alert>
        <Link to="/morador" className="mt-4 inline-block text-sm font-semibold text-brand-teal underline">
          Voltar ao painel
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
          Habita+ · Administração
        </p>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy">Receitas e despesas</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Registre movimentações e consulte o resultado financeiro por competência.
        </p>
      </header>

      {notice && <Alert variant="success" title="Lançamento salvo" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="error" title="Resumo financeiro indisponível">{error}</Alert>}

      <Card title="Competência" description="A tabela e o resumo são atualizados conforme o mês selecionado.">
        <label className="block max-w-xs text-sm font-medium text-ink">
          Filtrar por mês
          <input
            type="month"
            value={competencia}
            onChange={(event) => {
              setCompetencia(event.target.value);
              setForm((current) => ({ ...current, competencia: event.target.value }));
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
          />
        </label>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Card key={item}><Loading label="Carregando resumo..." variant="skeleton" /></Card>)}
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-3" aria-label="Resumo financeiro mensal">
          <Card className="border-l-4 border-l-brand-green">
            <p className="text-sm font-medium text-muted">Receitas</p>
            <p className="mt-2 text-2xl font-bold text-brand-navy">{currency(totals.receitas)}</p>
          </Card>
          <Card className="border-l-4 border-l-red-400">
            <p className="text-sm font-medium text-muted">Despesas</p>
            <p className="mt-2 text-2xl font-bold text-brand-navy">{currency(totals.despesas)}</p>
          </Card>
          <Card className="border-l-4 border-l-brand-teal">
            <p className="text-sm font-medium text-muted">Saldo</p>
            <p className="mt-2 text-2xl font-bold text-brand-navy">{currency(totals.saldo)}</p>
          </Card>
        </section>
      )}

      <Card title="Novo lançamento" description="Os campos seguem as validações da API financeira.">
        <form onSubmit={createTransaction} className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Tipo
            <select
              value={form.tipo}
              onChange={(event) => updateForm("tipo", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
            >
              <option value="DESPESA">Despesa</option>
              <option value="RECEITA">Receita</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            Categoria
            <select
              value={form.categoria}
              onChange={(event) => updateForm("categoria", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
              required
            >
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            Valor (R$)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.valor}
              onChange={(event) => updateForm("valor", event.target.value)}
              placeholder="Ex.: 850,00"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Data
            <input
              type="date"
              value={form.data}
              onChange={(event) => updateForm("data", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Competência
            <input
              type="month"
              value={form.competencia}
              onChange={(event) => updateForm("competencia", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink md:col-span-2">
            Descrição
            <input
              type="text"
              maxLength={500}
              value={form.descricao}
              onChange={(event) => updateForm("descricao", event.target.value)}
              placeholder="Descreva o lançamento (opcional)"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-mint"
            />
          </label>
          {formError && <div className="md:col-span-2"><Alert variant="error" title="Não foi possível salvar">{formError}</Alert></div>}
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>Registrar lançamento</Button>
          </div>
        </form>
      </Card>

      <Card
        title={`Movimentações de ${monthRangeLabel(competencia)}`}
        description="Receitas e despesas cadastradas nesta competência."
      >
        {loading ? (
          <Loading label="Carregando movimentações..." />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação encontrada"
            description="Não existem lançamentos para o mês selecionado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">{transaction.data || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={transaction.tipo === "RECEITA" ? "success" : "error"}>
                        {transaction.tipo === "RECEITA" ? "Receita" : "Despesa"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">{transaction.categoria}</td>
                    <td className="px-4 py-3">{transaction.descricao || "—"}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${transaction.tipo === "RECEITA" ? "text-brand-teal" : "text-danger"}`}>
                      {transaction.tipo === "RECEITA" ? "+" : "−"} {currency(transaction.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Transactions;
