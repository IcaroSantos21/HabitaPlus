import { useEffect, useState } from "react";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Input from "../components/Input";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import Select from "../components/Select";
import Textarea from "../components/Textarea";
import { useAuth } from "../hooks/useAuth";
import ticketsService from "../services/ticketsService";
import unitsService from "../services/unitsService";
import { getUserRole } from "../utils/roles";

const STATUS_OPTIONS = [
  { value: "TODOS", label: "Todos os status" },
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "ENCERRADO", label: "Encerrado" },
];

const CATEGORY_OPTIONS = [
  { value: "eletrica", label: "Elétrica" },
  { value: "hidraulica", label: "Hidráulica" },
  { value: "estrutural", label: "Estrutural" },
  { value: "limpeza", label: "Limpeza" },
  { value: "seguranca", label: "Segurança" },
  { value: "outros", label: "Outros" },
];

const LOCATION_OPTIONS = [
  { value: "UNIDADE", label: "Unidade" },
  { value: "AREA_COMUM", label: "Área comum" },
];

const EMPTY_FORM = {
  localTipo: "UNIDADE",
  unidadeId: "",
  areaComum: "",
  categoria: "eletrica",
  equipamento: "",
  descricao: "",
};

function toRecords(payload) {
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
  if (typeof raw === "string" && raw.trim()) return raw;
  return fallback;
}

