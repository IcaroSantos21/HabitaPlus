import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import ChatbotWidget from "./ChatbotWidget";
import { useAuth } from "../hooks/useAuth";
import { getHomePath, getUserRole, roleLabel } from "../utils/roles";

const commonLinks = {
  tickets: { label: "Chamados", to: "/tickets" },
  charges: { label: "Cobranças", to: "/charges" },
  marketplace: { label: "Marketplace", to: "/marketplace" },
  messages: { label: "Mensagens", to: "/messages" },
  notifications: { label: "Notificações", to: "/notifications" },
};

const linksByRole = {
  MORADOR: [
    { label: "Visão geral", to: "/morador" },
    commonLinks.tickets,
    commonLinks.charges,
    commonLinks.marketplace,
    commonLinks.messages,
    commonLinks.notifications,
  ],
  SINDICO: [
    { label: "Visão geral", to: "/sindico" },
    { label: "Unidades", to: "/units" },
    { label: "Locações", to: "/rentals" },
    commonLinks.tickets,
    { label: "Transações", to: "/transactions" },
    commonLinks.charges,
    commonLinks.marketplace,
    commonLinks.messages,
    commonLinks.notifications,
  ],
  ADMIN: [
    { label: "Visão geral", to: "/admin" },
    { label: "Unidades", to: "/units" },
    { label: "Locações", to: "/rentals" },
    commonLinks.tickets,
    { label: "Transações", to: "/transactions" },
    commonLinks.charges,
    commonLinks.marketplace,
    commonLinks.messages,
    commonLinks.notifications,
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
    <div className="min-h-screen w-full overflow-x-clip bg-gray-50 text-ink">
      <Navbar
        brand="Habita+"
        links={[]}
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-white sm:inline">
              {user?.nome || user?.name} · {roleLabel(user)}
            </span>
            <NotificationBell />
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

        <main className="min-w-0 w-full flex-1 py-2">
          {children}
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}

export default AuthenticatedLayout;
