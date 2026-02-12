---
title: NestJS Integration Guide
description: Build enterprise-grade AI applications with NestJS modules, dependency injection, and decorators
keywords: nestjs, nodejs, typescript, enterprise, dependency injection, decorators, modules
---

# NestJS Integration Guide

**Build enterprise-grade AI applications with NestJS and NeuroLink**

---

## Overview

NestJS is a progressive Node.js framework for building efficient, scalable server-side applications. Its architecture with modules, dependency injection, and decorators makes it ideal for enterprise AI applications.

### Key Features

- **📦 Modules**: Organized, scalable application architecture
- **💉 Dependency Injection**: Testable, loosely coupled services
- **🛡️ Guards**: Authentication and authorization patterns
- **🔄 Interceptors**: Cross-cutting concerns like caching and logging
- **📝 Pipes**: Request validation and transformation
- **🚨 Exception Filters**: Centralized error handling

### What You'll Build

- Modular AI service architecture with dependency injection
- RESTful controllers with validation and decorators
- JWT and API key authentication guards
- Rate limiting and response caching interceptors
- Streaming responses with Server-Sent Events
- Production-ready deployment configuration

---

## Quick Start

### 1. Create New NestJS Project

```bash
npm install -g @nestjs/cli
nest new my-ai-service
cd my-ai-service
npm install @juspay/neurolink dotenv class-validator class-transformer @nestjs/config
```

### 2. Configure Environment

```bash
# .env
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
JWT_SECRET=your-super-secret-jwt-key
API_KEY=your-api-key-for-clients
PORT=3000
```

### 3. Generate Module and Controller

```bash
nest generate module neurolink
nest generate service neurolink
nest generate controller ai
```

---

## Module Setup

### NeuroLink Module (Dynamic)

```typescript
// src/neurolink/neurolink.module.ts
import { Module, DynamicModule, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NeuroLinkService } from "./neurolink.service";

@Global()
@Module({})
export class NeuroLinkModule {
  static forRoot(): DynamicModule {
    return {
      module: NeuroLinkModule,
      imports: [ConfigModule],
      providers: [NeuroLinkService],
      exports: [NeuroLinkService],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<any> | any;
    inject?: any[];
  }): DynamicModule {
    return {
      module: NeuroLinkModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [
        {
          provide: "NEUROLINK_OPTIONS",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        NeuroLinkService,
      ],
      exports: [NeuroLinkService],
    };
  }
}
```

### NeuroLink Service (@Injectable)

```typescript
// src/neurolink/neurolink.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NeuroLink } from "@juspay/neurolink";

@Injectable()
export class NeuroLinkService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NeuroLinkService.name);
  private ai: NeuroLink;

  constructor(
    private configService: ConfigService,
    @Optional() @Inject("NEUROLINK_OPTIONS") private options?: any,
  ) {}

  async onModuleInit() {
    this.ai = new NeuroLink({
      providers: this.options?.providers || [
        {
          name: "openai",
          config: { apiKey: this.configService.get("OPENAI_API_KEY") },
        },
        {
          name: "anthropic",
          config: { apiKey: this.configService.get("ANTHROPIC_API_KEY") },
        },
      ],
    });
    this.logger.log("NeuroLink service initialized");
  }

  async onModuleDestroy() {
    await this.ai.cleanup();
    this.logger.log("NeuroLink resources cleaned up");
  }

  async generate(
    prompt: string,
    options?: { provider?: string; model?: string; temperature?: number },
  ) {
    return this.ai.generate({
      input: { text: prompt },
      providerName: options?.provider,
      modelName: options?.model,
      temperature: options?.temperature,
    });
  }

  async generateStream(
    prompt: string,
    options?: { provider?: string; model?: string },
  ) {
    return this.ai.generateStream({
      input: { text: prompt },
      providerName: options?.provider,
      modelName: options?.model,
    });
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: { provider?: string },
  ) {
    return this.ai.generate({
      input: { messages },
      providerName: options?.provider,
    });
  }
}
```

---

## Controller Implementation

### AI Controller with Decorators

```typescript
// src/ai/ai.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { NeuroLinkService } from "../neurolink/neurolink.service";
import { GenerateDto, ChatDto, StreamDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RateLimitInterceptor } from "../common/interceptors/rate-limit.interceptor";

@Controller("api/ai")
@UseGuards(JwtAuthGuard)
@UseInterceptors(RateLimitInterceptor)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly neuroLinkService: NeuroLinkService) {}

  @Post("generate")
  @HttpCode(HttpStatus.OK)
  async generate(@Body() dto: GenerateDto) {
    this.logger.log(`Generate request: ${dto.prompt.substring(0, 50)}...`);
    const result = await this.neuroLinkService.generate(dto.prompt, {
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
    });
    return { success: true, data: { text: result.text, usage: result.usage } };
  }

  @Post("chat")
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto) {
    const result = await this.neuroLinkService.chat(dto.messages, {
      provider: dto.provider,
    });
    return { success: true, data: { text: result.text, usage: result.usage } };
  }

  @Post("stream")
  async stream(@Body() dto: StreamDto, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await this.neuroLinkService.generateStream(dto.prompt, {
        provider: dto.provider,
        model: dto.model,
      });
      for await (const chunk of stream) {
        if (chunk.text)
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
    res.end();
  }

  @Get("health")
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return { status: "healthy", timestamp: new Date().toISOString() };
  }
}
```

