import { useMutation } from "@tanstack/react-query";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { type FormEvent, useState } from "react";
import { commands, type IpcError } from "@/lib/ipc";
import type { Greeting } from "@/bindings/Greeting";
import { Button, Card, ErrorText } from "./ui";

/** Demonstrates frontend → Tauri command → core crate, including error handling. */
export function GreetCard() {
  const [name, setName] = useState("");
  const greet = useMutation<Greeting, IpcError, string>({ mutationFn: commands.greet });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    greet.mutate(name);
  };

  return (
    <Card
      title="Greeting"
      description="React → Tauri command → myapp-core"
      icon={<MessageSquareText className="size-4" />}
    >
      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="greet-name" className="sr-only">
          Your name
        </label>
        <input
          id="greet-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
        <Button type="submit" variant="primary" disabled={greet.isPending}>
          Greet
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </form>
      <div className="mt-3 min-h-10">
        {greet.isSuccess && (
          <p className="selectable rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            {greet.data.message}
          </p>
        )}
        {greet.isError && (
          <ErrorText>
            {greet.error.message}{" "}
            <code className="font-mono text-xs opacity-70">[{greet.error.code}]</code>
          </ErrorText>
        )}
        {greet.isIdle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Try submitting an empty name to see a validation error from Rust.
          </p>
        )}
      </div>
    </Card>
  );
}
