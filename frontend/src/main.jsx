import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

async function startApplication() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") {
    const { worker } = await import("./mocks/browser.js");
    const { unitRentalHandlers } = await import("./mocks/unitRentalHandlers.js");
    worker.use(...unitRentalHandlers);
    await worker.start({ onUnhandledRequest: "bypass" });
    console.info("[Habita+] MSW ativado: usando a API simulada.");
  }
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

startApplication().catch((error) => {
  console.error("Não foi possível iniciar o Habita+.", error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<main style="font-family: sans-serif; padding: 2rem"><h1>Não foi possível iniciar o Habita+</h1><p>Confira o terminal do Vite para ver o erro.</p></main>';
  }
});
