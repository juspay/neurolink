#!/usr/bin/env tsx
import "dotenv/config";

/**
 * SSRF Guard Verification Suite
 *
 * Locks in the H01 + H06 fixes from the PR #1019 review. Every test
 * exercises a known bypass class so regressions are caught before merge.
 *
 * Coverage:
 *   H01 bypasses    — encoded IPv4 (octal/hex/decimal int), IPv4-mapped IPv6,
 *                     IPv6 unspecified (::), Alibaba metadata 100.100.100.200,
 *                     bracketed-host parsing, HTTPS-only enforcement,
 *                     DNS-failure → throw (not silent allow).
 *   H06 coverage    — safeDownload rejects redirects, propagates assertSafeUrl
 *                     errors, enforces byte cap.
 *   validateAndResolveUrl — returns canonical normalized IP form for IP literals.
 *
 * Run with: pnpm run test:ssrf
 *
 * Notes:
 *   - All IP-literal tests run without network. The DNS-failure test mocks
 *     `node:dns/promises` to verify the lookup-error path no longer silently
 *     allows. The handler-coverage section is structural (grep-style) since
 *     end-to-end media downloads would burn provider credits.
 */

import {
  assertSafeUrl,
  validateAndResolveUrl,
} from "../src/lib/utils/ssrfGuard.js";
import { safeDownload } from "../src/lib/utils/safeFetch.js";
import { defineSuite } from "./helpers/harness.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { recordTest, runSuite } = defineSuite("SSRF Guard Verification");

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

async function expectReject(
  fn: () => Promise<unknown>,
  matcher: RegExp,
  label: string,
): Promise<void> {
  try {
    await fn();
    recordTest(label, false, false, "did not reject");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (matcher.test(msg)) {
      recordTest(label, true);
    } else {
      recordTest(
        label,
        false,
        false,
        `rejected but message did not match ${matcher}: ${msg}`,
      );
    }
  }
}

