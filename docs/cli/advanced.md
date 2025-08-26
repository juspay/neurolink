# Advanced CLI Usage

Power user features, optimization techniques, and advanced workflows for the NeuroLink CLI.

## 🚀 Advanced Generation Techniques

### Multi-Provider Strategies

```bash
# Provider fallback chain
generate_with_fallback() {
  local prompt="$1"
  local providers=("google-ai" "openai" "anthropic")

  for provider in "${providers[@]}"; do
    if result=$(npx @juspay/neurolink gen "$prompt" --provider $provider 2>/dev/null); then
      echo "✅ Success with $provider"
      echo "$result"
      return 0
    fi
  done

  echo "❌ All providers failed"
  return 1
}

# Usage
generate_with_fallback "Complex technical analysis"
```

### Dynamic Provider Selection

```bash
# Select provider based on task type
select_provider_by_task() {
  local task_type="$1"

  case $task_type in
    "code")
      echo "anthropic"  # Best for code analysis
      ;;
    "creative")
      echo "openai"     # Best for creative content
      ;;
    "fast")
      echo "google-ai"  # Fastest responses
      ;;
    *)
      echo "auto"       # Let NeuroLink decide
      ;;
  esac
}

# Usage
provider=$(select_provider_by_task "code")
npx @juspay/neurolink gen "Write a Python class" --provider $provider
```

## 📊 Analytics and Monitoring

### Advanced Analytics Usage

```bash
# Context-aware analytics
npx @juspay/neurolink gen "Design microservices architecture" \
  --enable-analytics \
  --context '{
    "user_id": "dev123",
    "project": "ecommerce-platform",
    "team": "backend",
    "environment": "development",
    "session_id": "sess_456"
  }' \
  --debug

# Business intelligence tracking
npx @juspay/neurolink gen "Create marketing strategy" \
  --enable-analytics \
  --enable-evaluation \
  --evaluation-domain "Marketing Director" \
  --context '{
    "department": "marketing",
    "campaign": "Q1-launch",
    "budget": "high",
    "target_audience": "enterprise"
  }' \
  --debug
```

### Performance Monitoring

```bash
# Provider performance comparison
compare_providers() {
  local prompt="$1"
  local providers=("openai" "google-ai" "anthropic")

  echo "🔍 Comparing provider performance..."
  echo "Prompt: $prompt"
  echo

  for provider in "${providers[@]}"; do
    echo "Testing $provider..."
    start_time=$(date +%s%N)

    result=$(npx @juspay/neurolink gen "$prompt" \
      --provider $provider \
      --enable-analytics \
      --debug 2>/dev/null)

    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))

    echo "✅ $provider: ${duration}ms"
    echo
  done
}

# Usage
compare_providers "Explain quantum computing briefly"
```

### Real-time Monitoring Dashboard

```bash
#!/bin/bash
# provider-dashboard.sh - Real-time provider monitoring

monitor_providers() {
  while true; do
    clear
    echo "🔍 NeuroLink Provider Dashboard"
    echo "==============================="
    date
    echo

    # Check provider status
    status=$(npx @juspay/neurolink status --json 2>/dev/null)

    if [ $? -eq 0 ]; then
      echo "📊 Provider Status:"
      echo "$status" | jq -r '.[] | "  \(.name): \(.status) (\(.responseTime)ms)"'

      # Count working providers
      working=$(echo "$status" | jq '[.[] | select(.status == "working")] | length')
      total=$(echo "$status" | jq 'length')

      echo
      echo "📈 Summary: $working/$total providers working"
    else
      echo "❌ Failed to get provider status"
    fi

    echo
    echo "Press Ctrl+C to exit"
    sleep 30
  done
}

# Run monitoring
monitor_providers
```

## 🔧 Configuration Management

### Advanced Configuration

```bash
# Environment-specific configs
setup_environment() {
  local env="$1"

  case $env in
    "development")
      export NEUROLINK_LOG_LEVEL="debug"
      export NEUROLINK_CACHE_ENABLED="false"
      export NEUROLINK_TIMEOUT="60000"
      ;;
    "staging")
      export NEUROLINK_LOG_LEVEL="info"
      export NEUROLINK_CACHE_ENABLED="true"
      export NEUROLINK_TIMEOUT="30000"
      ;;
    "production")
      export NEUROLINK_LOG_LEVEL="warn"
      export NEUROLINK_CACHE_ENABLED="true"
      export NEUROLINK_TIMEOUT="15000"
      export NEUROLINK_ANALYTICS_ENABLED="true"
      ;;
  esac

  echo "✅ Environment set to: $env"
}

# Usage
setup_environment "production"
npx @juspay/neurolink gen "Production prompt"
```

