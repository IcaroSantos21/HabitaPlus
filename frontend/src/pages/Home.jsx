import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ManagementDashboard from "./ManagementDashboard";
import ResidentDashboard from "./ResidentDashboard";
import { getUserRole } from "../utils/roles";

function Home() {
  const { user } = useAuth();
  const role = getUserRole(user);

  if (role === "MORADOR") {
    return <ResidentDashboard />;
  }

  if (role === "SINDICO" || role === "ADMIN") {
    return <ManagementDashboard />;
  }

  return <Navigate to="/login" replace />;
}

export default Home;
