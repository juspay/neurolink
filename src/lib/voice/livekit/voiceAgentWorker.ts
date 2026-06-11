/**
 * LiveKit Agents worker launcher.
 *
 * Registers a worker with the LiveKit server (Cloud or self-hosted) for the
 * given agent entry file. LiveKit dispatches one Job per room, each running in
 * its own process, which provides worker-per-call isolation and horizontal
 * scaling. Connection settings are resolved from the environment.
 *
 * `@livekit/agents` is an optional dependency, imported dynamically.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import {
  resolveEouTurnDetection,
  resolveLiveKitServerConfig,
} from "./config.js";
import type { LiveKitWorkerLaunchOptions } from "../../types/index.js";

const DEFAULT_AGENT_NAME = "neurolink-voice";
const EOU_METHOD_MULTILINGUAL = "lk_end_of_utterance_multilingual";

/**
 * Register the English EOU inference runner in the worker process.
 *
 * Must run before `cli.runApp`: the worker only spawns the shared inference
 * executor when `InferenceRunner.registeredRunners` is non-empty at startup,
 * and passes that registry to the executor process. Importing the plugin
 * registers both English and multilingual runners, so we delete multilingual to
 * keep only the English model loaded.
 */
async function registerEouTurnDetectorRunner(): Promise<void> {
  const { InferenceRunner } = await import("@livekit/agents");
  // Importing the plugin's turn-detector module triggers registerRunner().
  await import("@livekit/agents-plugin-livekit");
  delete InferenceRunner.registeredRunners[EOU_METHOD_MULTILINGUAL];
}

/**
 * Launch the LiveKit voice agent worker.
 *
 * Call from a small runner script; `agentFile` must point to the file whose
 * default export is the result of `defineVoiceAgent`.
 *
 * ```ts
 * await startVoiceAgentWorker({
 *   agentFile: new URL("./voice-agent-entry.js", import.meta.url).pathname,
 *   agentName: "neurolink-voice",
 * });
 * ```
 */
export async function startVoiceAgentWorker(
  options: LiveKitWorkerLaunchOptions,
): Promise<void> {
  const server = resolveLiveKitServerConfig();
  const { cli, WorkerOptions } = await import("@livekit/agents");

  if (resolveEouTurnDetection().enabled) {
    await registerEouTurnDetectorRunner();
  }

  cli.runApp(
    new WorkerOptions({
      agent: options.agentFile,
      agentName: options.agentName ?? DEFAULT_AGENT_NAME,
      wsURL: server.url,
      apiKey: server.apiKey,
      apiSecret: server.apiSecret,
    }),
  );
}
