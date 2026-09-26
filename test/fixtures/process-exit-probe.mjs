// Process-exit-lifecycle fixture for
// test/continuous-test-suite-process-exit.ts.
//
// Runs as a real, standalone Node process (spawned by the suite, never
// imported) so the suite can observe what the SDK's caller can actually
// observe from the outside: whether the OS process exits on its own, and
// whether it responds to SIGTERM — neither of which can be tested from
// inside the suite's own long-lived process.
//
// Deliberately mirrors the team's own bug-report repro scripts
// (node_modules/.probe/exit-test.mjs and dispose-test.mjs) rather than
// inventing a new shape: real NeuroLink instance, real generate() call with
// a tool, real live provider. This exercises the exact code paths that were
// leaking — MCP auto-discovery via the repo's own .mcp-config.json, tool
// discovery, the MCP circuit breaker, and ExternalServerManager's health
// monitor — which a purely offline test (e.g. driving ExternalServerManager
// directly against a local fixture server) would not touch.
//
//   node <fixture> --provider <id> --model <id>              no shutdown() call
//   node <fixture> --provider <id> --model <id> --shutdown   calls nl.shutdown()
//   node <fixture> --provider <id> --model <id> --host-signal-handler
//       registers a host SIGTERM handler BEFORE constructing NeuroLink, the
//       way an application embedding the SDK would, and counts how many times
//       that handler runs. This is what makes the re-raise gate observable:
//       Node delivers a signal to every listener, so the host handler runs
//       once for the real delivery — and a second time if the SDK re-raises
//       into a host that is still listening.
//   node <fixture> --provider <id> --model <id> --host-once-handler
//       the same idea for the ONE-SHOT shape, which is the common way an
//       application writes a graceful shutdown: process.once("SIGTERM", ...)
//       with an async drain. Node removes a once-listener as it dispatches to
//       it, so any listener count read after that point is zero even though
//       the host exists and is still draining. A gate that reads the count
//       late therefore re-raises and kills the host mid-drain — this mode
//       prints a marker only if the drain was allowed to finish.
//   node <fixture> --provider <id> --model <id> --signal-exit-active
//       activates a real signal-exit@4 listener BEFORE constructing
//       NeuroLink, the way this package's own `ora` spinners do at runtime
//       through cli-cursor -> restore-cursor -> signal-exit. cli-cursor only
//       calls restoreCursor() when its stream isTTY, which a piped probe
//       never is, so this loads and calls signal-exit's own onExit() the
//       same way that chain would with a real terminal, rather than relying
//       on a pty to reach it indirectly. signal-exit is not a direct
//       dependency of this package, so it's resolved through ora's own
//       dependency chain instead of assumed reachable from here.
//
//       Also starts a plain, never-cleared setInterval standing in for a
//       real ora spinner's own render loop (Ora#start() sets exactly this —
//       an interval it only clears on spinner.stop() — but, like
//       restoreCursor, no-ops entirely off a non-TTY stream, so a literal
//       ora instance here would activate neither piece). Without either the
//       SDK's cleanup (which never touches this timer) or a real signal
//       delivery, nothing else would end this process — which is what makes
//       the re-raise gate this fixture exercises the only thing that can
//       still terminate it.
//
// Prints line-oriented markers the suite greps for as PRECONDITIONS before
// it trusts any exit-code/signal observation:
//   WORK COMPLETED: <content>
//   shutdown() returned
//   script end reached
//   HOST HANDLER FIRED <n>      once per delivery to the host handler
//   HOST HANDLER TOTAL <n>      final count, printed just before the host exits
//   HOST ONCE START             the one-shot host handler began its drain
//   HOST ONCE DRAINED           the drain ran to completion without being killed
//   HOST SIGTERM LISTENERS <n>  listeners still registered after the delivery;
//                               2 means the SDK kept its cleanup listener
import "dotenv/config";
import { cpSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { NeuroLink, tool } from "../../dist/index.js";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const provider = flag("--provider") ?? "groq";
const model = flag("--model") ?? "openai/gpt-oss-120b";
const callShutdown = args.includes("--shutdown");
const hostSignalHandler = args.includes("--host-signal-handler");
const hostOnceHandler = args.includes("--host-once-handler");
const signalExitActive = args.includes("--signal-exit-active");
const signalExitDuplicate = args.includes("--signal-exit-duplicate");

// Load and activate signal-exit@4 the way this package's own `ora` spinners
// do at runtime (ora -> cli-cursor -> restore-cursor -> signal-exit), BEFORE
// constructing NeuroLink — matching how an embedding CLI session with a live
// spinner would already have it loaded by the time the SDK installs its own
// signal handlers. signal-exit is not a direct dependency of this package,
// so it's resolved through ora's own node_modules chain via require.resolve
// rather than assumed reachable from this file.
if (signalExitActive) {
  const require = createRequire(import.meta.url);
  const oraEntry = require.resolve("ora");
  const cliCursorEntry = require.resolve("cli-cursor", {
    paths: [dirname(oraEntry)],
  });
  const restoreCursorEntry = require.resolve("restore-cursor", {
    paths: [dirname(cliCursorEntry)],
  });
  const signalExitEntry = require.resolve("signal-exit", {
    paths: [dirname(restoreCursorEntry)],
  });
  const { onExit } = await import(signalExitEntry);
  // Mirrors restore-cursor's own call shape (a no-op callback is enough to
  // load signal-exit and register its listeners; restoring the cursor itself
  // is irrelevant to this probe).
  onExit(() => {}, { alwaysLast: true });
  console.log(
    `SIGNAL-EXIT ACTIVE listeners=${process.listenerCount("SIGTERM")}`,
  );

  // Stand-in for Ora#start()'s own `#id = setInterval(this.render.bind(this),
  // this.interval)` — a plain, ref'd interval with no relationship to
  // anything the SDK cleans up. Never cleared here (a spinner left spinning
  // past the point its caller stopped tracking it), so the only way this
  // process can end at all is a real signal delivery reaching Node's default
  // disposition — proving the re-raise gate itself, not a side effect of
  // some other handle draining.
  setInterval(() => {}, 200);
  console.log("SPINNER INTERVAL ACTIVE");
}

// Two DISTINCT resolved copies of signal-exit@4 loaded from two different
// paths on disk — simulating what two transitive dependencies pinning
// non-overlapping signal-exit@4.x ranges would produce (pnpm/npm only dedupe
// identical resolved versions, so this is a real, not synthetic, host
// dependency-tree shape). Each copy is its own module instance with its own
// `#loaded` state, so each independently calls `load()` on the shared,
// globalThis-singleton emitter: the emitter's `count` becomes 2, and each
// copy also registers its own real listener for the signal, so
// `process.listenerCount("SIGTERM")` includes both. The gate has to discount
// the emitter's full count, not clamp it to at most one, or the second
// real signal-exit listener is miscounted as a host's own and the SDK
// silently declines to re-raise — reproducing the original defect this file
// exists to fix.
if (signalExitDuplicate) {
  const require = createRequire(import.meta.url);
  const oraEntry = require.resolve("ora");
  const cliCursorEntry = require.resolve("cli-cursor", {
    paths: [dirname(oraEntry)],
  });
  const restoreCursorEntry = require.resolve("restore-cursor", {
    paths: [dirname(cliCursorEntry)],
  });
  const signalExitEntry = require.resolve("signal-exit", {
    paths: [dirname(restoreCursorEntry)],
  });
  // signalExitEntry resolves to .../signal-exit/dist/cjs/index.js; walk up
  // to the package root so the whole resolved package (not just one file)
  // gets copied, then re-derive the same relative entry path under each copy.
  const packageRoot = dirname(dirname(dirname(signalExitEntry)));
  const relativeEntry = signalExitEntry.slice(packageRoot.length + 1);

  const tmpBase = mkdtempSync(join(tmpdir(), "nl-signal-exit-dup-"));
  const copyDirs = [join(tmpBase, "copy1"), join(tmpBase, "copy2")];
  for (const dest of copyDirs) {
    cpSync(packageRoot, dest, { recursive: true });
  }

  for (const dest of copyDirs) {
    const { onExit } = await import(join(dest, relativeEntry));
    onExit(() => {}, { alwaysLast: true });
  }

  console.log(
    `SIGNAL-EXIT DUPLICATE listeners=${process.listenerCount("SIGTERM")}`,
  );

  // Same rationale as the SPINNER INTERVAL ACTIVE case above: nothing else
  // must be able to end this process, so the re-raise gate is the only
  // thing under test.
  setInterval(() => {}, 200);
  console.log("SPINNER INTERVAL ACTIVE");
}

// A host that drains gracefully using the one-shot idiom. Registered before
// NeuroLink so the ordering matches a real embedding application. Node removes
// this listener while dispatching to it, which is precisely what makes a
// listener count read after dispatch misleading.
if (hostOnceHandler) {
  process.once("SIGTERM", async () => {
    console.log("HOST ONCE START");
    // Stand-in for a real drain: flush, close servers, await in-flight work.
    await new Promise((resolve) => setTimeout(resolve, 6000));
    console.log("HOST ONCE DRAINED");
    process.exit(0);
  });
}

// Registered BEFORE NeuroLink so the host's listener is installed first, which
// is the ordering an embedding application produces and the one the re-raise
// gate has to respect.
if (hostSignalHandler) {
  let fires = 0;
  process.on("SIGTERM", () => {
    fires += 1;
    console.log(`HOST HANDLER FIRED ${fires}`);
    // How many SIGTERM listeners survive the delivery. The SDK must keep its
    // own registered when a host owns the signal: the install guard is a
    // one-shot latch, so a listener dropped here is never reinstalled and
    // every manager constructed afterwards silently loses signal cleanup.
    // Reported from inside the probe because process listener state is the
    // thing that actually differs, and a host can observe it exactly this way.
    setTimeout(() => {
      console.log(`HOST SIGTERM LISTENERS ${process.listenerCount("SIGTERM")}`);
    }, 2000);
    if (fires === 1) {
      // A host that drains gracefully rather than dying instantly. The delay
      // is what gives the SDK's cleanup time to settle and — before the gate —
      // to re-raise back into this same handler, so a second delivery is
      // observable rather than racing the exit.
      setTimeout(() => {
        console.log(`HOST HANDLER TOTAL ${fires}`);
        process.exit(0);
      }, 6000);
    }
  });
}

const nl = new NeuroLink();
const result = await nl.generate({
  input: { text: "say hi" },
  provider,
  model,
  maxTokens: 30,
  tools: {
    ping: tool({
      description: "ping",
      inputSchema: z.object({}),
      execute: async () => ({ ok: true }),
    }),
  },
});
console.log(
  `WORK COMPLETED: ${JSON.stringify((result.content ?? "").slice(0, 40))}`,
);

if (callShutdown) {
  await nl.shutdown?.();
  console.log("shutdown() returned");
}

console.log("script end reached");
