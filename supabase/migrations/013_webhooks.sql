-- Create Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org admins/owners can view webhooks"
    ON webhooks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = webhooks.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Org admins/owners can manage webhooks"
    ON webhooks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = webhooks.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- Index
CREATE INDEX idx_webhooks_org_id ON webhooks(organization_id);
