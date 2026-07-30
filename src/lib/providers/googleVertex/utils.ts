import {
  createVertexAnthropic,
  type GoogleVertexAnthropicProviderSettings,
} from "@ai-sdk/google-vertex/anthropic";
import type { GoogleVertexProviderSettings } from "@ai-sdk/google-vertex";
import fs from "fs";
import os from "os";
import path from "path";
import type { NeurolinkCredentials } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import {
  createVertexProjectConfig,
  validateApiKey,
} from "../../utils/providerConfig.js";
import {
  cachedCredentialsPath,
  setCachedCredentialsPath,
} from "./constants.js";

export function isPrivateOrLoopbackAddress(address: string): boolean {
  const lower = address.toLowerCase();
  // IPv4 loopback, unspecified, and private ranges
  if (address.startsWith("127.") || address === "0.0.0.0") {
    return true;
  }
  if (address.startsWith("10.") || address.startsWith("192.168.")) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) {
    return true;
  }
  // IPv6 loopback, link-local, unique-local
  if (
    address === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc00:") ||
    lower.startsWith("fd00:")
  ) {
    return true;
  }
  return false;
}

// Keep createVertexAnthropic import used by hasAnthropicSupport check above

export const hasAnthropicSupport = (): boolean => {
  try {
    // Verify the anthropic module is available
    return typeof createVertexAnthropic === "function";
  } catch {
    return false;
  }
};

export const getVertexProjectId = (): string => {
  return validateApiKey(createVertexProjectConfig());
};

export const getVertexLocation = (): string => {
  return (
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEX_LOCATION ||
    process.env.GOOGLE_VERTEX_LOCATION ||
    "global"
  );
};

import { resolveVertexLocation } from "./client.js";

export const getDefaultVertexModel = (): string => {
  return process.env.VERTEX_MODEL || "gemini-2.5-flash";
};

export const hasGoogleCredentials = (): boolean => {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
};

