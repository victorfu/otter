#!/usr/bin/env node
// Run every static check. Continues after a failure so you see all problems at once.
import { c, run } from "./lib/util.mjs";

const steps = [
  ["app.json in sync", "node", ["scripts/sync-app-config.mjs", "--check"]],
  ["ts-rs bindings", "node", ["scripts/bindings.mjs", "--check"]],
  ["tsc", "npm", ["run", "typecheck", "-w", "@otter/client"]],
  ["oxlint", "oxlint", ["--deny-warnings"]],
  ["oxfmt --check", "oxfmt", ["--check"]],
  ["cargo fmt --check", "cargo", ["fmt", "--all", "--check"]],
  ["cargo clippy", "cargo", ["clippy", "--workspace", "--all-targets", "--", "-D", "warnings"]],
];

const results = [];
for (const [label, cmd, args] of steps) {
  console.log(c.bold(c.cyan(`\n▶ ${label}`)));
  const started = Date.now();
  const { ok } = run(cmd, args, { allowFail: true });
  results.push({ label, ok, secs: ((Date.now() - started) / 1000).toFixed(1) });
}

console.log(c.bold("\nSummary"));
for (const r of results) {
  console.log(`  ${r.ok ? c.green("✔") : c.red("✖")} ${r.label.padEnd(22)} ${c.dim(`${r.secs}s`)}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? c.red(`\n${failed} check(s) failed.`) : c.green("\nAll checks passed."));
process.exit(failed ? 1 : 0);
