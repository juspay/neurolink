/**
 * The gate-only listener.
 *
 * **Why a second port exists at all.** The share gate refuses requests carrying
 * no token — and the operator's own client carries none. Turning the gate on
 * therefore breaks local use, which is why it started life as an env flag that
 * needed a restart and an informed decision. A loopback allowlist cannot rescue
 * that: cloudflared and every reverse proxy connect from `127.0.0.1`, so
 * tunnelled traffic is indistinguishable from the operator's own by origin.
 *
 * The seam that *does* work is the listener. One port keeps today's behaviour
 * for the operator's own client; a second port requires a grant on every
 * request, and that is the one you expose. Which port a request arrived on is
 * decided by the accepting socket, so nothing a client sends can move it from
 * one side to the other.
 *
 * **Why it starts and stops on its own.** A port that requires a grant is
 * useless with no grants issued, and issuing the first grant is exactly the
 * moment an operator wants somewhere to point a peer. So the listener follows
 * the grant file: it comes up when the first active grant appears and goes away
 * when the last one is revoked, without a restart on either edge.
 *
 * @module proxy/shareListener
 */

import type { ProxyShareListenerHandle } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { listShareGrants } from "./shareGrants.js";

/** How often the grant file is consulted for the first or last active grant. */
const SUPERVISOR_INTERVAL_MS = 15_000;

/** Default offset from the main port. Explicit configuration always wins. */
export const SHARE_PORT_OFFSET = 1;

/**
 * The port the share listener should use.
 *
 * Precedence is the usual one — an explicit flag, then the environment, then a
 * derived default. Deriving `port + 1` rather than picking any free port is
 * deliberate: a peer's saved URL and a named tunnel both outlive a restart, so
 * the address has to be reproducible.
 */
export function resolveSharePort(args: {
  explicit?: number;
  mainPort: number;
  env?: NodeJS.ProcessEnv;
}): number {
  if (args.explicit !== undefined && Number.isFinite(args.explicit)) {
    return args.explicit;
  }
  const raw = (args.env ?? process.env).NEUROLINK_PROXY_SHARE_PORT;
  const parsed = Number(raw);
  if (raw !== undefined && raw !== "" && Number.isInteger(parsed)) {
    return parsed;
  }
  return args.mainPort + SHARE_PORT_OFFSET;
}

/** Is the share listener switched off entirely? */
export function isShareListenerDisabled(env: NodeJS.ProcessEnv = process.env) {
  const raw = (env.NEUROLINK_PROXY_SHARE_LISTENER ?? "").trim().toLowerCase();
  return raw === "0" || raw === "off" || raw === "false" || raw === "no";
}

/** Does this node currently lend anything to anyone? */
export async function hasActiveShareGrants(): Promise<boolean> {
  try {
    const grants = await listShareGrants();
    return grants.some((grant) => grant.state === "active");
  } catch {
    // An unreadable grant file is an empty grant set everywhere else in this
    // subsystem; opening a public port on a parse error would be the one place
    // that guessed the other way.
    return false;
  }
}

/**
 * Keep the share listener's existence in step with the grant file.
 *
 * `start` and `stop` are injected rather than imported so this stays free of the
 * HTTP server: the runtime owns the adaptor, and a poll loop that owns nothing
 * is the part worth testing.
 */
export function superviseShareListener(args: {
  start: () => Promise<ProxyShareListenerHandle>;
  intervalMs?: number;
  /** Consulted instead of the grant file. Tests only. */
  hasGrants?: () => Promise<boolean>;
}): { stop: () => Promise<void>; poll: () => Promise<void> } {
  const hasGrants = args.hasGrants ?? hasActiveShareGrants;
  let handle: ProxyShareListenerHandle | undefined;
  let inFlight = false;
  let stopped = false;
  /** Last failure announced, so a permanent one is not re-logged every cycle. */
  let lastFailure: string | undefined;

  const poll = async (): Promise<void> => {
    if (inFlight || stopped) {
      return;
    }
    inFlight = true;
    try {
      const wanted = await hasGrants();
      if (wanted && !handle) {
        const started = await args.start();
        // `stop()` can land while the listen is still resolving. It saw no
        // handle to close, so unless this re-check closes the fresh one the
        // port stays bound for the life of the process.
        if (stopped) {
          await started.close().catch(() => {
            // Shutdown is already under way; a failed close changes nothing.
          });
          return;
        }
        handle = started;
        lastFailure = undefined;
        logger.always(
          `[proxy] share listener up on port ${handle.port} — expose this one, not the main port`,
        );
      } else if (!wanted && handle) {
        const closing = handle;
        handle = undefined;
        await closing.close();
        logger.always("[proxy] share listener down — no active grants remain");
      }
    } catch (error) {
      // A port already in use does not clear on its own, and the supervisor
      // retries every cycle. Announce each distinct failure once so the log
      // stays readable while the condition persists.
      const detail = error instanceof Error ? error.message : String(error);
      if (detail !== lastFailure) {
        lastFailure = detail;
        logger.always(
          `[proxy] share listener could not start: ${detail} — set --share-port to move it`,
        );
      }
    } finally {
      inFlight = false;
    }
  };

  const timer = setInterval(() => {
    void poll();
  }, args.intervalMs ?? SUPERVISOR_INTERVAL_MS);
  timer.unref?.();

  return {
    poll,
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      const closing = handle;
      handle = undefined;
      if (closing) {
        await closing.close().catch(() => {
          // Shutdown is already under way; a failed close changes nothing.
        });
      }
    },
  };
}
