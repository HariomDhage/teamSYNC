"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    last_used_at: string | null;
}

export default function ApiKeysPage() {
    const { organization, userRole } = useOrganization();
    const router = useRouter();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [scope, setScope] = useState<"read-only" | "read-write">("read-only");

    // Redirect if not admin/owner
    useEffect(() => {
        if (userRole && userRole !== "admin" && userRole !== "owner") {
            router.push("/dashboard");
        }
    }, [userRole, router]);

    useEffect(() => {
        loadKeys();
    }, [organization]);

    async function loadKeys() {
        if (!organization) return;
        const supabase = createClient();

        const { data, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("organization_id", organization.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading keys:", error);
            toast.error("Failed to load API keys");
        } else {
            setKeys(data || []);
        }
        setLoading(false);
    }

    async function generateKey() {
        if (!organization || !newKeyName.trim()) return;
        setCreating(true);

        try {
            // Generate key on client
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            const randomString = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            const key = `sk_live_${randomString}`;

            // Hash key
            const encoder = new TextEncoder();
            const data = encoder.encode(key);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const supabase = createClient();
            const { error } = await supabase.from("api_keys").insert({
                organization_id: organization.id,
                name: newKeyName.trim(),
                key_hash: keyHash,
                key_prefix: key.substring(0, 12) + "...",
                permissions: { role: scope }
            });

            if (error) throw error;

            setGeneratedKey(key);
            setNewKeyName("");
            loadKeys();
            toast.success("API Key generated");
        } catch (error: any) {
            console.error("Error generating key:", error);
            toast.error("Failed to generate API key");
        } finally {
            setCreating(false);
        }
    }

    async function revokeKey(id: string) {
        if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("api_keys")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("API Key revoked");
            loadKeys();
        } catch (error: any) {
            toast.error("Failed to revoke key");
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
                    <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
                    <p className="text-gray-600 mt-2">Manage programmatic access to your organization</p>
                </div>
            </div>

            {/* Create Key Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Generate New Key</h2>

                {generatedKey ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-green-800">Key Generated Successfully</h3>
                            <button
                                onClick={() => setGeneratedKey(null)}
                                className="text-green-600 hover:text-green-800"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-green-700 mb-3">
                            Please copy this key now. You won't be able to see it again!
                        </p>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-white border border-green-200 px-3 py-2 rounded font-mono text-sm break-all text-green-900">
                                {generatedKey}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedKey);
                                    toast.success("Copied to clipboard");
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm whitespace-nowrap"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="Key Name (e.g. CI/CD Pipeline)"
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value as "read-only" | "read-write")}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                            >
                                <option value="read-only">Read Only</option>
                                <option value="read-write">Read & Write</option>
                            </select>
                            <button
                                onClick={generateKey}
                                disabled={!newKeyName.trim() || creating}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                            >
                                {creating ? "Generating..." : "Generate Key"}
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">
                            {scope === "read-only"
                                ? "Read-only keys can only fetch data (GET requests)."
                                : "Read-write keys can modify data (POST, PUT, DELETE requests). Use with caution."}
                        </p>
                    </div>
                )}
            </div>

            {/* Keys List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Active Keys</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : keys.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No API keys found.</div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {keys.map(key => (
                            <div key={key.id} className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{key.name}</h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                                            {key.key_prefix}
                                        </code>
                                        <span className="text-sm text-gray-500">
                                            Created: {new Date(key.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => revokeKey(key.id)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
