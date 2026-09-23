import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type {
  TelemetryNativePrepareArgs,
  TelemetryNativeValidateArgs,
} from "../../lib/types/index.js";

const execute = promisify(execFile);
const profilePath = fileURLToPath(
  new URL(
    "../../../scripts/observability/otel-collector.proxy-native-durable.yaml",
    import.meta.url,
  ),
);
const mib = 1024 * 1024;
const stagedFiles = [
  "collector.yaml",
  "collector.env.json",
  "proxy.env",
  "doctor.env",
];
const pendingChecks = [
  "Run native-validate with the intended collector executable",
  "Review source collector customizations against the staged standard profile; custom processors, TLS and exporter settings are not automatically copied",
  "Create private queue/compaction directories (0700) on a volume with the declared quota; queue payload bounds do not enforce a disk quota",
  "Apply and verify backend stream retention policies; preparation does not call the backend",
  "Merge proxy and doctor environment snippets into existing settings; supply doctor backend authorization privately",
  "Operator must back up config/service/env, explicitly activate through their service manager, and roll back those backups if health, export, stream or persistence checks fail",
  "Reconcile fresh request, body and backend records after activation; validation alone is not runtime proof",
];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object in the native collector configuration");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value || /[\r\n\0]/.test(value)) {
    throw new Error(`Missing or invalid ${field}`);
  }
  const resolved = value.replace(
    /\$\{env:([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g,
    (_match, key: string, fallback: string | undefined) => {
      const replacement = process.env[key] ?? fallback;
      if (replacement === undefined) {
        throw new Error(
          `Set the source collector environment variable ${key} before preparation`,
        );
      }
      return replacement;
    },
  );
  if (!resolved || /\$\{|[\r\n\0]/.test(resolved)) {
    throw new Error(`Unsupported substitution in ${field}`);
  }
  return resolved;
}

function positiveInteger(value: number, name: string, max: number): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > max) {
    throw new Error(
      `${name} must be a positive integer no greater than ${max}`,
    );
  }
  return value;
}

function privatePath(value: string, name: string): string {
  if (!isAbsolute(value) || /[\r\n\0]/.test(value)) {
    throw new Error(`${name} must be an absolute path`);
  }
  const path = resolve(value);
  if (path === dirname(path)) {
    throw new Error(`${name} must not be a filesystem root`);
  }
  return path;
}

function loopbackListen(value: unknown, name: string): string {
  const endpoint = text(value, name);
  const match = endpoint.match(/^127\.0\.0\.1:(\d+)$/);
  if (!match) {
    throw new Error(`${name} must use an explicit 127.0.0.1 listener`);
  }
  positiveInteger(Number(match[1]), name, 65535);
  return endpoint;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Produce new private files only. Existing config, services and queues are untouched. */
export async function prepareNativeTelemetry(args: TelemetryNativePrepareArgs) {
  const output = privatePath(args.output, "output");
  const queue = privatePath(args.queueDirectory, "queue-directory");
  const compact = privatePath(args.compactionDirectory, "compaction-directory");
  if (
    [queue, compact].some(
      (path) =>
        path === output ||
        path.startsWith(`${output}/`) ||
        output.startsWith(`${path}/`),
    )
  ) {
    throw new Error("Staging and collector storage paths must not overlap");
  }
  if (
    queue === compact ||
    queue.startsWith(`${compact}/`) ||
    compact.startsWith(`${queue}/`)
  ) {
    throw new Error(
      "Queue and compaction directories must be separate, non-nested paths",
    );
  }
  const metadataMib = positiveInteger(
    args.metadataQueueMib,
    "metadata-queue-mib",
    1024,
  );
  const bodyMib = positiveInteger(args.bodyQueueMib, "body-queue-mib", 4096);
  const quotaMib = positiveInteger(
    args.diskQuotaMib,
    "disk-quota-mib",
    1048576,
  );
  if (quotaMib < 2 * (3 * metadataMib + bodyMib)) {
    throw new Error(
      "disk-quota-mib must allow at least twice all four queue payload limits for storage and compaction overhead",
    );
  }
  positiveInteger(args.metadataRetentionDays, "metadata-retention-days", 3650);
  positiveInteger(args.bodyRetentionDays, "body-retention-days", 3650);
  positiveInteger(args.bodyPort, "body-port", 65535);
  const sourcePath = resolve(args.collectorConfig);
  const source = await readFile(sourcePath, "utf8");
  let config: Record<string, unknown>;
  try {
    config = record(yaml.load(source));
  } catch {
    // YAML parser diagnostics can contain complete source lines with credentials.
    throw new Error(
      "Could not parse the source collector YAML; source details are suppressed",
    );
  }
  const exporter = record(record(config.exporters)["otlphttp/openobserve"]);
  const headers = record(exporter.headers);
  const endpoint = text(exporter.endpoint, "OpenObserve endpoint");
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Invalid OpenObserve endpoint");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/api\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname) ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    )
  ) {
    throw new Error(
      "OpenObserve endpoint must be /api/<organization>, without embedded credentials; require HTTPS outside loopback",
    );
  }
  const authorization = text(
    headers.Authorization ?? headers.authorization,
    "OpenObserve authorization",
  );
  const metadataStream = text(
    headers["stream-name"] ?? "neurolink_proxy",
    "metadata stream",
  );
  const bodyStream = args.bodyStream ?? `${metadataStream}_bodies`;
  if (
    ![metadataStream, bodyStream].every((value) =>
      /^[a-zA-Z0-9_]+$/.test(value),
    ) ||
    metadataStream === bodyStream
  ) {
    throw new Error(
      "Metadata and body streams must have distinct alphanumeric/underscore names",
    );
  }
  const receivers = record(config.receivers);
  const metadataListen = loopbackListen(
    record(
      record(record(receivers.otlp ?? receivers["otlp/metadata"]).protocols)
        .http,
    ).endpoint,
    "metadata listener",
  );
  const extensions = record(config.extensions ?? {});
  const healthListen = loopbackListen(
    record(extensions.health_check ?? { endpoint: "127.0.0.1:14333" }).endpoint,
    "health listener",
  );
  const telemetry = record(record(config.service).telemetry ?? {});
  const metrics = record(telemetry.metrics ?? {});
  const readers = Array.isArray(metrics.readers) ? metrics.readers : [];
  const prometheus = readers
    .map(
      (reader) =>
        record(record(record(reader).pull ?? {}).exporter ?? {}).prometheus,
    )
    .find((value) => value !== undefined);
  const metricsPort = prometheus ? Number(record(prometheus).port) : 14388;
  if (prometheus && record(prometheus).host !== "127.0.0.1") {
    throw new Error(
      "Collector metrics must use an explicit 127.0.0.1 listener",
    );
  }
  positiveInteger(metricsPort, "metrics port", 65535);
  const ports = [
    Number(metadataListen.split(":")[1]),
    Number(healthListen.split(":")[1]),
    metricsPort,
    args.bodyPort,
  ];
  if (new Set(ports).size !== ports.length) {
    throw new Error(
      "Metadata, bodies, health and metrics must use distinct ports",
    );
  }
  const profile = await readFile(profilePath, "utf8");
  const env = {
    NEUROLINK_OTEL_METADATA_LISTEN: metadataListen,
    NEUROLINK_OTEL_BODIES_LISTEN: `127.0.0.1:${args.bodyPort}`,
    NEUROLINK_OTEL_HEALTH_LISTEN: healthListen,
    NEUROLINK_OTEL_METRICS_PORT: String(metricsPort),
    NEUROLINK_OTEL_QUEUE_DIRECTORY: queue,
    NEUROLINK_OTEL_COMPACTION_DIRECTORY: compact,
    NEUROLINK_OTEL_METADATA_QUEUE_BYTES: String(metadataMib * mib),
    NEUROLINK_OTEL_BODY_QUEUE_BYTES: String(bodyMib * mib),
    NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT: endpoint,
    NEUROLINK_OPENOBSERVE_BASIC_AUTH: authorization,
    NEUROLINK_PROXY_STREAM_HEADER: metadataStream,
    NEUROLINK_PROXY_BODY_STREAM_HEADER: bodyStream,
  };
  // Every value in these public snippets is independently restricted above.
  const proxyEnv = `NEUROLINK_PROXY_LOG_SINK=otel\nOTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://${metadataListen}/v1/logs\nNEUROLINK_PROXY_OTLP_BODIES_ENDPOINT=http://127.0.0.1:${args.bodyPort}/v1/logs\n`;
  const doctorEnv = `NEUROLINK_OPENOBSERVE_URL=${url.origin}\nNEUROLINK_OPENOBSERVE_ORG=${url.pathname.split("/")[2]}\nNEUROLINK_PROXY_STREAM_HEADER=${metadataStream}\nNEUROLINK_PROXY_BODY_STREAM_HEADER=${bodyStream}\nNEUROLINK_OTEL_COLLECTOR_METRICS_URL=http://127.0.0.1:${metricsPort}/metrics\n`;
  const contents = [
    profile,
    `${JSON.stringify(env, null, 2)}\n`,
    proxyEnv,
    doctorEnv,
  ];
  const manifest = {
    schemaVersion: 1,
    activationImplemented: false,
    source: { path: sourcePath, sha256: digest(source) },
    files: Object.fromEntries(
      stagedFiles.map((name, index) => [name, digest(contents[index])]),
    ),
    metadataStream,
    bodyStream,
    collectorMinimumVersion: "0.160.0",
    queuePayloadBytes: {
      metadataPerSignal: metadataMib * mib,
      bodies: bodyMib * mib,
      total: (3 * metadataMib + bodyMib) * mib,
    },
    operatorPolicy: {
      diskQuotaBytes: quotaMib * mib,
      metadataRetentionDays: args.metadataRetentionDays,
      bodyRetentionDays: args.bodyRetentionDays,
      enforced: false,
    },
    pending: pendingChecks,
  };
  // Exclusive creation refuses an existing destination, including a symlink.
  await mkdir(output, { mode: 0o700 });
  try {
    for (let index = 0; index < stagedFiles.length; index++) {
      await writeFile(join(output, stagedFiles[index]), contents[index], {
        mode: 0o600,
        flag: "wx",
      });
    }
    await writeFile(
      join(output, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600, flag: "wx" },
    );
  } catch {
    await rm(output, { recursive: true, force: true });
    throw new Error(
      "Could not write the private staging directory; incomplete staged files were removed",
    );
  }
  return {
    directory: output,
    prepared: true,
    activated: false,
    metadataStream,
    bodyStream,
    pending: pendingChecks,
  };
}

/** Runs only the collector's static validator, with test-owned temporary storage. */
export async function validateNativeTelemetry(
  args: TelemetryNativeValidateArgs,
) {
  const directory = privatePath(args.directory, "directory");
  const binary = privatePath(args.collectorBin, "collector-bin");
  const permissions = await lstat(directory);
  if (!permissions.isDirectory() || (permissions.mode & 0o077) !== 0) {
    throw new Error("Staging directory must be private (0700)");
  }
  for (const name of ["manifest.json", ...stagedFiles]) {
    const permissions = await lstat(join(directory, name));
    if (!permissions.isFile() || (permissions.mode & 0o077) !== 0) {
      throw new Error("Staged files must be private regular files (0600)");
    }
  }
  let manifest: Record<string, unknown>;
  let env: Record<string, unknown>;
  try {
    manifest = record(
      JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
    );
    env = record(
      JSON.parse(await readFile(join(directory, "collector.env.json"), "utf8")),
    );
  } catch {
    throw new Error("Invalid native telemetry stage; prepare a new directory");
  }
  if (
    manifest.schemaVersion !== 1 ||
    manifest.activationImplemented !== false
  ) {
    throw new Error("Unsupported native telemetry staging manifest");
  }
  for (const name of stagedFiles) {
    const file = join(directory, name);
    if (digest(await readFile(file, "utf8")) !== record(manifest.files)[name]) {
      throw new Error(
        "Staged files changed or are not private; prepare a new directory before validation",
      );
    }
  }
  const source = record(manifest.source);
  if (
    typeof source.path !== "string" ||
    digest(await readFile(source.path, "utf8")) !== source.sha256
  ) {
    throw new Error(
      "Source collector configuration changed; prepare again to avoid validating a stale migration",
    );
  }
  const collectorEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (
      typeof value !== "string" ||
      !/^(NEUROLINK_OTEL_|NEUROLINK_OPENOBSERVE_|NEUROLINK_PROXY_)/.test(key)
    ) {
      throw new Error("Invalid staged collector environment");
    }
    collectorEnv[key] = value;
  }
  let version: string;
  try {
    const result = await execute(binary, ["--version"], {
      timeout: 15000,
      maxBuffer: 65536,
    });
    const match = `${result.stdout}\n${result.stderr}`.match(
      /\b(\d+)\.(\d+)\.(\d+)([-+][\w.-]+)?\b/,
    );
    if (
      !match ||
      match[4] ||
      (Number(match[1]) === 0 && Number(match[2]) < 160)
    ) {
      throw new Error("unsupported");
    }
    version = `${match[1]}.${match[2]}.${match[3]}`;
  } catch {
    throw new Error(
      "Could not verify collector >= 0.160.0 (stable); executable diagnostics are suppressed to protect credentials",
    );
  }
  const temporary = await mkdtemp(join(directory, "validation-"));
  try {
    await execute(
      binary,
      ["validate", "--config", join(directory, "collector.yaml")],
      {
        env: {
          ...process.env,
          ...collectorEnv,
          NEUROLINK_OTEL_QUEUE_DIRECTORY: join(temporary, "queue"),
          NEUROLINK_OTEL_COMPACTION_DIRECTORY: join(temporary, "compact"),
        },
        timeout: 30000,
        maxBuffer: 1048576,
      },
    );
  } catch {
    throw new Error(
      "Collector rejected the staged profile or validation timed out; executable diagnostics are suppressed to protect credentials",
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return {
    directory,
    valid: true,
    collectorVersion: version,
    activated: false,
    runtimeVerified: false,
    pending: pendingChecks.slice(1),
  };
}
