import type { Options } from '@wdio/types';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

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

  capabilities: [
    {
      'tauri:options': {
        application: './src-tauri/target/release/usb-configurator.exe',
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
      tauriDriver = spawn('tauri-driver', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      tauriDriver.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('[tauri-driver]', output);
        if (output.includes('listening')) {
          resolve();
        }
      });

      tauriDriver.stderr?.on('data', (data) => {
        console.error('[tauri-driver error]', data.toString());
      });

      tauriDriver.on('error', (err) => {
        console.error('Failed to start tauri-driver:', err);
        reject(err);
      });

      // Give it time to start
      setTimeout(resolve, 3000);
    });
  },

  // Stop tauri-driver after tests
  onComplete: function () {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
  },
};
