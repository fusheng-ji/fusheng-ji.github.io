import { defineConfig } from "@playwright/test";

const viewports = [
  ["desktop-1440", 1440, 900],
  ["desktop-1024", 1024, 900],
  ["desktop-901", 901, 900],
  ["mobile-900", 900, 900],
  ["tablet-768", 768, 900],
  ["mobile-390", 390, 844],
];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: viewports.map(([name, width, height]) => ({
    name,
    use: { viewport: { width, height } },
  })),
  webServer: {
    command: "python3 -m http.server 4173 -d _site",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
