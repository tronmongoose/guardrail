import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@guide-rail/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@guide-rail/ai": path.resolve(__dirname, "../../packages/ai/src"),
    },
  },
});
