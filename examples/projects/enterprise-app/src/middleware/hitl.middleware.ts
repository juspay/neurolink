import { Request, Response, NextFunction } from "express";
import { NeuroLink } from "@juspay/neurolink";

// Tools that require human approval
const SENSITIVE_TOOLS = ["writeFile", "executeCode", "sendEmail", "deleteData"];

type PendingApproval = {
  id: string;
  action: string;
  params: any;
  timestamp: Date;
  status: "pending" | "approved" | "rejected";
  userId: string;
};

// In-memory store for demo; use Redis in production
const pendingApprovals = new Map<string, PendingApproval>();

export function hitlMiddleware(neurolink: NeuroLink) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Attach HITL handler to request
    (req as any).hitl = {
      requiresApproval: (toolName: string) =>
        SENSITIVE_TOOLS.includes(toolName),

      requestApproval: async (action: string, params: any, userId: string) => {
        const approval: PendingApproval = {
          id: `approval_${Date.now()}`,
          action,
          params,
          timestamp: new Date(),
          status: "pending",
          userId,
        };

        pendingApprovals.set(approval.id, approval);
        console.log(
          `HITL: Created approval request ${approval.id} for ${action}`,
        );

        return approval.id;
      },

      checkApproval: (approvalId: string) => {
        const approval = pendingApprovals.get(approvalId);
        return approval?.status || "not_found";
      },

      approve: (approvalId: string) => {
        const approval = pendingApprovals.get(approvalId);
        if (approval) {
          approval.status = "approved";
          console.log(`HITL: Approval ${approvalId} granted`);
          return true;
        }
        return false;
      },

      reject: (approvalId: string) => {
        const approval = pendingApprovals.get(approvalId);
        if (approval) {
          approval.status = "rejected";
          console.log(`HITL: Approval ${approvalId} rejected`);
          return true;
        }
        return false;
      },
    };

    next();
  };
}

// HITL approval endpoint handlers
export function getApprovalRoutes() {
  return {
    listPending: (req: Request, res: Response) => {
      const pending = Array.from(pendingApprovals.values()).filter(
        (a) => a.status === "pending",
      );
      res.json({ approvals: pending });
    },

    approve: (req: Request, res: Response) => {
      const { id } = req.params;
      const approval = pendingApprovals.get(id);

      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }

      approval.status = "approved";
      res.json({ success: true, approval });
    },

    reject: (req: Request, res: Response) => {
      const { id } = req.params;
      const approval = pendingApprovals.get(id);

      if (!approval) {
        return res.status(404).json({ error: "Approval not found" });
      }

      approval.status = "rejected";
      res.json({ success: true, approval });
    },
  };
}
