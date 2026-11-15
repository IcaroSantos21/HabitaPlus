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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 8 8 5.5L20 8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
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
        <Link to="/login" className="hp-login-brand" aria-label="Habita+ Gestão Condominial">
          <img src="/images/login/logo.png" alt="Habita+ Gestão Condominial" className="hp-login-logo" />
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


          <div className="hp-login-showcase__bottom">
            <span>Habita+ <b>•</b> Gestão com cuidado</span>
            
          </div>
        </aside>

        <section className="hp-login-form-side">
          <div className="hp-login-card">
            <div className="hp-login-card__topline">
            <span className="hp-login-card__lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 14.2-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4Z" /></svg>
            </span>
              <span>AMBIENTE SEGURO</span>
            </div>
              <div className="hp-login-card__heading">
              {isRegistering && <p className="hp-login-card__eyebrow">COMECE POR AQUI</p>}
              <h2>{isRegistering ? "Crie sua conta" : "Bem-vindo!"}</h2>
              <p>{isRegistering ? "Entre para a comunidade Habita+ e tenha tudo organizado em um só lugar." : "Acesse sua conta Habita+ para acompanhar sua rotina condominial."}</p>
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
                <div className="hp-input-icon">
                  <MailIcon />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Digite seu e-mail"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="hp-field">
                <div className="hp-field__label-row">
                  <label htmlFor="senha">Senha</label>
                </div>
                <div className="hp-input-icon">
                  <LockIcon />
                  <input
                    id="senha"
                    name="senha"
                    type="password"
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    minLength={isRegistering ? 8 : undefined}
                    required
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder={isRegistering ? "Crie uma senha segura" : "Digite sua senha"}
                  />
                </div>
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
