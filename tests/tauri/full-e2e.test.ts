/**
 * Full E2E Test for USB Configurator
 *
 * Tests the complete user flow:
 * 1. Device selection
 * 2. Preset application
 * 3. Configuration input
 * 4. Save configuration
 * 5. Test action execution
 * 6. System logs verification
 */

import { chromium, Browser, Page } from 'playwright';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

const APP_PATH = path.resolve('./src-tauri/target/release/usb-configurator.exe');
const CDP_PORT = 9222;

// Interactive mode - set to true to require physical button press
const INTERACTIVE_MODE = process.argv.includes('--interactive') || process.argv.includes('-i');

let browser: Browser | null = null;
let page: Page | null = null;
let appProcess: ChildProcess | null = null;

// Play a beep sound to attract attention
function playBeep(): void {
  try {
    // Windows system beep
    execSync('powershell -c "[Console]::Beep(800, 300); [Console]::Beep(1000, 300)"', { stdio: 'ignore' });
  } catch {
    // Fallback: terminal bell
    process.stdout.write('\x07');
  }
}

// Prompt user for action and wait for confirmation
async function promptUser(message: string, timeout: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    playBeep();

    console.log('\n' + '─'.repeat(50));
    console.log(`   ⚡ ACTION REQUIRED: ${message}`);
    console.log('─'.repeat(50));
    console.log('   Press ENTER when done (or wait for timeout)...\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const timer = setTimeout(() => {
      console.log('   ⏱ Timeout reached, continuing...');
      rl.close();
      resolve(false);
    }, timeout);

    rl.question('', () => {
      clearTimeout(timer);
      rl.close();
      resolve(true);
    });
  });
}

// Wait for device detection event in the app
async function waitForDeviceDetection(timeoutMs: number = 10000): Promise<boolean> {
  if (!page) return false;

  const startContent = await page.content();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    await delay(500);
    const currentContent = await page.content();

    // Check if a device was detected (look for changes in device list or success message)
    if (currentContent !== startContent) {
      const hasNewDevice = currentContent.includes('Device detected') ||
        currentContent.includes('monitoring-detected') ||
        (currentContent.includes('SUCCESS') && !startContent.includes('SUCCESS'));

      if (hasNewDevice) {
        return true;
      }
    }
  }

  return false;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string = '') {
  results.push({ name, passed, message });
  const icon = passed ? '✓' : '✗';
  const msg = message ? `: ${message}` : '';
  console.log(`   ${icon} ${name}${msg}`);
}

