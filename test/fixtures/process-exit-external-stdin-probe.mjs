// Regression probe for test/continuous-test-suite-process-exit.ts.
//
// Reproduces the exact shape of an EXTERNAL SDK consumer: import this
// package's real public entry point (dist/index.js — the same thing
// `@juspay/neurolink` resolves to), then read process.stdin the plain way,
// with no SDK-specific helper call. `ensureStdinRef()` (src/cli/utils/
// stdinRef.ts) is CLI-only and not exported from the public surface, so an
// external script has no reason to know it should call anything before
// reading stdin — this previously just worked.
//
// externalServerManager.ts unrefs process.stdin as an import-time side
// effect (see its own comment for why). Without a safety net, that unref
// runs before this probe's own stdin listeners are attached, and an
// unref'd, otherwise-idle stdin handle can let the process's event loop go
// empty and exit before piped data ever arrives — silently, no error, exit
// code 0.
//
//   node <fixture> --mode data       process.stdin.on("data"/"end", ...)
//   node <fixture> --mode forawait   for await (const chunk of process.stdin)
//
// Prints:
//   PROBE READY               listeners attached, safe to write to stdin now
//   GOT DATA: <json string>   the exact payload the probe received
//   script end reached
import { NeuroLink } from "../../dist/index.js";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const mode = flag("--mode", "data");

// Not required to trigger the regression (the unref is a pure import-time
// side effect, above), but a real external consumer typically does
// construct an instance — included so this probe matches actual usage
// rather than only the narrowest possible repro.
void new NeuroLink();

if (mode === "forawait") {
  console.log("PROBE READY");
  let data = "";
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  console.log(`GOT DATA: ${JSON.stringify(data)}`);
} else {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    data += chunk;
  });
  await new Promise((resolve) => {
    process.stdin.on("end", () => {
      console.log(`GOT DATA: ${JSON.stringify(data)}`);
      resolve();
    });
    // Printed only once both listeners are actually attached, so the suite
    // never writes before this probe is ready to receive.
    console.log("PROBE READY");
  });
}

console.log("script end reached");
