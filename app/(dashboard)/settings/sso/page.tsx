"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SSOPage() {
    const { organization, userRole } = useOrganization();
    const router = useRouter();
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState("");
    const [adding, setAdding] = useState(false);

    // Redirect if not admin/owner
    useEffect(() => {
        if (userRole && userRole !== "admin" && userRole !== "owner") {
            router.push("/dashboard");
        }
    }, [userRole, router]);

    useEffect(() => {
        loadDomains();
    }, [organization]);

    async function loadDomains() {
        if (!organization) return;
        const supabase = createClient();
        const { data, error } = await supabase
            .from("sso_domains")
            .select("*")
            .eq("organization_id", organization.id);

        if (error) {
            console.error(error);
        } else {
            setDomains(data || []);
        }
    }

    const handleAddDomain = async () => {
        if (!newDomain.trim() || !organization) return;
        setAdding(true);

        if (!newDomain.includes('.')) {
            toast.error("Invalid domain format");
            setAdding(false);
            return;
        }

        const supabase = createClient();
        try {
            const { error } = await supabase.from("sso_domains").insert({
                organization_id: organization.id,
                domain: newDomain.trim()
            });

            if (error) throw error;

            toast.success("Domain verified and added");
            setNewDomain("");
            loadDomains();
        } catch (error: any) {
            toast.error(error.message || "Failed to add domain");
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveDomain = async (id: string, domain: string) => {
        if (!confirm(`Remove SSO for ${domain}?`)) return;

        const supabase = createClient();
        try {
            const { error } = await supabase.from("sso_domains").delete().eq("id", id);
            if (error) throw error;
            toast.success("Domain removed");
            loadDomains();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (userRole !== "admin" && userRole !== "owner") return null;

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">Enterprise SSO</h1>
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-200">
                        ENTERPRISE
                    </span>
                </div>
                <p className="text-gray-600">Configure SAML/OIDC Single Sign-On for your organization</p>
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Identity Provider Configuration</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ACS URL</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded text-sm text-gray-600">
                                https://auth.teamsync.com/sso/acs/{organization?.id}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`https://auth.teamsync.com/sso/acs/${organization?.id}`);
                                    toast.success("Copied");
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Entity ID</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded text-sm text-gray-600">
                                urn:teamsync:org:{organization?.id}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`urn:teamsync:org:${organization?.id}`);
                                    toast.success("Copied");
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Managed Domains</h3>
                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="example.com"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        <button
                            onClick={handleAddDomain}
                            disabled={!newDomain.trim() || adding}
                            className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                        >
                            {adding ? "Verifying..." : "Add Domain"}
                        </button>
                    </div>

                    {domains.length > 0 && (
                        <div className="space-y-2">
                            {domains.map(domain => (
                                <div key={domain.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="font-medium text-gray-900">{domain.domain}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">How SSO Works</h3>
                        <p className="text-sm text-blue-800 mb-3">
                            Once configured, users with email addresses matching your verified domains will be redirected to your Identity Provider (Okta, Azure AD, Google Workspace) to sign in.
                        </p>
                        <a href="#" className="text-sm font-medium text-blue-700 hover:text-blue-900 underline">
                            Read the integration guide
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
