#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";

/**
 * Continuous Test Suite — Robust Retry-After and X-RateLimit-Reset parsing.
 *
 * Verifies that:
 * 1. An RFC 3339 / ISO date is parsed as a date, not truncated by parseInt as its year.
 * 2. Duration strings like "6m0s" parse to their full duration (360s, not 6s).
 * 3. X-RateLimit-Reset values under 1e9 are treated as delta-seconds (e.g. "30" -> 30s),
 *    while values >= 1e9 are treated as Unix epoch timestamps.
 * 4. proxy/routingPolicy.ts shares the robust parsing logic with a 1000ms floor.
 *
 * DETERMINISM EXCEPTION (Rule 15):
 * This test directly accesses the parser helper functions `parseRetryAfterMs`,
 * `parseRetryAfterHeaderValue`, `parseRateLimitResetValue`, and `parseDurationMs`
 * from `src/lib/utils/retryAfter.ts`, as well as proxy routing's `parseRetryAfterMs`
 * from `src/lib/proxy/routingPolicy.ts`. Directly controlling parser inputs allows
 * deterministic verification of exact header values, mixed duration units,
 * fractional delta seconds, malformed header boundaries, and clock-relative dates
 * that live end-to-end calls cannot reliably provide.
 *
 * Run: npx tsx test/continuous-test-suite-retry-after-parsing.ts
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import {
  parseRetryAfterMs as parseRetryAfterFromHeaders,
  parseRetryAfterHeaderValue,
  parseRateLimitResetValue,
  parseDurationMs,
} from "../src/lib/utils/retryAfter.js";
import { parseRetryAfterMs as parseRetryAfterProxy } from "../src/lib/proxy/routingPolicy.js";

const { test, runSuite } = defineSuite("retry-after-parsing", {
  offline: true,
});

void runSuite(async () => {
  await test("oversized numeric and duration hints never return an unsafe delay", () => {
    const overflow = "9".repeat(306);
    const unsafeSeconds = "9007199254741";
    for (const raw of [
      overflow,
      `${overflow}h`,
      unsafeSeconds,
      `${unsafeSeconds}s`,
    ]) {
      assertEqual(
        parseRetryAfterHeaderValue(raw),
        undefined,
        "an unrepresentable hint must be rejected",
      );
      assertEqual(
        parseRetryAfterProxy(raw),
        0,
        "a rejected proxy hint must use the no-hint path",
      );
    }
    assertEqual(
      parseDurationMs(`${overflow}h`),
      undefined,
      "duration accumulation must stay finite",
    );
    assertEqual(
      parseRateLimitResetValue(overflow),
      undefined,
      "an unrepresentable reset must be rejected",
    );
    assertEqual(
      parseRetryAfterFromHeaders({
        "Retry-After": overflow,
        "X-RateLimit-Reset": "30",
      }),
      30_000,
      "an invalid primary hint must preserve a valid fallback",
    );
    assertEqual(
      parseRetryAfterHeaderValue("1.5"),
      1_500,
      "fractional seconds must retain their meaning",
    );
    assertEqual(
      parseDurationMs("6m0s"),
      360_000,
      "ordinary durations must retain their meaning",
    );
  });

  await test("duration string parser handles standard and mixed time units", () => {
    assertEqual(parseDurationMs("6m0s"), 360000, "6m0s is 360,000 ms");
    assertEqual(parseDurationMs("30s"), 30000, "30s is 30,000 ms");
    assertEqual(parseDurationMs("500ms"), 500, "500ms is 500 ms");
    assertEqual(parseDurationMs("1h30m"), 5400000, "1h30m is 5,400,000 ms");
    assertEqual(parseDurationMs("1.5s"), 1500, "1.5s is 1,500 ms");
    assertEqual(parseDurationMs(""), undefined, "empty duration is undefined");
    assertEqual(
      parseDurationMs("invalid"),
      undefined,
      "invalid string is undefined",
    );
    assertEqual(
      parseDurationMs("5"),
      undefined,
      "plain integer without unit is undefined",
    );
  });

  await test("parseRetryAfterHeaderValue parses strict integers and floats", () => {
    assertEqual(
      parseRetryAfterHeaderValue("5"),
      5000,
      "integer 5 seconds -> 5,000 ms",
    );
    assertEqual(
      parseRetryAfterHeaderValue("0"),
      0,
      "integer 0 seconds -> 0 ms",
    );
    assertEqual(
      parseRetryAfterHeaderValue("120"),
      120000,
      "integer 120 seconds -> 120,000 ms",
    );
    assertEqual(
      parseRetryAfterHeaderValue("1.5"),
      1500,
      "float 1.5 seconds -> 1,500 ms",
    );
  });

  await test("parseRetryAfterHeaderValue parses duration strings without leading integer truncation", () => {
    assertEqual(
      parseRetryAfterHeaderValue("6m0s"),
      360000,
      "6m0s parses to 360,000 ms (not 6,000 ms)",
    );
    assertEqual(
      parseRetryAfterHeaderValue("45s"),
      45000,
      "45s parses to 45,000 ms",
    );
  });

  await test("parseRetryAfterHeaderValue parses RFC 3339 dates without year truncation", () => {
    const now = Date.now();
    const futureIso = new Date(now + 120000).toISOString();
    const isoDelay = parseRetryAfterHeaderValue(futureIso);
    assert(typeof isoDelay === "number", "ISO date parsed to a number");
    assert(
      isoDelay! >= 115000 && isoDelay! <= 125000,
      `ISO date +120s parses near 120,000 ms (got ${isoDelay})`,
    );

    const pastIso = new Date(now - 60000).toISOString();
    assertEqual(
      parseRetryAfterHeaderValue(pastIso),
      0,
      "past date clamps to 0 ms",
    );
  });

  await test("parseRetryAfterHeaderValue parses HTTP-date format", () => {
    const now = Date.now();
    const futureHttpDate = new Date(now + 60000).toUTCString();
    const httpDelay = parseRetryAfterHeaderValue(futureHttpDate);
    assert(typeof httpDelay === "number", "HTTP date parsed to a number");
    assert(
      httpDelay! >= 55000 && httpDelay! <= 65000,
      `HTTP date +60s parses near 60,000 ms (got ${httpDelay})`,
    );

    assertEqual(
      parseRetryAfterHeaderValue(null),
      undefined,
      "null returns undefined",
    );
    assertEqual(
      parseRetryAfterHeaderValue(""),
      undefined,
      "empty returns undefined",
    );
    assertEqual(
      parseRetryAfterHeaderValue("garbage"),
      undefined,
      "garbage returns undefined",
    );
  });

  await test("parseRateLimitResetValue parses delta-seconds vs unix epochs", () => {
    // Delta seconds (< 1e9)
    assertEqual(
      parseRateLimitResetValue("30"),
      30000,
      "delta-seconds 30 -> 30,000 ms (not 0 ms)",
    );
    assertEqual(
      parseRateLimitResetValue("60"),
      60000,
      "delta-seconds 60 -> 60,000 ms",
    );

    // Epoch in seconds (>= 1e9)
    const now = Date.now();
    const futureEpochSeconds = Math.floor(now / 1000) + 40;
    const epochSecDelay = parseRateLimitResetValue(String(futureEpochSeconds));
    assert(
      typeof epochSecDelay === "number",
      "epoch seconds parsed to a number",
    );
    assert(
      epochSecDelay! >= 35000 && epochSecDelay! <= 45000,
      `epoch seconds +40s parses near 40,000 ms (got ${epochSecDelay})`,
    );

    // Epoch in milliseconds (> 1e12)
    const futureEpochMs = now + 90000;
    const epochMsDelay = parseRateLimitResetValue(String(futureEpochMs));
    assert(typeof epochMsDelay === "number", "epoch ms parsed to a number");
    assert(
      epochMsDelay! >= 85000 && epochMsDelay! <= 95000,
      `epoch ms +90s parses near 90,000 ms (got ${epochMsDelay})`,
    );

    // Past epoch
    assertEqual(
      parseRateLimitResetValue("1000000000"),
      0,
      "past epoch clamps to 0 ms",
    );
  });

  await test("parseRetryAfterMs from utils correctly extracts from header objects", () => {
    const headers1 = new Headers({ "Retry-After": "6m0s" });
    assertEqual(
      parseRetryAfterFromHeaders(headers1),
      360000,
      "Headers with Retry-After: 6m0s yields 360,000 ms",
    );

    const headers2 = { "X-RateLimit-Reset": "30" };
    assertEqual(
      parseRetryAfterFromHeaders(headers2),
      30000,
      "Headers with X-RateLimit-Reset: 30 yields 30,000 ms",
    );

    const headers3 = { "X-RateLimit-Remaining": "0" };
    assertEqual(
      parseRetryAfterFromHeaders(headers3),
      1000,
      "X-RateLimit-Remaining: 0 yields default 1,000 ms",
    );

    const headers4 = { "Content-Type": "application/json" };
    assertEqual(
      parseRetryAfterFromHeaders(headers4),
      undefined,
      "No rate limit headers yields undefined",
    );
  });

  await test("parseRetryAfterMs from routingPolicy shares logic and enforces 1000ms floor", () => {
    assertEqual(parseRetryAfterProxy("5"), 5000, "Proxy parses 5s to 5000ms");
    assertEqual(
      parseRetryAfterProxy("6m0s"),
      360000,
      "Proxy parses 6m0s to 360,000 ms",
    );
    assertEqual(parseRetryAfterProxy("0"), 1000, "Proxy enforces 1000ms floor");
    assertEqual(
      parseRetryAfterProxy(null),
      0,
      "Proxy with null header yields 0",
    );
    assertEqual(
      parseRetryAfterProxy("invalid"),
      0,
      "Proxy with invalid header yields 0",
    );

    const futureIso = new Date(Date.now() + 120000).toISOString();
    const proxyIsoDelay = parseRetryAfterProxy(futureIso);
    assert(
      proxyIsoDelay >= 115000 && proxyIsoDelay <= 125000,
      `Proxy parses ISO date +120s correctly`,
    );
  });
});
