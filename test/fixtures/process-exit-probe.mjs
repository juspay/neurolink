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
