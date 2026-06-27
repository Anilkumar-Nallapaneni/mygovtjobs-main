import { useTranslation } from "react-i18next";

export const LIFECYCLE_STEPS = [
  {
    id: "latest",
    labelKey: "home.examRows.stepLatest",
    labelDefault: "Notifications",
    icon: "📋",
    topic: "latest",
  },
  {
    id: "admit-card",
    labelKey: "home.examRows.stepAdmit",
    labelDefault: "Admit card",
    icon: "🎫",
    topic: "admit-card",
  },
  {
    id: "sarkari-result",
    labelKey: "home.examRows.stepResult",
    labelDefault: "Results",
    icon: "🏆",
    topic: "sarkari-result",
  },
  {
    id: "answer-key",
    labelKey: "home.examRows.stepAnswerKey",
    labelDefault: "Answer key",
    icon: "🔑",
    topic: "answer-key",
  },
  {
    id: "syllabus",
    labelKey: "home.examRows.stepSyllabus",
    labelDefault: "Syllabus",
    icon: "📚",
    topic: "syllabus",
  },
] as const;

export type LifecycleStepId = (typeof LIFECYCLE_STEPS)[number]["id"];

type ExamLifecycleTimelineProps = {
  activeStep: LifecycleStepId;
  onStepSelect: (stepId: LifecycleStepId) => void;
};

export default function ExamLifecycleTimeline({
  activeStep,
  onStepSelect,
}: ExamLifecycleTimelineProps) {
  const { t } = useTranslation();

  return (
    <nav
      className="exam-lifecycle"
      aria-label={t("home.examRows.lifecycleAria", { defaultValue: "Exam lifecycle steps" })}
    >
      <ol className="exam-lifecycle__list">
        {LIFECYCLE_STEPS.map((step, index) => {
          const isActive = activeStep === step.id;
          const isPast =
            LIFECYCLE_STEPS.findIndex((s) => s.id === activeStep) > index;
          return (
            <li key={step.id} className="exam-lifecycle__item">
              <button
                type="button"
                className={`exam-lifecycle__step exam-lifecycle__step--${step.topic}${
                  isActive ? " exam-lifecycle__step--active" : ""
                }${isPast ? " exam-lifecycle__step--past" : ""}`}
                aria-current={isActive ? "step" : undefined}
                onClick={() => onStepSelect(step.id)}
              >
                <span className="exam-lifecycle__icon" aria-hidden>
                  {step.icon}
                </span>
                <span className="exam-lifecycle__label">
                  {t(step.labelKey, { defaultValue: step.labelDefault })}
                </span>
              </button>
              {index < LIFECYCLE_STEPS.length - 1 ? (
                <span className="exam-lifecycle__connector" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