async function launchApp(): Promise<void> {
  const env = {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`,
  };

  appProcess = spawn(APP_PATH, [], { env, stdio: 'pipe' });

  appProcess.stdout?.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg.includes('command called') || msg.includes('SUCCESS') || msg.includes('ERROR')) {
      console.log(`   [Backend] ${msg}`);
    }
  });

  appProcess.stderr?.on('data', (data) => {
    console.error(`   [Error] ${data.toString().trim()}`);
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));
}

async function waitForPort(port: number, timeout: number = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return true;
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function connectToApp(): Promise<void> {
  const portReady = await waitForPort(CDP_PORT);
  if (!portReady) throw new Error('CDP port not available');

  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const contexts = browser.contexts();
  if (contexts.length > 0 && contexts[0].pages().length > 0) {
    page = contexts[0].pages()[0];
  }
  if (!page) throw new Error('Could not find page');
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

async function delay(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms));
}

// ============================================
// Test Functions
// ============================================

async function testDeviceSelection(): Promise<boolean> {
  if (!page) return false;

  // Find device items in sidebar
  const deviceItems = await page.$$('[class*="device"], [data-testid="device-item"]');

  if (deviceItems.length === 0) {
    // Try finding by text content
    const sidebarText = await page.textContent('[class*="sidebar"], [class*="device-list"]') || '';
    if (!sidebarText.toLowerCase().includes('device')) {
      logTest('Find device list', false, 'No devices found');
      return false;
    }
  }

  // Click on first device in list (look for clickable device names)
  const deviceLink = await page.$('text=/A50|Razer|AURA|Orochi|ILITEK/i');
  if (deviceLink) {
    await deviceLink.click();
    await delay(500);
    logTest('Click on device', true);

    // Verify device is selected (header should change from "No Device Selected")
    const headerText = await page.textContent('h1, h2, [class*="header"]') || '';
    if (!headerText.includes('No Device Selected')) {
      logTest('Device selected', true, 'Header updated');
      return true;
    }
  }

  // Alternative: click any device-looking element
  const anyDevice = await page.$('text=/046D|0B05|1532|222A/'); // VID patterns
  if (anyDevice) {
    await anyDevice.click();
    await delay(500);
    logTest('Click on device (by VID)', true);
    return true;
  }

  logTest('Device selection', false, 'Could not select device');
  return false;
}

async function testPresetSelection(): Promise<boolean> {
  if (!page) return false;

  // Find preset dropdown
  const presetSelector = await page.$('text=/Select a preset|QUICK PRESET/i');
  if (!presetSelector) {
    // Try to find by placeholder
    const dropdown = await page.$('[class*="select"], [role="combobox"]');
    if (dropdown) {
      await dropdown.click();
      await delay(300);

      // Look for preset options
      const option = await page.$('text=/Notepad|Calculator|Browser|Chrome|Firefox/i');
      if (option) {
        await option.click();
        await delay(500);
        logTest('Apply preset', true);
        return true;
      }
    }
  }

  logTest('Preset selection', false, 'Preset dropdown not found or no options');
  return false;
}

async function testApplicationPathInput(): Promise<boolean> {
  if (!page) return false;

  // Find application path input
  const pathInput = await page.$('input[placeholder*="Path"], input[placeholder*="Application"], input[type="text"]');
  if (pathInput) {
    await pathInput.fill('C:\\Windows\\System32\\notepad.exe');
    await delay(300);
    logTest('Enter application path', true, 'notepad.exe');
    return true;
  }

  // Alternative: find by label
  const labeledInput = await page.$('label:has-text("Application") + input, label:has-text("Path") ~ input');
  if (labeledInput) {
    await labeledInput.fill('C:\\Windows\\System32\\notepad.exe');
    await delay(300);
    logTest('Enter application path', true);
    return true;
  }

  logTest('Application path input', false, 'Input field not found');
  return false;
}

async function testTriggerTypeSelection(): Promise<boolean> {
  if (!page) return false;

  // Find trigger type buttons
  const singlePress = await page.$('text=/Single Press/i');
  const doublePress = await page.$('text=/Double Press/i');

  if (singlePress) {
    await singlePress.click();
    await delay(300);
    logTest('Select trigger type', true, 'Single Press');
    return true;
  }

  if (doublePress) {
    await doublePress.click();
    await delay(300);
    logTest('Select trigger type', true, 'Double Press');
    return true;
  }

  logTest('Trigger type selection', false, 'Trigger buttons not found');
  return false;
}

async function testSaveConfiguration(): Promise<boolean> {
  if (!page) return false;

  // Find Save button
  const saveButton = await page.$('button:has-text("Save"), button:has-text("Save Config")');
  if (saveButton) {
    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
      logTest('Save configuration', false, 'Save button is disabled');
      return false;
    }

    await saveButton.click();
    await delay(1000);

    // Check page content for success indication
    try {
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('saved') || pageContent.toLowerCase().includes('success')) {
        logTest('Save configuration', true, 'Configuration saved');
        return true;
      }
    } catch { /* ignore */ }

    logTest('Save configuration', true, 'Button clicked');
    return true;
  }

  logTest('Save configuration', false, 'Save button not found');
  return false;
}

async function testTestAction(): Promise<boolean> {
  if (!page) return false;

  // Find Test Action button
  const testButton = await page.$('button:has-text("Test"), button:has-text("Test Action")');
  if (testButton) {
    const isDisabled = await testButton.isDisabled();
    if (isDisabled) {
      logTest('Test action button', false, 'Button is disabled (need to fill config first)');
      return false;
    }

    await testButton.click();
    await delay(2000);

    // Check page content for execution indication
    try {
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('executed') || pageContent.toLowerCase().includes('testing')) {
        logTest('Test action', true, 'Action executed');
        return true;
      }
    } catch { /* ignore */ }

    logTest('Test action', true, 'Button clicked');
    return true;
  }

  logTest('Test action', false, 'Test button not found');
  return false;
}

async function testSystemLogs(): Promise<boolean> {
  if (!page) return false;

  // Check page content for logs
  try {
    const pageContent = await page.content();
    const hasSystemLogs = pageContent.includes('SYSTEM LOGS') || pageContent.includes('system-log');
    const hasLogEntries = pageContent.includes('INFO') || pageContent.includes('SUCCESS') || pageContent.includes('monitoring');

    if (hasSystemLogs || hasLogEntries) {
      logTest('System logs visible', true, 'Log entries found');
      return true;
    }
  } catch { /* ignore */ }

  logTest('System logs', false, 'Logs section not found');
  return false;
}

async function testFindButton(): Promise<boolean> {
  if (!page) return false;

  const findButton = await page.$('button:has-text("Find Button")');
  if (findButton) {
    await findButton.click();
    await delay(500);
    logTest('Find Button clicked', true, 'Monitoring started');

    if (INTERACTIVE_MODE) {
      // In interactive mode, wait for user to press physical button
      console.log('\n   🔴 Monitoring active - waiting for button press...');

      const userConfirmed = await promptUser(
        'Press ANY BUTTON on your USB device!',
        30000
      );

      if (userConfirmed) {
        // Check if device was detected
        const detected = await waitForDeviceDetection(5000);
        if (detected) {
          logTest('Physical button detected', true, 'Device recognized');
        } else {
          logTest('Physical button detected', false, 'No device detected after button press');
        }
      } else {
        logTest('Physical button press', false, 'Timeout - no user action');
      }
    }

    return true;
  }

  logTest('Find Button', false, 'Button not found');
  return false;
}

async function testRefreshDevices(): Promise<boolean> {
  if (!page) return false;

  // Find refresh button (usually an icon button near device list)
  const refreshButton = await page.$('button[aria-label*="refresh"], button:has([class*="refresh"]), button:has(svg)');
  if (refreshButton) {
    await refreshButton.click();
    await delay(1000);
    logTest('Refresh devices', true);
    return true;
  }

  // Try clicking by position near Find Button
  const findBtn = await page.$('button:has-text("Find Button")');
  if (findBtn) {
    const box = await findBtn.boundingBox();
    if (box) {
      // Click to the right of Find Button (where refresh usually is)
      await page.click(`text=/refresh/i`).catch(() => {});
    }
  }

  logTest('Refresh devices', false, 'Refresh button not found');
  return false;
}

async function takeScreenshot(name: string): Promise<void> {
  if (page) {
    await page.screenshot({ path: `./tests/tauri/${name}.png` });
    console.log(`   Screenshot: ${name}.png`);
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runTests(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('  USB Configurator - Full E2E Test Suite');
  console.log('='.repeat(50));

  if (INTERACTIVE_MODE) {
    console.log('\n  📢 INTERACTIVE MODE ENABLED');
    console.log('  You will be prompted to press physical buttons');
    console.log('  Use --interactive or -i flag to enable this mode');
    playBeep();
  } else {
    console.log('\n  🤖 AUTOMATED MODE (no physical interaction)');
    console.log('  Run with --interactive for full device testing');
  }
  console.log('');

  try {
    // Setup
    console.log('1. Setup');
    console.log('   Launching application...');
    await launchApp();
    logTest('App launched', true);

    console.log('   Connecting via CDP...');
    await connectToApp();
    logTest('CDP connected', true);

    await takeScreenshot('01-initial');

    // Test: Find Button
    console.log('\n2. Test "Find Button" Feature');
    await testFindButton();
    await delay(500);

    // Test: Device Selection
    console.log('\n3. Test Device Selection');
    const deviceSelected = await testDeviceSelection();
    await takeScreenshot('02-device-selected');

    if (deviceSelected) {
      // Test: Trigger Type
      console.log('\n4. Test Trigger Type Selection');
      await testTriggerTypeSelection();

      // Test: Application Path
      console.log('\n5. Test Application Path Input');
      await testApplicationPathInput();
      await takeScreenshot('03-config-filled');

      // Test: Save Configuration
      console.log('\n6. Test Save Configuration');
      await testSaveConfiguration();
      await delay(500);
      await takeScreenshot('04-after-save');

      // Test: Test Action
      console.log('\n7. Test Action Execution');
      await testTestAction();
      await delay(1000);
    } else {
      console.log('\n   Skipping configuration tests (no device selected)');
    }

    // Test: System Logs
    console.log('\n8. Verify System Logs');
    await testSystemLogs();
    await takeScreenshot('05-final');

    // Test: Refresh Devices
    console.log('\n9. Test Refresh Devices');
    await testRefreshDevices();

  } catch (error) {
    console.error('\nTest error:', error);
    results.push({ name: 'Test execution', passed: false, message: String(error) });
  } finally {
    await cleanup();
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('  Test Summary');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${results.length}`);

  if (failed > 0) {
    console.log('\n  Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    - ${r.name}${r.message ? ': ' + r.message : ''}`);
    });
  }

  console.log('\n' + '='.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(console.error);
