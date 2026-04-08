/** @type {any} */
const g = globalThis;

/** @type {any} */
const AudioWorkletProcessorBase = g["AudioWorkletProcessor"];

/** @type {(name: string, ctor: any) => void} */
const registerProcessorFn = g["registerProcessor"];

/** Max queued chunks before dropping oldest (~10s of 24kHz audio). */
const HIGH_WATER_MARK = 500;

class PCMProcessor extends AudioWorkletProcessorBase {
  constructor() {
    super();
    /** @type {Float32Array[]} */
    this.queue = [];
    /** @type {number} */
    this.offset = 0;

    /** @param {MessageEvent<ArrayLike<number>>} event */
    this.port.onmessage = (event) => {
      if (this.queue.length >= HIGH_WATER_MARK) {
        // Drop oldest chunks to prevent unbounded memory growth
        this.queue.splice(0, this.queue.length - HIGH_WATER_MARK + 1);
        this.offset = 0;
      }
      this.queue.push(new Float32Array(event.data));
    };
  }

  /**
   * @param {Float32Array[][]} _inputs
   * @param {Float32Array[][]} outputs
   * @returns {boolean}
   */
  process(_inputs, outputs) {
    const output = outputs[0][0];

    if (!this.queue.length) {
      output.fill(0);
      return true;
    }

    let chunk = this.queue[0];

    for (let i = 0; i < output.length; i++) {
      if (this.offset >= chunk.length) {
        this.queue.shift();
        this.offset = 0;

        if (!this.queue.length) {
          output.fill(0, i);
          break;
        }

        chunk = this.queue[0];
      }

      output[i] = chunk[this.offset++];
    }

    return true;
  }
}

registerProcessorFn("pcm-processor", PCMProcessor);
