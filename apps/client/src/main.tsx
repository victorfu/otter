import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { attachConsole } from "@tauri-apps/plugin-log";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeSync } from "@/components/ThemeSync";
import { makeRouter } from "@/router";
import "./styles.css";

// In dev builds, mirror Rust log records into the devtools console.
if (isTauri() && import.meta.env.DEV) {
  attachConsole().catch((err: unknown) => console.warn("attachConsole failed", err));
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
const router = makeRouter();

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
