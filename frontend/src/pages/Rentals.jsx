import { useCallback, useEffect, useState } from "react";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import rentalsService from "../services/rentalsService";
import unitsService from "../services/unitsService";
import { getUserRole } from "../utils/roles";

const fieldClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-mint";
const labelClass = "block text-sm font-medium text-ink";

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function getErrorMessage(error, fallback = "Não foi possível concluir a solicitação.") {
  const raw =
    error?.response?.data?.message ??
    error?.response?.data?.error?.message ??
    error?.message;
  if (Array.isArray(raw)) return raw.filter(Boolean).join(" ");
  return typeof raw === "string" && raw.trim() ? raw : fallback;
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function emptyRentalForm() {
  return {
    unidadeId: "",
    locatarioId: "",
    valorMensal: "",
    inicio: todayISO(),
    fim: "",
  };
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "Sem data final";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function contractStatus(contract) {
  const status = String(contract?.status || "").toUpperCase();
  if (status) return status;
  if (!contract?.fim) return "ATIVO";
  const endDate = new Date(`${String(contract.fim).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
  if (remainingDays < 0) return "ENCERRADO";
  if (remainingDays <= 30) return "A_VENCER";
  return "ATIVO";
}

function StatusBadge({ status }) {
  if (status === "A_VENCER") {
    return <Badge variant="warning" className="font-bold">A vencer</Badge>;
  }
  if (status === "ENCERRADO") return <Badge status="ENCERRADO" />;
  return <Badge status="ATIVO" />;
}

function Rentals() {
  const { user } = useAuth();
  const canManage = ["SINDICO", "ADMIN"].includes(getUserRole(user));
  const [rentals, setRentals] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rentalsError, setRentalsError] = useState("");
  const [unitsError, setUnitsError] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyRentalForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rentalToEnd, setRentalToEnd] = useState(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setRentalsError("");
    setUnitsError("");
    const [rentalsResult, unitsResult] = await Promise.allSettled([
      rentalsService.list({ page: 1, limit: 100 }),
      unitsService.listAvailable(),
    ]);

    if (rentalsResult.status === "fulfilled") {
      setRentals(toList(rentalsResult.value));
    } else {
      setRentals([]);
      setRentalsError(getErrorMessage(rentalsResult.reason, "Não foi possível carregar os contratos."));
    }

    if (unitsResult.status === "fulfilled") {
      setAvailableUnits(toList(unitsResult.value));
    } else {
      setAvailableUnits([]);
      setUnitsError(getErrorMessage(unitsResult.reason, "Não foi possível carregar as unidades disponíveis."));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Agenda a carga após a execução do efeito para evitar atualização
    // síncrona de estado durante a montagem do componente.
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadData]);

  function openCreate() {
    setForm(emptyRentalForm());
    setFormError("");
    setIsCreateOpen(true);
  }

  async function createRental(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      unidadeId: Number(form.unidadeId),
      locatarioId: Number(form.locatarioId),
      valorMensal: Number(form.valorMensal),
      inicio: form.inicio,
      ...(form.fim ? { fim: form.fim } : {}),
    };

    try {
      await rentalsService.create(payload);
      setIsCreateOpen(false);
      setNotice("Contrato de locação criado com sucesso.");
      await loadData();
    } catch (requestError) {
      setFormError(
        getErrorMessage(
          requestError,
          "Não foi possível criar o contrato. Verifique a unidade, o morador e as datas.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function endRental() {
    if (!rentalToEnd) return;
    setEnding(true);
    setEndError("");
    try {
      await rentalsService.end(rentalToEnd.id, { fim: todayISO() });
      setRentalToEnd(null);
      setNotice("Contrato encerrado. A unidade foi liberada se não houver outro contrato ativo.");
      await loadData();
    } catch (requestError) {
      setEndError(getErrorMessage(requestError, "Não foi possível encerrar o contrato."));
    } finally {
      setEnding(false);
    }
  }

  function getUnitLabel(contract) {
    const unit = contract.unidade || contract.unit;
    if (unit) return `Bloco ${unit.bloco || "—"} · Apartamento ${unit.numero || unit.id}`;
    return contract.unidadeId || contract.undId || "Unidade não informada";
  }

  function getResidentLabel(contract) {
    const resident = contract.locatario || contract.morador || contract.resident;
    if (resident) return resident.nome || resident.name || `Usuário ${resident.id}`;
    return contract.locatarioId || contract.moradorId || "Morador não informado";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
            Habita+ · Administração
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Contratos de locação</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Consulte contratos, cadastre uma nova locação e encerre contratos existentes.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Novo contrato</Button>}
      </header>

      {notice && <Alert variant="success" title="Operação concluída" onClose={() => setNotice("")}>{notice}</Alert>}
      {unitsError && <Alert variant="warning" title="Disponibilidade indisponível">{unitsError}</Alert>}

      <Card title="Lista de contratos" description="Contratos ativos, próximos do vencimento e encerrados.">
        {loading ? (
          <Loading label="Carregando contratos..." />
        ) : rentalsError ? (
          <div className="space-y-4">
            <Alert variant="error" title="Contratos indisponíveis">{rentalsError}</Alert>
            <Button variant="secondary" onClick={loadData}>Tentar novamente</Button>
          </div>
        ) : rentals.length === 0 ? (
          <EmptyState title="Nenhum contrato cadastrado" description="Os contratos de locação aparecerão aqui quando forem criados." action={canManage ? <Button onClick={openCreate}>Criar primeiro contrato</Button> : null} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-3 font-semibold">Unidade</th>
                  <th className="px-3 py-3 font-semibold">Morador</th>
                  <th className="px-3 py-3 font-semibold">Valor mensal</th>
                  <th className="px-3 py-3 font-semibold">Período</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  {canManage && <th className="px-3 py-3 font-semibold">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {rentals.map((contract) => {
                  const status = contractStatus(contract);
                  const isDueSoon = status === "A_VENCER";
                  return (
                    <tr key={contract.id} className={`border-b border-gray-100 last:border-0 ${isDueSoon ? "bg-orange-50/70" : ""}`}>
                      <td className="px-3 py-4 font-semibold text-brand-navy">{getUnitLabel(contract)}</td>
                      <td className="px-3 py-4 text-ink">{getResidentLabel(contract)}</td>
                      <td className="px-3 py-4 font-semibold text-brand-navy">{formatCurrency(contract.valorMensal ?? contract.valorAluguel)}</td>
                      <td className="px-3 py-4 text-muted">{formatDate(contract.inicio)} – {formatDate(contract.fim)}</td>
                      <td className="px-3 py-4"><StatusBadge status={status} /></td>
                      {canManage && (
                        <td className="px-3 py-4">
                          {status !== "ENCERRADO" ? (
                            <Button size="sm" variant="danger" onClick={() => { setRentalToEnd(contract); setEndError(""); }}>Encerrar</Button>
                          ) : <span className="text-xs text-muted">Sem ações</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Criar contrato de locação" size="lg" footer={null}>
        <form className="space-y-4" onSubmit={createRental}>
          {availableUnits.length === 0 && !unitsError ? (
            <Alert variant="warning" title="Nenhuma unidade disponível">Libere uma unidade antes de criar um contrato de locação.</Alert>
          ) : (
            <div>
              <label className={labelClass} htmlFor="rental-unit">Unidade disponível</label>
              <select id="rental-unit" className={fieldClass} required value={form.unidadeId} onChange={(event) => setForm({ ...form, unidadeId: event.target.value })}>
                <option value="">Selecione uma unidade</option>
                {availableUnits.map((unit) => <option key={unit.id} value={unit.id}>Bloco {unit.bloco} · Apartamento {unit.numero} — {formatCurrency(unit.valorAluguelSugerido)}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass} htmlFor="rental-resident">ID do morador (locatário)</label><input id="rental-resident" className={fieldClass} type="number" min="1" step="1" required value={form.locatarioId} onChange={(event) => setForm({ ...form, locatarioId: event.target.value })} placeholder="Ex.: 1" /><p className="mt-1 text-xs text-muted">Informe o ID numérico de um usuário cadastrado com perfil de morador.</p></div>
            <div><label className={labelClass} htmlFor="rental-value">Valor mensal (R$)</label><input id="rental-value" className={fieldClass} type="number" min="0" step="1" required value={form.valorMensal} onChange={(event) => setForm({ ...form, valorMensal: event.target.value })} /></div>
            <div><label className={labelClass} htmlFor="rental-start">Data de início</label><input id="rental-start" className={fieldClass} type="date" required value={form.inicio} onChange={(event) => setForm({ ...form, inicio: event.target.value })} /></div>
            <div><label className={labelClass} htmlFor="rental-end">Data de término (opcional)</label><input id="rental-end" className={fieldClass} type="date" min={form.inicio || undefined} value={form.fim} onChange={(event) => setForm({ ...form, fim: event.target.value })} /></div>
          </div>
          {formError && <Alert variant="error" title="Não foi possível criar o contrato">{formError}</Alert>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} disabled={availableUnits.length === 0}>Criar contrato</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(rentalToEnd)} onClose={() => setRentalToEnd(null)} title="Encerrar contrato" size="md" footer={null}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">Confirme o encerramento do contrato de {getUnitLabel(rentalToEnd || {})}. A data de encerramento será hoje.</p>
          {endError && <Alert variant="error" title="Não foi possível encerrar">{endError}</Alert>}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setRentalToEnd(null)}>Cancelar</Button>
            <Button variant="danger" loading={ending} onClick={endRental}>Confirmar encerramento</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Rentals;