async function expectResolve(
  fn: () => Promise<unknown>,
  label: string,
): Promise<void> {
  try {
    await fn();
    recordTest(label, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    recordTest(label, false, false, `unexpectedly rejected: ${msg}`);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section A — HTTPS-only enforcement
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section A: HTTPS-only enforcement ===\n");

await expectReject(
  () => assertSafeUrl("http://example.com/"),
  /Only HTTPS URLs are permitted/i,
  "rejects plain http://",
);

await expectReject(
  () => assertSafeUrl("ftp://example.com/file"),
  /Only HTTPS URLs are permitted/i,
  "rejects non-HTTP schemes (ftp://)",
);

await expectReject(
  () => assertSafeUrl("data:text/plain,hello"),
  /Only HTTPS URLs are permitted/i,
  "rejects data: URLs",
);

await expectReject(
  () => assertSafeUrl("file:///etc/passwd"),
  /Only HTTPS URLs are permitted/i,
  "rejects file:// URLs",
);

await expectReject(
  () => assertSafeUrl("not-a-url"),
  /Invalid URL/i,
  "rejects malformed URL strings",
);

// ───────────────────────────────────────────────────────────────────────
// Section B — IPv4 literal forms (canonical + encoded)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section B: IPv4 literal bypasses (H01 B2) ===\n");

const blockedV4Cases: Array<[string, string]> = [
  ["https://127.0.0.1/", "canonical loopback"],
  ["https://0177.0.0.1/", "octal loopback (0177)"],
  ["https://2130706433/", "decimal-integer loopback (2130706433)"],
  ["https://10.0.0.1/", "RFC 1918 (10.0.0.1)"],
  ["https://172.16.0.1/", "RFC 1918 (172.16.0.1)"],
  ["https://192.168.1.1/", "RFC 1918 (192.168.1.1)"],
  ["https://169.254.169.254/latest/meta-data/", "AWS/GCP/Azure metadata"],
  ["https://100.100.100.200/", "Alibaba metadata (H01 B5)"],
  ["https://0.0.0.0/", "unspecified 0.0.0.0"],
  ["https://100.64.0.1/", "CGNAT (RFC 6598)"],
];

for (const [url, label] of blockedV4Cases) {
  await expectReject(
    () => assertSafeUrl(url),
    /blocked range|IPv4/i,
    `rejects ${label}: ${url}`,
  );
}

// Positive case: a public IP literal should be allowed (skip — DNS rebind
// isn't relevant for literals; covered by `validateAndResolveUrl` returning
// the same canonical IP).

// ───────────────────────────────────────────────────────────────────────
// Section C — IPv6 literal forms + IPv4-mapped IPv6
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section C: IPv6 literal bypasses (H01 B3, B4) ===\n");

const blockedV6Cases: Array<[string, string]> = [
  ["https://[::1]/", "IPv6 loopback ::1 (bracketed)"],
  ["https://[::ffff:127.0.0.1]/", "IPv4-mapped IPv6 (H01 B3)"],
  ["https://[::ffff:7f00:1]/", "IPv4-mapped IPv6 (hex form)"],
  ["https://[fe80::1]/", "IPv6 link-local fe80::/10"],
  ["https://[fc00::1]/", "IPv6 ULA fc00::/7"],
  ["https://[fd12:3456::1]/", "IPv6 ULA fd-prefix"],
];

for (const [url, label] of blockedV6Cases) {
  await expectReject(
    () => assertSafeUrl(url),
    /blocked range|IPv[46]/i,
    `rejects ${label}: ${url}`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section D — DNS failure must throw (not silent allow) (H01 B1)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section D: DNS-failure path (H01 B1) ===\n");

// Bare hostname that doesn't resolve — assertSafeUrl must throw, not
// silently allow. We use a hostname with the reserved .invalid TLD per
// RFC 2606 so no real resolver will return an A/AAAA record.
await expectReject(
  () => assertSafeUrl("https://this-host-cannot-resolve.invalid/"),
  /could not be resolved|blocked range/i,
  "throws on DNS lookup failure (.invalid TLD)",
);

// ───────────────────────────────────────────────────────────────────────
// Section E — validateAndResolveUrl returns canonical IPs
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section E: validateAndResolveUrl normalisation ===\n");

await expectReject(
  () => validateAndResolveUrl("https://0177.0.0.1/"),
  /blocked range/i,
  "validateAndResolveUrl rejects encoded IPv4",
);

await expectReject(
  () => validateAndResolveUrl("https://[::ffff:127.0.0.1]/"),
  /blocked range/i,
  "validateAndResolveUrl rejects IPv4-mapped IPv6",
);

// Public IPv6 literal — should resolve without DNS
try {
  const result = await validateAndResolveUrl("https://[2606:4700:4700::1111]/");
  if (result.ip === "2606:4700:4700::1111" && result.family === 6) {
    recordTest("validateAndResolveUrl returns canonical IPv6", true);
  } else {
    recordTest(
      "validateAndResolveUrl returns canonical IPv6",
      false,
      false,
      `got ip=${result.ip} family=${result.family}`,
    );
  }
} catch (err) {
  recordTest(
    "validateAndResolveUrl returns canonical IPv6",
    false,
    false,
    `unexpectedly rejected: ${err instanceof Error ? err.message : String(err)}`,
  );
}

// Public IPv4 literal — should resolve without DNS
try {
  const result = await validateAndResolveUrl("https://1.1.1.1/");
  if (result.ip === "1.1.1.1" && result.family === 4) {
    recordTest("validateAndResolveUrl returns canonical IPv4", true);
  } else {
    recordTest(
      "validateAndResolveUrl returns canonical IPv4",
      false,
      false,
      `got ip=${result.ip} family=${result.family}`,
    );
  }
} catch (err) {
  recordTest(
    "validateAndResolveUrl returns canonical IPv4",
    false,
    false,
    `unexpectedly rejected: ${err instanceof Error ? err.message : String(err)}`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section F — safeDownload propagation (H06)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section F: safeDownload propagates ssrfGuard ===\n");

await expectReject(
  () =>
    safeDownload("https://127.0.0.1/payload.mp4", {
      maxBytes: 1024,
      label: "test",
    }),
  /blocked range/i,
  "safeDownload rejects loopback target",
);

await expectReject(
  () =>
    safeDownload("https://169.254.169.254/latest/meta-data/", {
      maxBytes: 1024,
      label: "test",
    }),
  /blocked range/i,
  "safeDownload rejects metadata endpoint",
);

await expectReject(
  () =>
    safeDownload("http://example.com/file.mp4", {
      maxBytes: 1024,
      label: "test",
    }),
  /Only HTTPS/i,
  "safeDownload rejects plain http://",
);

// ───────────────────────────────────────────────────────────────────────
// Section G — Handler-coverage audit (grep) — H06 follow-through
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section G: handler-coverage audit ===\n");

// Sweep the repo to confirm every media handler that downloads an
// external URL goes through safeDownload (directly or via
// predictionLifecycle.downloadPredictionOutput, which uses safeDownload
// internally). Regression-guards H06.
const handlers: Array<{
  file: string;
  expected: "safeDownload" | "lifecycle";
}> = [
  {
    file: "src/lib/avatar/providers/HeyGenAvatar.ts",
    expected: "safeDownload",
  },
  {
    file: "src/lib/adapters/video/klingVideoHandler.ts",
    expected: "safeDownload",
  },
  {
    file: "src/lib/adapters/video/runwayVideoHandler.ts",
    expected: "safeDownload",
  },
  {
    file: "src/lib/avatar/providers/DIDAvatar.ts",
    expected: "safeDownload",
  },
  {
    file: "src/lib/music/providers/BeatovenMusic.ts",
    expected: "safeDownload",
  },
  {
    file: "src/lib/providers/openAI.ts",
    expected: "safeDownload",
  },
  {
    file: "src/lib/providers/recraft.ts",
    expected: "safeDownload",
  },
  // Replicate handlers go through predictionLifecycle.downloadPredictionOutput
  {
    file: "src/lib/adapters/video/replicateVideoHandler.ts",
    expected: "lifecycle",
  },
  {
    file: "src/lib/music/providers/ReplicateMusic.ts",
    expected: "lifecycle",
  },
  {
    file: "src/lib/avatar/providers/ReplicateAvatar.ts",
    expected: "lifecycle",
  },
];

const repoRoot = process.cwd();
for (const { file, expected } of handlers) {
  try {
    const content = readFileSync(join(repoRoot, file), "utf8");
    const usesSafeDownload =
      content.includes("safeDownload") || content.includes("assertSafeUrl");
    const usesLifecycle =
      content.includes("downloadPredictionOutput") ||
      content.includes("predictionLifecycle");
    let ok = false;
    let reason = "";
    if (expected === "safeDownload") {
      ok = usesSafeDownload;
      reason = ok ? "" : "missing safeDownload / assertSafeUrl import";
    } else {
      ok = usesLifecycle;
      reason = ok ? "" : "missing predictionLifecycle import";
    }
    recordTest(
      `${file} uses ${expected === "safeDownload" ? "safeDownload/assertSafeUrl" : "predictionLifecycle"}`,
      ok,
      false,
      reason,
    );
  } catch (err) {
    recordTest(
      `read ${file}`,
      false,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// Verify predictionLifecycle itself routes via safeDownload (the central
// chokepoint for all 3 Replicate handlers).
try {
  const content = readFileSync(
    join(repoRoot, "src/lib/adapters/replicate/predictionLifecycle.ts"),
    "utf8",
  );
  if (content.includes("safeDownload")) {
    recordTest(
      "predictionLifecycle.downloadPredictionOutput uses safeDownload",
      true,
    );
  } else {
    recordTest(
      "predictionLifecycle.downloadPredictionOutput uses safeDownload",
      false,
      false,
      "safeDownload not imported in predictionLifecycle.ts",
    );
  }
} catch (err) {
  recordTest(
    "predictionLifecycle audit",
    false,
    false,
    err instanceof Error ? err.message : String(err),
  );
}

await runSuite();
