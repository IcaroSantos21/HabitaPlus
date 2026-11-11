import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getHomePath } from "../utils/roles";

function getErrorMessage(error) {
  if (!error.response) {
    return "Não foi possível conectar à API. Verifique se o backend está em execução.";
  }

  const { status, data } = error.response;
  if (status === 401) return "E-mail ou senha inválidos.";
  if (status === 409) return "Este e-mail já está cadastrado. Entre ou use outro e-mail.";
  if (status === 400) {
    return Array.isArray(data?.message)
      ? data.message.join(" ")
      : data?.message || "Confira os dados informados.";
  }
  return data?.message || "Não foi possível concluir a solicitação.";
}

function BrandSymbol() {
  return (
    <span className="hp-login-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <path d="M5 18.2 20 6l15 12.2V34H5V18.2Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M14 34V21h12v13M16 13h8M20 10v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Login() {
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = location.state?.from?.pathname;

  if (isLoading) {
    return (
      <main className="hp-login-loading">
        <span className="hp-login-loading__spinner" aria-hidden="true" />
        <p>Preparando seu ambiente Habita+...</p>
      </main>
    );
  }

  if (user) return <Navigate to={getHomePath(user)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (isRegistering && senha !== confirmarSenha) {
      setErrorMessage("As senhas não coincidem. Confira os dois campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      let authenticatedUser;
      if (isRegistering) {
        authenticatedUser = await register({ nome: nome.trim(), email: email.trim(), senha });
      } else {
        authenticatedUser = await login({ email: email.trim(), senha });
      }
      navigate(redirectTo || getHomePath(authenticatedUser), { replace: true });
    } catch (requestError) {
      setErrorMessage(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleMode() {
    setIsRegistering((current) => !current);
    setErrorMessage("");
  }

  return (
    <main className="hp-login-page">
      <div className="hp-login-backdrop hp-login-backdrop--one" aria-hidden="true" />
      <div className="hp-login-backdrop hp-login-backdrop--two" aria-hidden="true" />

      <section className="hp-login-shell">
        <aside className="hp-login-showcase">
          <Link to="/login" className="hp-login-brand">
            <BrandSymbol />
            <span>Habita<span>+</span></span>
          </Link>

          <div className="hp-login-showcase__copy">
            <span className="hp-login-kicker"><i /> GESTÃO CONDOMINIAL INTELIGENTE</span>
            <h1>Seu condomínio.<br /><em>Mais simples.</em><br />Mais conectado.</h1>
            <p>Uma experiência completa para moradores, síndicos e administradores cuidarem do que realmente importa.</p>
            <div className="hp-login-benefits">
              <span><b>✓</b> Atendimento em um só lugar</span>
              <span><b>✓</b> Gestão transparente e organizada</span>
              <span><b>✓</b> Informação sempre à mão</span>
            </div>
          </div>

          <div className="hp-login-mascot-wrap" aria-hidden="true">
            <div className="hp-login-mascot-glow" />
            <img src="/images/assistant/habita-bot.webp" alt="" className="hp-login-mascot" />
            <div className="hp-login-mascot-note">
              <span className="hp-login-mascot-note__dot" />
              <span><strong>Assistente Habita+</strong><small>Seu parceiro no dia a dia</small></span>
            </div>
          </div>

          <div className="hp-login-showcase__bottom">
            <span>Habita+ <b>•</b> Gestão com cuidado</span>
            <span>© {new Date().getFullYear()} Habita+</span>
          </div>
        </aside>

        <section className="hp-login-form-side">
          <div className="hp-login-card">
            <div className="hp-login-card__topline">
              <span className="hp-login-card__lock" aria-hidden="true">⌑</span>
              <span>AMBIENTE SEGURO</span>
            </div>
            <div className="hp-login-card__heading">
              <p className="hp-login-card__eyebrow">{isRegistering ? "COMECE POR AQUI" : "BEM-VINDO DE VOLTA"}</p>
              <h2>{isRegistering ? "Crie sua conta" : "Acesse sua conta"}</h2>
              <p>{isRegistering ? "Entre para a comunidade Habita+ e tenha tudo organizado em um só lugar." : "Entre para acompanhar sua rotina condominial com praticidade."}</p>
            </div>

            <form className="hp-login-form" onSubmit={handleSubmit}>
              {isRegistering && (
                <div className="hp-field">
                  <label htmlFor="nome">Nome completo</label>
                  <input id="nome" name="nome" type="text" autoComplete="name" minLength={2} required value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Como podemos chamar você?" />
                </div>
              )}

              <div className="hp-field">
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              <div className="hp-field">
                <div className="hp-field__label-row"><label htmlFor="senha">Senha</label>{!isRegistering && <span>Área protegida</span>}</div>
                <input id="senha" name="senha" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} minLength={isRegistering ? 8 : undefined} required value={senha} onChange={(event) => setSenha(event.target.value)} placeholder={isRegistering ? "Crie uma senha segura" : "Digite sua senha"} />
                {isRegistering && <small>Use pelo menos 8 caracteres.</small>}
              </div>

              {isRegistering && (
                <div className="hp-field">
                  <label htmlFor="confirmarSenha">Confirme sua senha</label>
                  <input id="confirmarSenha" name="confirmarSenha" type="password" autoComplete="new-password" minLength={8} required value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} placeholder="Digite a senha novamente" />
                </div>
              )}

              {errorMessage && <p className="hp-login-error" role="alert"><span aria-hidden="true">!</span>{errorMessage}</p>}

              <button type="submit" disabled={isSubmitting} className="hp-login-submit">
                {isSubmitting ? "Aguarde..." : isRegistering ? "Criar minha conta" : "Entrar no Habita+"}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="hp-login-switch">
              <span>{isRegistering ? "Já faz parte do Habita+?" : "Ainda não tem uma conta?"}</span>
              <button type="button" onClick={toggleMode}>{isRegistering ? "Fazer login" : "Cadastre-se"}</button>
            </div>

            <div className="hp-login-assurance">
              <span aria-hidden="true">✦</span>
              <p>Uma plataforma feita para aproximar pessoas e facilitar a vida em condomínio.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Login;
