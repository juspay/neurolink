// Times one fresh process: importing dist/index.js, then generate() or
// stream() against the mock server. Run it through run.mjs, which starts the
// mock server and sets OPENAI_COMPATIBLE_* for this process.
//   node --expose-gc call-bench.mjs <dist/index.js> <calls> <generate|stream>
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const [distArg, callsArg = "200", mode = "generate"] = process.argv.slice(2);
const distUrl = distArg.startsWith("file:")
  ? distArg
  : pathToFileURL(path.resolve(distArg)).href;
const calls = Number(callsArg);
const CONCURRENT = 50;
const WARMUP = 20;

const cpuMs = (since) => {
  const u = process.cpuUsage(since);
  return (u.user + u.system) / 1000;
};
const rssMB = () => process.memoryUsage().rss / 1048576;

const importCpu = process.cpuUsage();
const importStart = performance.now();
const { NeuroLink } = await import(distUrl);
const importResult = {
  ms: performance.now() - importStart,
  cpuMs: cpuMs(importCpu),
  rssMB: rssMB(),
};

const constructCpu = process.cpuUsage();
const constructStart = performance.now();
const neurolink = new NeuroLink();
const constructResult = {
  ms: performance.now() - constructStart,
  cpuMs: cpuMs(constructCpu),
  rssMB: rssMB(),
};

async function one() {
  const options = {
    input: { text: "hello" },
    provider: "openai-compatible",
    model: "mock-model",
    disableTools: true,
  };
  if (mode === "stream") {
    const result = await neurolink.stream(options);
    for await (const _ of result.stream) {
      // Drain every chunk, as a caller would.
    }
    return;
  }
  await neurolink.generate(options);
}

const firstCpu = process.cpuUsage();
const firstStart = performance.now();
await one();
const firstCall = {
  ms: performance.now() - firstStart,
  cpuMs: cpuMs(firstCpu),
};

for (let i = 0; i < WARMUP; i++) {
  await one();
}
global.gc?.();
const rssWarmMB = rssMB();

const latencies = [];
const seqCpu = process.cpuUsage();
const seqStart = performance.now();
for (let i = 0; i < calls; i++) {
  const start = performance.now();
  await one();
  latencies.push(performance.now() - start);
}
const seqWall = performance.now() - seqStart;
const seqCpuMs = cpuMs(seqCpu);
latencies.sort((a, b) => a - b);

const concCpu = process.cpuUsage();
const concStart = performance.now();
await Promise.all(Array.from({ length: CONCURRENT }, one));
const concurrent = {
  calls: CONCURRENT,
  wallMs: performance.now() - concStart,
  cpuMs: cpuMs(concCpu),
  rssMB: rssMB(),
};

global.gc?.();
console.log(
  JSON.stringify({
    mode,
    calls,
    import: importResult,
    construct: constructResult,
    firstCall,
    rssWarmMB,
    perCall: {
      cpuMs: seqCpuMs / calls,
      p50Ms: latencies[calls >> 1],
      p95Ms: latencies[Math.floor(calls * 0.95)],
      callsPerSecond: calls / (seqWall / 1000),
    },
    concurrent,
    end: {
      rssMB: rssMB(),
      heapMB: process.memoryUsage().heapUsed / 1048576,
    },
  }),
);
process.exit(0);
