import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  afterDegreePaths,
  afterPGPaths,
  afterTenthPaths,
  afterTwelfthPaths,
  type CareerPath,
  mockTests,
} from "@/data/education/careerPaths";
import { extraMockTests } from "@/data/education/originalMocks";
import { subjects } from "@/data/education/studyContent";
import "@/styles/education-hub.css";
import { gradeStaticMock, loadPublishedCareers, loadPublishedMockTests, submitEducationAttempt } from "@/lib/educationApi";
import { useAuth } from "@/hooks/useAuth";

type Tab = "overview" | "careers" | "exams" | "tests" | "resources";
type Stage = "after10th" | "after12th" | "afterDegree" | "afterPG";

const allPaths: CareerPath[] = [
  ...afterTenthPaths,
  ...afterTwelfthPaths,
  ...afterDegreePaths,
  ...afterPGPaths,
];

const allTests = [...mockTests, ...extraMockTests];

const stageMeta: Record<Stage, { label: string; icon: string; description: string }> = {
  after10th: { label: "After 10th", icon: "🎯", description: "Choose a stream and build your foundation." },
  after12th: { label: "After 12th", icon: "🎓", description: "Compare degrees, entrance exams and career routes." },
  afterDegree: { label: "After Degree", icon: "💼", description: "Explore higher study, exams and job pathways." },
  afterPG: { label: "After PG", icon: "🚀", description: "Turn your qualification into a specialist career." },
};

const officialLinks = [
  { name: "NCERT", url: "https://ncert.nic.in/", note: "School curriculum and textbooks" },
  { name: "NTA", url: "https://www.nta.ac.in/", note: "National entrance examinations" },
  { name: "UPSC", url: "https://upsc.gov.in/", note: "Civil services and central recruitment" },
  { name: "UGC", url: "https://www.ugc.gov.in/", note: "Higher education information" },
  { name: "AICTE", url: "https://www.aicte-india.org/", note: "Technical education" },
];

function stageForPath(path: CareerPath): Stage {
  return path.stage;
}

function StageCard({ stage, count, onClick }: { stage: Stage; count: number; onClick: () => void }) {
  const meta = stageMeta[stage];
  return (
    <button className="edu-stage-card" onClick={onClick} type="button">
      <span className="edu-stage-icon">{meta.icon}</span>
      <span className="edu-stage-copy">
        <strong>{meta.label}</strong>
        <small>{meta.description}</small>
        <em>{count} pathways</em>
      </span>
      <span className="edu-stage-arrow">→</span>
    </button>
  );
}

function CareerCard({ path, onOpen }: { path: CareerPath; onOpen: () => void }) {
  return (
    <button type="button" className="edu-career-card" onClick={onOpen}>
      <div className="edu-career-icon">{path.icon}</div>
      <div className="edu-career-body">
        <div className="edu-card-kicker">{stageMeta[stageForPath(path)].label}</div>
        <h3>{path.name}</h3>
        <p>{path.description}</p>
        <div className="edu-chip-row">
          <span>{path.duration}</span>
          <span>{path.eligibility}</span>
          <span>{path.scope} scope</span>
        </div>
      </div>
      <span className="edu-card-arrow">↗</span>
    </button>
  );
}

