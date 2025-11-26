"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function revokeSession(sessionId: string) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    try {
        // 1. Verify user owns the session (or is just authenticated)
        // We can't easily verify ownership without querying sessions again, 
        // but deleteSession is admin-only, so we must be careful.
        // However, we should check if the session belongs to the user.

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        // Verify session belongs to user
        // We can use our RPC for this check
        const { data: sessions, error: sessionError } = await supabase.rpc('get_user_sessions');
        if (sessionError) throw sessionError;

        const session = sessions.find((s: any) => s.id === sessionId);
        if (!session) throw new Error("Session not found or access denied");

        // 2. Revoke session
        // Cast to any because deleteSession might be missing from older type definitions
        const { error } = await (supabaseAdmin.auth.admin as any).deleteSession(sessionId);
        if (error) throw error;

        revalidatePath("/settings/security");
        return { success: true };
    } catch (error: any) {
        console.error("Error revoking session:", error);
        return { error: error.message || "Failed to revoke session" };
    }
}

export async function signOutEverywhere() {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { error } = await supabaseAdmin.auth.admin.signOut(user.id, { scope: 'global' as const });
        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error("Error signing out everywhere:", error);
        return { error: error.message || "Failed to sign out everywhere" };
    }
}
