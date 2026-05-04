"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RepoList from "@/components/RepoList";
import { Repo, Tone } from "@/types";

declare const puter: any;

const tones: Tone[] = ["professional", "casual", "minimal"];

const toneDescriptions: Record<Tone, string> = {
  professional: "formal, comprehensive, and enterprise-grade",
  casual: "friendly, conversational, and approachable",
  minimal: "clean, concise, and straight to the point",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Hero() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Repo | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) loadRepos();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
        loadRepos();
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setRepos([]);
        setSelected(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/repos");
      const data = await res.json();
      setRepos(data.repos || []);
    } catch {
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }

  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo read:user",
        redirectTo: `${window.location.origin}/`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function handleSend() {
    const repoUrl = selected ? selected.url : message.trim();
    if (!repoUrl) return;

    if (!user) {
      await signInWithGitHub();
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
      if (!match) throw new Error("Invalid GitHub URL — make sure it looks like github.com/owner/repo");
      const [, owner, repo] = match;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;

      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (!ghRes.ok) {
        throw new Error(
          ghRes.status === 404
            ? "Repo not found. Is it private? Sign in with GitHub to access private repos."
            : `GitHub API error: ${ghRes.status}`
        );
      }

      const ghData = await ghRes.json();

      let extraContext = "";
      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          const files: string[] = (treeData.tree || [])
            .map((f: any) => f.path as string)
            .filter((p: string) => !p.includes("node_modules"))
            .slice(0, 60);
          extraContext = `\nFile tree (partial):\n${files.join("\n")}`;
        }
      } catch { /* skip */ }

      const prompt = `
You are an expert technical writer. Generate a production-ready README.md for the GitHub repository below.

## Repo Info
Name: ${ghData.name}
Full name: ${ghData.full_name}
Description: ${ghData.description || "No description provided"}
Primary language: ${ghData.language || "Unknown"}
Topics/tags: ${ghData.topics?.join(", ") || "none"}
Stars: ${ghData.stargazers_count} | Forks: ${ghData.forks_count}
License: ${ghData.license?.name || "Not specified"}
Homepage: ${ghData.homepage || "none"}
${extraContext}

## Tone
Write in a ${toneDescriptions[tone]} style.

## Required Sections
Include ALL of the following sections in this order:
1. Project title + a short tagline
2. Badges (build status, license, language — use shields.io format)
3. Description (2–3 sentences, what it does and why it matters)
4. Features (bullet list)
5. Tech Stack
6. Getting Started (Prerequisites + Installation)
7. Usage (with code examples if relevant)
8. Contributing
9. License

## Rules
- Return ONLY raw markdown. No explanation, no triple backticks wrapping the whole output.
- Use real shields.io badge URLs based on the repo info above.
- Keep it practical — a developer should be able to copy-paste and ship it.
      `.trim();

      const response = await puter.ai.chat(prompt, { model: "gpt-4o-mini" });

      const readme: string =
        response?.message?.content?.[0]?.text ??
        response?.message?.content ??
        response?.text ??
        response ?? "";

      if (!readme) throw new Error("Puter returned an empty response. Try again.");

      sessionStorage.setItem(
        "readify_result",
        JSON.stringify({
          readme,
          repo: {
            name: ghData.name,
            fullName: ghData.full_name,
            description: ghData.description,
            language: ghData.language,
            stars: ghData.stargazers_count,
            url: ghData.html_url,
            owner,
            repoSlug: repo,
          },
          tone,
          generatedAt: new Date().toISOString(),
        })
      );

      router.push("/generate");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-black dark:to-gray-900">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4
        bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <span className="font-semibold text-gray-900 dark:text-white tracking-tight">
          Readify
        </span>

        {user ? (
          <div className="flex items-center gap-3">
            <img
              src={user.user_metadata?.avatar_url}
              alt="avatar"
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <button
              onClick={signOut}
              title="Sign out"
              className="text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOutIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGitHub}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              hover:opacity-90 transition-opacity"
          >
            <GitHubIcon className="w-4 h-4" />
            Sign in
          </button>
        )}
      </nav>

      {/* ── Main content ── */}
      <section className="flex items-start justify-center min-h-screen px-4 pt-28 pb-16">
        <main className="w-full max-w-3xl text-center">

          {/* Headline */}
          <h1 className="text-4xl md:text-[40px] font-semibold text-gray-900 dark:text-white">
            {user
              ? `Hey ${user.user_metadata?.full_name?.split(" ")[0]}, pick a repo`
              : "What do you want to create?"}
          </h1>

          <p className="mt-3 text-gray-500 dark:text-gray-400">
            {user
              ? "Select a repo below or paste any GitHub URL."
              : "Paste a GitHub repo URL and get a production-ready README instantly."}
          </p>

          {/* ── Repo grid — shown when signed in ── */}
          {user && (
            <div className="mt-8 text-left">
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading your repos...
                </div>
              ) : repos.length > 0 ? (
                <RepoList
                  repos={repos}
                  selected={selected}
                  onSelect={(r) => { setSelected(r); setMessage(""); }}
                />
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No repos found. Paste a URL below.
                </p>
              )}
            </div>
          )}

          {/* Selected repo pill */}
          {selected && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <span className="text-sm bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
                {selected.fullName}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── URL input — always visible ── */}
          <div className="max-w-xl w-full mx-auto mt-6 rounded-xl
            bg-white/60 dark:bg-white/5 backdrop-blur-xl
            border border-gray-200 dark:border-gray-700
            shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!!selected}
              className="w-full p-4 pb-0 resize-none outline-none bg-transparent
                text-gray-900 dark:text-white placeholder-gray-400
                disabled:opacity-40 disabled:cursor-not-allowed"
              placeholder={
                selected
                  ? `Using: ${selected.fullName}`
                  : user
                  ? "Or paste a GitHub URL here..."
                  : "https://github.com/username/repo"
              }
              rows={3}
            />
            <div className="flex justify-between items-center px-3 pb-3 pt-2">
              <p className="text-xs text-gray-500">
                {user ? "Private repos supported" : "Sign in to access private repos"}
              </p>
            </div>
          </div>

          {/* Tone selector */}
          <div className="flex gap-2 justify-center mt-5">
            {tones.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  tone === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={handleSend}
            disabled={generating || (!selected && !message.trim())}
            className="mt-4 w-full max-w-xl mx-auto flex items-center justify-center gap-2
              bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating...
              </>
            ) : !user ? (
              <>
                <GitHubIcon className="w-4 h-4" />
                Sign in & Generate →
              </>
            ) : (
              "Generate README →"
            )}
          </button>

          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

          {!user && (
            <p className="mt-4 text-sm text-gray-400">
              <button onClick={signInWithGitHub} className="text-indigo-400 hover:underline">
                Sign in with GitHub
              </button>{" "}
              to browse your repos.
            </p>
          )}

          {user && (
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-600">
              AI powered by{" "}
              <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                Puter
              </a>{" "}
              — no API key required.
            </p>
          )}
        </main>
      </section>
    </div>
  );
}