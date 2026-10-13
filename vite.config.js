import { defineConfig } from 'vite';

// Relative base so the built output works from any subpath (Cloudflare Pages,
// a project folder on a static host, or opened straight from disk).
//
// Production builds don't publish source maps and are minified with mangled
// names, so "view source" shows only a script tag and the shipped JavaScript
// isn't readable as our source. (Anything a browser runs can still be
// downloaded; this stops casual copying, it isn't encryption.)
export default defineConfig(({ mode }) => ({
  base: './',
  server: { port: 5173, open: true },
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
