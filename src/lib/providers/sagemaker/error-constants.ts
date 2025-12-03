/**
 * Error message constants and templates for Amazon SageMaker Provider
 *
 * This module contains all error message templates, prefixes, and constants
 * used throughout the SageMaker provider for consistent error handling.
 */

/**
 * Error message prefixes for different error types
 */
export const ERROR_MESSAGE_PREFIXES = {
  VALIDATION: "Invalid request parameters",
  MODEL: "Model execution error",
  INTERNAL: "Internal server error",
  SERVICE_UNAVAILABLE: "SageMaker service is temporarily unavailable",
  THROTTLING: "Request rate limit exceeded",
  CREDENTIALS: "AWS credentials are invalid or missing",
  NETWORK: "Network error while connecting to SageMaker",
  ENDPOINT_NOT_FOUND: "SageMaker endpoint not found",
  VALIDATION_FIELD: "Validation failed for",
  CREDENTIALS_SETUP: "AWS credentials error",
  NETWORK_CONNECTION: "Network error",
} as const;

/**
 * Detailed error message templates for user guidance
 */
export const ERROR_MESSAGE_TEMPLATES = {
  VALIDATION_ERROR: `❌ SageMaker Request Validation Error{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Check your request parameters and format
2. Verify the endpoint name is correct
3. Ensure your request body matches the expected model format
4. Validate that required parameters are included

💡 Tips:
- Double-check the endpoint name spelling
- Ensure JSON format is valid if using JSON content type
- Verify parameter types match model expectations`,

  MODEL_ERROR: `❌ SageMaker Model Execution Error{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Check if the model is properly deployed and in 'InService' status
2. Verify your input format matches what the model expects
3. Ensure input size is within model limits
4. Check if the model container is healthy

💡 Tips:
- Try with a simpler input to test model health
- Check CloudWatch logs for detailed model errors
- Verify model dependencies are properly installed`,

  INTERNAL_ERROR: `❌ SageMaker Internal Server Error{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Retry the request after a short delay
2. Check AWS Service Health Dashboard
3. Verify your endpoint is still active and healthy
4. Contact AWS support if issue persists

💡 Tips:
- This is usually a temporary issue
- Implement exponential backoff for retries
- Check if other endpoints are working`,

  SERVICE_UNAVAILABLE: `❌ SageMaker Service Temporarily Unavailable{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Wait and retry after a few seconds
2. Check AWS region status
3. Verify your endpoint hasn't been deleted
4. Check if you've hit account limits

💡 Tips:
- Service issues are usually temporary
- Implement retry logic with backoff
- Monitor AWS Service Health Dashboard`,

  CREDENTIALS_ERROR: `❌ AWS Credentials Error{endpointContext}

{originalMessage}

🔧 Required Steps:
1. Verify AWS_ACCESS_KEY_ID is set correctly
2. Verify AWS_SECRET_ACCESS_KEY is set correctly
3. Check AWS_SESSION_TOKEN if using temporary credentials
4. Ensure credentials have SageMaker permissions

🔑 Required IAM Permissions:
- sagemaker:InvokeEndpoint
- sagemaker:InvokeEndpointWithResponseStream
- sagemaker:DescribeEndpoint (optional, for debugging)

💡 Setup Help:
- Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
- Check IAM user has necessary permissions
- Verify credentials haven't expired`,

  NETWORK_ERROR: `❌ Network Connection Error{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Check your internet connection
2. Verify firewall/proxy settings
3. Try different DNS servers
4. Check if SageMaker service is accessible from your network

💡 Network Troubleshooting:
- Test connectivity to other AWS services
- Check for VPC/subnet restrictions if running in AWS
- Verify security group rules allow outbound HTTPS`,

  ENDPOINT_NOT_FOUND: `❌ SageMaker Endpoint Not Found{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Verify the endpoint name is spelled correctly
2. Check if the endpoint exists in the correct AWS region
3. Ensure the endpoint is in 'InService' status
4. Verify you have permissions to access the endpoint

💡 Endpoint Management:
- List endpoints: aws sagemaker list-endpoints
- Check status: aws sagemaker describe-endpoint --endpoint-name <name>
- Ensure endpoint is deployed in the same region`,

  THROTTLING_ERROR: `❌ Request Rate Limit Exceeded{endpointContext}

{originalMessage}

🔧 Common Solutions:
1. Implement exponential backoff retry logic
2. Reduce request rate
3. Consider using batch inference for large workloads
4. Request higher limits from AWS support if needed

💡 Rate Limiting Tips:
- Space out requests over time
- Use batch processing when possible
- Monitor your request patterns
- Consider auto-scaling your endpoint`,

  UNKNOWN_ERROR: `❌ Unknown SageMaker Error{endpointContext}

{originalMessage}

🔧 General Troubleshooting:
1. Check AWS credentials and permissions
2. Verify endpoint name and status
3. Check network connectivity
4. Review request format and parameters

💡 Additional Help:
- Check CloudWatch logs for detailed errors
- Verify SageMaker service health
- Consult AWS SageMaker documentation
- Contact AWS support for persistent issues`,

  DEFAULT: `❌ SageMaker Error{endpointContext}

{originalMessage}

🔧 General Troubleshooting:
1. Check AWS credentials and permissions
2. Verify endpoint name and status
3. Check network connectivity
4. Review request format and parameters

💡 Additional Help:
- Check CloudWatch logs for detailed errors
- Verify SageMaker service health
- Consult AWS SageMaker documentation
- Contact AWS support for persistent issues`,
} as const;

/**
 * Retry delay constants for different error types (in milliseconds)
 */
export const RETRY_DELAYS = {
  THROTTLING_ERROR: 5000, // 5 seconds for throttling
  SERVICE_UNAVAILABLE: 2000, // 2 seconds for service issues
  NETWORK_ERROR: 1000, // 1 second for network issues
  DEFAULT: 1000, // Default 1 second
} as const;

/**
 * List of retryable AWS SDK error names and conditions
 */
export const RETRYABLE_ERROR_CONDITIONS = {
  ERROR_NAMES: [
    "ServiceUnavailable",
    "InternalFailure",
    "ThrottlingException",
    "NetworkingError",
  ],
  ERROR_MESSAGE_KEYWORDS: [
    "timeout",
    "throttl",
    "unavailable",
    "internal",
    "network",
  ],
} as const;

/**
 * AWS SDK error name mappings to SageMaker error codes
 */
export const AWS_ERROR_MAPPINGS = {
  ValidationException: "VALIDATION_ERROR",
  ModelError: "MODEL_ERROR",
  InternalFailure: "INTERNAL_ERROR",
  ServiceUnavailable: "SERVICE_UNAVAILABLE",
  ThrottlingException: "THROTTLING_ERROR",
  CredentialsError: "CREDENTIALS_ERROR",
  NetworkingError: "NETWORK_ERROR",
} as const;

/**
 * Common error message keywords for pattern matching
 */
export const ERROR_KEYWORDS = {
  VALIDATION: ["validation"],
  MODEL: ["model error"],
  INTERNAL: ["internal"],
  SERVICE_UNAVAILABLE: ["unavailable"],
  THROTTLING: ["throttl"],
  CREDENTIALS: ["credential"],
  NETWORK: ["network"],
  ENDPOINT_NOT_FOUND: ["endpoint", "not found"],
} as const;
