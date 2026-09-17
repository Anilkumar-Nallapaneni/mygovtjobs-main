import { lazy, Suspense, type ComponentProps, type ReactNode } from "react";
import RoutePageFallback from "@/components/RoutePageFallback";
import type StaticPage from "@/pages/StaticPage";
import type { FooterLinkTarget } from "@/hooks/browseStateTypes";

type StaticLegalContent = Omit<ComponentProps<typeof StaticPage>, "onFooterLink">;

function lazyStaticLegalPage(contentImporter: () => Promise<object>, pageKey: string) {
  return lazy(() =>
    Promise.all([import("@/pages/StaticPage"), contentImporter()]).then(
      ([{ default: StaticPageComponent }, content]) => {
        const page = (content as Record<string, StaticLegalContent>)[pageKey];
        return {
          default: function StaticLegalPage({
            onFooterLink,
          }: {
            onFooterLink?: (target: FooterLinkTarget) => void;
          }) {
            return <StaticPageComponent {...page} onFooterLink={onFooterLink} />;
          },
        };
      }
    )
  );
}

export function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RoutePageFallback />}>{children}</Suspense>;
}

export const JobDetailPage = lazy(() => import("@/pages/JobDetailPage"));
export const LatestNotificationsPage = lazy(() => import("@/pages/LatestNotificationsPage"));
export const QualificationsIndexPage = lazy(() => import("@/pages/QualificationsIndexPage"));
export const ProfessionsIndexPage = lazy(() => import("@/pages/ProfessionsIndexPage"));
export const OrganizationsIndexPage = lazy(() => import("@/pages/OrganizationsIndexPage"));
export const ResultsTopicsIndexPage = lazy(() => import("@/pages/ResultsTopicsIndexPage"));
export const StatesIndexPage = lazy(() => import("@/pages/StatesIndexPage"));
export const CategoriesIndexPage = lazy(() => import("@/pages/CategoriesIndexPage"));
export const ExploreHubPage = lazy(() => import("@/pages/ExploreHubPage"));
export const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
export const ExamsIndexPage = lazy(() => import("@/pages/ExamsIndexPage"));
export const ExamLandingPage = lazy(() => import("@/pages/ExamLandingPage"));
export const BrowseJobsLandingPage = lazy(() => import("@/pages/BrowseJobsLandingPage"));
export const ExamCalendarPage = lazy(() => import("@/pages/ExamCalendarPage"));
export const FaqPage = lazy(() => import("@/pages/FaqPage"));
export const ContactPage = lazy(() => import("@/pages/ContactPage"));
export const SitemapPage = lazy(() => import("@/pages/SitemapPage"));
export const AccountPage = lazy(() => import("@/pages/AccountPage"));
export const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
export const AdmissionHubPage = lazy(() => import("@/pages/AdmissionHubPage"));
export const ScholarshipsHubPage = lazy(() => import("@/pages/ScholarshipsHubPage"));
export const YojanaHubPage = lazy(() => import("@/pages/YojanaHubPage"));
export const ResultsHubPage = lazy(() => import("@/pages/ResultsHubPage"));
export const DesignationLandingPage = lazy(() => import("@/pages/DesignationLandingPage"));
export const DesignationsIndexPage = lazy(() => import("@/pages/DesignationsIndexPage"));
export const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
export const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export const AboutPage = lazyStaticLegalPage(() => import("@/pages/legalContent"), "ABOUT_PAGE");
export const PrivacyPage = lazyStaticLegalPage(() => import("@/pages/legalContent"), "PRIVACY_PAGE");
export const TermsPage = lazyStaticLegalPage(() => import("@/pages/legalContent"), "TERMS_PAGE");
export const DisclaimerPage = lazyStaticLegalPage(() => import("@/pages/legalContent"), "DISCLAIMER_PAGE");
export const HowToApplyPage = lazyStaticLegalPage(() => import("@/pages/guideContent"), "HOW_TO_APPLY_PAGE");
export const ExamPrepPage = lazyStaticLegalPage(() => import("@/pages/guideContent"), "EXAM_PREP_PAGE");
