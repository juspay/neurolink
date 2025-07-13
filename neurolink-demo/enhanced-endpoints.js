import { createAIProvider, getBestProvider } from "neurolink";

// Enhanced API endpoints for comprehensive interactive examples

// Business Use Cases
export const businessEndpoints = (app) => {
  // Email Generator
  app.post("/api/business/email", async (req, res) => {
    try {
      const { type, context } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const prompts = {
        marketing: `Write a professional marketing email about: ${context}. Include a compelling subject line, engaging body text, and clear call-to-action.`,
        support: `Write a helpful customer support email response for: ${context}. Be empathetic, solution-focused, and professional.`,
        "follow-up": `Write a polite follow-up email regarding: ${context}. Be courteous, specific about next steps, and include timeline.`,
      };

      const result = await provider.generate({
        prompt: prompts[type] || prompts.marketing,
        maxTokens: 400,
        temperature: 0.7,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Data Analysis
  app.post("/api/business/analyze-data", async (req, res) => {
    try {
      const { data } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Analyze this CSV data and provide insights, trends, and recommendations:

${data}

Please provide:
1. Key insights and patterns
2. Statistical observations
3. Business recommendations
4. Potential areas for improvement`,
        maxTokens: 600,
        temperature: 0.3,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Document Summarizer
  app.post("/api/business/summarize", async (req, res) => {
    try {
      const { text, length } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const prompts = {
        brief: `Summarize this text in 1-2 concise sentences: ${text}`,
        medium: `Provide a comprehensive paragraph summary of this text: ${text}`,
        detailed: `Create a detailed summary with key points, main ideas, and important details: ${text}`,
      };

      const result = await provider.generate({
        prompt: prompts[length] || prompts.medium,
        maxTokens: length === "brief" ? 100 : length === "detailed" ? 400 : 200,
        temperature: 0.4,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// Creative Tools
export const creativeEndpoints = (app) => {
  // Creative Writing
  app.post("/api/creative/writing", async (req, res) => {
    try {
      const { type, prompt } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const systemPrompts = {
        story: `You are a creative writer. Write an engaging short story based on: ${prompt}. Include vivid descriptions, character development, and a compelling narrative arc.`,
        poem: `You are a poet. Create a beautiful, evocative poem inspired by: ${prompt}. Use imagery, rhythm, and emotional depth.`,
        dialogue: `You are a screenwriter. Write realistic, engaging dialogue between characters in this scenario: ${prompt}. Make it natural and character-driven.`,
      };

      const result = await provider.generate({
        prompt: systemPrompts[type] || systemPrompts.story,
        maxTokens: 500,
        temperature: 0.8,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Language Translation
  app.post("/api/creative/translate", async (req, res) => {
    try {
      const { text, language } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Translate the following text to ${language}, maintaining tone and context:

"${text}"

Provide only the translation:`,
        maxTokens: 300,
        temperature: 0.3,
      });

      res.json({
        success: true,
        content: result.text.trim(),
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Content Ideas Generator
  app.post("/api/creative/ideas", async (req, res) => {
    try {
      const { type, topic } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const prompts = {
        blog: `Generate 10 compelling blog post ideas about ${topic}. Include catchy titles and brief descriptions for each.`,
        social: `Create 10 engaging social media post ideas about ${topic}. Include platform-specific suggestions and hashtag recommendations.`,
        video: `Generate 10 video content ideas about ${topic}. Include concept, target audience, and key talking points for each.`,
      };

      const result = await provider.generate({
        prompt: prompts[type] || prompts.blog,
        maxTokens: 500,
        temperature: 0.7,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// Developer Tools
export const developerEndpoints = (app) => {
  // Code Generator
  app.post("/api/developer/code", async (req, res) => {
    try {
      const { language, description } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Generate clean, well-commented ${language} code for: ${description}

Requirements:
- Follow best practices for ${language}
- Include proper error handling
- Add clear comments explaining the logic
- Make it production-ready

Code:`,
        maxTokens: 600,
        temperature: 0.4,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Documentation Generator
  app.post("/api/developer/api-doc", async (req, res) => {
    try {
      const { description } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Create comprehensive API documentation for: ${description}

Include:
- Endpoint descriptions
- Request/response examples
- Parameter definitions
- Error codes and messages
- Authentication requirements
- Usage examples in multiple languages

Documentation:`,
        maxTokens: 800,
        temperature: 0.3,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Debug Helper
  app.post("/api/developer/debug", async (req, res) => {
    try {
      const { error } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Analyze this error and provide debugging help:

${error}

Please provide:
1. Explanation of what the error means
2. Most likely causes
3. Step-by-step debugging approach
4. Code examples of potential fixes
5. Best practices to prevent similar issues

Analysis:`,
        maxTokens: 600,
        temperature: 0.4,
      });

      res.json({
        success: true,
        content: result.text,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// Advanced Features
export const advancedEndpoints = (app, templateCache) => {
  // Template System
  app.post("/api/templates/execute", async (req, res) => {
    try {
      const { templateId, variables } = req.body;
      const template = templateCache.get(templateId);

      if (!template) {
        return res
          .status(404)
          .json({ success: false, error: "Template not found" });
      }

      let prompt = template.template;
      Object.entries(variables).forEach(([key, value]) => {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      const provider = await createAIProvider(await getBestProvider());
      const result = await provider.generate({
        prompt,
        maxTokens: 500,
        temperature: 0.7,
      });

      res.json({
        success: true,
        content: result.text,
        template: template.name,
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Batch Processing
  app.post("/api/batch/process", async (req, res) => {
    try {
      const { operation, items } = req.body;
      const provider = await createAIProvider(await getBestProvider());

      const operations = {
        translate: (item) => `Translate to Spanish: "${item}"`,
        summarize: (item) => `Summarize in one sentence: "${item}"`,
        analyze: (item) =>
          `Analyze sentiment (positive/negative/neutral): "${item}"`,
      };

      const results = [];
      for (const item of items) {
        try {
          const result = await provider.generate({
            prompt: operations[operation](item),
            maxTokens: 100,
            temperature: 0.3,
          });
          results.push({
            input: item,
            output: result.text.trim(),
            success: true,
          });
        } catch (error) {
          results.push({
            input: item,
            error: error.message,
            success: false,
          });
        }
      }

      res.json({
        success: true,
        operation,
        results,
        totalProcessed: results.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// AI Development Workflow Tools (Phase 1.2)
export const aiWorkflowEndpoints = (app) => {
  // Generate Test Cases
  app.post("/api/ai/generate-test-cases", async (req, res) => {
    try {
      const {
        codeSnippet,
        language = "javascript",
        testFramework = "jest",
        coverage = "comprehensive",
        maxTestCases = 5,
      } = req.body;

      if (!codeSnippet) {
        return res
          .status(400)
          .json({ success: false, error: "Code snippet is required" });
      }

      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Generate ${maxTestCases} ${coverage} test cases for this ${language} code using ${testFramework}:

${codeSnippet}

Requirements:
- Include setup and teardown if needed
- Cover happy path, edge cases, and error scenarios
- Use proper ${testFramework} syntax
- Include assertions and mocks where appropriate
- Make tests readable and maintainable

Return the test cases with clear descriptions:`,
        maxTokens: 800,
        temperature: 0.4,
      });

      res.json({
        success: true,
        data: {
          testSuite: {
            language,
            framework: testFramework,
            coverage,
            totalTestCases: maxTestCases,
            testCases: [
              {
                id: "test_1",
                name: "Generated Test Suite",
                description: `${coverage} test cases for ${language} code`,
                testCode: result.text,
                framework: testFramework,
              },
            ],
          },
          generatedAt: new Date().toISOString(),
        },
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Refactor Code
  app.post("/api/ai/refactor-code", async (req, res) => {
    try {
      const {
        codeSnippet,
        language = "javascript",
        refactorGoals = ["readability", "maintainability"],
        complexityLevel = "moderate",
      } = req.body;

      if (!codeSnippet) {
        return res
          .status(400)
          .json({ success: false, error: "Code snippet is required" });
      }

      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Refactor this ${language} code with goals: ${refactorGoals.join(", ")}
Complexity level: ${complexityLevel}

Original code:
${codeSnippet}

Please provide:
1. Refactored code with improvements
2. Explanation of changes made
3. Benefits of the refactoring
4. Best practices applied

Refactoring:`,
        maxTokens: 800,
        temperature: 0.4,
      });

      res.json({
        success: true,
        data: {
          analysis: {
            original: { complexity: complexityLevel },
            language,
            refactorGoals,
          },
          suggestions: [
            {
              type: refactorGoals[0] || "readability",
              description: "Code refactoring suggestions",
              impact: "Improved code quality and maintainability",
            },
          ],
          refactoredCode: result.text,
          refactoredAt: new Date().toISOString(),
        },
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate Documentation
  app.post("/api/ai/generate-documentation", async (req, res) => {
    try {
      const {
        codeSnippet,
        language = "javascript",
        docType = "comprehensive",
        format = "markdown",
      } = req.body;

      if (!codeSnippet) {
        return res
          .status(400)
          .json({ success: false, error: "Code snippet is required" });
      }

      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Generate ${docType} ${format} documentation for this ${language} code:

${codeSnippet}

Include:
- Function/class descriptions
- Parameter documentation
- Return value descriptions
- Usage examples
- Error handling notes

Documentation:`,
        maxTokens: 800,
        temperature: 0.3,
      });

      res.json({
        success: true,
        data: {
          documentation: {
            type: docType,
            format: format,
            language,
            sections: [
              {
                title: "Generated Documentation",
                content: result.text,
                format: format,
              },
            ],
          },
          metrics: {
            totalSections: 1,
            totalWords: result.text.split(" ").length,
          },
          generatedAt: new Date().toISOString(),
        },
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Debug AI Output
  app.post("/api/ai/debug-ai-output", async (req, res) => {
    try {
      const {
        aiOutput,
        originalPrompt,
        analysisDepth = "detailed",
        issueType,
      } = req.body;

      if (!aiOutput || !originalPrompt) {
        return res.status(400).json({
          success: false,
          error: "AI output and original prompt are required",
        });
      }

      const provider = await createAIProvider(await getBestProvider());

      const result = await provider.generate({
        prompt: `Analyze this AI output for quality and suggest improvements:

Original Prompt: "${originalPrompt}"

AI Output: "${aiOutput}"

Analysis depth: ${analysisDepth}
${issueType ? `Focus on: ${issueType} issues` : ""}

Provide:
1. Quality assessment (relevance, completeness, accuracy)
2. Identified issues and problems
3. Suggestions for prompt improvement
4. Troubleshooting steps

Analysis:`,
        maxTokens: 600,
        temperature: 0.3,
      });

      res.json({
        success: true,
        data: {
          analysis: {
            output: {
              length: aiOutput.length,
              wordCount: aiOutput.split(" ").length,
            },
            prompt: {
              length: originalPrompt.length,
              clarity: originalPrompt.includes("?") ? "explicit" : "implicit",
            },
            analysisDepth,
          },
          issues: [
            {
              type: issueType || "general",
              description: "AI output analysis completed",
              suggestion: "Review the detailed analysis below",
            },
          ],
          recommendations: result.text.split("\n").slice(0, 3),
          debuggedAt: new Date().toISOString(),
        },
        usage: result.usage,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

// Analytics and Monitoring
export const analyticsEndpoints = (app, usageStats) => {
  // Usage Analytics
  app.get("/api/analytics", (req, res) => {
    const analytics = {
      totalRequests: usageStats.requests,
      totalTokens: usageStats.totalTokens,
      totalErrors: usageStats.errors,
      providerUsage: usageStats.providers,
      timestamp: new Date().toISOString(),
      averageTokensPerRequest:
        usageStats.requests > 0
          ? Math.round(usageStats.totalTokens / usageStats.requests)
          : 0,
      errorRate:
        usageStats.requests > 0
          ? Math.round((usageStats.errors / usageStats.requests) * 100)
          : 0,
    };

    res.json(analytics);
  });

  // Performance Metrics
  app.get("/api/performance", async (req, res) => {
    try {
      const testPrompt = "Test response time";
      const providers = [
        "openai",
        "bedrock",
        "vertex",
        "google-ai",
        "anthropic",
        "azure",
        "huggingface",
        "ollama",
        "mistral",
      ];
      const metrics = {};

      for (const providerName of providers) {
        try {
          const startTime = Date.now();
          const provider = await createAIProvider(providerName);
          await provider.generate({
            prompt: testPrompt,
            maxTokens: 10,
            temperature: 0.1,
          });
          const endTime = Date.now();

          metrics[providerName] = {
            responseTime: endTime - startTime,
            status: "available",
          };
        } catch (error) {
          metrics[providerName] = {
            status: "unavailable",
            error: error.message,
          };
        }
      }

      res.json({
        timestamp: new Date().toISOString(),
        metrics,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};
