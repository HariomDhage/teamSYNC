"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

interface Team {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface TeamMemberData {
    id: string;
    user_id: string;
    added_at: string;
    user_email: string;
}

interface OrgMember {
    user_id: string;
    user_email: string;
}

export default function TeamDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { organization, userRole, user } = useOrganization();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMemberData[]>([]);
    const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState("");
    const [adding, setAdding] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [updating, setUpdating] = useState(false);

    const teamId = params.id as string;
    const canManage = userRole === "admin" || userRole === "owner";

    useEffect(() => {
        loadTeamData();
    }, [teamId, organization]);

    async function loadTeamData() {
        if (!organization || !teamId) return;

        const supabase = createClient();

        // Load team details
        const { data: teamData, error: teamError } = await supabase
            .from("teams")
            .select("*")
            .eq("id", teamId)
            .single();

        if (teamError || !teamData) {
            toast.error("Team not found");
            router.push("/teams");
            return;
        }

        setTeam(teamData);
        setEditName(teamData.name);
        setEditDescription(teamData.description || "");

        // Load team members
        const { data: memberData, error: memberError } = await supabase
            .from("team_members")
            .select("*")
            .eq("team_id", teamId);

        if (!memberError) {
            const membersWithEmails = memberData.map((m) => ({
                ...m,
                user_email: (user && m.user_id === user.id) ? (user.email || "") : `user-${m.user_id.substring(0, 8)}@email.com`,
            }));
            setMembers(membersWithEmails);
        }

        // Load organization members for adding
        const { data: orgMemberData } = await supabase
            .rpc('get_organization_members_with_email', {
                org_id: organization.id
            });

        if (orgMemberData) {
            const orgMembersWithEmails = orgMemberData.map((m: any) => ({
                user_id: m.member_user_id,
                user_email: m.member_email,
            }));
            setOrgMembers(orgMembersWithEmails);
        }

        setLoading(false);
    }

    async function handleAddMember() {
        if (!organization || !user || !team) return;

        setAdding(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("team_members")
                .insert({
                    team_id: teamId,
                    user_id: selectedMember,
                    added_by: user.id,
                });

            if (error) throw error;

            // Log the action
            await supabase.from("activity_logs").insert({
                organization_id: organization.id,
                user_id: user.id,
                action: "member_added_to_team",
                metadata: { team_id: teamId, team_name: team.name },
            });

            toast.success("Member added to team");
            setShowAddMemberModal(false);
            setSelectedMember("");
            loadTeamData();
        } catch (error: any) {
            if (error.code === "23505") {
                toast.error("Member is already in this team");
            } else {
                toast.error(error.message || "Failed to add member");
            }
        } finally {
            setAdding(false);
        }
    }

    async function handleRemoveMember(memberId: string, memberEmail: string) {
        if (!organization || !user || !team) return;
        if (!confirm(`Remove ${memberEmail} from ${team.name}?`)) return;

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("team_members")
                .delete()
                .eq("id", memberId);

            if (error) throw error;

            // Log the action
            await supabase.from("activity_logs").insert({
                organization_id: organization.id,
                user_id: user.id,
                action: "member_removed_from_team",
                metadata: { team_id: teamId, team_name: team.name },
            });

            toast.success("Member removed from team");
            loadTeamData();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove member");
        }
    }

    async function handleUpdateTeam() {
        if (!organization || !user) return;

        setUpdating(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("teams")
                .update({
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                })
                .eq("id", teamId);

            if (error) throw error;

            // Log the action
            await supabase.from("activity_logs").insert({
                organization_id: organization.id,
                user_id: user.id,
                action: "team_updated",
                metadata: { team_id: teamId, team_name: editName.trim() },
            });

            toast.success("Team updated successfully");
            setShowEditModal(false);
            loadTeamData();
        } catch (error: any) {
            toast.error(error.message || "Failed to update team");
        } finally {
            setUpdating(false);
        }
    }

    async function handleDeleteTeam() {
        if (!organization || !user || !team) return;
        if (!confirm(`Are you sure you want to delete "${team.name}"? This cannot be undone.`)) return;

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("teams")
                .delete()
                .eq("id", teamId);

            if (error) throw error;

            // Log the action
            await supabase.from("activity_logs").insert({
                organization_id: organization.id,
                user_id: user.id,
                action: "team_deleted",
                metadata: { team_name: team.name },
            });

            toast.success("Team deleted successfully");
            router.push("/teams");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete team");
        }
    }

    const availableMembers = orgMembers.filter(
        (orgMember) => !members.some((teamMember) => teamMember.user_id === orgMember.user_id)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading team...</p>
                </div>
            </div>
        );
    }

    if (!team) return null;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/teams")}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                        {team.description && (
                            <p className="text-gray-600 mt-2">{team.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                            {members.length} {members.length === 1 ? "member" : "members"}
                        </p>
                    </div>
                </div>

                {canManage && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            Edit Team
                        </button>
                        <button
                            onClick={handleDeleteTeam}
                            className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Members Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
                    {canManage && availableMembers.length > 0 && (
                        <button
                            onClick={() => setShowAddMemberModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Member
                        </button>
                    )}
                </div>

                {members.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No members yet</h3>
                        <p className="text-gray-600">Add members to this team to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {members.map((member) => (
                            <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {member.user_email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{member.user_email}</p>
                                        <p className="text-sm text-gray-500">
                                            Added {new Date(member.added_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {canManage && (
                                    <button
                                        onClick={() => handleRemoveMember(member.id, member.user_email)}
                                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Add Member</h2>
                            <button
                                onClick={() => setShowAddMemberModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select member</label>
                                <select
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                >
                                    <option value="">Choose a member...</option>
                                    {availableMembers.map((member) => (
                                        <option key={member.user_id} value={member.user_id}>
                                            {member.user_email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddMemberModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddMember}
                                    disabled={!selectedMember || adding}
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {adding ? "Adding..." : "Add Member"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Team Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Edit Team</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Team name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateTeam}
                                    disabled={!editName.trim() || updating}
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updating ? "Updating..." : "Update Team"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
