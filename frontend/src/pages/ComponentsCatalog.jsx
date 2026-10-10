import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Textarea from "../components/Textarea";
import Card from "../components/Card";
import ApartmentCard from "../components/ApartmentCard";
import Modal from "../components/Modal";
import Table from "../components/Table";
import Badge from "../components/Badge";
import Alert from "../components/Alert";
import Toast from "../components/Toast";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";

const residentOptions = [
  { value: "morador", label: "Morador" },
  { value: "sindico", label: "Síndico" },
  { value: "administrador", label: "Administrador" },
];

const apartments = [
  {
    id: "A-204",
    title: "Apartamento 204",
    address: "Bloco A · 2º andar",
    price: "R$ 1.850/mês",
    bedrooms: 2,
    bathrooms: 1,
    area: 68,
    status: "Disponível",
  },
  {
    id: "B-103",
    title: "Apartamento 103",
    address: "Bloco B · 1º andar",
    price: "R$ 2.100/mês",
    bedrooms: 3,
    bathrooms: 2,
    area: 82,
    status: "Pendente",
  },
];

const residents = [
  { id: 1, name: "Ana Souza", apartment: "A-204", status: "Disponível" },
  { id: 2, name: "Bruno Lima", apartment: "B-103", status: "Pendente" },
  { id: 3, name: "Carla Mendes", apartment: "C-301", status: "Encerrado" },
];

const tableColumns = [
  { key: "name", label: "Morador" },
  { key: "apartment", label: "Apartamento" },
  {
    key: "status",
    label: "Status",
    render: (row) => <Badge status={row.status}>{row.status}</Badge>,
  },
];

