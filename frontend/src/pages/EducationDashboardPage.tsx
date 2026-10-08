import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { loadEducationAttempts, updateEducationProfile, loadPublishedCareers, type EducationAttempt } from '@/lib/educationApi'
import type { CareerPath } from '@/data/education/careerPaths'
const stages = ['after10th', 'after12th', 'afterDegree', 'afterPG']
const exams = ['JEE Main', 'NEET', 'CUET', 'GATE', 'CAT', 'UPSC CSE', 'SSC', 'Banking', 'Railway']

export default function EducationDashboardPage() {
  const { user, profile, loading: authLoading, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempts, setAttempts] = useState<EducationAttempt[]>([])
  const [stage, setStage] = useState(profile?.education_stage ?? '')
  const [board, setBoard] = useState(profile?.education_board ?? '')
  const [stream, setStream] = useState(profile?.education_stream ?? '')
  const [stateName, setStateName] = useState(profile?.education_state ?? '')
  const [targetExams, setTargetExams] = useState<string[]>(profile?.target_exams ?? [])
  const [targetCareers, setTargetCareers] = useState<string[]>(profile?.target_careers ?? [])
  const [careerOptions, setCareerOptions] = useState<CareerPath[]>([])

  useEffect(() => {
    setStage(profile?.education_stage ?? '')
    setBoard(profile?.education_board ?? '')
    setStream(profile?.education_stream ?? '')
    setStateName(profile?.education_state ?? '')
    setTargetExams(profile?.target_exams ?? [])
    setTargetCareers(profile?.target_careers ?? [])
  }, [profile])

  useEffect(() => {
    if (user) void loadEducationAttempts(user.id).then(setAttempts)
    void loadPublishedCareers().then((items) => { if (items) setCareerOptions(items) })
  }, [user])

  const averageAccuracy = useMemo(() => {
    if (!attempts.length) return 0
    return Math.round(attempts.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / attempts.length)
  }, [attempts])

  const toggleCareer = (id: string) => { setTargetCareers((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }

  const toggleExam = (exam: string) => {
    setTargetExams((current) => current.includes(exam) ? current.filter((item) => item !== exam) : [...current, exam])
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    const result = await updateEducationProfile(user.id, {
      education_stage: stage || null,
      education_board: board || null,
      education_stream: stream || null,
      education_state: stateName || null,
      target_exams: targetExams,
      target_careers: targetCareers,
    })
    setSaving(false)
    setSaved(result.ok)
    if (result.ok) window.setTimeout(() => setSaved(false), 2500)
  }

  if (authLoading) return <main className="edu-dashboard-shell"><div className="edu-dashboard-card">Loading your education dashboard…</div></main>

  if (!user) {
    return (
      <main className="edu-dashboard-shell">
        <section className="edu-dashboard-hero">
          <span className="edu-dashboard-eyebrow">MY EDUCATION</span>
          <h1>Build your personal education roadmap.</h1>
          <p>Sign in once and keep your career interests, exam goals and mock-test performance connected to your LiveGovtJobs account.</p>
        </section>
        <section className="edu-dashboard-card edu-login-card">
          <h2>Sign in with email</h2>
          <form onSubmit={async (event) => { event.preventDefault(); const result = await signInWithEmail(email); if (result.ok) setSaved(true) }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required aria-label="Email address" />
            <button type="submit">Send sign-in link</button>
          </form>
          {saved && <p className="edu-success">Check your email for the secure sign-in link.</p>}
          <Link to="/education" className="edu-dashboard-link">Continue exploring without an account →</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="edu-dashboard-shell">
      <section className="edu-dashboard-hero">
        <span className="edu-dashboard-eyebrow">MY EDUCATION</span>
        <h1>{profile?.display_name ? `Welcome back, ${profile.display_name}.` : 'Build your education roadmap.'}</h1>
        <p>Your government-job account and education journey now use the same identity.</p>
        <div className="edu-dashboard-actions"><Link to="/education" className="edu-dashboard-link">Explore careers</Link><Link to="/education/mock-tests" className="edu-dashboard-link">Take a mock test</Link></div>
      </section>

      <section className="edu-stat-grid">
        <article><strong>{attempts.length}</strong><span>Tests completed</span></article>
        <article><strong>{averageAccuracy}%</strong><span>Average accuracy</span></article>
        <article><strong>{targetExams.length}</strong><span>Target exams</span></article>
        <article><strong>{profile?.favorite_state_codes?.length ?? 0}</strong><span>Saved job states</span></article>
      </section>

      <div className="edu-dashboard-grid">
        <section className="edu-dashboard-card">
          <div className="edu-card-heading"><div><span className="edu-dashboard-eyebrow">PROFILE</span><h2>Your education profile</h2></div></div>
          <form className="edu-profile-form" onSubmit={saveProfile}>
            <label>Current stage<select value={stage} onChange={(e) => setStage(e.target.value)}><option value="">Select stage</option>{stages.map((item) => <option key={item} value={item}>{item === 'after10th' ? 'After 10th' : item === 'after12th' ? 'After 12th' : item === 'afterDegree' ? 'After Degree' : 'After PG'}</option>)}</select></label>
            <label>Board / university<input value={board} onChange={(e) => setBoard(e.target.value)} placeholder="CBSE, State Board, University…" /></label>
            <label>Stream<input value={stream} onChange={(e) => setStream(e.target.value)} placeholder="MPC, BiPC, Commerce, Arts…" /></label>
            <label>State<input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Telangana, Karnataka…" /></label>
            <fieldset><legend>Target careers</legend><div className="edu-exam-pills">{careerOptions.slice(0,16).map((career) => <button key={career.id} type="button" className={targetCareers.includes(career.id) ? 'selected' : ''} onClick={() => toggleCareer(career.id)}>{career.icon} {career.name}</button>)}</div></fieldset><fieldset><legend>Target exams</legend><div className="edu-exam-pills">{exams.map((exam) => <button key={exam} type="button" className={targetExams.includes(exam) ? 'selected' : ''} onClick={() => toggleExam(exam)}>{exam}</button>)}</div></fieldset>
            <button className="edu-save-button" disabled={saving} type="submit">{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save education profile'}</button>
          </form>
        </section>

        <section className="edu-dashboard-card">
          <div className="edu-card-heading"><div><span className="edu-dashboard-eyebrow">PERFORMANCE</span><h2>Recent mock tests</h2></div></div>
          {attempts.length === 0 ? <div className="edu-empty"><p>Your test history will appear here after you complete a database-backed attempt.</p><Link to="/education/mock-tests">Start your first test →</Link></div> : <div className="edu-attempt-list">{attempts.map((attempt) => <article key={attempt.id}><div><strong>{attempt.test_id}</strong><span>{new Date(attempt.completed_at).toLocaleDateString()}</span></div><b>{Math.round(Number(attempt.accuracy))}%</b></article>)}</div>}
        </section>
      </div>

      <section className="edu-dashboard-card"><div className="edu-card-heading"><div><span className="edu-dashboard-eyebrow">RECOMMENDATIONS</span><h2>Your next career options</h2></div></div><div className="edu-attempt-list">{careerOptions.filter(c => !targetCareers.length || targetCareers.includes(c.id)).slice(0,5).map(c => <article key={c.id}><div><strong>{c.icon} {c.name}</strong><span>{c.eligibility} · {c.duration}</span></div><Link to={`/education/careers/${c.id}`}>View roadmap →</Link></article>)}</div></section>

        <section className="edu-dashboard-card edu-next-card"><div><span className="edu-dashboard-eyebrow">NEXT STEP</span><h2>Connect preparation with real opportunities</h2><p>After choosing a career or exam, explore matching government jobs on LiveGovtJobs without creating another account.</p></div><Link to="/jobs">Explore government jobs →</Link></section>
    </main>
  )
}
