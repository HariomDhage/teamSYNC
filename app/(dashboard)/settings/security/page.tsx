"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getSessions, type Session } from "@/app/actions/get-sessions";
import { revokeSession, signOutEverywhere } from "@/app/actions/revoke-session";
import { createClient } from "@/lib/supabase/client";

export default function SecurityPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [signingOutAll, setSigningOutAll] = useState(false);

    useEffect(() => {
        loadSessions();
    }, []);

    async function loadSessions() {
        const result = await getSessions();
        if (result.error) {
            toast.error(result.error);
        } else if (result.sessions) {
            setSessions(result.sessions);
        }
        setLoading(false);
    }

    async function handleRevokeSession(sessionId: string) {
        if (!confirm("Are you sure you want to sign out this session?")) return;
        setRevokingId(sessionId);

        const result = await revokeSession(sessionId);

        if (result.success) {
            toast.success("Session revoked");
            setSessions(sessions.filter(s => s.id !== sessionId));
        } else {
            toast.error(result.error || "Failed to revoke session");
        }
        setRevokingId(null);
    }

    async function handleSignOutEverywhere() {
        if (!confirm("Are you sure you want to sign out of all devices? You will be redirected to login.")) return;
        setSigningOutAll(true);

        const result = await signOutEverywhere();

        if (result.success) {
            toast.success("Signed out everywhere");
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
        } else {
            toast.error(result.error || "Failed to sign out everywhere");
            setSigningOutAll(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security</h1>
                    <p className="text-gray-600 mt-2">Manage your active sessions and devices</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">Active Sessions</h2>
                    <button
                        onClick={handleSignOutEverywhere}
                        disabled={signingOutAll}
                        className="text-red-600 hover:text-red-800 text-sm font-medium border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
                    >
                        {signingOutAll ? "Signing out..." : "Sign out everywhere"}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No active sessions found.</div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.is_current ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                                {session.is_current ? "Current Session" : "Other Session"}
                                            </span>
                                            {session.is_current && (
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                    Active Now
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">
                                            Started {new Date(session.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                {!session.is_current && (
                                    <button
                                        onClick={() => handleRevokeSession(session.id)}
                                        disabled={revokingId === session.id}
                                        className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
                                        title="Revoke session"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
