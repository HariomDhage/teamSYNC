"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Webhook {
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    created_at: string;
    last_triggered_at: string | null;
    secret: string;
}

export default function WebhooksPage() {
    const { organization, userRole } = useOrganization();
    const router = useRouter();
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newUrl, setNewUrl] = useState("");
    const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);

    // Redirect if not admin/owner
    useEffect(() => {
        if (userRole && userRole !== "admin" && userRole !== "owner") {
            router.push("/dashboard");
        }
    }, [userRole, router]);

    useEffect(() => {
        loadWebhooks();
    }, [organization]);

    async function loadWebhooks() {
        if (!organization) return;
        const supabase = createClient();

        const { data, error } = await supabase
            .from("webhooks")
            .select("*")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading webhooks:", error);
            toast.error("Failed to load webhooks");
        } else {
            setWebhooks(data || []);
        }
        setLoading(false);
    }

    async function handleAddWebhook() {
        if (!organization || !newUrl.trim()) return;

        try {
            new URL(newUrl); // Validate URL
        } catch {
            toast.error("Invalid URL format");
            return;
        }

        setCreating(true);

        try {
            const supabase = createClient();

            // Generate a random secret
            const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const { error } = await supabase.from("webhooks").insert({
                organization_id: organization.id,
                url: newUrl.trim(),
                events: selectedEvents,
                secret: `whsec_${secret}`,
                is_active: true
            });

            if (error) throw error;

            toast.success("Webhook added successfully");
            setNewUrl("");
            loadWebhooks();
        } catch (error: any) {
            toast.error(error.message || "Failed to add webhook");
        } finally {
            setCreating(false);
        }
    }

    async function handleDeleteWebhook(id: string) {
        if (!confirm("Delete this webhook?")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("webhooks")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Webhook deleted");
            loadWebhooks();
        } catch (error: any) {
            toast.error("Failed to delete webhook");
        }
    }

    async function handleTestWebhook(webhook: Webhook) {
        toast.loading("Sending test ping...", { id: "ping" });
        try {
            // In a real app, we'd have a server action to send a test ping
            // For now, we'll just simulate success to show UI interaction
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success("Test ping sent! (Simulated)", { id: "ping" });
        } catch (error) {
            toast.error("Failed to send ping", { id: "ping" });
        }
    }

    if (userRole !== "admin" && userRole !== "owner") return null;

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
                    <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
                    <p className="text-gray-600 mt-2">Receive real-time events for your organization</p>
                </div>
            </div>

            {/* Add Webhook */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Add Endpoint</h2>
                <div className="flex flex-col gap-4">
                    <div className="flex-1">
                        <input
                            type="url"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="https://api.your-app.com/webhooks"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            We&apos;ll send a POST request with a JSON payload for events.
                        </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Subscribe to events</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {["user_invited", "user_removed", "role_changed", "team_created", "team_deleted", "member_added_to_team", "member_removed_from_team"].map(event => (
                                <label key={event} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.includes(event)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedEvents([...selectedEvents.filter(e => e !== "*"), event]);
                                            } else {
                                                setSelectedEvents(selectedEvents.filter(e => e !== event));
                                            }
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 capitalize">{event.replace(/_/g, ' ')}</span>
                                </label>
                            ))}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedEvents.includes("*")}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedEvents(["*"]);
                                        } else {
                                            setSelectedEvents([]);
                                        }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 font-mono font-bold">All Events (*)</span>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleAddWebhook}
                        disabled={!newUrl.trim() || creating || selectedEvents.length === 0}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 h-[42px] self-start"
                    >
                        {creating ? "Adding..." : "Add Webhook"}
                    </button>
                </div>
            </div>

            {/* Webhooks List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Active Endpoints</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : webhooks.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No webhooks configured.</div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {webhooks.map(webhook => (
                            <div key={webhook.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">POST</span>
                                            <h3 className="font-medium text-gray-900 break-all">{webhook.url}</h3>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                            <span>Events: {webhook.events.join(", ")}</span>
                                            <span>Created: {new Date(webhook.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTestWebhook(webhook)}
                                            className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                                        >
                                            Test Ping
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWebhook(webhook.id)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Signing Secret</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(webhook.secret);
                                                toast.success("Secret copied");
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-700"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-gray-600 mt-1 block break-all">
                                        {webhook.secret}
                                    </code>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
