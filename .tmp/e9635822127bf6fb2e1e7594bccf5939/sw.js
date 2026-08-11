import {registerRoute as workbox_routing_registerRoute} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-routing/registerRoute.mjs';
import {ExpirationPlugin as workbox_expiration_ExpirationPlugin} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-expiration/ExpirationPlugin.mjs';
import {CacheableResponsePlugin as workbox_cacheable_response_CacheableResponsePlugin} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-cacheable-response/CacheableResponsePlugin.mjs';
import {NetworkFirst as workbox_strategies_NetworkFirst} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-strategies/NetworkFirst.mjs';
import {clientsClaim as workbox_core_clientsClaim} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-core/clientsClaim.mjs';
import {precacheAndRoute as workbox_precaching_precacheAndRoute} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-precaching/precacheAndRoute.mjs';
import {cleanupOutdatedCaches as workbox_precaching_cleanupOutdatedCaches} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-precaching/cleanupOutdatedCaches.mjs';
import {NavigationRoute as workbox_routing_NavigationRoute} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-routing/NavigationRoute.mjs';
import {createHandlerBoundToURL as workbox_precaching_createHandlerBoundToURL} from 'D:/My Projects/mygovtjobs-main/node_modules/workbox-precaching/createHandlerBoundToURL.mjs';/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */




