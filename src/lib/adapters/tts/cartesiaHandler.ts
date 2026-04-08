import WebSocket from "ws";
import { EventEmitter } from "events";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/async/withTimeout.js";

type CartesiaMessage = {
  data?: string;
  done?: boolean;
  error?: string;
};

export function getCartesiaWsUrl(): string {
  const baseUrl =
    process.env.CARTESIA_WS_BASE_URL ?? "wss://api.cartesia.ai/tts/websocket";
  const cartesiaVersion = process.env.CARTESIA_API_VERSION ?? "2025-04-16";

  const wsUrl = new URL(baseUrl);
  wsUrl.searchParams.set("cartesia_version", cartesiaVersion);
  return wsUrl.toString();
}

export class CartesiaStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private contextId: string;
  private isReady = false;

  constructor(contextId: string) {
    super();
    this.contextId = contextId;

    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) {
      throw new Error("CARTESIA_API_KEY is not set in environment");
    }
    this.ws = new WebSocket(getCartesiaWsUrl(), {
      headers: { "X-API-Key": apiKey },
    });

    this.ws.on("open", () => {
      this.isReady = true;
      logger.info("[CARTESIA] WS connected");
      this.emit("ready");
    });

    this.ws.on("message", (data) => {
      let msg: CartesiaMessage;
      try {
        msg = JSON.parse(data.toString()) as CartesiaMessage;
      } catch {
        logger.error("[CARTESIA] Failed to parse message");
        return;
      }

      // Handle error first so it always surfaces, even mid-stream
      if (msg.error) {
        const err = new Error(msg.error);
        if (this.listenerCount("error") > 0) {
          this.emit("error", err);
        } else {
          logger.error("[CARTESIA] Unhandled error:", msg.error);
        }
        return;
      }

      if (msg.data) {
        const audio = Buffer.from(msg.data, "base64");
        this.emit("audio", audio);
      }

      if (msg.done) {
        this.emit("done");
      }
    });

    this.ws.on("error", (err) => {
      if (this.listenerCount("error") > 0) {
        this.emit("error", err);
      } else {
        logger.error("[CARTESIA] Unhandled WebSocket error:", err.message);
      }
    });

    this.ws.on("close", () => {
      this.isReady = false;
      this.emit("close");
    });
  }

  async ready() {
    if (this.isReady) {
      return;
    }

    const connectPromise = new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("Cartesia WebSocket is not initialized"));
        return;
      }

      this.ws.once("open", resolve);
      this.ws.once("error", reject);
      this.ws.once("close", () =>
        reject(new Error("Cartesia WebSocket closed before ready")),
      );
    });

    return withTimeout(connectPromise, 5000, "Cartesia WS connect timed out");
  }

  send(text: string, cont = true) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        context_id: this.contextId,
        model_id: "sonic-3",
        transcript: text,
        voice: {
          mode: "id",
          id: "694f9389-aac1-45b6-b726-9d9369183238",
        },
        output_format: {
          container: "raw",
          encoding: "pcm_s16le",
          sample_rate: 24000,
        },
        continue: cont,
      }),
    );
  }

  flush() {
    this.send("", false);
  }

  close() {
    if (!this.ws) {
      return;
    }

    const ws = this.ws;
    this.ws = null;
    this.isReady = false;

    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      try {
        ws.close();
      } catch (error) {
        logger.warn("[CARTESIA] Failed to close WebSocket cleanly", error);
      }
    }

    ws.once("close", () => {
      ws.removeAllListeners();
    });
  }
}
