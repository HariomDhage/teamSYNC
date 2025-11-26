-- Seed data for TeamSync
-- This file creates the "Acme Inc." organization and initial users/teams

-- 1. Create Users (handled via auth.users usually, but for seed we insert into public tables and assume auth exists or is mocked)
-- NOTE: In a real Supabase local dev environment, you'd use `supabase db reset` which applies this.
-- Since we can't easily insert into auth.users from here without knowing IDs, 
-- we will assume the user creates an account and we just provide the SQL to set up the Org structure 
-- once they have an ID.

-- HOWEVER, for the purpose of this "Take Home" assignment, let's provide a script 
-- that can be run in the SQL Editor *after* the user has signed up, to populate their org.

-- Clear existing data for a clean slate (optional, be careful)
-- TRUNCATE organizations CASCADE;

-- We will use a DO block to insert data for the CURRENT user (assuming they run this in SQL Editor)
-- Or we can just provide sample INSERT statements that the user can modify.

-- Let's create a "Demo Data" script that inserts a sample structure for a *new* organization.

DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_team_id UUID;
BEGIN
    -- Get the ID of the currently signed-in user (or the first user in the system if running as admin)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Please sign up first.';
        RETURN;
    END IF;

    -- 1. Create "Acme Inc." Organization
    INSERT INTO organizations (name)
    VALUES ('Acme Inc.')
    RETURNING id INTO v_org_id;

    -- 2. Add current user as Owner
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';

    -- 3. Create "Engineering" Team
    INSERT INTO teams (organization_id, name, description, created_by)
    VALUES (v_org_id, 'Engineering', 'Core product development team', v_user_id)
    RETURNING id INTO v_team_id;

    -- 4. Create "Sales" Team
    INSERT INTO teams (organization_id, name, description, created_by)
    VALUES (v_org_id, 'Sales', 'Global sales and marketing', v_user_id);

    -- 5. Log Activity
    INSERT INTO activity_logs (organization_id, user_id, action, metadata)
    VALUES 
        (v_org_id, v_user_id, 'organization_created', '{"name": "Acme Inc."}'),
        (v_org_id, v_user_id, 'team_created', '{"team_name": "Engineering"}'),
        (v_org_id, v_user_id, 'team_created', '{"team_name": "Sales"}');

    RAISE NOTICE 'Seeded Acme Inc. for user %', v_user_id;
END $$;
