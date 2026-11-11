import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import { AuthProvider } from "./contexts/AuthContext";
import Charges from "./pages/Charges";
import ComponentsCatalog from "./pages/ComponentsCatalog";
import ChatbotWidget from "./components/ChatbotWidget";
import { useAuth } from "./hooks/useAuth";
import Home from "./pages/Home";
import HomeRedirect from "./pages/HomeRedirect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentSuccess from "./pages/PaymentSuccess";
import Rentals from "./pages/Rentals";
import Tickets from "./pages/Tickets";
import Transactions from "./pages/Transactions";
import Units from "./pages/Units";

function AuthenticatedPage({ children, roles = [] }) {
  return (
    <RequireAuth>
      <RequireRole roles={roles}>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </RequireRole>
    </RequireAuth>
  );
}

function GlobalAssistant() {
  const { user, isLoading } = useAuth();
  return user && !isLoading ? <ChatbotWidget /> : null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dev/components" element={<ComponentsCatalog />} />
          <Route
            path="/morador"
            element={<AuthenticatedPage roles={["MORADOR"]}><Home /></AuthenticatedPage>}
          />
          <Route
            path="/sindico"
            element={<AuthenticatedPage roles={["SINDICO", "ADMIN"]}><Home /></AuthenticatedPage>}
          />
          <Route
            path="/admin"
            element={<AuthenticatedPage roles={["ADMIN"]}><Home /></AuthenticatedPage>}
          />
          <Route
            path="/units"
            element={<AuthenticatedPage roles={["SINDICO", "ADMIN"]}><Units /></AuthenticatedPage>}
          />
          <Route
            path="/rentals"
            element={<AuthenticatedPage roles={["SINDICO", "ADMIN"]}><Rentals /></AuthenticatedPage>}
          />
          <Route
            path="/tickets"
            element={<AuthenticatedPage><Tickets /></AuthenticatedPage>}
          />
          <Route
            path="/charges"
            element={<AuthenticatedPage><Charges /></AuthenticatedPage>}
          />
          <Route
            path="/transactions"
            element={<AuthenticatedPage roles={["SINDICO", "ADMIN"]}><Transactions /></AuthenticatedPage>}
          />
          <Route
            path="/marketplace"
            element={<AuthenticatedPage><Marketplace /></AuthenticatedPage>}
          />
          <Route
            path="/messages"
            element={<AuthenticatedPage><Messages /></AuthenticatedPage>}
          />
          <Route
            path="/notifications"
            element={<AuthenticatedPage><Notifications /></AuthenticatedPage>}
          />
          <Route
            path="/success"
            element={<AuthenticatedPage><PaymentSuccess /></AuthenticatedPage>}
          />
          <Route
            path="/cancel"
            element={<AuthenticatedPage><PaymentCancel /></AuthenticatedPage>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <GlobalAssistant />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
