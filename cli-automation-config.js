/**
 * Shared Configuration for CLI Automation Scripts
 * Centralizes timing, styling, and path constants for consistency
 */

export const AUTOMATION_CONFIG = {
  // Context Constants for delay settings
  contexts: {
    DEFAULT: 'default',
    VIDEO: 'video',
    SCREENSHOT: 'screenshot',
    TYPING: 'typing',
    FINAL: 'final'
  },

  // Timing Configuration
  delays: {
    betweenActions: 2000,      // Default delay between major actions
    screenshotActions: 1500,   // Faster delay for screenshots
    typing: 100,               // Character-by-character typing delay
    finalWait: 3000           // Wait time before finishing recording
  },

  // Directory Configuration
  directories: {
    videos: 'cli-videos',
    screenshots: 'cli-screenshots'
  },

  // Browser Configuration
  browser: {
    viewport: {
      width: 1920,
      height: 1080
    },
    slowMo: 500,               // Slow motion for video recording
    args: ['--start-maximized']
  },

  // Terminal Styling (shared between scripts)
  terminalStyle: {
    background: '#0d1117',
    terminalBackground: '#161b22',
    border: '#30363d',
    textColor: '#c9d1d9',
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",

    // Color scheme
    colors: {
      primary: '#58a6ff',      // Headers and info
      prompt: '#7c3aed',       // Command prompt
      command: '#79c0ff',      // Commands
      success: '#3fb950',      // Success messages
      error: '#f85149',        // Error messages
      description: '#8b949e',  // Comments and descriptions
      timestamp: '#6e7681',    // Timestamps
      highlight: '#ffa657',    // JSON and highlights
      outputBorder: '#21262d'  // Output section borders
    },

    // Layout and typography
    layout: {
      borderRadius: '8px',
      terminalPadding: '25px',
      terminalMinHeight: '600px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
      headerFontSize: '28px',
      subheaderFontSize: '16px',
      bodyFontSize: '16px',
      outputFontSize: '14px',
      timestampFontSize: '12px',
      lineHeight: '1.5'
    },

    // Spacing
    spacing: {
      bodyPadding: '20px',
      terminalMargin: '20px 0',
      headerMarginBottom: '25px',
      headerPaddingBottom: '15px',
      subheaderMarginBottom: '30px',
      commandSectionMargin: '25px 0',
      commandLineMargin: '12px 0',
      promptMarginRight: '8px',
      outputMarginLeft: '24px',
      outputMarginTop: '10px',
      outputPadding: '15px',
      outputBorderRadius: '6px',
      descriptionMarginBottom: '10px',
      timestampMarginTop: '20px'
    }
  },

  // Output cleanup patterns
  outputCleanup: {
    ansiCodes: /\x1b\[[0-9;]*m/g,
    spinnerChars: /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g,
    emojiSpacing: /🤖|✅|✔|❌|📊|🔍|🎯/g,
    terminalArtifacts: /;[^;]*;[^;]*;[^;]*$/
  }
};

// Helper functions for common operations
export const getDelayForContext = (context = AUTOMATION_CONFIG.contexts.DEFAULT) => {
  const delays = AUTOMATION_CONFIG.delays;
  const contexts = AUTOMATION_CONFIG.contexts;
  switch (context) {
    case contexts.VIDEO: return delays.betweenActions;
    case contexts.SCREENSHOT: return delays.screenshotActions;
    case contexts.TYPING: return delays.typing;
    case contexts.FINAL: return delays.finalWait;
    default: return delays.betweenActions;
  }
};

export const cleanCommandOutput = (output) => {
  const patterns = AUTOMATION_CONFIG.outputCleanup;
  return output
    .replace(patterns.ansiCodes, '')
    .replace(patterns.spinnerChars, '')
    .replace(patterns.emojiSpacing, '')
    .replace(patterns.terminalArtifacts, '')
    .trim();
};

export default AUTOMATION_CONFIG;