### Dynamic Configuration

```bash
# Load configuration from external source
load_remote_config() {
  local config_url="$1"

  # Fetch configuration
  config=$(curl -s "$config_url")

  if [ $? -eq 0 ]; then
    # Export environment variables
    echo "$config" | jq -r 'to_entries[] | "export \(.key)=\(.value)"' | source /dev/stdin
    echo "✅ Configuration loaded from $config_url"
  else
    echo "❌ Failed to load configuration"
    return 1
  fi
}

# Usage (example)
# load_remote_config "https://config.company.com/neurolink.json"
```

## 🎯 Specialized Workflows

### Code Analysis Pipeline

```bash
#!/bin/bash
# code-analyzer.sh - Comprehensive code analysis

analyze_codebase() {
  local project_path="$1"
  local output_dir="$2"

  mkdir -p "$output_dir"

  echo "🔍 Analyzing codebase at: $project_path"

  # Find code files
  find "$project_path" -name "*.ts" -o -name "*.js" -o -name "*.py" | while read file; do
    echo "Analyzing: $file"

    # Code review
    npx @juspay/neurolink gen "
    Perform comprehensive code review:
    1. Code quality and best-practice adherence
    2. Security vulnerabilities
    3. Performance optimizations
    4. Maintainability improvements

    File: $(basename $file)
    " --enable-evaluation \
      --evaluation-domain "Senior Software Architect" \
      --context "{\"file\":\"$file\",\"project\":\"$project_path\"}" \
      > "$output_dir/review-$(basename $file).md"

    # Generate tests
    npx @juspay/neurolink gen "
    Generate comprehensive unit tests for this code.
    Include edge cases and error scenarios.

    File: $(basename $file)
    " --provider anthropic \
      > "$output_dir/tests-$(basename $file).md"

    sleep 2  # Rate limiting
  done

  echo "✅ Analysis complete. Results in: $output_dir"
}

# Usage
# analyze_codebase "./src" "./analysis-results"
```

### Documentation Generation Pipeline

```bash
#!/bin/bash
# docs-generator.sh - Automated documentation generation

generate_project_docs() {
  local project_path="$1"
  local docs_dir="$2"

  mkdir -p "$docs_dir"

  echo "📚 Generating documentation for: $project_path"

  # API documentation
  npx @juspay/neurolink gen "
  Generate comprehensive API documentation for this project.
  Include:
  - Endpoint descriptions
  - Request/response examples
  - Authentication methods
  - Error codes and handling

  Project path: $project_path
  " --enable-analytics \
    --context "{\"project\":\"$project_path\",\"type\":\"api-docs\"}" \
    --max-tokens 2000 \
    > "$docs_dir/api-reference.md"

  # User guide
  npx @juspay/neurolink gen "
  Create a comprehensive user guide for this project.
  Include:
  - Getting started
  - Installation instructions
  - Usage examples
  - Troubleshooting

  Project path: $project_path
  " --enable-evaluation \
    --evaluation-domain "Technical Writer" \
    --max-tokens 1500 \
    > "$docs_dir/user-guide.md"

  # Developer guide
  npx @juspay/neurolink gen "
  Write a developer guide for contributing to this project.
  Include:
  - Development setup
  - Architecture overview
  - Coding standards
  - Testing guidelines

  Project path: $project_path
  " --provider anthropic \
    --max-tokens 1500 \
    > "$docs_dir/developer-guide.md"

  echo "✅ Documentation generated in: $docs_dir"
}

# Usage
# generate_project_docs "./my-project" "./docs"
```

## 🔄 Batch Processing Optimization

### Parallel Processing

```bash
# parallel-batch.sh - Optimized batch processing

parallel_generate() {
  local prompts_file="$1"
  local max_jobs="${2:-4}"
  local output_dir="${3:-./results}"

  mkdir -p "$output_dir"

  echo "🚀 Processing prompts in parallel (max jobs: $max_jobs)"

  # Use GNU parallel for concurrent processing
  cat "$prompts_file" | parallel -j "$max_jobs" --line-buffer \
    'echo "Processing: {}" &&
     npx @juspay/neurolink gen "{}" \
       --enable-analytics \
       --json > "'"$output_dir"'/result-{#}.json" &&
     echo "✅ Completed: {}"'

  echo "✅ All prompts processed. Results in: $output_dir"
}

# Usage
# parallel_generate "prompts.txt" 6 "./batch-results"
```

