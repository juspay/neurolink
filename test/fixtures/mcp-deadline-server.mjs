// Real stdio JSON-RPC server used by the shipped MCP manager deadline harness.
const initializeDelay = Number(process.env.FIXTURE_INITIALIZE_DELAY_MS ?? 0);
const callDelay = Number(process.env.FIXTURE_CALL_DELAY_MS ?? 2000);
const timers = new Set();
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const reply = (message, result, delay = 0) => {
  const timer = setTimeout(() => {
    timers.delete(timer);
    send({ jsonrpc: "2.0", id: message.id, result });
  }, delay);
  timers.add(timer);
};
let pending = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (data) => {
  pending += data;
  while (pending.includes("\n")) {
    const index = pending.indexOf("\n");
    const line = pending.slice(0, index);
    pending = pending.slice(index + 1);
    if (!line.trim()) {
      continue;
    }
    const message = JSON.parse(line);
    if (message.id === undefined) {
      continue;
    }
    if (message.method === "initialize") {
      reply(
        message,
        {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "deadline-fixture", version: "1.0.0" },
        },
        initializeDelay,
      );
    } else if (message.method === "tools/list") {
      reply(message, {
        tools: [
          {
            name: "slow",
            description: "Delays a harmless response",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      });
    } else if (message.method === "tools/call") {
      reply(
        message,
        { content: [{ type: "text", text: "delayed fixture" }] },
        callDelay,
      );
    } else {
      reply(message, {});
    }
  }
});
process.stdin.on("end", () => {
  for (const timer of timers) {
    clearTimeout(timer);
  }
});
