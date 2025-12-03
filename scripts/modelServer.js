#!/usr/bin/env node

/**
 * Fake Model Configuration Server
 * Simulates a hosted service for dynamic model configurations
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.MODEL_SERVER_PORT || 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Serve static model configuration
app.get('/api/v1/models', (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/models.json');
    const modelConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Add some dynamic data to simulate real-time updates
    modelConfig.serverTime = new Date().toISOString();
    modelConfig.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`📡 Served model config to ${req.ip} - ${modelConfig.requestId}`);

    res.json(modelConfig);
  } catch (error) {
    console.error('❌ Error serving model config:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Provider-specific endpoints
app.get('/api/v1/models/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const configPath = path.join(__dirname, '../config/models.json');
    const modelConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (!modelConfig.models[provider]) {
      return res.status(404).json({
        error: 'Provider not found',
        provider,
        available: Object.keys(modelConfig.models)
      });
    }

    res.json({
      provider,
      models: modelConfig.models[provider],
      defaults: modelConfig.defaults[provider],
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model capability search
app.get('/api/v1/search', (req, res) => {
  try {
    const { capability, maxPrice, provider } = req.query;
    const configPath = path.join(__dirname, '../config/models.json');
    const modelConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const results = [];

    for (const [providerName, models] of Object.entries(modelConfig.models)) {
      if (provider && providerName !== provider) continue;

      for (const [modelName, modelData] of Object.entries(models)) {
        let matches = true;

        if (capability && !modelData.capabilities.includes(capability)) {
          matches = false;
        }

        if (maxPrice && modelData.pricing.input > parseFloat(maxPrice)) {
          matches = false;
        }

        if (matches) {
          results.push({
            provider: providerName,
            model: modelName,
            ...modelData
          });
        }
      }
    }

    // Sort by price (cheapest first)
    results.sort((a, b) => a.pricing.input - b.pricing.input);

    res.json({
      query: { capability, maxPrice, provider },
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Model Configuration Server running on http://localhost:${PORT}`);
  console.log(`📡 Model API: http://localhost:${PORT}/api/v1/models`);
  console.log(`🔍 Search API: http://localhost:${PORT}/api/v1/search?capability=functionCalling`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

export { app };