### Smart Rate Limiting

```bash
# rate-limited-batch.sh - Intelligent rate limiting

smart_batch_process() {
  local prompts_file="$1"
  local provider="$2"
  local output_file="${3:-batch-results.json}"

  echo "🎯 Smart batch processing with $provider"

  # Determine optimal delay based on provider
  case $provider in
    "openai")
      delay=3000    # Conservative for OpenAI rate limits
      ;;
    "google-ai")
      delay=1000    # Google AI has generous limits
      ;;
    "anthropic")
      delay=2000    # Moderate delay for Claude
      ;;
    *)
      delay=2000    # Default safe delay
      ;;
  esac

  echo "Using ${delay}ms delay between requests"

  # Process with adaptive delay
  npx @juspay/neurolink batch "$prompts_file" \
    --provider "$provider" \
    --delay "$delay" \
    --output "$output_file" \
    --enable-analytics

  echo "✅ Batch processing complete"
}

# Usage
# smart_batch_process "prompts.txt" "google-ai" "results.json"
```

## 🔐 Security and Compliance

### Secure API Key Management

```bash
# secure-setup.sh - Secure configuration management

setup_secure_environment() {
  local env="$1"

  # Use external secret management
  case $env in
    "aws")
      echo "🔐 Loading secrets from AWS Secrets Manager"
      export OPENAI_API_KEY=$(aws secretsmanager get-secret-value \
        --secret-id openai-api-key \
        --query SecretString --output text)

      export GOOGLE_AI_API_KEY=$(aws secretsmanager get-secret-value \
        --secret-id google-ai-api-key \
        --query SecretString --output text)
      ;;

    "azure")
      echo "🔐 Loading secrets from Azure Key Vault"
      export OPENAI_API_KEY=$(az keyvault secret show \
        --name openai-key --vault-name my-vault \
        --query value -o tsv)
      ;;

    "gcp")
      echo "🔐 Loading secrets from Google Secret Manager"
      export OPENAI_API_KEY=$(gcloud secrets versions access latest \
        --secret="openai-api-key")
      ;;

    *)
      echo "❌ Unknown secret management system: $env"
      return 1
      ;;
  esac

  echo "✅ Secure environment configured"
}

# Usage
# setup_secure_environment "aws"
```

### Audit Logging

```bash
# audit-logger.sh - Comprehensive audit logging

audit_generate() {
  local prompt="$1"
  local provider="$2"
  local user_id="${3:-unknown}"

  # Create audit log entry
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local session_id=$(uuidgen)

  echo "📝 Audit Log Entry:"
  echo "  Timestamp: $timestamp"
  echo "  Session ID: $session_id"
  echo "  User ID: $user_id"
  echo "  Provider: $provider"
  echo "  Prompt length: ${#prompt} characters"

  # Execute with audit context
  result=$(npx @juspay/neurolink gen "$prompt" \
    --provider "$provider" \
    --enable-analytics \
    --context "{
      \"audit\": {
        \"timestamp\": \"$timestamp\",
        \"session_id\": \"$session_id\",
        \"user_id\": \"$user_id\"
      }
    }" \
    --debug)

  # Log the result
  echo "✅ Generation complete - Session: $session_id"
  echo "$result"

  # Store audit record
  echo "{
    \"timestamp\": \"$timestamp\",
    \"session_id\": \"$session_id\",
    \"user_id\": \"$user_id\",
    \"provider\": \"$provider\",
    \"prompt_length\": ${#prompt},
    \"status\": \"success\"
  }" >> audit.log
}

# Usage
# audit_generate "Generate report" "openai" "user123"
```

## 🚀 Performance Optimization

### Caching Strategies

