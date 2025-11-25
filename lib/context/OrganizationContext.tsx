"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Organization, OrganizationMember, MemberRole } from "@/lib/types/database";

interface OrganizationContextType {
    user: User | null;
    organization: Organization | null;
    organizationMember: OrganizationMember | null;
    userRole: MemberRole | null;
    loading: boolean;
    refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
    user: null,
    organization: null,
    organizationMember: null,
    userRole: null,
    loading: true,
    refreshOrganization: async () => { },
});

export function useOrganization() {
    return useContext(OrganizationContext);
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [organizationMember, setOrganizationMember] = useState<OrganizationMember | null>(null);
    const [loading, setLoading] = useState(true);

    const loadOrganization = async () => {
        try {
            const supabase = createClient();

            // Get current user
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            if (!currentUser) {
                setUser(null);
                setOrganization(null);
                setOrganizationMember(null);
                setLoading(false);
                return;
            }

            setUser(currentUser);

            // Get user's organization membership
            const { data: memberData, error: memberError } = await supabase
                .from("organization_members")
                .select("*")
                .eq("user_id", currentUser.id)
                .single();

            if (memberError || !memberData) {
                setOrganization(null);
                setOrganizationMember(null);
                setLoading(false);
                return;
            }

            setOrganizationMember(memberData);

            // Get the organization details
            const { data: orgData, error: orgError } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", memberData.organization_id)
                .single();

            if (orgError || !orgData) {
                setOrganization(null);
                setLoading(false);
                return;
            }

            setOrganization(orgData);
            setLoading(false);
        } catch (error) {
            console.error("Error loading organization:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrganization();
    }, []);

    return (
        <OrganizationContext.Provider
            value={{
                user,
                organization,
                organizationMember,
                userRole: organizationMember?.role || null,
                loading,
                refreshOrganization: loadOrganization,
            }}
        >
            {children}
        </OrganizationContext.Provider>
    );
}
