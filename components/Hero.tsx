"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RepoList from "@/components/RepoList";
import { Repo, Tone } from "@/types";

// tell TS about the global puter object injected by the CDN script
declare const puter: any;

const tones: Tone[] = ["professional", "casual", "minimal"];

const toneDescriptions: Record<Tone, string> = {
  professional: "formal, comprehensive, and enterprise-grade",
  casual: "friendly, conversational, and approachable",
  minimal: "clean, concise, and straight to the point",
};

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

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) loadRepos();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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

  // ── load repos from your existing /api/repos route ────────────────────────
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

  // ── GitHub OAuth via Supabase ─────────────────────────────────────────────
  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo read:user",
        redirectTo: `${window.location.origin}/`,
      },
    });
  }

  // ── core: fetch repo metadata then generate README with Puter AI ──────────
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
      // 1️⃣  parse owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
      if (!match)
        throw new Error(
          "Invalid GitHub URL — make sure it looks like github.com/owner/repo"
        );
      const [, owner, repo] = match;

      // 2️⃣  fetch repo metadata from GitHub API
      //     use the user's OAuth token so private repos work too
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.provider_token;

      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (!ghRes.ok) {
        const msg =
          ghRes.status === 404
            ? "Repo not found. Is it private? Sign in with GitHub to access private repos."
            : `GitHub API error: ${ghRes.status}`;
        throw new Error(msg);
      }

      const ghData = await ghRes.json();

      // 3️⃣  optionally fetch partial file tree for better tech stack context
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
      } catch {
        // not critical, skip silently
      }

      // 4️⃣  build the prompt
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

      // 5️⃣  call Puter AI — no API key needed, user's Puter account handles billing
      const response = await puter.ai.chat(prompt, {
        model: "gpt-4o-mini", // swap to "gpt-4o" for higher quality
      });

      // Puter returns different shapes depending on model — handle all of them
      const readme: string =
        response?.message?.content?.[0]?.text ??
        response?.message?.content ??
        response?.text ??
        response ??
        "";

      if (!readme) throw new Error("Puter returned an empty response. Try again.");

      // 6️⃣  store result and navigate to the display page
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <section
      className="w-full flex items-center justify-center min-h-screen px-4
        bg-gradient-to-b from-white to-gray-100
        dark:from-black dark:to-gray-900"
    >
      <main className="w-full max-w-3xl text-center">

        {/* Hero text */}
        <h1 className="text-4xl md:text-[40px] font-semibold text-gray-900 dark:text-white">
          {user
            ? `Hey ${user.user_metadata?.full_name?.split(" ")[0]}, pick a repo`
            : "What do you want to create?"}
        </h1>

        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {user
            ? "Select a repo below or paste any GitHub URL."
            : "Paste a GitHub repo URL and get a production-ready README instantly."}
        </p>

        {/* Repo list — signed in only */}
        {user && (
          <div className="mt-6 text-left">
            {loadingRepos ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Loading your repos...
              </p>
            ) : repos.length > 0 ? (
              <RepoList
                repos={repos}
                selected={selected}
                onSelect={(r) => {
                  setSelected(r);
                  setMessage("");
                }}
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
          <div className="flex items-center justify-center gap-2 mt-4">
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

        {/* URL input */}
        {!selected && (
          <div
            className="max-w-xl w-full mx-auto mt-6 rounded-xl
              bg-white/60 dark:bg-white/5 backdrop-blur-xl
              border border-gray-200 dark:border-gray-700
              shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40"
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full p-4 pb-0 resize-none outline-none bg-transparent
                text-gray-900 dark:text-white placeholder-gray-400"
              placeholder={
                user
                  ? "Or paste a GitHub URL here..."
                  : "https://github.com/username/repo"
              }
              rows={3}
            />
            <div className="flex justify-between items-center px-3 pb-3 pt-2">
              <p className="text-xs text-gray-500">
                {user
                  ? "Private repos supported via your GitHub token"
                  : "Sign in to access private repos"}
              </p>
            </div>
          </div>
        )}

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
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Generating...
            </>
          ) : !user ? (
            "Sign in & Generate →"
          ) : (
            "Generate README →"
          )}
        </button>

        {/* Error */}
        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

        {/* Guest nudge */}
        {!user && (
          <p className="mt-4 text-sm text-gray-400">
            <button
              onClick={signInWithGitHub}
              className="text-indigo-400 hover:underline"
            >
              Sign in with GitHub
            </button>{" "}
            to browse your repos and save history.
          </p>
        )}

        {/* Puter attribution */}
        {user && (
          <p className="mt-6 text-xs text-gray-500 dark:text-gray-600">
            AI powered by{" "}
            <a
              href="https://puter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Puter
            </a>{" "}
            — no API key required.
          </p>
        )}
      </main>
    </section>
  );
}