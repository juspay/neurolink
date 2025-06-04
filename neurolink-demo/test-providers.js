import dotenv from 'dotenv';
import { createAIProvider, getBestProvider } from 'neurolink';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args.find(arg => arg.startsWith('--'))?.substring(2) || 'all';
const specificProvider = process.env.PROVIDER;
const promptType = process.env.PROMPT_TYPE || 'standard';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
  return `${ms}ms`;
}

// Test configuration based on our learnings
const TEST_CONFIG = {
  providers: ['openai', 'bedrock', 'vertex'],
  prompts: {
    standard: "Write a haiku about artificial intelligence.",
    long: "Write a detailed technical explanation of how machine learning works, including neural networks, training processes, and real-world applications. Please provide specific examples and explain the mathematical concepts involved.",
    complex: "Create a structured response with multiple sections explaining: 1) The history of AI, 2) Current applications, 3) Future predictions, 4) Ethical considerations. Format as JSON.",
    multilingual: "Explain 'machine learning' in English, Spanish, and French with examples.",
    creative: "Write a short story about an AI helping humans solve climate change.",
    technical: "Explain the difference between supervised and unsupervised learning algorithms."
  },
  timeouts: {
    quick: 5000,
    normal: 15000,
    long: 30000
  }
};

// Enhanced configuration checking based on our debugging
function checkEnvironmentConfiguration() {
  log('\n🔧 Environment Configuration Analysis', 'blue');
  log('=' + '='.repeat(60), 'blue');

  const configs = {
    'OpenAI': {
      required: ['OPENAI_API_KEY'],
      optional: ['OPENAI_MODEL'],
      tests: {
        keyFormat: (key) => key && key.startsWith('sk-'),
        keyLength: (key) => key && key.length > 40
      }
    },
    'Amazon Bedrock': {
      required: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      optional: ['AWS_REGION', 'AWS_SESSION_TOKEN', 'BEDROCK_MODEL'],
      tests: {
        accessKeyFormat: (key) => key && key.startsWith('AKIA'),
        regionValid: (region) => !region || /^[a-z]+-[a-z]+-[0-9]$/.test(region)
      }
    },
    'Google Vertex AI': {
      required: ['GOOGLE_VERTEX_PROJECT'],
      optional: ['GOOGLE_VERTEX_LOCATION', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERTEX_MODEL'],
      authMethods: [
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GOOGLE_AUTH_CLIENT_EMAIL',
        'GOOGLE_GENERATIVE_AI_API_KEY'
      ],
      tests: {
        projectFormat: (project) => project && /^[a-z][a-z0-9-]*[a-z0-9]$/.test(project),
        hasAuthMethod: () => {
          return !!(process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                   process.env.GOOGLE_AUTH_CLIENT_EMAIL ||
                   process.env.GOOGLE_GENERATIVE_AI_API_KEY);
        }
      }
    }
  };

  const results = {};

  for (const [providerName, config] of Object.entries(configs)) {
    log(`\n${providerName}:`, 'cyan');

    const providerResult = {
      required: [],
      optional: [],
      tests: [],
      configured: true,
      authMethod: 'none'
    };

    // Check required variables
    for (const env of config.required) {
      const value = process.env[env];
      if (value) {
        log(`  ✅ ${env}: ${'*'.repeat(Math.min(value.length, 20))}`, 'green');
        providerResult.required.push({ env, status: 'present', value: value.length });
      } else {
        log(`  ❌ ${env}: Not set`, 'red');
        providerResult.required.push({ env, status: 'missing' });
        providerResult.configured = false;
      }
    }

    // Check optional variables
    for (const env of config.optional) {
      const value = process.env[env];
      if (value) {
        log(`  ✅ ${env}: ${value}`, 'yellow');
        providerResult.optional.push({ env, status: 'present', value });
      } else {
        log(`  ⚪ ${env}: Using default`, 'gray');
        providerResult.optional.push({ env, status: 'default' });
      }
    }

    // Run validation tests
    if (config.tests) {
      for (const [testName, testFn] of Object.entries(config.tests)) {
        try {
          const testValue = getTestValue(testName, config);
          const passed = testFn(testValue);
          if (passed) {
            log(`  ✅ ${testName}: Valid`, 'green');
            providerResult.tests.push({ test: testName, status: 'passed' });
          } else {
            log(`  ⚠️  ${testName}: Invalid format`, 'yellow');
            providerResult.tests.push({ test: testName, status: 'failed' });
          }
        } catch (error) {
          log(`  ❌ ${testName}: Error - ${error.message}`, 'red');
          providerResult.tests.push({ test: testName, status: 'error', error: error.message });
        }
      }
    }

    // Check Google authentication method
    if (providerName === 'Google Vertex AI') {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        providerResult.authMethod = 'service_account_file';
        log(`  🔑 Auth Method: Service Account File`, 'blue');
      } else if (process.env.GOOGLE_AUTH_CLIENT_EMAIL) {
        providerResult.authMethod = 'environment_variables';
        log(`  🔑 Auth Method: Environment Variables`, 'blue');
      } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        providerResult.authMethod = 'api_key';
        log(`  🔑 Auth Method: API Key`, 'blue');
      } else {
        providerResult.authMethod = 'none';
        log(`  ❌ Auth Method: None configured`, 'red');
        providerResult.configured = false;
      }
    }

    log(`  📊 Status: ${providerResult.configured ? '✅ Ready' : '❌ Configuration issues'}`,
         providerResult.configured ? 'green' : 'red');

    results[providerName.toLowerCase().replace(' ', '')] = providerResult;
  }

  return results;
}

