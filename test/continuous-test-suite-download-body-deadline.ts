#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import dnsPromises from "node:dns/promises";
import { syncBuiltinESMExports } from "node:module";
import { randomUUID } from "node:crypto";
import { NeuroLink } from "../dist/index.js";
import {
  IDEOGRAM_FIXTURE_HOST,
  withImageDownloadTransport,
} from "./helpers/imageDownloadTransport.js";
import { defineSuite } from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";

/**
 * Drive public image generation through the real built downloader and an owned
 * HTTPS fixture. The vendor POST is recorded; the download uses real undici
 * HTTP/TLS after the existing fixture validates its pinned DNS addresses.
 * A small ordinary body arrives immediately, then completes after the actual
 * configured 60-second transfer deadline. No production timer is shortened.
 */
const { test, runSuite } = defineSuite("Download body deadline", {
  offline: true,
  perTestTimeoutMs: 80_000,
});

// This suite owns a direct pinned HTTPS fixture, independent of shell proxy settings.
for (const name of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "no_proxy",
]) {
  delete process.env[name];
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhAAAAABJRU5ErkJggg==",
  "base64",
);

async function withOwnedDownload(run: () => Promise<void>): Promise<void> {
  const originalLookup = dnsPromises.lookup;
  dnsPromises.lookup = (async (
    _host: string,
    options?: { all?: boolean; family?: number },
  ) => {
    const answer = { address: "93.184.215.14", family: 4 };
    if (options?.all) {
      return options.family === 6 ? [] : [answer];
    }
    return answer;
  }) as typeof dnsPromises.lookup;
  syncBuiltinESMExports();
  try {
    await withImageDownloadTransport(async (probe) => {
      await run();
      assert(probe.pinnedLookups > 0, "real download did not use pinned DNS");
    });
  } finally {
    dnsPromises.lookup = originalLookup;
    syncBuiltinESMExports();
  }
}

await runSuite(async () => {
  process.env.IDEOGRAM_API_KEY = "owned-download-deadline-fixture";
  await test("public image generate completes an ordinary HTTPS body", async () => {
    const nonce = randomUUID();
    const mocks = installMockFetch([
      {
        method: "POST",
        url: "api.ideogram.ai/v1/ideogram-v3/generate",
        respond: {
          json: {
            data: [{ url: `https://${IDEOGRAM_FIXTURE_HOST}/${nonce}.png` }],
          },
        },
      },
      {
        method: "GET",
        url: `${IDEOGRAM_FIXTURE_HOST}/${nonce}.png`,
        respond: { bytes: png, contentType: "image/png" },
      },
    ]);
    try {
      await withOwnedDownload(async () => {
        const sdk = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await sdk.generate({
          provider: "ideogram",
          model: "V_3",
          input: { text: nonce },
          disableTools: true,
          disableInternalFallback: true,
        });
        assert.equal(result.imageOutput?.base64, png.toString("base64"));
        const post = mocks.calls.find((call) => call.method === "POST");
        assert(post, "vendor POST missing");
        assert.equal(
          post.headers["api-key"],
          "owned-download-deadline-fixture",
        );
        assert(
          post.bodyText.includes(nonce),
          "fresh prompt did not reach the provider",
        );
        assert.equal(
          mocks.calls.filter((call) => call.method === "GET").length,
          1,
        );
      });
    } finally {
      mocks.unset();
    }
  });

  await test("public image generate enforces its 60s deadline after body bytes arrive", async () => {
    const nonce = randomUUID();
    let bodyStarted = 0;
    let cancelled = false;
    let completed = false;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    const mocks = installMockFetch([
      {
        method: "POST",
        url: "api.ideogram.ai/v1/ideogram-v3/generate",
        respond: {
          json: {
            data: [{ url: `https://${IDEOGRAM_FIXTURE_HOST}/${nonce}.png` }],
          },
        },
      },
      {
        method: "GET",
        url: `${IDEOGRAM_FIXTURE_HOST}/${nonce}.png`,
        respond: {
          contentType: "image/png",
          stream: () =>
            new ReadableStream<Uint8Array>({
              start(controller) {
                bodyStarted = Date.now();
                controller.enqueue(png);
                completionTimer = setTimeout(() => {
                  completed = true;
                  controller.close();
                }, 70_000);
              },
              cancel() {
                cancelled = true;
                clearTimeout(completionTimer);
              },
            }),
        },
      },
    ]);
    try {
      await withOwnedDownload(async () => {
        const sdk = new NeuroLink({ conversationMemory: { enabled: false } });
        let message = "";
        try {
          await sdk.generate({
            provider: "ideogram",
            model: "V_3",
            input: { text: nonce },
            disableTools: true,
            disableInternalFallback: true,
          });
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }
        assert(bodyStarted > 0, "fixture body was never requested");
        assert.match(
          message,
          /abort|timeout|timed out/i,
          "transfer did not reject at its deadline",
        );
        assert.equal(
          completed,
          false,
          "download completed beyond the configured deadline",
        );
        const elapsed = Date.now() - bodyStarted;
        assert(
          elapsed >= 55_000 && elapsed < 68_000,
          `body deadline elapsed ${elapsed}ms`,
        );
        for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert(
          cancelled,
          "aborted real HTTPS transfer did not cancel the owned response body",
        );
        assert.equal(
          mocks.calls.filter((call) => call.method === "GET").length,
          1,
        );
        console.log(
          JSON.stringify({
            bodyDeadlineMs: 60_000,
            elapsedMs: elapsed,
            cancelled,
            completed,
          }),
        );
      });
    } finally {
      clearTimeout(completionTimer);
      mocks.unset();
    }
  });
});
