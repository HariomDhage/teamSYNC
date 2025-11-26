"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface CustomRole {
    id: string;
    name: string;
    permissions: any;
}

export default function RolesPage() {
    const { organization, userRole } = useOrganization();
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState("");
    const [creating, setCreating] = useState(false);
    const [permissions, setPermissions] = useState({
        can_manage_team: false,
        can_invite_members: false,
        can_manage_roles: false,
        can_view_audit_logs: false,
    });

    useEffect(() => {
        loadRoles();
    }, [organization]);

    async function loadRoles() {
        if (!organization) return;
        const supabase = createClient();
        const { data, error } = await supabase
            .from("organization_roles")
            .select("*")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
        } else {
            setRoles(data || []);
        }
        setLoading(false);
    }

    async function handleCreateRole() {
        if (!organization || !newRoleName.trim()) return;
        setCreating(true);
        const supabase = createClient();

        try {
            const { error } = await supabase.from("organization_roles").insert({
                organization_id: organization.id,
                name: newRoleName.trim(),
                permissions: permissions
            });

            if (error) throw error;
            toast.success("Role created");
            setNewRoleName("");
            setPermissions({
                can_manage_team: false,
                can_invite_members: false,
                can_manage_roles: false,
                can_view_audit_logs: false,
            });
            loadRoles();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setCreating(false);
        }
    }

    async function handleDeleteRole(id: string) {
        if (!confirm("Delete this role?")) return;
        const supabase = createClient();
        try {
            const { error } = await supabase.from("organization_roles").delete().eq("id", id);
            if (error) throw error;
            toast.success("Role deleted");
            loadRoles();
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    if (userRole !== "admin" && userRole !== "owner") return <div>Access Denied</div>;

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Custom Roles</h1>
                <p className="text-gray-600 mt-2">Manage custom roles for your organization</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Create New Role</h2>
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Role Name (e.g. Manager)"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.can_manage_team}
                                onChange={(e) => setPermissions({ ...permissions, can_manage_team: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Manage Teams</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.can_invite_members}
                                onChange={(e) => setPermissions({ ...permissions, can_invite_members: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Invite Members</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.can_manage_roles}
                                onChange={(e) => setPermissions({ ...permissions, can_manage_roles: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Manage Roles</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={permissions.can_view_audit_logs}
                                onChange={(e) => setPermissions({ ...permissions, can_view_audit_logs: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">View Audit Logs</span>
                        </label>
                    </div>

                    <button
                        onClick={handleCreateRole}
                        disabled={!newRoleName.trim() || creating}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 self-start"
                    >
                        {creating ? "Creating..." : "Create Role"}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Existing Roles</h2>
                </div>
                {roles.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No custom roles found.</div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {roles.map(role => (
                            <div key={role.id} className="p-6 flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium text-gray-900">{role.name}</h3>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {Object.entries(role.permissions || {})
                                            .filter(([_, value]) => value)
                                            .map(([key]) => (
                                                <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                                    {key.replace('can_', '').replace(/_/g, ' ')}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
