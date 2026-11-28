// Runs every SDK-overhead benchmark, each in a fresh Node process, and prints
// one JSON report. Needs a build first (`pnpm run build`).
//   node benchmarks/sdk-overhead/run.mjs [--calls 200] [--runs 3] [--dist <path>]
import { execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { startMockServer } from "./mock-server.mjs";

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const calls = flag("calls", "200");
const runs = Number(flag("runs", "3"));
// A file URL, not a path: import() takes URLs, and a Windows path or a path
// with "#" would not resolve as one.
const dist = pathToFileURL(
  path.resolve(flag("dist", path.join(here, "..", "..", "dist", "index.js"))),
).href;

const server = await startMockServer();
// Only what the benchmark needs: no real provider keys reach the child, so
// nothing can fall through to a paid API.
const env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  OPENAI_COMPATIBLE_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
  OPENAI_COMPATIBLE_API_KEY: "mock",
  OPENAI_COMPATIBLE_MODEL: "mock-model",
};

async function child(script, args, nodeFlags = []) {
  const { stdout } = await run(
    process.execPath,
    [...nodeFlags, path.join(here, script), dist, ...args],
    { env, maxBuffer: 16 * 1024 * 1024 },
  );
  const lastLine = stdout.trim().split("\n").at(-1);
  return JSON.parse(lastLine);
}

const report = {
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  generate: [],
  stream: [],
};
for (let i = 0; i < runs; i++) {
  report.generate.push(
    await child("call-bench.mjs", [calls, "generate"], ["--expose-gc"]),
  );
  report.stream.push(
    await child("call-bench.mjs", [calls, "stream"], ["--expose-gc"]),
  );
}
report.modules = await child("import-modules.mjs", []);
report.cpuHelpers = await child("cpu-helpers.mjs", []);

server.close();
console.log(JSON.stringify(report, null, 2));
