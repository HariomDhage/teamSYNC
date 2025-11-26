-- Add resource limits to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10;

-- Create a function to check team quota
CREATE OR REPLACE FUNCTION check_team_quota()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
BEGIN
    -- Get current count of teams for the organization
    SELECT count(*) INTO current_count
    FROM teams
    WHERE organization_id = NEW.organization_id;

    -- Get the limit for the organization
    SELECT max_teams INTO max_limit
    FROM organizations
    WHERE id = NEW.organization_id;

    -- Check if limit reached
    IF current_count >= max_limit THEN
        RAISE EXCEPTION 'Team quota exceeded. Your organization is limited to % teams.', max_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team creation
DROP TRIGGER IF EXISTS check_team_quota_trigger ON teams;
CREATE TRIGGER check_team_quota_trigger
BEFORE INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION check_team_quota();

-- Create a function to check member quota
CREATE OR REPLACE FUNCTION check_member_quota()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
BEGIN
    -- Get current count of members for the organization
    SELECT count(*) INTO current_count
    FROM organization_members
    WHERE organization_id = NEW.organization_id;

    -- Get the limit for the organization
    SELECT max_members INTO max_limit
    FROM organizations
    WHERE id = NEW.organization_id;

    -- Check if limit reached
    IF current_count >= max_limit THEN
        RAISE EXCEPTION 'Member quota exceeded. Your organization is limited to % members.', max_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member addition
DROP TRIGGER IF EXISTS check_member_quota_trigger ON organization_members;
CREATE TRIGGER check_member_quota_trigger
BEFORE INSERT ON organization_members
FOR EACH ROW
EXECUTE FUNCTION check_member_quota();
