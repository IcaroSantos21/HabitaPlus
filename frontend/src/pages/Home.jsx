import { useAuth } from "../hooks/useAuth";

function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-brand-teal">
          Habita+
        </h1>

        <p className="mt-3 text-muted">Sessão autenticada via API</p>

        <dl className="mt-6 space-y-3 rounded-lg bg-gray-50 p-4">
          <div>
            <dt className="text-sm text-muted">Nome</dt>
            <dd className="font-medium text-ink">{user.nome}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">E-mail</dt>
            <dd className="font-medium text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Perfil</dt>
            <dd className="font-medium text-ink">{user.perfil}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full rounded-lg border border-brand-teal px-4 py-3 font-semibold text-brand-teal hover:bg-gray-50"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

export default Home;
