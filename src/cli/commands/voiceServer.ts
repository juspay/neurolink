import type { CommandModule } from "yargs";
import type { VoiceServerArgs } from "../../lib/types/index.js";
import { startVoiceServer } from "../../lib/server/voice/voiceServerApp.js";
import { configureVoiceServerEnvironment } from "../../lib/server/voice/voiceWebSocketHandler.js";

export const voiceServerCommand: CommandModule<object, VoiceServerArgs> = {
  command: "voice-server",
  describe:
    "Start the real-time voice assistant server (Soniox STT + Cartesia TTS + Cobra VAD)",
  builder: (yargs) =>
    yargs.option("port", {
      alias: "p",
      type: "number",
      default: 3000,
      describe: "Port to listen on",
    }),
  handler: async (argv) => {
    configureVoiceServerEnvironment();
    await startVoiceServer(argv.port);
  },
};
