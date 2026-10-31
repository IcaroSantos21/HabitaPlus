import { useAuth } from "../hooks/useAuth";
import { getUserRole } from "../utils/roles";
import ManagementDashboard from "./ManagementDashboard";
import ResidentDashboard from "./ResidentDashboard";

function Home() {
  const { user } = useAuth();
  const role = getUserRole(user);

  if (role === "MORADOR") {
    return <ResidentDashboard />;
  }

  return <ManagementDashboard />;
}

export default Home;
