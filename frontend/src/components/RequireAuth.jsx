import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6">
        <p className="text-ink" role="status">
          Verificando sua sessão...
        </p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default RequireAuth;
