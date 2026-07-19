import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants, createReadStream } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { createInterface } from "node:readline";
import { gunzipSync } from "node:zlib";
import type {
  CompareProxyReplayOptions,
  ExportProxyReplayOptions,
  ProxyReplayBundle,
  ProxyReplayCapture,
  ProxyReplayComparison,
  ProxyReplayJsonRecord,
} from "../types/index.js";
import {
  prepareProxyBodyForLogging,
  redactProxyHeadersForLogging,
} from "./requestLogger.js";

const DEBUG_FILE_PATTERN = /^proxy-debug-\d{4}-\d{2}-\d{2}\.jsonl$/;
const BUNDLE_KIND = "neurolink.proxy.replay-bundle";
const COMPARISON_KIND = "neurolink.proxy.replay-comparison";
const MAX_COMPRESSED_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 16 * 1024 * 1024;
const MAX_DIRECT_RESPONSE_BYTES = 1024 * 1024;
const REDACTED_VALUE = "[REDACTED]";
const TRUSTED_CAPTURED_ENDPOINTS = new Set([
  "https://api.anthropic.com/v1/messages?beta=true",
]);
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SENSITIVE_QUERY_NAME_PATTERN =
  /token|secret|key|password|credential|authorization/i;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function isValidProxyReplayHeaderName(name: string): boolean {
  return HEADER_NAME_PATTERN.test(name);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordValue(value: unknown): ProxyReplayJsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ProxyReplayJsonRecord)
    : null;
}

