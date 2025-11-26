-- Allow all organization members to view activity logs
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;

CREATE POLICY "Org members can view activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = activity_logs.organization_id
      AND user_id = auth.uid()
    )
  );