```bash
# cache-manager.sh - Advanced caching for repeated prompts

cached_generate() {
  local prompt="$1"
  local provider="$2"
  local cache_dir="${3:-.neurolink-cache}"

  mkdir -p "$cache_dir"

  # Create cache key
  local cache_key=$(echo -n "$prompt|$provider" | sha256sum | cut -d' ' -f1)
  local cache_file="$cache_dir/$cache_key.json"

  # Check cache
  if [ -f "$cache_file" ] && [ $(($(date +%s) - $(stat -c %Y "$cache_file"))) -lt 3600 ]; then
    echo "💾 Cache hit for prompt"
    cat "$cache_file" | jq -r '.content'
    return 0
  fi

  # Generate and cache
  echo "🔄 Generating and caching..."
  result=$(npx @juspay/neurolink gen "$prompt" \
    --provider "$provider" \
    --json)

  if [ $? -eq 0 ]; then
    echo "$result" > "$cache_file"
    echo "$result" | jq -r '.content'
    echo "✅ Result cached"
  else
    echo "❌ Generation failed"
    return 1
  fi
}

# Usage
# cached_generate "Explain caching" "openai" ".cache"
```

### Connection Pooling

```bash
# connection-pool.sh - Manage provider connections efficiently

manage_provider_pool() {
  local action="$1"

  case $action in
    "warm-up")
      echo "🔥 Warming up provider connections..."

      # Pre-warm connections with simple prompts
      npx @juspay/neurolink gen "Hello" --provider openai &
      npx @juspay/neurolink gen "Hello" --provider google-ai &
      npx @juspay/neurolink gen "Hello" --provider anthropic &

      wait
      echo "✅ Provider pool warmed up"
      ;;

    "health-check")
      echo "🏥 Checking provider health..."
      npx @juspay/neurolink status --verbose
      ;;

    "reset")
      echo "🔄 Resetting provider connections..."
      # Implementation depends on your provider management
      echo "✅ Provider pool reset"
      ;;

    *)
      echo "Usage: manage_provider_pool {warm-up|health-check|reset}"
      ;;
  esac
}

# Usage
# manage_provider_pool "warm-up"
```

## 🔧 Custom Tool Development

### MCP Server Integration

```bash
# mcp-workflow.sh - Custom MCP server integration

setup_custom_mcp() {
  local server_name="$1"
  local server_command="$2"

  echo "🔧 Setting up custom MCP server: $server_name"

  # Add server to configuration
  npx @juspay/neurolink mcp add "$server_name" "$server_command"

  # Test server connectivity
  if npx @juspay/neurolink mcp test "$server_name"; then
    echo "✅ MCP server $server_name is working"

    # List available tools
    echo "🛠️ Available tools:"
    npx @juspay/neurolink mcp list --server "$server_name"
  else
    echo "❌ MCP server $server_name failed to start"
    return 1
  fi
}

# Usage
# setup_custom_mcp "filesystem" "npx @modelcontextprotocol/server-filesystem /"
```

### Tool Chain Automation

```bash
# tool-chain.sh - Automated tool chain execution

execute_tool_chain() {
  local workflow_file="$1"

  echo "⚙️ Executing tool chain workflow: $workflow_file"

  # Read workflow configuration
  if [ ! -f "$workflow_file" ]; then
    echo "❌ Workflow file not found: $workflow_file"
    return 1
  fi

  # Process each step
  jq -c '.steps[]' "$workflow_file" | while read step; do
    local tool=$(echo "$step" | jq -r '.tool')
    local prompt=$(echo "$step" | jq -r '.prompt')
    local params=$(echo "$step" | jq -r '.params // "{}"')

    echo "🔄 Executing step: $tool"

    # Execute tool via NeuroLink
    npx @juspay/neurolink gen "$prompt" \
      --enable-analytics \
      --context "$params" \
      --debug

    echo "✅ Step completed: $tool"
    sleep 1
  done

  echo "✅ Tool chain execution complete"
}

# Example workflow.json:
# {
#   "steps": [
#     {
#       "tool": "analyzer",
#       "prompt": "Analyze the codebase structure",
#       "params": {"path": "./src"}
#     },
#     {
#       "tool": "documenter",
#       "prompt": "Generate API documentation",
#       "params": {"format": "markdown"}
#     }
#   ]
# }

# Usage
# execute_tool_chain "workflow.json"
```

## 📈 Metrics and Reporting

### Advanced Reporting

