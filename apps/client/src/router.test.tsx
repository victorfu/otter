import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { mockIPC } from "@tauri-apps/api/mocks";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeRouter } from "./router";

function renderAt(hash: string) {
  window.location.hash = hash;
  mockIPC((cmd) => {
    if (cmd === "app_info") {
      return {
        name: "Otter Dev",
        version: "0.1.0",
        identifier: "cc.otter.dev",
        buildType: "dev",
        tauriVersion: "2",
      };
    }
    return null;
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={makeRouter()} />
    </QueryClientProvider>,
  );
}

describe("router", () => {
  it("renders the about page", async () => {
    renderAt("#/about");
    expect(await screen.findByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });

  it("renders a friendly 404 inside the layout for unknown routes", async () => {
    renderAt("#/does-not-exist");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});
