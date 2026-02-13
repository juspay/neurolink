#!/usr/bin/env node

/**
 * Format only staged files based on git diff --cached
 * This script gets only staged files (git add'ed) and runs prettier only on those files
 */

const { execSync } = require('child_process');
const path = require('path');

function getChangedFiles() {
  try {
    // Get only staged files (files that have been git add'ed)
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.trim());
    
    console.log(`Found ${stagedFiles.length} staged files`);
    return stagedFiles;
  } catch (error) {
    console.log('No git repository or no staged files found');
    return [];
  }
}

function filterFormattableFiles(files) {
  // Extensions that prettier can format
  const formattableExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.scss', 
    '.less', '.vue', '.yaml', '.yml', '.graphql', '.gql', '.svelte'
  ];
  
  const formattableFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return formattableExtensions.includes(ext);
  }).filter(file => {
    // Check if file still exists (not deleted)
    try {
      require('fs').accessSync(file);
      return true;
    } catch {
      return false;
    }
  });
  
  console.log(`${formattableFiles.length} files can be formatted`);
  return formattableFiles;
}

function formatFiles(files) {
  if (files.length === 0) {
    console.log('✅ No files to format');
    return;
  }

  try {
    console.log('🎨 Formatting changed files...');

    // Separate Svelte files (need the plugin) from regular files
    const svelteFiles = files.filter(f => f.endsWith('.svelte'));
    const regularFiles = files.filter(f => !f.endsWith('.svelte'));

    // Format regular files in chunks
    const chunkSize = 50;
    for (let i = 0; i < regularFiles.length; i += chunkSize) {
      const chunk = regularFiles.slice(i, i + chunkSize);
      const filesArg = chunk.map(f => `"${f}"`).join(' ');

      console.log(`Formatting chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(regularFiles.length/chunkSize)}: ${chunk.length} files`);

      execSync(`npx prettier --write ${filesArg}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    }

    // Format Svelte files with the plugin from the landing workspace
    if (svelteFiles.length > 0) {
      const rootDir = process.cwd();
      const landingDir = path.join(rootDir, 'landing');
      // Convert paths to be relative to the landing directory
      const relFiles = svelteFiles.map(f => path.relative(landingDir, path.resolve(rootDir, f)));
      const filesArg = relFiles.map(f => `"${f}"`).join(' ');
      console.log(`Formatting ${svelteFiles.length} Svelte files with prettier-plugin-svelte...`);

      execSync(`npx prettier --write --plugin prettier-plugin-svelte ${filesArg}`, {
        stdio: 'inherit',
        cwd: landingDir
      });
    }

    console.log(`✅ Successfully formatted ${files.length} changed files`);
  } catch (error) {
    console.error('❌ Error formatting files:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🔍 Finding changed files...');
  
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('✅ No changed files found');
    return;
  }
  
  const formattableFiles = filterFormattableFiles(changedFiles);
  formatFiles(formattableFiles);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { getChangedFiles, filterFormattableFiles, formatFiles };
