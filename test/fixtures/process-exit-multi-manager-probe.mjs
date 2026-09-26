// Cross-manager shutdown-concurrency probe for
// test/continuous-test-suite-process-exit.ts.
//
// Constructs several separate ExternalServerManager instances — the same
// class this package re-exports from its public entry point, imported here
// exactly the way an external consumer would (dist/index.js, no internal
// import) — each wired to a stdio MCP server that deliberately takes
// --delay-ms to exit after SIGTERM
// (test/fixtures/mcp-slow-shutdown-server.mjs). Every ExternalServerManager
// registers itself with the SDK's shared, process-level SIGTERM/SIGINT/
// beforeExit cleanup set purely by being constructed (see
// registerManagerForProcessCleanup in externalServerManager.ts). This probe
// never calls shutdown() itself, so the only thing that can end it is that
// same shared signal path the suite is testing — cleanupLiveManagers().
//
//   node <fixture> --count <n> --delay-ms <ms>
//
// Prints:
//   MANAGER <i> CONNECTED
//   ALL CONNECTED
//   script end reached
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ExternalServerManager } from "../../dist/index.js";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const count = Number(flag("--count", "4"));
const delayMs = Number(flag("--delay-ms", "400"));

const SERVER_FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "mcp-slow-shutdown-server.mjs",
);

for (let i = 0; i < count; i++) {
  const manager = new ExternalServerManager({ maxServers: 5 });
  const serverId = `slow-shutdown-${process.pid}-${i}`;
  const result = await manager.addServer(serverId, {
    id: serverId,
    name: serverId,
    description: "slow shutdown fixture",
    transport: "stdio",
    status: "initializing",
    tools: [],
    command: process.execPath,
    args: [SERVER_FIXTURE, String(delayMs)],
  });
  if (!result.success) {
    console.error(`MANAGER ${i} FAILED TO CONNECT: ${JSON.stringify(result)}`);
    process.exit(1);
  }
  console.log(`MANAGER ${i} CONNECTED`);
}

console.log("ALL CONNECTED");
console.log("script end reached");
