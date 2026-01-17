// main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./contexts/LanguageContext.tsx";
import { StrictMode } from "react";
import { CarsProvider } from "./contexts/CarsContext.tsx";
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <CarsProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </CarsProvider>
    </HelmetProvider>
  </StrictMode>
);