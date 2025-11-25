"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";

interface Stats {
    totalTeams: number;
    totalMembers: number;
    recentActivities: number;
}

export default function DashboardPage() {
    const { organization, userRole } = useOrganization();
    const [stats, setStats] = useState<Stats>({
        totalTeams: 0,
        totalMembers: 0,
        recentActivities: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            if (!organization) return;

            const supabase = createClient();

            // Get total teams
            const { count: teamsCount } = await supabase
                .from("teams")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", organization.id);

            // Get total members
            const { count: membersCount } = await supabase
                .from("organization_members")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", organization.id);

            // Get recent activities (if admin/owner)
            let activitiesCount = 0;
            if (userRole === "admin" || userRole === "owner") {
                const { count } = await supabase
                    .from("activity_logs")
                    .select("*", { count: "exact", head: true })
                    .eq("organization_id", organization.id)
                    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
                activitiesCount = count || 0;
            }

            setStats({
                totalTeams: teamsCount || 0,
                totalMembers: membersCount || 0,
                recentActivities: activitiesCount,
            });
            setLoading(false);
        }

        loadStats();
    }, [organization, userRole]);

    const statsCards = [
        {
            label: "Total Teams",
            value: stats.totalTeams,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: "from-blue-500 to-blue-600",
        },
        {
            label: "Total Members",
            value: stats.totalMembers,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            color: "from-purple-500 to-purple-600",
        },
        {
            label: "Activities (7 days)",
            value: stats.recentActivities,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            color: "from-green-500 to-green-600",
            show: userRole === "admin" || userRole === "owner",
        },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">Welcome to {organization?.name}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {statsCards.map((stat, index) => {
                    if (stat.show === false) return null;
                    return (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {loading ? "..." : stat.value}
                                    </p>
                                </div>
                                <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(userRole === "admin" || userRole === "owner") && (
                        <>
                            <a
                                href="/teams"
                                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Create Team</p>
                                    <p className="text-sm text-gray-600">Add a new team</p>
                                </div>
                            </a>

                            <a
                                href="/members"
                                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Invite Member</p>
                                    <p className="text-sm text-gray-600">Add team members</p>
                                </div>
                            </a>
                        </>
                    )}

                    <a
                        href="/teams"
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                    >
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">View Teams</p>
                            <p className="text-sm text-gray-600">Browse all teams</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
