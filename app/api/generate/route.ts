import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRepoUrl, fetchRepoData } from "@/lib/github";
import { buildReadmePrompt, buildDescriptionPrompt } from "@/lib/buildPrompt";
import { generateText } from "@/lib/gemini";
import { Tone } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, tone }: { repoUrl: string; tone: Tone } = await req.json();

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token ?? undefined;

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const { owner, repo } = parsed;
    const repoData = await fetchRepoData(owner, repo, token);

    const [readme, description] = await Promise.all([
      generateText(buildReadmePrompt({ owner, repo, ...repoData, tone })),
      generateText(buildDescriptionPrompt(owner, repo, repoData.packageJson)),
    ]);

    if (session?.user?.id) {
      await supabase.from("readmes").insert({
        user_id: session.user.id,
        repo_url: repoUrl,
        repo_name: repo,
        description: description.trim(),
        readme,
        tone,
      });
    }

    return NextResponse.json({
      readme,
      repoName: repo,
      repoUrl,
      description: description.trim(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}