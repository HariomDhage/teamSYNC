-- =====================================================
-- FIX: Organization Creation RLS
-- =====================================================

-- The issue is that the "Users can create organizations" policy might be conflicting
-- or not properly allowing the INSERT because the user isn't a member yet.

-- 1. Drop the existing INSERT policy for organizations
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- 2. Create a more permissive INSERT policy
-- Allow ANY authenticated user to create an organization
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Ensure the SELECT policy allows seeing the org you just created
-- (The existing policy relies on organization_members, which is fine, 
-- but we need to make sure the transaction flow works)

-- 4. Also fix activity_logs just in case
DROP POLICY IF EXISTS "Anyone in org can insert activity logs" ON activity_logs;

CREATE POLICY "Anyone in org can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    -- Allow if user is in the org
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = activity_logs.organization_id
      AND user_id = auth.uid()
    )
    OR
    -- OR if it's an 'organization_created' action (user might not be member yet in same tx)
    (action = 'organization_created' AND auth.role() = 'authenticated')
  );
