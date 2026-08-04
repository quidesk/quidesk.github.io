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
  build: {
    outDir: 'dist',
    sourcemap: false,
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
