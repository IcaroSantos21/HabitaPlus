import { Link } from "react-router-dom";

function Navbar({ links = [], actions, className = "" }) {
  return (
    <header className={`hp-topbar ${className}`}>
      <nav aria-label="Navegação principal" className="hp-topbar__inner">
        <Link to="/" className="hp-topbar__brand" aria-label="Habita+ Gestão Condominial">
          <img src="/images/login/logo.png" alt="Habita+ Gestão Condominial" className="hp-topbar__logo" />
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