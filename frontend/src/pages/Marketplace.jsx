import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import marketplaceService from "../services/marketplaceService";
import messagesService from "../services/messagesService";
import recommendationsService from "../services/recommendationsService";
import { getUserRole } from "../utils/roles";

const categoryLabels = {
  MOVEIS: "Móveis",
  ELETRONICOS: "Eletrônicos",
  UTENSILIOS: "Utensílios",
  ESPORTE: "Esporte e lazer",
  OUTROS: "Outros",
};

const emptyForm = {
  titulo: "",
  descricao: "",
  categoria: "",
  preco: "",
  imagemUrl: "",
};

function priceLabel(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function errorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

function listingData(value) {
  return Array.isArray(value?.data) ? value.data : Array.isArray(value) ? value : [];
}

const marketplaceImageBase = "/images/marketplace/";

function getListingImage(listing) {
  const title = String(listing?.titulo || listing?.title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const category = String(listing?.categoria || "").toUpperCase();

  if (title.includes("sofa") || title.includes("poltrona")) return `${marketplaceImageBase}sofa.webp`;
  if (title.includes("bicicleta") || title.includes("bike")) return `${marketplaceImageBase}bike.webp`;
  if (title.includes("luminaria") || title.includes("lampada") || title.includes("abajur")) return `${marketplaceImageBase}lamp.webp`;
  if (title.includes("mesa") || title.includes("cadeira")) return `${marketplaceImageBase}dining.webp`;
  if (title.includes("monitor") || title.includes("notebook") || title.includes("computador") || title.includes("eletron")) return `${marketplaceImageBase}monitor.svg`;
  if (title.includes("panela") || title.includes("cozinha") || title.includes("utensilio")) return `${marketplaceImageBase}cookware.svg`;

  const categoryImages = {
    MOVEIS: "sofa.webp",
    ESPORTE: "bike.webp",
    ELETRONICOS: "monitor.svg",
    UTENSILIOS: "cookware.svg",
    OUTROS: "generic.svg",
  };

  return `${marketplaceImageBase}${categoryImages[category] || "generic.svg"}`;
}

function ListingImage({ listing, className = "" }) {
  const fallbackImage = getListingImage(listing);
  const source = listing?.imagemUrl || fallbackImage;

  return (
    <img
      src={source}
      alt={listing?.titulo || "Imagem ilustrativa do anúncio"}
      loading="lazy"
      decoding="async"
      className={className}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = fallbackImage;
      }}
    />
  );
}

