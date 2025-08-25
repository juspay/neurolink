# CLI Command Factory Developer Guide

> **Version**: 1.0  
> **Last Updated**: August 20, 2025  
> **Architecture**: Factory Pattern (migrated from Command Module Pattern)

## Overview

This guide provides complete instructions for adding new CLI commands using NeuroLink's Factory Pattern architecture. The Factory Pattern provides better organization, type safety, and maintainability compared to the previous Command Module Pattern.

### Architecture Summary

```
src/cli/
├── factories/
│   ├── commandFactory.ts         # Main factory with delegation methods
│   ├── ollamaCommandFactory.ts   # Ollama command group
│   ├── sagemakerCommandFactory.ts # SageMaker command group
│   └── [your-new-factory].ts     # Your new command group
├── index.ts                      # Main CLI entry point
└── commands/                     # Legacy (use factories instead)
```

### Key Benefits

- **Centralized Command Creation**: All commands created through factories
- **Type Safety**: Full TypeScript support with proper interfaces
- **Consistent Patterns**: Standardized error handling and user experience
- **Security**: Built-in patterns for credential management
- **Maintainability**: Clear separation of concerns

---

## Quick Start Checklist

### Adding a New Subcommand to Existing Factory
- [1] Add handler method to factory class
- [2] Add command definition to builder
- [3] Test the new command
- [4] Update documentation

### Creating a New Command Factory
- [1] Create new factory file
- [2] Add delegation method to CLICommandFactory
- [3] Add command to main CLI entry point
- [4] Test integration
- [5] Update documentation

---

## Part 1: Adding Individual Commands to Existing Factories

### Step 1: Identify the Target Factory

Choose the appropriate factory for your command:
- **OllamaCommandFactory**: Local Ollama model management
- **SageMakerCommandFactory**: AWS SageMaker operations
- **Create New Factory**: If your command doesn't fit existing categories

### Step 2: Add Handler Method

Add a private static handler method to the factory class:

```typescript
/**
 * Handler for your new command
 */
private static async yourNewCommandHandler(argv: {
  requiredParam: string;
  optionalParam?: string;
}) {
  const { requiredParam, optionalParam } = argv;
  const spinner = ora(`Processing ${requiredParam}...`).start();

  try {
    // Your command logic here
    const result = await someAsyncOperation(requiredParam);
    
    spinner.succeed(`✅ Successfully processed ${requiredParam}`);
    logger.always(chalk.blue(`Result: ${result}`));
    
  } catch (error: unknown) {
    spinner.fail(`❌ Failed to process ${requiredParam}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(chalk.red("Error:", errorMessage));
    process.exit(1);
  }
}
```

### Step 3: Add Command to Builder

Add the command definition to the factory's builder method:

```typescript
.command(
  "your-command <required>",
  "Description of what your command does",
  {
    required: {
      describe: "Required parameter description",
      type: "string",
      demandOption: true,
    },
    optional: {
      describe: "Optional parameter description", 
      type: "string",
    },
  },
  this.yourNewCommandHandler,
)
```

### Step 4: Test Your Command

```bash
# Test your new command
neurolink [factory-name] your-command test-value --optional extra

# Example for Ollama factory
neurolink ollama your-command test-value --optional extra
```

---

## Part 2: Creating New Command Factories

### Step 1: Create Factory File

Create `src/cli/factories/yourServiceCommandFactory.ts`:

```typescript
import type { Argv, CommandModule } from "yargs";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { logger } from "../../lib/utils/logger.js";

/**
 * Factory for creating YourService CLI commands using the Factory Pattern
 */
