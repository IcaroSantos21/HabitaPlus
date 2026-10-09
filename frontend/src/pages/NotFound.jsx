import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-green">
          Erro 404
        </p>

        <h1 className="mt-3 text-3xl font-bold text-brand-teal">
          Página não encontrada
        </h1>

        <p className="mt-4 text-muted">
          O endereço acessado não existe ou não está disponível.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-brand-teal px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Voltar para o início
        </Link>
      </section>
    </main>
  );
}

export default NotFound;