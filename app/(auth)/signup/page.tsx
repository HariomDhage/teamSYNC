"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [organizationName, setOrganizationName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (!organizationName.trim()) {
            toast.error("Organization name is required");
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();

            // Sign up the user with metadata
            console.log("Attempting to sign up user:", email);
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        organization_name: organizationName.trim(),
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/login`,
                },
            });

            if (authError) {
                console.error("Auth error:", authError);
                throw authError;
            }

            if (authData.user) {
                console.log("User created:", authData.user.id);

                // Check if session is established (email confirmed or not required)
                if (authData.session) {
                    toast.success("Account created successfully!");
                    router.push("/dashboard");
                    router.refresh();
                } else {
                    // Email confirmation required
                    toast.success("Account created! Please check your email to confirm.");
                    router.push("/login");
                }
            } else {
                throw new Error("User creation failed - no user data returned");
            }
        } catch (error: any) {
            console.error("Signup error object:", error);
            toast.error(error.message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-xl mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Get started</h1>
                <p className="text-gray-600 mt-2">Create your TeamSync account</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
                <div>
                    <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                        Organization name
                    </label>
                    <input
                        id="orgName"
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Acme Inc."
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
