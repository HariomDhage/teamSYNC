-- Create a secure function to fetch organization members with their emails
-- This is necessary because the `organization_members` table doesn't store emails,
-- and client-side queries can't join with `auth.users` directly for security reasons.

-- Drop the function first to allow return type changes
DROP FUNCTION IF EXISTS get_organization_members_with_email(uuid);

CREATE OR REPLACE FUNCTION get_organization_members_with_email(org_id UUID)
RETURNS TABLE (
  member_id UUID,
  member_user_id UUID,
  member_role member_role,
  member_created_at TIMESTAMPTZ,
  member_email TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if executing user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om_check
    WHERE om_check.organization_id = org_id
    AND om_check.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    om.id,
    om.user_id,
    om.role,
    om.created_at,
    au.email::TEXT
  FROM organization_members om
  JOIN auth.users au ON om.user_id = au.id
  WHERE om.organization_id = org_id
  ORDER BY om.created_at DESC;
END;
$$ LANGUAGE plpgsql;

