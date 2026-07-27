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

/** GA4 measurement id is available to the app; script loads after first paint via analytics.ts (not in <head>). */
function gaMeasurementPlugin(measurementId: string): Plugin {
  return {
    name: 'inject-ga-measurement',
    transformIndexHtml(html) {
      if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return html
      // Keep a lightweight marker for debugging/deploy checks — do not inject gtag.js on the critical path.
      const tag = `    <meta name="ga-measurement-id" content="${measurementId}" />`
      return html.replace('</head>', `${tag}\n  </head>`)
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

/** Make built CSS non-render-blocking — static shell already has critical styles. */
function deferCssPlugin(): Plugin {
  return {
    name: 'defer-css',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link([^>]*rel="stylesheet"[^>]*)>/g,
        (_match, attrs: string) => {
          if (attrs.includes('data-critical') || attrs.includes('media=')) return `<link${attrs}>`
          const hrefMatch = attrs.match(/href="([^"]+)"/)
          const href = hrefMatch?.[1] ?? ''
          return [
            `<link${attrs} media="print" onload="this.media='all'" />`,
            href
              ? `<noscript><link rel="stylesheet" href="${href}" /></noscript>`
              : '',
          ]
            .filter(Boolean)
            .join('\n    ')
        }
      )
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
  const usePreloadLink = injectStaticPrefetch
  // Bootstrap only on the critical path — never race the ~3 MB list JSON in <head>.
  const marker = '<!-- live-jobs early prefetch: injected at build for static/auto jobs source only -->'
  const version = encodeURIComponent(buildStamp)

  return {
    name: 'perf-index-html',
    transformIndexHtml(html) {
      if (!injectStaticPrefetch || !html.includes(marker)) return html
      const lines = [marker]
      if (usePreloadLink) {
        lines.push(
          `    <link rel="preload" href="/data/live-jobs-bootstrap.json?v=${version}" as="fetch" crossorigin="anonymous" />`
        )
      }
      lines.push(
        '    <script>',
        `      window.__LIVE_JOBS_PREFETCH__ = (function () {`,
        `        var timeoutMs = 12000; /* bootstrap is small — keep in sync with jobsApi.ts */`,
        `        var controller = new AbortController();`,
        `        var timer = setTimeout(function () { controller.abort(); }, timeoutMs);`,
        `        var fetchOpts = { credentials: 'same-origin', cache: '${fetchCache}', signal: controller.signal };`,
        `        var v = '?v=${version}';`,
        `        return fetch('/data/live-jobs-bootstrap.json' + v, fetchOpts)`,
        '          .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : null; })',
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
  const gaMeasurementId = (env.VITE_GA_MEASUREMENT_ID || '').trim()
  const jobsSource = (env.VITE_JOBS_SOURCE || 'auto').trim()
  const isDev = mode === 'development'
  // Stable stamp in dev avoids busting the 2MB jobs JSON + SW caches on every `npm run dev`.
  const buildStamp = isDev ? 'dev-local' : new Date().toISOString()
  const jobsFetchCache = 'default'

  return {
    plugins: [
      react(),
      buildStampPlugin(buildStamp),
      perfIndexHtmlPlugin(jobsSource, buildStamp, jobsFetchCache),
      googleSiteVerificationPlugin(googleVerify),
      gaMeasurementPlugin(gaMeasurementId),
      deferCssPlugin(),
      VitePWA({
        devOptions: { enabled: false },
        // Avoid sync registerSW.js on critical HTML — register after load via workbox.
        injectRegister: null,
        registerType: 'autoUpdate',
        includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'app-icon.png', 'logo.webp', 'logo-ui.png', 'logo-og.jpg', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png', 'og/job.svg'],
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallbackDenylist: [/^\/data\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/data/') && url.pathname.endsWith('.json'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'job-data',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'Live Govt Jobs',
          short_name: 'Govt Jobs',
          description: 'Official government job alerts, results, and admit cards from verified sources across India.',
          theme_color: '#03060d',
          background_color: '#03060d',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['news', 'business'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          ],
        },
      }),
    ],
    test: {
      environment: 'node',
      setupFiles: ['src/test/setup.ts'],
      include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
      coverage: {
        provider: 'v8',
        include: [
          'src/utils/**/*.{ts,tsx}',
          'src/hooks/**/*.{ts,tsx}',
          'src/lib/**/*.{ts,tsx}',
          'src/components/**/*.{ts,tsx}',
        ],
        thresholds: {
          lines: 50,
          functions: 45,
          statements: 50,
          branches: 38,
          'src/utils/**/*.{ts,tsx}': {
            lines: 70,
            functions: 65,
            statements: 70,
            branches: 58,
          },
          'src/hooks/**/*.{ts,tsx}': {
            lines: 70,
            functions: 65,
            statements: 68,
            branches: 50,
          },
          'src/components/**/*.{ts,tsx}': {
            lines: 40,
            functions: 18,
            statements: 35,
            branches: 35,
          },
        },
      },
    },
    build: {
      emptyOutDir: true,
      // Keep vendor CSS/JS that is not needed for first paint off the preload list.
      modulePreload: {
        resolveDependencies(filename, deps) {
          return deps.filter((dep) => {
            if (dep.includes('/i18n-vendor-')) return false
            if (dep.includes('/query-vendor-')) return false
            if (dep.includes('/page-admin-')) return false
            if (dep.includes('/pages-') || dep.includes('/home-discovery-') || dep.includes('/map-')) {
              return false
            }
            return !/(?:^|\/)(?:pages|home-discovery|map|page-admin|i18n-vendor|query-vendor)-[^/]+\.js$/.test(
              dep
            )
          })
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase'
              if (id.includes('@sentry')) return 'sentry-vendor'
              if (id.includes('@tanstack')) return 'query-vendor'
              if (id.includes('react-router')) return 'router-vendor'
              if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n-vendor'
              if (id.includes('react-dom')) return 'react-dom-vendor'
              if (id.includes('/react/')) return 'react-core-vendor'
              return 'vendor-misc'
            }
            // Do NOT force pages/home-discovery/map into named chunks — that made
            // index.js statically import them and defeated React.lazy().
            if (id.includes('/src/pages/AdminDashboardPage')) return 'page-admin'
          },
        },
      },
    },
    resolve: {
      alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
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
