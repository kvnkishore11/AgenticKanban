import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const reviewImgDir = '/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c855017b/agents/c855017b/reviewer/review_img';
  const screenshots = [];

  try {
    console.log('Navigating to http://localhost:9214...');
    await page.goto('http://localhost:9214', { waitUntil: 'networkidle' });

    // Wait a bit for WebSocket connection to establish
    await page.waitForTimeout(2000);

    // Screenshot 1: Initial page load with WebSocket connected
    console.log('Capturing 01_websocket_connected.png...');
    const screenshot1 = path.join(reviewImgDir, '01_websocket_connected.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    screenshots.push(screenshot1);

    // Screenshot 2: Try to click on WebSocket status indicator if available
    console.log('Looking for WebSocket status indicator...');
    try {
      // Look for common WebSocket status indicators
      const statusSelectors = [
        '[data-testid*="websocket"]',
        '[class*="websocket"]',
        '[class*="ws-status"]',
        '[class*="connection"]',
        'text=/connected/i',
        'text=/websocket/i'
      ];

      let clicked = false;
      for (const selector of statusSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`Found status element with selector: ${selector}`);
            await element.click();
            await page.waitForTimeout(1000);
            clicked = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      const screenshot2 = path.join(reviewImgDir, '02_websocket_status_details.png');
      await page.screenshot({ path: screenshot2, fullPage: true });
      screenshots.push(screenshot2);
    } catch (error) {
      console.log('Could not interact with WebSocket status:', error.message);
      // Still take screenshot of current state
      const screenshot2 = path.join(reviewImgDir, '02_websocket_status_details.png');
      await page.screenshot({ path: screenshot2, fullPage: true });
      screenshots.push(screenshot2);
    }

    // Screenshot 3: Main kanban board view
    console.log('Capturing 03_kanban_board_loaded.png...');
    const screenshot3 = path.join(reviewImgDir, '03_kanban_board_loaded.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    screenshots.push(screenshot3);

    // Add multiple tickets to test connection stability
    console.log('Adding multiple tickets...');
    const ticketTitles = [
      'Test Ticket 1 - WebSocket Stability',
      'Test Ticket 2 - Connection Test',
      'Test Ticket 3 - Rapid Addition',
      'Test Ticket 4 - Load Testing',
      'Test Ticket 5 - Final Test'
    ];

    for (let i = 0; i < ticketTitles.length; i++) {
      try {
        // Look for common add ticket button selectors
        const addButtonSelectors = [
          'button:has-text("Add")',
          'button:has-text("New")',
          'button:has-text("Create")',
          '[data-testid="add-ticket"]',
          '[data-testid="new-ticket"]',
          '[class*="add-ticket"]',
          '[class*="new-ticket"]'
        ];

        let addButton = null;
        for (const selector of addButtonSelectors) {
          try {
            const btn = await page.locator(selector).first();
            if (await btn.isVisible({ timeout: 1000 })) {
              addButton = btn;
              console.log(`Found add button with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (addButton) {
          await addButton.click();
          await page.waitForTimeout(500);

          // Look for title input field
          const titleInputSelectors = [
            'input[name="title"]',
            'input[placeholder*="title" i]',
            'input[placeholder*="name" i]',
            '[data-testid="ticket-title"]',
            'textarea[name="title"]'
          ];

          let titleInput = null;
          for (const selector of titleInputSelectors) {
            try {
              const input = await page.locator(selector).first();
              if (await input.isVisible({ timeout: 1000 })) {
                titleInput = input;
                console.log(`Found title input with selector: ${selector}`);
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }

          if (titleInput) {
            await titleInput.fill(ticketTitles[i]);
            await page.waitForTimeout(300);

            // Look for submit button
            const submitSelectors = [
              'button:has-text("Save")',
              'button:has-text("Submit")',
              'button:has-text("Create")',
              'button[type="submit"]',
              '[data-testid="submit-ticket"]'
            ];

            for (const selector of submitSelectors) {
              try {
                const btn = await page.locator(selector).first();
                if (await btn.isVisible({ timeout: 1000 })) {
                  await btn.click();
                  console.log(`Added ticket: ${ticketTitles[i]}`);
                  await page.waitForTimeout(500);
                  break;
                }
              } catch (e) {
                // Continue to next selector
              }
            }
          }
        }
      } catch (error) {
        console.log(`Error adding ticket ${i + 1}:`, error.message);
      }
    }

    // Screenshot 4: After adding multiple tickets
    console.log('Capturing 04_adding_multiple_tickets.png...');
    const screenshot4 = path.join(reviewImgDir, '04_adding_multiple_tickets.png');
    await page.screenshot({ path: screenshot4, fullPage: true });
    screenshots.push(screenshot4);

    // Wait a bit and check if WebSocket is still stable
    await page.waitForTimeout(2000);

    // Screenshot 5: WebSocket stable after load
    console.log('Capturing 05_websocket_stable_after_load.png...');
    const screenshot5 = path.join(reviewImgDir, '05_websocket_stable_after_load.png');
    await page.screenshot({ path: screenshot5, fullPage: true });
    screenshots.push(screenshot5);

    console.log('\nAll screenshots captured successfully!');
    console.log(JSON.stringify(screenshots, null, 2));

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    // Capture error screenshot
    const errorScreenshot = path.join(reviewImgDir, 'error_screenshot.png');
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    screenshots.push(errorScreenshot);
    console.log(JSON.stringify(screenshots, null, 2));
  } finally {
    await browser.close();
  }

  // Output final JSON array
  console.log('\n=== FINAL SCREENSHOT PATHS ===');
  console.log(JSON.stringify(screenshots));
})();
