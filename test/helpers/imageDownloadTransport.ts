/**
 * Local HTTPS transport for provider-returned image URLs. DNS still runs
 * through the built SDK's guard, and the real undici connector must supply
 * the pinned lookup before its socket is redirected to this fixture server.
 * Fixture responses come from the suite's existing global fetch route table.
 *
 * The same fixture server also backs a local CONNECT proxy, for the downloads
 * that go through HTTPS_PROXY instead of a pinned direct connection.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:https";
import { connect as netConnect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import tls from "node:tls";

export const IDEOGRAM_FIXTURE_HOST = "cdn.ideogram-fixture.invalid";
export const RECRAFT_FIXTURE_HOST = "cdn.recraft-fixture.invalid";
const FIXTURE_HOSTS: readonly string[] = [
  IDEOGRAM_FIXTURE_HOST,
  RECRAFT_FIXTURE_HOST,
];

type Fixture = {
  port: number;
  certificatePem: Buffer;
  close: () => Promise<void>;
};

/** Start the HTTPS fixture server; trust only its ephemeral certificate. */
async function startFixture(): Promise<Fixture> {
  let dir: string | undefined;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    dir = mkdtempSync(join(tmpdir(), "neurolink-image-tls-"));
    const key = join(dir, "fixture.key");
    const cert = join(dir, "fixture.crt");
    const config = join(dir, "fixture.cnf");
    writeFileSync(
      config,
      [
        "[req]",
        "distinguished_name = dn",
        "x509_extensions = v3",
        "prompt = no",
        "[dn]",
        "CN = image-fixture.invalid",
        "[v3]",
        `subjectAltName = ${FIXTURE_HOSTS.map((host) => `DNS:${host}`).join(",")}`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    // Trust only this ephemeral certificate, with both fixture names in its SAN.
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-config",
        config,
        "-keyout",
        key,
        "-out",
        cert,
      ],
      { stdio: "ignore" },
    );
    const certificatePem = readFileSync(cert);
    server = createServer(
      { key: readFileSync(key), cert: certificatePem },
      (req, res) => {
        void (async () => {
          const fixtureHost = FIXTURE_HOSTS.find(
            (host) => host === req.headers.host,
          );
          // An origin-form path keeps an untrusted request target out of the authority.
          if (fixtureHost === undefined || !req.url?.startsWith("/")) {
            res.writeHead(421);
            res.end();
            return;
          }
          const fixture = await globalThis.fetch(
            `https://${fixtureHost}${req.url}`,
            {
              redirect: "manual",
            },
          );
          res.writeHead(
            fixture.status,
            Object.fromEntries(fixture.headers.entries()),
          );
          if (!fixture.body) {
            res.end();
            return;
          }
          const reader = fixture.body.getReader();
          res.once("close", () => {
            void reader.cancel().catch(() => undefined);
          });
          while (!res.destroyed) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(value)) {
              await new Promise<void>((resolve) => {
                const ready = () => {
                  res.off("drain", ready);
                  res.off("close", ready);
                  resolve();
                };
                res.once("drain", ready);
                res.once("close", ready);
              });
            }
          }
        })().catch(() => res.destroy());
      },
    );
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string", "fixture listener missing");
    const startedServer = server;
    const startedDir = dir;
    return {
      port: address.port,
      certificatePem,
      close: async () => {
        try {
          startedServer.closeAllConnections();
          await new Promise<void>((resolve) =>
            startedServer.close(() => resolve()),
          );
        } finally {
          rmSync(startedDir, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    try {
      server?.closeAllConnections();
      server?.close();
    } finally {
      if (dir !== undefined) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    throw error;
  }
}

export async function withImageDownloadTransport<T>(
  fn: (probe: { pinnedLookups: number }) => Promise<T>,
): Promise<T> {
  const fixture = await startFixture();
  const probe = { pinnedLookups: 0 };
  const originalConnect = tls.connect;
  try {
    tls.connect = ((options: tls.ConnectionOptions) => {
      const host = options.host;
      assert(typeof host === "string", "download hostname missing");
      assert(FIXTURE_HOSTS.includes(host), "unexpected download host");
      const lookup = options.lookup;
      assert(lookup, "download did not supply a pinned DNS lookup");
      lookup(host, { all: true }, (error, addresses) => {
        assert.ifError(error);
        assert.deepEqual(
          addresses,
          [{ address: "93.184.215.14", family: 4 }],
          "download dialed an unvalidated address",
        );
        probe.pinnedLookups++;
      });
      return originalConnect({
        ...options,
        host: "127.0.0.1",
        port: fixture.port,
        lookup: undefined,
        ca: fixture.certificatePem,
        servername: host,
      });
    }) as typeof tls.connect;
    return await fn(probe);
  } finally {
    tls.connect = originalConnect;
    await fixture.close();
  }
}

/** A local forward proxy that records every CONNECT it is asked for. */
export type RecordingProxy = {
  /** `http://127.0.0.1:<port>`, for HTTPS_PROXY. */
  url: string;
  /** Each CONNECT target (`host:port`), in order. */
  connects: string[];
};

async function startProxy(
  tunnelPort: number | undefined,
): Promise<{ proxy: RecordingProxy; close: () => Promise<void> }> {
  const connects: string[] = [];
  const server = createHttpServer((_req, res) => {
    res.writeHead(405);
    res.end();
  });
  server.on("connect", (req, clientSocket, head) => {
    const target = req.url ?? "";
    connects.push(target);
    const host = target.split(":")[0] ?? "";
    if (tunnelPort === undefined || !FIXTURE_HOSTS.includes(host)) {
      clientSocket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }
    const upstream = netConnect(tunnelPort, "127.0.0.1", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) {
        upstream.write(head);
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    const drop = () => {
      upstream.destroy();
      clientSocket.destroy();
    };
    upstream.on("error", drop);
    clientSocket.on("error", drop);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string", "proxy listener missing");
  return {
    proxy: { url: `http://127.0.0.1:${address.port}`, connects },
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/** A proxy that refuses every CONNECT, so a download that reaches it fails. */
export async function withRefusingProxy<T>(
  fn: (proxy: RecordingProxy) => Promise<T>,
): Promise<T> {
  const started = await startProxy(undefined);
  try {
    return await fn(started.proxy);
  } finally {
    await started.close();
  }
}

/**
 * A proxy that tunnels the fixture hosts to the local TLS fixture, with the
 * fixture certificate trusted for sockets that arrive through it. No lookup is
 * pinned on this path: the proxy, not the SDK, resolves the name.
 */
export async function withImageDownloadProxy<T>(
  fn: (proxy: RecordingProxy) => Promise<T>,
): Promise<T> {
  const fixture = await startFixture();
  const started = await startProxy(fixture.port);
  const originalConnect = tls.connect;
  try {
    tls.connect = ((options: tls.ConnectionOptions, ...rest: never[]) => {
      const peer =
        typeof options.servername === "string" ? options.servername : "";
      // Only the fixture names are given the fixture certificate to trust;
      // any other TLS connection in the process is left exactly as asked.
      const patched = FIXTURE_HOSTS.includes(peer)
        ? { ...options, ca: fixture.certificatePem }
        : options;
      return (originalConnect as (...args: unknown[]) => tls.TLSSocket)(
        patched,
        ...rest,
      );
    }) as typeof tls.connect;
    return await fn(started.proxy);
  } finally {
    tls.connect = originalConnect;
    try {
      await started.close();
    } finally {
      await fixture.close();
    }
  }
}
