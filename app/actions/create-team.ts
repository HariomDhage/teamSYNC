"use server";

import { createClient } from "@/lib/supabase/server";
import { dispatchWebhook } from "@/lib/webhooks";
import { revalidatePath } from "next/cache";

export async function createTeam(organizationId: string, name: string, description: string) {
    const supabase = await createClient();

    try {
        // 1. Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Unauthorized");

        // 2. Check permissions (Admin or Owner)
        const { data: member, error: memberError } = await supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .single();

        if (memberError || !member || (member.role !== "admin" && member.role !== "owner")) {
            throw new Error("You do not have permission to create teams");
        }

        // 3. Check Team Quota
        const { count: teamCount, error: countError } = await supabase
            .from("teams")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId);

        const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("max_teams")
            .eq("id", organizationId)
            .single();

        if (countError || orgError || !orgData) {
            console.error("Error checking quota:", countError || orgError);
            return { success: false, error: "Failed to verify organization limits" };
        }

        if ((teamCount || 0) >= orgData.max_teams) {
            return { success: false, error: `Organization limit reached (${orgData.max_teams} teams). Upgrade your plan to create more teams.` };
        }

        // 4. Create Team
        const { data: team, error: createError } = await supabase
            .from("teams")
            .insert({
                organization_id: organizationId,
                name: name.trim(),
                description: description.trim() || null,
                created_by: user.id
            })
            .select()
            .single();

        if (createError) throw createError;

        // 5. Log Activity
        await supabase.from("activity_logs").insert({
            organization_id: organizationId,
            user_id: user.id,
            action: "team_created",
            metadata: { team_id: team.id, team_name: team.name }
        });

        // 6. Dispatch Webhook
        await dispatchWebhook(organizationId, "team_created", {
            team_id: team.id,
            name: team.name,
            description: team.description,
            created_by: user.id,
            created_at: team.created_at
        });

        revalidatePath("/teams");
        return { success: true, team };

    } catch (error: any) {
        console.error("Error creating team:", error);
        return { success: false, error: error.message };
    }
}
