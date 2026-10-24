import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { getHomePath } from "../utils/roles";

function getApiErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message = data?.message ?? data?.error?.message;
  const details = data?.error?.details ?? data?.details;

  if (!error?.response) {
    return "Não foi possível conectar à API. Confira sua conexão e tente novamente.";
  }
  if (status === 401) {
    return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
  }
  if (status === 403) {
    return "Seu perfil não tem permissão para realizar esta ação.";
  }
  if (status === 409) {
    return "Este e-mail já está cadastrado. Entre ou use outro e-mail.";
  }
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(" ");
  }
  if (Array.isArray(details)) {
    const detailMessages = details
      .map((item) => (typeof item === "string" ? item : item?.message))
      .filter(Boolean);
    if (detailMessages.length) return detailMessages.join(" ");
  }
  if (typeof message === "string" && message.trim()) return message;
  return "Não foi possível concluir a solicitação. Tente novamente.";
}

function Login() {
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegistering = location.pathname === "/cadastro";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6">
        <p role="status" className="text-sm font-medium text-brand-navy">
          Verificando sua sessão...
        </p>
      </main>
    );
  }

  if (user) {
    return <Navigate to={getHomePath(user)} replace />;
  }

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
        authenticatedUser = await register({
          nome: nome.trim(),
          email: email.trim(),
          senha,
        });
      } else {
        authenticatedUser = await login({ email: email.trim(), senha });
      }

      navigate(redirectTo || getHomePath(authenticatedUser), { replace: true });
    } catch (requestError) {
      setErrorMessage(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = isRegistering ? "Crie sua conta" : "Boas-vindas!";
  const subtitle = isRegistering
    ? "Cadastre-se como morador para acessar a plataforma."
    : "Entre para acessar os serviços do seu condomínio.";

  function clearError(setter, value) {
    setter(value);
    if (errorMessage) setErrorMessage("");
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-brand-navy px-6 py-7 text-white sm:min-h-[280px] sm:px-10 sm:py-9 lg:min-h-screen lg:px-12 lg:py-12 xl:px-16">
        <Link to="/login" className="relative z-10 inline-flex items-center gap-3 self-start">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green text-xl font-black text-brand-navy">
            H+
          </span>
          <span className="text-2xl font-bold tracking-tight">Habita+</span>
        </Link>

        <div className="relative z-10 max-w-xl py-7 lg:py-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-mint">
            Gestão condominial inteligente
          </p>
          <h2 className="mt-4 max-w-lg text-3xl font-bold leading-tight sm:text-4xl xl:text-5xl">
            Seu condomínio, mais simples e conectado.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
            Organize informações, acompanhe solicitações e mantenha a comunidade em sintonia em um só lugar.
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-64 overflow-hidden sm:h-44 sm:w-80 lg:h-72 lg:w-full" aria-hidden="true">
          <div className="absolute -bottom-20 -left-5 h-40 w-40 rounded-full border-[18px] border-brand-green/90 sm:h-52 sm:w-52 sm:border-[22px] lg:-bottom-24 lg:-left-16 lg:h-64 lg:w-64" />
          <div className="absolute bottom-0 left-[45%] h-14 w-5 bg-brand-teal sm:h-20 sm:w-7 lg:h-28 lg:w-10" />
          <div className="absolute bottom-0 left-[57%] h-20 w-5 bg-brand-teal/90 sm:h-28 sm:w-7 lg:h-44 lg:w-10" />
          <div className="absolute bottom-0 left-[69%] h-28 w-5 bg-brand-green/80 sm:h-36 sm:w-7 lg:h-60 lg:w-10" />
        </div>

        <p className="relative z-10 text-xs text-white/60">
          Habita+ · Cuidado com o lugar onde vivemos.
        </p>
      </aside>

      <main className="flex min-h-[60vh] items-center justify-center px-4 py-10 sm:px-8 lg:min-h-screen lg:px-12 xl:px-20">
        <section className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-teal">
              {isRegistering ? "Cadastro de morador" : "Acesso à plataforma"}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">{subtitle}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegistering && (
              <Input
                id="auth-nome"
                label="Nome completo"
                name="nome"
                type="text"
                placeholder="Ex.: Maria Silva"
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                disabled={isSubmitting}
                value={nome}
                onChange={(event) => clearError(setNome, event.target.value)}
              />
            )}

            <Input
              id="auth-email"
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(event) => clearError(setEmail, event.target.value)}
            />

            <Input
              id="auth-senha"
              label="Senha"
              name="senha"
              type="password"
              placeholder={isRegistering ? "Crie uma senha segura" : "Digite sua senha"}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={8}
              required
              disabled={isSubmitting}
              value={senha}
              onChange={(event) => clearError(setSenha, event.target.value)}
            />

            {isRegistering && (
              <>
                <Input
                  id="auth-confirmar-senha"
                  label="Confirmar senha"
                  name="confirmarSenha"
                  type="password"
                  placeholder="Digite a senha novamente"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isSubmitting}
                  value={confirmarSenha}
                  onChange={(event) => clearError(setConfirmarSenha, event.target.value)}
                />
                <p className="-mt-3 text-xs leading-5 text-muted">
                  Use pelo menos 8 caracteres. O cadastro público cria automaticamente um perfil de morador.
                </p>
              </>
            )}

            {errorMessage && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-danger"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="w-full"
            >
              {isSubmitting
                ? "Aguarde..."
                : isRegistering
                  ? "Criar conta"
                  : "Entrar"}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            {isRegistering ? "Já possui uma conta?" : "Ainda não tem uma conta?"}{" "}
            <Link
              to={isRegistering ? "/login" : "/cadastro"}
              className="font-semibold text-brand-teal underline decoration-brand-green underline-offset-4 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              {isRegistering ? "Entrar" : "Cadastre-se"}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default Login;
