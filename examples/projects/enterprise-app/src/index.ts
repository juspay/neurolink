import "dotenv/config";
import express from "express";
import { NeuroLink } from "@juspay/neurolink";
import {
  attachApprovalHandler,
  neurolinkConfig,
} from "./config/neurolink.config.js";
import { hitlMiddleware } from "./middleware/hitl.middleware.js";
import { auditMiddleware } from "./middleware/audit.middleware.js";
import { RedisService } from "./services/redis.service.js";
import { createApiRoutes } from "./routes/api.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function main() {
  // Initialize Redis service
  const redisService = new RedisService(process.env.REDIS_URL!);
  await redisService.connect();

  // Initialize NeuroLink with enterprise configuration
  const neurolink = new NeuroLink({
    provider: "openai",
    model: "gpt-4o",
    ...neurolinkConfig,
  });
  attachApprovalHandler(neurolink);

  // Apply enterprise middleware
  app.use(auditMiddleware);
  app.use(hitlMiddleware(neurolink));

  // Register API routes
  app.use("/api", createApiRoutes(neurolink, redisService));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.listen(port, () => {
    console.log(`Enterprise app running on port ${port}`);
    console.log("Features enabled: HITL, Redis Memory, Audit Logging");
  });
}

main().catch(console.error);
