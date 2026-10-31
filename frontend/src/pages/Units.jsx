import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "../components/Alert";
import ApartmentCard from "../components/ApartmentCard";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
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

function unwrap(payload) {
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload || {};
}

function getErrorMessage(error, fallback = "Não foi possível concluir a solicitação.") {
  const raw =
    error?.response?.data?.message ??
    error?.response?.data?.error?.message ??
    error?.message;
  if (Array.isArray(raw)) return raw.filter(Boolean).join(" ");
  return typeof raw === "string" && raw.trim() ? raw : fallback;
}

function emptyUnitForm() {
  return {
    bloco: "",
    numero: "",
    quartos: "2",
    areaM2: "",
    valorAluguelSugerido: "",
    disponivelLocacao: true,
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

function Units() {
  const { user } = useAuth();
  const canManage = ["SINDICO", "ADMIN"].includes(getUserRole(user));
  const [units, setUnits] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableError, setAvailableError] = useState("");
  const [blockFilter, setBlockFilter] = useState("TODOS");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [unitFormError, setUnitFormError] = useState("");
  const [savingUnit, setSavingUnit] = useState(false);
  const [isResidentFormOpen, setIsResidentFormOpen] = useState(false);
  const [residentForm, setResidentForm] = useState({
    usuarioId: "",
    tipo: "PROPRIETARIO",
  });
  const [residentError, setResidentError] = useState("");
  const [savingResident, setSavingResident] = useState(false);
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setAvailableError("");
    const [unitsResult, availableResult] = await Promise.allSettled([
      unitsService.list({ page: 1, limit: 100 }),
      unitsService.listAvailable(),
    ]);

    if (unitsResult.status === "fulfilled") {
      setUnits(toList(unitsResult.value));
    } else {
      setUnits([]);
      setError(getErrorMessage(unitsResult.reason, "Não foi possível carregar as unidades."));
    }

    if (availableResult.status === "fulfilled") {
      setAvailableUnits(toList(availableResult.value));
    } else {
      setAvailableUnits([]);
      setAvailableError(
        getErrorMessage(availableResult.reason, "Não foi possível carregar as unidades disponíveis."),
      );
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

  const blocks = useMemo(() => {
    const values = [...new Set(units.map((unit) => String(unit.bloco || "").trim()).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [units]);

  const filteredUnits = useMemo(
    () =>
      blockFilter === "TODOS"
        ? units
        : units.filter((unit) => String(unit.bloco) === blockFilter),
    [blockFilter, units],
  );

  async function openDetails(unit) {
    setSelectedUnit({ id: unit.id, numero: unit.numero, bloco: unit.bloco });
    setDetailsError("");
    setDetailsLoading(true);
    setIsDetailsOpen(true);
    try {
      setSelectedUnit(unwrap(await unitsService.get(unit.id)));
    } catch (requestError) {
      setDetailsError(getErrorMessage(requestError, "Não foi possível carregar os moradores desta unidade."));
    } finally {
      setDetailsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingUnit(null);
    setUnitForm(emptyUnitForm());
    setUnitFormError("");
    setIsUnitFormOpen(true);
  }

  function openEditForm(unit) {
    setEditingUnit(unit);
    setUnitForm({
      bloco: unit.bloco || "",
      numero: unit.numero || "",
      quartos: String(unit.quartos ?? 0),
      areaM2: String(unit.areaM2 ?? ""),
      valorAluguelSugerido: String(unit.valorAluguelSugerido ?? ""),
      disponivelLocacao: Boolean(unit.disponivelLocacao),
    });
    setUnitFormError("");
    setIsDetailsOpen(false);
    setIsUnitFormOpen(true);
  }

  async function saveUnit(event) {
    event.preventDefault();
    setSavingUnit(true);
    setUnitFormError("");
    const payload = {
      bloco: unitForm.bloco.trim(),
      numero: unitForm.numero.trim(),
      quartos: Number(unitForm.quartos),
      areaM2: Number(unitForm.areaM2),
      valorAluguelSugerido: Number(unitForm.valorAluguelSugerido),
      disponivelLocacao: Boolean(unitForm.disponivelLocacao),
    };

    try {
      if (editingUnit) {
        await unitsService.update(editingUnit.id, payload);
        setNotice("Unidade atualizada com sucesso.");
      } else {
        await unitsService.create(payload);
        setNotice("Unidade cadastrada com sucesso.");
      }
      setIsUnitFormOpen(false);
      setEditingUnit(null);
      await loadData();
    } catch (requestError) {
      setUnitFormError(
        getErrorMessage(requestError, "Não foi possível salvar a unidade."),
      );
    } finally {
      setSavingUnit(false);
    }
  }

  async function openResidentForm() {
    setResidentForm({ usuarioId: "", tipo: "PROPRIETARIO" });
    setResidentError("");
    setIsDetailsOpen(false);
    setIsResidentFormOpen(true);
  }

  async function saveResident(event) {
    event.preventDefault();
    if (!selectedUnit?.id) return;
    setSavingResident(true);
    setResidentError("");
    try {
      await unitsService.linkResident(selectedUnit.id, {
        usuarioId: Number(residentForm.usuarioId),
        tipo: residentForm.tipo,
      });
      setNotice("Morador vinculado à unidade.");
      setIsResidentFormOpen(false);
      await openDetails({ ...selectedUnit, id: selectedUnit.id });
      await loadData();
    } catch (requestError) {
      setResidentError(
        getErrorMessage(requestError, "Não foi possível vincular o morador."),
      );
    } finally {
      setSavingResident(false);
    }
  }

  async function unlinkResident(resident) {
    if (!selectedUnit?.id) return;
    const residentId = resident.usuarioId ?? resident.id;
    const confirmed = window.confirm(
      `Deseja desvincular ${resident.nome || "este morador"} desta unidade?`,
    );
    if (!confirmed) return;
    setDetailsError("");
    try {
      await unitsService.unlinkResident(selectedUnit.id, residentId);
      setNotice("Morador desvinculado da unidade.");
      await openDetails(selectedUnit);
      await loadData();
    } catch (requestError) {
      setDetailsError(
        getErrorMessage(requestError, "Não foi possível desvincular o morador."),
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
            Habita+ · Administração
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Unidades</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Consulte os apartamentos, veja os moradores vinculados e acompanhe as unidades disponíveis para locação.
          </p>
        </div>
        {canManage && <Button onClick={openCreateForm}>Cadastrar unidade</Button>}
      </header>

      {notice && (
        <Alert variant="success" title="Operação concluída" onClose={() => setNotice("")}>{notice}</Alert>
      )}
      {error && <Alert variant="error" title="Unidades indisponíveis">{error}</Alert>}

      <Card title="Lista de unidades" description="Filtre os apartamentos pelo bloco e abra os detalhes para consultar os moradores.">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label className={labelClass} htmlFor="filter-block">Filtrar por bloco</label>
            <select
              id="filter-block"
              className={fieldClass}
              value={blockFilter}
              onChange={(event) => setBlockFilter(event.target.value)}
            >
              <option value="TODOS">Todos os blocos</option>
              {blocks.map((block) => <option key={block} value={block}>Bloco {block}</option>)}
            </select>
          </div>
          <p className="text-sm text-muted">{filteredUnits.length} unidade(s)</p>
        </div>
        {loading ? (
          <Loading label="Carregando unidades..." />
        ) : filteredUnits.length === 0 ? (
          <EmptyState
            title={error ? "Não foi possível exibir as unidades" : "Nenhuma unidade encontrada"}
            description={error || "Não há unidades cadastradas para este filtro."}
            action={error ? <Button variant="secondary" onClick={loadData}>Tentar novamente</Button> : null}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredUnits.map((unit) => (
              <Card key={unit.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-brand-navy">Apartamento {unit.numero}</h3>
                    <p className="mt-1 text-sm text-muted">Bloco {unit.bloco}</p>
                  </div>
                  <Badge status={unit.disponivelLocacao ? "DISPONIVEL" : "INDISPONIVEL"} />
                </div>
                <p className="text-sm text-muted">
                  {unit.quartos ?? "—"} quarto(s) · {unit.areaM2 ?? "—"} m²
                </p>
                <p className="text-lg font-bold text-brand-teal">{formatCurrency(unit.valorAluguelSugerido)}</p>
                <Button variant="secondary" onClick={() => openDetails(unit)}>Ver detalhes e moradores</Button>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Unidades disponíveis para locação</h2>
          <p className="mt-1 text-sm text-muted">Apartamentos que podem receber um novo contrato.</p>
        </div>
        {availableError ? (
          <Alert variant="warning" title="Disponibilidade indisponível">{availableError}</Alert>
        ) : availableUnits.length === 0 && !loading ? (
          <EmptyState title="Nenhuma unidade disponível" description="Quando houver apartamentos liberados para locação, eles aparecerão aqui." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableUnits.map((unit) => (
              <ApartmentCard key={unit.id} apartment={unit} onViewDetails={openDetails} />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedUnit ? `Apartamento ${selectedUnit.numero} · Bloco ${selectedUnit.bloco}` : "Detalhes da unidade"}
        size="lg"
      >
        {detailsLoading ? (
          <Loading label="Carregando detalhes da unidade..." />
        ) : detailsError ? (
          <Alert variant="error" title="Detalhes indisponíveis">{detailsError}</Alert>
        ) : selectedUnit ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted">Quartos</p><p className="mt-1 font-semibold text-brand-navy">{selectedUnit.quartos ?? "—"}</p></div>
              <div><p className="text-xs text-muted">Área</p><p className="mt-1 font-semibold text-brand-navy">{selectedUnit.areaM2 ?? "—"} m²</p></div>
              <div><p className="text-xs text-muted">Aluguel sugerido</p><p className="mt-1 font-semibold text-brand-navy">{formatCurrency(selectedUnit.valorAluguelSugerido)}</p></div>
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-brand-navy">Moradores vinculados</h3>
                  <p className="mt-1 text-xs text-muted">Proprietários e inquilinos associados à unidade.</p>
                </div>
                {canManage && <Button size="sm" onClick={openResidentForm}>Vincular morador</Button>}
              </div>
              {!Array.isArray(selectedUnit.moradores) || selectedUnit.moradores.length === 0 ? (
                <EmptyState title="Nenhum morador vinculado" description="Esta unidade ainda não possui moradores associados." />
              ) : (
                <div className="space-y-2">
                  {selectedUnit.moradores.map((resident) => (
                    <div key={resident.usuarioId ?? resident.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-navy">{resident.nome || "Morador"}</p>
                        <p className="mt-1 truncate text-xs text-muted">{resident.email || `ID ${resident.usuarioId ?? resident.id}`}</p>
                        <p className="mt-1 text-xs text-muted">Vínculo: {resident.tipo || "Não informado"}</p>
                      </div>
                      {canManage && (
                        <Button size="sm" variant="danger" onClick={() => unlinkResident(resident)}>Desvincular</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canManage && (
              <div className="flex justify-end border-t border-gray-100 pt-4">
                <Button variant="secondary" onClick={() => openEditForm(selectedUnit)}>Editar unidade</Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isUnitFormOpen}
        onClose={() => setIsUnitFormOpen(false)}
        title={editingUnit ? "Editar unidade" : "Cadastrar unidade"}
        size="lg"
        footer={null}
      >
        <form className="space-y-4" onSubmit={saveUnit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass} htmlFor="unit-block">Bloco</label><input id="unit-block" className={fieldClass} required maxLength={20} value={unitForm.bloco} onChange={(event) => setUnitForm({ ...unitForm, bloco: event.target.value })} /></div>
            <div><label className={labelClass} htmlFor="unit-number">Número</label><input id="unit-number" className={fieldClass} required maxLength={20} value={unitForm.numero} onChange={(event) => setUnitForm({ ...unitForm, numero: event.target.value })} /></div>
            <div><label className={labelClass} htmlFor="unit-rooms">Quartos</label><input id="unit-rooms" className={fieldClass} type="number" min="0" step="1" required value={unitForm.quartos} onChange={(event) => setUnitForm({ ...unitForm, quartos: event.target.value })} /></div>
            <div><label className={labelClass} htmlFor="unit-area">Área (m²)</label><input id="unit-area" className={fieldClass} type="number" min="0" step="0.01" required value={unitForm.areaM2} onChange={(event) => setUnitForm({ ...unitForm, areaM2: event.target.value })} /></div>
            <div><label className={labelClass} htmlFor="unit-rent">Aluguel sugerido (R$)</label><input id="unit-rent" className={fieldClass} type="number" min="0" step="0.01" required value={unitForm.valorAluguelSugerido} onChange={(event) => setUnitForm({ ...unitForm, valorAluguelSugerido: event.target.value })} /></div>
            <div className="flex items-center gap-3 pt-6"><input id="unit-available" type="checkbox" checked={unitForm.disponivelLocacao} onChange={(event) => setUnitForm({ ...unitForm, disponivelLocacao: event.target.checked })} className="h-4 w-4 accent-brand-teal" /><label className="text-sm font-medium text-ink" htmlFor="unit-available">Disponível para locação</label></div>
          </div>
          {unitFormError && <Alert variant="error" title="Não foi possível salvar">{unitFormError}</Alert>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setIsUnitFormOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={savingUnit}>{editingUnit ? "Salvar alterações" : "Cadastrar unidade"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isResidentFormOpen} onClose={() => setIsResidentFormOpen(false)} title="Vincular morador à unidade" size="md" footer={null}>
        <form className="space-y-4" onSubmit={saveResident}>
          <p className="text-sm leading-6 text-muted">Informe o ID numérico do usuário cadastrado no Habita+. O backend ainda não disponibiliza uma rota de pesquisa/listagem de moradores.</p>
          <div><label className={labelClass} htmlFor="resident-id">ID do morador</label><input id="resident-id" className={fieldClass} type="number" min="1" step="1" required value={residentForm.usuarioId} onChange={(event) => setResidentForm({ ...residentForm, usuarioId: event.target.value })} placeholder="Ex.: 1" /></div>
          <div><label className={labelClass} htmlFor="resident-type">Tipo de vínculo</label><select id="resident-type" className={fieldClass} value={residentForm.tipo} onChange={(event) => setResidentForm({ ...residentForm, tipo: event.target.value })}><option value="PROPRIETARIO">Proprietário</option><option value="INQUILINO">Inquilino</option></select></div>
          {residentError && <Alert variant="error" title="Não foi possível vincular">{residentError}</Alert>}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><Button variant="secondary" onClick={() => setIsResidentFormOpen(false)}>Cancelar</Button><Button type="submit" loading={savingResident}>Vincular morador</Button></div>
        </form>
      </Modal>
    </div>
  );
}

export default Units;
