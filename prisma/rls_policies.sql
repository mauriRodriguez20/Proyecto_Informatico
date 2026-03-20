-- ============================================================
-- Microservice 02: Publications 
-- Schema: publications
-- RLS (Row Level Security) Policies
-- ============================================================

-- 1. Enable RLS on publications table
ALTER TABLE "publications"."publications" ENABLE ROW LEVEL SECURITY;

-- 2. Allow PUBLIC READ access (everyone can see publications)
CREATE POLICY "Allow public read" 
ON "publications"."publications" 
FOR SELECT 
USING (true);

-- 3. Allow CREATE access for ANY AUTHENTICATED user 
-- (MS-01's JWT is valid here)
CREATE POLICY "Allow authenticated create" 
ON "publications"."publications" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Allow UPDATE/DELETE only for the AUTHOR 
-- This policy assumes 'authorId' matches the 'sub' or 'id' in the JWT
CREATE POLICY "Allow author edit" 
ON "publications"."publications" 
FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = "authorId");

CREATE POLICY "Allow author delete" 
ON "publications"."publications" 
FOR DELETE 
TO authenticated 
USING (auth.uid()::text = "authorId");
