# CLI Examples

Practical examples and usage patterns for the NeuroLink CLI.

## 🚀 Quick Start Examples

### Basic Text Generation

```bash
# Simple generation
npx @juspay/neurolink gen "Write a Python function to reverse a string"

# With specific provider
npx @juspay/neurolink gen "Explain quantum computing" --provider google-ai

# Creative writing with high temperature
npx @juspay/neurolink gen "Write a short poem about AI" --temperature 0.9
```

### Provider Testing

```bash
# Check all providers
npx @juspay/neurolink status

# Test specific provider
npx @juspay/neurolink gen "Hello" --provider openai

# Find best available provider
npx @juspay/neurolink get-best-provider
```

## 🔧 Development Workflows

### Code Generation

```bash
# Generate TypeScript interfaces
npx @juspay/neurolink gen "
Create TypeScript interfaces for:
- User profile with id, name, email
- API response with data, status, message
"

# Generate test cases
npx @juspay/neurolink gen "
Write Jest test cases for a function that calculates compound interest.
Include edge cases and error handling.
" --provider anthropic
```

### Documentation Generation

```bash
# Generate API documentation
npx @juspay/neurolink gen "
Create API documentation for a REST endpoint that:
- Accepts POST requests to /api/users
- Creates new user accounts
- Returns user ID and status
" --max-tokens 1000

# Generate README sections
npx @juspay/neurolink gen "
Write a 'Getting Started' section for a Node.js CLI tool
that processes CSV files. Include installation and basic usage.
"
```

## 📊 Business Use Cases

### Content Creation

```bash
# Marketing copy
npx @juspay/neurolink gen "
Write compelling product description for an AI development platform
that supports multiple providers and has built-in tools.
" --temperature 0.8

# Email templates
npx @juspay/neurolink gen "
Create a professional email template for announcing
new API features to enterprise customers.
"

# Social media content
npx @juspay/neurolink gen "
Write 3 Twitter posts about AI automation benefits
for software development teams. Keep under 280 characters each.
"
```

### Business Analysis

```bash
# Market research
npx @juspay/neurolink gen "
Analyze the current trends in AI development tools.
Focus on developer experience and enterprise adoption.
" --provider anthropic --max-tokens 1500

# Competitive analysis
npx @juspay/neurolink gen "
Compare the advantages of multi-provider AI platforms
versus single-provider solutions for enterprise use.
"
```

## 🔄 Batch Processing

### Content Pipeline

```bash
# Create prompts file
cat > content-prompts.txt << EOF
Write a blog post title about AI automation
Create a product announcement for new features
Draft a technical overview of our platform
Generate FAQ answers about pricing
EOF

# Process all prompts
npx @juspay/neurolink batch content-prompts.txt \
  --output results.json \
  --delay 2000

# Extract content
jq -r '.[].response' results.json
```

### Code Review Automation

```bash
# Create review prompts
cat > review-prompts.txt << EOF
Review this TypeScript code for best practices and potential issues
Suggest improvements for error handling and performance
Check for security vulnerabilities in API endpoints
Analyze code maintainability and documentation needs
EOF

# Run reviews with different providers
npx @juspay/neurolink batch review-prompts.txt \
  --provider anthropic \
  --output code-reviews.json \
  --delay 3000
```

## 🎯 Advanced Features

### Analytics and Evaluation

```bash
# Enable analytics tracking
npx @juspay/neurolink gen "Explain machine learning concepts" \
  --enable-analytics \
  --debug

# Quality evaluation
npx @juspay/neurolink gen "Write production-ready Python code" \
  --enable-evaluation \
  --evaluation-domain "Senior Software Engineer"

# Combined analytics and evaluation
npx @juspay/neurolink gen "Design system architecture" \
  --enable-analytics \
  --enable-evaluation \
  --evaluation-domain "Solutions Architect" \
  --debug
```

### Custom Context

```bash
# User session context
npx @juspay/neurolink gen "Help with API design" \
  --enable-analytics \
  --context '{"userId":"dev123","project":"ecommerce","role":"backend"}' \
  --debug

# Business context
npx @juspay/neurolink gen "Create project timeline" \
  --context '{"company":"TechCorp","department":"engineering","quarter":"Q1"}' \
  --enable-evaluation \
  --evaluation-domain "Project Manager"
```

## 🔍 Debugging and Monitoring

### Provider Diagnostics

```bash
# Verbose status check
npx @juspay/neurolink status --verbose

# Debug generation
npx @juspay/neurolink gen "Test prompt" --debug

# Check configuration
npx @juspay/neurolink config show

# Validate setup
npx @juspay/neurolink doctor
```

### Performance Testing

```bash
# Test response times
time npx @juspay/neurolink gen "Quick test" --provider openai
time npx @juspay/neurolink gen "Quick test" --provider google-ai

# Batch performance test
npx @juspay/neurolink test --performance --iterations 5

# Provider comparison
for provider in openai google-ai anthropic; do
  echo "Testing $provider:"
  time npx @juspay/neurolink gen "Hello world" --provider $provider
done
```

## 🔧 Integration Examples

### Shell Scripts

```bash
#!/bin/bash
# AI-powered git commit messages

diff=$(git diff --cached --name-only)
if [ -z "$diff" ]; then
  echo "No staged changes"
  exit 1
fi

commit_msg=$(npx @juspay/neurolink gen \
  "Generate concise git commit message for: $diff" \
  --max-tokens 50 \
  --temperature 0.3)

echo "Suggested: $commit_msg"
read -p "Use this message? (y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git commit -m "$commit_msg"
fi
```

### Package.json Scripts

