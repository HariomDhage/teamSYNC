export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type MemberRole = 'owner' | 'admin' | 'member';

export type ActivityType =
    | 'user_invited'
    | 'user_removed'
    | 'role_changed'
    | 'team_created'
    | 'team_updated'
    | 'team_deleted'
    | 'member_added_to_team'
    | 'member_removed_from_team'
    | 'organization_created';

export interface Organization {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface OrganizationMember {
    id: string;
    organization_id: string;
    user_id: string;
    role: MemberRole;
    invited_by: string | null;
    invited_at: string;
    created_at: string;
}

export interface Team {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    added_by: string | null;
    added_at: string;
}

export interface ActivityLog {
    id: string;
    organization_id: string;
    user_id: string | null;
    action: ActivityType;
    metadata: Json | null;
    created_at: string;
}

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: Organization;
                Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
            };
            organization_members: {
                Row: OrganizationMember;
                Insert: Omit<OrganizationMember, 'id' | 'invited_at' | 'created_at'>;
                Update: Partial<Omit<OrganizationMember, 'id' | 'organization_id' | 'user_id'>>;
            };
            teams: {
                Row: Team;
                Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Team, 'id' | 'organization_id' | 'created_at'>>;
            };
            team_members: {
                Row: TeamMember;
                Insert: Omit<TeamMember, 'id' | 'added_at'>;
                Update: never;
            };
            activity_logs: {
                Row: ActivityLog;
                Insert: Omit<ActivityLog, 'id' | 'created_at'>;
                Update: never;
            };
        };
    };
}