---

## DTOs and Validation

### Generate DTO with class-validator

```typescript
// src/ai/dto/generate.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsIn,
} from "class-validator";
import { Transform } from "class-transformer";

export class GenerateDto {
  @IsString()
  @IsNotEmpty({ message: "Prompt is required" })
  @MaxLength(100000)
  @Transform(({ value }) => value?.trim())
  prompt: string;

  @IsOptional()
  @IsString()
  @IsIn(["openai", "anthropic", "google-ai", "mistral", "bedrock"])
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number;
}
```

### Chat DTO with Nested Validation

```typescript
// src/ai/dto/chat.dto.ts
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

class MessageDto {
  @IsString()
  @IsIn(["user", "assistant", "system"])
  role: "user" | "assistant" | "system";

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
```

### Stream DTO

```typescript
// src/ai/dto/stream.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class StreamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  @Transform(({ value }) => value?.trim())
  prompt: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
```

---

## Authentication

### API Key Guard

```typescript
// src/auth/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers["x-api-key"] as string;

    if (!apiKey) throw new UnauthorizedException("API key is required");

    const validApiKey = this.configService.get<string>("API_KEY");
    if (apiKey !== validApiKey)
      throw new UnauthorizedException("Invalid API key");

    return true;
  }
}
```

### JWT Auth Guard with @UseGuards

```typescript
// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import * as jwt from "jsonwebtoken";

export const IS_PUBLIC_KEY = "isPublic";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      const token = authHeader.substring(7);
      const secret = this.configService.get<string>("JWT_SECRET");
      request["user"] = jwt.verify(token, secret);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
```

### Public Decorator

```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../guards/jwt-auth.guard";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

## Rate Limiting

### Custom RateLimitInterceptor

```typescript
// src/common/interceptors/rate-limit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private store = new Map<string, { count: number; resetTime: number }>();
  private readonly limit = 100;
  private readonly windowMs = 60000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const key = request["user"]?.sub || request.ip;
    const now = Date.now();

    let entry = this.store.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + this.windowMs };
    }
    entry.count++;
    this.store.set(key, entry);

    response.setHeader("X-RateLimit-Limit", this.limit);
    response.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, this.limit - entry.count),
    );

    if (entry.count > this.limit) {
      throw new HttpException(
        { message: "Rate limit exceeded" },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return next.handle();
  }
}
```

### Using @nestjs/throttler

```bash
npm install @nestjs/throttler
```

```typescript
// src/app.module.ts
import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 3 },
      { name: "medium", ttl: 10000, limit: 20 },
      { name: "long", ttl: 60000, limit: 100 },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

---

## Response Caching

