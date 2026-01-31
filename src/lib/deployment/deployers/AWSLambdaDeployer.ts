/**
 * AWS Lambda Deployer
 *
 * Deploy NeuroLink applications to AWS Lambda with API Gateway.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { logger } from "../../utils/logger.js";
import { BaseDeployer } from "./BaseDeployer.js";
import { PlatformDeploymentError } from "../DeploymentErrors.js";
import type {
  DeploymentPlatform,
  DeployConfig,
  BuildOutput,
  DeployResult,
  ValidationError,
  LambdaDeployerConfig,
} from "../types/deploymentTypes.js";

/**
 * AWS Lambda Deployer
 *
 * Deploys to AWS Lambda with optional API Gateway integration.
 * Supports both ZIP and Docker deployment methods.
 *
 * @example
 * ```typescript
 * const deployer = new AWSLambdaDeployer();
 *
 * const config: DeployConfig = {
 *   platform: 'lambda',
 *   entry: './src/index.ts',
 *   outDir: './dist',
 *   platformConfig: {
 *     platform: 'lambda',
 *     functionName: 'my-neurolink-api',
 *     runtime: 'nodejs20.x',
 *     memorySize: 1024
 *   }
 * };
 *
 * const result = await deployer.deploy(config);
 * ```
 */
export class AWSLambdaDeployer extends BaseDeployer {
  readonly name: DeploymentPlatform = "lambda";

  private lambdaConfig: LambdaDeployerConfig;

  constructor(config?: LambdaDeployerConfig) {
    super();
    this.lambdaConfig = config || { platform: "lambda", functionName: "neurolink-api" };
  }

  /**
   * Validate Lambda-specific configuration
   */
  protected validatePlatformConfig(config: DeployConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for AWS CLI
    try {
      execSync("aws --version", { stdio: "pipe" });
    } catch {
      errors.push({
        code: "AWS_CLI_MISSING",
        message: "AWS CLI is not installed",
        suggestion: "Install AWS CLI: https://aws.amazon.com/cli/",
      });
    }

    const platformConfig = config.platformConfig as LambdaDeployerConfig | undefined;

    // Function name is required
    if (!platformConfig?.functionName && !this.lambdaConfig.functionName) {
      errors.push({
        code: "MISSING_FUNCTION_NAME",
        message: "Lambda function name is required",
        field: "platformConfig.functionName",
      });
    }

    // Check Docker if using Docker deployment
    if (platformConfig?.useDocker || this.lambdaConfig.useDocker) {
      try {
        execSync("docker --version", { stdio: "pipe" });
      } catch {
        errors.push({
          code: "DOCKER_MISSING",
          message: "Docker is required for Docker-based Lambda deployment",
          suggestion: "Install Docker: https://docs.docker.com/get-docker/",
        });
      }

      if (!platformConfig?.ecrRepository && !this.lambdaConfig.ecrRepository) {
        errors.push({
          code: "MISSING_ECR_REPO",
          message: "ECR repository is required for Docker-based Lambda deployment",
          field: "platformConfig.ecrRepository",
        });
      }
    }

    return errors;
  }

  /**
   * Prepare Lambda-specific build output
   */
  protected async preparePlatformBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    logger.info("Preparing AWS Lambda build...");

    const platformConfig = (config.platformConfig as LambdaDeployerConfig) || {};

    if (platformConfig.useDocker || this.lambdaConfig.useDocker) {
      await this.prepareDockerBuild(config, buildOutput);
    } else {
      await this.prepareZipBuild(config, buildOutput);
    }

