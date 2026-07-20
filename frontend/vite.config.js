import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so the dev server works from a container
  },
  build: {
    outDir: 'dist',
    // Source maps make production stack traces readable. They are served to
    // the browser, so only do this because this app has no proprietary logic.
    sourcemap: true,
  },
});
