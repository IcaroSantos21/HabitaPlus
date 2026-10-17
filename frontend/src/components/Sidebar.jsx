import { NavLink } from "react-router-dom";

function Sidebar({ brand = "Habita+", links = [], footer, className = "", onNavigate }) {
  return (
    <aside className={`flex min-h-72 w-full max-w-xs flex-col rounded-xl bg-brand-navy p-4 text-white ${className}`}>
      <div className="border-b border-white/15 px-3 pb-4">
        <p className="text-lg font-bold">{brand}</p>
        <p className="mt-1 text-xs text-white/65">Gestão condominial</p>
      </div>
      <nav aria-label="Navegação lateral" className="mt-4 flex-1 space-y-1">
        {links.map((link) => (
          <NavLink
            key={`${link.label}-${link.to}`}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) => `block rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-brand-green font-semibold text-brand-navy" : "text-white/85 hover:bg-white/10 hover:text-white"}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      {footer && <div className="mt-4 border-t border-white/15 pt-4">{footer}</div>}
    </aside>
  );
}

export default Sidebar;
