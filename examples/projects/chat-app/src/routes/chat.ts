/**
 * NeuroLink Chat Application - Chat Routes
 *
 * Handles chat API endpoints for both standard and streaming responses.
 */

import { Router, type Request, type Response } from "express";
import { AIService } from "../services/ai.service.js";

export const chatRouter = Router();

// Initialize AI service
const aiService = new AIService();

type ChatRequest = {
  message: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
};

/**
 * POST /api/chat
 * Standard chat completion endpoint
 */
chatRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { message, provider, model, systemPrompt } = req.body as ChatRequest;

    if (!message || typeof message !== "string") {
      res
        .status(400)
        .json({ error: "Message is required and must be a string" });
      return;
    }

    const result = await aiService.chat(message, {
      provider,
      model,
      systemPrompt,
    });

    res.json({
      response: result.text,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Chat error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ error: "Failed to generate response", details: errorMessage });
  }
});

/**
 * POST /api/chat/stream
 * Streaming chat endpoint using Server-Sent Events
 */
chatRouter.post("/stream", async (req: Request, res: Response) => {
  try {
    const { message, provider, model, systemPrompt } = req.body as ChatRequest;

    if (!message || typeof message !== "string") {
      res
        .status(400)
        .json({ error: "Message is required and must be a string" });
      return;
    }

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Stream the response
    const stream = await aiService.streamChat(message, {
      provider,
      model,
      systemPrompt,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        // Send text chunk
        res.write(
          `data: ${JSON.stringify({ type: "text", content: chunk.text })}\n\n`,
        );
      }

      if (chunk.done) {
        // Send completion event with metadata
        res.write(
          `data: ${JSON.stringify({
            type: "done",
            provider: chunk.provider,
            model: chunk.model,
            usage: chunk.usage,
          })}\n\n`,
        );
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // If headers haven't been sent, send error as JSON
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Failed to stream response", details: errorMessage });
    } else {
      // Otherwise, send error through SSE
      res.write(
        `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`,
      );
      res.end();
    }
  }
});

/**
 * GET /api/chat/providers
 * List available providers
 */
chatRouter.get("/providers", (_req: Request, res: Response) => {
  const providers = aiService.getAvailableProviders();
  res.json({ providers });
});
