-- =====================================================
-- Simple: Create Organization for First User
-- =====================================================
-- This creates an organization for the first user in your database
-- (which should be you since you just signed up)

DO $$
DECLARE
  first_user_id UUID;
  first_user_email TEXT;
  new_org_id UUID;
BEGIN
  -- Get the first user
  SELECT id, email INTO first_user_id, first_user_email
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in database';
  END IF;

  RAISE NOTICE 'Found user: % (ID: %)', first_user_email, first_user_id;

  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = first_user_id) THEN
    RAISE NOTICE 'User already has an organization';
    RETURN;
  END IF;

  -- Create organization
  INSERT INTO organizations (name)
  VALUES ('My Organization')
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, first_user_id, 'owner');

  -- Log the activity
  INSERT INTO activity_logs (organization_id, user_id, action, metadata)
  VALUES (
    new_org_id,
    first_user_id,
    'organization_created',
    jsonb_build_object('organization_name', 'My Organization')
  );

  RAISE NOTICE 'Organization created successfully with ID: %', new_org_id;
END $$;
