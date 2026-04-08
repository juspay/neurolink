const {
  WebSocket: BrowserWebSocket,
  HTMLElement: BrowserHTMLElement,
  HTMLButtonElement: BrowserHTMLButtonElement,
  AudioContext: BrowserAudioContext,
  Blob: BrowserBlob,
  alert: browserAlert,
} = globalThis;

const socketProtocol =
  globalThis.location.protocol === "https:" ? "wss:" : "ws:";
const socketUrl = `${socketProtocol}//${globalThis.location.host}`;

/** @type {WebSocket | null} */
let socket = null;

const orb = document.getElementById("orb");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleBtn");

if (!(orb instanceof BrowserHTMLElement)) {
  throw new Error("Missing #orb element");
}
if (!(statusEl instanceof BrowserHTMLElement)) {
  throw new Error("Missing #status element");
}
if (!(toggleBtn instanceof BrowserHTMLButtonElement)) {
  throw new Error("Missing #toggleBtn element");
}

const orbEl = orb;
const statusNode = statusEl;
const toggleBtnEl = toggleBtn;

// Cobra VAD on the server requires 16kHz raw PCM
const CAPTURE_SAMPLE_RATE = 16000;

let isActive = false;

/* ---- PLAYBACK (TTS arrives as 24kHz raw PCM from server) ---- */

const playbackCtx = new BrowserAudioContext({ sampleRate: 24000 });
let playbackTime = 0;
/** @type {AudioBufferSourceNode[]} */
let activeSources = []; // track all scheduled sources so we can stop them on interrupt
let playbackCanceled = false;

/* ---- WEBSOCKET ---- */

/**
 * Create (or recreate) the WebSocket connection.
 * Called at page load and on every startConversation so the page
 * is recoverable after a disconnect.
 */
function connectSocket() {
  if (socket && socket.readyState <= BrowserWebSocket.OPEN) {
    return; // already connected or connecting
  }
  socket = new BrowserWebSocket(socketUrl);
  socket.binaryType = "blob";

  socket.onopen = () => {
    console.log("Connected");
    statusNode.textContent = "Connected";
  };
  /** @param {Event} e */
  socket.onerror = (e) => console.error("WS error", e);
  socket.onclose = () => {
    stopConversation();
    statusNode.textContent = "Disconnected";
  };

  socket.onmessage = onSocketMessage;
}

/* ---- INCOMING: TTS audio + control messages ---- */

/** @param {MessageEvent<string | Blob>} event */
async function onSocketMessage(event) {
  // JSON control message
  if (typeof event.data === "string") {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === "interrupt") {
      console.log("Interrupt — stopping playback");
      playbackCanceled = true;
      activeSources.forEach((s) => {
        try {
          s.stop(0);
        } catch {
          /* already stopped */
        }
      });
      activeSources = [];
      playbackTime = playbackCtx.currentTime;
      orbEl.className = isActive ? "listening" : "idle";
      statusNode.textContent = isActive ? "Listening..." : "Stopped.";
    }
    return;
  }

  // Binary: raw 16-bit PCM, 24kHz, mono
  if (!(event.data instanceof BrowserBlob)) {
    return;
  }

  orbEl.className = "speaking";
  statusNode.textContent = "Assistant speaking...";
  playbackCanceled = false;

  const arrayBuffer = await event.data.arrayBuffer();
  const pcm16 = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }

  const audioBuffer = playbackCtx.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);

  const source = playbackCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(playbackCtx.destination);

  const nowT = playbackCtx.currentTime;
  if (playbackTime < nowT) {
    playbackTime = nowT;
  }
  source.start(playbackTime);
  playbackTime += audioBuffer.duration;
  activeSources.push(source);

  source.onended = () => {
    activeSources = activeSources.filter((s) => s !== source);
    // When the last chunk finishes, notify server and reset UI.
    // Skip if playback was intentionally canceled (interrupt/stop) —
    // stale onended callbacks must not send playback_done mid-barge-in.
    if (
      !playbackCanceled &&
      activeSources.length === 0 &&
      playbackTime <= playbackCtx.currentTime + 0.05
    ) {
      if (socket && socket.readyState === BrowserWebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "playback_done" }));
      }
      orbEl.className = isActive ? "listening" : "idle";
      statusNode.textContent = isActive ? "Listening..." : "Stopped.";
    }
  };
}

// Connect immediately on page load
connectSocket();

/* ---- CAPTURE ---- */

/** @type {AudioContext | null} */
let captureCtx = null;
/** @type {ScriptProcessorNode | null} */
let scriptProcessor = null;
/** @type {MediaStream | null} */
let micStream = null;

async function startConversation() {
  try {
    // Ensure we have a live WebSocket (reconnects after previous disconnect)
    connectSocket();
    await playbackCtx.resume();

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    // Separate AudioContext at 16kHz — keeps capture and playback sample rates independent
    captureCtx = new BrowserAudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });
    const micSource = captureCtx.createMediaStreamSource(micStream);

    // 1024 samples = 64ms per callback; server splits into 512-sample Cobra frames
    scriptProcessor = captureCtx.createScriptProcessor(1024, 1, 1);
    scriptProcessor.onaudioprocess = (e) => {
      if (!isActive || !socket || socket.readyState !== BrowserWebSocket.OPEN) {
        return;
      }
      const input = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      socket.send(int16.buffer);
    };

    micSource.connect(scriptProcessor);
    // ScriptProcessor requires a destination in the graph to fire onaudioprocess,
    // but we must NOT route mic audio to speakers — that feeds back into the mic,
    // defeats browser AEC, and causes Soniox to transcribe TTS audio as user speech.
    // A zero-gain node keeps the graph alive while staying completely silent.
    const silentGain = captureCtx.createGain();
    silentGain.gain.value = 0;
    scriptProcessor.connect(silentGain);
    silentGain.connect(captureCtx.destination);

    isActive = true;
    orbEl.className = "listening";
    statusNode.textContent = "Listening...";
    toggleBtnEl.textContent = "Stop Conversation";
    toggleBtnEl.classList.add("active");
  } catch (err) {
    // Release any partially-initialized resources
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (captureCtx) {
      captureCtx.close();
      captureCtx = null;
    }
    isActive = false;
    console.error("Failed to start:", err);
    const message = err instanceof Error ? err.message : String(err);
    browserAlert("Error: " + message);
  }
}

function stopConversation() {
  isActive = false;
  playbackCanceled = true;
  activeSources.forEach((s) => {
    try {
      s.stop(0);
    } catch {
      /* already stopped */
    }
  });
  activeSources = [];
  playbackTime = playbackCtx.currentTime;
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (captureCtx) {
    captureCtx.close();
    captureCtx = null;
  }
  orbEl.className = "idle";
  statusNode.textContent = "Stopped.";
  toggleBtnEl.textContent = "Start Conversation";
  toggleBtnEl.classList.remove("active");
}

toggleBtnEl.onclick = async () => {
  if (!isActive) {
    await startConversation();
  } else {
    stopConversation();
  }
};
