import type { Options } from '@wdio/types';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let tauriDriver: ChildProcess | null = null;

export const config: Options.Testrunner = {
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
    },
  },

  specs: ['./tests/tauri/**/*.e2e.ts'],
  exclude: [],

  maxInstances: 1,

  // Connect to tauri-driver
  hostname: '127.0.0.1',
  port: 4444,

  capabilities: [
    {
      browserName: 'wry',
      'tauri:options': {
        application: path.resolve('./src-tauri/target/release/usb-configurator.exe'),
      },
    } as any,
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  // Start tauri-driver before tests
  onPrepare: function () {
    return new Promise<void>((resolve, reject) => {
      console.log('[wdio] Starting tauri-driver...');

      tauriDriver = spawn('tauri-driver', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let resolved = false;

      tauriDriver.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('[tauri-driver]', output);
        if (output.includes('listening') && !resolved) {
          resolved = true;
          resolve();
        }
      });

      tauriDriver.stderr?.on('data', (data) => {
        console.error('[tauri-driver error]', data.toString());
      });

      tauriDriver.on('error', (err) => {
        console.error('Failed to start tauri-driver:', err);
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      // Give it time to start, then resolve anyway
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('[wdio] Proceeding after timeout...');
          resolve();
        }
      }, 5000);
    });
  },

  // Stop tauri-driver after tests
  onComplete: function () {
    if (tauriDriver) {
      console.log('[wdio] Stopping tauri-driver...');
      tauriDriver.kill();
      tauriDriver = null;
    }
  },
};
