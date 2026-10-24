import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";
import announcementsService from "./services/announcementsService";
import chargesService from "./services/chargesService";
import chatbotService from "./services/chatbotService";
import forecastsService from "./services/forecastsService";
import messagesService from "./services/messagesService";
import notificationsService from "./services/notificationsService";
import recommendationsService from "./services/recommendationsService";
import rentalsService from "./services/rentalsService";
import ticketsService from "./services/ticketsService";
import transactionsService from "./services/transactionsService";
import unitsService from "./services/unitsService";
import ComponentsCatalog from "./pages/ComponentsCatalog";
import Home from "./pages/Home";
import HomeRedirect from "./pages/HomeRedirect";
import Login from "./pages/Login";
import ModulePage from "./pages/ModulePage";
import NotFound from "./pages/NotFound";

const allRoles = ["MORADOR", "SINDICO", "ADMIN"];
const managementRoles = ["SINDICO", "ADMIN"];

function AuthenticatedPage({ roles, children }) {
  return (
    <RequireAuth allowedRoles={roles}>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </RequireAuth>
  );
}

function ModuleRoute({ title, description, service, method = "list", roles = allRoles }) {
  return (
    <AuthenticatedPage roles={roles}>
      <ModulePage
        title={title}
        description={description}
        service={service}
        method={method}
      />
    </AuthenticatedPage>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Login />} />
          <Route path="/dev/components" element={<ComponentsCatalog />} />

          <Route
            path="/morador"
            element={
              <AuthenticatedPage roles={["MORADOR"]}>
                <Home />
              </AuthenticatedPage>
            }
          />
          <Route
            path="/sindico"
            element={
              <AuthenticatedPage roles={["SINDICO"]}>
                <Home />
              </AuthenticatedPage>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthenticatedPage roles={["ADMIN"]}>
                <Home />
              </AuthenticatedPage>
            }
          />

          <Route
            path="/units"
            element={
              <ModuleRoute
                title="Unidades"
                description="Consulta das unidades conforme o contrato da API."
                service={unitsService}
                roles={managementRoles}
              />
            }
          />
          <Route
            path="/rentals"
            element={
              <ModuleRoute
                title="Locações"
                description="Lista demonstrativa dos contratos de locação."
                service={rentalsService}
                roles={managementRoles}
              />
            }
          />
          <Route
            path="/tickets"
            element={
              <ModuleRoute
                title="Chamados"
                description="Acompanhamento dos chamados e solicitações."
                service={ticketsService}
              />
            }
          />
          <Route
            path="/transactions"
            element={
              <ModuleRoute
                title="Transações"
                description="Consulta demonstrativa das transações financeiras."
                service={transactionsService}
                roles={managementRoles}
              />
            }
          />
          <Route
            path="/charges"
            element={
              <ModuleRoute
                title="Cobranças"
                description="Consulta demonstrativa das cobranças do condomínio."
                service={chargesService}
              />
            }
          />
          <Route
            path="/announcements"
            element={
              <ModuleRoute
                title="Anúncios"
                description="Comunicados e anúncios do condomínio."
                service={announcementsService}
              />
            }
          />
          <Route
            path="/messages"
            element={
              <ModuleRoute
                title="Mensagens"
                description="Área demonstrativa de mensagens."
                service={messagesService}
              />
            }
          />
          <Route
            path="/notifications"
            element={
              <ModuleRoute
                title="Notificações"
                description="Notificações do usuário autenticado."
                service={notificationsService}
              />
            }
          />
          <Route
            path="/chatbot"
            element={
              <ModuleRoute
                title="Assistente virtual"
                description="Conversa de demonstração do assistente Habita+."
                service={chatbotService}
                method="getConversation"
              />
            }
          />
          <Route
            path="/forecasts"
            element={
              <ModuleRoute
                title="Previsão de despesas"
                description="Exemplo de previsão conforme o contrato do serviço de ML."
                service={forecastsService}
                method="getExpenses"
                roles={managementRoles}
              />
            }
          />
          <Route
            path="/recommendations"
            element={
              <ModuleRoute
                title="Recomendações"
                description="Exemplos de recomendações personalizadas."
                service={recommendationsService}
                method="get"
              />
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