function normalizeLabel(value) {
  return String(value || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusPresentation(status) {
  if (status === "ABERTO") return { label: "Aberto", variant: "warning", next: "EM_ANDAMENTO", action: "Iniciar atendimento" };
  if (status === "EM_ANDAMENTO") return { label: "Em andamento", variant: "info", next: "ENCERRADO", action: "Encerrar chamado" };
  return { label: "Encerrado", variant: "closed", next: null, action: null };
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getLocationLabel(ticket) {
  if (ticket?.unidade) {
    const { bloco, numero, id } = ticket.unidade;
    return `Bloco ${bloco || "—"} · Unidade ${numero || id}`;
  }
  return ticket?.areaComum ? `Área comum · ${normalizeLabel(ticket.areaComum)}` : "Local não informado";
}

function TicketStatus({ status }) {
  const presentation = statusPresentation(status);
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}

function TicketCard({ ticket, onOpen }) {
  return (
    <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand-green/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-brand-navy">Chamado #{ticket.id}</p>
            <TicketStatus status={ticket.status} />
          </div>
          <p className="mt-2 text-sm font-medium text-ink">{normalizeLabel(ticket.equipamento)} · {normalizeLabel(ticket.categoria)}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{ticket.descricao}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{getLocationLabel(ticket)}</span>
            <span>Aberto em {formatDate(ticket.abertoEm)}</span>
            {ticket.usuario?.nome && <span>Solicitante: {ticket.usuario.nome}</span>}
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onOpen(ticket)}>Ver detalhes</Button>
      </div>
    </article>
  );
}

function Tickets() {
  const { user } = useAuth();
  const role = getUserRole(user);
  const canManage = role === "SINDICO" || role === "ADMIN";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState("");

  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [historyFilters, setHistoryFilters] = useState({ equipamento: "", area: "" });
  const [historyResults, setHistoryResults] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historySearched, setHistorySearched] = useState(false);

  useEffect(() => {
    let active = true;
    const params = { pagina: 1, limite: 100 };
    if (statusFilter !== "TODOS") params.status = statusFilter;

    ticketsService.list(params)
      .then((result) => {
        if (active) {
          setTickets(toRecords(result));
          setListError("");
        }
      })
      .catch((error) => {
        if (active) setListError(getErrorMessage(error, "Não foi possível carregar os chamados."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [statusFilter, reloadKey]);

  useEffect(() => {
    let active = true;
    unitsService.list({ page: 1, limit: 100 })
      .then((result) => {
        if (active) setUnits(toRecords(result));
      })
      .catch((error) => {
        if (active) setUnitsError(getErrorMessage(error, "Não foi possível carregar as unidades."));
      })
      .finally(() => {
        if (active) setUnitsLoading(false);
      });
    return () => { active = false; };
  }, []);

  function handleStatusFilterChange(event) {
    setLoading(true);
    setListError("");
    setStatusFilter(event.target.value);
  }

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setFormError("");
    setIsCreateOpen(true);
  }

  async function createTicket(event) {
    event.preventDefault();
    setFormError("");
    if (form.localTipo === "UNIDADE" && !form.unidadeId) {
      setFormError("Selecione a unidade relacionada ao chamado.");
      return;
    }
    if (form.localTipo === "AREA_COMUM" && !form.areaComum.trim()) {
      setFormError("Informe a área comum relacionada ao chamado.");
      return;
    }

    const payload = {
      categoria: form.categoria,
      equipamento: form.equipamento.trim(),
      descricao: form.descricao.trim(),
      ...(form.localTipo === "UNIDADE"
        ? { unidadeId: Number(form.unidadeId) }
        : { areaComum: form.areaComum.trim() }),
    };

    setSaving(true);
    try {
      await ticketsService.create(payload);
      setIsCreateOpen(false);
      setNotice("Chamado aberto com sucesso.");
      setLoading(true);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, "Não foi possível abrir o chamado."));
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus() {
    if (!selectedTicket) return;
    const transition = statusPresentation(selectedTicket.status);
    if (!transition.next) return;
    setUpdatingStatus(true);
    setStatusError("");
    try {
      const updated = await ticketsService.updateStatus(selectedTicket.id, { status: transition.next });
      setSelectedTicket(updated);
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      setNotice(`Status do chamado #${updated.id} atualizado.`);
      setReloadKey((value) => value + 1);
    } catch (error) {
      // Mantém a mensagem devolvida pela regra de transição do backend.
      setStatusError(getErrorMessage(error, "Não foi possível alterar o status do chamado."));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function searchHistory(event) {
    event.preventDefault();
    const equipamento = historyFilters.equipamento.trim();
    const area = historyFilters.area.trim();
    if (!equipamento && !area) {
      setHistoryError("Informe um equipamento ou uma área comum para pesquisar.");
      setHistoryResults([]);
      setHistoryMeta(null);
      setHistorySearched(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");
    setHistorySearched(true);
    try {
      const result = await ticketsService.history({
        pagina: 1,
        limite: 100,
        ...(equipamento ? { equipamento } : {}),
        ...(area ? { area } : {}),
      });
      setHistoryResults(toRecords(result));
      setHistoryMeta(result?.meta || null);
    } catch (error) {
      setHistoryResults([]);
      setHistoryMeta(null);
      setHistoryError(getErrorMessage(error, "Não foi possível consultar o histórico do equipamento."));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">Habita+ · Manutenção</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Chamados de manutenção</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Abra solicitações, acompanhe o andamento e consulte o histórico dos equipamentos.
          </p>
        </div>
        <Button onClick={openCreateModal}>Abrir chamado</Button>
      </header>

      {notice && <Alert variant="success" title="Operação concluída" onClose={() => setNotice("")}>{notice}</Alert>}

      <Card title="Solicitações" description={canManage ? "Chamados de todos os moradores do condomínio." : "Você visualiza somente os chamados abertos por sua conta."}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Select
              label="Filtrar por status"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={STATUS_OPTIONS}
              placeholder="Todos os status"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>Atualizar lista</Button>
        </div>

        {loading ? (
          <Loading label="Carregando chamados..." />
        ) : listError ? (
          <div className="space-y-3">
            <Alert variant="error" title="Chamados indisponíveis">{listError}</Alert>
            <Button variant="secondary" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>Tentar novamente</Button>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState title="Nenhum chamado encontrado" description="Não há solicitações para o filtro selecionado." action={<Button onClick={openCreateModal}>Abrir primeiro chamado</Button>} />
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onOpen={(item) => { setSelectedTicket(item); setStatusError(""); }} />)}
          </div>
        )}
      </Card>

      {canManage && (
        <Card title="Histórico por equipamento" description="Pesquise chamados anteriores informando o equipamento e/ou a área comum.">
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={searchHistory}>
            <Input
              label="Equipamento"
              placeholder="Ex.: elevador"
              value={historyFilters.equipamento}
              onChange={(event) => setHistoryFilters((current) => ({ ...current, equipamento: event.target.value }))}
            />
            <Input
              label="Área comum (opcional)"
              placeholder="Ex.: garagem"
              value={historyFilters.area}
              onChange={(event) => setHistoryFilters((current) => ({ ...current, area: event.target.value }))}
            />
            <Button type="submit" loading={historyLoading}>Pesquisar</Button>
          </form>
          {historyError && <div className="mt-4"><Alert variant="error" title="Histórico indisponível">{historyError}</Alert></div>}
          {historyLoading ? (
            <div className="mt-4"><Loading label="Consultando histórico..." /></div>
          ) : historySearched && !historyError && historyResults.length === 0 ? (
            <div className="mt-4"><EmptyState title="Nenhum registro encontrado" description="Não foram encontrados chamados para os filtros informados." /></div>
          ) : historyResults.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted">{historyMeta?.total ?? historyResults.length} registro(s) encontrado(s).</p>
              {historyResults.map((ticket) => <TicketCard key={`history-${ticket.id}`} ticket={ticket} onOpen={(item) => { setSelectedTicket(item); setStatusError(""); }} />)}
            </div>
          ) : null}
        </Card>
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Abrir chamado de manutenção" size="lg" footer={null}>
        <form className="space-y-4" onSubmit={createTicket}>
          {formError && <Alert variant="error" title="Não foi possível abrir o chamado">{formError}</Alert>}
          <Select
            label="Local do chamado"
            value={form.localTipo}
            onChange={(event) => setForm((current) => ({ ...current, localTipo: event.target.value }))}
            options={LOCATION_OPTIONS}
          />
          {form.localTipo === "UNIDADE" ? (
            <Select
              label="Unidade"
              required
              disabled={unitsLoading || units.length === 0}
              value={form.unidadeId}
              onChange={(event) => setForm((current) => ({ ...current, unidadeId: event.target.value }))}
              options={units.map((unit) => ({ value: String(unit.id), label: `Bloco ${unit.bloco || "—"} · Unidade ${unit.numero || unit.id} (ID ${unit.id})` }))}
              placeholder={unitsLoading ? "Carregando unidades..." : "Selecione a unidade"}
            />
          ) : (
            <Input
              label="Área comum"
              required
              value={form.areaComum}
              onChange={(event) => setForm((current) => ({ ...current, areaComum: event.target.value }))}
              placeholder="Ex.: garagem, piscina ou salão de festas"
            />
          )}
          {unitsError && form.localTipo === "UNIDADE" && <Alert variant="warning" title="Unidades indisponíveis">{unitsError} Você ainda pode abrir um chamado para uma área comum.</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Categoria"
              required
              value={form.categoria}
              onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
              options={CATEGORY_OPTIONS}
            />
            <Input
              label="Equipamento"
              required
              value={form.equipamento}
              onChange={(event) => setForm((current) => ({ ...current, equipamento: event.target.value }))}
              placeholder="Ex.: elevador, bomba de água"
              maxLength={60}
            />
          </div>
          <Textarea
            label="Descrição do problema"
            required
            rows={5}
            maxLength={2000}
            value={form.descricao}
            onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
            placeholder="Descreva o que aconteceu e quando começou..."
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} disabled={form.localTipo === "UNIDADE" && (unitsLoading || units.length === 0)}>Enviar chamado</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} title={selectedTicket ? `Detalhes do chamado #${selectedTicket.id}` : "Detalhes do chamado"} size="lg" footer={null}>
        {selectedTicket && (
          <div className="space-y-4">
            {statusError && <Alert variant="error" title="Não foi possível alterar o status">{statusError}</Alert>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TicketStatus status={selectedTicket.status} />
              <span className="text-xs text-muted">Aberto em {formatDate(selectedTicket.abertoEm)}</span>
            </div>
            <dl className="grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase text-muted">Solicitante</dt><dd className="mt-1 text-sm text-ink">{selectedTicket.usuario?.nome || "—"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Local</dt><dd className="mt-1 text-sm text-ink">{getLocationLabel(selectedTicket)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Categoria</dt><dd className="mt-1 text-sm text-ink">{normalizeLabel(selectedTicket.categoria)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-muted">Equipamento</dt><dd className="mt-1 text-sm text-ink">{normalizeLabel(selectedTicket.equipamento)}</dd></div>
              {selectedTicket.encerradoEm && <div><dt className="text-xs font-semibold uppercase text-muted">Encerrado em</dt><dd className="mt-1 text-sm text-ink">{formatDate(selectedTicket.encerradoEm)}</dd></div>}
            </dl>
            <div><h3 className="text-xs font-semibold uppercase text-muted">Descrição</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">{selectedTicket.descricao}</p></div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <Button variant="secondary" onClick={() => setSelectedTicket(null)}>Fechar</Button>
              {canManage && statusPresentation(selectedTicket.status).next && (
                <Button loading={updatingStatus} onClick={advanceStatus}>{statusPresentation(selectedTicket.status).action}</Button>
              )}
              {canManage && !statusPresentation(selectedTicket.status).next && <Badge variant="closed">Chamado encerrado</Badge>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Tickets;
