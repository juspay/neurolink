#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_OPENOBSERVE_URL = "http://localhost:5080";
const DEFAULT_OPENOBSERVE_ORG = "default";
const DEFAULT_OPENOBSERVE_USER = "root@example.com";
const DEFAULT_OPENOBSERVE_PASSWORD = "Complexpass#123";
const DEFAULT_MAX_LAG_SECONDS = 900;
const STREAMS_TO_CHECK = [
  {
    type: "logs",
    name: "neurolink_proxy",
    label: "OpenObserve logs",
  },
  {
    type: "traces",
    name: "neurolink_proxy",
    label: "OpenObserve traces",
  },
  {
    type: "metrics",
    name: "proxy_requests_total",
    label: "OpenObserve proxy metrics",
  },
];

function getAuthHeader() {
  if (process.env.NEUROLINK_OPENOBSERVE_BASIC_AUTH) {
    return process.env.NEUROLINK_OPENOBSERVE_BASIC_AUTH;
  }

  const user =
    process.env.NEUROLINK_OPENOBSERVE_USER || DEFAULT_OPENOBSERVE_USER;
  const password =
    process.env.NEUROLINK_OPENOBSERVE_PASSWORD || DEFAULT_OPENOBSERVE_PASSWORD;

  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function formatDate(micros) {
  return new Date(Math.floor(micros / 1000)).toISOString();
}

function formatAgeSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "n/a";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

function summarizeLag(ageSeconds, thresholdSeconds) {
  if (!Number.isFinite(ageSeconds)) {
    return "missing";
  }
  return ageSeconds <= thresholdSeconds ? "fresh" : "stale";
}

async function fetchStreams(type) {
  const url = new URL(
    `/api/${process.env.NEUROLINK_OPENOBSERVE_ORG || DEFAULT_OPENOBSERVE_ORG}/streams?type=${type}`,
    process.env.NEUROLINK_OPENOBSERVE_URL || DEFAULT_OPENOBSERVE_URL,
  );

  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${type} streams: ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();
  return body.list || [];
}

async function readLatestLocalSummary() {
  const logsDir = join(homedir(), ".neurolink", "logs");
  let entries;
  try {
    entries = await fs.readdir(logsDir);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null; // No log directory yet — fresh setup
    }
    throw err;
  }
  const files = entries
    .filter((name) => /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))
    .sort()
    .reverse();

  for (const name of files) {
    const path = join(logsDir, name);
    let handle;
    try {
      handle = await fs.open(path, "r");
    } catch (err) {
      if (err.code === "ENOENT") {
        return null;
      }
      throw err;
    }
    try {
      const stats = await handle.stat();
      const chunkSize = Math.min(stats.size, 64 * 1024);
      const buffer = Buffer.alloc(chunkSize);
      await handle.read(buffer, 0, chunkSize, stats.size - chunkSize);
      const lines = buffer
        .toString("utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          return JSON.parse(lines[i]);
        } catch {
          // ignore malformed tail line
        }
      }
    } finally {
      await handle.close();
    }
  }

  return null;
}

async function main() {
  const thresholdSeconds = Number(
    process.env.NEUROLINK_PROXY_TELEMETRY_MAX_LAG_SEC ||
      DEFAULT_MAX_LAG_SECONDS,
  );
  const nowMicros = Date.now() * 1000;

  const groupedStreams = Object.fromEntries(
    await Promise.all(
      [...new Set(STREAMS_TO_CHECK.map((stream) => stream.type))].map(
        async (type) => [type, await fetchStreams(type)],
      ),
    ),
  );

  const localSummary = await readLatestLocalSummary();
  const localSummaryMicros = localSummary?.timestamp
    ? new Date(localSummary.timestamp).getTime() * 1000
    : null;

  console.log("NeuroLink Proxy Telemetry Doctor");
  console.log("================================");
  console.log(
    `OpenObserve: ${process.env.NEUROLINK_OPENOBSERVE_URL || DEFAULT_OPENOBSERVE_URL}`,
  );
  console.log(`Lag threshold: ${thresholdSeconds}s`);
  console.log("");

  let hasProblem = false;

  for (const stream of STREAMS_TO_CHECK) {
    const item = groupedStreams[stream.type]?.find(
      (entry) => entry.name === stream.name,
    );
    const latestMicros = item?.stats?.doc_time_max ?? null;
    const ageSeconds = latestMicros
      ? Math.max(0, (nowMicros - latestMicros) / 1_000_000)
      : Number.NaN;
    const status = summarizeLag(ageSeconds, thresholdSeconds);
    if (status !== "fresh") {
      hasProblem = true;
    }

    console.log(`${stream.label}: ${status}`);
    console.log(`  stream: ${stream.name}`);
    console.log(`  latest: ${latestMicros ? formatDate(latestMicros) : "missing"}`);
    console.log(`  age: ${formatAgeSeconds(ageSeconds)}`);
    console.log(`  docs: ${item?.stats?.doc_num ?? 0}`);
  }

  console.log("");
  console.log("Local proxy summary log:");
  if (!localSummary || !localSummaryMicros) {
    console.log("  missing");
    hasProblem = true;
  } else {
    const ageSeconds = Math.max(0, (nowMicros - localSummaryMicros) / 1_000_000);
    console.log(`  latest: ${localSummary.timestamp}`);
    console.log(`  age: ${formatAgeSeconds(ageSeconds)}`);
    console.log(`  requestId: ${localSummary.requestId}`);
    console.log(`  status: ${localSummary.responseStatus}`);
    console.log(`  accountType: ${localSummary.accountType}`);
  }

  if (localSummaryMicros) {
    console.log("");
    console.log("Lag vs local summary:");
    for (const stream of STREAMS_TO_CHECK) {
      const item = groupedStreams[stream.type]?.find(
        (entry) => entry.name === stream.name,
      );
      const latestMicros = item?.stats?.doc_time_max ?? null;
      const deltaSeconds = latestMicros
        ? Math.abs(localSummaryMicros - latestMicros) / 1_000_000
        : Number.NaN;
      const status = summarizeLag(deltaSeconds, thresholdSeconds);
      if (status !== "fresh") {
        hasProblem = true;
      }
      console.log(`  ${stream.name}: ${status} (${formatAgeSeconds(deltaSeconds)})`);
    }
  }

  if (hasProblem) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
