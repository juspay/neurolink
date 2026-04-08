import { logger } from "../../utils/logger.js";
import type { Frame } from "./types.js";

export class FrameBus {
  private handlers: Partial<
    Record<Frame["type"], Array<(frame: Frame) => void>>
  > = {};

  subscribe<T extends Frame["type"]>(
    type: T,
    fn: (frame: Extract<Frame, { type: T }>) => void,
  ) {
    if (!this.handlers[type]) {
      this.handlers[type] = [];
    }
    this.handlers[type].push(fn as (frame: Frame) => void);
  }

  publish(frame: Frame) {
    const subs = this.handlers[frame.type];
    if (!subs) {
      return;
    }
    for (const fn of subs) {
      try {
        fn(frame);
      } catch (err) {
        logger.error(`[FrameBus] Subscriber threw on ${frame.type}:`, err);
      }
    }
  }
}
