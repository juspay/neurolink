/**
 * MINIMAL Test Setup for NeuroLink
 * Just loads environment variables - no fake timers or complex cleanup
 */

import { config } from "dotenv";

// Load environment variables from .env file
config();

// Ensure the code is executed only in a test environment
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
if (process.env.NODE_ENV !== "test") {
  throw new Error(
    "This setup script should only be run in a test environment (NODE_ENV=test).",
  );
}

// Set safe test defaults only if environment variables are not set
// This allows tests to run without real credentials while preventing accidental production use
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = "test-key-openai";
}
if (!process.env.GOOGLE_VERTEX_PROJECT) {
  process.env.GOOGLE_VERTEX_PROJECT = "test-project";
}
if (!process.env.GOOGLE_VERTEX_LOCATION) {
  process.env.GOOGLE_VERTEX_LOCATION = "us-central1";
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  process.env.AWS_ACCESS_KEY_ID = "AKIA-TEST-ACCESS-KEY";
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key-12345";
}
if (!process.env.AWS_SESSION_TOKEN) {
  process.env.AWS_SESSION_TOKEN = "test-session-token";
}
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = "us-east-1";
}

// NO fake timers - they interfere with execAsync
// NO complex cleanup hooks - they can hang
// NO async imports - they can hang in teardown

if (!process.env.CI) {
  console.log("✅ Minimal test environment configured");
  console.log("🔑 Environment variables loaded:", {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "***" : "missing",
    GOOGLE_VERTEX_PROJECT: process.env.GOOGLE_VERTEX_PROJECT || "not set",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "***" : "missing",
  });
}
