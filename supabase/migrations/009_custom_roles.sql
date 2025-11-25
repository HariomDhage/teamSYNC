create table if not exists organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Add custom_role_id to organization_members if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'organization_members' and column_name = 'custom_role_id') then
        alter table organization_members add column custom_role_id uuid references organization_roles(id) on delete set null;
    end if;
end $$;

-- Enable RLS on organization_roles
alter table organization_roles enable row level security;

-- Policies for organization_roles
create policy "Org members can view roles"
  on organization_roles for select
  using (
    exists (
      select 1 from organization_members
      where organization_id = organization_roles.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Admins and owners can manage roles"
  on organization_roles for all
  using (
    exists (
      select 1 from organization_members
      where organization_id = organization_roles.organization_id
      and user_id = auth.uid()
      and role in ('admin', 'owner')
    )
  );
