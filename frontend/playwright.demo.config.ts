import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './demo-e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:8200',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 8200 --bind 127.0.0.1 --directory demo-dist',
    url: 'http://127.0.0.1:8200',
    reuseExistingServer: false,
  },
});
