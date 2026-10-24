/**
 * Serves, from a loopback listener the suite owns, the model registry that
 * NeuroLink's dynamic model provider reads first.
 *
 * `AIProviderFactory` initialises that provider whenever it builds a provider.
 * Its sources are tried in order: `MODEL_CONFIG_URL` (else
 * `http://localhost:3001/api/v1/models`), then the public
 * `raw.githubusercontent.com/juspay/neurolink/release/config/models.json`, then
 * `./config/models.json` in the working directory. With the first one answered
 * a suite never reaches GitHub, so it neither needs the network nor depends on
 * what `release` carries that day. The registry is valid and empty: models
 * resolve from the static tables, as they do when every source fails.
 *
 * Every response closes its connection. A server's `unref()` leaves the
 * connections it has accepted referenced: a lone `GET` answered with keep-alive
 * held a plain Node 24 process open for 3.0 s, and a reply that closes the
 * connection ends that at once (44 to 137 ms).
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

export type EmptyModelRegistry = {
  /** The value for `MODEL_CONFIG_URL`. */
  url: string;
  /** `METHOD path` of every request the listener has answered. */
  requests: string[];
  close: () => Promise<void>;
};

const EMPTY_MODEL_REGISTRY = JSON.stringify({
  version: "owned-empty-registry-v1",
  lastUpdated: "2026-10-09T00:00:00.000Z",
  models: {},
  defaults: {},
  aliases: {},
});

export async function serveEmptyModelRegistry(): Promise<EmptyModelRegistry> {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    res.setHeader("Connection", "close");
    if (req.method === "HEAD" && req.url === "/health") {
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method === "GET" && req.url === "/api/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(EMPTY_MODEL_REGISTRY);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  server.unref();
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/api/v1/models`,
    requests,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
