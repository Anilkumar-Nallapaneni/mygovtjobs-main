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

export async function loadPublishedMockTests(): Promise<MockTest[] | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('education_mock_tests').select('*').eq('is_published', true).order('title')
  if (error || !data?.length) return null
  const tests = await Promise.all(data.map(async (row) => {
    const q = await supabase.from('education_questions').select('*').eq('test_id', row.id).eq('is_published', true).order('sort_order')
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
        question: item.question_text,
        options: item.options ?? [],
        correctAnswer: item.correct_index,
        explanation: item.explanation ?? '',
        subject: item.subject ?? row.subject,
        difficulty: (item.difficulty ?? 'Medium') as 'Easy' | 'Medium' | 'Hard',
      })),
    } as MockTest
  }))
  return tests
}

export async function saveEducationAttempt(input: {
  userId: string
  testId: string
  score: number
  maxScore: number
  correctCount: number
  wrongCount: number
  unansweredCount: number
  accuracy: number
  durationSeconds?: number
  answers?: Array<{ questionId: string | number; selectedIndex?: number; isCorrect: boolean; marksAwarded: number }>
}) {
  const supabase = await getSupabase()
  if (!supabase) return { ok: false as const, error: 'supabase_not_configured' }
  const { data, error } = await supabase.from('education_test_attempts').insert({
    user_id: input.userId,
    test_id: input.testId,
    score: input.score,
    max_score: input.maxScore,
    correct_count: input.correctCount,
    wrong_count: input.wrongCount,
    unanswered_count: input.unansweredCount,
    accuracy: input.accuracy,
    duration_seconds: input.durationSeconds ?? null,
  }).select('id').single()
  if (error || !data?.id) return { ok: false as const, error: 'failed' }
  if (input.answers?.length) {
    // The UI's question ids are stable only inside a test. We resolve them to DB question UUIDs.
    const questions = await supabase.from('education_questions').select('id,sort_order').eq('test_id', input.testId).order('sort_order')
    if (!questions.error) {
      const rows = input.answers.map((answer) => ({
        attempt_id: data.id,
        question_id: questions.data?.[Number(answer.questionId) - 1]?.id,
        selected_index: answer.selectedIndex ?? null,
        is_correct: answer.isCorrect,
        marks_awarded: answer.marksAwarded,
      })).filter((row) => Boolean(row.question_id))
      if (rows.length) await supabase.from('education_attempt_answers').insert(rows)
    }
  }
  return { ok: true as const, id: String(data.id) }
}
