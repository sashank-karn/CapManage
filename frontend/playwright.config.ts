import type { PlaywrightTestConfig } from '@playwright/test';

const port = Number(process.env.PORT || 3000);

const config: PlaywrightTestConfig = {
  timeout: 30_000,
  testDir: './e2e',
  webServer: {
    command: 'npm run start',
    port,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: `http://localhost:${port}`
  }
};

export default config;