export class YourServiceCommandFactory {
  /**
   * Create the YourService command group
   */
  public static createYourServiceCommands(): CommandModule {
    return {
      command: "your-service <command>",
      describe: "Manage YourService operations",
      builder: (yargs: Argv) => {
        return yargs
          .command(
            "status",
            "Check YourService status",
            {},
            this.statusHandler,
          )
          .command(
            "setup",
            "Interactive YourService setup",
            {},
            this.setupHandler,
          )
          .command(
            "test <target>",
            "Test YourService connectivity",
            {
              target: {
                describe: "Target to test",
                type: "string",
                demandOption: true,
              },
            },
            this.testHandler,
          )
          .demandCommand(1, "Please specify a command");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Handler for status command
   */
  private static async statusHandler() {
    const spinner = ora("Checking YourService status...").start();
    
    try {
      // Your status check logic
      const isHealthy = await checkServiceHealth();
      
      if (isHealthy) {
        spinner.succeed("✅ YourService is healthy");
      } else {
        spinner.fail("❌ YourService is not responding");
        process.exit(1);
      }
    } catch (error: unknown) {
      spinner.fail("Failed to check status");
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      process.exit(1);
    }
  }

  /**
   * Handler for setup command
   */
  private static async setupHandler() {
    logger.always(chalk.blue("\n🚀 YourService Interactive Setup\n"));

    try {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "endpoint",
          message: "Service endpoint URL:",
          validate: (input: string) =>
            input.trim().length > 0 || "Endpoint is required",
        },
        {
          type: "password",
          name: "apiKey",
          message: "API Key:",
          validate: (input: string) =>
            input.trim().length > 0 || "API Key is required",
        },
      ]);

      const spinner = ora("Configuring YourService...").start();
      
      // Your setup logic here
      await configureService(answers.endpoint, answers.apiKey);
      
      spinner.succeed("✅ YourService configured successfully");
      
      logger.always(chalk.green("\n🎉 Setup complete!"));
      logger.always(chalk.yellow("Next steps:"));
      logger.always("1. Test connection: neurolink your-service test endpoint");
      logger.always("2. Check status: neurolink your-service status");
      
    } catch (error: unknown) {
      logger.error(chalk.red(`Setup failed: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  }

  /**
   * Handler for test command
   */
  private static async testHandler(argv: { target: string }) {
    const { target } = argv;
    const spinner = ora(`Testing connectivity to ${target}...`).start();

    try {
      // Your test logic here
      const result = await testConnectivity(target);
      
      if (result.success) {
        spinner.succeed(`✅ Successfully connected to ${target}`);
        logger.always(chalk.blue(`Response time: ${result.responseTime}ms`));
      } else {
        spinner.fail(`❌ Failed to connect to ${target}`);
        logger.error(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }
    } catch (error: unknown) {
      spinner.fail("Test failed");
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(chalk.red("Error:", errorMessage));
      process.exit(1);
    }
  }
}

// Placeholder functions - implement according to your service
async function checkServiceHealth(): Promise<boolean> {
  // Your implementation
  return true;
}

async function configureService(endpoint: string, apiKey: string): Promise<void> {
  // Your implementation
}

async function testConnectivity(target: string): Promise<{
  success: boolean;
  responseTime?: number;
  error?: string;
}> {
  // Your implementation
  return { success: true, responseTime: 150 };
}
```

### Step 2: Add Delegation to CLICommandFactory

Edit `src/cli/factories/commandFactory.ts`:

1. **Add Import** (with other factory imports):
```typescript
import { YourServiceCommandFactory } from "./yourServiceCommandFactory.js";
```

2. **Add Delegation Method** (with other static methods):
```typescript
/**
 * Create YourService commands
 */
static createYourServiceCommands(): CommandModule {
  return YourServiceCommandFactory.createYourServiceCommands();
}
```

### Step 3: Add to Main CLI Entry Point

Edit `src/cli/index.ts`:

Add the command registration (with other command registrations):

```typescript
.command(CLICommandFactory.createYourServiceCommands())
```

### Step 4: Test Integration

```bash
# Test your new factory
neurolink your-service status
neurolink your-service setup
neurolink your-service test example.com
```

---

## Part 3: Security Patterns

### For Services with Credentials

When handling sensitive data like API keys or credentials, follow these patterns:

#### Secure Configuration Container

```typescript
/**
 * Secure configuration container that avoids process.env exposure
 */
interface SecureConfiguration {
  apiKey: string;
  endpoint: string;
  sessionId: string;
  createdAt: number;
}

export class YourServiceCommandFactory {
  /**
   * In-memory secure credential store (cleared after validation)
   */
  private static readonly secureCredentialStore = new Map<string, SecureConfiguration>();

  /**
   * Create secure configuration without exposing credentials
   */
  private static createSecureConfiguration(config: {
    apiKey: string;
    endpoint: string;
  }): SecureConfiguration {
    const sessionId = `yourservice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const secureConfig: SecureConfiguration = {
      ...config,
      sessionId,
      createdAt: Date.now(),
    };

    // Store temporarily in secure memory store
    this.secureCredentialStore.set(sessionId, secureConfig);

    // Auto-cleanup after 5 minutes for security
    setTimeout(() => {
      this.secureCredentialStore.delete(sessionId);
    }, 5 * 60 * 1000);

    return secureConfig;
  }

  /**
   * Clear secure credentials from memory
   */
  private static clearSecureCredentials(sessionId: string): void {
    this.secureCredentialStore.delete(sessionId);
  }
}
```

#### Security Warnings for Setup

```typescript
private static async setupHandler() {
  // Pre-setup security advisory
  logger.always(chalk.yellow.bold(
    "🔒 SECURITY NOTICE: You will be prompted to enter credentials.\n" +
    "These credentials will be stored temporarily in memory only.\n" +
    "For production use, consider using environment variables or credential files.\n"
  ));

  // Ask for user confirmation before proceeding
  const { confirmSetup } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmSetup",
      message: "Do you understand the security implications and want to proceed?",
      default: false,
    },
  ]);

