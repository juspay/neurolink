import chalk from "chalk";
import { logger } from "../lib/utils/logger.js";
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
} from "../lib/types/index.js";
import { globalSession } from "../lib/session/globalSessionState.js";

export function handleError(_error: Error, context: string): void {
  logger.error(chalk.red(`❌ ${context} failed: ${_error.message}`));

  if (_error instanceof AuthenticationError) {
    logger.error(
      chalk.yellow(
        "💡 Set Google AI Studio API key (RECOMMENDED): export GOOGLE_AI_API_KEY=AIza-...",
      ),
    );
    logger.error(
      chalk.yellow("💡 Or set OpenAI API key: export OPENAI_API_KEY=sk-..."),
    );
    logger.error(
      chalk.yellow(
        "💡 Or set AWS Bedrock credentials: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1",
      ),
    );
    logger.error(
      chalk.yellow(
        "💡 Or set Google Vertex AI credentials: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json",
      ),
    );
    logger.error(
      chalk.yellow(
        "💡 Or set Anthropic API key: export ANTHROPIC_API_KEY=sk-ant-...",
      ),
    );
    logger.error(
      chalk.yellow(
        "💡 Or set Azure OpenAI credentials: export AZURE_OPENAI_API_KEY=... AZURE_OPENAI_ENDPOINT=...",
      ),
    );
  } else if (_error instanceof RateLimitError) {
    logger.error(
      chalk.yellow("💡 Try again in a few moments or use --provider vertex"),
    );
  } else if (_error instanceof AuthorizationError) {
    logger.error(
      chalk.yellow(
        "💡 Check your account permissions for the selected model/service.",
      ),
    );
    logger.error(
      chalk.yellow(
        "💡 For AWS Bedrock, ensure you have permissions for the specific model and consider using inference profile ARNs.",
      ),
    );
  } else if (_error instanceof NetworkError) {
    logger.error(
      chalk.yellow(
        "💡 Check your internet connection and the provider's status page.",
      ),
    );
  }

  if (!globalSession.getCurrentSessionId()) {
    process.exit(1);
  }
}