### CacheInterceptor with @nestjs/cache-manager

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-ioredis-yet
```

```typescript
// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Request } from "express";
import * as crypto from "crypto";

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== "GET" || request.body?.temperature !== 0) {
      return next.handle();
    }

    const cacheKey = this.generateKey(request);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap((response) => {
        if (response && !response.error) {
          this.cacheManager.set(cacheKey, response, 300000);
        }
      }),
    );
  }

  private generateKey(request: Request): string {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ url: request.url, body: request.body }))
      .digest("hex");
    return `ai:cache:${hash}`;
  }
}
```

---

## Streaming Responses

### SSE with @Sse() Decorator

```typescript
// src/ai/ai-stream.controller.ts
import {
  Controller,
  Post,
  Body,
  Sse,
  MessageEvent,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { NeuroLinkService } from "../neurolink/neurolink.service";
import { StreamDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("api/ai")
@UseGuards(JwtAuthGuard)
export class AIStreamController {
  private readonly logger = new Logger(AIStreamController.name);
  constructor(private readonly neuroLinkService: NeuroLinkService) {}

  @Post("stream/sse")
  @Sse()
  streamSSE(@Body() dto: StreamDto): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.processStream(dto, subject).catch((error) => {
      subject.next({ data: { error: error.message }, type: "error" });
      subject.complete();
    });

    return subject.asObservable();
  }

  private async processStream(dto: StreamDto, subject: Subject<MessageEvent>) {
    const stream = await this.neuroLinkService.generateStream(dto.prompt, {
      provider: dto.provider,
      model: dto.model,
    });

    subject.next({ data: { status: "started" }, type: "start" });

    let tokenCount = 0;
    for await (const chunk of stream) {
      if (chunk.text) {
        tokenCount++;
        subject.next({
          data: { text: chunk.text, index: tokenCount },
          type: "token",
        });
      }
    }

    subject.next({
      data: { status: "completed", totalTokens: tokenCount },
      type: "complete",
    });
    subject.complete();
  }
}
```

---

## Exception Filters

### AIExceptionFilter with @Catch()

```typescript
// src/common/filters/ai-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AIExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AIExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message } = this.handleException(exception);

    this.logger.error(
      `${request.method} ${request.url} - ${statusCode}: ${message}`,
      exception.stack,
    );

    response.status(statusCode).json({
      success: false,
      error: { code, message },
      meta: { timestamp: new Date().toISOString(), path: request.url },
    });
  }

  private handleException(exception: Error) {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      return {
        statusCode: status,
        code: this.getErrorCode(status),
        message:
          typeof response === "string" ? response : (response as any).message,
      };
    }

    const message = exception.message?.toLowerCase() || "";
    if (message.includes("rate limit")) {
      return {
        statusCode: 429,
        code: "RATE_LIMIT_ERROR",
        message: "Rate limit exceeded",
      };
    }
    if (message.includes("api key") || message.includes("unauthorized")) {
      return {
        statusCode: 401,
        code: "PROVIDER_AUTH_ERROR",
        message: "Provider authentication failed",
      };
    }

    return {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      429: "RATE_LIMITED",
      500: "INTERNAL_ERROR",
    };
    return codes[status] || "UNKNOWN_ERROR";
  }
}
```

---

## Production Patterns

### Health Check Module

```bash
npm install @nestjs/terminus
```

```typescript
// src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "../auth/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap("memory_heap", 500 * 1024 * 1024),
    ]);
  }

  @Get("live")
  @Public()
  liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

### Graceful Shutdown

```typescript
// src/main.ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AIExceptionFilter } from "./common/filters/ai-exception.filter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AIExceptionFilter());
  app.enableShutdownHooks();
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap();
```

---

## Monitoring and Logging

### nestjs-pino for Structured Logging

```bash
npm install nestjs-pino pino-http pino-pretty
```

```typescript
// src/app.module.ts
import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
        redact: ["req.headers.authorization", "req.headers['x-api-key']"],
      },
    }),
  ],
})
export class AppModule {}
```

### Prometheus with @willsoto/nestjs-prometheus

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

```typescript
// src/common/metrics/metrics.module.ts
import { Module } from "@nestjs/common";
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";

@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: "ai_requests_total",
      help: "Total AI requests",
      labelNames: ["provider", "status"],
    }),
    makeHistogramProvider({
      name: "ai_request_duration_seconds",
      help: "AI request duration",
      labelNames: ["provider"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
```

---

## Best Practices

Follow these best practices when building NestJS AI applications:

- **Use Dependency Injection** - Inject NeuroLinkService instead of creating instances directly. This enables testing and lifecycle management.

- **Implement Lifecycle Hooks** - Use `OnModuleInit` for initialization and `OnModuleDestroy` for cleanup to ensure proper resource management.

- **Validate All Inputs** - Use DTOs with class-validator decorators and apply ValidationPipe globally to catch invalid requests early.

- **Centralize Error Handling** - Use exception filters to handle AI provider errors consistently across all endpoints.

- **Monitor Everything** - Implement Prometheus metrics for requests, latency, and errors. Use structured logging for debugging.

---

## Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s CMD wget --spider http://localhost:3000/health/live || exit 1
CMD ["node", "dist/main.js"]
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY=${API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_HOST=redis
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Production Checklist

```markdown
## Security

- [ ] API keys in environment variables
- [ ] Strong JWT secret
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

## Performance

- [ ] Response caching with Redis
- [ ] Appropriate timeouts
- [ ] Memory limits configured

## Reliability

- [ ] Health checks implemented
- [ ] Graceful shutdown handlers
- [ ] Error handling for all AI providers

## Monitoring

- [ ] Prometheus metrics exposed
- [ ] Structured logging configured
- [ ] Alerting rules defined
```

---

## Related Documentation

- [Express.js Integration Guide](../guides/frameworks/express.md) - Lightweight REST API setup
- [Next.js Integration Guide](../guides/frameworks/nextjs.md) - Full-stack React applications
- [Streaming Guide](../advanced/streaming.md) - SSE and WebSocket streaming
- [API Reference](./api-reference.md) - Complete SDK documentation

---

## Need Help?

- **Documentation**: [https://neurolink.dev/docs](https://neurolink.dev/docs)
- **GitHub Issues**: [https://github.com/juspay/neurolink/issues](https://github.com/juspay/neurolink/issues)
- **Discord Community**: [https://discord.gg/neurolink](https://discord.gg/neurolink)
