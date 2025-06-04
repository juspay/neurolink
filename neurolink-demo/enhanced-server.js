import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createAIProvider, getBestProvider } from '@juspay/neurolink';
import {
  businessEndpoints,
  creativeEndpoints,
  developerEndpoints,
  advancedEndpoints,
  analyticsEndpoints
} from './enhanced-endpoints.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// In-memory storage for demo purposes
const conversationHistory = new Map();
const templateCache = new Map();
const usageStats = {
  requests: 0,
  providers: {},
  errors: 0,
  totalTokens: 0
};

// Initialize predefined templates
templateCache.set('blog-outline', {
  name: 'Blog Post Outline',
  template: 'Create a comprehensive blog post outline about {{topic}} targeting {{audience}}. Include introduction, main points, and conclusion.',
  variables: ['topic', 'audience']
});

templateCache.set('product-description', {
  name: 'Product Description',
  template: 'Write a compelling product description for {{product_name}} that costs {{price}} and is designed for {{target_market}}. Highlight key features: {{features}}.',
  variables: ['product_name', 'price', 'target_market', 'features']
});

templateCache.set('meeting-agenda', {
  name: 'Meeting Agenda',
  template: 'Create a detailed meeting agenda for {{meeting_type}} scheduled for {{duration}} minutes. Topics to cover: {{topics}}. Expected attendees: {{attendees}}.',
  variables: ['meeting_type', 'duration', 'topics', 'attendees']
});

// Helper function to log requests
const logRequest = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  usageStats.requests++;
  next();
};

app.use(logRequest);

