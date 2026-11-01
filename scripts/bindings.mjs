#!/usr/bin/env node
// Regenerate (or verify) the ts-rs TypeScript bindings in apps/client/src/bindings.
//
//   npm run bindings              # regenerate
//   npm run bindings -- --check   # fail if the committed bindings are stale
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CLIENT_DIR, c, run } from "./lib/util.mjs";

const BINDINGS = path.join(CLIENT_DIR, "src", "bindings");
const check = process.argv.includes("--check");
const listTs = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .toSorted();

// ts-rs emits one `export_bindings_*` test per exported type.
const cargoArgs = ["test", "--workspace", "--quiet", "export_bindings"];

if (!check) {
  run("cargo", cargoArgs);
  console.log(c.green(`Bindings written to ${path.relative(process.cwd(), BINDINGS)}`));
  process.exit(0);
}

const tmp = mkdtempSync(path.join(tmpdir(), "ts-rs-"));
try {
  run("cargo", cargoArgs, { env: { TS_RS_EXPORT_DIR: tmp } });
  const expected = listTs(tmp);
  const actual = listTs(BINDINGS);
  const problems = [
    ...expected.filter((f) => !actual.includes(f)).map((f) => `missing: ${f}`),
    ...actual.filter((f) => !expected.includes(f)).map((f) => `stale: ${f}`),
    ...expected
      .filter((f) => actual.includes(f))
      .filter(
        (f) =>
          readFileSync(path.join(tmp, f), "utf8") !== readFileSync(path.join(BINDINGS, f), "utf8"),
      )
      .map((f) => `outdated: ${f}`),
  ];
  if (problems.length) {
    console.error(c.red("TypeScript bindings are out of date:"));
    for (const p of problems) console.error(`  ${p}`);
    console.error(c.cyan("Run `npm run bindings` and commit the result."));
    process.exit(1);
  }
  console.log(c.green(`Bindings up to date (${expected.length} files).`));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
