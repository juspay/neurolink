// Regression probe for test/continuous-test-suite-process-exit.ts.
//
// Reproduces a consumer that is ALREADY reading process.stdin when it first
// imports this package: a stdio MCP server that connects its transport (which
// attaches a "data" listener) and only later lazy-imports @juspay/neurolink,
// e.g. to warm an embedding provider in the background.
//
// externalServerManager.ts unrefs process.stdin as an import-time side effect
// and re-refs it only for "data"/"readable" listeners registered afterwards.
// A listener that was attached before the import never triggers that safety
// net, so without a guard the unref leaves nothing holding the event loop and
// the process exits right after the import — silently, exit code 0, while its
// peer still has the pipe open.
//
//   node <fixture>
//
// Prints:
//   PROBE READY               listener attached AND package imported
//   GOT DATA: <json string>   the exact payload the probe received
//   script end reached
let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  data += chunk;
});
const ended = new Promise((resolve) => {
  process.stdin.on("end", resolve);
});

// Dynamic, after the listeners: the import order is the whole point. No
// NeuroLink instance is constructed — the unref is a pure import-time side
// effect, and an instance could hold the loop open and mask the regression.
await import("../../dist/index.js");
console.log("PROBE READY");

await ended;
console.log(`GOT DATA: ${JSON.stringify(data)}`);
console.log("script end reached");
