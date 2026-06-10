import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/..." path alias natively (matches tsconfig paths).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Pure-logic tests only — no DB, no network. Fast and deterministic.
    globals: true,
  },
});
