import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserRepos } from "@/lib/github";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const repos = await fetchUserRepos(session.provider_token);
  return NextResponse.json({ repos });
}