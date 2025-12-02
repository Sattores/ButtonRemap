/**
 * Tauri E2E Tests using Playwright with CDP connection to WebView2
 *
 * This approach:
 * 1. Launches the Tauri app with remote debugging enabled
 * 2. Connects Playwright via Chrome DevTools Protocol (CDP)
 * 3. Tests the actual running application
 */

import { chromium, Browser, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const APP_PATH = path.resolve('./src-tauri/target/release/usb-configurator.exe');
const CDP_PORT = 9222;

let browser: Browser | null = null;
let page: Page | null = null;
let appProcess: ChildProcess | null = null;

async function launchApp(): Promise<void> {
  // Set environment variable to enable remote debugging in WebView2
  // This must be set BEFORE the WebView2 process starts
  const env = {
    ...process.env,
    // WebView2 additional browser arguments for remote debugging
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
    // Alternative env var name used by some WebView2 versions
    WEBVIEW2_BROWSER_ARGS: `--remote-debugging-port=${CDP_PORT}`,
  };

  console.log(`   Setting CDP port: ${CDP_PORT}`);
  console.log(`   App path: ${APP_PATH}`);

  appProcess = spawn(APP_PATH, [], {
    env,
    stdio: 'pipe',
    // Detach to ensure proper env inheritance on Windows
    windowsHide: false,
  });

  appProcess.stdout?.on('data', (data) => {
    console.log('[App]', data.toString());
  });

  appProcess.stderr?.on('data', (data) => {
    console.error('[App Error]', data.toString());
  });

  // Wait for app to start
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

async function waitForPort(port: number, timeout: number = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        console.log(`   CDP endpoint available at port ${port}`);
        return true;
      }
    } catch {
      // Port not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function connectToApp(): Promise<void> {
  console.log(`   Waiting for CDP port ${CDP_PORT}...`);

  const portReady = await waitForPort(CDP_PORT, 15000);
  if (!portReady) {
    throw new Error(`CDP port ${CDP_PORT} not available after 15 seconds. WebView2 may not support remote debugging via env var.`);
  }

  // Connect to the running WebView2 instance via CDP
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);

  // Get existing contexts and pages
  const contexts = browser.contexts();
  if (contexts.length > 0) {
    const pages = contexts[0].pages();
    if (pages.length > 0) {
      page = pages[0];
    }
  }

  if (!page) {
    throw new Error('Could not find page in browser context');
  }
}

async function cleanup(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
  if (appProcess) {
    appProcess.kill();
    appProcess = null;
  }
}

// Test runner
async function runTests(): Promise<void> {
  console.log('Starting Tauri E2E Tests with Playwright CDP...\n');

  try {
    console.log('1. Launching application...');
    await launchApp();
    console.log('   ✓ App launched\n');

    console.log('2. Connecting via CDP...');
    await connectToApp();
    console.log('   ✓ Connected to WebView2\n');

    if (!page) {
      throw new Error('Page not available');
    }

    // Test 1: Window title
    console.log('3. Testing window title...');
    const title = await page.title();
    console.log(`   Title: "${title}"`);
    if (title.includes('USB Configurator')) {
      console.log('   ✓ Title test passed\n');
    } else {
      console.log('   ✗ Title test failed\n');
    }

    // Test 2: Check for main content
    console.log('4. Testing main content...');
    const content = await page.content();
    console.log(`   Content length: ${content.length} chars`);
    if (content.length > 100) {
      console.log('   ✓ Content test passed\n');
    } else {
      console.log('   ✗ Content test failed (page might be empty)\n');
    }

    // Test 3: Check for buttons
    console.log('5. Testing interactive elements...');
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} buttons`);
    if (buttons.length > 0) {
      console.log('   ✓ Buttons test passed\n');
    } else {
      console.log('   ✗ Buttons test failed\n');
    }

    // Test 4: Check for device-related content
    console.log('6. Testing device section...');
    const hasDeviceText = content.toLowerCase().includes('device');
    console.log(`   Contains "device": ${hasDeviceText}`);
    if (hasDeviceText) {
      console.log('   ✓ Device section test passed\n');
    } else {
      console.log('   ✗ Device section test failed\n');
    }

    // Test 5: Take screenshot
    console.log('7. Taking screenshot...');
    await page.screenshot({ path: './tests/tauri/screenshot.png' });
    console.log('   ✓ Screenshot saved to tests/tauri/screenshot.png\n');

    // Test 6: Click interaction
    console.log('8. Testing button click...');
    try {
      // Find a clickable button (not system buttons)
      const appButtons = await page.$$('button:not([aria-label="Minimize"]):not([aria-label="Maximize"]):not([aria-label="Close"])');
      console.log(`   Found ${appButtons.length} app buttons`);

      if (appButtons.length > 0) {
        const firstButton = appButtons[0];
        const buttonText = await firstButton.textContent();
        console.log(`   Clicking button: "${buttonText?.trim() || 'unnamed'}"`);
        await firstButton.click();
        await new Promise(r => setTimeout(r, 1000));
        console.log('   ✓ Button click executed\n');
      } else {
        console.log('   ⚠ No app buttons to click\n');
      }
    } catch (e) {
      console.log(`   ✗ Button click failed: ${e}\n`);
    }

    // Test 7: Check for specific UI elements
    console.log('9. Checking UI structure...');
    const hasHeader = await page.$('header, [role="banner"], .header');
    const hasDeviceList = content.toLowerCase().includes('device') || content.toLowerCase().includes('usb');
    console.log(`   Has header-like element: ${!!hasHeader}`);
    console.log(`   Has device/USB content: ${hasDeviceList}`);
    if (hasDeviceList) {
      console.log('   ✓ UI structure check passed\n');
    }

    // Test 8: Take final screenshot after interaction
    console.log('10. Taking final screenshot...');
    await page.screenshot({ path: './tests/tauri/screenshot-after.png' });
    console.log('   ✓ Final screenshot saved\n');

    console.log('All tests completed!');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await cleanup();
  }
}

// Run tests
runTests().catch(console.error);