function headersValue(value: unknown): Record<string, string> {
  const record = recordValue(value);
  if (!record) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(record)
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return (
    value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

function isNullableSha256(value: unknown): value is string | null {
  return (
    value === null || (typeof value === "string" && SHA256_PATTERN.test(value))
  );
}

function isHeaderRecord(value: unknown): value is Record<string, string> {
  const record = recordValue(value);
  return (
    record !== null &&
    Object.entries(record).every(
      ([name, headerValue]) =>
        isValidProxyReplayHeaderName(name) &&
        typeof headerValue === "string" &&
        !/[\r\n]/.test(headerValue),
    )
  );
}

function isReplayCapture(value: unknown): value is ProxyReplayCapture {
  const capture = recordValue(value);
  const source = recordValue(capture?.source);
  return Boolean(
    capture &&
    typeof capture.timestamp === "string" &&
    typeof capture.phase === "string" &&
    isNullableNumber(capture.attempt) &&
    isNullableString(capture.model) &&
    (capture.stream === null || typeof capture.stream === "boolean") &&
    isNullableString(capture.account) &&
    isNullableString(capture.accountType) &&
    isNullableNumber(capture.responseStatus) &&
    isNullableNumber(capture.durationMs) &&
    isNullableString(capture.contentType) &&
    isHeaderRecord(capture.headers) &&
    isNullableString(capture.body) &&
    isNullableSha256(capture.bodySha256) &&
    typeof capture.bodyTruncated === "boolean" &&
    isNullableNumber(capture.observedBodyBytes) &&
    (capture.metadata === null || recordValue(capture.metadata)) &&
    source &&
    typeof source.indexFile === "string" &&
    Number.isInteger(source.indexLine) &&
    Number(source.indexLine) >= 1 &&
    isNullableString(source.artifactPath) &&
    isStringArray(capture.issues),
  );
}

function assertProxyReplayBundle(
  value: unknown,
): asserts value is ProxyReplayBundle {
  const bundle = recordValue(value);
  const source = recordValue(bundle?.source);
  const completeness = recordValue(bundle?.completeness);
  const request = recordValue(bundle?.request);
  const valid = Boolean(
    bundle?.kind === BUNDLE_KIND &&
    bundle.schemaVersion === 1 &&
    typeof bundle.requestId === "string" &&
    bundle.requestId.length > 0 &&
    Number.isInteger(bundle.selectedAttempt) &&
    Number(bundle.selectedAttempt) >= 1 &&
    source &&
    typeof source.logsDirectory === "string" &&
    isStringArray(source.indexFiles) &&
    completeness &&
    Number.isInteger(completeness.captures) &&
    isStringArray(completeness.phasesPresent) &&
    isStringArray(completeness.missingRequiredPhases) &&
    Number.isInteger(completeness.truncatedCaptures) &&
    Number.isInteger(completeness.artifactsWithIssues) &&
    typeof completeness.replayable === "boolean" &&
    isStringArray(completeness.blockers) &&
    request &&
    ["POST", "PUT", "PATCH"].includes(String(request.method)) &&
    isNullableString(request.url) &&
    isHeaderRecord(request.headers) &&
    isStringArray(request.requiredHeaderInputs) &&
    request.requiredHeaderInputs.every((name) =>
      isValidProxyReplayHeaderName(name),
    ) &&
    isNullableString(request.body) &&
    isNullableSha256(request.bodySha256) &&
    typeof request.bodyTruncated === "boolean" &&
    isNullableString(request.contentType) &&
    isNullableString(request.account) &&
    isNullableString(request.accountType) &&
    isNullableString(request.model) &&
    (request.stream === null || typeof request.stream === "boolean") &&
    Array.isArray(bundle.captures) &&
    bundle.captures.every(isReplayCapture) &&
    (bundle.capturedResponse === null ||
      isReplayCapture(bundle.capturedResponse)),
  );
  if (!valid) {
    throw new Error("Invalid or unsupported NeuroLink proxy replay bundle");
  }
  const typedBundle = value as ProxyReplayBundle;
  const captures = [
    ...typedBundle.captures,
    ...(typedBundle.capturedResponse ? [typedBundle.capturedResponse] : []),
  ];
  const hashedBodies = [typedBundle.request, ...captures];
  for (const capture of hashedBodies) {
    if (
      capture.body !== null &&
      capture.bodySha256 !== null &&
      sha256(capture.body) !== capture.bodySha256
    ) {
      throw new Error("Proxy replay bundle contains a body hash mismatch");
    }
  }
  if (
    stableJson(redactProxyHeadersForLogging(typedBundle.request.headers)) !==
    stableJson(typedBundle.request.headers)
  ) {
    throw new Error(
      "Proxy replay bundle contains an unredacted request header",
    );
  }
  for (const capture of captures) {
    if (
      stableJson(redactProxyHeadersForLogging(capture.headers)) !==
      stableJson(capture.headers)
    ) {
      throw new Error(
        "Proxy replay bundle contains an unredacted capture header",
      );
    }
    if (
      capture.body !== null &&
      prepareProxyBodyForLogging(capture.body).value !== capture.body
    ) {
      throw new Error(
        "Proxy replay bundle contains an unredacted capture body",
      );
    }
  }
  if (
    typedBundle.request.body !== null &&
    prepareProxyBodyForLogging(typedBundle.request.body).value !==
      typedBundle.request.body
  ) {
    throw new Error("Proxy replay bundle contains an unredacted request body");
  }
}

function isWithin(parent: string, candidate: string): boolean {
  const child = relative(parent, candidate);
  return child === "" || (!child.startsWith(`..${sep}`) && child !== "..");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as ProxyReplayJsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function serializeProxyReplayDocument(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

async function discoverDebugFiles(logsDir: string): Promise<string[]> {
  const entries = await readdir(logsDir, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      throw new Error(
        `Unable to read proxy logs at ${logsDir}: ${error.message}`,
      );
    },
  );
  return entries
    .filter((entry) => entry.isFile() && DEBUG_FILE_PATTERN.test(entry.name))
    .map((entry) => join(logsDir, entry.name))
    .sort();
}

async function findRequestIndexEntries(
  files: string[],
  requestId: string,
): Promise<
  Array<{
    index: ProxyReplayJsonRecord;
    filePath: string;
    line: number;
  }>
> {
  const matches: Array<{
    index: ProxyReplayJsonRecord;
    filePath: string;
    line: number;
  }> = [];
  const encodedRequestId = JSON.stringify(requestId);
  for (const filePath of files) {
    const lines = createInterface({
      input: createReadStream(filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    let lineNumber = 0;
    for await (const line of lines) {
      lineNumber += 1;
      if (!line.includes(encodedRequestId)) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      const index = recordValue(parsed);
      if (index?.type === "body_capture" && index.requestId === requestId) {
        matches.push({ index, filePath, line: lineNumber });
      }
    }
  }
  return matches;
}

async function loadArtifact(args: {
  logsDir: string;
  bodyPath: string;
  expectedRequestId: string;
  expectedPhase: string;
  expectedSha256: string | null;
}): Promise<{ artifact: ProxyReplayJsonRecord; relativePath: string }> {
  const bodyRoot = resolve(args.logsDir, "bodies");
  const candidate = resolve(
    isAbsolute(args.bodyPath)
      ? args.bodyPath
      : join(args.logsDir, args.bodyPath),
  );
  if (!isWithin(bodyRoot, candidate)) {
    throw new Error(
      `Body artifact escapes the logs body directory: ${args.bodyPath}`,
    );
  }

  const [bodyRootReal, candidateReal, candidateLstat] = await Promise.all([
    realpath(bodyRoot),
    realpath(candidate),
    lstat(candidate),
  ]);
  if (
    !isWithin(bodyRootReal, candidateReal) ||
    candidateLstat.isSymbolicLink()
  ) {
    throw new Error(
      `Body artifact failed path-containment checks: ${args.bodyPath}`,
    );
  }
  const handle = await open(
    candidateReal,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  let compressed: Buffer;
  try {
    const info = await handle.stat();
    if (!info.isFile()) {
      throw new Error(`Body artifact is not a regular file: ${args.bodyPath}`);
    }
    if (info.size > MAX_COMPRESSED_ARTIFACT_BYTES) {
      throw new Error(
        `Compressed body artifact exceeds the ${MAX_COMPRESSED_ARTIFACT_BYTES}-byte safety limit`,
      );
    }
    compressed = await handle.readFile();
  } finally {
    await handle.close();
  }
  const payload = gunzipSync(compressed, {
    maxOutputLength: MAX_ARTIFACT_BYTES,
  });
  const artifact = recordValue(JSON.parse(payload.toString("utf8")));
  if (!artifact) {
    throw new Error(`Body artifact is not a JSON object: ${args.bodyPath}`);
  }
  if (
    artifact.requestId !== args.expectedRequestId ||
    artifact.phase !== args.expectedPhase
  ) {
    throw new Error(
      `Body artifact identity does not match its debug index: ${args.bodyPath}`,
    );
  }
  const body = typeof artifact.body === "string" ? artifact.body : null;
  if (
    body !== null &&
    args.expectedSha256 &&
    sha256(body) !== args.expectedSha256
  ) {
    throw new Error(
      `Body artifact SHA-256 does not match its debug index: ${args.bodyPath}`,
    );
  }

  return {
    artifact,
    relativePath: relative(args.logsDir, candidateReal).split(sep).join("/"),
  };
}

async function materializeCapture(args: {
  logsDir: string;
  requestId: string;
  index: ProxyReplayJsonRecord;
  filePath: string;
  line: number;
}): Promise<ProxyReplayCapture> {
  const phase = stringValue(args.index.phase) ?? "unknown";
  const expectedSha256 = stringValue(args.index.bodySha256);
  const issues: string[] = [];
  let artifact: ProxyReplayJsonRecord | null = null;
  let artifactPath: string | null = null;
  const bodyPath = stringValue(args.index.bodyPath);
  if (!bodyPath) {
    issues.push("body_artifact_missing");
  } else {
    try {
      const loaded = await loadArtifact({
        logsDir: args.logsDir,
        bodyPath,
        expectedRequestId: args.requestId,
        expectedPhase: phase,
        expectedSha256,
      });
      artifact = loaded.artifact;
      artifactPath = loaded.relativePath;
      for (const field of [
        "timestamp",
        "requestId",
        "phase",
        "model",
        "stream",
        "account",
        "accountType",
        "attempt",
        "responseStatus",
        "durationMs",
        "contentType",
        "headers",
        "metadata",
      ]) {
        if (stableJson(artifact[field]) !== stableJson(args.index[field])) {
          throw new Error(
            `Body artifact ${field} does not match its debug index: ${bodyPath}`,
          );
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        issues.push("body_artifact_missing");
      } else {
        throw error;
      }
    }
  }

  const source = artifact ?? args.index;
  const body = typeof artifact?.body === "string" ? artifact.body : null;
  if (body !== null && !expectedSha256) {
    issues.push("body_hash_missing");
  }
  return {
    timestamp:
      stringValue(source.timestamp) ?? stringValue(args.index.timestamp) ?? "",
    phase,
    attempt: finiteNumber(source.attempt),
    model: stringValue(source.model),
    stream: typeof source.stream === "boolean" ? source.stream : null,
    account: stringValue(source.account),
    accountType: stringValue(source.accountType),
    responseStatus: finiteNumber(source.responseStatus),
    durationMs: finiteNumber(source.durationMs),
    contentType: stringValue(source.contentType),
    headers: headersValue(source.headers),
    body,
    bodySha256: body === null ? expectedSha256 : sha256(body),
    bodyTruncated: args.index.bodyTruncated === true,
    observedBodyBytes: finiteNumber(args.index.observedBodyBytes),
    metadata: recordValue(source.metadata),
    source: {
      indexFile: basename(args.filePath),
      indexLine: args.line,
      artifactPath,
    },
    issues,
  };
}

function captureSort(
  left: ProxyReplayCapture,
  right: ProxyReplayCapture,
): number {
  return (
    left.timestamp.localeCompare(right.timestamp) ||
    (left.attempt ?? -1) - (right.attempt ?? -1) ||
    left.phase.localeCompare(right.phase) ||
    left.source.indexFile.localeCompare(right.source.indexFile) ||
    left.source.indexLine - right.source.indexLine
  );
}

function findCapture(
  captures: ProxyReplayCapture[],
  phase: string,
  attempt?: number,
): ProxyReplayCapture | null {
  const matches = captures.filter(
    (capture) =>
      capture.phase === phase &&
      (attempt === undefined || capture.attempt === attempt),
  );
  return matches.at(-1) ?? null;
}

export async function exportProxyReplayBundle(
  options: ExportProxyReplayOptions,
): Promise<ProxyReplayBundle> {
  if (!options.requestId || options.requestId.length > 256) {
    throw new Error("requestId must contain between 1 and 256 characters");
  }
  if (
    options.attempt !== undefined &&
    (!Number.isInteger(options.attempt) || options.attempt < 1)
  ) {
    throw new Error("attempt must be a positive integer");
  }
  const logsDir = resolve(
    options.logsDir ?? join(homedir(), ".neurolink", "logs"),
  );
  const debugFiles = await discoverDebugFiles(logsDir);
  const indexEntries = await findRequestIndexEntries(
    debugFiles,
    options.requestId,
  );
  if (indexEntries.length === 0) {
    throw new Error(`No body captures found for request ${options.requestId}`);
  }
  const captures = (
    await Promise.all(
      indexEntries.map((entry) =>
        materializeCapture({ logsDir, requestId: options.requestId, ...entry }),
      ),
    )
  ).sort(captureSort);
  const upstreamAttempts = captures
    .filter(
      (capture) =>
        capture.phase === "upstream_request" && capture.attempt !== null,
    )
    .map((capture) => capture.attempt as number);
  const selectedAttempt =
    options.attempt ??
    upstreamAttempts.reduce(
      (highest, attempt) => Math.max(highest, attempt),
      Number.NEGATIVE_INFINITY,
    );
  if (!Number.isFinite(selectedAttempt)) {
    throw new Error(
      `Request ${options.requestId} has no captured upstream attempt`,
    );
  }
  const upstreamRequest = findCapture(
    captures,
    "upstream_request",
    selectedAttempt,
  );
  if (!upstreamRequest) {
    throw new Error(
      `Request ${options.requestId} has no upstream_request capture for attempt ${selectedAttempt}`,
    );
  }
  const capturedResponse = findCapture(
    captures,
    "upstream_response",
    selectedAttempt,
  );
  const phasesPresent = [
    ...new Set(captures.map((capture) => capture.phase)),
  ].sort();
  const missingRequiredPhases = [
    ...(findCapture(captures, "client_request") ? [] : ["client_request"]),
    ...(upstreamRequest ? [] : ["upstream_request"]),
    ...(capturedResponse ? [] : ["upstream_response"]),
    ...(findCapture(captures, "client_response") ? [] : ["client_response"]),
  ];
  const requiredHeaderInputs = Object.entries(upstreamRequest.headers)
    .filter(([, value]) => value === REDACTED_VALUE)
    .map(([name]) => name.toLowerCase())
    .sort();
  const metadata = upstreamRequest.metadata ?? {};
  const url = stringValue(metadata.upstreamUrl);
  const method = (stringValue(metadata.upstreamMethod) ?? "POST").toUpperCase();
  const blockers = [
    ...missingRequiredPhases.map((phase) => `missing_phase:${phase}`),
    ...(url ? [] : ["missing_upstream_url"]),
    ...(upstreamRequest.body === null ? ["missing_upstream_request_body"] : []),
    ...(upstreamRequest.bodyTruncated
      ? ["upstream_request_body_truncated"]
      : []),
    ...(upstreamRequest.body?.includes(REDACTED_VALUE)
      ? ["upstream_request_body_contains_redactions"]
      : []),
    ...captures.flatMap((capture) =>
      capture.issues.map(
        (issue) => `${capture.phase}:${capture.attempt ?? "none"}:${issue}`,
      ),
    ),
  ].sort();

  return {
    schemaVersion: 1,
    kind: BUNDLE_KIND,
    requestId: options.requestId,
    selectedAttempt,
    source: {
      logsDirectory: basename(logsDir),
      indexFiles: [
        ...new Set(captures.map((capture) => capture.source.indexFile)),
      ].sort(),
    },
    completeness: {
      captures: captures.length,
      phasesPresent,
      missingRequiredPhases,
      truncatedCaptures: captures.filter((capture) => capture.bodyTruncated)
        .length,
      artifactsWithIssues: captures.filter(
        (capture) => capture.issues.length > 0,
      ).length,
      replayable: blockers.length === 0,
      blockers,
    },
    request: {
      method,
      url,
      headers: upstreamRequest.headers,
      requiredHeaderInputs,
      body: upstreamRequest.body,
      bodySha256: upstreamRequest.bodySha256,
      bodyTruncated: upstreamRequest.bodyTruncated,
      contentType: upstreamRequest.contentType,
      account: upstreamRequest.account,
      accountType: upstreamRequest.accountType,
      model: upstreamRequest.model,
      stream: upstreamRequest.stream,
    },
    capturedResponse,
    captures,
  };
}

export async function writeProxyReplayDocument(
  outputPath: string,
  document: unknown,
): Promise<{ path: string; sha256: string }> {
  const resolvedPath = resolve(outputPath);
  const outputDirectory = dirname(resolvedPath);
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const existing = await lstat(resolvedPath).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    },
  );
  if (existing?.isSymbolicLink()) {
    throw new Error(`Refusing to replace symlink output path: ${resolvedPath}`);
  }
  const serialized = serializeProxyReplayDocument(document);
  const documentBytes = Buffer.byteLength(serialized, "utf8");
  if (documentBytes > MAX_BUNDLE_BYTES) {
    throw new Error(
      `Replay document exceeds the ${MAX_BUNDLE_BYTES}-byte safety limit`,
    );
  }
  const temporaryPath = join(
    outputDirectory,
    `.${basename(resolvedPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const handle = await open(
    temporaryPath,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL,
    0o600,
  );
  try {
    try {
      await handle.writeFile(serialized);
      await handle.chmod(0o600);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, resolvedPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  return { path: resolvedPath, sha256: sha256(serialized) };
}

export async function readProxyReplayBundle(
  bundlePath: string,
): Promise<ProxyReplayBundle> {
  const resolvedPath = resolve(bundlePath);
  const info = await stat(resolvedPath);
  if (!info.isFile() || info.size > MAX_BUNDLE_BYTES) {
    throw new Error(
      `Replay bundle must be a regular file no larger than ${MAX_BUNDLE_BYTES} bytes`,
    );
  }
  const parsed = JSON.parse(await readFile(resolvedPath, "utf8")) as unknown;
  assertProxyReplayBundle(parsed);
  return parsed;
}

function normalizedContentType(value: string | null): string | null {
  return value?.split(";", 1)[0]?.trim().toLowerCase() || null;
}

function jsonShape(body: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const paths: string[] = [];
  const walk = (value: unknown, path: string, depth: number): void => {
    if (paths.length >= 2_000 || depth > 20) {
      return;
    }
    if (Array.isArray(value)) {
      paths.push(`${path}:array`);
      value
        .slice(0, 20)
        .forEach((child, index) => walk(child, `${path}/${index}`, depth + 1));
      return;
    }
    if (value && typeof value === "object") {
      paths.push(`${path}:object`);
      for (const [key, child] of Object.entries(
        value as ProxyReplayJsonRecord,
      ).sort(([left], [right]) => left.localeCompare(right))) {
        walk(
          child,
          `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          depth + 1,
        );
      }
      return;
    }
    paths.push(`${path}:${value === null ? "null" : typeof value}`);
  };
  walk(parsed, "", 0);
  return paths;
}

function validateDirectEndpoint(value: string, explicitOverride: boolean): URL {
  if (!value) {
    throw new Error(
      "Replay bundle has no upstream URL; provide an explicit URL override",
    );
  }
  const endpoint = new URL(value);
  if (endpoint.username || endpoint.password || endpoint.hash) {
    throw new Error(
      "Replay endpoint must not contain credentials or a fragment",
    );
  }
  for (const name of endpoint.searchParams.keys()) {
    if (SENSITIVE_QUERY_NAME_PATTERN.test(name)) {
      throw new Error(
        `Replay endpoint must not contain a sensitive query parameter: ${name}`,
      );
    }
  }
  const loopback = ["127.0.0.1", "::1", "[::1]", "localhost"].includes(
    endpoint.hostname,
  );
  if (
    endpoint.protocol !== "https:" &&
    !(endpoint.protocol === "http:" && loopback)
  ) {
    throw new Error(
      "Replay endpoint must use HTTPS; HTTP is allowed only for loopback testing",
    );
  }
  if (
    !explicitOverride &&
    !TRUSTED_CAPTURED_ENDPOINTS.has(endpoint.toString())
  ) {
    throw new Error(
      "Replay bundle contains an untrusted endpoint; pass an explicit URL override to authorize it",
    );
  }
  return endpoint;
}

async function readBoundedResponse(response: Response): Promise<{
  body: string;
  observedBytes: number;
  truncated: boolean;
}> {
  if (!response.body) {
    return { body: "", observedBytes: 0, truncated: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let storedBytes = 0;
  let observedBytes = 0;
  let truncated = false;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      observedBytes += next.value.byteLength;
      if (storedBytes < MAX_DIRECT_RESPONSE_BYTES) {
        const remaining = MAX_DIRECT_RESPONSE_BYTES - storedBytes;
        chunks.push(next.value.slice(0, remaining));
        storedBytes += Math.min(remaining, next.value.byteLength);
      }
      if (observedBytes > MAX_DIRECT_RESPONSE_BYTES) {
        truncated = true;
        await reader
          .cancel("bounded replay comparison capture")
          .catch(() => undefined);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return {
    body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
      "utf8",
    ),
    observedBytes,
    truncated,
  };
}

export async function compareProxyReplayBundle(
  bundle: ProxyReplayBundle,
  options: CompareProxyReplayOptions,
): Promise<ProxyReplayComparison> {
  assertProxyReplayBundle(bundle);
  if (!options.execute) {
    throw new Error(
      "Direct replay is disabled unless execute=true is explicitly provided",
    );
  }
  if (!["POST", "PUT", "PATCH"].includes(bundle.request.method)) {
    throw new Error(
      `Unsupported replay request method: ${bundle.request.method}`,
    );
  }
  const requestBody = options.bodyOverride ?? bundle.request.body;
  if (requestBody === null) {
    throw new Error("Replay request body is missing; provide a body override");
  }
  if (
    options.bodyOverride === undefined &&
    (bundle.request.bodyTruncated || requestBody.includes(REDACTED_VALUE))
  ) {
    throw new Error(
      "Captured replay body is truncated or redacted; provide a complete body override",
    );
  }
  if (
    options.bodyOverride === undefined &&
    bundle.request.bodySha256 === null
  ) {
    throw new Error(
      "Captured replay body has no verified hash; provide a complete body override",
    );
  }
  const endpoint = validateDirectEndpoint(
    options.urlOverride ?? bundle.request.url ?? "",
    options.urlOverride !== undefined,
  );
  const suppliedHeaders = Object.fromEntries(
    Object.entries(options.headerValues ?? {}).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  const invalidHeaderNames = Object.keys(suppliedHeaders).filter(
    (name) => !isValidProxyReplayHeaderName(name),
  );
  if (invalidHeaderNames.length > 0) {
    throw new Error(
      `Invalid replay header names: ${invalidHeaderNames.join(", ")}`,
    );
  }
  const requiredHeaderInputs = [
    ...new Set([
      ...bundle.request.requiredHeaderInputs.map((name) => name.toLowerCase()),
      ...Object.entries(bundle.request.headers)
        .filter(([, value]) => value === REDACTED_VALUE)
        .map(([name]) => name.toLowerCase()),
    ]),
  ].sort();
  const missingHeaderValues = requiredHeaderInputs.filter(
    (name) => !suppliedHeaders[name],
  );
  if (missingHeaderValues.length > 0) {
    throw new Error(
      `Missing environment-backed values for redacted headers: ${missingHeaderValues.join(", ")}`,
    );
  }
  const requestHeaders: Record<string, string> = {};
  for (const [name, capturedValue] of Object.entries(bundle.request.headers)) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }
    requestHeaders[lower] =
      capturedValue === REDACTED_VALUE
        ? (suppliedHeaders[lower] as string)
        : capturedValue;
  }
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 600_000) {
    throw new Error(
      "Replay timeout must be between 1000 and 600000 milliseconds",
    );
  }
  const now = options.now ?? Date.now;
  const startedAt = now();
  const response = await (options.fetchImpl ?? fetch)(endpoint, {
    method: bundle.request.method,
    headers: requestHeaders,
    body: requestBody,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const headersAt = now();
  const rawResponseHeaders = Object.fromEntries(response.headers.entries());
  const directCapture = await readBoundedResponse(response);
  const endedAt = now();
  const preparedBody = prepareProxyBodyForLogging(directCapture.body);
  const redactedBody = preparedBody.value ?? "";
  const captured = bundle.capturedResponse;
  const capturedShape = captured?.body ? jsonShape(captured.body) : null;
  const directShape = jsonShape(redactedBody);
  const capturedContentType = normalizedContentType(
    captured?.contentType ?? null,
  );
  const directContentType = normalizedContentType(
    response.headers.get("content-type"),
  );

  return {
    schemaVersion: 1,
    kind: COMPARISON_KIND,
    requestId: bundle.requestId,
    selectedAttempt: bundle.selectedAttempt,
    endpoint: endpoint.toString(),
    request: {
      method: bundle.request.method,
      headers: redactProxyHeadersForLogging(requestHeaders) ?? {},
      bodySha256: sha256(requestBody),
      bodyBytes: Buffer.byteLength(requestBody, "utf8"),
      usedBodyOverride: options.bodyOverride !== undefined,
    },
    captured: captured
      ? {
          status: captured.responseStatus,
          contentType: captured.contentType,
          bodySha256: captured.bodySha256,
          bodyBytes: captured.observedBodyBytes,
          bodyTruncated: captured.bodyTruncated,
          jsonShape: capturedShape,
        }
      : null,
    direct: {
      status: response.status,
      headers: redactProxyHeadersForLogging(rawResponseHeaders) ?? {},
      contentType: response.headers.get("content-type"),
      body: redactedBody,
      bodySha256: sha256(redactedBody),
      observedBodyBytes: directCapture.observedBytes,
      storedBodyBytes: Buffer.byteLength(redactedBody, "utf8"),
      bodyTruncated: directCapture.truncated || preparedBody.truncated,
      timeToHeadersMs: headersAt - startedAt,
      totalMs: endedAt - startedAt,
      jsonShape: directShape,
    },
    comparison: {
      statusMatches:
        captured && captured.responseStatus !== null
          ? captured.responseStatus === response.status
          : null,
      contentTypeMatches: captured
        ? capturedContentType !== null && directContentType !== null
          ? capturedContentType === directContentType
          : null
        : null,
      bodyHashMatches:
        captured?.bodySha256 &&
        !captured.bodyTruncated &&
        !directCapture.truncated &&
        !preparedBody.truncated
          ? captured.bodySha256 === sha256(redactedBody)
          : null,
      jsonShapeMatches:
        capturedShape &&
        directShape &&
        !captured?.bodyTruncated &&
        !directCapture.truncated &&
        !preparedBody.truncated
          ? JSON.stringify(capturedShape) === JSON.stringify(directShape)
          : null,
    },
  };
}
