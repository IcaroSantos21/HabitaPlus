export function getNotificationTarget(notification) {
  const id = notification?.refId;
  const tipo = String(notification?.tipo || "").trim().toUpperCase();
  const texto = String(notification?.texto || "").trim();

  // COMUNICADO é o tipo novo. O prefixo mantém compatibilidade com notificações antigas.
  if (tipo === "COMUNICADO" || (tipo === "ANUNCIO" && /^novo comunicado\s*:/i.test(texto))) {
    return "/morador#comunicados";
  }

  if (tipo === "ANUNCIO") return id ? `/marketplace?anuncio=${id}` : "/marketplace";
  if (tipo === "MENSAGEM") return "/messages";
  if (tipo === "COBRANCA") return "/charges";
  if (tipo === "ALERTA") {
    return texto.toLocaleLowerCase("pt-BR").includes("contrato de locação")
      ? "/rentals"
      : "/tickets";
  }

  return "/notifications";
}
