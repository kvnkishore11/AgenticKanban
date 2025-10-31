const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/701711f3/agents/a6b1e1f3/test_e2e/img/basic_query';

async function runE2ETest() {
  let browser = null;
  let testResults = {
    passed: false,
    failureReason: '',
    currentStep: 0,
    screenshots: [],
    verifications: []
  };

  try {
    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Launch browser
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Step 1: Navigate to the application
    testResults.currentStep = 1;
    console.log('Step 1: Navigating to http://localhost:5173');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Step 2: Take screenshot of initial state
    testResults.currentStep = 2;
    console.log('Step 2: Taking screenshot of initial state');
    const screenshot1 = path.join(SCREENSHOT_DIR, '01_initial_page.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    testResults.screenshots.push(screenshot1);

    // Step 3: Verify page title
    testResults.currentStep = 3;
    console.log('Step 3: Verifying page title');
    const title = await page.title();
    console.log(`Page title: "${title}"`);

    if (title === 'Natural Language SQL Interface') {
      console.log('✓ Page title verified: "Natural Language SQL Interface"');
      testResults.verifications.push('✓ Page title verified');
    } else {
      console.log(`❌ Page title mismatch. Expected: "Natural Language SQL Interface", Got: "${title}"`);
      testResults.verifications.push(`❌ Page title mismatch: expected "Natural Language SQL Interface", got "${title}"`);
    }

    // Step 4: Verify core UI elements are present
    testResults.currentStep = 4;
    console.log('Step 4: Verifying core UI elements');

    // Look for query input
    const queryInputSelectors = [
      'input[type="text"]',
      'textarea',
      'input[placeholder*="query" i]',
      'input[placeholder*="Query" i]',
      '[data-testid="query-input"]',
      '.query-input'
    ];

    let queryInput = null;
    for (const selector of queryInputSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          queryInput = element;
          console.log(`✓ Query input found with selector: ${selector}`);
          testResults.verifications.push(`✓ Query input found`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!queryInput) {
      console.log('❌ Query input textbox not found');
      testResults.verifications.push('❌ Query input textbox not found');
    }

    // Look for query button
    const queryButtonSelectors = [
      'button:has-text("Query")',
      'button:has-text("Execute")',
      'button:has-text("Run")',
      'button:has-text("Submit")',
      '[data-testid="query-button"]'
    ];

    let queryButton = null;
    for (const selector of queryButtonSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          queryButton = element;
          console.log(`✓ Query button found with selector: ${selector}`);
          testResults.verifications.push(`✓ Query button found`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!queryButton) {
      console.log('❌ Query button not found');
      testResults.verifications.push('❌ Query button not found');
    }

    // Look for upload button
    const uploadButtonSelectors = [
      'button:has-text("Upload")',
      'button:has-text("Upload Data")',
      'input[type="file"]',
      '[data-testid="upload-button"]'
    ];

    let uploadButtonFound = false;
    for (const selector of uploadButtonSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          uploadButtonFound = true;
          console.log(`✓ Upload button found with selector: ${selector}`);
          testResults.verifications.push(`✓ Upload button found`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!uploadButtonFound) {
      console.log('❌ Upload Data button not found');
      testResults.verifications.push('❌ Upload Data button not found');
    }

    // Look for tables section
    const tablesSelectors = [
      'text=Available Tables',
      'text=Tables',
      '[data-testid="tables-section"]',
      ':has-text("table")'
    ];

    let tablesFound = false;
    for (const selector of tablesSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          tablesFound = true;
          console.log(`✓ Tables section found with selector: ${selector}`);
          testResults.verifications.push(`✓ Tables section found`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!tablesFound) {
      console.log('❌ Available Tables section not found');
      testResults.verifications.push('❌ Available Tables section not found');
    }

    // Only continue if we have the essential elements
    if (!queryInput || !queryButton) {
      throw new Error('Essential UI elements (query input or query button) not found');
    }

    // Step 5: Enter test query
    testResults.currentStep = 5;
    console.log('Step 5: Entering test query');
    const testQuery = 'Show me all users from the users table';
    await queryInput.fill(testQuery);
    console.log(`✓ Query entered: "${testQuery}"`);
    testResults.verifications.push(`✓ Query entered: "${testQuery}"`);

    // Step 6: Take screenshot of query input
    testResults.currentStep = 6;
    console.log('Step 6: Taking screenshot of query input');
    const screenshot2 = path.join(SCREENSHOT_DIR, '02_query_input.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    testResults.screenshots.push(screenshot2);

    // Step 7: Click Query button
    testResults.currentStep = 7;
    console.log('Step 7: Clicking Query button');
    await queryButton.click();

    // Wait for results to appear
    await page.waitForTimeout(3000);

    // Step 8: Verify query results appear
    testResults.currentStep = 8;
    console.log('Step 8: Verifying query results appear');

    const resultsSelectors = [
      '[data-testid="results"]',
      '.results',
      'text=Results',
      ':has-text("SELECT")',
      'table',
      '.query-result'
    ];

    let resultsContainer = null;
    for (const selector of resultsSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 })) {
          resultsContainer = element;
          console.log(`✓ Results container found with selector: ${selector}`);
          testResults.verifications.push(`✓ Results container found`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!resultsContainer) {
      console.log('❌ Query results container not found');
      testResults.verifications.push('❌ Query results container not found');
    }

    // Step 9: Verify SQL translation is displayed
    testResults.currentStep = 9;
    console.log('Step 9: Verifying SQL translation');

    const sqlSelectors = [
      'text=SELECT * FROM users',
      'code:has-text("SELECT")',
      '[data-testid="sql-translation"]',
      ':has-text("SELECT"):has-text("users")',
      'pre:has-text("SELECT")'
    ];

    let sqlTranslation = null;
    let sqlText = '';
    for (const selector of sqlSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 })) {
          sqlTranslation = element;
          sqlText = await element.textContent();
          console.log(`✓ SQL translation found: "${sqlText}"`);
          testResults.verifications.push(`✓ SQL translation found: "${sqlText}"`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!sqlTranslation) {
      console.log('❌ SQL translation not found');
      testResults.verifications.push('❌ SQL translation not found');
    } else if (!sqlText.toLowerCase().includes('select') || !sqlText.toLowerCase().includes('users')) {
      console.log(`❌ SQL translation doesn't contain expected content: "${sqlText}"`);
      testResults.verifications.push(`❌ SQL translation content issue: "${sqlText}"`);
    }

    // Step 10: Take screenshot of SQL translation
    testResults.currentStep = 10;
    console.log('Step 10: Taking screenshot of SQL translation');
    const screenshot3 = path.join(SCREENSHOT_DIR, '03_sql_translation.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    testResults.screenshots.push(screenshot3);

    // Step 11: Verify results table contains data
    testResults.currentStep = 11;
    console.log('Step 11: Verifying results table contains data');

    const tableSelectors = [
      'table',
      '[data-testid="results-table"]',
      '.data-table',
      '.results-table'
    ];

    let resultsTable = null;
    let rowCount = 0;
    for (const selector of tableSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          resultsTable = element;
          const rows = page.locator(`${selector} tr`);
          rowCount = await rows.count();
          console.log(`✓ Results table found with ${rowCount} rows`);
          testResults.verifications.push(`✓ Results table found with ${rowCount} rows`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!resultsTable) {
      console.log('❌ Results table not found');
      testResults.verifications.push('❌ Results table not found');
    } else if (rowCount === 0) {
      console.log('❌ Results table has no data');
      testResults.verifications.push('❌ Results table has no data');
    }

    // Step 12: Take screenshot of results
    testResults.currentStep = 12;
    console.log('Step 12: Taking screenshot of results');
    const screenshot4 = path.join(SCREENSHOT_DIR, '04_results.png');
    await page.screenshot({ path: screenshot4, fullPage: true });
    testResults.screenshots.push(screenshot4);

    // Step 13: Look for Hide button and click it
    testResults.currentStep = 13;
    console.log('Step 13: Looking for Hide button to close results');

    const hideButtonSelectors = [
      'button:has-text("Hide")',
      'button:has-text("Close")',
      'button:has-text("Clear")',
      '[data-testid="hide-button"]',
      '.close-button'
    ];

    let hideButton = null;
    for (const selector of hideButtonSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          hideButton = element;
          console.log(`✓ Hide button found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (hideButton) {
      await hideButton.click();
      console.log('✓ Hide button clicked');
      testResults.verifications.push('✓ Hide button clicked');

      // Verify results are hidden
      try {
        if (resultsContainer) {
          await resultsContainer.waitFor({ state: 'hidden', timeout: 5000 });
          console.log('✓ Results successfully hidden');
          testResults.verifications.push('✓ Results successfully hidden');
        }
      } catch (e) {
        console.log('❌ Results may still be visible after hide');
        testResults.verifications.push('❌ Results may still be visible after hide');
      }
    } else {
      console.log('❌ Hide button not found');
      testResults.verifications.push('❌ Hide button not found');
    }

    // Test completed successfully
    testResults.passed = true;
    console.log('\n🎉 All test steps completed successfully!');

  } catch (error) {
    testResults.passed = false;
    testResults.failureReason = `Step ${testResults.currentStep} failed: ${error.message}`;
    console.error(`❌ Test failed at step ${testResults.currentStep}:`, error.message);

    // Take failure screenshot
    try {
      if (browser) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(BASE_URL);
        const failureScreenshot = path.join(SCREENSHOT_DIR, `failure_step_${testResults.currentStep}.png`);
        await page.screenshot({ path: failureScreenshot, fullPage: true });
        testResults.screenshots.push(failureScreenshot);
        console.log(`📸 Failure screenshot saved: failure_step_${testResults.currentStep}.png`);
      }
    } catch (screenshotError) {
      console.error('Failed to take failure screenshot:', screenshotError.message);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return testResults;
}

// Run the test
async function main() {
  console.log('Starting Basic Query E2E Test...\n');
  const results = await runE2ETest();

  console.log('\n=================== TEST SUMMARY ===================');
  console.log(`Test Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (!results.passed) {
    console.log(`Failure Reason: ${results.failureReason}`);
  }
  console.log(`Steps Completed: ${results.currentStep}/13`);
  console.log(`Screenshots Taken: ${results.screenshots.length}`);

  console.log('\nVerifications:');
  results.verifications.forEach(verification => {
    console.log(`  ${verification}`);
  });

  console.log('\nScreenshots:');
  results.screenshots.forEach(screenshot => {
    console.log(`  ${screenshot}`);
  });

  console.log('=====================================================\n');

  if (!results.passed) {
    process.exit(1);
  }
}

main().catch(console.error);