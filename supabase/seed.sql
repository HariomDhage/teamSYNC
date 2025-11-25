-- Sample data for testing TeamSync

-- Create a sample organization (Acme Inc.)
INSERT INTO organizations (id, name) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Acme Inc.');

-- Note: Users must be created through Supabase Auth
-- This seed file assumes the following users exist in auth.users:
-- Sarah: User ID should be replaced with actual UUID after signup
-- Mike: User ID should be replaced with actual UUID after signup  
-- Jenny: User ID should be replaced with actual UUID after signup

-- Sample organization members (you'll need to replace these UUIDs with real ones)
-- INSERT INTO organization_members (organization_id, user_id, role, invited_by) VALUES
--   ('550e8400-e29b-41d4-a716-446655440000', 'sarah-uuid-here', 'owner', NULL),
--   ('550e8400-e29b-41d4-a716-446655440000', 'mike-uuid-here', 'admin', 'sarah-uuid-here'),
--   ('550e8400-e29b-41d4-a716-446655440000', 'jenny-uuid-here', 'member', 'mike-uuid-here');

-- Sample teams
-- INSERT INTO teams (organization_id, name, description, created_by) VALUES
--   ('550e8400-e29b-41d4-a716-446655440000', 'Engineering Team', 'Software development team', 'mike-uuid-here'),
--   ('550e8400-e29b-41d4-a716-446655440000', 'Design Team', 'Product design team', 'sarah-uuid-here'),
--   ('550e8400-e29b-41d4-a716-446655440000', 'Sales EMEA', 'Sales team for Europe, Middle East, and Africa', 'sarah-uuid-here');

-- Note: Team members and activity logs will be created through the application
