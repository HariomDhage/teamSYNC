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
                permissions: {} // Default empty permissions
            });

            if (error) throw error;
            toast.success("Role created");
            setNewRoleName("");
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
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Role Name (e.g. Manager)"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    <button
                        onClick={handleCreateRole}
                        disabled={!newRoleName.trim() || creating}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
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
                                    <p className="text-sm text-gray-500">ID: {role.id}</p>
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