```json
{
  "scripts": {
    "ai:help": "npx @juspay/neurolink gen 'Explain this project structure' --context '{\"project\":\"web-app\"}'",
    "ai:docs": "npx @juspay/neurolink gen 'Generate API documentation' > docs/api.md",
    "ai:test": "npx @juspay/neurolink status",
    "ai:review": "npx @juspay/neurolink gen 'Review this codebase for improvements' --provider anthropic"
  }
}
```

### GitHub Actions

```yaml
name: AI Documentation
on: [push]
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate docs
        run: |
          npx @juspay/neurolink gen "Create changelog for latest changes" > CHANGELOG.md
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - name: Commit docs
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add CHANGELOG.md
          git commit -m "Update AI-generated changelog" || exit 0
          git push
```

## 🌐 Production Workflows

### Content Management

```bash
# Daily content generation
#!/bin/bash
DATE=$(date +"%Y-%m-%d")

# Generate daily summary
npx @juspay/neurolink gen "
Create a daily engineering summary for $DATE.
Include: progress updates, blockers, next steps.
" --enable-analytics > reports/daily-$DATE.md

# Generate team updates
npx @juspay/neurolink gen "
Write team update email template for weekly standup.
Include sections for achievements, challenges, goals.
" > templates/weekly-update.md
```

### Code Review Pipeline

```bash
#!/bin/bash
# AI-assisted code review

# Get changed files
files=$(git diff --name-only HEAD~1)

# Review each file
for file in $files; do
  if [[ $file == *.ts ]] || [[ $file == *.js ]]; then
    echo "Reviewing $file..."
    npx @juspay/neurolink gen "
    Review this code for:
    - Best practices
    - Security issues
    - Performance optimizations
    - Maintainability

    File: $file
    " --enable-evaluation \
      --evaluation-domain "Senior Code Reviewer" \
      > reviews/review-$(basename $file).md
  fi
done
```

### Monitoring and Alerts

```bash
#!/bin/bash
# Provider health monitoring

status=$(npx @juspay/neurolink status --json)
working=$(echo $status | jq '[.[] | select(.status == "working")] | length')
total=$(echo $status | jq 'length')

if [ $working -lt $total ]; then
  # Generate alert message
  alert=$(npx @juspay/neurolink gen "
  Create alert message: $working out of $total AI providers are working.
  Include impact assessment and recommended actions.
  " --max-tokens 200)

  # Send to monitoring system
  curl -X POST webhook-url -d "message=$alert"
fi
```

## 📈 Performance Optimization

### Provider Selection

```bash
# Find fastest provider
fastest=$(npx @juspay/neurolink get-best-provider --criteria speed)
echo "Using fastest provider: $fastest"

# Cost optimization
cheapest=$(npx @juspay/neurolink models best --use-case cheapest)
npx @juspay/neurolink gen "Budget-conscious prompt" --provider $cheapest

# Quality optimization
npx @juspay/neurolink gen "High-quality analysis needed" \
  --provider anthropic \
  --enable-evaluation \
  --evaluation-domain "Expert Analyst"
```

### Batch Optimization

```bash
# Parallel processing with GNU parallel
cat prompts.txt | parallel -j 4 npx @juspay/neurolink gen {} \
  --provider openai \
  --max-tokens 500 \
  > results.txt

# Rate-limited processing
npx @juspay/neurolink batch prompts.txt \
  --delay 5000 \
  --provider google-ai \
  --output batch-results.json
```

## 🚨 Error Handling

### Robust Scripts

```bash
#!/bin/bash
# Error-resistant AI generation

generate_with_fallback() {
  local prompt="$1"
  local providers=("openai" "google-ai" "anthropic")

  for provider in "${providers[@]}"; do
    echo "Trying $provider..."
    if result=$(npx @juspay/neurolink gen "$prompt" --provider $provider 2>/dev/null); then
      echo "Success with $provider"
      echo "$result"
      return 0
    else
      echo "Failed with $provider, trying next..."
    fi
  done

  echo "All providers failed"
  return 1
}

# Usage
generate_with_fallback "Write a summary of AI trends"
```

### Timeout Handling

```bash
# Long-running generation with timeout
timeout 120s npx @juspay/neurolink gen "
Generate comprehensive technical documentation for our API.
Include: authentication, endpoints, examples, error codes.
" --max-tokens 3000 || echo "Generation timed out"

# Streaming with timeout
timeout 60s npx @juspay/neurolink stream "
Tell a long story about AI development
" --provider openai || echo "Stream timed out"
```

## 📚 Learning and Experimentation

### A/B Testing

```bash
# Compare provider outputs
prompt="Explain microservices architecture"

echo "=== OpenAI ==="
npx @juspay/neurolink gen "$prompt" --provider openai

echo "=== Google AI ==="
npx @juspay/neurolink gen "$prompt" --provider google-ai

echo "=== Anthropic ==="
npx @juspay/neurolink gen "$prompt" --provider anthropic
```

### Temperature Experiments

```bash
# Creative temperature range
prompt="Write a creative product name for AI tools"

for temp in 0.3 0.7 0.9; do
  echo "=== Temperature: $temp ==="
  npx @juspay/neurolink gen "$prompt" --temperature $temp
  echo
done
```

### Token Limit Testing

```bash
# Test different response lengths
prompt="Explain React hooks"

for tokens in 100 500 1000; do
  echo "=== $tokens tokens ==="
  npx @juspay/neurolink gen "$prompt" --max-tokens $tokens
  echo
done
```

## 🔗 Related Resources

- [CLI Commands Reference](commands.md) - Complete command documentation
- [Advanced Usage](advanced.md) - Power user features
- [Installation Guide](../getting-started/installation.md) - Setup instructions
- [Environment Variables](../getting-started/environment-variables.md) - Configuration
- [Troubleshooting](../reference/troubleshooting.md) - Common issues
