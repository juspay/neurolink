import type { Argv, CommandModule } from "yargs";
import { readFile, lstat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type {
  CliProxyRestartError,
  ProxyRestartArgs,
} from "../../lib/types/index.js";
import { resolveProxyPaths } from "../../lib/proxy/proxyPaths.js";
import { requestProxyRestart } from "../../lib/proxy/restartControl.js";

const supervisorSchema = z.object({
  pid: z.number().int().positive(),
  restartControl: z.object({
    protocol: z.literal(1),
    socketPath: z.string(),
    instanceId: z.string().uuid(),
  }),
});

export const proxyRestartCommand: CommandModule<object, ProxyRestartArgs> = {
  command: "restart",
  describe: "Replace the serving worker without stopping the proxy listener",
  builder: (yargs: Argv) =>
    yargs
      .option("check", {
        type: "boolean",
        default: false,
        description:
          "Check restart readiness without changing the running proxy",
      })
      .option("dev", {
        type: "boolean",
        default: false,
        description: "Use the isolated proxy state in .neurolink-dev/",
      })
      .option("format", {
        type: "string",
        choices: ["text", "json"] as const,
        default: "text" as const,
      })
      .example(
        "neurolink proxy restart --check",
        "Verify the running supervisor supports safe worker replacement",
      )
      .example(
        "neurolink proxy restart",
        "Start a replacement, verify it, then let existing streams finish",
      ) as Argv<ProxyRestartArgs>,
  handler: async (argv) => {
    try {
      const { stateDir } = resolveProxyPaths(argv.dev);
      const saved = supervisorSchema.safeParse(
        JSON.parse(
          await readFile(join(stateDir, "proxy-supervisor-state.json"), "utf8"),
        ),
      );
      if (!saved.success) {
        throw new Error(
          "This running supervisor does not advertise safe restart support. It must first be upgraded through a separately planned service activation.",
        );
      }
      const { pid, restartControl } = saved.data;
      if (
        restartControl.socketPath !==
        join(stateDir, `restart-${pid}-${restartControl.instanceId}.sock`)
      ) {
        throw new Error(
          "Restart control path does not match the recorded supervisor.",
        );
      }
      const socket = await lstat(restartControl.socketPath);
      if (
        !socket.isSocket() ||
        (socket.mode & 0o077) !== 0 ||
        (process.getuid && socket.uid !== process.getuid())
      ) {
        throw new Error(
          "Restart control socket ownership or permissions are invalid.",
        );
      }
      const result = await requestProxyRestart(restartControl, argv.check);
      if (result.supervisorPid !== pid) {
        throw new Error(
          "Restart control identity changed; outcome is unverified.",
        );
      }
      if (argv.format === "json") {
        console.info(JSON.stringify(result, null, 2));
      } else {
        console.info(result.message);
        console.info(
          `Supervisor ${result.supervisorPid}; worker ${result.workerPid ?? "unknown"}; version ${result.version ?? "unknown"}; previous workers finishing requests: ${result.drainingWorkers}.`,
        );
        console.info(
          "This operation preserves the supervisor and launchd settings. It does not reinstall the service.",
        );
      }
      if (!result.ok) {
        process.exitCode = 1;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Restart control is unavailable.";
      if (argv.format === "json") {
        const result: CliProxyRestartError = {
          ok: false,
          phase: "unverified",
          message,
        };
        console.info(JSON.stringify(result));
      } else {
        console.error(message);
      }
      process.exitCode = 1;
    }
  },
};
