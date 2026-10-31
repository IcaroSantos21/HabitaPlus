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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
