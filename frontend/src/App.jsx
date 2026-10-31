import { BrowserRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
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