function CareerDetail({ path, onClose }: { path: CareerPath; onClose: () => void }) {
  return (
    <div className="edu-detail-panel">
      <button type="button" className="edu-back" onClick={onClose}>← Back to pathways</button>
      <div className="edu-detail-hero">
        <div className="edu-detail-icon">{path.icon}</div>
        <div>
          <span className="edu-card-kicker">{stageMeta[path.stage].label}</span>
          <h2>{path.name}</h2>
          <p>{path.description}</p>
        </div>
      </div>
      <div className="edu-detail-grid">
        <div><span>Duration</span><strong>{path.duration}</strong></div>
        <div><span>Eligibility</span><strong>{path.eligibility}</strong></div>
        {path.salarySource && path.salarySourceUrl && <div><span>Indicative starting salary</span><strong>{path.avgStartingSalary}</strong><p>{path.salarySource}</p><a href={path.salarySourceUrl} target="_blank" rel="noopener noreferrer">Salary source</a></div>}
        <div><span>Scope</span><strong>{path.scope}</strong></div>
      </div>
      <div className="edu-detail-columns">
        <section>
          <h3>Journey</h3>
          <div className="edu-journey">
            {path.steps.map((step) => (
              <div className="edu-journey-step" key={step.id}>
                <span>{step.icon}</span>
                <div><strong>{step.title}</strong><small>{step.subtitle}</small><p>{step.description}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h3>Exams & skills</h3>
          <div className="edu-list-block"><strong>Relevant exams</strong><div className="edu-chip-row">{path.exams.map((x) => <span key={x}>{x}</span>)}</div></div>
          <div className="edu-list-block"><strong>Key skills</strong><div className="edu-chip-row">{path.keySkills.map((x) => <span key={x}>{x}</span>)}</div></div>
          <div className="edu-list-block"><strong>Possible roles</strong><div className="edu-chip-row">{path.jobRoles.map((x) => <span key={x}>{x}</span>)}</div></div>
        </section>
      </div>
      <div className="edu-crosslink">
        <div><strong>Looking for government opportunities?</strong><span>Search matching government jobs on Live Govt Jobs.</span></div>
        <Link to="/jobs">Explore Government Jobs →</Link>
      </div>
    </div>
  );
}

function MockTests({ tests = allTests }: { tests?: typeof allTests }) {
  const [selected, setSelected] = useState(tests[0]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptSaved, setAttemptSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState((tests[0]?.duration ?? 30) * 60);
  const { user } = useAuth();
  const finishing = useRef(false);

  const reset = (test = selected) => {
    finishing.current = false;
    setSelected(test);
    setAnswers({});
    setSubmitted(false);
    setAttemptSaved(false);
    setSaveError(false);
    setResultScore(null);
    setRemainingSeconds((test.duration ?? 30) * 60);
  };

  useEffect(() => {
    if (!submitted && remainingSeconds > 0) {
      const timer = window.setInterval(() => setRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
      return () => window.clearInterval(timer);
    }
  }, [submitted, remainingSeconds]);

  const finishTest = useCallback(async () => {
    if (finishing.current || submitted) return;
    finishing.current = true;
    const serverQuestions = selected.questions.filter((question) => question.dbId);
    if (serverQuestions.length && !user) {
      finishing.current = false;
      setSaveError(true);
      return;
    }
    if (serverQuestions.length && user) {
      setSavingAttempt(true);
      setSaveError(false);
      const result = await submitEducationAttempt({
        testId: selected.id,
        durationSeconds: Math.max(0, (selected.duration ?? 30) * 60 - remainingSeconds),
        answers: serverQuestions.map((question) => ({
          questionId: question.dbId as string,
          selectedIndex: answers[question.id],
        })),
      });
      setSavingAttempt(false);
      if (!result.ok) {
        finishing.current = false;
        setSaveError(true);
        return;
      }
      const byId = new Map(result.questions.map((question) => [question.questionId, question]));
      setSelected((current) => ({
        ...current,
        questions: current.questions.map((question) => {
          const graded = question.dbId ? byId.get(question.dbId) : undefined;
          if (!graded) return question;
          return { ...question, correctAnswer: graded.correctIndex, explanation: graded.explanation };
        }),
      }));
      setResultScore(result.score);
      setAttemptSaved(true);
    } else {
      setSavingAttempt(true);
      setSaveError(false);
      const result = await gradeStaticMock({
        testId: selected.id,
        answers: selected.questions.map((question) => ({
          questionId: question.id,
          selectedIndex: answers[question.id],
        })),
      });
      setSavingAttempt(false);
      if (!result.ok) {
        finishing.current = false;
        setSaveError(true);
        return;
      }
      const byId = new Map(result.questions.map((question) => [Number(question.questionId), question]));
      setSelected((current) => ({
        ...current,
        questions: current.questions.map((question) => {
          const graded = byId.get(question.id);
          if (!graded) return question;
          return { ...question, correctAnswer: graded.correctIndex, explanation: graded.explanation };
        }),
      }));
      setResultScore(result.score);
    }
    setSubmitted(true);
  }, [answers, remainingSeconds, selected, submitted, user]);

  useEffect(() => {
    if (!submitted && remainingSeconds === 0) void finishTest();
  }, [finishTest, remainingSeconds, submitted]);

  useEffect(() => {
    if (tests[0] && !tests.some((test) => test.id === selected.id)) {
      setSelected(tests[0]);
      setAnswers({});
      setSubmitted(false);
    }
  }, [tests, selected.id]);

  const localScore = useMemo(
    () => selected.questions.reduce((sum, q) => sum + ((q.correctAnswer ?? -1) >= 0 && answers[q.id] === q.correctAnswer ? 4 : 0), 0),
    [answers, selected],
  );
  const score = resultScore ?? localScore;
  const revealAnswers = submitted && selected.questions.every((question) => !question.dbId || question.correctAnswer >= 0);

  return (
    <div className="edu-test-shell">
      <div className="edu-test-list">
        <div className="edu-section-head"><span>Practice library</span><strong>{tests.length} tests</strong></div>
        {tests.map((test) => (
          <button key={test.id} type="button" className={`edu-test-item${selected.id === test.id ? " is-active" : ""}`} onClick={() => reset(test)}>
            <span>{test.subject === "Physics" ? "⚡" : test.subject === "Chemistry" ? "🧪" : test.subject === "Computer Science" ? "💻" : "📘"}</span>
            <div><strong>{test.title}</strong><small>{test.exam} · {test.duration} min · {test.totalQuestions} questions</small></div>
          </button>
        ))}
      </div>
      <div className="edu-test-workspace">
        <div className="edu-test-header">
          <div><span>{selected.exam}</span><h2>{selected.title}</h2></div>
          {submitted ? <div className="edu-score"><strong>{score}/{selected.totalMarks}</strong><small>Your score</small></div> : <div className="edu-test-time">{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2,'0')}</div>}
        </div>
        {selected.questions.map((q, index) => (
          <article className="edu-question" key={q.id}>
            <div className="edu-question-number">Q{index + 1}</div>
            <h3>{q.question}</h3>
            <div className="edu-options">
              {q.options.map((option, optionIndex) => (
                <label key={option} className={`edu-option${answers[q.id] === optionIndex ? " is-selected" : ""}${revealAnswers && optionIndex === q.correctAnswer ? " is-correct" : ""}${revealAnswers && answers[q.id] === optionIndex && optionIndex !== q.correctAnswer ? " is-wrong" : ""}`}>
                  <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === optionIndex} onChange={() => !submitted && setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }))} />
                  <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                </label>
              ))}
            </div>
            {revealAnswers && q.explanation ? <p className="edu-explanation">{q.explanation}</p> : null}
          </article>
        ))}
        {saveError ? <p className="edu-explanation">Could not score this attempt. The answer key stays on the server, so submit again when the site can reach it.</p> : null}
        <button type="button" className="edu-primary-btn" disabled={savingAttempt} onClick={() => {
          if (submitted) { reset(); return; }
          void finishTest();
        }}>
          {submitted ? "Retake test" : savingAttempt ? "Saving result…" : attemptSaved ? "Result saved ✓" : "Submit test"}
        </button>
      </div>
    </div>
  );
}

