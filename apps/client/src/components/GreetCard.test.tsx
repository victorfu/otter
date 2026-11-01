import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockIPC } from "@tauri-apps/api/mocks";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GreetCard } from "./GreetCard";

function renderCard() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GreetCard />
    </QueryClientProvider>,
  );
}

describe("GreetCard", () => {
  it("shows the greeting returned by Rust", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "greet") {
        const { name } = args as { name: string };
        return { name, message: `Hello, ${name}!` };
      }
    });
    renderCard();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /greet/i }));
    expect(await screen.findByText("Hello, Ada!")).toBeInTheDocument();
  });

  it("shows the error code and message on failure", async () => {
    mockIPC(() => {
      throw { code: "EMPTY_NAME", message: "Please enter a name." };
    });
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /greet/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please enter a name.");
    expect(alert).toHaveTextContent("EMPTY_NAME");
  });
});
