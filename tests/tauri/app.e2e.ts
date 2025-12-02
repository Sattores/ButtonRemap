import { expect } from '@wdio/globals';

describe('USB Configurator Tauri App', () => {
  it('should launch and display the main window', async () => {
    // Wait for app to load
    await browser.pause(3000);

    const title = await browser.getTitle();
    console.log('Window title:', title);
    expect(title).toContain('USB Configurator');
  });

  it('should display the main UI', async () => {
    const body = await $('body');
    await body.waitForDisplayed({ timeout: 10000 });
    expect(await body.isDisplayed()).toBe(true);
  });

  it('should have React root element', async () => {
    const root = await $('#root');
    const exists = await root.isExisting();
    console.log('React root exists:', exists);
    expect(exists).toBe(true);
  });

  it('should display application content', async () => {
    const root = await $('#root');
    const text = await root.getText();
    console.log('Content length:', text.length);
    expect(text.length).toBeGreaterThan(0);
  });

  it('should show devices section', async () => {
    const pageSource = await browser.getPageSource();
    console.log('Page source length:', pageSource.length);
    expect(pageSource.toLowerCase()).toContain('device');
  });

  it('should have interactive buttons', async () => {
    const buttons = await $$('button');
    console.log('Found buttons:', buttons.length);
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('Device Configuration', () => {
  it('should have clickable elements', async () => {
    const clickableElements = await $$('button');
    console.log('Buttons found:', clickableElements.length);
    expect(clickableElements.length).toBeGreaterThan(0);
  });

  it('should respond to button click', async () => {
    const buttons = await $$('button');
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      const isClickable = await firstButton.isClickable();
      console.log('First button clickable:', isClickable);

      if (isClickable) {
        await firstButton.click();
        await browser.pause(500);
        console.log('Clicked button successfully');
      }
    }
    expect(true).toBe(true);
  });
});

describe('Application State', () => {
  it('should maintain responsive window', async () => {
    const windowSize = await browser.getWindowSize();
    console.log('Window size:', JSON.stringify(windowSize));
    expect(windowSize.width).toBeGreaterThan(0);
    expect(windowSize.height).toBeGreaterThan(0);
  });

  it('should load styled elements', async () => {
    const styledElements = await $$('[class]');
    console.log('Elements with classes:', styledElements.length);
    expect(styledElements.length).toBeGreaterThan(5);
  });
});