export default function EducationHubPage() {
  const location = useLocation();
  const initialTab: Tab = location.pathname.endsWith("/mock-tests") ? "tests" : "overview";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [stage, setStage] = useState<Stage | "all">("all");
  const [selectedCareer, setSelectedCareer] = useState<CareerPath | null>(null);
  const [livePaths, setLivePaths] = useState<CareerPath[]>(allPaths);
  const [liveTests, setLiveTests] = useState(allTests);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadPublishedCareers(), loadPublishedMockTests()]).then(([dbPaths, dbTests]) => {
      if (cancelled) return;
      if (dbPaths?.length) {
        const byId = new Map(dbPaths.map((path) => [path.id, path]));
        setLivePaths([...allPaths.map((path) => ({ ...path, ...byId.get(path.id), steps: path.steps })), ...dbPaths.filter((path) => !allPaths.some((item) => item.id === path.id))]);
      }
      if (dbTests?.length) setLiveTests(dbTests);
    });
    return () => { cancelled = true; };
  }, []);

  const visiblePaths = stage === "all" ? livePaths : livePaths.filter((p) => p.stage === stage);

  const goTab = (next: Tab) => {
    setTab(next);
    setSelectedCareer(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="education-page">
      <section className="edu-hero">
        <div className="edu-hero-glow" />
        <div className="edu-container">
          <div className="edu-hero-nav">
            <span className="edu-badge">NEW · CAREER & EDUCATION</span>
            <Link to="/" className="edu-jobs-link">← Live Govt Jobs</Link>
          </div>
          <div className="edu-hero-grid">
            <div>
              <h1>Plan your education.<br /><span>Build your career.</span></h1>
              <p>One place to explore career paths, exams, study resources and practice tests — then move directly to relevant government opportunities.</p>
              <div className="edu-hero-actions">
                <button type="button" className="edu-primary-btn" onClick={() => goTab("careers")}>Explore career paths</button>
                <button type="button" className="edu-secondary-btn" onClick={() => goTab("tests")}>Take a mock test</button>
              </div>
              <div className="edu-trust-row"><span>✓ Career roadmaps</span><span>✓ Official-source links</span><span>✓ Original practice tests</span></div>
            </div>
            <div className="edu-hero-card">
              <div className="edu-roadmap-title"><span>YOUR NEXT STEP</span><strong>Education → Career → Jobs</strong></div>
              <div className="edu-roadmap"><div>📚<span>Learn</span></div><i>→</i><div>🎯<span>Prepare</span></div><i>→</i><div>💼<span>Apply</span></div></div>
              <div className="edu-hero-stat"><strong>{livePaths.length}+</strong><span>career pathways</span><strong>{liveTests.length}</strong><span>practice tests</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="edu-container">
        <nav className="edu-tabs" aria-label="Education sections">
          {[
            ["overview", "Overview"], ["careers", "Career Paths"], ["exams", "Exams"], ["tests", "Mock Tests"], ["resources", "Resources"],
          ].map(([id, label]) => <button key={id} type="button" className={tab === id ? "is-active" : ""} onClick={() => goTab(id as Tab)}>{label}</button>)}
        </nav>

        {tab === "overview" && (
          <>
            <section className="edu-section">
              <div className="edu-section-title"><div><span>START WHERE YOU ARE</span><h2>Choose your education stage</h2></div><button type="button" onClick={() => goTab("careers")}>View all paths →</button></div>
              <div className="edu-stage-grid">{(Object.keys(stageMeta) as Stage[]).map((s) => <StageCard key={s} stage={s} count={allPaths.filter((p) => p.stage === s).length} onClick={() => { setStage(s); goTab("careers"); }} />)}</div>
            </section>
            <section className="edu-section edu-dark-section">
              <div className="edu-section-title"><div><span>CONNECTED JOURNEY</span><h2>From preparation to opportunity</h2></div></div>
              <div className="edu-flow"><div><b>01</b><strong>Discover</strong><p>Compare career paths and eligibility.</p></div><div><b>02</b><strong>Prepare</strong><p>Use syllabus, resources and mock tests.</p></div><div><b>03</b><strong>Track</strong><p>Understand your practice performance.</p></div><div><b>04</b><strong>Apply</strong><p>Move to verified government opportunities.</p></div></div>
            </section>
            <section className="edu-section">
              <div className="edu-section-title"><div><span>OFFICIAL SOURCES</span><h2>Go to the authority, not a copied PDF</h2></div></div>
              <div className="edu-resource-grid">{officialLinks.map((r) => <a href={r.url} target="_blank" rel="noreferrer" key={r.name}><strong>{r.name}</strong><span>{r.note}</span><em>Open official site ↗</em></a>)}</div>
            </section>
          </>
        )}

        {tab === "careers" && (
          <section className="edu-section">
            {selectedCareer ? <CareerDetail path={selectedCareer} onClose={() => setSelectedCareer(null)} /> : <>
              <div className="edu-section-title"><div><span>CAREER DISCOVERY</span><h2>Choose a path that fits your stage</h2></div></div>
              <div className="edu-filter-row"><button className={stage === "all" ? "is-active" : ""} onClick={() => setStage("all")}>All</button>{(Object.keys(stageMeta) as Stage[]).map((s) => <button key={s} className={stage === s ? "is-active" : ""} onClick={() => setStage(s)}>{stageMeta[s].label}</button>)}</div>
              <div className="edu-career-grid">{visiblePaths.map((path) => <CareerCard key={path.id} path={path} onOpen={() => setSelectedCareer(path)} />)}</div>
            </>}
          </section>
        )}

        {tab === "exams" && (
          <section className="edu-section">
            <div className="edu-section-title"><div><span>EXAM DISCOVERY</span><h2>Prepare for the next milestone</h2></div></div>
            <div className="edu-exam-grid">{Array.from(new Set(allPaths.flatMap((p) => p.exams))).slice(0, 24).map((exam) => {
              const matches = allPaths.filter((p) => p.exams.includes(exam));
              return <div className="edu-exam-card" key={exam}><span>🎯</span><strong>{exam}</strong><small>{matches.length} career pathways</small><button type="button" onClick={() => goTab("tests")}>Practice related tests →</button></div>;
            })}</div>
          </section>
        )}

        {tab === "tests" && <section className="edu-section"><MockTests tests={liveTests} /></section>}

        {tab === "resources" && (
          <section className="edu-section">
            <div className="edu-section-title"><div><span>RESOURCE LIBRARY</span><h2>Verified links + EduPath originals</h2></div></div>
            <div className="edu-notice"><strong>Resource policy</strong><span>Official and copyrighted material is opened at its authoritative source. EduPath does not present copied textbooks or official exam papers as downloadable files.</span></div>
            <div className="edu-resource-grid">{officialLinks.map((r) => <a href={r.url} target="_blank" rel="noreferrer" key={r.name}><strong>{r.name}</strong><span>{r.note}</span><em>Official source ↗</em></a>)}</div>
            <h3 className="edu-subheading">Study subjects</h3>
            <div className="edu-subject-grid">{subjects.slice(0, 12).map((s) => <div className="edu-subject-card" key={s.id}><span>{s.icon}</span><div><strong>{s.name}</strong><small>{s.chapters.length} chapters · {s.textbooks.length} recommended books</small></div></div>)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
