-- ============================================================
-- Microservicio 04: Interactions & Reputation
-- Schema: interactions
-- RLS (Row Level Security) Policies
-- ============================================================

-- Enable RLS
ALTER TABLE "interactions"."comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions"."ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions"."user_reputations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions"."user_stats" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "comments_public_read" ON "interactions"."comments";
DROP POLICY IF EXISTS "comments_authenticated_insert" ON "interactions"."comments";
DROP POLICY IF EXISTS "comments_owner_delete" ON "interactions"."comments";

DROP POLICY IF EXISTS "ratings_public_read" ON "interactions"."ratings";
DROP POLICY IF EXISTS "ratings_authenticated_upsert" ON "interactions"."ratings";

DROP POLICY IF EXISTS "user_reputations_public_read" ON "interactions"."user_reputations";
DROP POLICY IF EXISTS "user_reputations_service_write" ON "interactions"."user_reputations";

DROP POLICY IF EXISTS "user_stats_public_read" ON "interactions"."user_stats";
DROP POLICY IF EXISTS "user_stats_service_write" ON "interactions"."user_stats";

-- Public read access
CREATE POLICY "comments_public_read"
ON "interactions"."comments"
FOR SELECT
USING (true);

CREATE POLICY "ratings_public_read"
ON "interactions"."ratings"
FOR SELECT
USING (true);

CREATE POLICY "user_reputations_public_read"
ON "interactions"."user_reputations"
FOR SELECT
USING (true);

CREATE POLICY "user_stats_public_read"
ON "interactions"."user_stats"
FOR SELECT
USING (true);

-- Authenticated write access for comments
CREATE POLICY "comments_authenticated_insert"
ON "interactions"."comments"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "comments_owner_delete"
ON "interactions"."comments"
FOR DELETE
TO authenticated
USING (auth.uid()::text = "authorId");

-- Authenticated write access for ratings (upsert done as INSERT/UPDATE)
CREATE POLICY "ratings_authenticated_upsert"
ON "interactions"."ratings"
FOR ALL
TO authenticated
USING (auth.uid()::text = "raterId")
WITH CHECK (auth.uid()::text = "raterId");

-- Service-level writes for denormalized reputation/stats tables.
-- Enforced at API level in this microservice.
CREATE POLICY "user_reputations_service_write"
ON "interactions"."user_reputations"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "user_stats_service_write"
ON "interactions"."user_stats"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
