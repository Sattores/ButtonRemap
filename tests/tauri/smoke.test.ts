/**
 * Tauri App Smoke Test
 *
 * A simple test that verifies:
 * 1. The application executable exists
 * 2. The application launches successfully
 * 3. The application runs without crashing for a few seconds
 * 4. The process can be cleanly terminated
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const APP_PATH = path.resolve('./src-tauri/target/release/usb-configurator.exe');
const TEST_DURATION_MS = 5000; // How long to let the app run

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | string): void {
  try {
    const result = fn();
    if (result === true) {
      results.push({ name, passed: true, message: 'OK' });
      console.log(`  ✓ ${name}`);
    } else {
      results.push({ name, passed: false, message: String(result) });
      console.log(`  ✗ ${name}: ${result}`);
    }
  } catch (error) {
    results.push({ name, passed: false, message: String(error) });
    console.log(`  ✗ ${name}: ${error}`);
  }
}

async function testAsync(name: string, fn: () => Promise<boolean | string>): Promise<void> {
  try {
    const result = await fn();
    if (result === true) {
      results.push({ name, passed: true, message: 'OK' });
      console.log(`  ✓ ${name}`);
    } else {
      results.push({ name, passed: false, message: String(result) });
      console.log(`  ✗ ${name}: ${result}`);
    }
  } catch (error) {
    results.push({ name, passed: false, message: String(error) });
    console.log(`  ✗ ${name}: ${error}`);
  }
}

function killExistingProcesses(): void {
  try {
    execSync('taskkill /F /IM usb-configurator.exe 2>nul', { stdio: 'ignore' });
  } catch {
    // Process might not be running, that's OK
  }
}

async function runTests(): Promise<void> {
  console.log('\n========================================');
  console.log('  USB Configurator - Smoke Test');
  console.log('========================================\n');

  // Cleanup before tests
  console.log('Cleaning up existing processes...\n');
  killExistingProcesses();
  await new Promise(r => setTimeout(r, 1000));

  // Test 1: Executable exists
  console.log('1. Checking prerequisites...');
  test('Executable exists', () => {
    if (!fs.existsSync(APP_PATH)) {
      return `File not found: ${APP_PATH}`;
    }
    return true;
  });

  test('Executable is a file', () => {
    const stats = fs.statSync(APP_PATH);
    if (!stats.isFile()) {
      return 'Path is not a file';
    }
    return true;
  });

  // Test 2: Application launches
  console.log('\n2. Testing application launch...');

  let appProcess: ChildProcess | null = null;
  let launchError: string | null = null;
  let processExitCode: number | null = null;
  let processRunning = false;
  let stdoutData = '';
  let stderrData = '';

  await testAsync('Application starts without immediate crash', async () => {
    return new Promise((resolve) => {
      appProcess = spawn(APP_PATH, [], {
        stdio: 'pipe',
        detached: false,
      });

      appProcess.stdout?.on('data', (data) => {
        stdoutData += data.toString();
      });

      appProcess.stderr?.on('data', (data) => {
        stderrData += data.toString();
      });

      appProcess.on('error', (err) => {
        launchError = err.message;
        resolve(`Failed to start: ${err.message}`);
      });

      appProcess.on('exit', (code) => {
        processExitCode = code;
        processRunning = false;
      });

      // Wait 2 seconds to see if it crashes immediately
      setTimeout(() => {
        if (appProcess && !appProcess.killed && processExitCode === null) {
          processRunning = true;
          resolve(true);
        } else if (processExitCode !== null) {
          resolve(`Process exited with code ${processExitCode}`);
        } else if (launchError) {
          resolve(launchError);
        } else {
          resolve('Unknown error');
        }
      }, 2000);
    });
  });

  // Test 3: Application runs stably
  if (processRunning) {
    console.log(`\n3. Testing application stability (${TEST_DURATION_MS / 1000}s)...`);

    await testAsync('Application runs without crashing', async () => {
      return new Promise((resolve) => {
        const startTime = Date.now();

        const checkInterval = setInterval(() => {
          if (processExitCode !== null) {
            clearInterval(checkInterval);
            resolve(`Process crashed with exit code ${processExitCode}`);
          } else if (Date.now() - startTime >= TEST_DURATION_MS) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 500);
      });
    });

    // Test 4: Check if window is visible (using tasklist)
    console.log('\n4. Verifying process state...');

    test('Process is listed in tasklist', () => {
      try {
        const output = execSync('tasklist /FI "IMAGENAME eq usb-configurator.exe" /FO CSV /NH', {
          encoding: 'utf8',
        });
        if (output.includes('usb-configurator.exe')) {
          return true;
        }
        return 'Process not found in tasklist';
      } catch {
        return 'Failed to query tasklist';
      }
    });

    // Cleanup
    console.log('\n5. Cleanup...');

    await testAsync('Application terminates cleanly', async () => {
      return new Promise((resolve) => {
        if (appProcess && !appProcess.killed) {
          appProcess.on('exit', () => {
            resolve(true);
          });

          // Try graceful kill first
          appProcess.kill('SIGTERM');

          // Force kill after 3 seconds if still running
          setTimeout(() => {
            if (appProcess && !appProcess.killed) {
              appProcess.kill('SIGKILL');
            }
          }, 3000);

          // Timeout after 5 seconds
          setTimeout(() => {
            resolve('Process did not terminate in time');
          }, 5000);
        } else {
          resolve(true);
        }
      });
    });
  }

  // Summary
  console.log('\n========================================');
  console.log('  Test Summary');
  console.log('========================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${results.length}`);

  if (failed > 0) {
    console.log('\n  Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n========================================\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
