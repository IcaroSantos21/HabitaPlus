import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getErrorMessage(error) {
  if (!error.response) {
    return "Não foi possível conectar à API. Verifique se o backend está em execução.";
  }

  const { status, data } = error.response;
  if (status === 401) {
    return "E-mail ou senha inválidos.";
  }
  if (status === 409) {
    return "Este e-mail já está cadastrado. Entre ou use outro e-mail.";
  }
  if (status === 400) {
    return Array.isArray(data?.message)
      ? data.message.join(" ")
      : data?.message || "Confira os dados informados.";
  }
  return data?.message || "Não foi possível concluir a solicitação.";
}

function Login() {
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = location.state?.from?.pathname || "/";

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6">
        <p className="text-ink" role="status">
          Verificando sua sessão...
        </p>
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await register({ nome, email, senha });
      } else {
        await login({ email, senha });
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-brand-teal">
          {isRegistering ? "Criar conta" : "Entrar"}
        </h1>

        <p className="mt-2 text-muted">
          {isRegistering
            ? "Cadastre-se no Habita+ como morador"
            : "Acesse sua conta do Habita+"}
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

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {isRegistering && (
            <div>
              <label
                htmlFor="nome"
                className="block text-sm font-medium text-ink"
              >
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                minLength={2}
                required
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-teal"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-teal"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-ink"
            >
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              minLength={isRegistering ? 8 : undefined}
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-teal"
            />
            {isRegistering && (
              <p className="mt-1 text-sm text-muted">
                Use pelo menos 8 caracteres.
              </p>
            )}
          </div>

          {errorMessage && (
            <p
              className="rounded-lg bg-red-50 p-3 text-sm text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-teal px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Aguarde..."
              : isRegistering
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegistering ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegistering((current) => !current);
              setErrorMessage("");
            }}
            className="font-semibold text-brand-teal underline"
          >
            {isRegistering ? "Entrar" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
