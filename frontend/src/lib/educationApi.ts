import { getSupabase } from '@/lib/supabase'
import type { CareerPath, MockTest } from '@/data/education/careerPaths'

export type EducationProfilePatch = {
  education_stage?: string | null
  education_board?: string | null
  education_stream?: string | null
  education_state?: string | null
  target_careers?: string[]
  target_exams?: string[]
}

export type EducationAttempt = {
  id: string
  test_id: string
  score: number
  max_score: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  accuracy: number
  completed_at: string
}

export async function updateEducationProfile(userId: string, patch: EducationProfilePatch) {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, error: 'supabase_not_configured' as const }
  const { error } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', userId)
  return error ? { ok: false, error: 'failed' as const } : { ok: true as const }
}

export async function loadEducationAttempts(userId: string): Promise<EducationAttempt[]> {
  const supabase = await getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('education_test_attempts')
    .select('id,test_id,score,max_score,correct_count,wrong_count,unanswered_count,accuracy,completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(20)
  if (error) return []
  return (data ?? []) as EducationAttempt[]
}

export async function loadPublishedCareers(): Promise<CareerPath[] | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('education_careers').select('*').eq('is_published', true).order('name')
  if (error || !data?.length) return null
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    stage: row.stage,
    icon: row.icon ?? '🎓',
    description: row.description ?? '',
    duration: row.duration ?? '',
    eligibility: row.eligibility ?? '',
    difficulty: row.difficulty ?? 'Moderate',
    avgStartingSalary: row.avg_starting_salary ?? 'Varies by role',
    scope: row.scope ?? 'Medium',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-100',
    steps: [],
    exams: row.exams ?? [],
    topColleges: row.top_colleges ?? [],
    keySkills: row.key_skills ?? [],
    jobRoles: row.job_roles ?? [],
    nextSteps: row.next_steps ?? [],
    salarySource: undefined,
    salarySourceUrl: row.source_url ?? undefined,
  })) as CareerPath[]
}

const QUESTION_COLUMNS = 'id,test_id,question_text,options,subject,difficulty,marks,negative_marks,sort_order'

export async function loadPublishedMockTests(): Promise<MockTest[] | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('education_mock_tests').select('*').eq('is_published', true).order('title')
  if (error || !data?.length) return null
  const tests = await Promise.all(data.map(async (row) => {
    const q = await supabase.from('education_questions').select(QUESTION_COLUMNS).eq('test_id', row.id).eq('is_published', true).order('sort_order')
    return {
      id: row.id,
      title: row.title,
      exam: row.exam,
      subject: row.subject,
      stages: (row.stages ?? []) as MockTest['stages'],
      duration: row.duration_minutes ?? 30,
      totalQuestions: row.total_questions ?? q.data?.length ?? 0,
      totalMarks: row.total_marks ?? 0,
      questions: (q.data ?? []).map((item, index) => ({
        id: index + 1,
        dbId: item.id,
        question: item.question_text,
        options: item.options ?? [],
        correctAnswer: -1,
        explanation: '',
        subject: item.subject ?? row.subject,
        difficulty: (item.difficulty ?? 'Medium') as 'Easy' | 'Medium' | 'Hard',
      })),
    } as MockTest
  }))
  return tests
}

export type GradedQuestion = {
  questionId: string
  correctIndex: number
  explanation: string
  selectedIndex: number | null
  isCorrect: boolean
}

export async function submitEducationAttempt(input: {
  testId: string
  durationSeconds?: number
  answers: Array<{ questionId: string; selectedIndex?: number }>
}): Promise<
  | { ok: true; id: string; score: number; maxScore: number; questions: GradedQuestion[] }
  | { ok: false; error: 'supabase_not_configured' | 'failed' }
> {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false, error: 'supabase_not_configured' }
  const { data, error } = await supabase.rpc('submit_education_attempt', {
    p_test_id: input.testId,
    p_answers: input.answers.map((answer) => ({
      question_id: answer.questionId,
      selected_index: answer.selectedIndex ?? null,
    })),
    p_duration_seconds: input.durationSeconds ?? null,
  })
  if (error || !data || typeof data !== 'object') return { ok: false, error: 'failed' }
  const body = data as {
    id?: string
    score?: number
    max_score?: number
    questions?: Array<{
      question_id?: string
      correct_index?: number
      explanation?: string | null
      selected_index?: number | null
      is_correct?: boolean
    }>
  }
  return {
    ok: true,
    id: String(body.id ?? ''),
    score: Number(body.score ?? 0),
    maxScore: Number(body.max_score ?? 0),
    questions: (body.questions ?? []).map((item) => ({
      questionId: String(item.question_id ?? ''),
      correctIndex: Number(item.correct_index ?? -1),
      explanation: item.explanation ?? '',
      selectedIndex: item.selected_index ?? null,
      isCorrect: Boolean(item.is_correct),
    })),
  }
}

/** @deprecated Scores are computed by submitEducationAttempt. Client inserts are rejected. */
export async function saveEducationAttempt(input: {
  testId: string
  durationSeconds?: number
  answers?: Array<{ questionId: string; selectedIndex?: number }>
}) {
  const answers = (input.answers ?? []).filter((answer) => typeof answer.questionId === 'string')
  return submitEducationAttempt({
    testId: input.testId,
    durationSeconds: input.durationSeconds,
    answers,
  })
}