export const createVertexSettings = async (
  region?: string,
  credentials?: NeurolinkCredentials["vertex"],
  modelName?: string,
): Promise<GoogleVertexProviderSettings> => {
  const configuredLocation =
    credentials?.location || region || getVertexLocation();
  const location = resolveVertexLocation(modelName, configuredLocation);
  const project = credentials?.projectId || getVertexProjectId();

  const baseSettings: GoogleVertexProviderSettings = {
    project,
    location,
    fetch: createProxyFetch(),
  };

  // Special handling for global endpoint
  if (location === "global") {
    baseSettings.baseURL = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google`;
    logger.debug("[GoogleVertexProvider] Using global endpoint", {
      baseURL: baseSettings.baseURL,
      location,
      project,
    });
  }

  // ── Per-request credentials (highest priority) ──
  if (credentials) {
    if (credentials.apiKey) {
      return { ...baseSettings, apiKey: credentials.apiKey };
    }

    const resolvedClientEmail =
      credentials.clientEmail ||
      (credentials.serviceAccountKey
        ? (JSON.parse(credentials.serviceAccountKey) as Record<string, string>)
            .client_email
        : undefined);
    const resolvedPrivateKey =
      credentials.privateKey ||
      (credentials.serviceAccountKey
        ? (JSON.parse(credentials.serviceAccountKey) as Record<string, string>)
            .private_key
        : undefined);

    if (resolvedClientEmail && resolvedPrivateKey) {
      return {
        ...baseSettings,
        googleAuthOptions: {
          credentials: {
            client_email: resolvedClientEmail,
            private_key: resolvedPrivateKey.replace(/\\n/g, "\n"),
          },
        },
      };
    }
  }

  // 🎯 OPTION 2: Create credentials file from environment variables at runtime
  const requiredEnvVarsForFile = {
    type: process.env.GOOGLE_AUTH_TYPE,
    project_id: process.env.GOOGLE_AUTH_BREEZE_PROJECT_ID,
    private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
    client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_AUTH_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_AUTH_URI,
    token_uri: process.env.GOOGLE_AUTH_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_AUTH_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_AUTH_UNIVERSE_DOMAIN,
  };

  if (
    requiredEnvVarsForFile.client_email &&
    requiredEnvVarsForFile.private_key
  ) {
    // Return cached path if already written and still exists on disk
    if (cachedCredentialsPath && fs.existsSync(cachedCredentialsPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = cachedCredentialsPath;
      return baseSettings;
    }

    try {
      const serviceAccountCredentials = {
        type: requiredEnvVarsForFile.type || "service_account",
        project_id: requiredEnvVarsForFile.project_id || getVertexProjectId(),
        private_key: requiredEnvVarsForFile.private_key.replace(/\\n/g, "\n"),
        client_email: requiredEnvVarsForFile.client_email,
        client_id: requiredEnvVarsForFile.client_id || "",
        auth_uri:
          requiredEnvVarsForFile.auth_uri ||
          "https://accounts.google.com/o/oauth2/auth",
        token_uri:
          requiredEnvVarsForFile.token_uri ||
          "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          requiredEnvVarsForFile.auth_provider_x509_cert_url ||
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: requiredEnvVarsForFile.client_x509_cert_url || "",
        universe_domain:
          requiredEnvVarsForFile.universe_domain || "googleapis.com",
      };

      const tmpDir = os.tmpdir();
      const credentialsFileName = `google-credentials-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.json`;
      const credentialsFilePath = path.join(tmpDir, credentialsFileName);

      fs.writeFileSync(
        credentialsFilePath,
        JSON.stringify(serviceAccountCredentials, null, 2),
        { mode: 0o600 },
      );

      setCachedCredentialsPath(credentialsFilePath);

      process.once("exit", () => {
        try {
          if (cachedCredentialsPath && fs.existsSync(cachedCredentialsPath)) {
            fs.unlinkSync(cachedCredentialsPath);
          }
        } catch {
          /* ignore cleanup errors */
        }
      });

      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;

      return baseSettings;
    } catch {
      // Silent error handling for runtime credentials file creation
    }
  }

  // 🎯 OPTION 1: Check for principal account authentication
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK) {
    const credentialsPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_NEUROLINK;
    let fileExists: boolean;
    try {
      fileExists = fs.existsSync(credentialsPath);
    } catch {
      fileExists = false;
    }
    if (fileExists) {
      return baseSettings;
    }
  } else {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      let fileExists: boolean;
      try {
        fileExists = fs.existsSync(credentialsPath);
      } catch {
        fileExists = false;
      }
      if (fileExists) {
        return baseSettings;
      }
    }
  }

  const requiredEnvVars = {
    type: process.env.GOOGLE_AUTH_TYPE,
    project_id: process.env.GOOGLE_AUTH_BREEZE_PROJECT_ID,
    private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
    client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_AUTH_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_AUTH_URI,
    token_uri: process.env.GOOGLE_AUTH_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_AUTH_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_AUTH_UNIVERSE_DOMAIN,
  };

  if (requiredEnvVars.client_email && requiredEnvVars.private_key) {
    logger.debug("Using explicit service account credentials authentication", {
      authMethod: "explicit_service_account_credentials",
      hasType: !!requiredEnvVars.type,
      hasProjectId: !!requiredEnvVars.project_id,
      hasClientEmail: !!requiredEnvVars.client_email,
      hasPrivateKey: !!requiredEnvVars.private_key,
      hasClientId: !!requiredEnvVars.client_id,
      hasAuthUri: !!requiredEnvVars.auth_uri,
      hasTokenUri: !!requiredEnvVars.token_uri,
      hasAuthProviderCertUrl: !!requiredEnvVars.auth_provider_x509_cert_url,
      hasClientCertUrl: !!requiredEnvVars.client_x509_cert_url,
      hasUniverseDomain: !!requiredEnvVars.universe_domain,
      credentialsCompleteness: "using_individual_env_vars_as_fallback",
    });

    const serviceAccountCredentials = {
      type: requiredEnvVars.type || "service_account",
      project_id: requiredEnvVars.project_id || getVertexProjectId(),
      private_key: requiredEnvVars.private_key.replace(/\\n/g, "\n"),
      client_email: requiredEnvVars.client_email,
      client_id: requiredEnvVars.client_id || "",
      auth_uri:
        requiredEnvVars.auth_uri || "https://accounts.google.com/o/oauth2/auth",
      token_uri:
        requiredEnvVars.token_uri || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url:
        requiredEnvVars.auth_provider_x509_cert_url ||
        "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: requiredEnvVars.client_x509_cert_url || "",
      universe_domain: requiredEnvVars.universe_domain || "googleapis.com",
    };

    return {
      ...baseSettings,
      googleAuthOptions: {
        credentials: serviceAccountCredentials,
      },
    };
  }

  logger.warn("No valid authentication found for Google Vertex AI", {
    authMethod: "none",
    authenticationAttempts: {
      principalAccountFile: {
        envVarSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        filePath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "NOT_SET",
        fileExists: false,
      },
      explicitCredentials: {
        hasClientEmail: !!requiredEnvVars.client_email,
        hasPrivateKey: !!requiredEnvVars.private_key,
        hasProjectId: !!requiredEnvVars.project_id,
        hasType: !!requiredEnvVars.type,
        missingFields: Object.entries(requiredEnvVars)
          .filter(([_key, value]) => !value)
          .map(([key]) => key),
      },
    },
    troubleshooting: [
      "1. Ensure GOOGLE_APPLICATION_CREDENTIALS points to an existing file, OR",
      "2. Set individual environment variables: GOOGLE_AUTH_CLIENT_EMAIL and GOOGLE_AUTH_PRIVATE_KEY",
    ],
  });
  return baseSettings;
};

export const createVertexAnthropicSettings = async (
  region?: string,
  credentials?: NeurolinkCredentials["vertex"],
): Promise<GoogleVertexAnthropicProviderSettings> => {
  const anthropicRegion = !region || region === "global" ? "us-east5" : region;
  const anthropicCredentials = credentials?.location
    ? { ...credentials, location: anthropicRegion }
    : credentials;
  const baseVertexSettings = await createVertexSettings(
    anthropicRegion,
    anthropicCredentials,
  );

  return {
    project: baseVertexSettings.project,
    location: baseVertexSettings.location,
    fetch: baseVertexSettings.fetch,
    // The SDK's built-in retry honors Retry-After hints without any upper
    // bound (a 429 with retry-after: 8549 sleeps 2.4h per retry, invisible
    // to fallback orchestration). Retries are the orchestrator's job.
    maxRetries: 0,
    ...(baseVertexSettings.apiKey && { apiKey: baseVertexSettings.apiKey }),
    ...(baseVertexSettings.googleAuthOptions && {
      googleAuthOptions: baseVertexSettings.googleAuthOptions,
    }),
  } as GoogleVertexAnthropicProviderSettings;
};

export const isAnthropicModel = (modelName: string): boolean => {
  return modelName.toLowerCase().includes("claude");
};
