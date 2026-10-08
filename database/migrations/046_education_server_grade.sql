-- Hide mock-test answer keys from the browser and grade attempts in the database.
BEGIN;

REVOKE SELECT ON TABLE public.education_questions FROM anon, authenticated;
GRANT SELECT (
  id,
  test_id,
  question_text,
  options,
  subject,
  difficulty,
  marks,
  negative_marks,
  sort_order,
  is_published,
  created_at
) ON TABLE public.education_questions TO anon, authenticated;

REVOKE INSERT ON TABLE public.education_test_attempts FROM authenticated;
REVOKE INSERT ON TABLE public.education_attempt_answers FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_education_attempt(
  p_test_id text,
  p_answers jsonb,
  p_duration_seconds integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  question record;
  selected integer;
  awarded numeric;
  correct_count integer := 0;
  wrong_count integer := 0;
  unanswered_count integer := 0;
  score numeric := 0;
  max_score numeric := 0;
  attempt_id uuid;
  graded jsonb := '[]'::jsonb;
  accuracy numeric := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.education_mock_tests
    WHERE id = p_test_id AND is_published IS TRUE
  ) THEN
    RAISE EXCEPTION 'test not found' USING ERRCODE = 'P0002';
  END IF;

  FOR question IN
    SELECT id, correct_index, explanation, marks, negative_marks
    FROM public.education_questions
    WHERE test_id = p_test_id AND is_published IS TRUE
    ORDER BY sort_order, created_at
  LOOP
    max_score := max_score + question.marks;
    selected := NULL;

    SELECT CASE
      WHEN item->>'selected_index' IS NULL OR item->>'selected_index' = '' THEN NULL
      ELSE (item->>'selected_index')::integer
    END
    INTO selected
    FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) AS item
    WHERE item->>'question_id' = question.id::text
    LIMIT 1;

    IF selected IS NULL THEN
      unanswered_count := unanswered_count + 1;
      awarded := 0;
    ELSIF selected = question.correct_index THEN
      correct_count := correct_count + 1;
      awarded := question.marks;
      score := score + awarded;
    ELSE
      wrong_count := wrong_count + 1;
      awarded := -COALESCE(question.negative_marks, 0);
      score := score + awarded;
    END IF;

    graded := graded || jsonb_build_array(jsonb_build_object(
      'question_id', question.id,
      'correct_index', question.correct_index,
      'explanation', question.explanation,
      'selected_index', selected,
      'is_correct', selected IS NOT NULL AND selected = question.correct_index,
      'marks_awarded', awarded
    ));
  END LOOP;

  IF correct_count + wrong_count + unanswered_count > 0 THEN
    accuracy := round((correct_count::numeric / (correct_count + wrong_count + unanswered_count)) * 100, 2);
  END IF;

  INSERT INTO public.education_test_attempts (
    user_id, test_id, score, max_score, correct_count, wrong_count,
    unanswered_count, accuracy, duration_seconds
  ) VALUES (
    uid, p_test_id, score, max_score, correct_count, wrong_count,
    unanswered_count, accuracy, p_duration_seconds
  ) RETURNING id INTO attempt_id;

  INSERT INTO public.education_attempt_answers (
    attempt_id, question_id, selected_index, is_correct, marks_awarded
  )
  SELECT
    attempt_id,
    (item->>'question_id')::uuid,
    CASE WHEN item->>'selected_index' IS NULL OR item->>'selected_index' = 'null' THEN NULL
         ELSE (item->>'selected_index')::integer END,
    (item->>'is_correct')::boolean,
    (item->>'marks_awarded')::numeric
  FROM jsonb_array_elements(graded) AS item;

  RETURN jsonb_build_object(
    'id', attempt_id,
    'score', score,
    'max_score', max_score,
    'correct_count', correct_count,
    'wrong_count', wrong_count,
    'unanswered_count', unanswered_count,
    'accuracy', accuracy,
    'questions', graded
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_education_attempt(text, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_education_attempt(text, jsonb, integer) TO authenticated;

ALTER FUNCTION public.touch_education_updated_at() SET search_path = public;

COMMIT;
