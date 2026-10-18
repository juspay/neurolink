import type {
  ConfirmationRequestEvent,
  ConfirmationResponseEvent,
  NeuroLink,
} from "@juspay/neurolink";

export const neurolinkConfig = {
  hitl: {
    enabled: true,
    // Tools whose name contains one of these (case-insensitive) wait for approval
    dangerousActions: ["writeFile", "executeCode", "sendEmail"],
    timeout: 30000,
    auditLogging: true,
  },
  memory: {
    type: "redis",
    redisUrl: process.env.REDIS_URL,
  },
};

// Approval is event-based: NeuroLink emits a request and waits for a response
export function attachApprovalHandler(neurolink: NeuroLink): void {
  const emitter = neurolink.getEventEmitter();
  emitter.on("hitl:confirmation-request", async (event) => {
    const receivedAt = Date.now();
    const { payload } = event as ConfirmationRequestEvent;
    const approved = await requestHumanApproval(payload.toolName);
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: {
        confirmationId: payload.confirmationId,
        approved,
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - receivedAt,
        },
      },
    } satisfies ConfirmationResponseEvent);
  });
}

async function requestHumanApproval(toolName: string): Promise<boolean> {
  // In production, this would integrate with your approval system
  // (Slack, email, dashboard, etc.)
  console.log("HITL: Requesting approval for tool:", toolName);

  // Simulate approval workflow
  // In real implementation, this would wait for human response
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("HITL: Action approved by human reviewer");
      resolve(true);
    }, 1000);
  });
}
