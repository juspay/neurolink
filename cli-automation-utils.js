/**
 * Shared Utilities for CLI Automation Scripts
 * Common functions for terminal session creation, command execution, and output processing
 */

import { exec } from 'child_process';
import { AUTOMATION_CONFIG, cleanCommandOutput } from './cli-automation-config.js';

/**
 * Creates a professional terminal session in the browser page
 * @param {Object} page - Playwright page object
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 */
export async function createTerminalSession(page, width = 1920, height = 1080) {
  await page.setViewportSize({ width, height });

  const { terminalStyle } = AUTOMATION_CONFIG;

  // Set up a professional dark terminal interface
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NeuroLink CLI</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: ${terminalStyle.background};
          color: ${terminalStyle.textColor};
          font-family: ${terminalStyle.fontFamily};
          font-size: 16px;
          line-height: 1.5;
        }
        .terminal {
          background: ${terminalStyle.terminalBackground};
          border: 1px solid ${terminalStyle.border};
          border-radius: 8px;
          padding: 25px;
          margin: 20px 0;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          min-height: 600px;
        }
        .header {
          color: ${terminalStyle.colors.primary};
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 25px;
          text-align: center;
          border-bottom: 1px solid ${terminalStyle.border};
          padding-bottom: 15px;
        }
        .subheader {
          color: ${terminalStyle.colors.description};
          font-size: 16px;
          text-align: center;
          margin-bottom: 30px;
          font-style: italic;
        }
        .command-section {
          margin: 25px 0;
        }
        .command-line {
          margin: 12px 0;
          display: flex;
          align-items: flex-start;
        }
        .prompt {
          color: ${terminalStyle.colors.prompt};
          font-weight: bold;
          margin-right: 8px;
        }
        .command {
          color: ${terminalStyle.colors.command};
          font-weight: 500;
        }
        .output {
          color: ${terminalStyle.textColor};
          margin-left: 24px;
          white-space: pre-wrap;
          background: ${terminalStyle.background};
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #21262d;
          margin-top: 10px;
          font-size: 14px;
        }
        .success {
          color: ${terminalStyle.colors.success};
        }
        .error {
          color: ${terminalStyle.colors.error};
        }
        .info {
          color: ${terminalStyle.colors.primary};
        }
        .description {
          color: ${terminalStyle.colors.description};
          font-style: italic;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .timestamp {
          color: ${terminalStyle.colors.timestamp};
          font-size: 12px;
          text-align: right;
          margin-top: 20px;
        }
        .highlight {
          color: ${terminalStyle.colors.highlight};
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="terminal">
        <div class="header">🧠 NeuroLink CLI</div>
        <div class="subheader" id="subtitle"></div>
        <div id="content"></div>
        <div class="timestamp" id="timestamp"></div>
      </div>
      <script>
        window.setScenario = function(title, description) {
          const subtitle = document.getElementById('subtitle');
          const timestamp = document.getElementById('timestamp');
          if (subtitle) subtitle.textContent = title;
          if (timestamp) timestamp.textContent = new Date().toLocaleString();
        };

        window.addCommand = function(command, output, isSuccess = true) {
          const content = document.getElementById('content');
          const commandHtml = '<div class="command-line"><span class="prompt">$</span><span class="command">' + command + '</span></div>';

          let outputHtml = '';
          if (output) {
            const outputClass = isSuccess ? 'success' : 'error';
            outputHtml = '<div class="output ' + outputClass + '">' + output + '</div>';
          }

          content.innerHTML += '<div class="command-section">' + commandHtml + outputHtml + '</div>';
        };

        window.addDescription = function(description) {
          const content = document.getElementById('content');
          content.innerHTML += '<div class="description"># ' + description + '</div>';
        };

        window.clearTerminal = function() {
          document.getElementById('content').innerHTML = '';
        };
      </script>
    </body>
    </html>
  `);
}

/**
 * Executes a command and returns the result with proper error handling
 * @param {string} command - Command to execute
 * @returns {Promise<Object>} - Result object with success, output, and code
 */
export async function executeCommand(command) {
  return new Promise((resolve) => {
    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          output: stderr || error.message,
          code: error.code || -1
        });
      } else {
        resolve({
          success: true,
          output: stdout,
          code: 0
        });
      }
    });
  });
}

/**
 * Processes command output for display in terminal
 * @param {string} output - Raw command output
 * @param {number} maxLength - Maximum length for display (default: 2000)
 * @returns {string} - Cleaned output ready for display
 */
export function processCommandOutput(output, maxLength = 2000) {
  // Clean up ANSI codes and format output
  let cleanOutput = cleanCommandOutput(output);

  // Limit output length for display
  if (cleanOutput.length > maxLength) {
    cleanOutput = cleanOutput.substring(0, maxLength) + '\n...[output truncated for display]';
  }

  return cleanOutput;
}

/**
 * Sets up terminal scenario with title and description
 * @param {Object} page - Playwright page object
 * @param {string} title - Scenario title
 * @param {string} description - Scenario description
 */
export async function setupTerminalScenario(page, title, description) {
  await page.evaluate(({ title, desc }) => {
    window.setScenario(title, desc);
    if (desc) {
      window.addDescription(desc);
    }
  }, { title, desc: description });
}

/**
 * Adds a command with output to the terminal display
 * @param {Object} page - Playwright page object
 * @param {string} command - Command to display
 * @param {string} output - Command output
 * @param {boolean} success - Whether command was successful
 */
export async function addCommandToTerminal(page, command, output = '', success = true) {
  await page.evaluate(({ cmd, out, succ }) => {
    window.addCommand(cmd, out, succ);
  }, { cmd: command, out: output, succ: success });
}

/**
 * Types a command character by character (for video recording)
 * @param {Object} page - Playwright page object
 * @param {string} command - Command to type
 * @param {string} description - Optional description
 * @param {number} typingDelay - Delay between characters
 */
export async function typeCommand(page, command, description = null, typingDelay = 100) {
  if (description) {
    await page.evaluate((desc) => {
      window.addCommand('', '', true);
      window.addDescription(desc);
    }, description);
    await page.waitForTimeout(1000);
  }

  // Add empty command line for typing
  await page.evaluate(() => {
    const content = document.getElementById('content');
    content.innerHTML += '<div class="command-line"><span class="prompt">$ </span><span class="command"></span></div>';
  });

  // Type command character by character
  for (let char of command) {
    await page.evaluate((c) => {
      const commandSpan = document.querySelector('.command-line:last-child .command');
      if (commandSpan) {
        commandSpan.textContent += c;
      }
    }, char);
    await page.waitForTimeout(typingDelay);
  }

  await page.waitForTimeout(500);
}

export default {
  createTerminalSession,
  executeCommand,
  processCommandOutput,
  setupTerminalScenario,
  addCommandToTerminal,
  typeCommand
};
