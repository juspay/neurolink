/**
 * AWS Lambda Deployer - Deploy NeuroLink to AWS Lambda
 *
 * Supports multiple deployment methods:
 * - Direct Lambda deployment with Function URLs
 * - SAM (Serverless Application Model) deployment
 * - Docker container deployment to ECR + Lambda
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { logger } from "../../utils/logger.js";
import type {
  Deployer,
  DeployConfig,
  DeployResult,
  LambdaDeployerConfig,
  DeploymentPlatform,
} from "../types.js";

/**
 * AWS Lambda Deployer - Deploy to AWS Lambda with Function URLs or API Gateway
 *
 * @example
 * ```typescript
 * const deployer = new LambdaDeployer({
 *   functionName: 'my-neurolink-api',
 *   region: 'us-east-1',
 *   memorySize: 1024,
 *   timeout: 30,
 *   functionUrl: true
 * });
 *
 * await deployer.build(config);
 * const result = await deployer.deploy(config);
 * console.log(`Deployed to: ${result.url}`);
 * ```
 */
export class LambdaDeployer implements Deployer {
  readonly name: DeploymentPlatform = "lambda";
  private lambdaConfig: LambdaDeployerConfig;

  constructor(config?: LambdaDeployerConfig) {
    this.lambdaConfig = config || {};
  }

  /**
   * Build the application for AWS Lambda deployment
   */
  async build(config: DeployConfig): Promise<void> {
    logger.info("Building for AWS Lambda deployment...");

    const outputDir = config.outDir;

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    if (this.lambdaConfig.useDocker) {
      // Generate Docker deployment artifacts
      await this.buildDockerDeployment(config);
    } else {
      // Generate standard Lambda deployment artifacts
      await this.buildStandardDeployment(config);
    }

    logger.info("AWS Lambda build complete", { outputDir });
  }

