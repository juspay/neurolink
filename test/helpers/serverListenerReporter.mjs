import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { Server } from "node:net";

const journal = process.env.NEUROLINK_SERVER_TEST_READY_LOG;
const nonce = process.env.NEUROLINK_SERVER_TEST_READY_NONCE;

// A test-only observation channel. The unchanged network guard remains the
// only owner of its own journal and permissions; this module never writes them.
if (journal && nonce) {
  const originalListen = Server.prototype.listen;
  Server.prototype.listen = function (...args) {
    const result = originalListen.apply(this, args);
    // Register after the original listen wrapper so any guard ownership
    // observer records the same genuine event before this readiness message.
    this.once("listening", () => {
      const address = this.address();
      if (
        !this.listening ||
        !address ||
        typeof address === "string" ||
        !Number.isInteger(address.port) ||
        address.port <= 0
      ) {
        return;
      }
      const serverId = randomUUID();
      const report = (kind) => {
        appendFileSync(
          journal,
          JSON.stringify({
            kind,
            pid: process.pid,
            nonce,
            serverId,
            address: address.address,
            port: address.port,
          }) + "\n",
        );
      };
      report("server-test-listening");
      this.once("close", () => report("server-test-closed"));
    });
    return result;
  };
}
