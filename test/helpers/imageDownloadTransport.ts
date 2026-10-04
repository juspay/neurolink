/**
 * Local HTTPS transport for provider-returned image URLs. DNS still runs
 * through the built SDK's guard, and the real undici connector must supply
 * the pinned lookup before its socket is redirected to this fixture server.
 * Fixture responses come from the suite's existing global fetch route table.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import tls from "node:tls";

export const IDEOGRAM_FIXTURE_HOST = "cdn.ideogram-fixture.invalid";
export const RECRAFT_FIXTURE_HOST = "cdn.recraft-fixture.invalid";
const FIXTURE_HOSTS: readonly string[] = [
  IDEOGRAM_FIXTURE_HOST,
  RECRAFT_FIXTURE_HOST,
];

export async function withImageDownloadTransport<T>(
  fn: (probe: { pinnedLookups: number }) => Promise<T>,
): Promise<T> {
  let dir: string | undefined;
  let server: ReturnType<typeof createServer> | undefined;
  const probe = { pinnedLookups: 0 };
  const originalConnect = tls.connect;
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
        port: address.port,
        lookup: undefined,
        ca: certificatePem,
        servername: host,
      });
    }) as typeof tls.connect;
    return await fn(probe);
  } finally {
    tls.connect = originalConnect;
    try {
      const fixtureServer = server;
      if (fixtureServer !== undefined) {
        fixtureServer.closeAllConnections();
        await new Promise<void>((resolve) =>
          fixtureServer.close(() => resolve()),
        );
      }
    } finally {
      if (dir !== undefined) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }
}
