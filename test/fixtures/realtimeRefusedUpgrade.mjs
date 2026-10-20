// Child process for test/continuous-test-suite-realtime-voice.ts: the xai model
// the shipped factory builds, opened as a session against a server that refuses
// the WebSocket upgrade with HTTP 400, the way xAI answers a wrong key.
//
// The LiveKit plugin opens its socket with no 'error' listener, so the refusal
// reaches Node as an uncaught exception, which ends a process that has no
// handler for it. A child lets that happen without ending the suite. It installs
// a handler, as a worker's process guards do, so that what it reports is what
// the session did with the crash before the handler ran: the 'error' events the
// session emitted. The result is one JSON line on stdout, prefixed with RESULT.
import { initializeLogger } from "@livekit/agents";

const livekit = await import("../../dist/voice/livekit/index.js");
initializeLogger({ pretty: false, level: "silent" });

const uncaught = [];
process.on("uncaughtException", (error) => {
  uncaught.push(error instanceof Error ? error.message : String(error));
});

const monitorsBefore = process.listenerCount("uncaughtExceptionMonitor");
const model = await livekit.createRealtimeLlm(
  livekit.resolveRealtimeVoiceConfig(),
);
const session = model.session();
const monitorsWhileWaiting = process.listenerCount("uncaughtExceptionMonitor");

const errors = [];
session.on("error", (event) => {
  errors.push({
    type: event.type,
    recoverable: event.recoverable,
    label: event.label,
    message: event.error instanceof Error ? event.error.message : null,
  });
});

// A crash that has nothing to do with the connection, while it is still being
// made, must not be taken for the refusal.
process.emit(
  "uncaughtExceptionMonitor",
  new Error("something else entirely"),
  "uncaughtException",
);
const errorsAfterUnrelatedCrash = errors.length;

const deadline = Date.now() + 8000;
while (errors.length === 0 && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

console.log(
  "RESULT " +
    JSON.stringify({
      errors,
      errorsAfterUnrelatedCrash,
      uncaught,
      monitorsBefore,
      monitorsWhileWaiting,
      monitorsAfter: process.listenerCount("uncaughtExceptionMonitor"),
    }),
);
process.exit(0);
