import { useEffect, useState } from "react";
import Alert from "../components/Alert";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import Table from "../components/Table";

function toRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.recommendations)) return payload.recommendations;
  if (payload?.data && typeof payload.data === "object") return [payload.data];
  if (payload && typeof payload === "object") return [payload];
  return [];
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanizeLabel(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function ModulePage({ title, description, service, method = "list" }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await service[method]();
        if (active) setRecords(toRecords(result));
      } catch (requestError) {
        const message =
          requestError?.response?.data?.error?.message ||
          requestError?.response?.data?.message ||
          "Não foi possível carregar os dados. Confira o modo de mocks ou a disponibilidade do endpoint da API.";

        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [service, method]);

  const firstRecord = records[0] || {};
  const columns = Object.keys(firstRecord).map((key) => ({
    key,
    label: humanizeLabel(key),
    render: (record) => displayValue(record[key]),
  }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
          Habita+ · Módulo
        </p>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {description || "Área demonstrativa conectada à camada de serviços da API."}
        </p>
      </header>

      {error && (
        <Alert variant="error" title="Não foi possível carregar o módulo">
          {error}
        </Alert>
      )}

      <Card title="Dados do módulo" description="Resposta recebida do serviço configurado">
        {loading ? (
          <Loading label="Carregando dados..." />
        ) : records.length === 0 ? (
          <EmptyState
            title="Nenhum registro disponível"
            description="Ainda não há dados para mostrar neste módulo."
          />
        ) : (
          <Table columns={columns} data={records} emptyMessage="Nenhum registro encontrado." />
        )}
      </Card>
    </div>
  );
}

export default ModulePage;