```bash
# metrics-reporter.sh - Comprehensive metrics reporting

generate_usage_report() {
  local period="${1:-daily}"
  local output_file="${2:-usage-report.md}"

  echo "📊 Generating $period usage report..."

  # Analyze usage patterns
  npx @juspay/neurolink gen "
  Generate a comprehensive usage report based on these analytics:

  Period: $period
  Report type: Executive summary

  Include:
  - Usage trends and patterns
  - Provider performance comparison
  - Cost analysis and optimization recommendations
  - Key insights and recommendations

  Format as professional markdown report.
  " --enable-analytics \
    --evaluation-domain "Data Analyst" \
    --max-tokens 2000 \
    > "$output_file"

  echo "✅ Usage report generated: $output_file"
}

# Usage
# generate_usage_report "weekly" "weekly-report.md"
```

## 🎯 Specialized Use Cases

### CI/CD Integration

```bash
# ci-cd-integration.sh - Advanced CI/CD workflows

run_ai_quality_gate() {
  local commit_hash="$1"
  local threshold="${2:-8}"

  echo "🚦 Running AI quality gate for commit: $commit_hash"

  # Get changed files
  changed_files=$(git diff --name-only HEAD~1)

  # Analyze changes
  quality_score=$(npx @juspay/neurolink gen "
  Analyze these code changes for quality score (1-10):

  Commit: $commit_hash
  Changed files: $changed_files

  Evaluate:
  - Code quality and best-practice compliance
  - Test coverage adequacy
  - Documentation completeness
  - Security considerations

  Respond only with numeric score (1-10).
  " --enable-evaluation \
    --evaluation-domain "Senior Code Reviewer" \
    --max-tokens 10 | grep -o '[0-9]' | head -1)

  echo "📊 Quality score: $quality_score/10"

  if [ "$quality_score" -ge "$threshold" ]; then
    echo "✅ Quality gate passed"
    exit 0
  else
    echo "❌ Quality gate failed (score: $quality_score, threshold: $threshold)"
    exit 1
  fi
}

# Usage in CI pipeline
# run_ai_quality_gate "$GITHUB_SHA" 7
```

### Content Management System

```bash
# cms-integration.sh - AI-powered content management

manage_content() {
  local action="$1"
  local content_type="$2"
  local target="${3:-.}"

  case $action in
    "generate")
      echo "📝 Generating $content_type content..."

      case $content_type in
        "blog-post")
          npx @juspay/neurolink gen "
          Write a professional blog post about AI development tools.
          Include: introduction, key benefits, use cases, conclusion.
          Target audience: Software developers and engineering managers.
          Tone: Professional but approachable.
          Length: 800-1000 words.
          " --enable-evaluation \
            --evaluation-domain "Content Marketing Manager" \
            > "$target/blog-post-$(date +%Y%m%d).md"
          ;;

        "documentation")
          npx @juspay/neurolink gen "
          Create comprehensive API documentation.
          Include: authentication, endpoints, examples, error handling.
          Format: OpenAPI 3.0 specification.
          " --provider anthropic \
            > "$target/api-docs-$(date +%Y%m%d).yaml"
          ;;

        "social-media")
          npx @juspay/neurolink gen "
          Create 5 social media posts about AI automation.
          Platforms: Twitter, LinkedIn.
          Include relevant hashtags.
          Tone: Engaging and informative.
          " > "$target/social-content-$(date +%Y%m%d).txt"
          ;;
      esac
      ;;

    "review")
      echo "🔍 Reviewing existing content..."
      find "$target" -name "*.md" -o -name "*.txt" | while read file; do
        npx @juspay/neurolink gen "
        Review this content for:
        - Clarity and readability
        - Technical accuracy
        - SEO optimization
        - Engagement potential

        Provide specific improvement recommendations.
        " --enable-evaluation \
          --evaluation-domain "Content Editor" \
          > "${file%.md}-review.md"
      done
      ;;
  esac
}

# Usage
# manage_content "generate" "blog-post" "./content"
# manage_content "review" "" "./content"
```

This advanced CLI usage guide provides sophisticated patterns and techniques for power users who want to maximize the capabilities of NeuroLink CLI in production environments.

## 📚 Related Documentation

- [CLI Commands Reference](commands.md) - Complete command documentation
- [CLI Examples](examples.md) - Practical usage examples
- [Environment Variables](../getting-started/environment-variables.md) - Configuration
- [SDK Advanced Features](../sdk/advanced-features.md) - Programmatic equivalents
- [Troubleshooting](../reference/troubleshooting.md) - Common issues
