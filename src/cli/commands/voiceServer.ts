import type { CommandModule } from "yargs";
import type { VoiceServerArgs } from "../../lib/types/index.js";

/**
 * @deprecated Use `neurolink serve voice` instead. This top-level alias is
 * kept for one release for backwards compatibility and will be removed in a
 * future version. The voice server is now subsumed under the existing
 * `serve` infra command per CLAUDE.md's "everything via generate/stream/serve
 * only" contract.
 */
export const voiceServerCommand: CommandModule<object, VoiceServerArgs> = {
  command: "voice-server",
  describe:
    "[DEPRECATED — use 'neurolink serve voice'] Start the real-time voice assistant server",
  builder: (yargs) =>
    yargs.option("port", {
      alias: "p",
      type: "number",
      default: 3000,
      describe: "Port to listen on",
    }),
  handler: async (argv) => {
    console.warn(
      "[deprecation] 'neurolink voice-server' is deprecated. Use 'neurolink serve voice' instead. This alias will be removed in a future release.",
    );
    // Loaded lazily: voiceServerApp statically imports `express`, an
    // optionalDependency. A top-level import here puts it on the CLI's
    // always-loaded path, so `neurolink --help` crashes when optional
    // dependencies are absent. Mirrors `serve voice` in serve.ts.
    const { configureVoiceServerEnvironment } =
      await import("../../lib/server/voice/voiceWebSocketHandler.js");
    const { startVoiceServer } =
      await import("../../lib/server/voice/voiceServerApp.js");
    configureVoiceServerEnvironment();
    await startVoiceServer(argv.port);
  },
};
