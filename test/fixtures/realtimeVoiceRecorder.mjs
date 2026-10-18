// Child process for test/continuous-test-suite-realtime-voice.ts.
//
// Builds the realtime model through the package's shipped `./livekit` entry with
// both LiveKit plugins replaced by stand-ins that only record the options they
// were constructed with. That is the one place the options handed to a plugin
// can be read exactly, including keys whose value is `undefined` (JSON drops
// those, `Object.keys` does not). A plugin treats such a key as "set to
// nothing" and skips its own default, which for `baseURL` means falling back to
// OPENAI_BASE_URL or api.openai.com, so the distinction is load-bearing.
//
// With REALTIME_RECORDER_AGENT set (a JSON object of `defineRealtimeVoiceAgent`
// options) the child instead runs the agent entry against a fake job context,
// so the config the entry merged from those options and the environment can be
// read at the point where the entry hands it to the model factory. The fake
// room accepts every listener until the event bridge subscribes to data
// packets, which comes right after the model is built, and stops there. The
// call memory setup is replaced too, by a stand-in that records what the entry
// hands it (the model and the backend) and reports no memory for the call.
//
// The stand-ins are served from data: URLs by a resolve hook, so nothing here
// touches the network or the real plugins. The result is one JSON line on
// stdout, prefixed with RESULT.
import { register } from "node:module";

const PLUGIN_STANDINS = {
  "@livekit/agents-plugin-xai": "xai",
  "@livekit/agents-plugin-google": "google",
};

function standinSource(plugin) {
  return [
    "export const realtime = { RealtimeModel: class {",
    "  constructor(options) {",
    `    console.log("RECORDED " + JSON.stringify({ plugin: ${JSON.stringify(plugin)}, keys: Object.keys(options), options }));`,
    "  }",
    '  label() { return "recorded"; }',
    '  get model() { return ""; }',
    "  async close() {}",
    "} };",
  ].join("\n");
}

const MEMORY_STANDIN = [
  "export async function setUpRealtimeCallMemory(ctx, config, call) {",
  '  console.log("MEMORY_CALL " + JSON.stringify({ call }));',
  "  return undefined;",
  "}",
  // The agent also imports the tracing-only recorder for calls without memory;
  // like the real one with tracing off, it returns no recorder.
  "export function setUpRealtimeCallTracing() {",
  "  return undefined;",
  "}",
].join("\n");

const hooks = [
  `const memorySource = ${JSON.stringify(MEMORY_STANDIN)};`,
  `const standins = ${JSON.stringify(PLUGIN_STANDINS)};`,
  `const sources = ${JSON.stringify(
    Object.fromEntries(
      Object.entries(PLUGIN_STANDINS).map(([name, plugin]) => [
        name,
        standinSource(plugin),
      ]),
    ),
  )};`,
  "export async function resolve(specifier, context, nextResolve) {",
  "  if (Object.hasOwn(standins, specifier)) {",
  '    return { url: "data:text/javascript," + encodeURIComponent(sources[specifier]), shortCircuit: true };',
  "  }",
  '  if (specifier === "./realtimeMemory.js" && String(context.parentURL).endsWith("/voice/livekit/realtimeVoiceAgent.js")) {',
  '    return { url: "data:text/javascript," + encodeURIComponent(memorySource), shortCircuit: true };',
  "  }",
  "  return nextResolve(specifier, context);",
  "}",
].join("\n");

register("data:text/javascript," + encodeURIComponent(hooks));

const livekit = await import("../../dist/voice/livekit/index.js");

const recorded = [];
const memoryCalls = [];
const originalLog = console.log;
console.log = (...args) => {
  const first = args[0];
  if (typeof first === "string" && first.startsWith("RECORDED ")) {
    recorded.push(JSON.parse(first.slice("RECORDED ".length)));
    return;
  }
  if (typeof first === "string" && first.startsWith("MEMORY_CALL ")) {
    memoryCalls.push(JSON.parse(first.slice("MEMORY_CALL ".length)));
    return;
  }
  originalLog(...args);
};

const STOP = "stop-at-the-event-bridge";

async function runAgentEntry(overrides) {
  const { RoomEvent } = await import("@livekit/rtc-node");
  const room = {
    name: "stub-room",
    metadata: "",
    remoteParticipants: new Map(),
    on: (event) => {
      if (event === RoomEvent.DataReceived) {
        throw new Error(STOP);
      }
    },
  };
  const ctx = {
    room,
    connect: async () => undefined,
    shutdown: () => undefined,
    addShutdownCallback: () => undefined,
  };
  try {
    await livekit.defineRealtimeVoiceAgent(overrides).entry(ctx);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== STOP) {
      throw error;
    }
    return;
  }
  throw new Error("the agent entry returned before reaching the event bridge");
}

let outcome;
try {
  if (process.env.REALTIME_RECORDER_AGENT !== undefined) {
    await runAgentEntry(JSON.parse(process.env.REALTIME_RECORDER_AGENT));
  } else {
    const config = livekit.resolveRealtimeVoiceConfig();
    await livekit.createRealtimeLlm(config);
  }
  outcome = { ok: true, recorded, memoryCalls };
} catch (error) {
  outcome = {
    ok: false,
    recorded,
    memoryCalls,
    message: error instanceof Error ? error.message : String(error),
  };
}
originalLog("RESULT " + JSON.stringify(outcome));
