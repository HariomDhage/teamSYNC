-- Optimize RLS policies by using a stable helper function

-- 1. Update helper function to be STABLE for better performance
CREATE OR REPLACE FUNCTION public.has_role_in_org(_organization_id UUID, _user_id UUID, _roles member_role[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE -- Mark as stable to allow caching within transaction
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

-- 2. Refactor Teams Policies
DROP POLICY IF EXISTS "Org members can view teams" ON teams;
DROP POLICY IF EXISTS "Admins can create teams" ON teams;
DROP POLICY IF EXISTS "Admins can update teams" ON teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON teams;

CREATE POLICY "Org members can view teams"
  ON teams FOR SELECT
  USING ( has_role_in_org(organization_id, auth.uid()) );

CREATE POLICY "Admins can create teams"
  ON teams FOR INSERT
  WITH CHECK ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

CREATE POLICY "Admins can update teams"
  ON teams FOR UPDATE
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

CREATE POLICY "Admins can delete teams"
  ON teams FOR DELETE
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

-- 3. Refactor Activity Logs Policies
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Org members can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone in org can insert activity logs" ON activity_logs;

CREATE POLICY "Org members can view activity logs"
  ON activity_logs FOR SELECT
  USING ( has_role_in_org(organization_id, auth.uid()) );

CREATE POLICY "Anyone in org can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK ( has_role_in_org(organization_id, auth.uid()) );

-- 4. Refactor API Keys Policies
DROP POLICY IF EXISTS "Org admins/owners can view api keys" ON api_keys;
DROP POLICY IF EXISTS "Org admins/owners can manage api keys" ON api_keys;

CREATE POLICY "Org admins/owners can view api keys"
  ON api_keys FOR SELECT
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

CREATE POLICY "Org admins/owners can manage api keys"
  ON api_keys FOR ALL
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

-- 5. Refactor Webhooks Policies
DROP POLICY IF EXISTS "Org admins/owners can view webhooks" ON webhooks;
DROP POLICY IF EXISTS "Org admins/owners can manage webhooks" ON webhooks;

CREATE POLICY "Org admins/owners can view webhooks"
  ON webhooks FOR SELECT
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

CREATE POLICY "Org admins/owners can manage webhooks"
  ON webhooks FOR ALL
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );

-- 6. Refactor Organization Roles Policies
DROP POLICY IF EXISTS "Org members can view roles" ON organization_roles;
DROP POLICY IF EXISTS "Admins and owners can manage roles" ON organization_roles;

CREATE POLICY "Org members can view roles"
  ON organization_roles FOR SELECT
  USING ( has_role_in_org(organization_id, auth.uid()) );

CREATE POLICY "Admins and owners can manage roles"
  ON organization_roles FOR ALL
  USING ( has_role_in_org(organization_id, auth.uid(), ARRAY['admin', 'owner']::member_role[]) );
