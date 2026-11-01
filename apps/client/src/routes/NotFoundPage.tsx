import { Link } from "@tanstack/react-router";
import { ArrowLeft, Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        <Compass className="size-6" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        There's nothing at this address.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to home
      </Link>
    </div>
  );
}
