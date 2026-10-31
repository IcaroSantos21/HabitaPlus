export function getUserRole(user) {
  const rawRole = String(user?.perfil ?? user?.role ?? "")
    .trim()
    .toUpperCase();

  if (["MORADOR", "RESIDENT", "RESIDENTE"].includes(rawRole)) {
    return "MORADOR";
  }

  if (["SINDICO", "SÍNDICO", "SYNDIC", "MANAGER"].includes(rawRole)) {
    return "SINDICO";
  }

  if (["ADMIN", "ADMINISTRADOR", "ADMINISTRATOR"].includes(rawRole)) {
    return "ADMIN";
  }

  return null;
}

export function getHomePath(user) {
  const role = getUserRole(user);

  if (role === "MORADOR") return "/morador";
  if (role === "SINDICO") return "/sindico";
  if (role === "ADMIN") return "/admin";

  return "/login";
}

export function roleLabel(user) {
  const role = getUserRole(user);

  if (role === "MORADOR") return "Morador";
  if (role === "SINDICO") return "Síndico";
  if (role === "ADMIN") return "Administrador";

  return "Usuário";
}
