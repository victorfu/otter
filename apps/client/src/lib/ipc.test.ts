import { mockIPC } from "@tauri-apps/api/mocks";
import { describe, expect, it } from "vitest";
import { IpcError, commands, toIpcError } from "./ipc";

describe("toIpcError", () => {
  it("keeps the code from a Rust CommandError", () => {
    const err = toIpcError({ code: "EMPTY_NAME", message: "Please enter a name." });
    expect(err).toBeInstanceOf(IpcError);
    expect(err.code).toBe("EMPTY_NAME");
    expect(err.message).toBe("Please enter a name.");
  });

  it("wraps strings and Errors as UNKNOWN", () => {
    expect(toIpcError("boom").code).toBe("UNKNOWN");
    expect(toIpcError(new Error("bad")).message).toBe("bad");
  });
});

describe("commands", () => {
  it("passes arguments and returns the typed result", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "greet") return { name: (args as { name: string }).name, message: "hi" };
    });
    await expect(commands.greet("Ada")).resolves.toEqual({ name: "Ada", message: "hi" });
  });

  it("rejects with IpcError when the command fails", async () => {
    mockIPC(() => {
      throw { code: "EMPTY_NAME", message: "Please enter a name." };
    });
    await expect(commands.greet("")).rejects.toMatchObject({ code: "EMPTY_NAME" });
  });
});
