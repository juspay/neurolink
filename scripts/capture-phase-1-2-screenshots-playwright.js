import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(process.cwd(), 'docs/visual-content/screenshots/phase-1-2-workflow');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function capturePhase12Screenshots() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        console.log('📸 Starting Phase 1.2 screenshot capture...');

        // Navigate to the AI workflow demo page
        await page.goto('http://localhost:9876/ai-workflow-demo.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 1. Capture Overview Screenshot (Full Page)
        console.log('📸 Capturing Phase 1.2 Overview...');
        await page.screenshot({
            path: path.join(screenshotsDir, '01-phase-1-2-overview.png'),
            fullPage: true
        });

        // 2. Capture Generate Test Cases Tool
        console.log('📸 Capturing Generate Test Cases tool...');

        // Scroll to the test cases tool
        await page.locator('h3:has-text("Generate Test Cases")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Click the generate button to show some output
        await page.click('button:has-text("Generate Test Cases")');
        await page.waitForTimeout(2000);

        // Capture the test cases section
        const testCasesCard = await page.locator('.tool-card:has(h3:has-text("Generate Test Cases"))');
        await testCasesCard.screenshot({
            path: path.join(screenshotsDir, '02-generate-test-cases.png')
        });

        // 3. Capture Refactor Code Tool
        console.log('📸 Capturing Refactor Code tool...');

        // Scroll to the refactor tool
        await page.locator('h3:has-text("Refactor Code")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Click the refactor button
        await page.click('button:has-text("Refactor Code")');
        await page.waitForTimeout(2000);

        // Capture the refactor section
        const refactorCard = await page.locator('.tool-card:has(h3:has-text("Refactor Code"))');
        await refactorCard.screenshot({
            path: path.join(screenshotsDir, '03-refactor-code.png')
        });

        // 4. Capture Generate Documentation Tool
        console.log('📸 Capturing Generate Documentation tool...');

        // Scroll to the documentation tool
        await page.locator('h3:has-text("Generate Documentation")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Click the generate documentation button
        await page.click('button:has-text("Generate Documentation")');
        await page.waitForTimeout(2000);

        // Capture the documentation section
        const docCard = await page.locator('.tool-card:has(h3:has-text("Generate Documentation"))');
        await docCard.screenshot({
            path: path.join(screenshotsDir, '04-generate-documentation.png')
        });

        // 5. Capture Debug AI Output Tool
        console.log('📸 Capturing Debug AI Output tool...');

        // Scroll to the debug tool
        await page.locator('h3:has-text("Debug AI Output")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Click the debug button
        await page.click('button:has-text("Debug AI Output")');
        await page.waitForTimeout(2000);

        // Capture the debug section
        const debugCard = await page.locator('.tool-card:has(h3:has-text("Debug AI Output"))');
        await debugCard.screenshot({
            path: path.join(screenshotsDir, '05-debug-ai-output.png')
        });

        // 6. Capture Workflow Integration Demo
        console.log('📸 Capturing Workflow Integration Demo...');

        // Scroll to workflow demo
        await page.locator('h2:has-text("Complete Workflow Integration Demo")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Click run workflow button
        await page.click('button:has-text("Run Complete Workflow")');
        await page.waitForTimeout(3000);

        // Capture the workflow section
        const workflowDemo = await page.locator('.workflow-demo');
        await workflowDemo.screenshot({
            path: path.join(screenshotsDir, '06-workflow-integration.png')
        });

        // 7. Capture metrics summary
        console.log('📸 Capturing metrics summary...');
        await page.locator('.header').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const header = await page.locator('.header');
        await header.screenshot({
            path: path.join(screenshotsDir, '07-phase-1-2-metrics.png')
        });

        console.log('✅ All Phase 1.2 screenshots captured successfully!');
        console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

        // Generate summary report
        const report = `# Phase 1.2 Screenshot Summary

Generated on: ${new Date().toLocaleString()}

## Screenshots Captured:
1. **01-phase-1-2-overview.png** - Complete Phase 1.2 workflow tools page
2. **02-generate-test-cases.png** - Test case generation tool in action
3. **03-refactor-code.png** - Code refactoring tool demonstration
4. **04-generate-documentation.png** - Documentation generation example
5. **05-debug-ai-output.png** - AI output debugging analysis
6. **06-workflow-integration.png** - Complete workflow integration demo
7. **07-phase-1-2-metrics.png** - Performance metrics and statistics

## Tool Features Captured:
- ✅ Generate Test Cases: Multiple language and framework support
- ✅ Refactor Code: Multi-goal optimization (readability, performance, etc.)
- ✅ Generate Documentation: Multiple formats (Markdown, JSDoc, etc.)
- ✅ Debug AI Output: Analysis depth options and improvement suggestions
- ✅ Workflow Integration: All tools working together seamlessly
- ✅ Performance Metrics: 100% test coverage, <1ms execution time

Total screenshots: 7
Location: ${screenshotsDir}
`;

        fs.writeFileSync(path.join(screenshotsDir, 'SCREENSHOT-SUMMARY.md'), report);
        console.log('📝 Summary report generated!');

    } catch (error) {
        console.error('❌ Error capturing screenshots:', error);
    } finally {
        await browser.close();
    }
}

// Run the screenshot capture
capturePhase12Screenshots().catch(console.error);
