// Host process for test/continuous-test-suite-mcp-stdio-lifecycle.ts.
//
// Points the built SDK at one stdio MCP server that never speaks MCP, waits
// until that server is running (so its handshake is still pending), then
// leaves the way the suite asked. The suite watches whether the server
// outlives this process.
//
//   node <fixture> <deaf|listening> <exit|sigterm> <work-dir>
//
//   deaf       ignores its stdin closing, like `npx -y <pkg>` while it is
//              still downloading the package
//   listening  exits when its stdin closes, like a running MCP server
//   exit       process.exit(0), which runs no beforeExit handler
//   sigterm    sends itself SIGTERM and waits for the SDK's handler to end it
//
// Prints `CHILD <pid> alive=<true|false>` just before leaving.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [childKind, exitPath, workDir] = process.argv.slice(2);

const recordPid =
  'require("node:fs").writeFileSync(process.argv[1], String(process.pid));';
const childBody = {
  deaf: `${recordPid} setInterval(() => {}, 1000);`,
  listening: `${recordPid} process.stdin.resume(); process.stdin.on("close", () => process.exit(0));`,
}[childKind];
const pidFile = join(workDir, "child.pid");

writeFileSync(
  join(workDir, ".mcp-config.json"),
  JSON.stringify({
    mcpServers: {
      probe: {
        name: "probe",
        transport: "stdio",
        command: process.execPath,
        args: ["-e", childBody, pidFile],
      },
    },
  }),
);
process.chdir(workDir);

const dist = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "index.js",
);
const { NeuroLink } = await import(pathToFileURL(dist).href);
const sdk = new NeuroLink({ conversationMemory: { enabled: false } });
void sdk.getMCPStatus().catch(() => {});

const readChildPid = () => {
  try {
    return Number(readFileSync(pidFile, "utf8"));
  } catch {
    return 0;
  }
};
const deadline = Date.now() + 20_000;
while (readChildPid() === 0 && Date.now() < deadline) {
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
console.log(`CHILD ${childPid} alive=${childAlive}`);

if (exitPath === "exit") {
  process.exit(0);
}
process.kill(process.pid, "SIGTERM");
// A SIGTERM handler that never ends the process leaves this exit as the only
// way out, which the suite reads as a failure through the exit code.
setTimeout(() => process.exit(3), 15_000);
