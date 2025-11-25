"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SecurityPage() {
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
        });
    }, []);

    const handleSignOutEverywhere = async () => {
        if (!confirm("Are you sure you want to sign out from all devices? You will be redirected to login.")) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut({ scope: 'global' });
            if (error) throw error;

            toast.success("Signed out from all devices");
            router.push("/login");
        } catch (error: any) {
            toast.error(error.message || "Failed to sign out everywhere");
            setLoading(false);
        }
    };

    const [enrolling, setEnrolling] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [verifying, setVerifying] = useState(false);

    const handleEnrollMFA = async () => {
        setEnrolling(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp'
            });

            if (error) throw error;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
        } catch (error: any) {
            toast.error(error.message || "Failed to start enrollment");
            setEnrolling(false);
        }
    };

    const handleVerifyMFA = async () => {
        if (!factorId || !verifyCode) return;
        setVerifying(true);

        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verifyCode
            });

            if (verify.error) throw verify.error;

            toast.success("2FA enabled successfully");
            setQrCode(null);
            setFactorId(null);
            setEnrolling(false);
            setVerifyCode("");
        } catch (error: any) {
            toast.error(error.message || "Invalid code");
        } finally {
            setVerifying(false);
        }
    };

    const handleCancelMFA = async () => {
        if (factorId) {
            await supabase.auth.mfa.unenroll({ factorId });
        }
        setQrCode(null);
        setFactorId(null);
        setEnrolling(false);
    };

    return (
        <div className="p-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
                <p className="text-gray-600 mt-2">Manage your account security and sessions</p>
            </div>

            <div className="space-y-6">
                {/* 2FA Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>

                    {!qrCode ? (
                        <div>
                            <p className="text-gray-600 mb-4">
                                Add an extra layer of security to your account by enabling 2FA.
                            </p>
                            <button
                                onClick={handleEnrollMFA}
                                disabled={enrolling}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {enrolling ? "Preparing..." : "Enable 2FA"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <p className="text-sm font-medium text-gray-900 mb-2">Scan this QR code with your authenticator app</p>
                                <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enter verification code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value)}
                                        placeholder="000000"
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleVerifyMFA}
                                        disabled={verifying || !verifyCode}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                                    >
                                        {verifying ? "Verifying..." : "Verify"}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleCancelMFA}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Cancel setup
                            </button>
                        </div>
                    )}
                </div>

                {/* Session Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Management</h2>

                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-medium text-blue-900 mb-1">Current Session</h3>
                            <p className="text-sm text-blue-700">
                                Active since: {session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : 'Unknown'}
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="font-medium text-gray-900 mb-2">Sign Out Everywhere</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                This will revoke all active sessions across all devices, including this one. You will need to log in again.
                            </p>
                            <button
                                onClick={handleSignOutEverywhere}
                                disabled={loading}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50"
                            >
                                {loading ? "Signing out..." : "Sign Out from All Devices"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
