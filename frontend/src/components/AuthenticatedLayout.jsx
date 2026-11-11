import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
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
  const displayName = user?.nome || user?.name || "Usuário";
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  function handleLogout() {
    logout();
    window.location.assign("/login");
  }

  return (
    <div className={`hp-app hp-app--${String(role || "guest").toLowerCase()}`}>
      <Navbar
        brand="Habita"
        links={[]}
        actions={
          <>
            <div className="hp-user-chip">
              <span className="hp-user-chip__avatar" aria-hidden="true">{initials || "H"}</span>
              <span className="hp-user-chip__copy">
                <strong>{displayName}</strong>
                <small>{roleLabel(user)}</small>
              </span>
            </div>
            <NotificationBell />
            <Button variant="secondary" size="sm" onClick={handleLogout} className="hp-logout-button">
              Sair
            </Button>
          </>
        }
      />

      <div className="hp-app-grid">
        <div className="hp-mobile-menu-bar">
          <Button
            variant="secondary"
            className="hp-mobile-menu-trigger"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="authenticated-sidebar"
          >
            <span aria-hidden="true">☰</span>{mobileMenuOpen ? "Fechar navegação" : "Abrir navegação"}
          </Button>
        </div>

        <div id="authenticated-sidebar" className={`hp-sidebar-wrap${mobileMenuOpen ? " is-open" : ""}`}>
          <Sidebar
            className="hp-sidebar--sticky"
            links={links}
            onNavigate={() => setMobileMenuOpen(false)}
            footer={
              <Link to={getHomePath(user)} className="hp-sidebar__home-link">
                <span aria-hidden="true">↗</span> Voltar à visão geral
              </Link>
            }
          />
        </div>

        <main className="hp-main">
          {children}
          <footer className="hp-main__footer">
            <span>Habita+ · Seu condomínio em boas mãos</span>
            <span>Ambiente seguro e conectado</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default AuthenticatedLayout;