// Enhanced demo page with multiple interactive examples
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NeuroLink AI Toolkit - Interactive Examples</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0; padding: 20px; background: #f8f9fa; line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header p { color: #7f8c8d; font-size: 18px; }
        .tabs {
          display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;
          border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;
        }
        .tab {
          padding: 12px 24px; background: white; border: 2px solid #ecf0f1;
          border-radius: 8px; cursor: pointer; transition: all 0.3s;
          font-weight: 500; color: #2c3e50;
        }
        .tab:hover { border-color: #3498db; }
        .tab.active { background: #3498db; color: white; border-color: #3498db; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .card {
          background: white; border-radius: 12px; padding: 24px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #ecf0f1;
        }
        .card h3 { margin-top: 0; color: #2c3e50; display: flex; align-items: center; gap: 10px; }
        .btn {
          background: #3498db; color: white; border: none; padding: 12px 24px;
          border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;
          transition: background 0.3s; margin: 5px 5px 5px 0; display: inline-block;
        }
        .btn:hover { background: #2980b9; }
        .btn.secondary { background: #95a5a6; }
        .btn.secondary:hover { background: #7f8c8d; }
        .form-group { margin: 15px 0; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #2c3e50; }
        textarea, input, select {
          width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 6px;
          font-size: 14px; font-family: inherit; transition: border-color 0.3s;
        }
        textarea:focus, input:focus, select:focus {
          outline: none; border-color: #3498db;
        }
        .output {
          background: #f8f9fa; border: 2px solid #ecf0f1; padding: 20px;
          border-radius: 8px; margin-top: 15px; white-space: pre-wrap;
          max-height: 300px; overflow-y: auto; font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px; line-height: 1.4;
        }
        .status {
          padding: 12px 16px; margin: 10px 0; border-radius: 6px; font-weight: 500;
          display: flex; align-items: center; gap: 10px;
        }
        .status.success { background: #d5f4e6; color: #27ae60; border: 1px solid #27ae60; }
        .status.error { background: #fadbd8; color: #e74c3c; border: 1px solid #e74c3c; }
        .status.loading { background: #fff3cd; color: #f39c12; border: 1px solid #f39c12; }
        .metrics {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px; margin: 15px 0;
        }
        .metric {
          background: #ecf0f1; padding: 10px; border-radius: 6px; text-align: center;
          border: 1px solid #bdc3c7;
        }
        .metric-value { font-size: 20px; font-weight: bold; color: #2c3e50; }
        .metric-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
        .template-item {
          background: #f8f9fa; border: 1px solid #ecf0f1; border-radius: 6px;
          padding: 15px; margin: 10px 0; cursor: pointer; transition: all 0.3s;
        }
        .template-item:hover { border-color: #3498db; background: #e8f4fd; }
        .template-item.selected { border-color: #3498db; background: #e8f4fd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧠 NeuroLink AI Toolkit</h1>
          <p>Comprehensive Interactive Examples & Use Cases</p>
          <div class="metrics">
            <div class="metric">
              <div class="metric-value" id="total-requests">0</div>
              <div class="metric-label">Requests</div>
            </div>
            <div class="metric">
              <div class="metric-value" id="active-providers">0</div>
              <div class="metric-label">Providers</div>
            </div>
            <div class="metric">
              <div class="metric-value" id="total-tokens">0</div>
              <div class="metric-label">Tokens</div>
            </div>
          </div>
        </div>

        <div class="tabs">
          <div class="tab active" onclick="showTab('basic')">🚀 Basic Examples</div>
          <div class="tab" onclick="showTab('business')">💼 Business Use Cases</div>
          <div class="tab" onclick="showTab('creative')">🎨 Creative Tools</div>
          <div class="tab" onclick="showTab('developer')">👨‍💻 Developer Tools</div>
          <div class="tab" onclick="showTab('advanced')">⚡ Advanced Features</div>
          <div class="tab" onclick="showTab('monitoring')">📊 Monitoring</div>
        </div>

        <!-- Basic Examples Tab -->
        <div id="basic" class="tab-content active">
          <div class="grid">
            <div class="card">
              <h3>🤖 AI Provider Testing</h3>
              <div class="form-group">
                <label>Choose Provider:</label>
                <select id="basic-provider">
                  <option value="auto">🎯 Auto (Best Available)</option>
                  <option value="openai">🟢 OpenAI (GPT-4)</option>
                  <option value="bedrock">🟠 Amazon Bedrock (Claude)</option>
                  <option value="vertex">🔵 Google Vertex AI (Gemini)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Your Prompt:</label>
                <textarea id="basic-prompt" rows="3">Explain the concept of machine learning in simple terms.</textarea>
              </div>
              <button class="btn" onclick="generateBasic()">Generate Text</button>
              <div id="basic-status"></div>
              <div id="basic-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🎯 Schema Validation</h3>
              <p>Generate structured data with validation:</p>
              <div class="form-group">
                <label>Select Data Type:</label>
                <select id="schema-type">
                  <option value="user-profile">👤 User Profile</option>
                  <option value="product-review">⭐ Product Review</option>
                  <option value="meeting-notes">📝 Meeting Notes</option>
                </select>
              </div>
              <button class="btn" onclick="generateSchema()">Generate Data</button>
              <div id="schema-status"></div>
              <div id="schema-output" class="output"></div>
            </div>

            <div class="card">
              <h3>⚡ Performance Benchmark</h3>
              <p>Compare response times across providers:</p>
              <button class="btn" onclick="runBenchmark()">Run Benchmark</button>
              <div id="benchmark-status"></div>
              <div id="benchmark-output" class="output"></div>
            </div>
          </div>
        </div>

        <!-- Business Use Cases Tab -->
        <div id="business" class="tab-content">
          <div class="grid">
            <div class="card">
              <h3>📧 Email Generator</h3>
              <div class="form-group">
                <label>Email Type:</label>
                <select id="email-type">
                  <option value="marketing">📢 Marketing Email</option>
                  <option value="support">🛠️ Customer Support</option>
                  <option value="follow-up">📞 Follow-up Email</option>
                </select>
              </div>
              <div class="form-group">
                <label>Context:</label>
                <textarea id="email-context" rows="3">New product launch announcement for our AI-powered analytics tool.</textarea>
              </div>
              <button class="btn" onclick="generateEmail()">Generate Email</button>
              <div id="email-status"></div>
              <div id="email-output" class="output"></div>
            </div>

            <div class="card">
              <h3>📊 Data Analysis</h3>
              <div class="form-group">
                <label>Data (CSV format):</label>
                <textarea id="data-input" rows="4">Product,Sales,Month
Widget A,1500,January
Widget B,2300,January
Widget C,1200,January</textarea>
              </div>
              <button class="btn" onclick="analyzeData()">Analyze Data</button>
              <div id="data-status"></div>
              <div id="data-output" class="output"></div>
            </div>

            <div class="card">
              <h3>📝 Document Summarizer</h3>
              <div class="form-group">
                <label>Document Text:</label>
                <textarea id="doc-text" rows="4">Artificial Intelligence (AI) has revolutionized numerous industries by automating complex tasks and providing insights that were previously impossible to obtain.</textarea>
              </div>
              <div class="form-group">
                <label>Summary Length:</label>
                <select id="summary-length">
                  <option value="brief">📄 Brief</option>
                  <option value="medium">📃 Medium</option>
                  <option value="detailed">📑 Detailed</option>
                </select>
              </div>
              <button class="btn" onclick="summarizeDocument()">Summarize</button>
              <div id="doc-status"></div>
              <div id="doc-output" class="output"></div>
            </div>
          </div>
        </div>

        <!-- Creative Tools Tab -->
        <div id="creative" class="tab-content">
          <div class="grid">
            <div class="card">
              <h3>✍️ Creative Writing</h3>
              <div class="form-group">
                <label>Writing Type:</label>
                <select id="writing-type">
                  <option value="story">📚 Short Story</option>
                  <option value="poem">📝 Poem</option>
                  <option value="dialogue">💬 Dialogue</option>
                </select>
              </div>
              <div class="form-group">
                <label>Theme/Prompt:</label>
                <textarea id="writing-prompt" rows="3">A time traveler discovers they can only travel to moments of great historical significance.</textarea>
              </div>
              <button class="btn" onclick="generateCreative()">Create Content</button>
              <div id="writing-status"></div>
              <div id="writing-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🌍 Language Translation</h3>
              <div class="form-group">
                <label>Source Text:</label>
                <textarea id="translate-text" rows="3">Hello, how are you today? I hope you're having a wonderful day!</textarea>
              </div>
              <div class="form-group">
                <label>Target Language:</label>
                <select id="target-language">
                  <option value="spanish">🇪🇸 Spanish</option>
                  <option value="french">🇫🇷 French</option>
                  <option value="german">🇩🇪 German</option>
                  <option value="japanese">🇯🇵 Japanese</option>
                </select>
              </div>
              <button class="btn" onclick="translateText()">Translate</button>
              <div id="translate-status"></div>
              <div id="translate-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🎨 Content Ideas</h3>
              <div class="form-group">
                <label>Content Type:</label>
                <select id="content-type">
                  <option value="blog">📖 Blog Posts</option>
                  <option value="social">📱 Social Media</option>
                  <option value="video">🎥 Video Scripts</option>
                </select>
              </div>
              <div class="form-group">
                <label>Topic/Industry:</label>
                <input type="text" id="content-topic" value="artificial intelligence" />
              </div>
              <button class="btn" onclick="generateIdeas()">Generate Ideas</button>
              <div id="content-status"></div>
              <div id="content-output" class="output"></div>
            </div>
          </div>
        </div>

        <!-- Developer Tools Tab -->
        <div id="developer" class="tab-content">
          <div class="grid">
            <div class="card">
              <h3>💻 Code Generator</h3>
              <div class="form-group">
                <label>Programming Language:</label>
                <select id="code-language">
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="react">React/JSX</option>
                </select>
              </div>
              <div class="form-group">
                <label>Code Description:</label>
                <textarea id="code-description" rows="3">Create a function that validates email addresses using regex and returns true/false.</textarea>
              </div>
              <button class="btn" onclick="generateCode()">Generate Code</button>
              <div id="code-status"></div>
              <div id="code-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🔍 API Documentation</h3>
              <div class="form-group">
                <label>API Description:</label>
                <textarea id="api-description" rows="3">A REST API for managing user accounts with endpoints for creating, reading, updating, and deleting users.</textarea>
              </div>
              <button class="btn" onclick="generateAPIDoc()">Generate Documentation</button>
              <div id="api-status"></div>
              <div id="api-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🐛 Debug Helper</h3>
              <div class="form-group">
                <label>Error Message/Code:</label>
                <textarea id="debug-input" rows="4">TypeError: Cannot read property 'map' of undefined
  at UserList.render (UserList.js:15:23)</textarea>
              </div>
              <button class="btn" onclick="debugError()">Analyze Error</button>
              <div id="debug-status"></div>
              <div id="debug-output" class="output"></div>
            </div>
          </div>
        </div>

        <!-- Advanced Features Tab -->
        <div id="advanced" class="tab-content">
          <div class="grid">
            <div class="card">
              <h3>🎛️ Prompt Templates</h3>
              <div class="form-group">
                <label>Available Templates:</label>
                <div id="template-list">
                  <div class="template-item" onclick="selectTemplate('blog-outline')">
                    <strong>📖 Blog Post Outline</strong><br>
                    <small>Generate structured blog post outlines</small>
                  </div>
                  <div class="template-item" onclick="selectTemplate('product-description')">
                    <strong>🛍️ Product Description</strong><br>
                    <small>Create compelling product descriptions</small>
                  </div>
                  <div class="template-item" onclick="selectTemplate('meeting-agenda')">
                    <strong>📅 Meeting Agenda</strong><br>
                    <small>Structure effective meeting agendas</small>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Template Variables:</label>
                <div id="template-variables"></div>
              </div>
              <button class="btn" onclick="executeTemplate()">Execute Template</button>
              <div id="template-status"></div>
              <div id="template-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🔄 Batch Processing</h3>
              <div class="form-group">
                <label>Batch Operation:</label>
                <select id="batch-operation">
                  <option value="translate">🌍 Bulk Translation</option>
                  <option value="summarize">📝 Bulk Summarization</option>
                  <option value="analyze">📊 Sentiment Analysis</option>
                </select>
              </div>
              <div class="form-group">
                <label>Input Data (one item per line):</label>
                <textarea id="batch-input" rows="5">This is an amazing product!
I'm not happy with the service.
The quality is good but delivery was slow.</textarea>
              </div>
              <button class="btn" onclick="processBatch()">Process Batch</button>
              <div id="batch-status"></div>
              <div id="batch-output" class="output"></div>
            </div>
          </div>
        </div>

        <!-- Monitoring Tab -->
        <div id="monitoring" class="tab-content">
          <div class="grid">
            <div class="card">
              <h3>📈 Usage Analytics</h3>
              <button class="btn" onclick="loadAnalytics()">Refresh Analytics</button>
              <div id="analytics-output" class="output"></div>
            </div>

            <div class="card">
              <h3>🔧 Provider Status</h3>
              <button class="btn" onclick="checkProviders()">Check All Providers</button>
              <div id="provider-status" class="output"></div>
            </div>
          </div>
        </div>
      </div>

      <script>
        // Global state management
        let selectedTemplate = null;

        // Tab management
        function showTab(tabName) {
          document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

          event.target.classList.add('active');
          document.getElementById(tabName).classList.add('active');
        }

        // Utility functions
        function setStatus(elementId, message, type = 'info') {
          const status = document.getElementById(elementId);
          if (status) {
            status.className = 'status ' + type;
            status.textContent = message;
          }
        }

        function setOutput(elementId, content) {
          const output = document.getElementById(elementId);
          if (output) {
            output.textContent = content;
          }
        }

        async function apiCall(endpoint, data = {}) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            return await response.json();
          } catch (error) {
            throw new Error('Network error: ' + error.message);
          }
        }

        // Basic Examples
        async function generateBasic() {
          const provider = document.getElementById('basic-provider').value;
          const prompt = document.getElementById('basic-prompt').value;

          if (!prompt.trim()) {
            setStatus('basic-status', 'Please enter a prompt', 'error');
            return;
          }

          setStatus('basic-status', 'Generating response...', 'loading');
          setOutput('basic-output', '');

          try {
            const result = await apiCall('/api/generate', { provider, prompt });
            if (result.success) {
              setOutput('basic-output', result.content);
              setStatus('basic-status', 'Generated successfully using ' + result.provider, 'success');
            } else {
              setStatus('basic-status', 'Error: ' + result.error, 'error');
            }
          } catch (error) {
            setStatus('basic-status', 'Request failed: ' + error.message, 'error');
          }
        }

        async function generateSchema() {
          const schemaType = document.getElementById('schema-type').value;
          setStatus('schema-status', 'Generating structured data...', 'loading');

          try {
            const result = await apiCall('/api/schema', { type: schemaType });
            setOutput('schema-output', JSON.stringify(result, null, 2));
            setStatus('schema-status', 'Schema generated successfully', 'success');
          } catch (error) {
            setStatus('schema-status', 'Error: ' + error.message, 'error');
          }
        }

        async function runBenchmark() {
          setStatus('benchmark-status', 'Running benchmark...', 'loading');

          try {
            const result = await apiCall('/api/benchmark');
            setOutput('benchmark-output', JSON.stringify(result, null, 2));
            setStatus('benchmark-status', 'Benchmark completed', 'success');
          } catch (error) {
            setStatus('benchmark-status', 'Error: ' + error.message, 'error');
          }
        }

        // Business Use Cases
        async function generateEmail() {
          const type = document.getElementById('email-type').value;
          const context = document.getElementById('email-context').value;
          setStatus('email-status', 'Generating email...', 'loading');

          try {
            const result = await apiCall('/api/business/email', { type, context });
            setOutput('email-output', result.content);
            setStatus('email-status', 'Email generated successfully', 'success');
          } catch (error) {
            setStatus('email-status', 'Error: ' + error.message, 'error');
          }
        }

        async function analyzeData() {
          const data = document.getElementById('data-input').value;
          setStatus('data-status', 'Analyzing data...', 'loading');

          try {
            const result = await apiCall('/api/business/analyze-data', { data });
            setOutput('data-output', result.content);
            setStatus('data-status', 'Analysis completed', 'success');
          } catch (error) {
            setStatus('data-status', 'Error: ' + error.message, 'error');
          }
        }

        async function summarizeDocument() {
          const text = document.getElementById('doc-text').value;
          const length = document.getElementById('summary-length').value;
          setStatus('doc-status', 'Summarizing document...', 'loading');

          try {
            const result = await apiCall('/api/business/summarize', { text, length });
            setOutput('doc-output', result.content);
            setStatus('doc-status', 'Summary generated', 'success');
          } catch (error) {
            setStatus('doc-status', 'Error: ' + error.message, 'error');
          }
        }

        // Creative Tools functions
        async function generateCreative() {
          const type = document.getElementById('writing-type').value;
          const prompt = document.getElementById('writing-prompt').value;
          setStatus('writing-status', 'Creating content...', 'loading');

          try {
            const result = await apiCall('/api/creative/writing', { type, prompt });
            setOutput('writing-output', result.content);
            setStatus('writing-status', 'Content created successfully', 'success');
          } catch (error) {
            setStatus('writing-status', 'Error: ' + error.message, 'error');
          }
        }

        async function translateText() {
          const text = document.getElementById('translate-text').value;
          const language = document.getElementById('target-language').value;
          setStatus('translate-status', 'Translating...', 'loading');

          try {
            const result = await apiCall('/api/creative/translate', { text, language });
            setOutput('translate-output', result.content);
            setStatus('translate-status', 'Translation completed', 'success');
          } catch (error) {
            setStatus('translate-status', 'Error: ' + error.message, 'error');
          }
        }

        async function generateIdeas() {
          const type = document.getElementById('content-type').value;
          const topic = document.getElementById('content-topic').value;
          setStatus('content-status', 'Generating ideas...', 'loading');

          try {
            const result = await apiCall('/api/creative/ideas', { type, topic });
            setOutput('content-output', result.content);
            setStatus('content-status', 'Ideas generated successfully', 'success');
          } catch (error) {
            setStatus('content-status', 'Error: ' + error.message, 'error');
          }
        }

        // Developer Tools functions
        async function generateCode() {
          const language = document.getElementById('code-language').value;
          const description = document.getElementById('code-description').value;
          setStatus('code-status', 'Generating code...', 'loading');

          try {
            const result = await apiCall('/api/developer/code', { language, description });
            setOutput('code-output', result.content);
            setStatus('code-status', 'Code generated successfully', 'success');
          } catch (error) {
            setStatus('code-status', 'Error: ' + error.message, 'error');
          }
        }

        async function generateAPIDoc() {
          const description = document.getElementById('api-description').value;
          setStatus('api-status', 'Generating documentation...', 'loading');

          try {
            const result = await apiCall('/api/developer/api-doc', { description });
            setOutput('api-output', result.content);
            setStatus('api-status', 'Documentation generated successfully', 'success');
          } catch (error) {
            setStatus('api-status', 'Error: ' + error.message, 'error');
          }
        }

        async function debugError() {
          const error = document.getElementById('debug-input').value;
          setStatus('debug-status', 'Analyzing error...', 'loading');

          try {
            const result = await apiCall('/api/developer/debug', { error });
            setOutput('debug-output', result.content);
            setStatus('debug-status', 'Analysis completed', 'success');
          } catch (error) {
            setStatus('debug-status', 'Error: ' + error.message, 'error');
          }
        }

        // Advanced Features functions
        function selectTemplate(templateId) {
          selectedTemplate = templateId;
          document.querySelectorAll('.template-item').forEach(item => item.classList.remove('selected'));
          event.target.closest('.template-item').classList.add('selected');

          // Load template variables
          loadTemplateVariables(templateId);
        }

        async function loadTemplateVariables(templateId) {
          const templates = {
            'blog-outline': ['topic', 'audience'],
            'product-description': ['product_name',
