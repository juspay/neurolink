// Simple voice demo client
let ws;
let isRecording = false;
let mediaStream;
let inputSource;
let processor;

const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const flushBtn = document.getElementById('flushBtn');

const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
const inputGain = inputCtx.createGain();
const outputGain = outputCtx.createGain();
outputGain.connect(outputCtx.destination);

let outNextStartTime = 0;

const inMeter = document.getElementById('inMeter');
const outMeter = document.getElementById('outMeter');
const inCtx = inMeter.getContext('2d');
const outCtx = outMeter.getContext('2d');

function log(msg) {
  statusEl.textContent += `\n${new Date().toLocaleTimeString()} ${msg}`;
  statusEl.scrollTop = statusEl.scrollHeight;
}

function drawMeter(ctx, canvas, level) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#22c55e';
  const width = Math.max(1, Math.min(w, level * w));
  ctx.fillRect(0, 0, width, h);
}

function floatTo16BitPCM(float32) {
  const len = float32.length;
  const buf = new ArrayBuffer(len * 2);
  const view = new DataView(buf);
  for (let i = 0; i < len; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

async function decodePCM16ToAudioBuffer(pcm16ArrayBuffer, sampleRate, channels) {
  const bytes = new Uint8Array(pcm16ArrayBuffer);
  const dataInt16 = new Int16Array(bytes.buffer);
  const len = dataInt16.length;
  const dataFloat32 = new Float32Array(len);
  for (let i = 0; i < len; i++) dataFloat32[i] = dataInt16[i] / 32768.0;

  const buffer = outputCtx.createBuffer(channels, len / channels, sampleRate);
  if (channels === 1) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let ch = 0; ch < channels; ch++) {
      const channel = dataFloat32.filter((_, idx) => idx % channels === ch);
      buffer.copyToChannel(Float32Array.from(channel), ch);
    }
  }
  return buffer;
}

function setupWebSocket() {
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    log('WS connected');
    flushBtn.disabled = false;
  };
  ws.onclose = () => log('WS closed');
  ws.onerror = (e) => log('WS error ' + (e.message || ''));

  ws.onmessage = async (event) => {
    // Server sends raw PCM16LE 24kHz mono as ArrayBuffer
    if (!(event.data instanceof ArrayBuffer)) return;
    const arrayBuffer = event.data;

    // compute a simple meter level
    const view = new DataView(arrayBuffer);
    let peak = 0;
    for (let i = 0; i < view.byteLength; i += 2) {
      const v = Math.abs(view.getInt16(i, true)) / 32768;
      if (v > peak) peak = v;
    }
    drawMeter(outCtx, outMeter, peak);

    const audioBuffer = await decodePCM16ToAudioBuffer(arrayBuffer, 24000, 1);
    const source = outputCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputGain);
    outNextStartTime = Math.max(outNextStartTime, outputCtx.currentTime);
    source.start(outNextStartTime);
    outNextStartTime += audioBuffer.duration;
  };
}

async function startRecording() {
  if (isRecording) return;
  await inputCtx.resume();
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  inputSource = inputCtx.createMediaStreamSource(mediaStream);
  const bufferSize = 1024; // ~64ms @16kHz
  processor = inputCtx.createScriptProcessor(bufferSize, 1, 1);

  processor.onaudioprocess = (e) => {
    if (!isRecording || !ws || ws.readyState !== WebSocket.OPEN) return;
    const input = e.inputBuffer.getChannelData(0);
    // level meter
    const peak = Math.max(...input.map(Math.abs));
    drawMeter(inCtx, inMeter, peak);
    const pcm = floatTo16BitPCM(input);
    ws.send(pcm);
  };

  inputSource.connect(processor);
  processor.connect(inputCtx.destination);
  isRecording = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  flushBtn.disabled = false;
  log('Recording started');
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  try { processor && processor.disconnect(); } catch {}
  try { inputSource && inputSource.disconnect(); } catch {}
  try { mediaStream && mediaStream.getTracks().forEach(t => t.stop()); } catch {}
  startBtn.disabled = false;
  stopBtn.disabled = true;
  log('Recording stopped');
}

function flush() {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'flush' }));
}

startBtn.addEventListener('click', () => startRecording().catch(err => log('Start error: ' + err.message)));
stopBtn.addEventListener('click', () => stopRecording());
flushBtn.addEventListener('click', () => flush());

setupWebSocket();
