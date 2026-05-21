import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { ProjectsProvider } from "./state/ProjectsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ProjectsProvider>
          <App />
        </ProjectsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

const SW_VERSION_KEY = "storiq-sw-version";
const SW_VERSION = "v3";

if (!import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const registerServiceWorker = () => {
    const run = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                worker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch(() => {
          // PWA support should not block the internal tool if registration fails.
        });
    };

    if (document.readyState === "loading") {
      window.addEventListener("load", run);
    } else {
      run();
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  };

  const previousVersion = localStorage.getItem(SW_VERSION_KEY);
  if (previousVersion !== SW_VERSION) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      Promise.all(registrations.map((registration) => registration.unregister())).finally(() => {
        localStorage.setItem(SW_VERSION_KEY, SW_VERSION);
        registerServiceWorker();
      });
    });
  } else {
    registerServiceWorker();
  }
}
