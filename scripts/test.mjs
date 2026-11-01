#!/usr/bin/env node
// Run frontend (Vitest) and Rust (cargo test) suites.
import { c, run } from "./lib/util.mjs";

const suites = [
  ["Frontend (vitest)", "npm", ["run", "test", "-w", "@myapp/client"]],
  ["Rust (cargo test)", "cargo", ["test", "--workspace"]],
];

let failed = 0;
for (const [label, cmd, args] of suites) {
  console.log(c.bold(c.cyan(`\n▶ ${label}`)));
  const { ok } = run(cmd, args, { allowFail: true });
  if (!ok) failed++;
}
console.log(failed ? c.red(`\n${failed} test suite(s) failed.`) : c.green("\nAll tests passed."));
process.exit(failed ? 1 : 0);
