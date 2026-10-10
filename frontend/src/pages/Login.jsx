function Login() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-brand-teal">
          Entrar
        </h1>

        <p className="mt-2 text-muted">
          Acesse sua conta do Habita+
        </p>

        <div className="mt-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-ink"
          >
            E-mail
          </label>

          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-teal"
          />
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-lg bg-brand-teal px-4 py-3 font-semibold text-white hover:opacity-90"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

export default Login;