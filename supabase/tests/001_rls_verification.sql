-- RLS Verification Script
-- Run this in the Supabase SQL Editor to verify data isolation and security policies.
-- This script uses a transaction to simulate different users and ensures no data is permanently changed (ROLLBACK at the end).

BEGIN;

-- 1. Setup Test Data
DO $$
DECLARE
  user_a_id UUID := gen_random_uuid();
  user_b_id UUID := gen_random_uuid();
  org_a_id UUID;
  org_b_id UUID;
  team_a_id UUID;
  read_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting RLS Verification...';

  -- Create Fake Users (simulating auth.users)
  INSERT INTO auth.users (id, email) VALUES (user_a_id, 'user_a@test.com');
  INSERT INTO auth.users (id, email) VALUES (user_b_id, 'user_b@test.com');

  -- Create Organizations (as system/postgres)
  INSERT INTO organizations (name) VALUES ('Org A') RETURNING id INTO org_a_id;
  INSERT INTO organizations (name) VALUES ('Org B') RETURNING id INTO org_b_id;

  -- Assign Memberships
  INSERT INTO organization_members (organization_id, user_id, role) VALUES (org_a_id, user_a_id, 'owner');
  INSERT INTO organization_members (organization_id, user_id, role) VALUES (org_b_id, user_b_id, 'owner');

  -- Create Data in Org A
  INSERT INTO teams (organization_id, name, created_by) VALUES (org_a_id, 'Team A', user_a_id) RETURNING id INTO team_a_id;

  ----------------------------------------------------------------
  -- TEST 1: User A should see their own organization
  ----------------------------------------------------------------
  -- Simulate User A
  PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT count(*) INTO read_count FROM organizations WHERE id = org_a_id;
  
  IF read_count = 1 THEN
    RAISE NOTICE '✅ Test 1 Passed: User A can see Org A';
  ELSE
    RAISE EXCEPTION '❌ Test 1 Failed: User A cannot see Org A';
  END IF;

  ----------------------------------------------------------------
  -- TEST 2: User A should NOT see Org B
  ----------------------------------------------------------------
  SELECT count(*) INTO read_count FROM organizations WHERE id = org_b_id;
  
  IF read_count = 0 THEN
    RAISE NOTICE '✅ Test 2 Passed: User A cannot see Org B (Isolation Verified)';
  ELSE
    RAISE EXCEPTION '❌ Test 2 Failed: User A can see Org B!';
  END IF;

  ----------------------------------------------------------------
  -- TEST 3: User A should see Team A
  ----------------------------------------------------------------
  SELECT count(*) INTO read_count FROM teams WHERE id = team_a_id;
  
  IF read_count = 1 THEN
    RAISE NOTICE '✅ Test 3 Passed: User A can see Team A';
  ELSE
    RAISE EXCEPTION '❌ Test 3 Failed: User A cannot see Team A';
  END IF;

  ----------------------------------------------------------------
  -- TEST 4: User B should NOT see Team A
  ----------------------------------------------------------------
  -- Simulate User B
  PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);
  
  SELECT count(*) INTO read_count FROM teams WHERE id = team_a_id;
  
  IF read_count = 0 THEN
    RAISE NOTICE '✅ Test 4 Passed: User B cannot see Team A (Isolation Verified)';
  ELSE
    RAISE EXCEPTION '❌ Test 4 Failed: User B can see Team A!';
  END IF;

  RAISE NOTICE '🎉 All RLS Tests Passed Successfully!';
END $$;

ROLLBACK; -- Always rollback to keep the database clean
