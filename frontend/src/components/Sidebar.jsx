import { NavLink } from "react-router-dom";

const iconByLabel = {
  "Visão geral": "dashboard",
  "Unidades": "building",
  "Locações": "key",
  "Chamados": "wrench",
  "Cobranças": "wallet",
  "Transações": "chart",
  "Marketplace": "store",
  "Mensagens": "message",
  "Notificações": "bell",
};

function NavIcon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    building: <><path d="M4 21V5.5L12 2l8 3.5V21"/><path d="M8 8h1m-1 4h1m6-4h1m-1 4h1M10 21v-4h4v4M2 21h20"/></>,
    key: <><circle cx="8" cy="9" r="5"/><path d="m11.5 12.5 8 8m-3-3 2-2m-5-1 2-2"/></>,
    wrench: <><path d="M14.5 6.5a5 5 0 0 0-6.7 6.7L3 18l3 3 4.8-4.8a5 5 0 0 0 6.7-6.7L14 12l-2-2 2.5-3.5Z"/><path d="m16 4 4 4"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h2"/><path d="M6 5V3h12v2"/></>,
    chart: <><path d="M4 20V10m8 10V4m8 16v-7"/><path d="M2 20h20"/></>,
    store: <><path d="M3 10v10h18V10"/><path d="M2 10 4 4h16l2 6M2 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 2 2 0 0 0 4 0"/><path d="M9 20v-5h6v5"/></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/><path d="M8 11h8m-8 4h5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="hp-nav-icon" {...common}>
      {paths[name] || paths.dashboard}
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="hp-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <path d="M5 18.2 20 6l15 12.2V34H5V18.2Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M14 34V21h12v13M16 13h8M20 10v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M29 7.5h5v5" stroke="#75F0C5" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Sidebar({ brand = "Habita+", links = [], footer, className = "", onNavigate }) {
  return (
    <aside className={`hp-sidebar ${className}`}>
      <div className="hp-sidebar__brand">
        <BrandMark />
        <div className="min-w-0">
          <p className="hp-sidebar__brand-name">{brand}</p>
          <p className="hp-sidebar__brand-caption">Gestão condominial inteligente</p>
        </div>
      </div>

      <div className="hp-sidebar__section-label">MENU PRINCIPAL</div>
      <nav aria-label="Navegação lateral" className="hp-sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={`${link.label}-${link.to}`}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) => `hp-sidebar__link${isActive ? " is-active" : ""}`}
          >
            <span className="hp-sidebar__link-icon"><NavIcon name={iconByLabel[link.label]} /></span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="hp-sidebar__bottom">
        <div className="hp-sidebar__assistant-hint">
          <span className="hp-sidebar__assistant-orb"><img src="/images/assistant/habita-bot-avatar.webp" alt="" /></span>
          <div>
            <strong>Precisa de ajuda?</strong>
            <span>O Assistente Habita+ está por aqui.</span>
          </div>
        </div>
        {footer && <div className="hp-sidebar__footer">{footer}</div>}
        <p className="hp-sidebar__version">Habita+ · Gestão conectada</p>
      </div>
    </aside>
  );
}

export default Sidebar;
