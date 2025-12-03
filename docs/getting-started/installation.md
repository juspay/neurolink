# Installation

Complete installation guide for NeuroLink CLI and SDK across different environments.

## 🎯 Choose Your Installation Method

=== "CLI Only"

    **No installation required!** NeuroLink CLI works directly with `npx`:

    ```bash
    # Direct usage (recommended)
    npx @juspay/neurolink generate "Hello, AI"

    # Global installation (optional)
    npm install -g @juspay/neurolink
    neurolink generate "Hello, AI"
    ```

=== "SDK for Projects"

    Install NeuroLink as a dependency in your project:

    ```bash
    # npm
    npm install @juspay/neurolink

    # pnpm
    pnpm add @juspay/neurolink

    # yarn
    yarn add @juspay/neurolink
    ```

=== "Development Setup"

    For contributing or advanced usage:

    ```bash
    git clone https://github.com/juspay/neurolink
    cd neurolink
    pnpm install
    npx husky install       # Setup git hooks for build rule enforcement
    pnpm setup:complete     # Complete automated setup
    pnpm run validate:all   # Validate build rules and quality
    ```

    **Build Rule Enforcement:** All commits automatically validated with pre-commit hooks. See [Contributing Guidelines](../development/contributing.md) for requirements.

## 📋 System Requirements

### Minimum Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **pnpm**: 8.0.0 or higher (recommended)

### Supported Platforms

- **macOS**: 10.15+ (Intel and Apple Silicon)
- **Linux**: Ubuntu 18.04+, CentOS 7+, Debian 9+
- **Windows**: 10+ (WSL recommended for best experience)

### Check Your Environment

```bash
# Check Node.js version
node --version  # Should be 18.0.0+

# Check npm version
npm --version   # Should be 8.0.0+

# Check if TypeScript support is available (optional)
npx tsc --version
```

## 🔧 Environment Setup

### 1. API Keys Configuration

Create a `.env` file in your project root:

```bash
# Create .env file
touch .env

# Add your API keys
echo 'GOOGLE_AI_API_KEY="AIza-your-google-ai-key"' >> .env
echo 'OPENAI_API_KEY="sk-your-openai-key"' >> .env
echo 'ANTHROPIC_API_KEY="sk-ant-your-key"' >> .env
```

### 2. Verify Installation

```bash
# Test CLI installation
npx @juspay/neurolink --version

# Test provider connectivity
npx @juspay/neurolink status

# Test basic generation
npx @juspay/neurolink generate "Hello, world!"
```

### 3. TypeScript Setup (Optional)

For TypeScript projects, NeuroLink includes full type definitions:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true
  }
}
```

```typescript
// test.ts
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
// Full TypeScript IntelliSense available
```

## 🌐 Framework-Specific Setup

### Next.js

```bash
npm install @juspay/neurolink
```

```typescript
// app/api/ai/route.ts
import { NeuroLink } from "@juspay/neurolink";

export async function POST(request: Request) {
  const { prompt } = await request.json();
  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: prompt },
  });

  return Response.json({ content: result.content });
}
```

### SvelteKit

```bash
npm install @juspay/neurolink
```

```typescript
// src/routes/api/ai/+server.ts
import { NeuroLink } from "@juspay/neurolink";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const { prompt } = await request.json();
  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: prompt },
  });

  return new Response(JSON.stringify({ content: result.content }));
};
```

### Express.js

```bash
npm install @juspay/neurolink express
```

```typescript
import express from "express";
import { NeuroLink } from "@juspay/neurolink";

const app = express();
const neurolink = new NeuroLink();

app.post("/api/generate", async (req, res) => {
  const result = await neurolink.generate({
    input: { text: req.body.prompt },
  });

  res.json({ content: result.content });
});

app.listen(3000);
```

## 🐳 Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  neurolink-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - .env:/app/.env
```

## 🔒 Security Considerations

### Environment Variables

```bash
# Never commit API keys to version control
echo ".env" >> .gitignore

# Use environment-specific files
cp .env .env.example
# Remove actual keys from .env.example
```

### Production Deployment

```bash
# Use secure secret management
# AWS: AWS Secrets Manager
# Azure: Azure Key Vault
# Google Cloud: Secret Manager
# Kubernetes: Secrets

# Example with environment variables
export GOOGLE_AI_API_KEY="$(cat /secrets/google-ai-key)"
export OPENAI_API_KEY="$(cat /secrets/openai-key)"
```

## 🔧 Troubleshooting

### Common Issues

**Node.js version error:**

```bash
# Update Node.js to 18+
nvm install 18
nvm use 18
```

**Permission errors on Linux/macOS:**

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**TypeScript errors:**

```bash
# Install type definitions
npm install -D @types/node typescript
```

**Import/export errors:**

```bash
# Ensure package.json has "type": "module"
echo '"type": "module"' >> package.json
```

### Getting Help

1. **Check our [Troubleshooting Guide](../reference/troubleshooting.md)**
2. **Review [FAQ](../reference/faq.md)**
3. **Search [GitHub Issues](https://github.com/juspay/neurolink/issues)**
4. **Create new issue** with:
   - Node.js version (`node --version`)
   - Operating system
   - Error message
   - Steps to reproduce

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] NeuroLink package installed or accessible via npx
- [ ] API keys configured in `.env` file
- [ ] `neurolink status` shows working providers
- [ ] Basic generation command works
- [ ] TypeScript support (if needed)
- [ ] Framework integration (if applicable)

## 🚀 Next Steps

1. **[Quick Start](quick-start.md)** - Test your installation
2. **[Provider Setup](provider-setup.md)** - Configure AI providers
3. **[CLI Commands](../cli/commands.md)** - Learn available commands
4. **[Examples](../examples/basic-usage.md)** - See implementation patterns
