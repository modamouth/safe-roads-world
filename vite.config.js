import { defineConfig } from 'vite';
import { readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Originals stay in public for editing; only runtime copies ship to players.
function runtimeImagesOnly() {
  let output;
  return {
    name: 'runtime-images-only',
    apply: 'build',
    configResolved(config) { output = resolve(config.root, config.build.outDir); },
    closeBundle() {
      for (const path of readdirSync('public/assets', { recursive: true })) {
        if (/\.(png|webp|jpe?g)$/i.test(path)) rmSync(resolve(output, 'assets', path), { force: true });
      }
    }
  };
}

// Relative base so the built output works from any subpath (Cloudflare Pages,
// a project folder on a static host, or opened straight from disk).
//
// Production builds don't publish source maps and are minified with mangled
// names, so "view source" shows only a script tag and the shipped JavaScript
// isn't readable as our source. (Anything a browser runs can still be
// downloaded; this stops casual copying, it isn't encryption.)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [runtimeImagesOnly()],
  // Game sessions should survive ongoing code/artwork work. Refresh manually
  // to pick up changes; live reload can be enabled explicitly for development.
  server: { port: 5173, open: !process.env.PLAYWRIGHT, hmr: process.env.SRW_LIVE_RELOAD === '1' },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: mode === 'development',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true, passes: 2 },
      mangle: { toplevel: true },
      format: { comments: false }
    },
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Phaser in its own long-cached chunk; the game code changes more often.
        manualChunks: id => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]'
      }
    }
  }
}));
