import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    sequence: { concurrent: false },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      // set realistic thresholds for a thesis project
      thresholds: {
        lines: 75,
        functions: 70,
        branches: 60,
        statements: 75,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/generated/**", "src/**/migrations/**"],
    },
  },
});
