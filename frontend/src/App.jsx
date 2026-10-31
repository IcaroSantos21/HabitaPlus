import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import HomeRedirect from "./pages/HomeRedirect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Rentals from "./pages/Rentals";
import Units from "./pages/Units";

function AuthenticatedPage({ children }) {
  return (
    <RequireAuth>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </RequireAuth>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/morador"
            element={
              <AuthenticatedPage>
                <Home />
              </AuthenticatedPage>
            }
          />
          <Route
            path="/sindico"
            element={
              <AuthenticatedPage>
                <Home />
              </AuthenticatedPage>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthenticatedPage>
                <Home />
              </AuthenticatedPage>
            }
          />
          <Route
            path="/units"
            element={
              <AuthenticatedPage>
                <Units />
              </AuthenticatedPage>
            }
          />
          <Route
            path="/rentals"
            element={
              <AuthenticatedPage>
                <Rentals />
              </AuthenticatedPage>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
