import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@shared": path.resolve(import.meta.dirname, "../shared") },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup-env.ts"],
    testTimeout: 30_000,
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 180_000,
  },
})
