-- Education platform schema for the unified LiveGovtJobs + EduPath app.
-- Safe to run after the existing profile migration. Uses the same auth.users identity.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_stage TEXT,
  ADD COLUMN IF NOT EXISTS education_board TEXT,
  ADD COLUMN IF NOT EXISTS education_stream TEXT,
  ADD COLUMN IF NOT EXISTS education_state TEXT,
  ADD COLUMN IF NOT EXISTS target_careers TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_exams TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.education_careers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('after10th','after12th','afterDegree','afterPG')),
  description TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  eligibility TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'Moderate',
  avg_starting_salary TEXT,
  scope TEXT,
  icon TEXT,
  exams TEXT[] NOT NULL DEFAULT '{}',
  top_colleges TEXT[] NOT NULL DEFAULT '{}',
  key_skills TEXT[] NOT NULL DEFAULT '{}',
  job_roles TEXT[] NOT NULL DEFAULT '{}',
  next_steps TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('official','edupath-generated','external','catalogue-only')),
  provider TEXT,
  description TEXT,
  source_url TEXT,
  file_url TEXT,
  exam TEXT,
  subject TEXT,
  stage TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_mock_tests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  exam TEXT NOT NULL,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_marks INTEGER NOT NULL DEFAULT 0,
  stages TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES public.education_mock_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  subject TEXT,
  difficulty TEXT,
  marks NUMERIC NOT NULL DEFAULT 4,
  negative_marks NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES public.education_mock_tests(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.education_test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.education_questions(id) ON DELETE CASCADE,
  selected_index INTEGER,
  is_correct BOOLEAN,
  marks_awarded NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.education_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  type TEXT,
  website TEXT,
  official_website TEXT,
  courses TEXT[] NOT NULL DEFAULT '{}',
  entrance_exams TEXT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT,
  eligibility TEXT,
  qualification TEXT,
  state TEXT,
  amount TEXT,
  deadline DATE,
  official_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS education_careers_stage_idx ON public.education_careers(stage);
CREATE INDEX IF NOT EXISTS education_resources_exam_idx ON public.education_resources(exam);
CREATE INDEX IF NOT EXISTS education_questions_test_idx ON public.education_questions(test_id, sort_order);
CREATE INDEX IF NOT EXISTS education_attempts_user_idx ON public.education_test_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS education_colleges_state_idx ON public.education_colleges(state);
CREATE INDEX IF NOT EXISTS education_scholarships_deadline_idx ON public.education_scholarships(deadline);

ALTER TABLE public.education_careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_scholarships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS education_careers_public_read ON public.education_careers;
CREATE POLICY education_careers_public_read ON public.education_careers FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS education_resources_public_read ON public.education_resources;
CREATE POLICY education_resources_public_read ON public.education_resources FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS education_mock_tests_public_read ON public.education_mock_tests;
CREATE POLICY education_mock_tests_public_read ON public.education_mock_tests FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS education_questions_public_read ON public.education_questions;
CREATE POLICY education_questions_public_read ON public.education_questions FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS education_colleges_public_read ON public.education_colleges;
CREATE POLICY education_colleges_public_read ON public.education_colleges FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS education_scholarships_public_read ON public.education_scholarships;
CREATE POLICY education_scholarships_public_read ON public.education_scholarships FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS education_attempts_own_read ON public.education_test_attempts;
CREATE POLICY education_attempts_own_read ON public.education_test_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS education_attempts_own_insert ON public.education_test_attempts;
CREATE POLICY education_attempts_own_insert ON public.education_test_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS education_answers_own_read ON public.education_attempt_answers;
CREATE POLICY education_answers_own_read ON public.education_attempt_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.education_test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);
DROP POLICY IF EXISTS education_answers_own_insert ON public.education_attempt_answers;
CREATE POLICY education_answers_own_insert ON public.education_attempt_answers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.education_test_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);

GRANT SELECT ON public.education_careers, public.education_resources, public.education_mock_tests,
  public.education_questions, public.education_colleges, public.education_scholarships TO anon, authenticated;
GRANT SELECT, INSERT ON public.education_test_attempts, public.education_attempt_answers TO authenticated;

-- Keep timestamps current without requiring application code.
CREATE OR REPLACE FUNCTION public.touch_education_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS education_careers_touch ON public.education_careers;
CREATE TRIGGER education_careers_touch BEFORE UPDATE ON public.education_careers FOR EACH ROW EXECUTE FUNCTION public.touch_education_updated_at();
DROP TRIGGER IF EXISTS education_resources_touch ON public.education_resources;
CREATE TRIGGER education_resources_touch BEFORE UPDATE ON public.education_resources FOR EACH ROW EXECUTE FUNCTION public.touch_education_updated_at();
DROP TRIGGER IF EXISTS education_mock_tests_touch ON public.education_mock_tests;
CREATE TRIGGER education_mock_tests_touch BEFORE UPDATE ON public.education_mock_tests FOR EACH ROW EXECUTE FUNCTION public.touch_education_updated_at();
DROP TRIGGER IF EXISTS education_colleges_touch ON public.education_colleges;
CREATE TRIGGER education_colleges_touch BEFORE UPDATE ON public.education_colleges FOR EACH ROW EXECUTE FUNCTION public.touch_education_updated_at();
DROP TRIGGER IF EXISTS education_scholarships_touch ON public.education_scholarships;
CREATE TRIGGER education_scholarships_touch BEFORE UPDATE ON public.education_scholarships FOR EACH ROW EXECUTE FUNCTION public.touch_education_updated_at();

-- Stable question identity for API imports and idempotent future seeders.
ALTER TABLE public.education_questions ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS education_questions_external_id_idx
  ON public.education_questions(external_id) WHERE external_id IS NOT NULL;
