-- Create a secure function to view own sessions
CREATE OR REPLACE FUNCTION get_user_sessions()
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    is_current boolean
)
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_session_id uuid;
BEGIN
    -- Get current session ID from JWT claim
    current_session_id := (auth.jwt() ->> 'session_id')::uuid;

    RETURN QUERY
    SELECT
        s.id,
        s.created_at,
        s.updated_at,
        s.id = current_session_id as is_current
    FROM auth.sessions s
    WHERE s.user_id = auth.uid()
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;
