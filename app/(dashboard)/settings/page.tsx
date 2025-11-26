"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SettingsPage() {
    const { organization, userRole, refreshOrganization } = useOrganization();
    const router = useRouter();
    const [orgName, setOrgName] = useState("");
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [usage, setUsage] = useState({ teams: 0, members: 0 });

    // Redirect if not owner
    useEffect(() => {
        if (userRole && userRole !== "owner") {
            router.push("/dashboard");
        }
    }, [userRole, router]);

    useEffect(() => {
        if (organization) {
            setOrgName(organization.name);
            loadUsage();
        }
    }, [organization]);

    async function loadUsage() {
        if (!organization) return;
        const supabase = createClient();

        const { count: teamsCount } = await supabase
            .from("teams")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organization.id);

        const { count: membersCount } = await supabase
            .from("organization_members")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organization.id);

        setUsage({
            teams: teamsCount || 0,
            members: membersCount || 0
        });
    }

    async function handleUpdateOrganization() {
        if (!organization || !orgName.trim()) return;

        setUpdating(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("organizations")
                .update({ name: orgName.trim() })
                .eq("id", organization.id);

            if (error) throw error;

            toast.success("Organization updated successfully");
            await refreshOrganization();
        } catch (error: any) {
            toast.error(error.message || "Failed to update organization");
        } finally {
            setUpdating(false);
        }
    }

    async function handleDeleteOrganization() {
        if (!organization) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${organization.name}"? This will permanently delete all teams, members, and activity logs. This action cannot be undone.`
        );

        if (!confirmed) return;

        const doubleCheck = window.prompt(
            `Type "${organization.name}" to confirm deletion:`
        );

        if (doubleCheck !== organization.name) {
            toast.error("Organization name did not match");
            return;
        }

        setDeleting(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("organizations")
                .delete()
                .eq("id", organization.id);

            if (error) throw error;

            toast.success("Organization deleted successfully");

            // Sign out the user
            await supabase.auth.signOut();
            router.push("/login");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete organization");
        } finally {
            setDeleting(false);
        }
    }

    if (userRole !== "owner") {
        return null;
    }

    return (
        <div className="p-8 max-w-2xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
                <p className="text-gray-600 mt-2">Manage your organization configuration</p>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">General</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organization name
                        </label>
                        <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleUpdateOrganization}
                        disabled={!orgName.trim() || orgName === organization?.name || updating}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updating ? "Updating..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Advanced Features Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                    onClick={() => router.push("/settings/compliance")}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Compliance</h3>
                    <p className="text-xs text-gray-500 mt-1">SOC2 reports & audits</p>
                </button>

                <button
                    onClick={() => router.push("/settings/webhooks")}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Webhooks</h3>
                    <p className="text-xs text-gray-500 mt-1">Real-time events</p>
                </button>

                <button
                    onClick={() => router.push("/settings/sso")}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Enterprise SSO</h3>
                    <p className="text-xs text-gray-500 mt-1">SAML & OIDC</p>
                </button>

                <button
                    onClick={() => router.push("/settings/security")}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">Security</h3>
                    <p className="text-xs text-gray-500 mt-1">Manage Sessions</p>
                </button>
            </div>

            {/* Usage & Quotas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Usage & Quotas</h2>
                    <button
                        onClick={() => router.push("/settings/api-keys")}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Manage API Keys →
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">Teams</span>
                            <span className="text-gray-500">{usage.teams} / {organization?.max_teams || 5}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full ${usage.teams >= (organization?.max_teams || 5) ? 'bg-red-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min((usage.teams / (organization?.max_teams || 5)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">Members</span>
                            <span className="text-gray-500">{usage.members} / {organization?.max_members || 10}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full ${usage.members >= (organization?.max_members || 10) ? 'bg-red-500' : 'bg-purple-600'}`}
                                style={{ width: `${Math.min((usage.members / (organization?.max_members || 10)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-6">
                <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>

                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="font-semibold text-red-900 mb-2">Delete Organization</h3>
                        <p className="text-sm text-red-700 mb-4">
                            Once you delete an organization, there is no going back. This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1 mb-4">
                            <li>All teams and team memberships</li>
                            <li>All organization members</li>
                            <li>All activity logs</li>
                            <li>The organization itself</li>
                        </ul>
                        <button
                            onClick={handleDeleteOrganization}
                            disabled={deleting}
                            className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? "Deleting..." : "Delete Organization"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
