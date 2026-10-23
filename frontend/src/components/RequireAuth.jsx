import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loading from "./Loading";
import { getHomePath, getUserRole } from "../utils/roles";

function RequireAuth({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <Loading label="Verificando sua sessão..." />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && !allowedRoles.includes(getUserRole(user))) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  return children;
}

export default RequireAuth;
