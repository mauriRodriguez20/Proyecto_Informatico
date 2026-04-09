-- ============================================================
-- Microservicio 03: Questions & Answers
-- Schema: questions
-- RLS (Row Level Security) Policies
-- ============================================================

-- Enable RLS on tables
ALTER TABLE "questions"."questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions"."question_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions"."answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions"."answer_votes" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they already exist (idempotent script)
DROP POLICY IF EXISTS "questions_public_read" ON "questions"."questions";
DROP POLICY IF EXISTS "question_tags_public_read" ON "questions"."question_tags";
DROP POLICY IF EXISTS "answers_public_read" ON "questions"."answers";
DROP POLICY IF EXISTS "answer_votes_public_read" ON "questions"."answer_votes";

DROP POLICY IF EXISTS "questions_authenticated_insert" ON "questions"."questions";
DROP POLICY IF EXISTS "question_tags_owner_insert" ON "questions"."question_tags";
DROP POLICY IF EXISTS "answers_authenticated_insert" ON "questions"."answers";
DROP POLICY IF EXISTS "answer_votes_authenticated_insert" ON "questions"."answer_votes";

DROP POLICY IF EXISTS "questions_owner_update" ON "questions"."questions";
DROP POLICY IF EXISTS "question_tags_owner_update" ON "questions"."question_tags";
DROP POLICY IF EXISTS "answers_author_or_question_owner_update" ON "questions"."answers";
DROP POLICY IF EXISTS "answer_votes_voter_update" ON "questions"."answer_votes";

DROP POLICY IF EXISTS "questions_owner_delete" ON "questions"."questions";
DROP POLICY IF EXISTS "question_tags_owner_delete" ON "questions"."question_tags";
DROP POLICY IF EXISTS "answers_author_or_question_owner_delete" ON "questions"."answers";
DROP POLICY IF EXISTS "answer_votes_voter_delete" ON "questions"."answer_votes";

-- Public read
CREATE POLICY "questions_public_read"
ON "questions"."questions"
FOR SELECT
USING (true);

CREATE POLICY "question_tags_public_read"
ON "questions"."question_tags"
FOR SELECT
USING (true);

CREATE POLICY "answers_public_read"
ON "questions"."answers"
FOR SELECT
USING (true);

CREATE POLICY "answer_votes_public_read"
ON "questions"."answer_votes"
FOR SELECT
USING (true);

-- Authenticated inserts
CREATE POLICY "questions_authenticated_insert"
ON "questions"."questions"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "question_tags_owner_insert"
ON "questions"."question_tags"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
);

CREATE POLICY "answers_authenticated_insert"
ON "questions"."answers"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "answer_votes_authenticated_insert"
ON "questions"."answer_votes"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "voterId");

-- Updates
CREATE POLICY "questions_owner_update"
ON "questions"."questions"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "authorId")
WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "question_tags_owner_update"
ON "questions"."question_tags"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
);

CREATE POLICY "answers_author_or_question_owner_update"
ON "questions"."answers"
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = "authorId"
  OR EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
)
WITH CHECK (
  auth.uid()::text = "authorId"
  OR EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
);

CREATE POLICY "answer_votes_voter_update"
ON "questions"."answer_votes"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "voterId")
WITH CHECK (auth.uid()::text = "voterId");

-- Deletes
CREATE POLICY "questions_owner_delete"
ON "questions"."questions"
FOR DELETE
TO authenticated
USING (auth.uid()::text = "authorId");

CREATE POLICY "question_tags_owner_delete"
ON "questions"."question_tags"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
);

CREATE POLICY "answers_author_or_question_owner_delete"
ON "questions"."answers"
FOR DELETE
TO authenticated
USING (
  auth.uid()::text = "authorId"
  OR EXISTS (
    SELECT 1
    FROM "questions"."questions" q
    WHERE q."id" = "questionId"
      AND q."authorId" = auth.uid()::text
  )
);

CREATE POLICY "answer_votes_voter_delete"
ON "questions"."answer_votes"
FOR DELETE
TO authenticated
USING (auth.uid()::text = "voterId");

