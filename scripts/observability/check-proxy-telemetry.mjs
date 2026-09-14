#!/usr/bin/env node
import { runProxyTelemetryDoctor } from "./proxy-telemetry-check.mjs";
runProxyTelemetryDoctor().catch((error) => {
  // JSON consumers must also get structured evidence when a service is
  // unavailable. Do not echo parser excerpts from backend/configuration bodies.
  const reason =
    error instanceof SyntaxError
      ? "Telemetry response or configuration is not valid"
      : error instanceof Error
        ? error.message
        : "Telemetry verification failed";
  if (process.argv.includes("json")) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          checkedAt: new Date().toISOString(),
          status: "incomplete",
          completeQuery: false,
          checks: [
            {
              name: "verification",
              status: "unverified",
              evidence: { reason },
            },
          ],
        },
        null,
        2,
      ),
    );
  } else {
    console.error(reason);
  }
  process.exitCode = 1;
});
