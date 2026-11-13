/**
 * A deadline a tool call can pause while it waits for a human.
 *
 * A model loop bounds each tool call. A call that needs a confirmation spends
 * part of that bound waiting for a person, which says nothing about the tool,
 * so the confirmation pauses the bound and resumes it afterwards with the time
 * that was left, never a fresh one.
 */

import type { PauseDeadline, PausableDeadline } from "../../types/index.js";

/**
 * Arms a deadline of `ms` that calls `onExpire` once when it runs out.
 *
 * - `pause()` stops the clock and returns the resume function. Paused time is
 *   not spent: resuming re-arms the timer with what was left. Pauses nest; the
 *   clock runs again only once every pause has resumed, and each resume
 *   function acts once.
 * - `clear()` ends the deadline for good: `onExpire` never runs, and a resume
 *   that arrives later re-arms nothing.
 *
 * The timer is deliberately not unref'd: while a call is in flight it may be
 * the only thing that will end a wedged tool.
 */
export function createPausableDeadline(
  ms: number,
  onExpire: () => void,
): PausableDeadline {
  let remaining = ms;
  let armedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pauses = 0;
  let ended = false;

  const arm = (): void => {
    armedAt = Date.now();
    timer = setTimeout(
      () => {
        timer = undefined;
        ended = true;
        onExpire();
      },
      Math.max(0, remaining),
    );
  };

  const pause: PauseDeadline = () => {
    if (ended) {
      return () => undefined;
    }
    if (pauses === 0) {
      clearTimeout(timer);
      timer = undefined;
      remaining -= Date.now() - armedAt;
    }
    pauses++;
    let resumed = false;
    return () => {
      if (resumed) {
        return;
      }
      resumed = true;
      pauses--;
      if (pauses === 0 && !ended) {
        arm();
      }
    };
  };

  arm();
  return {
    pause,
    clear: () => {
      ended = true;
      clearTimeout(timer);
      timer = undefined;
    },
  };
}

/**
 * The `pauseDeadline` in a tool's execute options (the second argument a
 * model loop passes), or undefined when there is none.
 */
export function pauseDeadlineOf(
  execOptions: unknown,
): PauseDeadline | undefined {
  if (
    typeof execOptions !== "object" ||
    execOptions === null ||
    !("pauseDeadline" in execOptions)
  ) {
    return undefined;
  }
  const { pauseDeadline } = execOptions;
  if (typeof pauseDeadline !== "function") {
    return undefined;
  }
  // Called through a wrapper, so whatever it returns, the caller gets a
  // resume function it can always call.
  return () => {
    const resume: unknown = pauseDeadline();
    return typeof resume === "function" ? () => void resume() : () => undefined;
  };
}
