import { type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminRouteGuard from "@/components/AdminRouteGuard";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import {
  AboutPage,
  AccountPage,
  AdminDashboardPage,
  AdmissionHubPage,
  AlertsPage,
  BookmarksPage,
  BrowseJobsLandingPage,
  CategoriesIndexPage,
  ContactPage,
  DesignationLandingPage,
  DesignationsIndexPage,
  DisclaimerPage,
  ExamCalendarPage,
  ExamLandingPage,
  ExamPrepPage,
  ExamsIndexPage,
  ExploreHubPage,
  FaqPage,
  HowToApplyPage,
  JobDetailPage,
  LatestNotificationsPage,
  LazyRoute,
  NotFoundPage,
  OrganizationsIndexPage,
  PrivacyPage,
  ProfessionsIndexPage,
  QualificationsIndexPage,
  ResultsHubPage,
  ResultsTopicsIndexPage,
  ScholarshipsHubPage,
  SitemapPage,
  StatesIndexPage,
  TermsPage,
  YojanaHubPage,
} from "@/components/appRoutePages";
import {
  ALL_INDIA_JOBS_PATH,
  BOARDS_INDEX_PATH,
  CATEGORIES_INDEX_PATH,
  EXAMS_INDEX_PATH,
  EXAM_CALENDAR_PATH,
  EXPLORE_HUB_PATH,
  FAQ_PATH,
  GUIDE_EXAM_PREP_PATH,
  GUIDE_HOW_TO_APPLY_PATH,
  LATEST_NOTIFICATIONS_PATH,
  ORGANIZATIONS_INDEX_PATH,
  QUALIFICATIONS_INDEX_PATH,
  PROFESSIONS_INDEX_PATH,
  RESULTS_TOPICS_INDEX_PATH,
  STATES_INDEX_PATH,
} from "@/utils/browseRoutes";
import type { JobRecord } from "@/types/job";
import type { FooterLinkTarget } from "@/hooks/browseStateTypes";
import type { CatalogStats } from "@/utils/liveJobsPipeline";

type AppRoutesProps = {
  homePageElement: ReactNode;
  jobs: JobRecord[];
  jobsLoading: boolean;
  liveCount: number;
  catalogStats: CatalogStats | null;
  orgCount: number;
  onJobClick: (job: JobRecord) => void;
  onFooterLink: (target: FooterLinkTarget) => void;
};

export default function AppRoutes({
  homePageElement,
  jobs,
  jobsLoading,
  liveCount,
  catalogStats,
  orgCount,
  onJobClick,
  onFooterLink,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={homePageElement} />
      <Route path="/jobs" element={homePageElement} />
      <Route path={ALL_INDIA_JOBS_PATH} element={homePageElement} />
      <Route
        path="/qualification/:slug"
        element={
          <LazyRoute>
            <BrowseJobsLandingPage
              kind="qualification"
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/profession/:slug"
        element={
          <LazyRoute>
            <BrowseJobsLandingPage
              kind="profession"
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/org/:slug"
        element={
          <LazyRoute>
            <BrowseJobsLandingPage
              kind="org"
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path={EXPLORE_HUB_PATH}
        element={
          <LazyRoute>
            <ExploreHubPage liveCount={liveCount} orgCount={orgCount} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={QUALIFICATIONS_INDEX_PATH}
        element={
          <LazyRoute>
            <QualificationsIndexPage jobs={jobs} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={PROFESSIONS_INDEX_PATH}
        element={
          <LazyRoute>
            <ProfessionsIndexPage jobs={jobs} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={ORGANIZATIONS_INDEX_PATH}
        element={
          <LazyRoute>
            <OrganizationsIndexPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={STATES_INDEX_PATH}
        element={
          <LazyRoute>
            <StatesIndexPage jobs={jobs} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={BOARDS_INDEX_PATH}
        element={
          <LazyRoute>
            <CategoriesIndexPage jobs={jobs} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={CATEGORIES_INDEX_PATH}
        element={
          <LazyRoute>
            <CategoriesIndexPage jobs={jobs} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={LATEST_NOTIFICATIONS_PATH}
        element={
          <LazyRoute>
            <LatestNotificationsPage
              jobs={jobs}
              loading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
              catalogStats={catalogStats}
              liveCount={liveCount}
              orgCount={orgCount}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/state/:stateId"
        element={
          <LazyRoute>
            <BrowseJobsLandingPage
              kind="state"
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/board/:boardId"
        element={
          <LazyRoute>
            <BrowseJobsLandingPage
              kind="category"
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/category/:categoryId"
        element={
          <LazyRoute>
            <BrowseJobsLandingPage
              kind="category"
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path={RESULTS_TOPICS_INDEX_PATH}
        element={
          <LazyRoute>
            <ResultsTopicsIndexPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/results/admit-card"
        element={
          <LazyRoute>
            <ResultsHubPage
              eventType="admit_card"
              topicKey="admit-card"
              pageTitle="Admit Cards & Hall Tickets"
              lead="Download official admit cards from all major recruitment boards."
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/results/answer-key"
        element={
          <LazyRoute>
            <ResultsHubPage
              eventType="answer_key"
              topicKey="answer-key"
              pageTitle="Answer Keys"
              lead="Official answer keys released after exam."
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route path="/results/:topicSlug" element={homePageElement} />
      <Route
        path="/results"
        element={
          <LazyRoute>
            <ResultsHubPage
              eventType="result"
              topicKey="sarkari-result"
              pageTitle="Latest Government Job Results"
              lead="Auto-detected results across UPSC, SSC, PSC, banks, railways, PSU and state departments."
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <LazyRoute>
            <AlertsPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={EXAMS_INDEX_PATH}
        element={
          <LazyRoute>
            <ExamsIndexPage jobs={jobs} onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/exam/:examSlug"
        element={
          <LazyRoute>
            <ExamLandingPage
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path={EXAM_CALENDAR_PATH}
        element={
          <LazyRoute>
            <ExamCalendarPage
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path={FAQ_PATH}
        element={
          <LazyRoute>
            <FaqPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={GUIDE_HOW_TO_APPLY_PATH}
        element={
          <LazyRoute>
            <HowToApplyPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path={GUIDE_EXAM_PREP_PATH}
        element={
          <LazyRoute>
            <ExamPrepPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/privacy"
        element={
          <LazyRoute>
            <PrivacyPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/terms"
        element={
          <LazyRoute>
            <TermsPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/about"
        element={
          <LazyRoute>
            <AboutPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/contact"
        element={
          <LazyRoute>
            <ContactPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/sitemap"
        element={
          <LazyRoute>
            <SitemapPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/disclaimer"
        element={
          <LazyRoute>
            <DisclaimerPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/account"
        element={
          <LazyRoute>
            <AccountPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/account/bookmarks"
        element={
          <LazyRoute>
            <BookmarksPage
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/admission"
        element={
          <LazyRoute>
            <AdmissionHubPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/scholarships"
        element={
          <LazyRoute>
            <ScholarshipsHubPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/yojana"
        element={
          <LazyRoute>
            <YojanaHubPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/latest-results"
        element={
          <LazyRoute>
            <ResultsHubPage
              eventType="result"
              topicKey="sarkari-result"
              pageTitle="Latest Government Job Results"
              lead="Auto-detected results across UPSC, SSC, PSC, banks, railways, PSU and state departments."
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/admit-cards"
        element={
          <LazyRoute>
            <ResultsHubPage
              eventType="admit_card"
              topicKey="admit-card"
              pageTitle="Admit Cards & Hall Tickets"
              lead="Download official admit cards from all major recruitment boards."
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/answer-keys"
        element={
          <LazyRoute>
            <ResultsHubPage
              eventType="answer_key"
              topicKey="answer-key"
              pageTitle="Answer Keys"
              lead="Official answer keys released after exam."
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route path="/upcoming-exams" element={<Navigate to={EXAM_CALENDAR_PATH} replace />} />
      <Route
        path="/designations"
        element={
          <LazyRoute>
            <DesignationsIndexPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
      <Route
        path="/designation/:slug"
        element={
          <LazyRoute>
            <DesignationLandingPage
              jobs={jobs}
              jobsLoading={jobsLoading}
              onJobClick={onJobClick}
              onFooterLink={onFooterLink}
            />
          </LazyRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <LazyRoute>
            <AdminRouteGuard>
              <AdminDashboardPage onFooterLink={onFooterLink} />
            </AdminRouteGuard>
          </LazyRoute>
        }
      />
      <Route
        path="/jobs/:slug"
        element={
          <LazyRoute>
            <RouteErrorBoundary label="Job detail">
              <JobDetailPage jobs={jobs} loading={jobsLoading} />
            </RouteErrorBoundary>
          </LazyRoute>
        }
      />
      <Route
        path="*"
        element={
          <LazyRoute>
            <NotFoundPage onFooterLink={onFooterLink} />
          </LazyRoute>
        }
      />
    </Routes>
  );
}
