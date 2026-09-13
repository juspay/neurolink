#!/usr/bin/env node
/** Bounded, deterministic OpenObserve history queries; never accept partial data. */
import { pathToFileURL } from "node:url";

const KINDS = new Set([
  "request_final",
  "attempt",
  "lifecycle",
  "supervisor",
  "body_capture_index",
  "stream_error",
]);

/**
 * Query metadata in small windows; body chunks require a targeted lookup.
 * @param {{ baseUrl: string, organization?: string, stream?: string, authorization?: string, startTime: number, endTime: number, kind?: string, maxRows?: number, fetchImpl?: typeof fetch }} options
 */
export async function queryProxyHistory({
  baseUrl,
  organization = "default",
  stream = "neurolink_proxy",
  authorization,
  startTime,
  endTime,
  kind = "request_final",
  maxRows = 10_000,
  fetchImpl = fetch,
}) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(organization) ||
    !/^[a-zA-Z0-9_]+$/.test(stream) ||
    !KINDS.has(kind)
  ) {
    throw new Error("Invalid organization, stream or metadata record kind");
  }
  if (
    !Number.isSafeInteger(startTime) ||
    !Number.isSafeInteger(endTime) ||
    startTime >= endTime ||
    !Number.isSafeInteger(maxRows) ||
    maxRows < 1 ||
    maxRows > 100_000
  ) {
    throw new Error(
      "Provide an increasing microsecond time range and maxRows between 1 and 100000",
    );
  }
  const endpoint = new URL(`/api/${organization}/_search?type=logs`, baseUrl);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (authorization && endpoint.protocol !== "https:" && !(
    endpoint.protocol === "http:" && loopback
  )) {
    throw new Error("Credentialed OpenObserve queries require HTTPS outside loopback");
  }
  /** @type {Array<{start: number, endExclusive: number, offset: number, partial: boolean, tookMs?: number}>} */
  const queries = [];
  let rowsRead = 0;
  /** @param {number} start @param {number} end @returns {Promise<Array<Record<string, unknown>>>} */
  async function readWindow(start, end) {
    const rows = [];
    for (let offset = 0; ; offset += 200) {
      if (queries.length >= 512) {
        throw new Error(
          "History exceeds the 512-query budget; narrow the interval",
        );
      }
      const response = await fetchImpl(endpoint, {
        method: "POST",
        redirect: authorization ? "error" : "follow",
        signal: globalThis.AbortSignal.timeout(30_000),
        headers: {
          "Content-Type": "application/json",
          ...(authorization ? { Authorization: authorization } : {}),
        },
        body: JSON.stringify({
          query: {
            // The body is small metadata, not arbitrary request/response chunks.
            // Include a secondary key: timestamp-only paging loses equal-time events.
            sql: `SELECT _timestamp, service_instance_id, request_id, body FROM "${stream}" WHERE proxy_record_kind='${kind}' ORDER BY _timestamp ASC, service_instance_id ASC, request_id ASC, body ASC`,
            start_time: start,
            end_time: end - 1,
            from: offset,
            size: 200,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`OpenObserve search failed: HTTP ${response.status}`);
      }
      const result = await response.json();
      const partial =
        result.is_partial === true ||
        (Array.isArray(result.function_error)
          ? result.function_error.length > 0
          : Boolean(result.function_error));
      queries.push({
        start,
        endExclusive: end,
        offset,
        partial,
        tookMs: result.took,
      });
      if (partial) {
        // Discard this window's pages before splitting, so no page is duplicated.
        if (end - start <= 10_000_000) {
          throw new Error(
            "OpenObserve still returned partial data in a 10-second window; no complete report can be produced",
          );
        }
        rowsRead -= rows.length;
        const middle = Math.floor((start + end) / 2);
        return [
          ...(await readWindow(start, middle)),
          ...(await readWindow(middle, end)),
        ];
      }
      if (!Array.isArray(result.hits)) {
        throw new Error("OpenObserve search omitted hits");
      }
      rowsRead += result.hits.length;
      if (rowsRead > maxRows) {
        throw new Error(
          `History exceeds the explicit ${maxRows}-row bound; narrow the interval or increase --max-rows`,
        );
      }
      rows.push(...result.hits);
      if (result.hits.length < 200) {
        return rows;
      }
    }
  }
  const records = [];
  for (let start = startTime; start < endTime; start += 600_000_000) {
    records.push(
      ...(await readWindow(start, Math.min(start + 600_000_000, endTime))),
    );
  }
  return {
    startTime,
    endTimeExclusive: endTime,
    kind,
    complete: true,
    recordCount: records.length,
    queries,
    records,
  };
}

async function main() {
  const args = process.argv.slice(2);
  /** @param {string} name */
  const value = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  if (args.includes("--help")) {
    console.log(
      "Usage: node scripts/observability/query-proxy-history.mjs --since ISO_DATE [--until ISO_DATE] [--kind request_final|attempt|lifecycle|supervisor|body_capture_index|stream_error] [--max-rows 10000]",
    );
    return;
  }
  const since = Date.parse(value("--since") ?? "");
  const untilValue = value("--until");
  const until = untilValue ? Date.parse(untilValue) : Date.now();
  const user = process.env.NEUROLINK_OPENOBSERVE_USER;
  const password = process.env.NEUROLINK_OPENOBSERVE_PASSWORD;
  const authorization =
    process.env.NEUROLINK_OPENOBSERVE_BASIC_AUTH ??
    (user && password
      ? `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`
      : undefined);
  const report = await queryProxyHistory({
    baseUrl: process.env.NEUROLINK_OPENOBSERVE_URL ?? "http://127.0.0.1:5080",
    organization: process.env.NEUROLINK_OPENOBSERVE_ORG ?? "default",
    stream: process.env.NEUROLINK_PROXY_STREAM_HEADER ?? "neurolink_proxy",
    authorization,
    startTime: since * 1000,
    endTime: until * 1000,
    kind: value("--kind") ?? "request_final",
    maxRows: Number(value("--max-rows") ?? 10_000),
  });
  console.log(JSON.stringify(report, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
