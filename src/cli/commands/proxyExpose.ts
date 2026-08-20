/**
 * `neurolink proxy expose` — put this node's proxy on a public URL.
 *
 * Wraps `cloudflared` because that is the shortest path from a laptop to a URL
 * a peer can reach, with no port forwarding and no inbound firewall change.
 *
 * **The safety check is the point.** Whether a port is gated depends on the
 * proxy process — which listener it is, and how that process was started —
 * none of which this command can read. So instead of trusting configuration, it
 * asks the running proxy directly: a request with no share token must be
 * refused. A port that answers one is open, and exposing it would publish the
 * operator's subscription to anyone who finds the URL, so the tunnel is refused
 * rather than opened.
 *
 * With no `--port` it targets the gate-only share listener, which is the port
 * that exists to face outward.
 *
 * @module cli/commands/proxyExpose
 */

import { spawn } from "node:child_process";
import type { Argv, CommandModule } from "yargs";
import type {
  ProxyExposeArgs,
  ProxyGateProbe,
  ProxyState,
} from "../../lib/types/index.js";

/** Cloudflare prints the assigned hostname to stderr as it comes up. */
const QUICK_TUNNEL_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

/**
 * Ask the running proxy whether it refuses untokened traffic.
 *
 * A refusal carrying `x-neurolink-grant-reason: missing_token` is proof the
 * gate is live. Anything else — an answer, an upstream error, a credentials
 * complaint — means the request got past the gate, which is the dangerous case.
 *
 * `scheme` matters: probing a TLS address over plain http fails to connect,
 * which reads as unreachable, and an unreachable address is reported as *not*
 * dangerous. A public `https://` URL would therefore never raise the warning it
 * exists to raise.
 */
