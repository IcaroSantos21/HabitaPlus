import { Link } from "react-router-dom";

function BrandMark() {
  return (
    <span className="hp-topbar__brand-icon" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <path d="M5 18.2 20 6l15 12.2V34H5V18.2Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M14 34V21h12v13M16 13h8M20 10v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Navbar({ brand = "Habita+", links = [], actions, className = "" }) {
  return (
    <header className={`hp-topbar ${className}`}>
      <nav aria-label="Navegação principal" className="hp-topbar__inner">
        <Link to="/" className="hp-topbar__brand">
          <BrandMark />
          <span>{brand}</span>
          <span className="hp-topbar__brand-plus">+</span>
        </Link>
        <div className="hp-topbar__links">
          {links.map((link) => (
            <Link key={`${link.label}-${link.to}`} to={link.to}>{link.label}</Link>
          ))}
        </div>
        {actions && <div className="hp-topbar__actions">{actions}</div>}
      </nav>
    </header>
  );
}

export default Navbar;
