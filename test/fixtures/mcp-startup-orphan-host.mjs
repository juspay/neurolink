// Host process for test/continuous-test-suite-mcp-stdio-lifecycle.ts.
//
// Points the built SDK at one stdio MCP server, waits until that server is in
// the state the suite is probing, then leaves the way the suite asked. The
// suite watches whether the server outlives this process.
//
//   node <fixture> <kind> <exit|sigterm> <work-dir>
//
// kind: what the server is doing when the host leaves
//   deaf                 never speaks MCP and ignores its stdin closing, like
//                        `npx -y <pkg>` while it is still downloading the
//                        package; the handshake is still pending
//   listening            never speaks MCP, but exits when its stdin closes
//   connected-listening  a connected MCP server that exits when its stdin closes
//   connected-busy       a connected MCP server that holds a timer, so its stdin
//                        closing does not end it
//   handshaking-busy     a busy server that has answered initialize but not
//                        tools/list, so the host leaves after connect() has
//                        returned and before the manager has recorded the client
//   closing-busy         a connected busy server that the host has started to
//                        shut down without awaiting; the host leaves once the
//                        server has seen its stdin close, so the SDK's close()
//                        is still waiting for the process to end
//   closing-stubborn     closing-busy with a server that also ignores SIGTERM
//
// how the host leaves
//   exit         process.exit(0), which runs no beforeExit handler
//   sigterm      sends itself SIGTERM and waits for the SDK's handler to end it
//
// Prints `CHILD <pid> alive=<true|false> ready=<true|false>` just before
// leaving.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [childKind, exitPath, workDir] = process.argv.slice(2);

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const pidFile = join(workDir, "child.pid");
const recordPid =
  'require("node:fs").writeFileSync(process.argv[1], String(process.pid));';
const serverFixture = join(fixtureDir, "mcp-stdio-lifecycle-server.mjs");
const serverArgs = {
  deaf: ["-e", `${recordPid} setInterval(() => {}, 1000);`, pidFile],
  listening: [
    "-e",
    `${recordPid} process.stdin.resume(); process.stdin.on("close", () => process.exit(0));`,
    pidFile,
  ],
  "connected-listening": [serverFixture, "serve", pidFile],
  "connected-busy": [serverFixture, "busy", pidFile],
  "handshaking-busy": [serverFixture, "stall-handshake", pidFile],
  "closing-busy": [serverFixture, "busy", pidFile],
  "closing-stubborn": [serverFixture, "stubborn", pidFile],
}[childKind];
const closing =
  childKind === "closing-busy" || childKind === "closing-stubborn";
const listingFile = `${pidFile}.listing`;
const eofFile = `${pidFile}.eof`;

writeFileSync(
  join(workDir, ".mcp-config.json"),
  JSON.stringify({
    mcpServers: {
      probe: {
        name: "probe",
        transport: "stdio",
        command: process.execPath,
        args: serverArgs,
      },
    },
  }),
);
process.chdir(workDir);

const dist = resolve(fixtureDir, "..", "..", "dist", "index.js");
const { NeuroLink } = await import(pathToFileURL(dist).href);
const sdk = new NeuroLink({ conversationMemory: { enabled: false } });

const awaitsConnection = childKind.startsWith("connected-") || closing;
let connected = false;
if (awaitsConnection) {
  const status = await sdk.getMCPStatus();
  connected = status.externalMCPConnectedCount > 0;
} else {
  void sdk.getMCPStatus().catch(() => {});
}
if (closing && connected) {
  void sdk.shutdownExternalMCPServers().catch(() => {});
}

const readChildPid = () => {
  try {
    return Number(readFileSync(pidFile, "utf8"));
  } catch {
    return 0;
  }
};
const waitingForHandshake = () =>
  childKind === "handshaking-busy" && !existsSync(listingFile);
const waitingForClose = () => closing && !existsSync(eofFile);
const deadline = Date.now() + 20_000;
while (
  (readChildPid() === 0 || waitingForHandshake() || waitingForClose()) &&
  Date.now() < deadline
) {
  await new Promise((resolveTick) => setTimeout(resolveTick, 50));
}
const childPid = readChildPid();
const childAlive = (() => {
  if (childPid <= 0) {
    return false;
  }
  try {
    process.kill(childPid, 0);
    return true;
  } catch {
    return false;
  }
})();
const ready =
  childPid > 0 &&
  (awaitsConnection ? connected : !waitingForHandshake()) &&
  !waitingForClose();
console.log(`CHILD ${childPid} alive=${childAlive} ready=${ready}`);

if (exitPath === "exit") {
  process.exit(0);
}
process.kill(process.pid, "SIGTERM");
// A SIGTERM handler that never ends the process leaves this exit as the only
// way out, which the suite reads as a failure through the exit code.
setTimeout(() => process.exit(3), 15_000);
