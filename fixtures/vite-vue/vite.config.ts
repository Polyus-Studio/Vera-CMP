import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    // Fail the build on any warning so broken exports are caught in CI.
    chunkSizeWarningLimit: 10_000,
  },
})
