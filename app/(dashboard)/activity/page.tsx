"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { ActivityType } from "@/lib/types/database";
import { convertToCSV } from "@/lib/utils/csv";

interface Activity {
    id: string;
    action: ActivityType;
    created_at: string;
    metadata: any;
    user_email: string;
}

export default function ActivityPage() {
    const { organization, userRole, user } = useOrganization();
    const router = useRouter();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Access allowed for all members

    useEffect(() => {
        loadActivities();
    }, [organization, startDate, endDate]);

    async function loadActivities() {
        if (!organization) return;

        const supabase = createClient();

        let query = supabase
            .from("activity_logs")
            .select("*")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (startDate) {
            query = query.gte("created_at", new Date(startDate).toISOString());
        }
        if (endDate) {
            // Set end date to end of day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.lte("created_at", end.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return;
        }

        const activitiesWithEmails = data.map((activity) => ({
            ...activity,
            user_email: activity.user_id === user?.id ? (user?.email || "Unknown") : `user-${activity.user_id?.substring(0, 8) || "system"}@email.com`,
        }));

        setActivities(activitiesWithEmails);
        setLoading(false);
    }

    const handleExportCSV = () => {
        if (activities.length === 0) return;

        const exportData = activities.map(activity => ({
            Date: new Date(activity.created_at).toLocaleString(),
            User: activity.user_email,
            Action: activity.action,
            Details: getActionText(activity),
            Metadata: JSON.stringify(activity.metadata)
        }));

        convertToCSV(exportData, `activity-log-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportJSON = () => {
        if (activities.length === 0) return;

        const exportData = activities.map(activity => ({
            id: activity.id,
            date: activity.created_at,
            user: activity.user_email,
            action: activity.action,
            details: getActionText(activity),
            metadata: activity.metadata
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getActionIcon = (action: ActivityType) => {
        switch (action) {
            case "organization_created":
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                );
            case "user_invited":
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                );
            case "user_removed":
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                    </svg>
                );
            case "role_changed":
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                );
            case "team_created":
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            case "team_updated":
            case "team_deleted":
            case "member_added_to_team":
            case "member_removed_from_team":
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getActionColor = (action: ActivityType) => {
        switch (action) {
            case "organization_created":
            case "team_created":
            case "user_invited":
            case "member_added_to_team":
                return "bg-green-100 text-green-700";
            case "user_removed":
            case "team_deleted":
            case "member_removed_from_team":
                return "bg-red-100 text-red-700";
            case "role_changed":
            case "team_updated":
                return "bg-blue-100 text-blue-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getActionText = (activity: Activity) => {
        const { action, metadata, user_email } = activity;

        switch (action) {
            case "organization_created":
                return `${user_email} created the organization`;
            case "user_invited":
                return `${user_email} invited ${metadata?.email || "a user"} as ${metadata?.role || "member"}`;
            case "user_removed":
                return `${user_email} removed ${metadata?.member_email || "a member"}`;
            case "role_changed":
                return `${user_email} changed a member's role to ${metadata?.new_role || "unknown"}`;
            case "team_created":
                return `${user_email} created team "${metadata?.team_name || "Unknown"}"`;
            case "team_updated":
                return `${user_email} updated team "${metadata?.team_name || "Unknown"}"`;
            case "team_deleted":
                return `${user_email} deleted team "${metadata?.team_name || "Unknown"}"`;
            case "member_added_to_team":
                return `${user_email} added a member to "${metadata?.team_name || "Unknown"}"`;
            case "member_removed_from_team":
                return `${user_email} removed a member from "${metadata?.team_name || "Unknown"}"`;
            default:
                return `${user_email} performed an action`;
        }
    };

    // Render for all users

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
                <p className="text-gray-600 mt-2">View all recent activity in your organization</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-6">
                <div className="flex gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(""); setEndDate(""); }}
                            className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={loading || activities.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                    <button
                        onClick={handleExportJSON}
                        disabled={loading || activities.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export JSON
                    </button>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading activities...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
                        <p className="text-gray-600">Activity will appear here as actions are performed</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {activities.map((activity) => (
                            <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActionColor(activity.action)}`}>
                                        {getActionIcon(activity.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-900 font-medium">
                                            {getActionText(activity)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {new Date(activity.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