  if (!confirmSetup) {
    logger.always(chalk.blue("Setup cancelled. Consider using alternative methods:"));
    logger.always("• Environment variables in .env file");
    logger.always("• Configuration files with proper permissions");
    return;
  }

  // Rest of setup logic...
}
```

---

## Part 4: User Experience Patterns

### Consistent Messaging

```typescript
// Success messages
spinner.succeed("✅ Operation completed successfully");
logger.always(chalk.green("Success message"));

// Error messages  
spinner.fail("❌ Operation failed");
logger.error(chalk.red("Error:", errorMessage));

// Info messages
logger.always(chalk.blue("ℹ️ Information message"));

// Warning messages
logger.always(chalk.yellow("⚠️ Warning message"));
```

### Progress Indicators

```typescript
// For quick operations
const spinner = ora("Processing...").start();

// For longer operations with updates
const spinner = ora("Starting process...").start();
spinner.text = "Step 1 of 3: Validating...";
// ... operation ...
spinner.text = "Step 2 of 3: Processing...";
// ... operation ...
spinner.succeed("✅ All steps completed");
```

### Input Validation

```typescript
// Required string input
{
  type: "input",
  name: "endpoint",
  message: "Service endpoint:",
  validate: (input: string) =>
    input.trim().length > 0 || "Endpoint is required",
}

// URL validation
{
  type: "input", 
  name: "url",
  message: "Service URL:",
  validate: (input: string) => {
    try {
      new URL(input);
      return true;
    } catch {
      return "Please enter a valid URL";
    }
  },
}

// Number validation
{
  type: "number",
  name: "timeout",
  message: "Timeout (ms):",
  default: 30000,
  validate: (input: number) =>
    input > 0 && input <= 300000 || "Timeout must be between 1 and 300000ms",
}
```

---

## Part 5: Testing & Validation

### Manual Testing Checklist

#### For Individual Commands
- [ ] Command executes without errors
- [ ] Help text displays correctly: `neurolink your-service your-command --help`
- [ ] Required parameters are enforced
- [ ] Optional parameters work correctly
- [ ] Error handling works (test with invalid inputs)
- [ ] Success and failure messages are clear

#### For Command Factories  
- [ ] Factory integrates with main CLI
- [ ] All subcommands are accessible
- [ ] Help text displays: `neurolink your-service --help`
- [ ] Subcommand list is complete
- [ ] No command conflicts with existing commands

### Build Testing

```bash
# Ensure TypeScript compilation succeeds
pnpm run build

# Run CLI tests if available
pnpm run test:cli

# Test with actual CLI
pnpm cli your-service --help
```

### Integration Testing

```bash
# Test all factory commands
neurolink your-service --help
neurolink your-service status
neurolink your-service setup
neurolink your-service test example

# Test error conditions
neurolink your-service invalid-command
neurolink your-service test  # Missing required parameter
```

---

## Part 6: Best Practices

### Naming Conventions

- **Factory Classes**: `YourServiceCommandFactory`
- **Factory Files**: `yourServiceCommandFactory.ts`
- **Command Groups**: `your-service` (kebab-case)
- **Subcommands**: `list-items`, `check-status` (kebab-case)
- **Handler Methods**: `listItemsHandler`, `checkStatusHandler` (camelCase)

### Error Handling

```typescript
try {
  // Operation that might fail
  const result = await riskyOperation();
  spinner.succeed("✅ Operation completed");
} catch (error: unknown) {
  spinner.fail("❌ Operation failed");
  
  // Type-safe error handling
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(chalk.red("Error:", errorMessage));
  
  // Provide helpful guidance
  logger.always(chalk.blue("\n💡 Troubleshooting:"));
  logger.always("• Check your configuration");
  logger.always("• Verify network connectivity");
  logger.always("• Try running: neurolink your-service setup");
  
  process.exit(1);
}
```

### TypeScript Best Practices

```typescript
// Use proper interfaces for arguments
interface YourCommandArgs {
  target: string;
  timeout?: number;
  retries?: number;
}

private static async yourCommandHandler(argv: YourCommandArgs) {
  // Implementation with full type safety
}

