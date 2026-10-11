import { defineConfig } from 'vite';

// Relative base so the built output works from any subpath (Cloudflare Pages,
// a project folder on a static host, or opened straight from disk).
export default defineConfig({
  base: './',
  server: { port: 5173, open: true },
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: true }
});
