#!/usr/bin/env node

/**
 * Test Actual Commits Against Semantic Release Configuration
 * This simulates what semantic-release analyzeCommits does
 */

const fs = require('fs');

// Load our actual configuration
const config = JSON.parse(fs.readFileSync('.releaserc.json', 'utf8'));
const parserOpts = config.plugins[0][1].parserOpts;
const headerPattern = new RegExp(parserOpts.headerPattern);
const headerCorrespondence = parserOpts.headerCorrespondence;

console.log('🔍 Testing Actual Commits Against Semantic Release Configuration\n');
console.log('Configuration:');
console.log('  Pattern:', headerPattern.toString());
console.log('  Correspondence:', headerCorrespondence);
console.log('');

// These are the actual commits from the failed run
const actualCommits = [
  'fix(ci): add semantic-release configuration with dependencies and testing',
  'fix(ci): configure semantic-release to handle ticket prefixes with proper JSON escaping', 
  'BZ-43203: feat(core): add EventEmitter functionality for real-time event monitoring'
];

// Test each commit
let releaseTriggered = false;
actualCommits.forEach((commit, i) => {
  console.log(`Commit ${i + 1}: "${commit}"`);
  
  const match = commit.match(headerPattern);
  if (match) {
    const result = {};
    headerCorrespondence.forEach((key, index) => {
      result[key] = match[index + 1] || null;
    });
    
    console.log(`  ✅ Parsed: type='${result.type}', scope='${result.scope}', subject='${result.subject}'`);
    
    // Check if this would trigger a release
    const releaseTypes = ['feat', 'fix', 'perf', 'revert'];
    const isReleaseType = releaseTypes.includes(result.type);
    
    if (isReleaseType) {
      const releaseLevel = result.type === 'feat' ? 'minor' : 'patch';
      console.log(`  🚀 WOULD TRIGGER ${releaseLevel.toUpperCase()} RELEASE`);
      releaseTriggered = true;
    } else {
      console.log(`  📋 No release (${result.type} type)`);
    }
  } else {
    console.log(`  ❌ Failed to parse - would be ignored`);
  }
  console.log('');
});

console.log('📊 ANALYSIS SUMMARY:');
if (releaseTriggered) {
  console.log('✅ At least one commit should trigger a release');
  console.log('🎯 Semantic-release should create a new version');
} else {
  console.log('❌ No commits would trigger a release');
  console.log('📋 Result: "There are no relevant changes, so no new version is released"');
}

console.log('\n🔧 If no release is triggered, check:');
console.log('1. Are commit types correct? (feat, fix, perf trigger releases)');
console.log('2. Is regex pattern working? (tested above)');
console.log('3. Are there breaking changes or other factors?');