// Use unknown for error handling
catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // Handle error safely
}
```

### Documentation Requirements

For each new command or factory, update:
- [ ] This developer guide (if new patterns introduced)
- [ ] API documentation (`docs/CLI-REFERENCE.md`)
- [ ] Help text in command definitions
- [ ] Examples in command builders

---

## Part 7: Common Patterns & Templates

### Basic Command Template

```typescript
.command(
  "command-name <required> [optional]",
  "Brief description of what this command does",
  {
    required: {
      describe: "Description of required parameter",
      type: "string",
      demandOption: true,
    },
    optional: {
      describe: "Description of optional parameter",
      type: "string",
    },
    flag: {
      describe: "Boolean flag description", 
      type: "boolean",
      default: false,
    },
  },
  this.commandNameHandler,
)
```

### Interactive Setup Template

```typescript
private static async setupHandler() {
  logger.always(chalk.blue("\n🚀 YourService Interactive Setup\n"));

  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "field1",
        message: "Enter field 1:",
        validate: (input: string) => input.trim().length > 0 || "Field 1 is required",
      },
      {
        type: "list", 
        name: "field2",
        message: "Select field 2:",
        choices: ["option1", "option2", "option3"],
      },
      {
        type: "confirm",
        name: "field3", 
        message: "Enable feature?",
        default: true,
      },
    ]);

    const spinner = ora("Configuring service...").start();
    
    // Configuration logic
    await configureService(answers);
    
    spinner.succeed("✅ Configuration complete");
    
    // Next steps
    logger.always(chalk.green("\n🎉 Setup complete!"));
    logger.always(chalk.yellow("Next steps:"));
    logger.always("1. Test: neurolink your-service test");
    logger.always("2. Status: neurolink your-service status");
    
  } catch (error: unknown) {
    logger.error(chalk.red(`Setup failed: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
```

### Status Check Template

```typescript
private static async statusHandler() {
  const spinner = ora("Checking service status...").start();

  try {
    const status = await checkServiceStatus();
    spinner.stop();

    logger.always(chalk.blue("\n🔍 Service Status\n"));

    if (status.healthy) {
      logger.always(chalk.green("✅ Service: Healthy"));
      logger.always(`   Version: ${status.version}`);
      logger.always(`   Uptime: ${status.uptime}`);
      logger.always(`   Response Time: ${status.responseTime}ms`);
    } else {
      logger.always(chalk.red("❌ Service: Unhealthy"));
      if (status.issues.length > 0) {
        logger.always(chalk.yellow("\n⚠️ Issues:"));
        status.issues.forEach((issue: string) => {
          logger.always(`   • ${issue}`);
        });
      }
      process.exit(1);
    }
  } catch (error: unknown) {
    spinner.fail("Failed to check status");
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(chalk.red("Error:", errorMessage));
    process.exit(1);
  }
}
```

---

## Part 8: Troubleshooting

### Common Issues

#### Command Not Found
```
Error: Unknown command: your-service
```
**Solution**: Check that you added the factory to both `CLICommandFactory` and `src/cli/index.ts`

#### TypeScript Compilation Errors
```
Error: Cannot find module './yourServiceCommandFactory.js'
```
**Solution**: Ensure the import path is correct and uses `.js` extension

#### Subcommand Not Working
```
Error: Unknown command: your-command
```
**Solution**: Check that the subcommand is properly added to the factory's builder method

#### Handler Method Errors
```
Error: this.yourCommandHandler is not a function
```
**Solution**: Ensure handler methods are `private static async` and properly referenced

### Debugging Tips

1. **Enable Debug Mode**: Use `--debug` flag for verbose output
2. **Check TypeScript**: Run `pnpm run build` to catch compilation errors
3. **Test Incrementally**: Add one command at a time and test each step
4. **Validate Arguments**: Log argv parameters to ensure they're being passed correctly

### Getting Help

- **Factory Pattern Examples**: See `OllamaCommandFactory` and `SageMakerCommandFactory`
- **CLI Architecture**: See `src/cli/factories/commandFactory.ts`
- **Integration Points**: See `src/cli/index.ts`
- **Testing**: See existing test patterns in project test suite

---

## Conclusion

This Factory Pattern architecture provides a scalable, maintainable way to add CLI commands to NeuroLink. Follow these patterns and templates to ensure consistency across all command implementations.

### Quick Reference

- **New Command**: Add handler → Add to builder → Test
- **New Factory**: Create factory → Add delegation → Add to CLI → Test
- **Security**: Use secure configuration patterns for credentials
- **UX**: Follow consistent messaging and progress indicator patterns
- **Testing**: Manual testing → Build validation → Integration testing

For questions or improvements to this guide, update this document and include examples from your implementation.
