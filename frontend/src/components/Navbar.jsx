import { Link } from "react-router-dom";

function Navbar({ brand = "Habita+", links = [], actions, className = "" }) {
  return (
    <header className={`w-full bg-brand-teal text-white shadow-sm ${className}`}>
      <nav aria-label="Navegação principal" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight text-white">{brand}</Link>
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link
              key={`${link.label}-${link.to}`}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </nav>
    </header>
  );
}

export default Navbar;