function getTestValue(testName, config) {
  switch (testName) {
    case 'keyFormat':
    case 'keyLength':
      return process.env.OPENAI_API_KEY;
    case 'accessKeyFormat':
      return process.env.AWS_ACCESS_KEY_ID;
    case 'regionValid':
      return process.env.AWS_REGION;
    case 'projectFormat':
      return process.env.GOOGLE_VERTEX_PROJECT;
    case 'hasAuthMethod':
      return true; // Function will handle the logic
    default:
      return null;
  }
}

// Enhanced provider testing with error categorization
async function testProviderInitialization(providerName) {
  log(`\n🧪 Testing ${providerName.toUpperCase()} Provider Initialization`, 'cyan');
  log('=' + '='.repeat(60), 'cyan');

  const result = {
    provider: providerName,
    initialization: {},
    capabilities: {},
    errors: []
  };

  try {
    const startTime = Date.now();
    const provider = await createAIProvider(providerName);
    const initTime = Date.now() - startTime;

    result.initialization = {
      success: true,
      time: initTime,
      providerType: provider.constructor.name
    };

    log(`✅ Provider initialized successfully (${formatTime(initTime)})`, 'green');
    log(`📦 Provider Type: ${provider.constructor.name}`, 'blue');

    // Test basic capabilities
    const capabilities = {
      hasGenerateText: typeof provider.generateText === 'function',
      hasStreamText: typeof provider.streamText === 'function',
      hasGenerateObject: typeof provider.generateObject === 'function'
    };

    result.capabilities = capabilities;

    log(`🔍 Capabilities:`, 'blue');
    for (const [capability, available] of Object.entries(capabilities)) {
      log(`  ${available ? '✅' : '❌'} ${capability}`, available ? 'green' : 'red');
    }

    return result;

  } catch (error) {
    result.initialization = {
      success: false,
      error: error.message,
      errorType: categorizeError(error)
    };

    result.errors.push({
      stage: 'initialization',
      error: error.message,
      type: categorizeError(error)
    });

    log(`❌ Initialization failed: ${error.message}`, 'red');
    log(`🔍 Error Type: ${categorizeError(error)}`, 'yellow');

    return result;
  }
}

