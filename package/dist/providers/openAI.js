import { openai } from "@ai-sdk/openai";
import { streamText, generateText, Output } from "ai";
// Default system context
const DEFAULT_SYSTEM_CONTEXT = {
  systemPrompt: "You are a helpful AI assistant.",
};
// Configuration helpers
const getOpenAIApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return apiKey;
};
const getOpenAIModel = () => {
  return process.env.OPENAI_MODEL || "gpt-4o";
};
// OpenAI class with enhanced error handling
export class OpenAI {
  modelName;
  model;
  constructor(modelName) {
    const functionTag = "OpenAI.constructor";
    this.modelName = modelName || getOpenAIModel();
    try {
      console.log(`[${functionTag}] Function called`, {
        modelName: this.modelName,
      });
      // Set OpenAI API key as environment variable
      process.env.OPENAI_API_KEY = getOpenAIApiKey();
      this.model = openai(this.modelName);
      console.log(`[${functionTag}] Function result`, {
        modelName: this.modelName,
        success: true,
      });
    } catch (err) {
      console.error(`[${functionTag}] Exception`, {
        message: "Error in initializing OpenAI",
        modelName: this.modelName,
        err: String(err),
      });
      throw err;
    }
  }
  async streamText(optionsOrPrompt, analysisSchema) {
    const functionTag = "OpenAI.streamText";
    const provider = "openai";
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
      console.log(`[${functionTag}] Stream text started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
      });
      const streamOptions = {
        model: this.model,
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
      if (finalSchema) {
        streamOptions.experimental_output = Output.object({
          schema: finalSchema,
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
      });
      return null;
    }
  }
  async generateText(optionsOrPrompt, analysisSchema) {
    const functionTag = "OpenAI.generateText";
    const provider = "openai";
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
      console.log(`[${functionTag}] Generate text started`, {
        provider,
        modelName: this.modelName,
        promptLength: prompt.length,
        temperature,
        maxTokens,
      });
      const generateOptions = {
        model: this.model,
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
