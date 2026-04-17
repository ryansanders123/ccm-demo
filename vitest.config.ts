import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Keep Playwright e2e specs out of the Vitest run — they use
    // @playwright/test, not Vitest, and will blow up if loaded here.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
