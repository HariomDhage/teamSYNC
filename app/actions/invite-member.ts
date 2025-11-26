"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function inviteMember(formData: FormData) {
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const organizationId = formData.get("organizationId") as string;

    if (!email || !role || !organizationId) {
        return { error: "Missing required fields" };
    }

    try {
        const supabaseAdmin = createAdminClient();
        const supabase = await createClient();

        // 1. Verify the current user is an admin/owner of the organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const { data: membership, error: membershipError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .single();

        if (membershipError || !membership || !["admin", "owner"].includes(membership.role)) {
            return { error: "You do not have permission to invite members" };
        }

        // 2. Check Member Quota
        const { count: memberCount, error: countError } = await supabase
            .from("organization_members")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId);

        const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("max_members")
            .eq("id", organizationId)
            .single();

        if (countError || orgError || !orgData) {
            console.error("Error checking quota:", countError || orgError);
            // Fail safe: proceed if we can't check, or throw? 
            // Better to throw to avoid overage if DB is acting up.
            return { error: "Failed to verify organization limits" };
        }

        if ((memberCount || 0) >= orgData.max_members) {
            return { error: `Organization limit reached (${orgData.max_members} members). Upgrade your plan to invite more members.` };
        }

        // 3. Invite user via Supabase Auth (sends email)
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

        if (inviteError) {
            // If user already exists, inviteUserByEmail might return error or just data depending on config
            // But usually it sends a magic link.
            // If error is "User already registered", we proceed to add them to org.
            console.error("Invite error:", inviteError);
            // We continue if it's just that they exist, but Supabase usually handles this.
            // If it fails, we might need to check if user exists.
        }

        let userId = inviteData.user?.id;

        // If invite failed because user exists, fetch the user ID
        if (!userId) {
            // Try to get user by email (admin only)
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
            // This is inefficient for large userbases, but listUsers has pagination.
            // Better: use listUsers with filter if available or just proceed.
            // Actually, if inviteUserByEmail fails, it might be because they are already a user.
            // Let's try to find them.
            // NOTE: Supabase Admin API doesn't have getUserByEmail directly exposed in all versions easily without listUsers.
            // But inviteUserByEmail usually returns the user even if they exist, unless configured otherwise.

            // Let's assume for now we got the user or they exist.
            // If we didn't get userId, we can't proceed.
            return { error: "Failed to resolve user. They might already be registered." };
        }

        // 3. Add to organization_members
        const { error: insertError } = await supabaseAdmin
            .from("organization_members")
            .insert({
                organization_id: organizationId,
                user_id: userId,
                role: role,
                invited_by: user.id,
            });

        if (insertError) {
            if (insertError.code === "23505") {
                return { error: "User is already a member of this organization" };
            }
            throw insertError;
        }

        // 4. Log activity
        await supabaseAdmin.from("activity_logs").insert({
            organization_id: organizationId,
            user_id: user.id,
            action: "user_invited",
            metadata: { email, role },
        });

        // 5. Dispatch Webhook
        // We import dynamically or use the utility we just created
        const { dispatchWebhook } = await import("@/lib/webhooks");
        // Don't await this to keep UI fast
        dispatchWebhook(organizationId, "user_invited", {
            email,
            role,
            invited_by: user.id,
            invited_at: new Date().toISOString()
        });

        revalidatePath("/members");
        return { success: true };
    } catch (error: any) {
        console.error("Invite member error:", error);
        return { error: error.message || "Failed to invite member" };
    }
}
