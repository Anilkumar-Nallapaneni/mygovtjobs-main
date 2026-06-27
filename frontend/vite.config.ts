import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

function googleSiteVerificationPlugin(token: string): Plugin {
  return {
    name: 'inject-google-site-verification',
    transformIndexHtml(html) {
      if (!token) return html
      const tag = `<meta name="google-site-verification" content="${token}" />`
      return html.replace('</head>', `    ${tag}\n  </head>`)
    },
  }
}

function buildStampPlugin(stamp: string): Plugin {
  return {
    name: 'build-stamp',
    config() {
      return {
        define: {
          'import.meta.env.VITE_BUILD_STAMP': JSON.stringify(stamp),
        },
      }
    },
    transformIndexHtml(html) {
      return html.replace('</head>', `    <meta name="app-build" content="${stamp}" />\n  </head>`)
    },
  }
}

/** Inject static JSON prefetch when jobs can load from live-jobs.json (all modes except api-only). */
function perfIndexHtmlPlugin(
  jobsSourceRaw: string,
  buildStamp: string,
  fetchCache: 'default' | 'no-cache'
): Plugin {
  const mode = (jobsSourceRaw || 'auto').toLowerCase()
  const injectStaticPrefetch = mode !== 'api'
  const usePreloadLink = mode === 'static' || mode === 'auto'
  const marker = '<!-- live-jobs early prefetch: injected at build for static/auto jobs source only -->'
  const version = encodeURIComponent(buildStamp)

  return {
    name: 'perf-index-html',
    transformIndexHtml(html) {
      if (!injectStaticPrefetch || !html.includes(marker)) return html
      const lines = [marker]
      if (usePreloadLink) {
        lines.push(
          `    <link rel="preload" href="/data/live-jobs-list.json?v=${version}" as="fetch" crossorigin="anonymous" />`
        )
      }
      lines.push(
        '    <script>',
        `      window.__LIVE_JOBS_PREFETCH__ = (function () {`,
        `        var timeoutMs = 20000; /* keep in sync with LIVE_JOBS_SNAPSHOT_TIMEOUT_MS in jobsApi.ts */`,
        `        var controller = new AbortController();`,
        `        var timer = setTimeout(function () { controller.abort(); }, timeoutMs);`,
        `        var fetchOpts = { credentials: 'same-origin', cache: '${fetchCache}', signal: controller.signal };`,
        `        return fetch('/data/live-jobs-list.json?v=${version}', fetchOpts)`,
        '          .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : fetch("/data/live-jobs.json?v=' +
          version +
          '", fetchOpts).then(function (r2) { return r2.ok ? r2.json() : null; }); })',
        '          .catch(function () { clearTimeout(timer); return null; });',
        '      })();',
        '    </script>'
      )
      return html.replace(marker, lines.join('\n'))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname), '')
  const googleVerify = (env.VITE_GOOGLE_SITE_VERIFICATION || '').trim()
  const jobsSource = (env.VITE_JOBS_SOURCE || 'auto').trim()
  const isDev = mode === 'development'
  // Stable stamp in dev avoids busting the 2MB jobs JSON + SW caches on every `npm run dev`.
  const buildStamp = isDev ? 'dev-local' : new Date().toISOString()
  const jobsFetchCache = isDev ? 'default' : 'no-cache'

  return {
    plugins: [
      react(),
      buildStampPlugin(buildStamp),
      perfIndexHtmlPlugin(jobsSource, buildStamp, jobsFetchCache),
      googleSiteVerificationPlugin(googleVerify),
      VitePWA({
        devOptions: { enabled: false },
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.png', 'pwa-192.png', 'pwa-512.png', 'og/job.svg'],
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/data\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/data/') && url.pathname.endsWith('.json'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'data-json',
                expiration: { maxEntries: 8, maxAgeSeconds: 60 },
                networkTimeoutSeconds: 8,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'My Govt Jobs',
          short_name: 'MyGovtJobs',
          description: 'Official government job alerts from verified sources across India.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['news', 'business'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          ],
        },
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      coverage: {
        provider: 'v8',
        include: ['src/utils/**', 'src/hooks/**', 'src/lib/**', 'src/components/**'],
        thresholds: {
          lines: 50,
          functions: 45,
          statements: 50,
          branches: 38,
          'src/utils/**': {
            lines: 70,
            functions: 65,
            statements: 70,
            branches: 58,
          },
          'src/hooks/**': {
            lines: 70,
            functions: 65,
            statements: 68,
            branches: 50,
          },
          'src/components/**': {
            lines: 40,
            functions: 35,
            statements: 40,
            branches: 30,
          },
        },
      },
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase'
              if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n-vendor'
              return 'react-vendor'
            }
            if (id.includes('IndiaMap')) return 'map'
            if (id.includes('/src/pages/AdminDashboardPage')) return 'page-admin'
            if (id.includes('/src/pages/')) return 'pages'
            if (id.includes('/src/components/home/HomeDiscoveryBlock')) return 'home-discovery'
          },
        },
      },
    },
    resolve: {
      alias: [
        { find: '@', replacement: resolve(__dirname, 'src') },
        { find: '@components', replacement: resolve(__dirname, 'src/components') },
        { find: '@styles', replacement: resolve(__dirname, 'src/styles') },
        { find: '@utils', replacement: resolve(__dirname, 'src/utils') },
        { find: '@hooks', replacement: resolve(__dirname, 'src/hooks') },
        { find: '@types', replacement: resolve(__dirname, 'src/types') },
      ],
    },
    server: {
      port: 2222,
      strictPort: false,
      open: true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 2222,
      strictPort: true,
    },
  }
})
