"use server";

import { createClient } from "@/lib/supabase/server";

export interface Session {
    id: string;
    created_at: string;
    updated_at: string;
    is_current: boolean;
}

export async function getSessions() {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase.rpc('get_user_sessions');

        if (error) throw error;

        return { sessions: data as Session[] };
    } catch (error: any) {
        console.error("Error fetching sessions:", error);
        return { error: error.message || "Failed to fetch sessions" };
    }
}
