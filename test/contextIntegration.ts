import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import dotenv from "dotenv";
import { execWithTimeout } from "./shared/execWithTimeout.js";

// Load environment variables
dotenv.config();

// Test constants for context integration
const TEST_TIMEOUT = 15000;
const CONTEXT_TEST_PROMPT = "What is my role and who am I?";

// Get test provider (runtime access)
const getTestProvider = () => process.env.TEST_PROVIDER || "google-ai";

describe("Context Integration Features", () => {
  beforeAll(() => {
    console.log(
      "🧪 Testing Context Integration with Factory Pattern Implementation",
    );
    console.log(`Using provider: ${getTestProvider()}`);
  });

  describe("Context Option Functionality", () => {
    it("should accept context option with JSON data", async () => {
      const contextData =
        '{"userRole":"admin","userId":"test123","sessionId":"session456"}';
      const command = `npm run cli -- generate "${CONTEXT_TEST_PROMPT}" --context '${contextData}' --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("✅ Text generated successfully!");
      expect(stdout).not.toContain("Invalid context");
      expect(stderr).not.toContain("error");
    });

    it("should display context data in analytics when enabled", async () => {
      const contextData = '{"userRole":"admin","userId":"test123"}';
      const command = `npm run cli -- generate "Test with analytics" --context '${contextData}' --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("📊 Analytics:");
      expect(stdout).toContain("Context:");
      expect(stdout).toContain("userRole=admin");
      expect(stdout).toContain("userId=test123");
      expect(stderr).not.toContain("error");
    });

    it("should work with combined context + analytics + evaluation", async () => {
      const contextData = '{"test":"comprehensive","feature":"combined"}';
      const command = `npm run cli -- generate "Combined feature test" --context '${contextData}' --enableAnalytics --enableEvaluation --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("✅ Text generated successfully!");
      expect(stdout).toContain("📊 Analytics:");
      expect(stdout).toContain("Context:");
      expect(stdout).toContain("test=comprehensive");
      expect(stdout).toContain("feature=combined");
      expect(stderr).not.toContain("error");
    });

    it("should handle invalid context gracefully", async () => {
      const invalidContext = '{"invalid":}'; // Invalid JSON
      const command = `npm run cli -- generate "Test invalid context" --context '${invalidContext}' --debug --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      // Should gracefully handle parsing error and continue with generation
      expect(stderr).toContain("Invalid JSON in --context parameter");
      expect(stdout).toContain("Test invalid context");
      expect(stdout).toMatch(/✅ Text generated|Test invalid context/);
    });
  });

  describe("Context Factory Pattern Integration", () => {
    it("should process context using ContextFactory", async () => {
      const contextData =
        '{"applicationContext":{"name":"NeuroLink","version":"7.1.0"},"userRole":"developer"}';
      const command = `npm run cli -- generate "Factory pattern test" --context '${contextData}' --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("userRole=developer");
      expect(stderr).not.toContain("error");
    });

    it("should work with streaming commands", async () => {
      const contextData = '{"streamTest":"true","mode":"streaming"}';
      const command = `npm run cli -- stream "Stream with context" --context '${contextData}' --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("🔄 Streaming...");
      expect(stderr).not.toContain("error");
    });
  });

  describe("Context Type Safety", () => {
    it("should validate context structure", async () => {
      const validContext =
        '{"userId":"test","userRole":"user","sessionId":"abc123"}';
      const command = `npm run cli -- generate "Type safety test" --context '${validContext}' --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("userId=test");
      expect(stdout).toContain("userRole=user");
      expect(stdout).toContain("sessionId=abc123");
      expect(stderr).not.toContain("error");
    });

    it("should handle nested context objects", async () => {
      const nestedContext =
        '{"userPreferences":{"theme":"dark","language":"en"},"organizationId":"org123"}';
      const command = `npm run cli -- generate "Nested context test" --context '${nestedContext}' --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("organizationId=org123");
      expect(stderr).not.toContain("error");
    });
  });

  // ✅ DOMAIN CONTEXT CONVERSION TESTS - Testing Phase 1 Factory Infrastructure
  describe("Domain Context Conversion Features", () => {
    it("should convert business context to domain context", async () => {
      const businessContext =
        '{"companyId":"acme-corp","department":"finance","projectId":"budget-analysis","userId":"analyst123"}';
      const command = `npm run cli -- generate "Convert business context to finance domain" --context '${businessContext}' --evaluationDomain finance --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("companyId=acme-corp");
      expect(stdout).toContain("department=finance");
      expect(stdout).toContain("projectId=budget-analysis");
      expect(stderr).not.toContain("error");
    });

    it("should handle healthcare domain context", async () => {
      const healthcareContext =
        '{"facilityId":"hospital-central","department":"cardiology","patientType":"inpatient","userId":"doctor456"}';
      const command = `npm run cli -- generate "Healthcare domain context analysis" --context '${healthcareContext}' --evaluationDomain healthcare --enableEvaluation --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("facilityId=hospital-central");
      expect(stdout).toContain("department=cardiology");
      expect(stdout).toContain("patientType=inpatient");
      expect(stderr).not.toContain("error");
    });

    it("should handle analytics domain context with metrics", async () => {
      const analyticsContext =
        '{"dashboardId":"quarterly-metrics","dataSource":"sales-db","timeRange":"Q3-2024","userId":"analyst789"}';
      const command = `npm run cli -- generate "Analytics domain context processing" --context '${analyticsContext}' --evaluationDomain analytics --enableAnalytics --enableEvaluation --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("dashboardId=quarterly-metrics");
      expect(stdout).toContain("dataSource=sales-db");
      expect(stdout).toContain("timeRange=Q3-2024");
      expect(stderr).not.toContain("error");
    });

    it("should handle ecommerce domain context", async () => {
      const ecommerceContext =
        '{"storeId":"shop-123","category":"electronics","campaignId":"holiday-sale","customerId":"buyer456"}';
      const command = `npm run cli -- generate "Ecommerce context optimization" --context '${ecommerceContext}' --evaluationDomain ecommerce --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("storeId=shop-123");
      expect(stdout).toContain("category=electronics");
      expect(stdout).toContain("campaignId=holiday-sale");
      expect(stderr).not.toContain("error");
    });

    it("should preserve legacy context during domain conversion", async () => {
      const legacyContext =
        '{"businessUnit":"marketing","legacySystemId":"crm-v1","migrationFlag":"pending","userId":"manager123"}';
      const command = `npm run cli -- generate "Legacy context preservation test" --context '${legacyContext}' --evaluationDomain analytics --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("businessUnit=marketing");
      expect(stdout).toContain("legacySystemId=crm-v1");
      expect(stdout).toContain("migrationFlag=pending");
      expect(stderr).not.toContain("error");
    });

    it("should handle complex domain context with nested objects", async () => {
      const complexContext =
        '{"project":{"id":"proj-456","name":"AI Implementation","phase":"testing"},"team":{"lead":"john.doe","members":5},"domain":"technology"}';
      const command = `npm run cli -- generate "Complex domain context processing" --context '${complexContext}' --evaluationDomain analytics --enableEvaluation --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("Context:");
      expect(stdout).toContain("domain=technology");
      expect(stderr).not.toContain("error");
    });

    it("should handle domain context with streaming", async () => {
      const streamingContext =
        '{"realTimeData":"enabled","streamingMetrics":"cpu,memory,latency","domain":"infrastructure"}';
      const command = `npm run cli -- stream "Real-time domain context streaming" --context '${streamingContext}' --evaluationDomain analytics --enableAnalytics --provider ${getTestProvider()}`;

      const { stdout, stderr } = await execWithTimeout(command, TEST_TIMEOUT);

      expect(stdout).toContain("🔄 Streaming...");
      expect(stderr).not.toContain("error");
    });
  });
});
