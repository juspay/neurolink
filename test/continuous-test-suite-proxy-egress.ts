#!/usr/bin/env tsx
/**
 * Determinism exception (Rule 15): the target name has no direct route, so a
 * local proxy fixture can prove routing and fail-closed behavior without a
 * live provider account. The built CLI cannot target this synthetic endpoint.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import type { Duplex } from "node:stream";
import { Agent } from "undici";
import { fetchProxyAware } from "../src/lib/proxy/proxyFetch.js";

const names = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
  "NO_PROXY",
  "no_proxy",
] as const;
const original = Object.fromEntries(
  names.map((name) => [name, process.env[name]]),
);
const originalFetch = globalThis.fetch;
const sockets = new Set<Duplex>();
let proxyRequests = 0;
let directRequests = 0;

const proxy = createServer();
proxy.on("connect", (_request, socket) => {
  proxyRequests++;
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
  socket.once("data", () => {
    socket.end(
      "HTTP/1.1 200 OK\r\nContent-Length: 7\r\nConnection: close\r\n\r\nproxied",
    );
  });
});
const direct = createServer((_request, response) => {
  directRequests++;
  response.end("direct");
});

try {
  for (const name of names) {
    delete process.env[name];
  }
  proxy.listen(0, "127.0.0.1");
  direct.listen(0, "127.0.0.1");
  await Promise.all([once(proxy, "listening"), once(direct, "listening")]);
  const proxyPort = (proxy.address() as { port: number }).port;
  const directPort = (direct.address() as { port: number }).port;
  const proxyUrl = `http://127.0.0.1:${proxyPort}`;
  const unreachable = "http://proxy-only.invalid/resource";
  const directAgent = new Agent();

  process.env.HTTP_PROXY = proxyUrl;
  assert.equal(await (await fetchProxyAware(unreachable)).text(), "proxied");
  // Anthropic passes a tuned direct agent; the proxy must take precedence.
  assert.equal(
    await (await fetchProxyAware(unreachable, {}, directAgent)).text(),
    "proxied",
  );
  assert.equal(proxyRequests, 2);

  delete process.env.HTTP_PROXY;
  process.env.ALL_PROXY = proxyUrl;
  assert.equal(await (await fetchProxyAware(unreachable)).text(), "proxied");
  assert.equal(proxyRequests, 3);

  delete process.env.ALL_PROXY;
  process.env.HTTPS_PROXY = proxyUrl;
  // The local proxy serves plain HTTP after CONNECT, so TLS must fail, but
  // reaching CONNECT proves HTTPS_PROXY was selected for the HTTPS target.
  await assert.rejects(
    fetchProxyAware("https://proxy-only.invalid/resource", {
      signal: AbortSignal.timeout(2_000),
    }),
  );
  assert.equal(proxyRequests, 4);

  process.env.NO_PROXY = "127.0.0.1";
  assert.equal(
    await (await fetchProxyAware(`http://127.0.0.1:${directPort}/`)).text(),
    "direct",
  );
  assert.equal(directRequests, 1);
  assert.equal(proxyRequests, 4);

  delete process.env.NO_PROXY;
  delete process.env.HTTPS_PROXY;
  process.env.ALL_PROXY = proxyUrl;
  globalThis.fetch = (() => {
    directRequests++;
    throw new Error("direct fallback attempted");
  }) as typeof fetch;
  proxy.close();
  for (const socket of sockets) {
    socket.destroy();
  }
  await assert.rejects(
    fetchProxyAware(unreachable, { signal: AbortSignal.timeout(2_000) }),
  );
  assert.equal(
    directRequests,
    1,
    "proxy failure must not fall back to direct fetch",
  );
  await directAgent.close();
  console.log(
    "Proxy egress: HTTP_PROXY, HTTPS_PROXY, ALL_PROXY, NO_PROXY, and failure isolation passed",
  );
} finally {
  globalThis.fetch = originalFetch;
  for (const name of names) {
    const value = original[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  for (const socket of sockets) {
    socket.destroy();
  }
  proxy.close();
  direct.close();
}
