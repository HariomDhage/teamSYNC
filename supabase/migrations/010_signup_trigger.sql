-- =====================================================
-- Auto-Create Organization on Signup
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_name TEXT;
  new_org_id UUID;
BEGIN
  -- Get organization name from metadata
  org_name := new.raw_user_meta_data->>'organization_name';

  -- If no org name, do nothing (maybe invited user or just logging in)
  IF org_name IS NULL THEN
    RETURN new;
  END IF;

  -- Create Organization
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- Add User as Owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, new.id, 'owner');

  -- Log Activity
  INSERT INTO public.activity_logs (organization_id, user_id, action, metadata)
  VALUES (
    new_org_id,
    new.id,
    'organization_created',
    jsonb_build_object('organization_name', org_name)
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
-- Ensure we drop it first to avoid errors if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