self.skipWaiting();
workbox_core_clientsClaim();
/**
 * The precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox_precaching_precacheAndRoute([
  {
    "url": "push-sw.js",
    "revision": "5e3f0c8f6e7d24d0ba9ba690756f8fa4"
  },
  {
    "url": "index.html",
    "revision": "d858c1e822d215f098fa20103ecf40c8"
  },
  {
    "url": "assets/YojanaHubPage-2GBnKb5-.js",
    "revision": null
  },
  {
    "url": "assets/virtual_pwa-register-Bbl0oymJ.js",
    "revision": null
  },
  {
    "url": "assets/vendor-misc-GmFerNnh.js",
    "revision": null
  },
  {
    "url": "assets/vendor-misc-DyJqJNq2.css",
    "revision": null
  },
  {
    "url": "assets/useNow-QkhLU2Rl.js",
    "revision": null
  },
  {
    "url": "assets/useAuth-lS95Ne0a.js",
    "revision": null
  },
  {
    "url": "assets/ur-kMna3Md5.js",
    "revision": null
  },
  {
    "url": "assets/TurnstileWidget-lDLNCLGC.js",
    "revision": null
  },
  {
    "url": "assets/turnstile-BYRT1SFX.js",
    "revision": null
  },
  {
    "url": "assets/te-CU8ecHAJ.js",
    "revision": null
  },
  {
    "url": "assets/ta-w5-aWKqn.js",
    "revision": null
  },
  {
    "url": "assets/supabase-CFlJ78QN.js",
    "revision": null
  },
  {
    "url": "assets/SubscribeBanner-C0LVg8bW.js",
    "revision": null
  },
  {
    "url": "assets/StaticPage-Clony6xe.js",
    "revision": null
  },
  {
    "url": "assets/StatesIndexPage-D3zMF40B.js",
    "revision": null
  },
  {
    "url": "assets/stateColors-BAfaEHLb.js",
    "revision": null
  },
  {
    "url": "assets/SocialAlertBar-DLkRk5Sp.js",
    "revision": null
  },
  {
    "url": "assets/SitemapPage-CRJV61Jr.js",
    "revision": null
  },
  {
    "url": "assets/sentry-vendor-CjkRjIMm.js",
    "revision": null
  },
  {
    "url": "assets/SectorBrowser-BID50NQc.js",
    "revision": null
  },
  {
    "url": "assets/sd-DVS4RONm.js",
    "revision": null
  },
  {
    "url": "assets/ScholarshipsHubPage-DeFSCWcu.js",
    "revision": null
  },
  {
    "url": "assets/sat-Cjj3M_0-.js",
    "revision": null
  },
  {
    "url": "assets/sa-B-64_bVB.js",
    "revision": null
  },
  {
    "url": "assets/router-vendor-BmLOIbTU.js",
    "revision": null
  },
  {
    "url": "assets/ResultsTopicsIndexPage-D1GibUDt.js",
    "revision": null
  },
  {
    "url": "assets/ResultsHubPage-f85rUSEC.js",
    "revision": null
  },
  {
    "url": "assets/react-dom-vendor-Bvnu740J.js",
    "revision": null
  },
  {
    "url": "assets/react-core-vendor-Bl2cat-I.js",
    "revision": null
  },
  {
    "url": "assets/query-vendor-BOTwVop3.js",
    "revision": null
  },
  {
    "url": "assets/QualificationsIndexPage-E3vRCAD5.js",
    "revision": null
  },
  {
    "url": "assets/ProfessionsIndexPage-DeTrUOtT.js",
    "revision": null
  },
  {
    "url": "assets/ProfessionLandingExtras-B8sJcJec.js",
    "revision": null
  },
  {
    "url": "assets/polish-pXT9oyxt.css",
    "revision": null
  },
  {
    "url": "assets/page-admin-DlVSq_dZ.js",
    "revision": null
  },
  {
    "url": "assets/pa-y-Lb9GQk.js",
    "revision": null
  },
  {
    "url": "assets/OrganizationsIndexPage-DzLsRdR4.js",
    "revision": null
  },
  {
    "url": "assets/or-CLJ2EU8Y.js",
    "revision": null
  },
  {
    "url": "assets/OfficialHeadlinesSection-DS3FbopI.js",
    "revision": null
  },
  {
    "url": "assets/officialFilters-Bnf5RHOs.js",
    "revision": null
  },
  {
    "url": "assets/NotFoundPage-Rt0PBS8J.js",
    "revision": null
  },
  {
    "url": "assets/ne-Beqjiymm.js",
    "revision": null
  },
  {
    "url": "assets/mr-fI9JTRRD.js",
    "revision": null
  },
  {
    "url": "assets/mni-B-ddab71.js",
    "revision": null
  },
  {
    "url": "assets/ml-VEwHhOn9.js",
    "revision": null
  },
  {
    "url": "assets/mai-UbP96QMW.js",
    "revision": null
  },
  {
    "url": "assets/legalContent-g55My6Nw.js",
    "revision": null
  },
  {
    "url": "assets/latestNotificationsTable-DSsDzbOX.js",
    "revision": null
  },
  {
    "url": "assets/LatestNotificationsPage-DKLghwYQ.js",
    "revision": null
  },
  {
    "url": "assets/ks-D4PdTKs6.js",
    "revision": null
  },
  {
    "url": "assets/kok-CmoBdsVZ.js",
    "revision": null
  },
  {
    "url": "assets/kn-DkFai6Zu.js",
    "revision": null
  },
  {
    "url": "assets/jobs-BZeOZc7Z.js",
    "revision": null
  },
  {
    "url": "assets/jobs-BR4IL75C.css",
    "revision": null
  },
  {
    "url": "assets/JobDetailPage-TALIfjKY.js",
    "revision": null
  },
  {
    "url": "assets/JobDetail-BD1oAnVv.js",
    "revision": null
  },
  {
    "url": "assets/JobCard-Bga208P3.js",
    "revision": null
  },
  {
    "url": "assets/InstallAppBanner-B0U16zAc.js",
    "revision": null
  },
  {
    "url": "assets/index-DzbTYSAU.js",
    "revision": null
  },
  {
    "url": "assets/index-CQxuIgGJ.css",
    "revision": null
  },
  {
    "url": "assets/i18n-vendor-CzTzJIXm.js",
    "revision": null
  },
  {
    "url": "assets/HubCard-fEydCVAt.js",
    "revision": null
  },
  {
    "url": "assets/HomePage-CEj5okGr.css",
    "revision": null
  },
  {
    "url": "assets/HomePage-BwDohuov.js",
    "revision": null
  },
  {
    "url": "assets/HomeMapBlock-CkT4yHPG.js",
    "revision": null
  },
  {
    "url": "assets/HomeMapBlock-93S-x2zm.css",
    "revision": null
  },
  {
    "url": "assets/HomeDiscoveryBlock-DXbLUHBC.js",
    "revision": null
  },
  {
    "url": "assets/hi-CnZyWZob.js",
    "revision": null
  },
  {
    "url": "assets/HeadlineStatusBadge-w-CAneTT.js",
    "revision": null
  },
  {
    "url": "assets/HeadlineStatsBar-C3_6r3R8.js",
    "revision": null
  },
  {
    "url": "assets/guideContent-Eke2aUE9.js",
    "revision": null
  },
  {
    "url": "assets/gu-DEuFyPXx.js",
    "revision": null
  },
  {
    "url": "assets/FaqPage-BRu4h8Ub.js",
    "revision": null
  },
  {
    "url": "assets/extractPostName-CnziJYpi.js",
    "revision": null
  },
  {
    "url": "assets/ExploreHubPage-B0RXHxLo.js",
    "revision": null
  },
  {
    "url": "assets/ExamsIndexPage-BYnRIjET.js",
    "revision": null
  },
  {
    "url": "assets/ExamLandingPage-DNNk756r.js",
    "revision": null
  },
  {
    "url": "assets/examDiscovery-BSOgq-cp.js",
    "revision": null
  },
  {
    "url": "assets/ExamCalendarPage-D59ZBDoL.js",
    "revision": null
  },
  {
    "url": "assets/EmploymentNewsBar-DReppH_I.js",
    "revision": null
  },
  {
    "url": "assets/doi-V3TMyvmF.js",
    "revision": null
  },
  {
    "url": "assets/DesignationsIndexPage-D5A6zf7Q.js",
    "revision": null
  },
  {
    "url": "assets/designations-Ddsp6jpo.js",
    "revision": null
  },
  {
    "url": "assets/DesignationLandingPage-CWEQ9w-9.js",
    "revision": null
  },
  {
    "url": "assets/ContactPage-Dk5eN5Sb.js",
    "revision": null
  },
  {
    "url": "assets/CategoriesIndexPage-DdIKfwIc.js",
    "revision": null
  },
  {
    "url": "assets/brx-X692Hfw5.js",
    "revision": null
  },
  {
    "url": "assets/BrowseScrollRow-pTc6vSVQ.js",
    "revision": null
  },
  {
    "url": "assets/BrowseJobsLandingPage-DFfPYtni.js",
    "revision": null
  },
  {
    "url": "assets/BookmarksPage-BFr04TeH.js",
    "revision": null
  },
  {
    "url": "assets/bn-CEW5CWmP.js",
    "revision": null
  },
  {
    "url": "assets/as-9S_Hahlq.js",
    "revision": null
  },
  {
    "url": "assets/AlertsPage-DTTVICTr.js",
    "revision": null
  },
  {
    "url": "assets/AlertSection-B5G3LVe2.js",
    "revision": null
  },
  {
    "url": "assets/alertsApi-DmpZpNiR.js",
    "revision": null
  },
  {
    "url": "assets/AdSlot-BgR79pV5.js",
    "revision": null
  },
  {
    "url": "assets/AdmissionHubPage-CbzHTNc7.js",
    "revision": null
  },
  {
    "url": "assets/AccountPage-BKY6zBAn.js",
    "revision": null
  },
  {
    "url": "app-icon.png",
    "revision": "4968a8113adf2ff2e208e45042fa6f46"
  },
  {
    "url": "apple-touch-icon.png",
    "revision": "7cd4ab635a5316121fa725dfe976674c"
  },
  {
    "url": "favicon-32.png",
    "revision": "b6e96df044ca4058389338bae391c9f3"
  },
  {
    "url": "logo-og.jpg",
    "revision": "fc8251e2255206a8e4b4d2252138e32e"
  },
  {
    "url": "logo-ui.png",
    "revision": "d4eba4ea40d6646aa86b691a056c469f"
  },
  {
    "url": "logo.webp",
    "revision": "93ab61fd296a33ca8f680ba2284bee99"
  },
  {
    "url": "pwa-192.png",
    "revision": "0922094cdf455580a7a103e257d33851"
  },
  {
    "url": "pwa-512-maskable.png",
    "revision": "a7b8d7b14bcb9cd71a6146373ec1df67"
  },
  {
    "url": "pwa-512.png",
    "revision": "ed0dd356166a43792a6a4a7ac0acee7e"
  },
  {
    "url": "og/job.svg",
    "revision": "270a1ad9d41a0e1bf07b4861631f6d56"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "14ca5b2f99ddc24b97ee9b74fdb9138a"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();workbox_routing_registerRoute(new workbox_routing_NavigationRoute(workbox_precaching_createHandlerBoundToURL("index.html"), {
    denylist: [/^\/data\//],}));
workbox_routing_registerRoute(({ url }) => url.pathname.startsWith("/data/") && url.pathname.endsWith(".json"), new workbox_strategies_NetworkFirst({ "cacheName":"job-data","networkTimeoutSeconds":5, plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 86400 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');