    logger.info("AWS Lambda build prepared");
  }

  /**
   * Prepare ZIP-based deployment
   */
  private async prepareZipBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    // Generate Lambda handler wrapper
    const handlerContent = this.generateHandler(buildOutput);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "handler.mjs"),
      handlerContent,
    );

    // Update package.json for Lambda
    const packageJson = {
      ...buildOutput.packageJson,
      main: "handler.mjs",
      type: "module",
      engines: {
        node: ">=18.0.0",
      },
    };

    fs.writeFileSync(
      path.join(buildOutput.outputDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );
  }

  /**
   * Prepare Docker-based deployment
   */
  private async prepareDockerBuild(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<void> {
    const platformConfig = (config.platformConfig as LambdaDeployerConfig) || {};

    // Generate Dockerfile
    const dockerfile = this.generateDockerfile(platformConfig);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "Dockerfile"),
      dockerfile,
    );

    // Generate Lambda handler
    const handlerContent = this.generateHandler(buildOutput);
    fs.writeFileSync(
      path.join(buildOutput.outputDir, "handler.mjs"),
      handlerContent,
    );
  }

  /**
   * Deploy to AWS Lambda
   */
  protected async doDeploy(
    config: DeployConfig,
    buildOutput: BuildOutput,
  ): Promise<DeployResult> {
    logger.info("Deploying to AWS Lambda...");

    const platformConfig = (config.platformConfig as LambdaDeployerConfig) || {};
    const functionName = platformConfig.functionName || this.lambdaConfig.functionName;
    const region = platformConfig.region || this.lambdaConfig.region || "us-east-1";

    try {
      let functionArn: string;
      let functionUrl: string | undefined;

      if (platformConfig.useDocker || this.lambdaConfig.useDocker) {
        const result = await this.deployWithDocker(config, buildOutput, functionName, region);
        functionArn = result.functionArn;
        functionUrl = result.functionUrl;
      } else {
        const result = await this.deployWithZip(config, buildOutput, functionName, region);
        functionArn = result.functionArn;
        functionUrl = result.functionUrl;
      }

      // Set environment variables
      await this.updateEnvironmentVariables(config, functionName, region);

      // Create/update API Gateway if enabled
      if (platformConfig.apiGateway?.enabled !== false) {
        const apiUrl = await this.setupApiGateway(functionName, functionArn, region, platformConfig);
        functionUrl = apiUrl || functionUrl;
      }

      logger.info(`Lambda deployment complete: ${functionUrl || functionArn}`);

      return {
        success: true,
        url: functionUrl,
        deploymentId: functionArn,
        status: "success",
        timestamp: new Date(),
        metadata: {
          platform: "lambda",
          functionName,
          region,
          runtime: platformConfig.runtime || this.lambdaConfig.runtime || "nodejs20.x",
        },
      };
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr || "";
      const message = stderr || (error as Error).message;

      throw new PlatformDeploymentError("lambda", `Lambda deployment failed: ${message}`, {
        details: { stderr },
        cause: error as Error,
      });
    }
  }

  /**
   * Deploy using ZIP package
   */
  private async deployWithZip(
    config: DeployConfig,
    buildOutput: BuildOutput,
    functionName: string,
    region: string,
  ): Promise<{ functionArn: string; functionUrl?: string }> {
    const platformConfig = (config.platformConfig as LambdaDeployerConfig) || {};

    // Create ZIP file
    const zipPath = path.join(buildOutput.outputDir, "lambda.zip");
    execSync(`cd "${buildOutput.outputDir}" && zip -r lambda.zip . -x "*.zip"`, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Check if function exists
    let functionExists = false;
    try {
      execSync(`aws lambda get-function --function-name ${functionName} --region ${region}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      functionExists = true;
    } catch {
      functionExists = false;
    }

    let functionArn: string;

    if (functionExists) {
      // Update existing function
      const output = execSync(
        `aws lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath} --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const result = JSON.parse(output);
      functionArn = result.FunctionArn;

      // Update configuration
      await this.updateFunctionConfiguration(functionName, region, platformConfig);
    } else {
      // Create new function
      const role = platformConfig.role || this.lambdaConfig.role;
      if (!role) {
        throw new Error("Lambda execution role ARN is required to create a new function");
      }

      const createArgs = [
        `--function-name ${functionName}`,
        `--runtime ${platformConfig.runtime || this.lambdaConfig.runtime || "nodejs20.x"}`,
        `--handler handler.handler`,
        `--role ${role}`,
        `--zip-file fileb://${zipPath}`,
        `--memory-size ${platformConfig.memorySize || this.lambdaConfig.memorySize || 1024}`,
        `--timeout ${platformConfig.timeout || this.lambdaConfig.timeout || 30}`,
        `--region ${region}`,
      ];

      const output = execSync(
        `aws lambda create-function ${createArgs.join(" ")}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const result = JSON.parse(output);
      functionArn = result.FunctionArn;
    }

    // Get function URL if configured
    let functionUrl: string | undefined;
    try {
      const urlOutput = execSync(
        `aws lambda get-function-url-config --function-name ${functionName} --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const urlResult = JSON.parse(urlOutput);
      functionUrl = urlResult.FunctionUrl;
    } catch {
      // Function URL not configured
    }

    return { functionArn, functionUrl };
  }

  /**
   * Deploy using Docker
   */
  private async deployWithDocker(
    config: DeployConfig,
    buildOutput: BuildOutput,
    functionName: string,
    region: string,
  ): Promise<{ functionArn: string; functionUrl?: string }> {
    const platformConfig = (config.platformConfig as LambdaDeployerConfig) || {};
    const ecrRepo = platformConfig.ecrRepository || this.lambdaConfig.ecrRepository!;

    // Build Docker image
    const imageTag = `${ecrRepo}:latest`;
    execSync(`docker build -t ${imageTag} ${buildOutput.outputDir}`, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Login to ECR
    const ecrLoginOutput = execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${ecrRepo.split("/")[0]}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );

    // Push image
    execSync(`docker push ${imageTag}`, { stdio: ["pipe", "pipe", "pipe"] });

    // Check if function exists
    let functionExists = false;
    try {
      execSync(`aws lambda get-function --function-name ${functionName} --region ${region}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      functionExists = true;
    } catch {
      functionExists = false;
    }

    let functionArn: string;

    if (functionExists) {
      // Update function code
      const output = execSync(
        `aws lambda update-function-code --function-name ${functionName} --image-uri ${imageTag} --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const result = JSON.parse(output);
      functionArn = result.FunctionArn;
    } else {
      // Create function
      const role = platformConfig.role || this.lambdaConfig.role;
      if (!role) {
        throw new Error("Lambda execution role ARN is required");
      }

      const output = execSync(
        `aws lambda create-function --function-name ${functionName} --package-type Image --code ImageUri=${imageTag} --role ${role} --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const result = JSON.parse(output);
      functionArn = result.FunctionArn;
    }

    return { functionArn };
  }

  /**
   * Update function configuration
   */
  private async updateFunctionConfiguration(
    functionName: string,
    region: string,
    config: LambdaDeployerConfig,
  ): Promise<void> {
    const updateArgs = [
      `--function-name ${functionName}`,
      `--region ${region}`,
    ];

    if (config.memorySize || this.lambdaConfig.memorySize) {
      updateArgs.push(`--memory-size ${config.memorySize || this.lambdaConfig.memorySize}`);
    }

    if (config.timeout || this.lambdaConfig.timeout) {
      updateArgs.push(`--timeout ${config.timeout || this.lambdaConfig.timeout}`);
    }

    if (config.runtime || this.lambdaConfig.runtime) {
      updateArgs.push(`--runtime ${config.runtime || this.lambdaConfig.runtime}`);
    }

    execSync(`aws lambda update-function-configuration ${updateArgs.join(" ")}`, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  /**
   * Update environment variables
   */
  private async updateEnvironmentVariables(
    config: DeployConfig,
    functionName: string,
    region: string,
  ): Promise<void> {
    const env = this.getEnvironmentVariables(config);
    const envVars = Object.entries(env)
      .filter(([key]) => !key.startsWith("AWS_"))
      .map(([key, value]) => `${key}=${value}`)
      .join(",");

    if (envVars) {
      execSync(
        `aws lambda update-function-configuration --function-name ${functionName} --environment "Variables={${envVars}}" --region ${region}`,
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    }
  }

  /**
   * Setup API Gateway
   */
  private async setupApiGateway(
    functionName: string,
    functionArn: string,
    region: string,
    config: LambdaDeployerConfig,
  ): Promise<string | undefined> {
    const apiGateway = config.apiGateway || this.lambdaConfig.apiGateway;
    if (!apiGateway?.enabled) {
      return undefined;
    }

    try {
      // Create or get HTTP API
      let apiId: string;
      let apiUrl: string;

      const apiName = `${functionName}-api`;
      const listOutput = execSync(
        `aws apigatewayv2 get-apis --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const apis = JSON.parse(listOutput);
      const existingApi = apis.Items?.find((api: { Name: string }) => api.Name === apiName);

      if (existingApi) {
        apiId = existingApi.ApiId;
        apiUrl = existingApi.ApiEndpoint;
      } else {
        // Create new API
        const createOutput = execSync(
          `aws apigatewayv2 create-api --name ${apiName} --protocol-type HTTP --target ${functionArn} --region ${region}`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        );
        const createResult = JSON.parse(createOutput);
        apiId = createResult.ApiId;
        apiUrl = createResult.ApiEndpoint;

        // Add Lambda permission
        const accountId = functionArn.split(":")[4];
        execSync(
          `aws lambda add-permission --function-name ${functionName} --statement-id apigateway-${apiId} --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn arn:aws:execute-api:${region}:${accountId}:${apiId}/* --region ${region}`,
          { stdio: ["pipe", "pipe", "pipe"] },
        );
      }

      return apiUrl;
    } catch (error) {
      logger.warn(`Could not setup API Gateway: ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    try {
      const output = execSync(
        `aws lambda get-function --function-name ${deploymentId}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const result = JSON.parse(output);

      return {
        success: result.Configuration.State === "Active",
        deploymentId,
        status: result.Configuration.State === "Active" ? "success" : "pending",
        timestamp: new Date(result.Configuration.LastModified),
        metadata: {
          state: result.Configuration.State,
          runtime: result.Configuration.Runtime,
        },
      };
    } catch (error) {
      return {
        success: false,
        deploymentId,
        status: "failed",
        error: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Generate Lambda handler
   */
  private generateHandler(buildOutput: BuildOutput): string {
    return `// Generated by NeuroLink Deployment System
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', platform: 'aws-lambda' }));

// Import and mount application
import * as neurolink from './index.mjs';

// Mount NeuroLink routes
if (neurolink.default && typeof neurolink.default.fetch === 'function') {
  app.mount('/', neurolink.default);
} else if (neurolink.app && typeof neurolink.app.fetch === 'function') {
  app.mount('/', neurolink.app);
}

export const handler = handle(app);
`;
  }

  /**
   * Generate Dockerfile for Lambda
   */
  private generateDockerfile(config: LambdaDeployerConfig): string {
    return `# Generated by NeuroLink Deployment System
FROM public.ecr.aws/lambda/nodejs:20

COPY package*.json ./
RUN npm ci --only=production

COPY . ./

CMD ["handler.handler"]
`;
  }
}
