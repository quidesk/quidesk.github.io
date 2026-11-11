import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveBuildSha() {
  const envSha = process.env.GITHUB_SHA?.trim()
  if (envSha) return envSha.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev'
  } catch {
    return 'dev'
  }
}

const BUILD_SHA = resolveBuildSha()
const BUILD_TIME = new Date().toISOString()

function versionJsonPlugin(sha, buildTime) {
  return {
    name: 'quidesk-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ sha, buildTime }, null, 2)}\n`,
      })
    },
  }
}

// For username.github.io (root deployment), base is always '/'.
export default defineConfig({
  plugins: [react(), versionJsonPlugin(BUILD_SHA, BUILD_TIME)],
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(BUILD_SHA),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(BUILD_TIME),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  server: {
    port: 3000,
    open: true,
  },
  esbuild: {
    legalComments: 'none',
    drop: ['console', 'debugger'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        compact: true,
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
})
