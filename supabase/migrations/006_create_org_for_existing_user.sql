-- =====================================================
-- Create Organization for Existing User
-- =====================================================
-- This will create an organization for your existing account
-- Replace the email below with YOUR email address

-- First, run the RPC migration if you haven't already
-- (This is from 005_rpc_create_org.sql - run it first if not done)

-- Then run this to create an organization for your existing user:

DO $$
DECLARE
  user_email TEXT := 'hariomdhage@gmail.com';  -- CHANGE THIS to your email
  user_id UUID;
  new_org_id UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = user_id) THEN
    RAISE NOTICE 'User already has an organization';
    RETURN;
  END IF;

  -- Create organization
  INSERT INTO organizations (name)
  VALUES ('My Organization')  -- CHANGE THIS to your desired org name
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, user_id, 'owner');

  -- Log the activity
  INSERT INTO activity_logs (organization_id, user_id, action, metadata)
  VALUES (
    new_org_id,
    user_id,
    'organization_created',
    jsonb_build_object('organization_name', 'My Organization')
  );

  RAISE NOTICE 'Organization created with ID: %', new_org_id;
END $$;
