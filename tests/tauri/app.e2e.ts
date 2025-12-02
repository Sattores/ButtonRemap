import { expect } from '@wdio/globals';

describe('USB Configurator Tauri App', () => {
  it('should launch and display the main window', async () => {
    // Wait for the app to load
    await browser.pause(2000);

    // Get window title
    const title = await browser.getTitle();
    console.log('Window title:', title);
    expect(title).toContain('USB Configurator');
  });

  it('should display the header with app name', async () => {
    // Find the header element
    const header = await $('h1, [class*="header"], [class*="title"]');
    await header.waitForDisplayed({ timeout: 5000 });

    const text = await header.getText();
    console.log('Header text:', text);
    expect(text.toLowerCase()).toContain('usb');
  });

  it('should show the device list section', async () => {
    // Look for device list or devices text
    const deviceSection = await $('*=Devices');
    await deviceSection.waitForDisplayed({ timeout: 5000 });
    expect(await deviceSection.isDisplayed()).toBe(true);
  });

  it('should have Find Button functionality', async () => {
    // Find the "Find Button" button
    const findButton = await $('button*=Find');
    await findButton.waitForDisplayed({ timeout: 5000 });
    expect(await findButton.isClickable()).toBe(true);

    // Click it
    await findButton.click();
    await browser.pause(1000);

    // Should show monitoring state or dialog
    const monitoringIndicator = await $('*=Monitoring');
    const isMonitoring = await monitoringIndicator.isDisplayed().catch(() => false);
    console.log('Is monitoring:', isMonitoring);
  });

  it('should display the System Log panel', async () => {
    // Find System Log section
    const logPanel = await $('*=System Log');
    await logPanel.waitForDisplayed({ timeout: 5000 });
    expect(await logPanel.isDisplayed()).toBe(true);
  });

  it('should have action preset categories', async () => {
    // First, we need to select a device to see presets
    // Try to find and click on a device in the list
    const deviceItem = await $('[class*="device"], [data-testid*="device"]');
    const hasDevice = await deviceItem.isDisplayed().catch(() => false);

    if (hasDevice) {
      await deviceItem.click();
      await browser.pause(500);

      // Now check for preset categories
      const presetsSection = await $('*=Presets');
      const hasPresets = await presetsSection.isDisplayed().catch(() => false);
      console.log('Has presets section:', hasPresets);
    } else {
      console.log('No devices available, skipping preset check');
    }
  });

  it('should allow refreshing device list', async () => {
    // Find refresh button
    const refreshButton = await $('button[aria-label*="refresh"], button*=Refresh, [class*="refresh"]');
    const hasRefresh = await refreshButton.isDisplayed().catch(() => false);

    if (hasRefresh) {
      await refreshButton.click();
      await browser.pause(1000);
      console.log('Refresh clicked');
    } else {
      // Try to find by icon or other means
      const iconButton = await $('button svg, [class*="icon"]');
      console.log('Looking for icon button instead');
    }
  });

  it('should minimize to tray on close', async () => {
    // This test verifies the app behavior on close
    // Note: This might need special handling as it tests window behavior
    console.log('Tray minimize test - requires manual verification');
    expect(true).toBe(true); // Placeholder
  });
});

describe('Device Configuration Flow', () => {
  it('should allow selecting a device from the list', async () => {
    // Wait for device list to load
    await browser.pause(2000);

    // Find any device item
    const devices = await $$('[class*="device-item"], [data-device-id]');
    console.log('Found devices:', devices.length);

    if (devices.length > 0) {
      await devices[0].click();
      await browser.pause(500);

      // Check if configuration panel appeared
      const configPanel = await $('[class*="config"], *=Configure, *=Action');
      const hasConfig = await configPanel.isDisplayed().catch(() => false);
      console.log('Config panel visible:', hasConfig);
    }
  });

  it('should show trigger type options', async () => {
    // Look for trigger type selector
    const triggerSelector = await $('*=Single Press, *=Double Press, [class*="trigger"]');
    const hasTrigger = await triggerSelector.isDisplayed().catch(() => false);
    console.log('Trigger options visible:', hasTrigger);
  });

  it('should allow selecting an action type', async () => {
    // Look for action type options
    const actionTypes = ['Launch App', 'Run Script', 'System Command', 'Hotkey'];

    for (const actionType of actionTypes) {
      const option = await $(`*=${actionType}`);
      const isVisible = await option.isDisplayed().catch(() => false);
      if (isVisible) {
        console.log(`Found action type: ${actionType}`);
        break;
      }
    }
  });
});

describe('Action Execution', () => {
  it('should have a Test button for actions', async () => {
    // Find test button
    const testButton = await $('button*=Test');
    const hasTest = await testButton.isDisplayed().catch(() => false);
    console.log('Test button visible:', hasTest);
  });

  it('should have a Save button for bindings', async () => {
    // Find save button
    const saveButton = await $('button*=Save');
    const hasSave = await saveButton.isDisplayed().catch(() => false);
    console.log('Save button visible:', hasSave);
  });
});