function Section({ id, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-brand-navy">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ComponentsCatalog() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApartment, setSelectedApartment] = useState(apartments[0]);


  return (
    <div className="min-h-screen bg-gray-50 text-ink">
      <Navbar
        brand="Habita+ · Componentes"
        links={[{ label: "Início", to: "/" }, { label: "Login", to: "/login" }]}
      />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-gray-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">FE-02 · Biblioteca UI</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Componentes visuais reutilizáveis</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Catálogo de referência do Habita+. Os componentes abaixo centralizam estilos e estados para manter as telas consistentes com o protótipo.
          </p>
        </header>

        <Section id="botoes" title="Button" description="Variantes primária, secundária, perigo e desabilitada.">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Botão primário</Button>
              <Button variant="secondary">Botão secundário</Button>
              <Button variant="danger">Botão perigo</Button>
              <Button disabled>Desabilitado</Button>
              <Button loading>Carregando</Button>
              <Button size="sm">Pequeno</Button>
              <Button size="lg">Grande</Button>
            </div>
          </Card>
        </Section>

        <Section id="badges" title="Badge de status" description="Estados de exemplo inspirados no frame Componentes do Figma.">
          <Card>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-green" /><Badge status="Disponível">Disponível</Badge></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" /><Badge status="Pendente">Pendente</Badge></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-danger" /><Badge status="Erro">Erro</Badge></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gray-500" /><Badge status="Encerrado">Encerrado</Badge></div>
            </div>
          </Card>
        </Section>

        <Section id="alertas" title="Alert e Toast" description="Alertas inline e notificação temporária.">
          <div className="grid gap-4 md:grid-cols-2">
            <Alert variant="success" title="Sucesso">Descrição do alerta.</Alert>
            <Alert variant="info" title="Informação">Descrição do alerta.</Alert>
            <Alert variant="warning" title="Aviso">Descrição do alerta.</Alert>
            <Alert variant="error" title="Erro">Descrição do alerta.</Alert>
          </div>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Clique para testar o Toast no canto superior direito.</p>
              <Button onClick={() => setToastOpen(true)}>Mostrar Toast</Button>
            </div>
          </Card>
        </Section>

        <Section id="campos" title="Input, Select e Textarea" description="Campos normais, com erro e desabilitados.">
          <Card>
            <div className="grid gap-5 md:grid-cols-3">
              <Input label="Campo de texto" placeholder="Digite aqui" />
              <Input label="Campo com erro" placeholder="Digite aqui" error="Este campo é obrigatório." />
              <Input label="Campo desabilitado" placeholder="Indisponível" disabled />
              <Select label="Tipo de usuário" options={residentOptions} placeholder="Selecione uma opção" />
              <Select label="Seleção com erro" options={residentOptions} error="Selecione uma opção." />
              <Select label="Seleção desabilitada" options={residentOptions} disabled />
              <div className="md:col-span-3">
                <Textarea label="Observações" placeholder="Digite aqui suas observações..." helperText="Campo para textos maiores." />
              </div>
            </div>
          </Card>
        </Section>

        <Section id="cards" title="Card e ApartmentCard" description="Cards para organizar conteúdo e apresentar apartamentos.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Resumo do condomínio" description="Exemplo de Card reutilizável." footer={<span className="text-xs text-muted">Atualizado agora</span>}>
              <p className="text-3xl font-bold text-brand-teal">128</p>
              <p className="mt-1 text-sm text-muted">Unidades cadastradas</p>
            </Card>
            <ApartmentCard apartment={apartments[0]} onViewDetails={(apartment) => { setSelectedApartment(apartment); setModalOpen(true); }} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ApartmentCard apartment={apartments[1]} onViewDetails={(apartment) => { setSelectedApartment(apartment); setModalOpen(true); }} />
            <Card title="Exemplo de conteúdo vazio">
              <EmptyState title="Nenhuma solicitação" description="Quando houver solicitações, elas aparecerão aqui." />
            </Card>
          </div>
        </Section>

        <Section id="tabela" title="Table" description="Tabela reutilizável com colunas configuráveis e badges de status.">
          <Card padding="none">
            <Table columns={tableColumns} data={residents} />
          </Card>
        </Section>

        <Section id="modal" title="Modal" description="Clique no botão para abrir a janela e teste o botão de fechar ou a tecla Esc.">
          <Card>
            <Button onClick={() => { setSelectedApartment(apartments[0]); setModalOpen(true); }}>Abrir Modal</Button>
          </Card>
        </Section>

        <Section id="navegacao" title="Navbar e Sidebar" description="Exemplos dos dois padrões de navegação solicitados.">
          <div className="grid gap-5 md:grid-cols-[260px_1fr]">
            <Sidebar
              brand="Habita+"
              links={[
                { label: "Visão geral", to: "/" },
                { label: "Componentes", to: "/dev/components" },
                { label: "Entrar", to: "/login" },
              ]}
              footer={<span className="text-xs text-white/70">Biblioteca de componentes</span>}
            />
            <Card title="Navbar" description="A barra superior deste catálogo também é uma instância do componente Navbar.">
              <p className="text-sm leading-6 text-muted">Use o componente passando a marca, os links e, opcionalmente, ações à direita.</p>
              <div className="mt-4 rounded-lg bg-gray-50 p-4 text-xs text-muted">O exemplo completo está no topo desta página.</div>
            </Card>
          </div>
        </Section>

        <Section id="utilitarios" title="Pagination, EmptyState e Loading" description="Estados de navegação, ausência de dados e carregamento.">
          <Card title="Pagination">
            <p className="mb-3 text-sm text-muted">Página selecionada: {currentPage}</p>
            <Pagination currentPage={currentPage} totalPages={5} onPageChange={setCurrentPage} />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="EmptyState">
              <EmptyState title="Nenhum resultado encontrado" description="Tente ajustar os filtros da pesquisa." action={<Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Voltar ao topo</Button>} />
            </Card>
            <Card title="Loading">
              <div className="space-y-6">
                <Loading label="Carregando dados..." />
                <Loading label="Carregamento compacto" size="sm" />
                <Loading label="Esqueleto de conteúdo" variant="skeleton" />
              </div>
            </Card>
          </div>
        </Section>

        <footer className="border-t border-gray-200 pt-5 text-sm text-muted">
          <Link to="/" className="font-semibold text-brand-teal hover:underline">Voltar para o início</Link>
          <p className="mt-2 text-xs">Habita+ · Biblioteca de componentes FE-02</p>
        </footer>
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedApartment?.title || "Detalhes do apartamento"}
        footer={<Button onClick={() => setModalOpen(false)}>Fechar</Button>}
      >
        {selectedApartment && (
          <div className="space-y-3 text-sm">
            <p className="text-muted">{selectedApartment.address}</p>
            <p className="text-xl font-bold text-brand-teal">{selectedApartment.price}</p>
            <p>{selectedApartment.bedrooms} quarto(s) · {selectedApartment.bathrooms} banheiro(s) · {selectedApartment.area} m²</p>
            <Badge status={selectedApartment.status}>{selectedApartment.status}</Badge>
          </div>
        )}
      </Modal>

      <Toast
        open={toastOpen}
        variant="success"
        title="Tudo certo!"
        message="Esta é uma notificação de exemplo do Habita+."
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

export default ComponentsCatalog;