function categorizeError(error) {
  const message = error.message.toLowerCase();

  if (message.includes('api key') || message.includes('authentication') || message.includes('unauthorized')) {
    return 'AUTHENTICATION_ERROR';
  } else if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return 'NETWORK_ERROR';
  } else if (message.includes('rate limit') || message.includes('quota')) {
    return 'RATE_LIMIT_ERROR';
  } else if (message.includes('prompt') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  } else if (message.includes('model') || message.includes('not found')) {
    return 'MODEL_ERROR';
  } else {
    return 'UNKNOWN_ERROR';
  }
}

// Enhanced API testing with different prompt types
async function testProviderAPI(providerName, promptType = 'standard') {
  if (specificProvider && specificProvider !== providerName) {
    return { skipped: true, reason: `Testing only ${specificProvider}` };
  }

  log(`\n🚀 Testing ${providerName.toUpperCase()} API Integration`, 'cyan');
  log(`📝 Prompt Type: ${promptType}`, 'blue');
  log('=' + '='.repeat(60), 'cyan');

  const prompt = TEST_CONFIG.prompts[promptType];
  const result = {
    provider: providerName,
    promptType,
    promptLength: prompt.length,
    tests: {}
  };

  try {
    const provider = await createAIProvider(providerName);

    // Test 1: Basic text generation
    log(`\n📝 Test 1: Basic Text Generation`, 'blue');
    try {
      const startTime = Date.now();

      // Work around the prompt validation bug by testing different parameter formats
      const testParameters = [
        { prompt, maxTokens: 100, temperature: 0.7 },
        { messages: [{ role: 'user', content: prompt }], maxTokens: 100, temperature: 0.7 },
        { input: prompt, maxTokens: 100, temperature: 0.7 }
      ];

      let textResult = null;
      let successfulParams = null;

      for (const params of testParameters) {
        try {
          textResult = await provider.generateText(params);
          successfulParams = params;
          break;
        } catch (paramError) {
          log(`  ⚠️  Parameter format failed: ${Object.keys(params)[0]}`, 'yellow');
        }
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (textResult && textResult.text) {
        result.tests.textGeneration = {
          success: true,
          responseTime,
          contentLength: textResult.text.length,
          model: textResult.model || 'unknown',
          usage: textResult.usage || {},
          parameterFormat: Object.keys(successfulParams)[0]
        };

        log(`  ✅ Generation successful (${formatTime(responseTime)})`, 'green');
        log(`  📊 Content Length: ${textResult.text.length} characters`, 'blue');
        log(`  🤖 Model: ${textResult.model || 'unknown'}`, 'blue');
        log(`  📈 Usage: ${JSON.stringify(textResult.usage || {})}`, 'blue');
        log(`  📝 Content Preview: "${textResult.text.substring(0, 100)}..."`, 'white');
      } else {
        throw new Error('No text content in response');
      }

    } catch (error) {
      result.tests.textGeneration = {
        success: false,
        error: error.message,
        errorType: categorizeError(error)
      };
      log(`  ❌ Generation failed: ${error.message}`, 'red');
    }

    // Test 2: Streaming (if supported)
    log(`\n🌊 Test 2: Streaming Generation`, 'blue');
    try {
      const streamResult = await provider.streamText({
        prompt: "Count from 1 to 3.",
        maxTokens: 50,
        temperature: 0.1
      });

      let streamedContent = '';
      let chunkCount = 0;
      const streamStart = Date.now();

      for await (const chunk of streamResult.textStream) {
        streamedContent += chunk;
        chunkCount++;
      }

      const streamTime = Date.now() - streamStart;

      result.tests.streaming = {
        success: true,
        streamTime,
        chunkCount,
        contentLength: streamedContent.length,
        content: streamedContent
      };

      log(`  ✅ Streaming successful (${formatTime(streamTime)})`, 'green');
      log(`  📊 Chunks: ${chunkCount}, Length: ${streamedContent.length}`, 'blue');
      log(`  📝 Streamed: "${streamedContent}"`, 'white');

    } catch (error) {
      result.tests.streaming = {
        success: false,
        error: error.message,
        errorType: categorizeError(error)
      };
      log(`  ⚠️  Streaming failed: ${error.message}`, 'yellow');
    }

    return result;

  } catch (error) {
    result.tests.initialization = {
      success: false,
      error: error.message,
      errorType: categorizeError(error)
    };
    log(`❌ Provider initialization failed: ${error.message}`, 'red');
    return result;
  }
}

// Test fallback mechanism
async function testFallbackMechanism() {
  log(`\n🔄 Testing Automatic Fallback Mechanism`, 'magenta');
  log('=' + '='.repeat(60), 'magenta');

  const result = {
    timestamp: new Date().toISOString(),
    attempts: [],
    finalProvider: null,
    success: false
  };

  try {
    // Test getBestProvider function
    log(`\n🎯 Testing Best Provider Selection`, 'blue');
    const bestProvider = await getBestProvider();

    if (bestProvider) {
      result.finalProvider = bestProvider.constructor?.name || 'unknown';
      log(`  ✅ Best provider selected: ${result.finalProvider}`, 'green');

      // Test the selected provider
      try {
        const testResult = await bestProvider.generateText({
          prompt: "Hello, world!",
          maxTokens: 50
        });

        result.success = true;
        log(`  ✅ Best provider functional: Generated ${testResult.text?.length || 0} characters`, 'green');

      } catch (error) {
        log(`  ❌ Best provider test failed: ${error.message}`, 'red');
      }
    } else {
      log(`  ❌ No best provider returned`, 'red');
    }

    // Test manual fallback sequence
    log(`\n🔁 Testing Manual Fallback Sequence`, 'blue');
    const providers = TEST_CONFIG.providers;

    for (const providerName of providers) {
      try {
        log(`  🔄 Attempting ${providerName}...`, 'blue');
        const startTime = Date.now();

        const provider = await createAIProvider(providerName);
        const testResult = await provider.generateText({
          prompt: "Test fallback",
          maxTokens: 20
        });

        const endTime = Date.now();

        result.attempts.push({
          provider: providerName,
          status: 'success',
          responseTime: endTime - startTime,
          contentLength: testResult.text?.length || 0
        });

        log(`    ✅ Success in ${formatTime(endTime - startTime)}`, 'green');

        if (!result.finalProvider) {
          result.finalProvider = providerName;
          result.success = true;
        }

      } catch (error) {
        result.attempts.push({
          provider: providerName,
          status: 'failed',
          error: error.message,
          errorType: categorizeError(error)
        });

        log(`    ❌ Failed: ${error.message}`, 'red');
      }
    }

    return result;

  } catch (error) {
    log(`❌ Fallback test failed: ${error.message}`, 'red');
    result.error = error.message;
    return result;
  }
}

// Performance benchmark testing
async function runPerformanceBenchmark() {
  log(`\n⚡ Performance Benchmark Suite`, 'magenta');
  log('=' + '='.repeat(60), 'magenta');

  const testPrompt = TEST_CONFIG.prompts.standard;
  const results = {
    timestamp: new Date().toISOString(),
    testPrompt: testPrompt.substring(0, 50) + '...',
    providers: {},
    summary: {}
  };

  for (const providerName of TEST_CONFIG.providers) {
    if (specificProvider && specificProvider !== providerName) {
      continue;
    }

    log(`\n🏃 Benchmarking ${providerName}...`, 'blue');

    try {
      const iterations = 3;
      const providerResults = [];

      for (let i = 1; i <= iterations; i++) {
        log(`  📊 Run ${i}/${iterations}`, 'gray');

        try {
          const startTime = Date.now();
          const provider = await createAIProvider(providerName);
          const initTime = Date.now() - startTime;

          const genStartTime = Date.now();
          const result = await provider.generateText({
            prompt: testPrompt,
            maxTokens: 100,
            temperature: 0.7
          });
          const genTime = Date.now() - genStartTime;

          providerResults.push({
            run: i,
            initTime,
            generationTime: genTime,
            totalTime: initTime + genTime,
            contentLength: result.text?.length || 0,
            usage: result.usage || {}
          });

          log(`    ⏱️  ${formatTime(genTime)} (init: ${formatTime(initTime)})`, 'blue');

        } catch (error) {
          providerResults.push({
            run: i,
            error: error.message,
            errorType: categorizeError(error)
          });
          log(`    ❌ Run ${i} failed: ${error.message}`, 'red');
        }
      }

      // Calculate statistics
      const successfulRuns = providerResults.filter(r => !r.error);
      if (successfulRuns.length > 0) {
        const avgGenTime = successfulRuns.reduce((sum, r) => sum + r.generationTime, 0) / successfulRuns.length;
        const minGenTime = Math.min(...successfulRuns.map(r => r.generationTime));
        const maxGenTime = Math.max(...successfulRuns.map(r => r.generationTime));

        results.providers[providerName] = {
          successful: successfulRuns.length,
          failed: providerResults.length - successfulRuns.length,
          averageTime: Math.round(avgGenTime),
          minTime: minGenTime,
          maxTime: maxGenTime,
          runs: providerResults
        };

        log(`  📈 Average: ${formatTime(avgGenTime)}, Range: ${formatTime(minGenTime)}-${formatTime(maxGenTime)}`, 'green');
      } else {
        results.providers[providerName] = {
          successful: 0,
          failed: providerResults.length,
          error: 'All runs failed',
          runs: providerResults
        };
        log(`  ❌ All runs failed`, 'red');
      }

    } catch (error) {
      results.providers[providerName] = {
        error: error.message,
        errorType: categorizeError(error)
      };
      log(`  ❌ Benchmark failed: ${error.message}`, 'red');
    }
  }

  // Generate summary
  const successfulProviders = Object.entries(results.providers)
    .filter(([_, data]) => data.successful > 0)
    .sort(([_, a], [__, b]) => a.averageTime - b.averageTime);

  if (successfulProviders.length > 0) {
    log(`\n🏆 Performance Rankings:`, 'green');
    successfulProviders.forEach(([provider, data], index) => {
      log(`  ${index + 1}. ${provider}: ${formatTime(data.averageTime)} avg (${data.successful}/${data.successful + data.failed} successful)`, 'white');
    });

    results.summary = {
      fastest: successfulProviders[0][0],
      fastestTime: successfulProviders[0][1].averageTime,
      totalTested: Object.keys(results.providers).length,
      successfulProviders: successfulProviders.length
    };
  }

  return results;
}

// Web interface testing
async function testWebInterface() {
  log(`\n🌐 Testing Web Interface Endpoints`, 'magenta');
  log('=' + '='.repeat(60), 'magenta');

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  const results = {
    baseUrl,
    endpoints: {},
    serverRunning: false
  };

  try {
    // Test if server is running
    const response = await fetch(`${baseUrl}/api/status`);
    results.serverRunning = response.ok;

    if (results.serverRunning) {
      log(`✅ Server running at ${baseUrl}`, 'green');

      // Test status endpoint
      const statusData = await response.json();
      results.endpoints.status = {
        success: true,
        data: statusData,
        providersCount: Object.keys(statusData.providers || {}).length
      };

      log(`✅ Status endpoint: ${Object.keys(statusData.providers || {}).length} providers detected`, 'green');

    } else {
      log(`❌ Server not running at ${baseUrl}`, 'red');
      log(`💡 Start server with: npm start`, 'blue');
    }

  } catch (error) {
    results.endpoints.status = {
      success: false,
      error: error.message
    };
    log(`❌ Web interface test failed: ${error.message}`, 'red');
  }

  return results;
}

// Main test orchestrator
async function runTests() {
  const startTime = Date.now();

  log('🧠 NeuroLink Comprehensive Test Suite', 'bright');
  log(`🚀 Test Type: ${testType.toUpperCase()}`, 'bright');
  if (specificProvider) log(`🎯 Provider: ${specificProvider.toUpperCase()}`, 'bright');
  if (promptType !== 'standard') log(`📝 Prompt Type: ${promptType.toUpperCase()}`, 'bright');
  log('');

  const results = {
    testSuite: 'NeuroLink Comprehensive Tests',
    timestamp: new Date().toISOString(),
    testType,
    specificProvider,
    promptType,
    results: {}
  };

  try {
    // Configuration tests
    if (testType === 'all' || testType === 'config') {
      results.results.configuration = checkEnvironmentConfiguration();
    }

    // Provider initialization tests
    if (testType === 'all' || testType === 'config') {
      results.results.initialization = {};
      for (const provider of TEST_CONFIG.providers) {
        if (!specificProvider || specificProvider === provider) {
          results.results.initialization[provider] = await testProviderInitialization(provider);
        }
      }
    }

    // API integration tests
    if (testType === 'all' || testType === 'api') {
      results.results.apiIntegration = {};
      for (const provider of TEST_CONFIG.providers) {
        if (!specificProvider || specificProvider === provider) {
          results.results.apiIntegration[provider] = await testProviderAPI(provider, promptType);
        }
      }
    }

    // Fallback mechanism tests
    if (testType === 'all' || testType === 'fallback') {
      results.results.fallback = await testFallbackMechanism();
    }

    // Performance benchmark tests
    if (testType === 'all' || testType === 'performance') {
      results.results.performance = await runPerformanceBenchmark();
    }

    // Web interface tests
    if (testType === 'all' || testType === 'web') {
      results.results.webInterface = await testWebInterface();
    }

    // Test summary
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    log(`\n📊 Test Suite Summary`, 'bright');
    log('=' + '='.repeat(60), 'bright');
    log(`⏱️  Total execution time: ${formatTime(totalTime)}`, 'blue');
    log(`🧪 Test type: ${testType}`, 'blue');

    if (results.results.configuration) {
      const configuredProviders = Object.values(results.results.configuration)
        .filter(p => p.configured).length;
      log(`🔧 Configured providers: ${configuredProviders}/${Object.keys(results.results.configuration).length}`, 'blue');
    }

    if (results.results.apiIntegration) {
      const workingAPIs = Object.values(results.results.apiIntegration)
        .filter(p => p.tests?.textGeneration?.success).length;
      log(`🚀 Working APIs: ${workingAPIs}/${Object.keys(results.results.apiIntegration).length}`, 'blue');
    }

    if (results.results.fallback) {
      log(`🔄 Fallback mechanism: ${results.results.fallback.success ? '✅ Working' : '❌ Failed'}`,
          results.results.fallback.success ? 'green' : 'red');
    }

    if (results.results.performance) {
      const benchmarkedProviders = Object.keys(results.results.performance.providers).length;
      log(`⚡ Performance benchmark: ${benchmarkedProviders} providers tested`, 'blue');
    }

    // Save detailed results
    await saveTestResults(results);

    log(`\n💾 Detailed results saved to: test-results-${Date.now()}.json`, 'gray');
    log(`🎉 Test suite completed successfully!`, 'green');

  } catch (error) {
    log(`\n💥 Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

async function saveTestResults(results) {
  try {
    const fs = await import('fs');
    const filename = `test-results-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  } catch (error) {
    log(`⚠️  Could not save results: ${error.message}`, 'yellow');
  }
}

// Run the test suite
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
