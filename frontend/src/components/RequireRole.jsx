import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getHomePath, getUserRole } from "../utils/roles";

function RequireRole({ roles = [], children }) {
  const { user } = useAuth();
  const role = getUserRole(user);

  if (roles.length > 0 && !roles.includes(role)) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  return children;
}

export default RequireRole;
