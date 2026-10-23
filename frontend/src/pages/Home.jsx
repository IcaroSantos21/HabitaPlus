import Card from "../components/Card";
import Badge from "../components/Badge";
import { useAuth } from "../hooks/useAuth";
import { roleLabel } from "../utils/roles";

function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
          Habita+ · Área autenticada
        </p>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy">
          Olá, {user?.nome || user?.name || "bem-vindo"}!
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Esta é a visão geral da sua área no Habita+. O menu lateral mostra os módulos disponíveis para o seu perfil.
        </p>
      </header>

      <Card title="Sua sessão" description="Dados do usuário autenticado">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Nome
            </dt>
            <dd className="mt-1 font-semibold text-ink">
              {user?.nome || user?.name || "Não informado"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              E-mail
            </dt>
            <dd className="mt-1 font-semibold text-ink">
              {user?.email || "Não informado"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Perfil
            </dt>
            <dd className="mt-2">
              <Badge variant="info">{roleLabel(user)}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Próximos passos" description="A navegação já está preparada para os módulos do projeto.">
        <p className="text-sm leading-6 text-muted">
          Com <code>VITE_USE_MOCKS=true</code>, os módulos demonstrativos podem ser navegados sem iniciar o backend. Quando os endpoints reais estiverem disponíveis, altere a variável para <code>false</code> para chamar a API.
        </p>
      </Card>
    </div>
  );
}

export default Home;
