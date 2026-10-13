import { createServer, type Server } from "node:http";

type OwnedRuntime =
  | "metadata"
  | "litellm"
  | "ollama"
  | "lm-studio"
  | "llamacpp";

export type DescriptorRuntimeFixtures = {
  env: Readonly<Record<string, string>>;
  requests: Array<{
    runtime: OwnedRuntime;
    method: string;
    path: string;
    caseName: string;
  }>;
  setCaseLabel: (name: string) => void;
  pinRuntimeEndpoints: () => void;
  close: () => Promise<void>;
};

/**
 * Descriptor/status tests exercise real built HTTP paths. Their baseline local
 * runtimes are unavailable, while dynamic metadata loads successfully from an
 * owned first source. No real daemon, external registry or credential is used.
 */
export async function startDescriptorRuntimeFixtures(): Promise<DescriptorRuntimeFixtures> {
  const servers: Server[] = [];
  const requests: DescriptorRuntimeFixtures["requests"] = [];
  const previous = new Map<string, string | undefined>();
  let caseName = "suite bootstrap";

  /** Close only these ready listeners and wait for their active requests to settle. */
  async function closeServers(): Promise<void> {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
            server.closeIdleConnections();
          }),
      ),
    );
  }

  /** Bind a real ephemeral listener and journal requests received by that runtime. */
  async function start(runtime: OwnedRuntime): Promise<string> {
    const server = createServer((req, res) => {
      const path = new URL(req.url ?? "/", "http://owned.invalid").pathname;
      requests.push({ runtime, method: req.method ?? "", path, caseName });
      if (runtime === "metadata") {
        if (req.method === "HEAD" && path === "/health") {
          res.writeHead(200);
          res.end();
          return;
        }
        if (req.method === "GET" && path === "/api/v1/models") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              version: "descriptor-owned-v1",
              lastUpdated: "2026-10-14T00:00:00.000Z",
              models: {},
              aliases: {},
              defaults: {},
            }),
          );
          return;
        }
        res.writeHead(404);
        res.end();
        return;
      }
      // A real, deterministic failure preserves "unavailable local runtime"
      // controls without relying on an unowned dead port or host daemon.
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "descriptor-suite-runtime-unavailable" }),
      );
    });
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      server.once("error", onError);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", onError);
        resolve();
      });
    });
    servers.push(server);
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("descriptor fixture did not report its owned port");
    }
    return `http://127.0.0.1:${address.port}`;
  }

  try {
    const metadata = await start("metadata");
    const litellm = await start("litellm");
    const ollama = await start("ollama");
    const lmStudio = await start("lm-studio");
    const llamaCpp = await start("llamacpp");
    const env: DescriptorRuntimeFixtures["env"] = {
      MODEL_CONFIG_URL: `${metadata}/api/v1/models`,
      LITELLM_BASE_URL: litellm,
      OLLAMA_BASE_URL: ollama,
      OLLAMA_API_BASE: ollama,
      LM_STUDIO_BASE_URL: `${lmStudio}/v1`,
      LLAMACPP_BASE_URL: `${llamaCpp}/v1`,
    };
    for (const key of Object.keys(env)) {
      previous.set(key, process.env[key]);
    }
    /** Restore owned routes after a case deliberately clears its environment. */
    const pinRuntimeEndpoints = () => {
      for (const [key, value] of Object.entries(env)) {
        process.env[key] = value;
      }
    };
    pinRuntimeEndpoints();
    return {
      env,
      requests,
      setCaseLabel: (name) => {
        caseName = name;
      },
      pinRuntimeEndpoints,
      /** Release owned listeners and restore every pinned environment entry. */
      close: async () => {
        try {
          await closeServers();
        } finally {
          for (const [key, value] of previous) {
            if (value === undefined) {
              delete process.env[key];
            } else {
              process.env[key] = value;
            }
          }
          console.log("DESCRIPTOR_OWNED_REQUESTS", JSON.stringify(requests));
        }
      },
    };
  } catch (error) {
    await closeServers();
    throw error;
  }
}
