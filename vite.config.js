import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For username.github.io (root deployment), base is always '/'.
// No changes needed here — this config is ready to go.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    open: true,
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Strip console.* calls in production to prevent data leakage
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
})
