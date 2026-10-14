import { defineConfig } from "tsup"

// Dependencies in package.json stay external; zod/date-fns (resolved from the
// repo root for shared/) are bundled so dist/ runs without the root install.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
})
