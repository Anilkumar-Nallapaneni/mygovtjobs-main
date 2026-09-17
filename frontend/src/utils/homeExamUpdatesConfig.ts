import { LATEST_NOTIFICATIONS_PATH } from "@/utils/browseRoutes";

export const LATEST_TAB = {
  id: "latest",
  tabTitleKey: "home.examRows.tabLatest",
  tabTitleDefault: "Latest",
  panelTitleKey: "sidebar.latestJobs",
  panelTitleDefault: "Latest Job Notifications",
  viewAllPath: LATEST_NOTIFICATIONS_PATH,
  trackId: "latest-notifications",
} as const;

export const FEED_ROWS = [
  {
    id: "admit-card",
    topicKey: "admit-card",
    archiveTopic: "admit-cards",
    tabTitleKey: "sidebar.admitCard",
    tabTitleDefault: "Admit Card",
    panelTitleKey: "sidebar.admitCard",
    panelTitleDefault: "Admit Cards",
    viewAllPath: "/results/admit-card",
    trackId: "admit-card",
  },
  {
    id: "sarkari-result",
    topicKey: "sarkari-result",
    archiveTopic: "results",
    tabTitleKey: "sidebar.sarkariResult",
    tabTitleDefault: "Government Result",
    panelTitleKey: "sidebar.sarkariResult",
    panelTitleDefault: "Government Results",
    viewAllPath: "/results",
    trackId: "sarkari-result",
  },
  {
    id: "answer-key",
    topicKey: "answer-key",
    archiveTopic: "answer-keys",
    tabTitleKey: "sidebar.answerKey",
    tabTitleDefault: "Answer Key",
    panelTitleKey: "sidebar.answerKey",
    panelTitleDefault: "Answer Keys",
    viewAllPath: "/results/answer-key",
    trackId: "answer-key",
  },
  {
    id: "syllabus",
    topicKey: "syllabus",
    archiveTopic: "syllabus",
    tabTitleKey: "sidebar.syllabus",
    tabTitleDefault: "Syllabus",
    panelTitleKey: "sidebar.syllabus",
    panelTitleDefault: "Syllabus",
    viewAllPath: "/results/syllabus",
    trackId: "syllabus",
  },
] as const;

export type FeedRowId = (typeof FEED_ROWS)[number]["id"];
export type HomeExamTabId = typeof LATEST_TAB.id | FeedRowId;
