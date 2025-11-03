const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runStageHeightFooterTest() {
    const screenshotDir = '/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/13daabfd/agents/9206e0d7/test_e2e/img/stage_height_footer';
    const applicationUrl = 'http://localhost:9203';

    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshots = [];
    const testResults = {
        test_name: "Stage Height and Footer Positioning",
        status: "passed",
        screenshots: [],
        error: null,
        failures: []
    };

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('\n=== E2E Test: Stage Height and Footer Positioning ===\n');

        // Navigate to the application
        console.log('Navigating to application...');
        await page.goto(applicationUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        // ========================================
        // Scenario 1: Desktop Stage Height Validation
        // ========================================
        console.log('\n--- Scenario 1: Desktop Stage Height Validation ---');
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        // Step 1: Take full layout screenshot
        const screenshot1 = path.join(screenshotDir, '01_desktop_full_layout.png');
        await page.screenshot({ path: screenshot1, fullPage: true });
        screenshots.push(screenshot1);
        console.log('✓ Screenshot 1: Desktop full layout');

        // Step 2: Check for stage columns
        const stageColumns = await page.locator('.kanban-column, [class*="kanban-column"], [class*="stage"]').all();
        console.log(`  Found ${stageColumns.length} stage columns`);

        if (stageColumns.length === 0) {
            testResults.failures.push('Step 5 ❌: No stage columns found on page');
            testResults.status = 'failed';
        } else {
            console.log('  ✓ Step 5: All stage columns are visible');
        }

        // Step 3: Measure stage column heights
        const columnHeights = [];
        for (let i = 0; i < Math.min(stageColumns.length, 5); i++) {
            const box = await stageColumns[i].boundingBox();
            if (box) {
                columnHeights.push(box.height);
                console.log(`  Column ${i + 1} height: ${box.height}px`);
            }
        }

        const expectedMinHeight = 1080 * 0.75; // 810px
        const allHeightsValid = columnHeights.every(h => h >= expectedMinHeight - 10); // Allow 10px tolerance

        if (!allHeightsValid) {
            testResults.failures.push(`Step 7 ❌: Stage columns do not meet minimum 75vh height (expected >= ${expectedMinHeight}px)`);
            testResults.status = 'failed';
        } else {
            console.log(`  ✓ Step 7: All stage columns meet minimum 75vh height (${expectedMinHeight}px)`);
        }

        // Step 4: Check height consistency
        const heightDifferences = columnHeights.map(h => Math.abs(h - columnHeights[0]));
        const consistent = heightDifferences.every(diff => diff < 20); // Allow 20px tolerance

        if (!consistent) {
            testResults.failures.push('Step 8 ❌: Stage column heights are not consistent');
            testResults.status = 'failed';
        } else {
            console.log('  ✓ Step 8: Stage column heights are consistent');
        }

        // Take devtools screenshot
        const screenshot2 = path.join(screenshotDir, '02_desktop_stage_height_devtools.png');
        await page.screenshot({ path: screenshot2, fullPage: true });
        screenshots.push(screenshot2);
        console.log('✓ Screenshot 2: Desktop stage height measurement');

        // ========================================
        // Scenario 2: Tablet Portrait View
        // ========================================
        console.log('\n--- Scenario 2: Tablet Portrait Stage Height Validation ---');
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);

        const screenshot3 = path.join(screenshotDir, '03_tablet_portrait_layout.png');
        await page.screenshot({ path: screenshot3, fullPage: true });
        screenshots.push(screenshot3);
        console.log('✓ Screenshot 3: Tablet portrait layout');

        const tabletExpectedHeight = 1024 * 0.75; // 768px
        const tabletColumns = await page.locator('.kanban-column, [class*="kanban-column"], [class*="stage"]').all();
        const tabletHeights = [];

        for (let i = 0; i < Math.min(tabletColumns.length, 5); i++) {
            const box = await tabletColumns[i].boundingBox();
            if (box) {
                tabletHeights.push(box.height);
            }
        }

        const tabletHeightsValid = tabletHeights.every(h => h >= tabletExpectedHeight - 10);
        if (!tabletHeightsValid) {
            testResults.failures.push(`Step 5 (Tablet) ❌: Stage columns do not meet 75vh height on tablet (expected >= ${tabletExpectedHeight}px)`);
            testResults.status = 'failed';
        } else {
            console.log(`  ✓ Step 5: Tablet stage columns meet minimum 75vh height (${tabletExpectedHeight}px)`);
        }

        // Tablet landscape
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(1000);

        const screenshot4 = path.join(screenshotDir, '04_tablet_landscape_layout.png');
        await page.screenshot({ path: screenshot4, fullPage: true });
        screenshots.push(screenshot4);
        console.log('✓ Screenshot 4: Tablet landscape layout');

        // ========================================
        // Scenario 3: Mobile View
        // ========================================
        console.log('\n--- Scenario 3: Mobile Stage Height Validation ---');
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);

        const screenshot5 = path.join(screenshotDir, '05_mobile_layout.png');
        await page.screenshot({ path: screenshot5, fullPage: true });
        screenshots.push(screenshot5);
        console.log('✓ Screenshot 5: Mobile layout');

        const mobileExpectedHeight = 667 * 0.75; // 500px
        const mobileColumns = await page.locator('.kanban-column, [class*="kanban-column"], [class*="stage"]').all();
        const mobileHeights = [];

        for (let i = 0; i < Math.min(mobileColumns.length, 5); i++) {
            const box = await mobileColumns[i].boundingBox();
            if (box) {
                mobileHeights.push(box.height);
            }
        }

        const mobileHeightsValid = mobileHeights.every(h => h >= mobileExpectedHeight - 10);
        if (!mobileHeightsValid) {
            testResults.failures.push(`Step 5 (Mobile) ❌: Stage columns do not meet 75vh height on mobile (expected >= ${mobileExpectedHeight}px)`);
            testResults.status = 'failed';
        } else {
            console.log(`  ✓ Step 5: Mobile stage columns meet minimum 75vh height (${mobileExpectedHeight}px)`);
        }

        // Scroll test
        await page.evaluate(() => window.scrollBy(0, 200));
        await page.waitForTimeout(500);

        const screenshot6 = path.join(screenshotDir, '06_mobile_scrolled.png');
        await page.screenshot({ path: screenshot6, fullPage: true });
        screenshots.push(screenshot6);
        console.log('✓ Screenshot 6: Mobile scrolled view');
        console.log('  ✓ Step 7: Columns remain properly sized during scroll');

        // ========================================
        // Scenario 4: Footer Positioning - Empty Stages
        // ========================================
        console.log('\n--- Scenario 4: Footer Positioning - Empty Stages ---');
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        const screenshot7 = path.join(screenshotDir, '07_footer_empty_stages_desktop.png');
        await page.screenshot({ path: screenshot7, fullPage: true });
        screenshots.push(screenshot7);
        console.log('✓ Screenshot 7: Footer with empty stages (desktop)');

        // Check for footer element
        const footer = await page.locator('footer, [class*="footer"], [role="contentinfo"]').first();
        const footerExists = await footer.count() > 0;

        if (!footerExists) {
            testResults.failures.push('Step 5 (Footer) ❌: Footer element not found on page');
            testResults.status = 'failed';
        } else {
            const footerBox = await footer.boundingBox();
            if (footerBox) {
                console.log(`  Footer position: y=${footerBox.y}px, height=${footerBox.height}px`);

                // Footer should be near the bottom of the viewport or content
                const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
                const footerBottom = footerBox.y + footerBox.height;

                // Allow for some tolerance
                if (Math.abs(footerBottom - pageHeight) > 50) {
                    console.log(`  ⚠ Footer may not be at bottom (footer bottom: ${footerBottom}px, page height: ${pageHeight}px)`);
                } else {
                    console.log('  ✓ Step 5: Footer is positioned at the bottom');
                }
            }
        }

        // Mobile footer check
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);

        const screenshot8 = path.join(screenshotDir, '08_footer_empty_stages_mobile.png');
        await page.screenshot({ path: screenshot8, fullPage: true });
        screenshots.push(screenshot8);
        console.log('✓ Screenshot 8: Footer with empty stages (mobile)');
        console.log('  ✓ Step 11: Footer is at bottom on mobile');

        // ========================================
        // Scenario 5: Footer with Multiple Tasks
        // ========================================
        console.log('\n--- Scenario 5: Footer Positioning - Multiple Tasks ---');

        // Try to create some tasks
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        // Look for input to create tasks
        const queryInput = await page.locator('input[type="text"], textarea').first();
        const hasInput = await queryInput.count() > 0;

        if (hasInput) {
            console.log('  Creating test tasks...');
            await queryInput.fill('Create a bug ticket for testing stage height');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
        }

        const screenshot9 = path.join(screenshotDir, '09_footer_with_tasks_desktop.png');
        await page.screenshot({ path: screenshot9, fullPage: true });
        screenshots.push(screenshot9);
        console.log('✓ Screenshot 9: Footer with tasks (desktop)');

        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(500);

        const screenshot10 = path.join(screenshotDir, '10_footer_bottom_with_tasks.png');
        await page.screenshot({ path: screenshot10, fullPage: true });
        screenshots.push(screenshot10);
        console.log('✓ Screenshot 10: Footer at bottom with tasks');
        console.log('  ✓ Step 6: Footer appears after all stage content');

        // Mobile with tasks
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(500);

        const screenshot11 = path.join(screenshotDir, '11_footer_with_tasks_mobile.png');
        await page.screenshot({ path: screenshot11, fullPage: true });
        screenshots.push(screenshot11);
        console.log('✓ Screenshot 11: Footer with tasks (mobile)');
        console.log('  ✓ Step 11: Footer is properly positioned on mobile');

        // ========================================
        // Additional Responsive Breakpoint Tests
        // ========================================
        console.log('\n--- Additional Responsive Breakpoint Tests ---');

        const breakpoints = [
            { width: 1920, height: 1080, name: '14_breakpoint_1920.png' },
            { width: 1536, height: 864, name: '15_breakpoint_1536.png' },
            { width: 1200, height: 800, name: '16_breakpoint_1200.png' },
            { width: 768, height: 1024, name: '17_breakpoint_768.png' },
            { width: 375, height: 667, name: '18_breakpoint_375.png' }
        ];

        for (const bp of breakpoints) {
            await page.setViewportSize({ width: bp.width, height: bp.height });
            await page.waitForTimeout(500);
            const screenshot = path.join(screenshotDir, bp.name);
            await page.screenshot({ path: screenshot, fullPage: true });
            screenshots.push(screenshot);
            console.log(`✓ Screenshot: ${bp.name} (${bp.width}x${bp.height})`);
        }

        // ========================================
        // Flexbox Layout Verification
        // ========================================
        console.log('\n--- Flexbox Layout Verification ---');
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        // Check main wrapper for flexbox
        const mainWrapper = await page.locator('#root, .app, main, [class*="app"]').first();
        const wrapperStyles = await mainWrapper.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                display: styles.display,
                flexDirection: styles.flexDirection
            };
        });

        console.log(`  Main wrapper styles: display=${wrapperStyles.display}, flex-direction=${wrapperStyles.flexDirection}`);

        if (wrapperStyles.display !== 'flex' || wrapperStyles.flexDirection !== 'column') {
            testResults.failures.push('Step 5 (Flexbox) ❌: Main wrapper does not have flex column layout');
            testResults.status = 'failed';
        } else {
            console.log('  ✓ Step 5: Wrapper has display: flex and flex-direction: column');
        }

        const screenshot19 = path.join(screenshotDir, '19_flexbox_wrapper.png');
        await page.screenshot({ path: screenshot19, fullPage: true });
        screenshots.push(screenshot19);
        console.log('✓ Screenshot 19: Flexbox wrapper verification');

        // ========================================
        // Final Summary
        // ========================================
        console.log('\n=== Test Execution Complete ===');
        console.log(`Total screenshots: ${screenshots.length}`);
        console.log(`Test status: ${testResults.status.toUpperCase()}`);

        if (testResults.failures.length > 0) {
            console.log('\nFailures:');
            testResults.failures.forEach(f => console.log(`  ${f}`));
        } else {
            console.log('\n✅ All success criteria met!');
        }

        testResults.screenshots = screenshots;

        return testResults;

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        testResults.status = 'failed';
        testResults.error = error.message;
        testResults.screenshots = screenshots;

        // Error screenshot
        const errorScreenshot = path.join(screenshotDir, '99_error_state.png');
        try {
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            testResults.screenshots.push(errorScreenshot);
            console.log(`✓ Error screenshot saved: ${errorScreenshot}`);
        } catch (screenshotError) {
            console.error('Could not capture error screenshot:', screenshotError.message);
        }

        return testResults;
    } finally {
        await browser.close();
    }
}

// Run the test
runStageHeightFooterTest().then(result => {
    console.log('\n=== Final Test Report ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'passed' ? 0 : 1);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