export async function probeProxyGate(
  host: string,
  port: number,
  scheme: "http" | "https" = "http",
): Promise<ProxyGateProbe> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${scheme}://${host}:${port}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "neurolink-gate-probe",
        max_tokens: 1,
        messages: [{ role: "user", content: "probe" }],
      }),
      signal: controller.signal,
    });
    await response.text().catch(() => "");
    const reason = response.headers.get("x-neurolink-grant-reason");
    if (reason === "missing_token") {
      return {
        gated: true,
        reachable: true,
        detail: "the proxy refuses requests without a share token",
      };
    }
    return {
      gated: false,
      reachable: true,
      detail:
        "the proxy served a request that carried no share token — anyone who reaches the tunnel could spend your subscription",
    };
  } catch (error) {
    return {
      gated: false,
      reachable: false,
      detail: `could not reach the proxy: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Which port to expose.
 *
 * The gate-only share listener when the running proxy has one, because that is
 * the port whose whole purpose is to face outward. An explicit `--port` always
 * wins — an operator pointing at something specific is not to be second-guessed.
 */
async function resolveExposePort(argv: ProxyExposeArgs): Promise<{
  port: number;
  isShareListener: boolean;
}> {
  if (argv.port !== undefined) {
    return { port: argv.port, isShareListener: false };
  }
  try {
    const { StateFileManager } = await import("../utils/serverUtils.js");
    const state = new StateFileManager<ProxyState>("proxy-state.json").load();
    if (state?.sharePort) {
      return { port: state.sharePort, isShareListener: true };
    }
    if (state?.port) {
      return { port: state.port, isShareListener: false };
    }
  } catch {
    // No readable state — fall through to the historical default.
  }
  return { port: 3000, isShareListener: false };
}

async function runExpose(argv: ProxyExposeArgs): Promise<void> {
  const host = argv.host ?? "127.0.0.1";
  const resolved = await resolveExposePort(argv);
  const port = resolved.port;
  if (resolved.isShareListener) {
    console.info(
      `Exposing the share listener on port ${port} — your own client keeps using the main port.`,
    );
  }

  const probe = await probeProxyGate(host, port);
  if (!probe.reachable) {
    throw new Error(
      resolved.isShareListener
        ? `${probe.detail}\nThe share listener runs only while an active grant exists. Issue one first:\n  neurolink proxy share create --peer <name> --preset spare`
        : `${probe.detail}\nStart it first: neurolink proxy start --port ${port}`,
    );
  }
  if (!probe.gated && !argv.force) {
    throw new Error(
      [
        `Refusing to expose an ungated proxy: ${probe.detail}.`,
        "",
        "Issue a grant, which brings up the gate-only share listener, and",
        "expose that instead:",
        "  neurolink proxy share create --peer <name> --preset spare",
        "  neurolink proxy expose",
        "",
        "Or gate this port itself, which also refuses your own local client:",
        `  NEUROLINK_PROXY_REQUIRE_GRANT=1 neurolink proxy start --port ${port}`,
        "",
        "Pass --force only if something in front of the tunnel is already",
        "authenticating every request.",
      ].join("\n"),
    );
  }
  if (!probe.gated && argv.force) {
    console.warn(
      "⚠ Exposing an ungated proxy because --force was given. Every request that reaches the tunnel will be served.",
    );
  }

  const args = argv.named
    ? ["tunnel", "run", argv.named]
    : ["tunnel", "--url", `http://${host}:${port}`];

  if (argv.named) {
    // Say plainly what the check above did and did not establish. A quick
    // tunnel is pointed at `http://host:port` on the line below, so probing
    // that address settles what the tunnel will front. A named tunnel is not:
    // its ingress lives in cloudflared's own configuration, and it may route
    // to the main ungated port — or to something else entirely — no matter
    // what this command just probed. The gate result is still worth having,
    // but it describes a local port, not this tunnel.
    console.warn("");
    console.warn(
      `⚠ The gate check covered http://${host}:${port}. A named tunnel's ingress is`,
    );
    console.warn(
      `  configured in cloudflared, not here, so confirm ${argv.named} actually points at`,
    );
    console.warn(
      "  that port — routing it at an ungated port exposes the pool regardless of the",
    );
    console.warn("  result above.");
    console.warn("");
  }

  console.info(`Starting cloudflared: cloudflared ${args.join(" ")}`);
  const child = spawn("cloudflared", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let announced = false;
  const announce = (chunk: string): void => {
    if (announced) {
      return;
    }
    const match = QUICK_TUNNEL_URL.exec(chunk);
    if (!match) {
      return;
    }
    announced = true;
    const url = match[0];
    console.info("");
    console.info(`  Public URL: ${url}`);
    console.info("");
    console.info("  Mint a token and hand the peer a link:");
    console.info(
      `    neurolink proxy share create --peer <name> --preset spare --public-url ${url}`,
    );
    console.info("");
    console.info(
      "  A quick tunnel's URL changes every restart. For a peer you expect to",
    );
    console.info(
      "  keep, use a named tunnel so their configuration does not go stale:",
    );
    console.info("    neurolink proxy expose --named <tunnel-name>");
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    announce(text);
    process.stdout.write(text);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    announce(text);
    process.stderr.write(text);
  });

  child.on("error", (error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        "cloudflared is not installed. See https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
      );
      process.exitCode = 1;
      return;
    }
    console.error(error.message);
    process.exitCode = 1;
  });

  // `close` rather than `exit`: a spawn that never started — cloudflared not on
  // PATH — emits `error` and `close` but no `exit`, and waiting on `exit` alone
  // left the command hanging forever on the one failure it explains best.
  await new Promise<void>((resolve) => {
    let settled = false;
    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    child.on("close", (code) => {
      if (code !== 0) {
        process.exitCode = code ?? 1;
      }
      settle();
    });
    child.on("error", settle);
  });
}

export const proxyExposeCommand: CommandModule<object, ProxyExposeArgs> = {
  command: "expose",
  describe: "Publish this node's proxy through a cloudflared tunnel",
  builder: (yargs: Argv) =>
    yargs
      .option("port", {
        type: "number",
        // Deliberately no default. `resolveExposePort` reads the running
        // proxy's state file to find the gate-only share listener, and it can
        // only do that when `--port` is genuinely absent — a yargs default
        // makes every invocation look explicit and pins the tunnel to 3000.
        description:
          "Local proxy port to expose (default: the share listener, else the running proxy's port)",
      })
      .option("host", {
        type: "string",
        default: "127.0.0.1",
        description: "Local proxy host",
      })
      .option("named", {
        type: "string",
        description:
          "Run a pre-created named tunnel instead of a quick tunnel (stable URL)",
      })
      .option("force", {
        type: "boolean",
        default: false,
        description:
          "Expose even though the proxy serves untokened requests (dangerous)",
      }),
  handler: async (argv) => {
    try {
      await runExpose(argv);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  },
};
