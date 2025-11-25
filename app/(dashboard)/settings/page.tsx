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

    // Redirect if not owner
    useEffect(() => {
        if (userRole && userRole !== "owner") {
            router.push("/dashboard");
        }
    }, [userRole, router]);

    useEffect(() => {
        if (organization) {
            setOrgName(organization.name);
        }
    }, [organization]);

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
