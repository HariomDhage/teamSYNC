-- =====================================================
-- FIX: Secure Organization Creation via RPC
-- =====================================================

-- We are using a SECURITY DEFINER function to handle the entire flow
-- (Create Org -> Add Member -> Log Activity) in one transaction.
-- This bypasses RLS issues where the user can't see the org they just created.

CREATE OR REPLACE FUNCTION create_new_organization(org_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Create Organization
  INSERT INTO organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- 2. Add User as Owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'owner');

  -- 3. Log Activity
  INSERT INTO activity_logs (organization_id, user_id, action, metadata)
  VALUES (
    new_org_id, 
    current_user_id, 
    'organization_created', 
    jsonb_build_object('organization_name', org_name)
  );

  RETURN new_org_id;
END;
$$;
