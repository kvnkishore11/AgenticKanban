const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runUITest() {
    const screenshotDir = '/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c855017b/agents/c5c3c6d5/test_e2e/img/websocket_ticket_notification_fix';
    const applicationUrl = 'http://localhost:9214';

    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshots = [];
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Step 10: Testing via Kanban UI integration...');

        // Navigate to the application
        console.log(`  - Navigating to ${applicationUrl}...`);
        await page.goto(applicationUrl, { waitUntil: 'networkidle' });

        // Wait for the app to load
        await page.waitForTimeout(2000);

        // Screenshot 1: Initial page load
        const screenshot1 = path.join(screenshotDir, '01_initial_page_load.png');
        await page.screenshot({ path: screenshot1, fullPage: true });
        screenshots.push(screenshot1);
        console.log(`  ✓ Screenshot saved: ${screenshot1}`);

        // Check WebSocket connection status
        console.log('  - Checking WebSocket connection status...');

        // Look for WebSocket connection indicator in the UI
        const wsStatusElement = await page.locator('[data-testid="websocket-status"], .websocket-status, #websocket-status').first();

        // Screenshot 2: WebSocket status
        const screenshot2 = path.join(screenshotDir, '02_websocket_status.png');
        await page.screenshot({ path: screenshot2, fullPage: true });
        screenshots.push(screenshot2);
        console.log(`  ✓ Screenshot saved: ${screenshot2}`);

        // Check browser console for WebSocket errors
        const consoleLogs = [];
        const consoleErrors = [];

        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            if (msg.type() === 'error') {
                consoleErrors.push(text);
            }
        });

        // Try to create a new ticket/task
        console.log('  - Creating a new ticket/task...');

        // Look for input field or add button
        const addButtons = await page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), [data-testid="add-task"], [data-testid="create-task"]').all();

        if (addButtons.length > 0) {
            console.log(`  - Found ${addButtons.length} potential add buttons`);
            await addButtons[0].click();
            await page.waitForTimeout(1000);

            // Screenshot 3: Add task dialog/form
            const screenshot3 = path.join(screenshotDir, '03_add_task_form.png');
            await page.screenshot({ path: screenshot3, fullPage: true });
            screenshots.push(screenshot3);
            console.log(`  ✓ Screenshot saved: ${screenshot3}`);

            // Try to fill in task details
            const titleInputs = await page.locator('input[placeholder*="title" i], input[name*="title" i], textarea[placeholder*="title" i]').all();
            if (titleInputs.length > 0) {
                await titleInputs[0].fill('E2E Test Task - WebSocket Notification Test');
                await page.waitForTimeout(500);
            }

            const descInputs = await page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i], input[name*="description" i]').all();
            if (descInputs.length > 0) {
                await descInputs[0].fill('Testing WebSocket ticket notification without validation errors');
                await page.waitForTimeout(500);
            }

            // Screenshot 4: Filled form
            const screenshot4 = path.join(screenshotDir, '04_filled_task_form.png');
            await page.screenshot({ path: screenshot4, fullPage: true });
            screenshots.push(screenshot4);
            console.log(`  ✓ Screenshot saved: ${screenshot4}`);

            // Try to save/submit the task
            const submitButtons = await page.locator('button:has-text("Save"), button:has-text("Submit"), button:has-text("Create"), button[type="submit"]').all();
            if (submitButtons.length > 0) {
                await submitButtons[0].click();
                await page.waitForTimeout(2000);

                // Screenshot 5: After task creation
                const screenshot5 = path.join(screenshotDir, '05_after_task_creation.png');
                await page.screenshot({ path: screenshot5, fullPage: true });
                screenshots.push(screenshot5);
                console.log(`  ✓ Screenshot saved: ${screenshot5}`);
            }
        } else {
            console.log('  - No add task button found, trying alternative approach...');

            // Try direct input field
            const queryInputs = await page.locator('input[type="text"], textarea').all();
            if (queryInputs.length > 0) {
                console.log(`  - Found ${queryInputs.length} input fields, using first one`);
                await queryInputs[0].fill('Create a bug ticket for testing WebSocket notifications');
                await page.waitForTimeout(500);

                // Screenshot 3: Input filled
                const screenshot3 = path.join(screenshotDir, '03_input_filled.png');
                await page.screenshot({ path: screenshot3, fullPage: true });
                screenshots.push(screenshot3);
                console.log(`  ✓ Screenshot saved: ${screenshot3}`);

                // Try to submit
                await page.keyboard.press('Enter');
                await page.waitForTimeout(2000);

                // Screenshot 4: After submission
                const screenshot4 = path.join(screenshotDir, '04_after_submission.png');
                await page.screenshot({ path: screenshot4, fullPage: true });
                screenshots.push(screenshot4);
                console.log(`  ✓ Screenshot saved: ${screenshot4}`);
            }
        }

        // Final screenshot
        const screenshot6 = path.join(screenshotDir, '06_final_state.png');
        await page.screenshot({ path: screenshot6, fullPage: true });
        screenshots.push(screenshot6);
        console.log(`  ✓ Screenshot saved: ${screenshot6}`);

        // Wait a bit more to capture any delayed console messages
        await page.waitForTimeout(2000);

        // Check for WebSocket errors in console
        const wsErrors = consoleErrors.filter(err =>
            err.toLowerCase().includes('websocket') ||
            err.toLowerCase().includes('ticket_notification') ||
            err.toLowerCase().includes('unknown message type')
        );

        console.log('\n=== UI Test Results ===');
        console.log(`Total console logs: ${consoleLogs.length}`);
        console.log(`Total console errors: ${consoleErrors.length}`);
        console.log(`WebSocket-related errors: ${wsErrors.length}`);

        if (wsErrors.length > 0) {
            console.log('\n⚠️ WebSocket Errors Found:');
            wsErrors.forEach(err => console.log(`  - ${err}`));
        } else {
            console.log('\n✅ No WebSocket errors detected in console');
        }

        const testPassed = wsErrors.length === 0;
        console.log(`\nUI Test Status: ${testPassed ? 'PASSED ✅' : 'FAILED ❌'}`);

        return { testPassed, screenshots, consoleErrors, wsErrors };

    } catch (error) {
        console.error('❌ UI test failed with error:', error.message);

        // Screenshot of error state
        const errorScreenshot = path.join(screenshotDir, '99_error_state.png');
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        screenshots.push(errorScreenshot);
        console.log(`  ✓ Error screenshot saved: ${errorScreenshot}`);

        return { testPassed: false, screenshots, error: error.message };
    } finally {
        await browser.close();
    }
}

// Run the test
runUITest().then(result => {
    console.log('\n=== Test Complete ===');
    console.log(`Screenshots: ${result.screenshots.length}`);
    result.screenshots.forEach(s => console.log(`  - ${s}`));

    process.exit(result.testPassed ? 0 : 1);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
