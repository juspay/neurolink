# Performance Optimization Guide for NeuroLink CLI with Domain Features

This guide provides comprehensive strategies for optimizing performance when using NeuroLink CLI with domain-specific features and factory pattern infrastructure.

## Table of Contents

- [Overview](#overview)
- [Performance Benchmarks](#performance-benchmarks)
- [CLI Startup Optimization](#cli-startup-optimization)
- [Domain Configuration Performance](#domain-configuration-performance)
- [Memory Usage Optimization](#memory-usage-optimization)
- [Generation Speed Optimization](#generation-speed-optimization)
- [Streaming Performance](#streaming-performance)
- [Provider Selection Strategy](#provider-selection-strategy)
- [Context Data Optimization](#context-data-optimization)
- [Caching and Configuration](#caching-and-configuration)
- [Monitoring and Profiling](#monitoring-and-profiling)
- [Troubleshooting](#troubleshooting)

## Overview

The NeuroLink CLI with Phase 1 Factory Infrastructure introduces domain-specific features that enhance functionality while maintaining performance. This guide helps you optimize performance across different use cases and configurations.

### Performance Goals

- **CLI Startup**: <5 seconds for base commands, <6 seconds with domain features
- **Memory Usage**: <200MB base, <250MB with domain configurations
- **Generation Speed**: <3 seconds for dry-run, <4 seconds with domain features
- **Streaming Responsiveness**: <2 seconds to start, <8 seconds to complete

## Performance Benchmarks

### Baseline Performance Measurements

```bash
# Measure CLI startup time
time neurolink --help

# Measure basic generation speed
time neurolink generate "Test prompt" --dryRun --format json

# Measure streaming responsiveness
time neurolink stream "Test prompt" --dryRun

# Measure memory usage (requires monitoring tools)
neurolink generate "Long analysis prompt" --format json --dryRun &
ps -o pid,rss,vsz,command -p $!
```

### Domain Feature Performance Impact

```bash
# Compare baseline vs domain features
time neurolink generate "Test" --dryRun
time neurolink generate "Test" --evaluationDomain healthcare --enable-evaluation --dryRun

# Memory comparison
neurolink generate "Memory test" --dryRun &
ps -o rss -p $! | tail -1  # Baseline memory

neurolink generate "Memory test" --evaluationDomain analytics --enable-evaluation --enable-analytics --dryRun &
ps -o rss -p $! | tail -1  # Domain feature memory
```

## CLI Startup Optimization

### Fast Startup Strategies

1. **Use Specific Commands**

   ```bash
   # Faster - direct command
   neurolink generate "prompt" --dryRun

   # Slower - with help lookup
   neurolink help generate
   ```

2. **Optimize Environment**

   ```bash
   # Pre-configure providers to avoid runtime detection
   export GOOGLE_AI_API_KEY="your-key"
   export OPENAI_API_KEY="your-key"

   # Use specific provider to skip auto-detection
   neurolink generate "prompt" --provider google-ai --dryRun
   ```

3. **Configuration Caching**

   ```bash
   # Initialize configuration once
   neurolink config init

   # Configuration validation (cached after first run)
   neurolink config validate
   ```

### Startup Performance Monitoring

```bash
# Profile CLI startup with detailed timing
NODE_OPTIONS="--prof" neurolink generate "test" --dryRun
node --prof-process isolate-*.log > startup-profile.txt

# Monitor system calls during startup
strace -c neurolink --version 2>&1 | grep -E "(calls|syscall)"
```

## Domain Configuration Performance

### Efficient Domain Usage

1. **Choose Appropriate Domain**

   ```bash
   # Use specific domain for better performance
   neurolink generate "healthcare query" --evaluationDomain healthcare  # Optimized
   neurolink generate "healthcare query" --evaluationDomain analytics   # Less optimized
   ```

2. **Selective Feature Enablement**

   ```bash
   # Enable only needed features
   neurolink generate "prompt" --evaluationDomain healthcare --enable-evaluation  # Evaluation only
   neurolink generate "prompt" --evaluationDomain healthcare --enable-analytics   # Analytics only
   neurolink generate "prompt" --evaluationDomain healthcare --enable-evaluation --enable-analytics  # Both (higher overhead)
   ```

3. **Configuration Defaults**
   ```bash
   # Set defaults to avoid runtime overhead
   neurolink config init
   # Configure default domain and features during setup
   ```

### Domain-Specific Optimizations

#### Healthcare Domain

```bash
# Optimized healthcare usage
neurolink generate "medical query" \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --max-tokens 800 \
  --provider anthropic \
  --format json
```

#### Analytics Domain

```bash
# Optimized analytics usage
neurolink generate "data analysis query" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --max-tokens 1200 \
  --provider google-ai \
  --format json
```

#### Finance Domain

```bash
# Optimized finance usage
neurolink generate "financial analysis" \
  --evaluationDomain finance \
  --enable-evaluation \
  --max-tokens 1000 \
  --provider openai \
  --format json
```

## Memory Usage Optimization

### Memory-Efficient Practices

1. **Context Size Management**

   ```bash
   # Efficient - minimal context
   neurolink generate "prompt" \
     --context '{"key":"value"}' \
     --evaluationDomain analytics

   # Inefficient - large context
   neurolink generate "prompt" \
     --context '{"massive":{"nested":{"object":"with-lots-of-data"}}}' \
     --evaluationDomain analytics
   ```

2. **Token Limit Optimization**

   ```bash
   # Set appropriate token limits
   neurolink generate "short query" --max-tokens 200 --dryRun
   neurolink generate "complex analysis" --max-tokens 2000 --dryRun
   ```

3. **Sequential Processing**
   ```bash
   # Process in sequence rather than parallel for memory efficiency
   neurolink generate "query1" --evaluationDomain healthcare --dryRun
   neurolink generate "query2" --evaluationDomain analytics --dryRun
   ```

### Memory Monitoring

```bash
# Monitor memory usage during operation
watch -n 1 'ps aux | grep neurolink | grep -v grep'

# Memory profiling with detailed breakdown
valgrind --tool=massif neurolink generate "test" --dryRun

# System memory monitoring
top -p $(pgrep -f neurolink)
```

## Generation Speed Optimization

### Speed Optimization Strategies

1. **Provider Selection for Speed**

   ```bash
   # Fast providers for quick responses
   neurolink generate "prompt" --provider google-ai --max-tokens 500

   # Quality vs speed tradeoff
   neurolink generate "prompt" --provider anthropic --max-tokens 1000  # Higher quality, slower
   neurolink generate "prompt" --provider google-ai --max-tokens 800   # Faster response
   ```

2. **Optimal Token Limits**

   ```bash
   # Right-size token limits for your use case
   neurolink generate "brief summary" --max-tokens 200      # Fast
   neurolink generate "detailed analysis" --max-tokens 1500  # Comprehensive
   ```

3. **Format Selection Impact**

   ```bash
   # Text format (fastest)
   neurolink generate "prompt" --format text

   # JSON format (slight overhead for parsing)
   neurolink generate "prompt" --format json

   # Table format (most processing overhead)
   neurolink generate "prompt" --format table
   ```

### Generation Performance Monitoring

```bash
# Time different configurations
hyperfine 'neurolink generate "test" --dryRun' \
          'neurolink generate "test" --evaluationDomain healthcare --dryRun' \
          'neurolink generate "test" --evaluationDomain analytics --enable-analytics --dryRun'

# Profile generation performance
time neurolink generate "performance test prompt" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --format json \
  --max-tokens 1000
```

## Streaming Performance

### Streaming Optimization

1. **Efficient Streaming Setup**

   ```bash
   # Optimized streaming command
   neurolink stream "streaming prompt" \
     --evaluationDomain analytics \
     --enable-evaluation \
     --provider google-ai
   ```

2. **Streaming vs Generation Trade-offs**

   ```bash
   # Use streaming for real-time feedback
   neurolink stream "long analysis" --evaluationDomain healthcare

   # Use generation for batch processing
   neurolink generate "batch analysis" --evaluationDomain healthcare --format json
   ```

3. **Streaming Performance Monitoring**

   ```bash
   # Monitor streaming latency
   time neurolink stream "test prompt" --dryRun

   # Monitor streaming throughput
   neurolink stream "long content generation" --dryRun | wc -c
   ```

### Streaming Best Practices

```bash
# Optimal streaming configuration
neurolink stream "complex analysis requiring real-time feedback" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --provider google-ai \
  --max-tokens 1500
```

## Provider Selection Strategy

### Performance-Based Provider Selection

1. **Speed-Optimized Providers**

   ```bash
   # Fastest response times (typically)
   neurolink generate "prompt" --provider google-ai

   # Good balance of speed and quality
   neurolink generate "prompt" --provider openai

   # Higher quality, potentially slower
   neurolink generate "prompt" --provider anthropic
   ```

2. **Domain-Specific Provider Optimization**

   ```bash
   # Healthcare domain - high accuracy priority
   neurolink generate "medical query" --provider anthropic --evaluationDomain healthcare

   # Analytics domain - speed and structured output
   neurolink generate "data analysis" --provider google-ai --evaluationDomain analytics

   # Finance domain - precision and compliance
   neurolink generate "financial analysis" --provider openai --evaluationDomain finance
   ```

3. **Provider Performance Testing**
   ```bash
   # Compare providers for your use case
   for provider in google-ai openai anthropic; do
     echo "Testing $provider:"
     time neurolink generate "test prompt" --provider $provider --evaluationDomain analytics --dryRun
   done
   ```

## Context Data Optimization

### Efficient Context Structures

1. **Optimized Context Design**

   ```bash
   # Efficient - flat structure
   neurolink generate "prompt" \
     --context '{"userId":"123","department":"analytics","priority":"high"}' \
     --evaluationDomain analytics

   # Less efficient - deeply nested
   neurolink generate "prompt" \
     --context '{"user":{"profile":{"details":{"id":"123","dept":{"name":"analytics"}}}}}' \
     --evaluationDomain analytics
   ```

2. **Context Size Guidelines**

   ```bash
   # Small context (<1KB) - optimal performance
   neurolink generate "prompt" --context '{"key":"value","count":5}'

   # Medium context (1-5KB) - good performance
   neurolink generate "prompt" --context '{"data":["item1","item2","item3"],"meta":{"version":"1.0"}}'

   # Large context (>5KB) - potential performance impact
   # Consider breaking into smaller requests or summarizing
   ```

3. **Context Caching Strategies**

   ```bash
   # Reuse context across related queries
   CONTEXT='{"organizationId":"acme","department":"analytics","quarter":"Q3"}'

   neurolink generate "query1" --context "$CONTEXT" --evaluationDomain analytics
   neurolink generate "query2" --context "$CONTEXT" --evaluationDomain analytics
   ```

## Caching and Configuration

### Configuration Optimization

1. **Pre-configure for Performance**

   ```bash
   # Set up optimal defaults
   neurolink config init
   # Choose fast provider as default
   # Set reasonable token limits
   # Configure caching preferences
   ```

2. **Cache Configuration**

   ```bash
   # Enable caching for better performance
   neurolink config show | grep -i cache

   # Configure cache strategy (set during init)
   # memory - fastest access
   # file - persistent across sessions
   # redis - shared across instances
   ```

3. **Provider Configuration Caching**
   ```bash
   # Cache provider settings
   export NEUROLINK_DEFAULT_PROVIDER=google-ai
   export NEUROLINK_DEFAULT_MODEL=gemini-2.5-pro
   export NEUROLINK_DEFAULT_MAX_TOKENS=1000
   ```

### Performance Monitoring Configuration

```bash
# Enable performance analytics
neurolink generate "test" \
  --enable-analytics \
  --evaluationDomain analytics \
  --format json | jq '.analytics'

# Configure detailed logging for performance analysis
neurolink generate "test" --debug --verbose 2>&1 | grep -i "time\|duration\|latency"
```

## Monitoring and Profiling

### Built-in Performance Analytics

```bash
# Enable analytics for performance insights
neurolink generate "performance test" \
  --enable-analytics \
  --evaluationDomain analytics \
  --format json | jq '.analytics.responseTime'

# Monitor evaluation performance
neurolink generate "evaluation test" \
  --enable-evaluation \
  --evaluationDomain healthcare \
  --format json | jq '.evaluation.evaluationTime'
```

### System-Level Monitoring

1. **CPU Usage Monitoring**

   ```bash
   # Monitor CPU usage during generation
   top -p $(pgrep -f neurolink) -b -n 1 | grep neurolink

   # Continuous monitoring
   watch -n 1 'ps -p $(pgrep -f neurolink) -o pid,pcpu,pmem,time,cmd'
   ```

2. **Memory Usage Tracking**

   ```bash
   # Memory usage snapshot
   ps -p $(pgrep -f neurolink) -o pid,rss,vsz,pmem

   # Memory usage over time
   while true; do
     ps -p $(pgrep -f neurolink) -o rss --no-headers
     sleep 1
   done
   ```

3. **Network Performance**

   ```bash
   # Monitor network calls (requires network monitoring tools)
   iftop -i eth0 -P

   # Monitor API response times
   neurolink generate "test" --debug 2>&1 | grep -i "response\|latency"
   ```

### Performance Profiling Tools

```bash
# Node.js profiling for CLI performance
NODE_OPTIONS="--prof" neurolink generate "test" --dryRun
node --prof-process isolate-*.log > performance-profile.txt

# Memory profiling
NODE_OPTIONS="--heapsnapshot-signal=SIGUSR2" neurolink generate "test" --dryRun

# System call tracing
strace -c neurolink generate "test" --dryRun 2>&1 | tail -20
```

## Troubleshooting

### Common Performance Issues

1. **Slow CLI Startup**

   ```bash
   # Check configuration loading time
   time neurolink config validate

   # Verify provider configuration
   neurolink config show | grep -i provider

   # Test with minimal configuration
   neurolink --version  # Should be very fast
   ```

2. **High Memory Usage**

   ```bash
   # Check for memory leaks
   valgrind --leak-check=full neurolink generate "test" --dryRun

   # Monitor memory growth
   watch -n 1 'ps aux | grep neurolink | grep -v grep | awk "{print \$6}"'

   # Reduce context size
   neurolink generate "test" --context '{"minimal":"data"}' --dryRun
   ```

3. **Slow Generation Speed**

   ```bash
   # Test with different providers
   time neurolink generate "test" --provider google-ai --dryRun
   time neurolink generate "test" --provider openai --dryRun
   time neurolink generate "test" --provider anthropic --dryRun

   # Reduce token limits
   neurolink generate "test" --max-tokens 200 --dryRun

   # Disable unnecessary features
   neurolink generate "test" --dryRun  # No domain features
   ```

4. **Streaming Latency Issues**

   ```bash
   # Test streaming vs generation
   time neurolink stream "test" --dryRun
   time neurolink generate "test" --dryRun

   # Check network connectivity
   ping google.com
   curl -I https://api.openai.com/v1/models
   ```

### Performance Debugging Commands

```bash
# Comprehensive performance test
echo "=== CLI Startup Performance ===" && \
time neurolink --version && \
echo "=== Basic Generation Performance ===" && \
time neurolink generate "test" --dryRun && \
echo "=== Domain Feature Performance ===" && \
time neurolink generate "test" --evaluationDomain analytics --enable-evaluation --dryRun && \
echo "=== Streaming Performance ===" && \
time neurolink stream "test" --dryRun

# Memory usage test
echo "=== Memory Usage Test ===" && \
neurolink generate "memory test with domain features" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --format json \
  --dryRun &
PID=$! && \
sleep 2 && \
ps -p $PID -o pid,rss,vsz,pmem && \
wait $PID
```

### Performance Optimization Checklist

- [ ] **Configuration optimized**: Run `neurolink config init` with optimal settings
- [ ] **Provider selected**: Choose appropriate provider for your use case
- [ ] **Token limits set**: Use appropriate `--max-tokens` for your needs
- [ ] **Context minimized**: Keep context data lean and relevant
- [ ] **Features selective**: Only enable needed evaluation/analytics features
- [ ] **Format appropriate**: Choose optimal output format for your workflow
- [ ] **Monitoring enabled**: Use `--enable-analytics` to track performance
- [ ] **Caching configured**: Set up appropriate caching strategy
- [ ] **Environment optimized**: Configure API keys and environment variables
- [ ] **System resources**: Ensure adequate CPU and memory available

## Best Practices Summary

1. **Start Simple**: Begin with basic commands and add features incrementally
2. **Measure First**: Establish baseline performance before optimization
3. **Right-size Resources**: Use appropriate token limits and context sizes
4. **Choose Wisely**: Select providers and domains that match your performance needs
5. **Monitor Continuously**: Use built-in analytics and system monitoring
6. **Cache Effectively**: Configure caching for frequently used operations
7. **Test Regularly**: Perform regular performance testing as you scale usage
8. **Profile When Needed**: Use profiling tools for detailed performance analysis

For additional performance optimization support, see the [CLI Reference](cli/commands.md) and [Configuration Guide](reference/configuration.md).
