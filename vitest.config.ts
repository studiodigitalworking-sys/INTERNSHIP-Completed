import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", APP_SECRET: "test-secret-for-vitest-only-000000", RAZORPAY_WEBHOOK_SECRET: "whsec_test" },
    fileParallelism: false,
    testTimeout: 30000,
  },
});
