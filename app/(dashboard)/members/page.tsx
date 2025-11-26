"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { MemberRole } from "@/lib/types/database";

interface Member {
    id: string;
    user_id: string;
    role: MemberRole;
    invited_at: string;
    user_email: string;
    custom_role_id?: string;
}

interface CustomRole {
    id: string;
    name: string;
}

export default function MembersPage() {
    const { organization, userRole, user } = useOrganization();
    const [members, setMembers] = useState<Member[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [email, setEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<MemberRole>("member");
    const [inviting, setInviting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState("");

    const canManage = userRole === "admin" || userRole === "owner";

    useEffect(() => {
        loadMembers();
        loadCustomRoles();
    }, [organization]);

    async function loadCustomRoles() {
        if (!organization) return;
        const supabase = createClient();
        const { data } = await supabase
            .from("organization_roles")
            .select("id, name")
            .eq("organization_id", organization.id);
        if (data) setCustomRoles(data);
    }

    async function loadMembers() {
        if (!organization) return;

        const supabase = createClient();

        try {
            // Use the secure RPC to get members with emails
            const { data, error } = await supabase
                .rpc('get_organization_members_with_email', {
                    org_id: organization.id
                });

            if (error) throw error;

            const formattedMembers = data.map((member: any) => ({
                id: member.member_id,
                user_id: member.member_user_id,
                role: member.member_role,
                custom_role_id: member.custom_role_id,
                invited_at: member.member_created_at,
                user_email: member.member_email,
            }));

            setMembers(formattedMembers);
        } catch (error: any) {
            console.error("Error loading members:", JSON.stringify(error, null, 2));
            console.error("Error details:", error.message, error.code, error.details);
            toast.error(`Failed to load members: ${error.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite() {
        if (!organization || !user) return;

        setInviting(true);

        try {
            const formData = new FormData();
            formData.append("email", email);
            formData.append("role", inviteRole);
            formData.append("organizationId", organization.id);

            // Dynamically import the action to avoid client-side bundling issues if any
            const { inviteMember } = await import("@/app/actions/invite-member");
            const result = await inviteMember(formData);

            if (result.error) {
                throw new Error(result.error);
            }

            toast.success(`Invitation sent to ${email}`);
            setShowInviteModal(false);
            setEmail("");
            setInviteRole("member");
            loadMembers();
        } catch (error: any) {
            toast.error(error.message || "Failed to send invitation");
        } finally {
            setInviting(false);
        }
    }

    async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
        if (!organization || !user || !e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        setImporting(true);
        setImportProgress("Reading file...");

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r\n|\n/);
                const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

                const emailIndex = headers.indexOf('email');
                const roleIndex = headers.indexOf('role');

                if (emailIndex === -1) {
                    toast.error("CSV must have an 'email' column");
                    setImporting(false);
                    return;
                }

                let successCount = 0;
                let failCount = 0;
                const supabase = createClient();

                // Import the action dynamically
                const { inviteMember } = await import("@/app/actions/invite-member");

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const columns = line.split(',').map(c => c.trim());
                    const email = columns[emailIndex];
                    // Clean role and validate
                    let role = roleIndex !== -1 ? columns[roleIndex].toLowerCase() : 'member';
                    // Allow custom roles if they match by name, otherwise default to member
                    // For now, we only support standard roles in CSV for simplicity, or we'd need to lookup custom role IDs
                    if (!['owner', 'admin', 'member'].includes(role)) role = 'member';

                    if (!email) continue;

                    setImportProgress(`Importing ${i}/${lines.length - 1}: ${email}`);

                    try {
                        const formData = new FormData();
                        formData.append("email", email);
                        formData.append("role", role);
                        formData.append("organizationId", organization.id);

                        const result = await inviteMember(formData);

                        if (result.error) {
                            console.error(`Failed to invite ${email}: ${result.error}`);
                            failCount++;
                        } else {
                            successCount++;
                        }
                    } catch (err) {
                        console.error(`Failed to invite ${email}`, err);
                        failCount++;
                    }
                }

                toast.success(`Import complete: ${successCount} invited, ${failCount} failed`);
                setShowImportModal(false);
                loadMembers();
            } catch (error) {
                console.error("Import error:", error);
                toast.error("Failed to process CSV file");
            } finally {
                setImporting(false);
                setImportProgress("");
            }
        };
        reader.readAsText(file);
    }

    async function handleRoleChange(memberId: string, newRole: MemberRole, customRoleId: string | null = null) {
        if (!organization || !user) return;

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("organization_members")
                .update({
                    role: newRole,
                    custom_role_id: customRoleId
                })
                .eq("id", memberId);

            if (error) throw error;

            // Log the role change
            await supabase.from("activity_logs").insert({
                organization_id: organization.id,
                user_id: user.id,
                action: "role_changed",
                metadata: {
                    member_id: memberId,
                    new_role: newRole,
                    custom_role_id: customRoleId
                },
            });

            toast.success("Role updated successfully");
            loadMembers();
        } catch (error: any) {
            toast.error(error.message || "Failed to update role");
        }
    }

    async function handleRemoveMember(memberId: string, memberEmail: string) {
        if (!organization || !user) return;
        if (!confirm(`Are you sure you want to remove ${memberEmail}?`)) return;

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("organization_members")
                .delete()
                .eq("id", memberId);

            if (error) throw error;

            // Log the removal
            await supabase.from("activity_logs").insert({
                organization_id: organization.id,
                user_id: user.id,
                action: "user_removed",
                metadata: { member_email: memberEmail },
            });

            toast.success("Member removed successfully");
            loadMembers();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove member");
        }
    }

    const getRoleBadge = (role: MemberRole) => {
        const badges = {
            owner: "bg-purple-100 text-purple-700 border-purple-200",
            admin: "bg-blue-100 text-blue-700 border-blue-200",
            member: "bg-gray-100 text-gray-700 border-gray-200",
        };
        return badges[role];
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Members</h1>
                    <p className="text-gray-600 mt-2">Manage organization members and roles</p>
                </div>
                {canManage && (
                    <>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Invite Member
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2 ml-3"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Import CSV
                        </button>
                    </>
                )}
            </div>

            {/* Members List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading members...</p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No members yet</h3>
                        <p className="text-gray-600">Invite team members to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Member</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Role</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Joined</th>
                                    {canManage && <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {members.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {member.user_email[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.user_email}</p>
                                                    {member.user_id === user?.id && (
                                                        <span className="text-xs text-gray-500">You</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {canManage && member.user_id !== user?.id ? (
                                                <select
                                                    value={member.role === 'member' && member.custom_role_id ? member.custom_role_id : member.role}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (['admin', 'member', 'owner'].includes(val)) {
                                                            handleRoleChange(member.id, val as MemberRole, null);
                                                        } else {
                                                            handleRoleChange(member.id, 'member', val);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 text-sm font-medium rounded border cursor-pointer ${member.role === 'owner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        member.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                            'bg-gray-100 text-gray-700 border-gray-200'
                                                        }`}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                    {userRole === "owner" && <option value="owner">Owner</option>}
                                                    {customRoles.length > 0 && <optgroup label="Custom Roles">
                                                        {customRoles.map(r => (
                                                            <option key={r.id} value={r.id}>{r.name}</option>
                                                        ))}
                                                    </optgroup>}
                                                </select>
                                            ) : (
                                                <span className={`inline-block px-3 py-1 text-sm font-medium rounded border ${member.role === 'owner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                    member.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        'bg-gray-100 text-gray-700 border-gray-200'
                                                    }`}>
                                                    {member.role === 'member' && member.custom_role_id
                                                        ? customRoles.find(r => r.id === member.custom_role_id)?.name || 'Custom Role'
                                                        : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(member.invited_at).toLocaleDateString()}
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4 text-right">
                                                {member.user_id !== user?.id && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.user_email)}
                                                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Invite Member</h2>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    {userRole === "owner" && <option value="owner">Owner</option>}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInvite}
                                    disabled={!email || inviting}
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {inviting ? "Sending..." : "Send Invite"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Bulk Import Members</h2>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                <p className="font-semibold mb-1">CSV Format Required:</p>
                                <p>Columns: <code>email</code>, <code>role</code> (optional)</p>
                                <p className="mt-1 text-xs">Example: <code>john@example.com, admin</code></p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleBulkImport}
                                    disabled={importing}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            {importing && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2 text-center">{importProgress}</p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    disabled={importing}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
