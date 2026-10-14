import { defineConfig, devices } from '@playwright/test';

// End-to-end tests drive the real game in Chromium through the accessibility
// mirror (hidden HTML buttons for every canvas control). E2E_PROD=1 tests the
// production build via `vite preview` instead of the dev server.
const PORT = 4173;
export default defineConfig({
  testDir: 'e2e',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:' + PORT,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    launchOptions: {
      ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}),
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    },
    ...devices['Pixel 7'],
    reducedMotion: 'reduce',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: process.env.E2E_PROD ? 'npx vite preview --port ' + PORT + ' --strictPort' : 'npx vite --port ' + PORT + ' --strictPort',
    url: 'http://localhost:' + PORT,
    reuseExistingServer: !process.env.CI,
    env: { PLAYWRIGHT: '1' },
    timeout: 120000
  }
});