function Marketplace() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = Number(user?.id);
  const isResident = getUserRole(user) === "MORADOR";

  const [activeTab, setActiveTab] = useState("feed");
  const [filters, setFilters] = useState({ q: "", categoria: "", precoMin: "", precoMax: "", status: "" });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [categories, setCategories] = useState(["MOVEIS", "ELETRONICOS", "UTENSILIOS", "ESPORTE", "OUTROS"]);
  const [categoryError, setCategoryError] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [viewWarning, setViewWarning] = useState("");
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionError, setActionError] = useState("");
  const autoOpenedId = useRef(null);

  const categoryOptions = useMemo(
    () => categories.map((value) => ({ value, label: categoryLabels[value] || value })),
    [categories],
  );
  const isDetailOwner = Number(detail?.vendedor?.id) === currentUserId;

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const response = await marketplaceService.categories();
        if (active) setCategories(Array.isArray(response) ? response : []);
      } catch (error) {
        if (active) setCategoryError(errorMessage(error, "Não foi possível carregar as categorias."));
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (active) {
        setLoading(true);
        setListError("");
      }
      try {
        if (activeTab === "mine") {
          const response = await marketplaceService.mine();
          if (active) {
            setMyListings(listingData(response));
            setMeta({ page: 1, totalPages: 1, total: listingData(response).length });
          }
        } else {
          const params = { page, limit: 12, ...appliedFilters };
          Object.keys(params).forEach((key) => {
            if (params[key] === "" || params[key] === undefined || params[key] === null) delete params[key];
          });
          const response = await marketplaceService.list(params);
          if (active) {
            setListings(listingData(response));
            setMeta(response?.meta || { page, totalPages: 1, total: listingData(response).length });
          }
        }
      } catch (error) {
        if (active) setListError(errorMessage(error, "Não foi possível carregar os anúncios."));
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [activeTab, page, appliedFilters, reloadKey]);

  useEffect(() => {
    if (!isResident) {
      Promise.resolve().then(() => setRecommended([]));
      return undefined;
    }
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const response = await recommendationsService.get();
        const rows = Array.isArray(response?.recommendations) ? response.recommendations : [];
        if (active) setRecommended(rows.filter((item) => item?.anuncio && item?.anuncio?.status !== "VENDIDO"));
      } catch {
        if (active) setRecommended([]);
      }
    });
    return () => { active = false; };
  }, [isResident, reloadKey]);

  const openDetails = useCallback(async (id, conversationUserId = null) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError("");
    setViewWarning("");
    setMessages([]);
    setThreads([]);
    setSelectedUserId(conversationUserId ? String(conversationUserId) : "");
    setDetailLoading(true);
    try {
      try {
        await marketplaceService.registerView(id);
      } catch (error) {
        setViewWarning(errorMessage(error, "Não foi possível registrar a visualização do anúncio."));
      }
      const response = await marketplaceService.getById(id);
      setDetail(response);
    } catch (error) {
      setDetailError(errorMessage(error, "Não foi possível abrir este anúncio."));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const deepLinkId = searchParams.get("anuncio");
  const deepLinkUserId = searchParams.get("usuarioId");
  useEffect(() => {
    if (!deepLinkId || autoOpenedId.current === deepLinkId) return;
    autoOpenedId.current = deepLinkId;
    Promise.resolve().then(() => openDetails(Number(deepLinkId), deepLinkUserId ? Number(deepLinkUserId) : null));
  }, [deepLinkId, deepLinkUserId, openDetails]);

  useEffect(() => {
    if (!detailOpen || !detail || !isDetailOwner) return undefined;
    let active = true;
    Promise.resolve().then(async () => {
      setThreadsLoading(true);
      try {
        const response = await messagesService.inbox();
        const related = (Array.isArray(response) ? response : []).filter((thread) => Number(thread.anuncioId) === Number(detail.id));
        if (active) {
          setThreads(related);
          if (!selectedUserId && related.length > 0) setSelectedUserId(String(related[0].outroUsuario.id));
        }
      } catch (error) {
        if (active) setMessagesError(errorMessage(error, "Não foi possível carregar as conversas deste anúncio."));
      } finally {
        if (active) setThreadsLoading(false);
      }
    });
    return () => { active = false; };
  }, [detailOpen, detail, isDetailOwner, selectedUserId]);

  useEffect(() => {
    if (!detailOpen || !detail || (isDetailOwner && !selectedUserId)) return undefined;
    let active = true;
    const refreshConversation = async () => {
      try {
        const response = await messagesService.conversation(detail.id, isDetailOwner ? Number(selectedUserId) : undefined);
        const rows = Array.isArray(response) ? response : [];
        if (active) {
          setMessages(rows);
          setMessagesError("");
        }
        const unread = rows.filter((item) => Number(item.destinatarioId) === currentUserId && !item.lida);
        if (unread.length > 0) {
          await Promise.all(unread.map((item) => messagesService.markAsRead(item.id).catch(() => null)));
        }
      } catch (error) {
        if (active) setMessagesError(errorMessage(error, "Não foi possível carregar a conversa."));
      } finally {
        if (active) setMessagesLoading(false);
      }
    };
    Promise.resolve().then(() => {
      if (active) setMessagesLoading(true);
      return refreshConversation();
    });
    const interval = window.setInterval(refreshConversation, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [detailOpen, detail, isDetailOwner, selectedUserId, currentUserId]);

  function applyFilters(event) {
    event.preventDefault();
    const next = { ...filters };
    if (next.precoMin !== "") next.precoMin = Number(next.precoMin);
    if (next.precoMax !== "") next.precoMax = Number(next.precoMax);
    setAppliedFilters(next);
    setPage(1);
  }

  function openCreateForm() {
    setEditingListing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(listing) {
    if (Number(listing?.vendedor?.id) !== currentUserId) return;
    setEditingListing(listing);
    setForm({
      titulo: listing.titulo || "",
      descricao: listing.descricao || "",
      categoria: listing.categoria || "",
      preco: String(listing.preco ?? ""),
      imagemUrl: listing.imagemUrl || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function saveListing(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      preco: Number(form.preco),
      ...(form.imagemUrl.trim() ? { imagemUrl: form.imagemUrl.trim() } : {}),
    };
    try {
      if (editingListing) await marketplaceService.update(editingListing.id, payload);
      else await marketplaceService.create(payload);
      setFormOpen(false);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setFormError(errorMessage(error, "Não foi possível salvar o anúncio."));
    } finally {
      setSaving(false);
    }
  }

  async function markAsSold(listing) {
    if (Number(listing?.vendedor?.id) !== currentUserId) return;
    const id = Number(listing.id);
    const previousStatus = listing.status;
    const update = (rows, status) => rows.map((item) => Number(item.id) === id ? { ...item, status } : item);
    setListings((rows) => update(rows, "VENDIDO"));
    setMyListings((rows) => update(rows, "VENDIDO"));
    setDetail((item) => item && Number(item.id) === id ? { ...item, status: "VENDIDO" } : item);
    setActionError("");
    try {
      await marketplaceService.updateStatus(id, "VENDIDO");
    } catch (error) {
      setListings((rows) => update(rows, previousStatus));
      setMyListings((rows) => update(rows, previousStatus));
      setDetail((item) => item && Number(item.id) === id ? { ...item, status: previousStatus } : item);
      setActionError(errorMessage(error, "Não foi possível atualizar o anúncio."));
    }
  }

  async function removeListing(listing) {
    if (Number(listing?.vendedor?.id) !== currentUserId) return;
    const confirmed = window.confirm(`Deseja remover o anúncio “${listing.titulo}”?`);
    if (!confirmed) return;
    try {
      await marketplaceService.remove(listing.id);
      setListings((rows) => rows.filter((item) => Number(item.id) !== Number(listing.id)));
      setMyListings((rows) => rows.filter((item) => Number(item.id) !== Number(listing.id)));
      if (Number(detail?.id) === Number(listing.id)) closeDetails();
    } catch (error) {
      setActionError(errorMessage(error, "Não foi possível remover o anúncio."));
    }
  }

  function closeDetails() {
    setDetailOpen(false);
    setDetail(null);
    setMessages([]);
    setThreads([]);
    setSelectedUserId("");
    setMessageDraft("");
    autoOpenedId.current = null;
    if (searchParams.has("anuncio")) setSearchParams({}, { replace: true });
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!text || !detail) return;
    if (isDetailOwner && !selectedUserId) {
      setMessagesError("Selecione uma conversa para responder.");
      return;
    }
    setSendingMessage(true);
    setMessagesError("");
    try {
      const payload = { texto: text };
      if (isDetailOwner) payload.destinatarioId = Number(selectedUserId);
      const sent = await messagesService.send(detail.id, payload);
      setMessages((rows) => [...rows, sent]);
      setMessageDraft("");
    } catch (error) {
      setMessagesError(errorMessage(error, "Não foi possível enviar a mensagem."));
    } finally {
      setSendingMessage(false);
    }
  }

  const visibleListings = activeTab === "mine" ? myListings : listings;
  const resultsTotal = activeTab === "mine" ? myListings.length : (meta.total ?? listings.length);

  return (
    <div className="marketplace-page mx-auto w-full min-w-0 space-y-6">
      <header className="marketplace-hero">
        <div className="marketplace-hero__copy">
          <span className="marketplace-hero__eyebrow">HABITA+ <span aria-hidden="true">/</span> COMUNIDADE</span>
          <h1>Produtos e oportunidades</h1>
          <p>Descubra boas ofertas, anuncie o que não usa mais e negocie diretamente com os moradores do seu condomínio.</p>
          <div className="marketplace-hero__trust">
            <span><i aria-hidden="true" /> Feito para a comunidade</span>
            <span><i aria-hidden="true" /> Negociação entre vizinhos</span>
          </div>
        </div>
        <div className="marketplace-hero__actions">
          <span className="marketplace-hero__community">Seu condomínio, novas possibilidades</span>
          <Button onClick={openCreateForm} variant="secondary" className="marketplace-hero__button">+ Criar anúncio</Button>
        </div>
        <div className="marketplace-hero__art" aria-hidden="true">
          <span className="marketplace-hero__orb marketplace-hero__orb--one" />
          <span className="marketplace-hero__orb marketplace-hero__orb--two" />
          <span className="marketplace-hero__tile">H<span>+</span></span>
        </div>
      </header>

      {actionError && <Alert variant="error" title="Ação não concluída">{actionError}</Alert>}
      {categoryError && <Alert variant="warning">{categoryError}</Alert>}

      <div className="marketplace-tabs">
        <button type="button" onClick={() => { setActiveTab("feed"); setPage(1); }} aria-pressed={activeTab === "feed"} className={`marketplace-tab ${activeTab === "feed" ? "is-active" : ""}`}>Explorar anúncios</button>
        <button type="button" onClick={() => setActiveTab("mine")} aria-pressed={activeTab === "mine"} className={`marketplace-tab ${activeTab === "mine" ? "is-active" : ""}`}>Meus anúncios</button>
        <Link to="/messages" className="marketplace-tab">Caixa de entrada</Link>
      </div>

      {activeTab === "feed" && (
        <Card className="marketplace-filter-card min-w-0">
          <div className="marketplace-filter-heading">
            <div>
              <p className="marketplace-filter-eyebrow">ENCONTRE O QUE PROCURA</p>
              <h2>Buscar no marketplace</h2>
            </div>
            <span>Filtros rápidos</span>
          </div>
          <form onSubmit={applyFilters} className="marketplace-filter-grid grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="sm:col-span-2 xl:col-span-2">
              <Input label="Buscar anúncio" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Ex.: bicicleta, mesa..." />
            </div>
            <Select label="Categoria" value={filters.categoria} onChange={(event) => setFilters((current) => ({ ...current, categoria: event.target.value }))} options={categoryOptions} placeholder="Todas" />
            <Select label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} options={[{ value: "DISPONIVEL", label: "Disponível" }, { value: "VENDIDO", label: "Vendido" }]} placeholder="Todos" />
            <Input label="Preço mínimo" type="number" min="0" step="0.01" value={filters.precoMin} onChange={(event) => setFilters((current) => ({ ...current, precoMin: event.target.value }))} placeholder="R$ 0" />
            <Input label="Preço máximo" type="number" min="0" step="0.01" value={filters.precoMax} onChange={(event) => setFilters((current) => ({ ...current, precoMax: event.target.value }))} placeholder="Sem limite" />
            <div className="sm:col-span-2 xl:col-span-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => { const clean = { q: "", categoria: "", precoMin: "", precoMax: "", status: "" }; setFilters(clean); setAppliedFilters({}); setPage(1); }}>Limpar</Button>
              <Button type="submit">Aplicar filtros</Button>
            </div>
          </form>
        </Card>
      )}

      {isResident && activeTab === "feed" && recommended.length > 0 && (
        <section className="marketplace-section space-y-4" aria-labelledby="recommended-title">
          <div className="marketplace-section-heading">
            <div>
              <p className="marketplace-section-eyebrow">SELEÇÃO PERSONALIZADA</p>
              <h2 id="recommended-title">Recomendados para você</h2>
              <p>Oportunidades que combinam com o seu perfil.</p>
            </div>
            <span className="marketplace-section-mark" aria-hidden="true">✦</span>
          </div>
          <div className="marketplace-card-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map((item) => {
              const listing = { id: item.listingId, ...item.anuncio, vendedor: item.anuncio.vendedor || {} };
              return <ListingCard key={item.listingId} listing={listing} currentUserId={currentUserId} onOpen={() => openDetails(item.listingId)} onEdit={openEditForm} onSold={markAsSold} onRemove={removeListing} />;
            })}
          </div>
        </section>
      )}

      <section className="marketplace-section min-w-0 space-y-4" aria-live="polite">
        <div className="marketplace-section-heading marketplace-section-heading--compact">
          <div>
            <p className="marketplace-section-eyebrow">{activeTab === "mine" ? "SUA VITRINE" : "NOVIDADES DA COMUNIDADE"}</p>
            <h2>{activeTab === "mine" ? "Meus anúncios" : "Feed de anúncios"}</h2>
          </div>
          {!loading && <span className="marketplace-results-count">{resultsTotal} {resultsTotal === 1 ? "anúncio" : "anúncios"}</span>}
        </div>
        {loading ? <div className="py-8 text-center"><Loading label="Carregando anúncios..." /></div> : listError ? (
          <Alert variant="error" title="Não foi possível carregar">{listError}<div className="mt-3"><Button size="sm" variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Tentar novamente</Button></div></Alert>
        ) : visibleListings.length === 0 ? (
          <EmptyState title={activeTab === "mine" ? "Você ainda não publicou anúncios" : "Nenhum anúncio encontrado"} description={activeTab === "mine" ? "Crie seu primeiro anúncio para compartilhar com os moradores." : "Ajuste os filtros ou volte mais tarde para ver novas ofertas."} action={activeTab === "mine" ? <Button onClick={openCreateForm}>Criar anúncio</Button> : undefined} />
        ) : (
          <div className="marketplace-card-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map((listing) => <ListingCard key={listing.id} listing={listing} currentUserId={currentUserId} onOpen={() => openDetails(listing.id)} onEdit={openEditForm} onSold={markAsSold} onRemove={removeListing} />)}
          </div>
        )}
        {activeTab === "feed" && !loading && !listError && Number(meta.totalPages || 1) > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
            <span className="px-2 text-sm text-muted">Página {page} de {meta.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= Number(meta.totalPages)} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
          </div>
        )}
      </section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingListing ? "Editar anúncio" : "Criar anúncio"} size="lg">
        <form onSubmit={saveListing} className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input label="Título" required minLength={3} maxLength={120} value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} placeholder="Ex.: Bicicleta aro 29" />
          <Textarea label="Descrição" required rows={4} maxLength={2000} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} placeholder="Descreva o estado e os detalhes do produto." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Categoria" required value={form.categoria} onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))} options={categoryOptions} placeholder="Selecione" />
            <Input label="Preço (R$)" required type="number" min="0.01" step="0.01" value={form.preco} onChange={(event) => setForm((current) => ({ ...current, preco: event.target.value }))} placeholder="0,00" />
          </div>
          <Input label="URL da imagem (opcional)" type="url" value={form.imagemUrl} onChange={(event) => setForm((current) => ({ ...current, imagemUrl: event.target.value }))} placeholder="https://..." />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editingListing ? "Salvar alterações" : "Publicar anúncio"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={detailOpen} onClose={closeDetails} title="Detalhes do anúncio" size="xl">
        {detailLoading ? <div className="py-8 text-center"><Loading label="Abrindo anúncio..." /></div> : detailError ? <Alert variant="error">{detailError}</Alert> : detail && (
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <ListingImage listing={detail} className="marketplace-detail-image w-full rounded-2xl bg-gray-100 object-cover" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={detail.status}>{detail.status === "VENDIDO" ? "Vendido" : "Disponível"}</Badge>
                <Badge variant="info">{categoryLabels[detail.categoria] || detail.categoria}</Badge>
              </div>
              <h3 className="break-words text-xl font-bold text-brand-navy">{detail.titulo}</h3>
              <p className="break-words text-sm leading-6 text-gray-700">{detail.descricao}</p>
              <p className="text-2xl font-bold text-brand-teal">{priceLabel(detail.preco)}</p>
              <p className="text-sm text-muted">Vendedor: {detail.vendedor?.nome || "Morador"}{detail.vendedor?.unidade ? ` · Bloco ${detail.vendedor.unidade.bloco}, unidade ${detail.vendedor.unidade.numero}` : ""}</p>
              {viewWarning && <p role="status" className="text-xs text-orange-700">{viewWarning}</p>}
              {isDetailOwner ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { closeDetails(); openEditForm(detail); }}>Editar</Button>
                  {detail.status !== "VENDIDO" && <Button size="sm" onClick={() => markAsSold(detail)}>Marcar como vendido</Button>}
                  <Button size="sm" variant="danger" onClick={() => removeListing(detail)}>Remover</Button>
                </div>
              ) : (
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Tem interesse? Envie uma mensagem ao vendedor para combinar os detalhes.</p>
              )}
            </div>
            <div className="flex min-w-0 flex-col rounded-xl border border-gray-200">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="font-bold text-brand-navy">Conversa com o vendedor</h3>
                <p className="text-xs text-muted">As mensagens são atualizadas automaticamente a cada 10 segundos.</p>
                {isDetailOwner && (
                  <div className="mt-3">
                    <label htmlFor="marketplace-thread" className="mb-1 block text-sm font-medium text-ink">Conversa</label>
                    {threadsLoading ? <Loading size="sm" label="Carregando conversas..." /> : threads.length > 0 ? (
                      <select id="marketplace-thread" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal">
                        {threads.map((thread) => <option key={thread.outroUsuario.id} value={thread.outroUsuario.id}>{thread.outroUsuario.nome}</option>)}
                      </select>
                    ) : <p className="text-sm text-muted">Ainda não há mensagens de compradores neste anúncio.</p>}
                  </div>
                )}
              </div>
              <div className="flex max-h-72 min-h-44 flex-1 flex-col gap-2 overflow-y-auto p-3" aria-live="polite">
                {messagesLoading && messages.length === 0 ? <Loading size="sm" label="Carregando conversa..." /> : messages.length === 0 ? <p className="m-auto text-center text-sm text-muted">Nenhuma mensagem ainda. Inicie a conversa!</p> : messages.map((message) => {
                  const mine = Number(message.remetenteId) === currentUserId;
                  return <div key={message.id} className={`max-w-[88%] break-words rounded-xl px-3 py-2 text-sm ${mine ? "self-end bg-brand-teal text-white" : "self-start bg-gray-100 text-ink"}`}><p>{message.texto}</p><time className={`mt-1 block text-[10px] ${mine ? "text-white/75" : "text-muted"}`} dateTime={message.criadaEm}>{new Date(message.criadaEm).toLocaleString("pt-BR")}</time></div>;
                })}
              </div>
              {messagesError && <p role="alert" className="px-3 pb-2 text-sm text-danger">{messagesError}</p>}
              {(!isDetailOwner || selectedUserId) && detail.status !== "VENDIDO" && (
                <form onSubmit={sendMessage} className="flex min-w-0 gap-2 border-t border-gray-100 p-3">
                  <label className="sr-only" htmlFor="marketplace-message">Escreva uma mensagem</label>
                  <input id="marketplace-message" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={2000} placeholder="Escreva uma mensagem..." className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-teal" />
                  <Button type="submit" size="sm" disabled={!messageDraft.trim()} loading={sendingMessage}>Enviar</Button>
                </form>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ListingCard({ listing, currentUserId, onOpen, onEdit, onSold, onRemove }) {
  const isOwner = Number(listing?.vendedor?.id) === currentUserId;
  const category = categoryLabels[listing.categoria] || listing.categoria || "Outros";
  const isSold = listing.status === "VENDIDO";

  return (
    <Card padding="none" className="marketplace-product-card group flex min-w-0 flex-col overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="marketplace-product-card__trigger block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-teal"
        aria-label={`Abrir anúncio ${listing.titulo}`}
      >
        <div className="marketplace-product-card__media">
          <ListingImage listing={listing} className="marketplace-product-card__image" />
          <span className={`marketplace-product-card__status ${isSold ? "is-sold" : ""}`}>
            {isSold ? "Vendido" : "Disponível"}
          </span>
          <span className="marketplace-product-card__view">Ver detalhes <span aria-hidden="true">↗</span></span>
        </div>
        <div className="marketplace-product-card__body">
          <span className="marketplace-product-card__category">{category}</span>
          <h3 className="marketplace-product-card__title">{listing.titulo}</h3>
          <p className="marketplace-product-card__description">{listing.descricao}</p>
          <div className="marketplace-product-card__meta">
            <p className="marketplace-product-card__price">{priceLabel(listing.preco)}</p>
            <p className="marketplace-product-card__seller">Por {listing.vendedor?.nome || "Morador"}</p>
          </div>
        </div>
      </button>
      {isOwner && (
        <div className="marketplace-product-card__owner-actions mt-auto flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onEdit(listing)}>Editar</Button>
          {!isSold && <Button size="sm" onClick={() => onSold(listing)}>Marcar vendido</Button>}
          <Button size="sm" variant="danger" onClick={() => onRemove(listing)}>Remover</Button>
        </div>
      )}
    </Card>
  );
}

export default Marketplace;
