-- =====================================================
-- FIX: Infinite Recursion in RLS Policies
-- =====================================================

-- 1. Create a secure function to check membership without triggering RLS
-- This function runs as "Security Definer" (superuser privileges) to bypass the recursion
CREATE OR REPLACE FUNCTION public.has_role_in_org(_organization_id UUID, _user_id UUID, _roles member_role[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no roles specified, just check membership
  IF _roles IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = _organization_id
      AND user_id = _user_id
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND role = ANY(_roles)
    );
  END IF;
END;
$$;

-- 2. Drop existing problematic policies on organization_members
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can invite members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- 3. Re-create policies using the secure function to prevent recursion

-- SELECT: Members can view other members in their orgs
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (
    has_role_in_org(organization_id, auth.uid())
  );

-- INSERT: Admins/Owners can invite, OR anyone can create the first member (owner)
CREATE POLICY "Admins can invite members"
  ON organization_members FOR INSERT
  WITH CHECK (
    -- Admin/Owner can invite
    has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[])
    OR
    -- Or it's the first member (new org) - we use a direct check here but the SELECT policy above is now safe
    NOT EXISTS (
      SELECT 1 FROM organization_members WHERE organization_id = organization_id
    )
  );

-- UPDATE: Admins/Owners can update
CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  USING (
    has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[])
  );

-- DELETE: Admins/Owners can remove
CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  USING (
    has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[])
  );
