import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import tls from "node:tls";
import { promisify } from "node:util";
import { assertEqual, defineSuite } from "./helpers/harness.js";

const cases = [
  "delayed-valid",
  "delayed-address-failure",
  "delayed-lookup-error",
  "fn-failure",
  "immediate-valid",
  "immediate-address-failure",
] as const;
type LookupCase = (typeof cases)[number];
const childCase = process.argv.find((arg) => arg.startsWith("--lookup-case="));
// The CLI owns the IPC listener its child loader expects; a naked --import
// loader would instead attempt a parent-program socket that does not exist.
const tsxCLI = createRequire(import.meta.url).resolve("tsx/cli");

/** Exercise the real fixture TLS connector in an isolated process. */
async function runChild(kind: LookupCase): Promise<void> {
  const { IDEOGRAM_FIXTURE_HOST, withImageDownloadTransport } =
    await import("./helpers/imageDownloadTransport.js");
  const events: string[] = [];
  const fnFailure = new Error("owned test callback failed");
  let observedProbe: { pinnedLookups: number } | undefined;
  let socket: tls.TLSSocket | undefined;
  const lookup: NonNullable<tls.ConnectionOptions["lookup"]> = (
    _hostname,
    _options,
    callback,
  ) => {
    const complete = () => {
      events.push("lookup callback");
      const address = kind.includes("address-failure")
        ? "127.0.0.1"
        : "93.184.215.14";
      callback(
        kind === "delayed-lookup-error"
          ? new Error("owned lookup failed")
          : null,
        [{ address, family: 4 }],
      );
    };
    if (kind.startsWith("immediate")) {
      complete();
    } else {
      setTimeout(complete, 100);
    }
  };

  let caught: unknown;
  let result: unknown;
  try {
    result = await withImageDownloadTransport(async (probe) => {
      observedProbe = probe;
      try {
        socket = tls.connect({ host: IDEOGRAM_FIXTURE_HOST, lookup });
        await once(socket, "secureConnect");
        events.push("test callback settled");
        if (kind === "fn-failure") {
          throw fnFailure;
        }
        return "owned TLS result";
      } finally {
        socket?.destroy();
      }
    });
  } catch (error) {
    caught = error;
  }
  events.push("helper settled");
  assert(
    events.indexOf("lookup callback") >= 0 &&
      events.indexOf("lookup callback") < events.indexOf("helper settled"),
    "helper settled before its asynchronous lookup callback",
  );
  if (kind === "fn-failure") {
    assert.equal(
      caught,
      fnFailure,
      "original callback failure identity changed",
    );
  } else if (kind.includes("address-failure")) {
    assert.match(String(caught), /download dialed an unvalidated address/);
  } else if (kind === "delayed-lookup-error") {
    assert.match(String(caught), /owned lookup failed/);
  } else {
    assert.equal(caught, undefined, "valid lookup rejected");
    assert.equal(result, "owned TLS result");
  }
  const lookups = observedProbe?.pinnedLookups;
  const rejectedLookup =
    kind.includes("address-failure") || kind === "delayed-lookup-error";
  assert.equal(lookups, rejectedLookup ? 0 : 1);
  console.log("LOOKUP_CONTAINMENT", JSON.stringify({ kind, events, lookups }));
}

if (childCase !== undefined) {
  const kind = childCase.slice("--lookup-case=".length);
  assert(cases.includes(kind as LookupCase), "unknown lookup control");
  await runChild(kind as LookupCase);
} else {
  const { test, runSuite } = defineSuite("Image download lookup containment", {
    offline: true,
  });
  await runSuite(async () => {
    for (const kind of cases) {
      await test(kind, async () => {
        const { stdout } = await promisify(execFile)(
          process.execPath,
          [tsxCLI, fileURLToPath(import.meta.url), `--lookup-case=${kind}`],
          { timeout: 4_000, env: process.env },
        );
        const line = stdout
          .split("\n")
          .find((value) => value.startsWith("LOOKUP_CONTAINMENT "));
        assert(line, "child did not report successful containment");
        const record = JSON.parse(line.slice("LOOKUP_CONTAINMENT ".length));
        assertEqual(record.kind, kind, "child case identity");
      });
    }
  });
}