  /**
   * Build standard Lambda deployment (ZIP-based)
   */
  private async buildStandardDeployment(config: DeployConfig): Promise<void> {
    const outputDir = config.outDir;

    // Generate Lambda handler
    const handler = this.generateLambdaHandler(config);
    fs.writeFileSync(path.join(outputDir, "index.mjs"), handler);

    // Generate SAM template
    const samTemplate = this.generateSAMTemplate(config);
    fs.writeFileSync(path.join(outputDir, "template.yaml"), samTemplate);

    // Generate package.json
    const packageJson = {
      name: this.lambdaConfig.functionName || "neurolink-lambda",
      version: "1.0.0",
      type: "module",
      main: "index.mjs",
      dependencies: {
        hono: "^4.0.0",
        "@hono/node-server": "^1.8.0",
      },
    };
    fs.writeFileSync(
      path.join(outputDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Install dependencies
    try {
      execSync("npm install --production", {
        cwd: outputDir,
        stdio: "pipe",
      });
    } catch (error) {
      logger.warn("Failed to install dependencies", {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Build Docker-based Lambda deployment
   */
  private async buildDockerDeployment(config: DeployConfig): Promise<void> {
    const outputDir = config.outDir;

    // Generate Dockerfile
    const dockerfile = this.generateDockerfile(config);
    fs.writeFileSync(path.join(outputDir, "Dockerfile"), dockerfile);

    // Generate Lambda handler
    const handler = this.generateLambdaHandler(config);
    fs.writeFileSync(path.join(outputDir, "index.mjs"), handler);

    // Generate package.json
    const packageJson = {
      name: this.lambdaConfig.functionName || "neurolink-lambda",
      version: "1.0.0",
      type: "module",
      main: "index.mjs",
      dependencies: {
        hono: "^4.0.0",
        "@hono/node-server": "^1.8.0",
      },
    };
    fs.writeFileSync(
      path.join(outputDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );
  }

  /**
   * Deploy to AWS Lambda
   */
  async deploy(config: DeployConfig): Promise<DeployResult> {
    // Validate AWS CLI
    const validation = await this.validate();
    if (!validation.valid) {
      return {
        url: "",
        deploymentId: "",
        status: "failed",
        logs: validation.errors,
      };
    }

    try {
      if (this.lambdaConfig.useDocker) {
        return await this.deployDocker(config);
      } else {
        return await this.deploySAM(config);
      }
    } catch (error) {
      return {
        url: "",
        deploymentId: "",
        status: "failed",
        logs: [(error as Error).message],
      };
    }
  }

  /**
   * Deploy using SAM CLI
   */
  private async deploySAM(config: DeployConfig): Promise<DeployResult> {
    const functionName =
      this.lambdaConfig.functionName || "neurolink-api";
    const region = this.lambdaConfig.region || config.region || "us-east-1";

    // Build with SAM
    execSync("sam build", {
      cwd: config.outDir,
      stdio: "pipe",
    });

    // Deploy with SAM
    const deployArgs = [
      "sam deploy",
      "--no-confirm-changeset",
      "--no-fail-on-empty-changeset",
      `--stack-name ${functionName}-stack`,
      `--region ${region}`,
      "--capabilities CAPABILITY_IAM",
    ];

    const output = execSync(deployArgs.join(" "), {
      cwd: config.outDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Get function URL if enabled
    let url = "";
    if (this.lambdaConfig.functionUrl !== false) {
      try {
        const urlOutput = execSync(
          `aws lambda get-function-url-config --function-name ${functionName} --region ${region}`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
        );
        const urlConfig = JSON.parse(urlOutput);
        url = urlConfig.FunctionUrl || "";
      } catch {
        // Function URL might not be configured yet
      }
    }

    return {
      url,
      deploymentId: `lambda-${functionName}-${Date.now()}`,
      status: "success",
      logs: [output],
    };
  }

  /**
   * Deploy using Docker + ECR
   */
  private async deployDocker(config: DeployConfig): Promise<DeployResult> {
    const functionName =
      this.lambdaConfig.functionName || "neurolink-api";
    const region = this.lambdaConfig.region || config.region || "us-east-1";
    const ecrRepo =
      this.lambdaConfig.ecrRepository || `${functionName}-repo`;

    // Get ECR login
    execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${region}.amazonaws.com`,
      { cwd: config.outDir, stdio: "pipe" }
    );

    // Build Docker image
    execSync(`docker build -t ${functionName} .`, {
      cwd: config.outDir,
      stdio: "pipe",
    });

    // Tag and push to ECR
    const accountId = execSync(
      "aws sts get-caller-identity --query Account --output text",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    const ecrUri = `${accountId}.dkr.ecr.${region}.amazonaws.com/${ecrRepo}`;

    execSync(`docker tag ${functionName}:latest ${ecrUri}:latest`, {
      cwd: config.outDir,
      stdio: "pipe",
    });

    execSync(`docker push ${ecrUri}:latest`, {
      cwd: config.outDir,
      stdio: "pipe",
    });

    // Update Lambda function
    const output = execSync(
      `aws lambda update-function-code --function-name ${functionName} --image-uri ${ecrUri}:latest --region ${region}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );

    // Get function URL
    let url = "";
    try {
      const urlOutput = execSync(
        `aws lambda get-function-url-config --function-name ${functionName} --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
      const urlConfig = JSON.parse(urlOutput);
      url = urlConfig.FunctionUrl || "";
    } catch {
      // Function URL might not be configured
    }

    return {
      url,
      deploymentId: `lambda-${functionName}-${Date.now()}`,
      status: "success",
      logs: [output],
    };
  }

  /**
   * Get deployment status
   */
  async getStatus(deploymentId: string): Promise<DeployResult> {
    try {
      // Extract function name from deployment ID
      const match = deploymentId.match(/lambda-(.+)-\d+$/);
      const functionName = match
        ? match[1]
        : this.lambdaConfig.functionName || "neurolink-api";
      const region = this.lambdaConfig.region || "us-east-1";

      const output = execSync(
        `aws lambda get-function --function-name ${functionName} --region ${region}`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );

      const functionInfo = JSON.parse(output);
      const state = functionInfo.Configuration?.State;

      // Get function URL if available
      let url = "";
      try {
        const urlOutput = execSync(
          `aws lambda get-function-url-config --function-name ${functionName} --region ${region}`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
        );
        const urlConfig = JSON.parse(urlOutput);
        url = urlConfig.FunctionUrl || "";
      } catch {
        // Function URL might not be configured
      }

      return {
        url,
        deploymentId,
        status:
          state === "Active"
            ? "success"
            : state === "Failed"
              ? "failed"
              : "pending",
        logs: [`Function state: ${state}`],
      };
    } catch (error) {
      return {
        url: "",
        deploymentId,
        status: "failed",
        logs: [(error as Error).message],
      };
    }
  }

  /**
   * Generate Lambda handler
   */
  private generateLambdaHandler(config: DeployConfig): string {
    return `/**
 * AWS Lambda Handler
 * Generated by NeuroLink Deployer
 */

import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

// Create Hono app
const app = new Hono();

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'aws-lambda' }));

// API routes
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json();
    // Import your NeuroLink instance and handle generation
    // const result = await neurolink.generate(body);
    return c.json({ message: 'Generation endpoint - configure with your NeuroLink instance' });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// MCP tools endpoint
app.get('/api/tools', (c) => {
  // Return available tools
  return c.json({ tools: [] });
});

// Tool execution endpoint
app.post('/api/tools/:toolName', async (c) => {
  const toolName = c.req.param('toolName');
  try {
    const input = await c.req.json();
    // Execute tool
    return c.json({ tool: toolName, result: 'Configure tool execution' });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Catch-all for other routes
app.all('*', (c) => {
  return c.json({
    message: 'NeuroLink API',
    endpoints: ['/health', '/api/generate', '/api/tools']
  });
});

// Export Lambda handler
export const handler = handle(app);
`;
  }

  /**
   * Generate SAM template
   */
  private generateSAMTemplate(config: DeployConfig): string {
    const functionName =
      this.lambdaConfig.functionName || "neurolink-api";
    const runtime = this.lambdaConfig.runtime || "nodejs20.x";
    const memorySize = this.lambdaConfig.memorySize || 1024;
    const timeout = this.lambdaConfig.timeout || 30;
    const handler = this.lambdaConfig.handler || "index.handler";

    let template = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: NeuroLink API deployed via SAM

Globals:
  Function:
    Timeout: ${timeout}
    MemorySize: ${memorySize}
    Runtime: ${runtime}

Resources:
  NeuroLinkFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: ${functionName}
      Handler: ${handler}
      CodeUri: .
      Architectures:
        - x86_64
`;

    // Add environment variables
    const envVars = {
      ...this.lambdaConfig.environment,
      ...config.env,
    };

    if (Object.keys(envVars).length > 0) {
      template += "      Environment:\n        Variables:\n";
      for (const [key, value] of Object.entries(envVars)) {
        template += `          ${key}: "${value}"\n`;
      }
    }

    // Add VPC configuration if provided
    if (this.lambdaConfig.vpc) {
      template += `      VpcConfig:
        SubnetIds:
${this.lambdaConfig.vpc.subnetIds.map((s) => `          - ${s}`).join("\n")}
        SecurityGroupIds:
${this.lambdaConfig.vpc.securityGroupIds.map((s) => `          - ${s}`).join("\n")}
`;
    }

    // Add Function URL if enabled
    if (this.lambdaConfig.functionUrl !== false) {
      template += `      FunctionUrlConfig:
        AuthType: NONE
        Cors:
          AllowOrigins:
            - '*'
          AllowMethods:
            - '*'
          AllowHeaders:
            - '*'
`;
    }

    // Add outputs
    template += `
Outputs:
  NeuroLinkFunctionArn:
    Description: "NeuroLink Lambda Function ARN"
    Value: !GetAtt NeuroLinkFunction.Arn
`;

    if (this.lambdaConfig.functionUrl !== false) {
      template += `  NeuroLinkFunctionUrl:
    Description: "NeuroLink Lambda Function URL"
    Value: !GetAtt NeuroLinkFunctionUrl.FunctionUrl
`;
    }

    return template;
  }

  /**
   * Generate Dockerfile for container deployment
   */
  private generateDockerfile(config: DeployConfig): string {
    const runtime = this.lambdaConfig.runtime || "nodejs20.x";
    const nodeVersion = runtime.replace("nodejs", "").replace(".x", "");

    return `# AWS Lambda Container Image
FROM public.ecr.aws/lambda/nodejs:${nodeVersion}

# Copy function code
COPY package*.json ./
RUN npm install --production

COPY index.mjs ./

# Set the handler
CMD ["index.handler"]
`;
  }

  /**
   * Validate AWS deployment requirements
   */
  private async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for AWS CLI
    try {
      execSync("aws --version", { stdio: "ignore" });
    } catch {
      errors.push("AWS CLI not found. Install from: https://aws.amazon.com/cli/");
    }

    // Check for SAM CLI (for standard deployments)
    if (!this.lambdaConfig.useDocker) {
      try {
        execSync("sam --version", { stdio: "ignore" });
      } catch {
        errors.push("SAM CLI not found. Install from: https://aws.amazon.com/serverless/sam/");
      }
    }

    // Check for Docker (for container deployments)
    if (this.lambdaConfig.useDocker) {
      try {
        execSync("docker --version", { stdio: "ignore" });
      } catch {
        errors.push("Docker not found. Install from: https://www.docker.com/");
      }
    }

    // Check for AWS credentials
    try {
      execSync("aws sts get-caller-identity", { stdio: "ignore" });
    } catch {
      errors.push(
        "AWS credentials not configured. Run: aws configure"
      );
    }

    return { valid: errors.length === 0, errors };
  }
}

export default LambdaDeployer;
