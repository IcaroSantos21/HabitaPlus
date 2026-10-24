import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../hooks/useAuth";
import { getHomePath, getUserRole, roleLabel } from "../utils/roles";

const commonLinks = {
  tickets: { label: "Chamados", to: "/tickets" },
  charges: { label: "Cobranças", to: "/charges" },
  announcements: { label: "Anúncios", to: "/announcements" },
  messages: { label: "Mensagens", to: "/messages" },
  notifications: { label: "Notificações", to: "/notifications" },
  chatbot: { label: "Assistente virtual", to: "/chatbot" },
  recommendations: { label: "Recomendações", to: "/recommendations" },
};

const linksByRole = {
  MORADOR: [
    { label: "Visão geral", to: "/morador" },
    commonLinks.tickets,
    commonLinks.charges,
    commonLinks.announcements,
    commonLinks.messages,
    commonLinks.notifications,
    commonLinks.chatbot,
    commonLinks.recommendations,
  ],
  SINDICO: [
    { label: "Visão geral", to: "/sindico" },
    { label: "Unidades", to: "/units" },
    { label: "Locações", to: "/rentals" },
    commonLinks.tickets,
    { label: "Transações", to: "/transactions" },
    commonLinks.charges,
    commonLinks.announcements,
    commonLinks.messages,
    commonLinks.notifications,
    commonLinks.chatbot,
    { label: "Previsão de despesas", to: "/forecasts" },
    commonLinks.recommendations,
  ],
  ADMIN: [
    { label: "Visão geral", to: "/admin" },
    { label: "Unidades", to: "/units" },
    { label: "Locações", to: "/rentals" },
    commonLinks.tickets,
    { label: "Transações", to: "/transactions" },
    commonLinks.charges,
    commonLinks.announcements,
    commonLinks.messages,
    commonLinks.notifications,
    { label: "Previsão de despesas", to: "/forecasts" },
    commonLinks.chatbot,
    commonLinks.recommendations,
  ],
};

function AuthenticatedLayout({ children }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const role = getUserRole(user);
  const links = linksByRole[role] || [];

  function handleLogout() {
    logout();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-ink">
      <Navbar
        brand="Habita+"
        links={[
          { label: "Catálogo de componentes", to: "/dev/components" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden text-sm text-white sm:inline">
              {user?.nome || user?.name} · {roleLabel(user)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
            >
              Sair
            </Button>
          </div>
        }
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:gap-6 lg:px-8">
        <div className="lg:hidden">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="authenticated-sidebar"
          >
            {mobileMenuOpen ? "Ocultar menu" : "Abrir menu"}
          </Button>
        </div>

        <div
          id="authenticated-sidebar"
          className={`${mobileMenuOpen ? "block" : "hidden"} lg:block lg:w-64 lg:shrink-0`}
        >
          <Sidebar
            className="max-w-none lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-full"
            links={links}
            onNavigate={() => setMobileMenuOpen(false)}
            footer={
              <Link
                to={getHomePath(user)}
                className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                Voltar à visão geral
              </Link>
            }
          />
        </div>

        <main className="min-w-0 flex-1 py-2">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AuthenticatedLayout;
