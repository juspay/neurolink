import { createVertex } from "@ai-sdk/google-vertex";
// Cache for anthropic module to avoid repeated imports
let _createVertexAnthropic = null;
let _anthropicImportAttempted = false;
// Function to dynamically import anthropic support
async function getCreateVertexAnthropic() {
  if (_anthropicImportAttempted) {
    return _createVertexAnthropic;
  }
  _anthropicImportAttempted = true;
  try {
    // Try to import the anthropic module - available in @ai-sdk/google-vertex ^2.2.0+
    const anthropicModule = await import("@ai-sdk/google-vertex/anthropic");
    _createVertexAnthropic = anthropicModule.createVertexAnthropic;
    console.log("[GoogleVertexAI] Anthropic module successfully loaded");
    return _createVertexAnthropic;
  } catch (error) {
    // Anthropic module not available
    console.warn(
      "[GoogleVertexAI] Anthropic module not available. Install @ai-sdk/google-vertex ^2.2.0 for Anthropic model support.",
    );
    return null;
  }
}
import { streamText, generateText, Output } from "ai";
// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
};
// Configuration helpers
const getGCPVertexBreezeProjectId = () => {
  const projectId = process.env.GOOGLE_VERTEX_PROJECT;
  if (!projectId) {
    throw new Error("GOOGLE_VERTEX_PROJECT environment variable is not set");
  }
  return projectId;
};
const getGCPVertexBreezeLocation = () => {
  return process.env.GOOGLE_VERTEX_LOCATION || "us-east5";
};
const getGoogleApplicationCredentials = () => {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS;
};
const getGoogleServiceAccountKey = () => {
  return process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
};
const getGoogleClientEmail = () => {
  return process.env.GOOGLE_AUTH_CLIENT_EMAIL;
};
const getGooglePrivateKey = () => {
  return process.env.GOOGLE_AUTH_PRIVATE_KEY;
};
const getVertexModelId = () => {
  return process.env.VERTEX_MODEL_ID || "claude-sonnet-4@20250514";
};
const hasPrincipalAccountAuth = () => {
  return !!getGoogleApplicationCredentials();
};
const hasServiceAccountKeyAuth = () => {
  return !!getGoogleServiceAccountKey();
};
const hasServiceAccountEnvAuth = () => {
  return !!(getGoogleClientEmail() && getGooglePrivateKey());
};
const hasValidAuth = () => {
  return (
    hasPrincipalAccountAuth() ||
    hasServiceAccountKeyAuth() ||
    hasServiceAccountEnvAuth()
  );
};
// Setup environment for Google authentication
const setupGoogleAuth = async () => {
  const functionTag = "setupGoogleAuth";
  // Method 2: Service Account Key (JSON string) - Create temporary file
  if (hasServiceAccountKeyAuth() && !hasPrincipalAccountAuth()) {
    const serviceAccountKey = getGoogleServiceAccountKey();
    console.log(`[${functionTag}] Service account key auth (JSON string)`, {
      hasServiceAccountKey: !!serviceAccountKey,
      authMethod: "service_account_key",
    });
    try {
      // Parse to validate JSON
      JSON.parse(serviceAccountKey);
      // Write to temporary file and set environment variable using dynamic imports
      const { writeFileSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const tempFile = join(tmpdir(), `gcp-credentials-${Date.now()}.json`);
      writeFileSync(tempFile, serviceAccountKey);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFile;
      console.log(`[${functionTag}] Created temporary credentials file`, {
        tempFile: "[CREATED]",
        authMethod: "service_account_key_temp_file",
      });
    } catch (error) {
      console.error(`[${functionTag}] Failed to parse service account key`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        "Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.",
      );
    }
  }
  // Method 3: Service Account Environment Variables - Set as individual env vars
  if (
    hasServiceAccountEnvAuth() &&
    !hasPrincipalAccountAuth() &&
    !hasServiceAccountKeyAuth()
  ) {
    const clientEmail = getGoogleClientEmail();
    const privateKey = getGooglePrivateKey();
    console.log(
      `[${functionTag}] Service account env auth (separate variables)`,
      {
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
        authMethod: "service_account_env",
      },
    );
    // Create service account object and write to temporary file
    const serviceAccount = {
      type: "service_account",
      project_id: getGCPVertexBreezeProjectId(),
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    };
    try {
      // Use dynamic imports for ESM compatibility
      const { writeFileSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const tempFile = join(tmpdir(), `gcp-credentials-env-${Date.now()}.json`);
      writeFileSync(tempFile, JSON.stringify(serviceAccount, null, 2));
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFile;
      console.log(
        `[${functionTag}] Created temporary credentials file from env vars`,
        {
          tempFile: "[CREATED]",
          authMethod: "service_account_env_temp_file",
        },
      );
    } catch (error) {
      console.error(
        `[${functionTag}] Failed to create service account file from env vars`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new Error(
        "Failed to create temporary service account file from environment variables.",
      );
    }
  }
};
// Vertex AI setup with multiple authentication support
const createVertexSettings = async () => {
  const functionTag = "createVertexSettings";
  // Setup authentication first
  await setupGoogleAuth();
  const baseSettings = {
    project: getGCPVertexBreezeProjectId(),
    location: getGCPVertexBreezeLocation(),
  };
  // Method 1: Principal Account Authentication (file path) - Recommended for production
  if (hasPrincipalAccountAuth()) {
    const credentialsPath = getGoogleApplicationCredentials();
    console.log(`[${functionTag}] Principal account auth (file path)`, {
      credentialsPath: credentialsPath ? "[PROVIDED]" : "[NOT_PROVIDED]",
      authMethod: "principal_account_file",
    });
    return baseSettings;
  }
  // Method 2 & 3: Other methods now set GOOGLE_APPLICATION_CREDENTIALS in setupGoogleAuth()
  if (hasServiceAccountKeyAuth() || hasServiceAccountEnvAuth()) {
    console.log(`[${functionTag}] Alternative auth method configured`, {
      authMethod: hasServiceAccountKeyAuth()
        ? "service_account_key"
        : "service_account_env",
      credentialsSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    return baseSettings;
  }
  // No valid authentication found
  console.error(`[${functionTag}] No valid authentication method found`, {
    authMethod: "none",
    hasPrincipalAccount: hasPrincipalAccountAuth(),
    hasServiceAccountKey: hasServiceAccountKeyAuth(),
    hasServiceAccountEnv: hasServiceAccountEnvAuth(),
    availableMethods: [
      "GOOGLE_APPLICATION_CREDENTIALS (file path)",
      "GOOGLE_SERVICE_ACCOUNT_KEY (JSON string)",
      "GOOGLE_AUTH_CLIENT_EMAIL + GOOGLE_AUTH_PRIVATE_KEY (env vars)",
    ],
  });
  throw new Error(
    "No valid Google Vertex AI authentication found. Please provide one of:\n" +
      "1. GOOGLE_APPLICATION_CREDENTIALS (path to service account file)\n" +
      "2. GOOGLE_SERVICE_ACCOUNT_KEY (JSON string of service account)\n" +
      "3. GOOGLE_AUTH_CLIENT_EMAIL + GOOGLE_AUTH_PRIVATE_KEY (environment variables)",
  );
};
// Helper function to determine if a model is an Anthropic model
const isAnthropicModel = (modelName) => {
  // Anthropic models in Vertex AI contain "claude" anywhere in the model name
  return modelName.toLowerCase().includes("claude");
};
// Lazy initialization cache
let _vertex = null;
async function getVertexInstance() {
  if (!_vertex) {
    const settings = await createVertexSettings();
    _vertex = createVertex(settings);
  }
  return _vertex;
}
// Google Vertex AI class with enhanced error handling and Anthropic model support
export class GoogleVertexAI {
  modelName;
  /**
   * Initializes a new instance of GoogleVertexAI
   * @param modelName - Optional model name to override the default from config
   */
  constructor(modelName) {
    const functionTag = "GoogleVertexAI.constructor";
    this.modelName = modelName || getVertexModelId();
    try {
      console.log(`[${functionTag}] Initialization started`, {
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
      });
      const hasPrincipal = hasPrincipalAccountAuth();
      console.log(`[${functionTag}] Authentication validation`, {
        hasPrincipalAccountAuth: hasPrincipal,
        projectId: getGCPVertexBreezeProjectId() || "MISSING",
        location: getGCPVertexBreezeLocation() || "MISSING",
      });
      if (hasPrincipal) {
        console.log(`[${functionTag}] Auth method selected`, {
          authMethod: "principal_account",
          hasGoogleApplicationCredentials: !!getGoogleApplicationCredentials(),
        });
      } else {
        console.warn(`[${functionTag}] Auth method missing`, {
          authMethod: "none",
          hasPrincipalAccountAuth: hasPrincipal,
        });
      }
      console.log(`[${functionTag}] Initialization completed`, {
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        authMethod: hasPrincipalAccountAuth() ? "principal_account" : "none",
        success: true,
      });
    } catch (err) {
      console.error(`[${functionTag}] Initialization failed`, {
        message: "Error in initializing Google Vertex AI",
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }
  /**
   * Gets the appropriate model instance (Google or Anthropic)
   * @private
   */
  async getModel() {
    if (isAnthropicModel(this.modelName)) {
      console.log("GoogleVertexAI.getModel - Anthropic model selected", {
        modelName: this.modelName,
      });
      const createVertexAnthropic = await getCreateVertexAnthropic();
      if (!createVertexAnthropic) {
        throw new Error(
          `Anthropic model "${this.modelName}" requested but @ai-sdk/google-vertex/anthropic is not available. ` +
            "Please install @ai-sdk/google-vertex ^2.2.0 or use a Google model instead.",
        );
      }
      const settings = await createVertexSettings();
      const vertexAnthropic = createVertexAnthropic(settings);
      return vertexAnthropic(this.modelName);
    }
    const vertex = await getVertexInstance();
    return vertex(this.modelName);
  }
  /**
   * Processes text using streaming approach with enhanced error handling callbacks
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to StreamTextResult or null if operation fails
   */
  async streamText(optionsOrPrompt, analysisSchema) {
    const functionTag = "GoogleVertexAI.streamText";
    const provider = "vertex";
    let chunkCount = 0;
    try {
      // Parse parameters - support both string and options object
      const options =
        typeof optionsOrPrompt === "string"
          ? { prompt: optionsOrPrompt }
          : optionsOrPrompt;
      const {
        prompt,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
      } = options;
      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;
      console.log(`[${functionTag}] Stream request started`, {
        provider,
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        promptLength: prompt.length,
        temperature,
        maxTokens,
        hasSchema: !!finalSchema,
      });
      const model = await this.getModel();
      const streamOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
        onError: (event) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(`[${functionTag}] Stream text error`, {
            provider,
            modelName: this.modelName,
            error: errorMessage,
            stack: errorStack,
            promptLength: prompt.length,
            chunkCount,
          });
        },
        onFinish: (event) => {
          console.log(`[${functionTag}] Stream text finished`, {
            provider,
            modelName: this.modelName,
            finishReason: event.finishReason,
            usage: event.usage,
            totalChunks: chunkCount,
            promptLength: prompt.length,
            responseLength: event.text?.length || 0,
          });
        },
        onChunk: (event) => {
          chunkCount++;
          console.debug(`[${functionTag}] Stream text chunk`, {
            provider,
            modelName: this.modelName,
            chunkNumber: chunkCount,
            chunkLength: event.chunk.text?.length || 0,
            chunkType: event.chunk.type,
          });
        },
      };
      if (analysisSchema) {
        streamOptions.experimental_output = Output.object({
          schema: analysisSchema,
        });
      }
      const result = streamText(streamOptions);
      return result;
    } catch (err) {
      console.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: "Error in streaming text",
        err: String(err),
        promptLength: prompt.length,
      });
      return null;
    }
  }
  /**
   * Processes text using non-streaming approach with optional schema validation
   * @param prompt - The input text prompt to analyze
   * @param analysisSchema - Optional Zod schema or Schema object for output validation
   * @returns Promise resolving to GenerateTextResult or null if operation fails
   */
  async generateText(optionsOrPrompt, analysisSchema) {
    const functionTag = "GoogleVertexAI.generateText";
    const provider = "vertex";
    try {
      // Parse parameters - support both string and options object
      const options =
        typeof optionsOrPrompt === "string"
          ? { prompt: optionsOrPrompt }
          : optionsOrPrompt;
      const {
        prompt,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = DEFAULT_SYSTEM_CONTEXT.systemPrompt,
        schema,
      } = options;
      // Use schema from options or fallback parameter
      const finalSchema = schema || analysisSchema;
      console.log(`[${functionTag}] Generate request started`, {
        provider,
        modelName: this.modelName,
        isAnthropic: isAnthropicModel(this.modelName),
        promptLength: prompt.length,
        temperature,
        maxTokens,
      });
      const model = await this.getModel();
      const generateOptions = {
        model: model,
        prompt: prompt,
        system: systemPrompt,
        temperature,
        maxTokens,
      };
      if (finalSchema) {
        generateOptions.experimental_output = Output.object({
          schema: finalSchema,
        });
      }
      const result = await generateText(generateOptions);
      console.log(`[${functionTag}] Generate text completed`, {
        provider,
        modelName: this.modelName,
        usage: result.usage,
        finishReason: result.finishReason,
        responseLength: result.text?.length || 0,
      });
      return result;
    } catch (err) {
      console.error(`[${functionTag}] Exception`, {
        provider,
        modelName: this.modelName,
        message: "Error in generating text",
        err: String(err),
      });
      return null;
    }
  }
}
