/**
 * Test setup file for NeuroLink
 * Loads environment variables and configures test environment
 */

import { config } from "dotenv";

// Load environment variables from .env file
config();

// Set default test environment variables if not provided
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key-openai";
process.env.GOOGLE_VERTEX_PROJECT =
  process.env.GOOGLE_VERTEX_PROJECT || "test-project";
process.env.GOOGLE_VERTEX_LOCATION =
  process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test-key-aws";
process.env.AWS_SECRET_ACCESS_KEY =
  process.env.AWS_SECRET_ACCESS_KEY || "test-secret-aws";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.BEDROCK_MODEL =
  process.env.BEDROCK_MODEL || "anthropic.claude-3-sonnet-20240229-v1:0";

// Configure test environment
process.env.NODE_ENV = "test";

console.log("✅ Test environment configured");
console.log("🔑 Environment variables loaded:", {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "***" : "missing",
  GOOGLE_VERTEX_PROJECT: process.env.GOOGLE_VERTEX_PROJECT || "not set",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "***" : "missing",
});
