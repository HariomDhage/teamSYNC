import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityType } from "@/lib/types/database";

export async function dispatchWebhook(
    organizationId: string,
    event: ActivityType,
    payload: any
) {
    try {
        const supabase = createAdminClient();

        // 1. Get active webhooks for this organization that subscribe to this event
        // Note: In a real app, we'd filter by event type in the query. 
        // For now, we'll fetch all active webhooks for the org and filter in code 
        // since our events column is a simple text array.
        const { data: webhooks, error } = await supabase
            .from("webhooks")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("is_active", true);

        if (error || !webhooks || webhooks.length === 0) return;

        // 2. Filter webhooks that subscribe to this event
        // We assume 'events' is an array of strings like ['user_invited', 'team_created']
        // or a wildcard ['*']
        const matchingWebhooks = webhooks.filter(wh =>
            wh.events.includes('*') || wh.events.includes(event)
        );

        if (matchingWebhooks.length === 0) return;

        // 3. Dispatch events (fire and forget)
        const timestamp = new Date().toISOString();

        matchingWebhooks.forEach(async (webhook) => {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-TeamSync-Event': event,
                        'X-TeamSync-Signature': webhook.secret, // In prod, this should be an HMAC signature
                        'X-TeamSync-Timestamp': timestamp
                    },
                    body: JSON.stringify({
                        id: crypto.randomUUID(),
                        event: event,
                        created_at: timestamp,
                        data: payload
                    })
                });

                // Optional: Update last_triggered_at or failure_count
                if (!response.ok) {
                    console.warn(`Webhook failed for ${webhook.url}: ${response.status}`);
                    await supabase.rpc('increment_webhook_failure', { webhook_id: webhook.id });
                } else {
                    await supabase
                        .from("webhooks")
                        .update({ last_triggered_at: new Date().toISOString() })
                        .eq("id", webhook.id);
                }

            } catch (err) {
                console.error(`Webhook dispatch error for ${webhook.url}:`, err);
            }
        });

    } catch (error) {
        console.error("Error in dispatchWebhook:", error);
    }
}
