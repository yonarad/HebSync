import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cwd } from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')
  const appBaseUrl = (env.APP_BASE_URL || '').replace(/\/+$/, '')
  const appBaseUrlWithSlash = appBaseUrl ? `${appBaseUrl}/` : '/'

  return {
    plugins: [
      react(),
      {
        name: 'inject-app-base-url-meta',
        transformIndexHtml(html) {
          return html
            .replaceAll('__APP_BASE_URL_WITH_SLASH__', appBaseUrlWithSlash)
            .replaceAll('__APP_BASE_URL__', appBaseUrl)
        },
      },
    ],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: false,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      testTimeout: 15000,
      exclude: ['tests/visual/**', 'node_modules/**', 'dist/**'],
    },
  }
})
