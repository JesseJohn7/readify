"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RepoList from "@/components/RepoList";
import { Repo } from "@/types";

declare const puter: any;

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

      // Fetch file tree
      let fileTree: string[] = [];
      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          fileTree = (treeData.tree || [])
            .map((f: any) => f.path as string)
            .filter((p: string) => !p.includes("node_modules") && !p.includes(".git"))
            .slice(0, 80);
        }
      } catch { /* skip */ }

      // Fetch key config/manifest files for deeper context
      let extraContext = "";
      const filesToCheck = [
        "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
        "requirements.txt", "composer.json", "build.gradle", "pom.xml",
      ];
      for (const file of filesToCheck) {
        if (fileTree.includes(file)) {
          try {
            const fileRes = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${file}`,
              token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
            );
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              const decoded = atob(fileData.content.replace(/\n/g, ""));
              extraContext += `\n\n### ${file}:\n${decoded.slice(0, 1500)}`;
            }
          } catch { /* skip */ }
          break; // only need the first match
        }
      }

      const prompt = `
You are an expert open-source technical writer. Deeply analyze this GitHub repository and write the most accurate, useful README.md possible for it.

## Repository Data

**Name:** ${ghData.name}
**Full name:** ${ghData.full_name}
**Description:** ${ghData.description || "No description provided"}
**Primary language:** ${ghData.language || "Unknown"}
**Topics/tags:** ${ghData.topics?.join(", ") || "none"}
**Stars:** ${ghData.stargazers_count} | **Forks:** ${ghData.forks_count}
**License:** ${ghData.license?.name || "Not specified"}
**Homepage:** ${ghData.homepage || "none"}
**Is fork:** ${ghData.fork}
**Default branch:** ${ghData.default_branch}
**Created:** ${ghData.created_at} | **Last pushed:** ${ghData.pushed_at}

### File tree:
${fileTree.join("\n") || "Not available"}
${extraContext}

## Instructions

Read everything carefully and infer:
- What this project actually does — go beyond the description, use the file tree and config files
- What type of project it is: CLI tool, web app, library, API, framework, script, game, etc.
- Who the audience is: end users, developers, data scientists, sysadmins, etc.
- The right tone: a serious infrastructure library needs formal depth; a fun weekend project can be relaxed
- Which sections genuinely apply — don't add sections that have no real content (e.g. don't add "Contributing" if it's a solo personal project with no contribution setup)
- Real, accurate setup steps based on the language and config files detected

Write a README that feels like the actual project author wrote it — not a generic template. Make the description genuinely explain what the project does and why it exists. If it's a library, show real API usage. If it's a CLI, show real commands with flags. If it's a web app, explain how to run it locally.

Always include:
- Project title + a punchy one-liner
- Shields.io badges relevant to this project (language, license, stars — use real URLs)
- Clear description
- Getting started / installation
- Usage with concrete examples

Only include other sections (Features, Contributing, API reference, Roadmap, etc.) if they are genuinely relevant.

## Output rules
- Return ONLY raw markdown. No explanation, no triple backticks wrapping the whole thing.
- Use real shields.io badge URLs based on the data above.
- Keep it practical — a developer should be able to clone and run this after reading it.
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
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4
        bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <span className="font-semibold text-gray-900 dark:text-white tracking-tight text-sm sm:text-base">
          Readify
        </span>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={user.user_metadata?.avatar_url}
              alt="avatar"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
              {user.user_metadata?.full_name}
            </span>
            <button
              onClick={signOut}
              title="Sign out"
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LogOutIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGitHub}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              hover:opacity-90 transition-opacity active:scale-95"
          >
            <GitHubIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Sign in</span>
          </button>
        )}
      </nav>

      {/* ── Main content ── */}
      <section className="flex items-start justify-center min-h-screen px-4 pt-20 sm:pt-28 pb-16">
        <main className="w-full max-w-3xl text-center">

          <h1 className="text-2xl sm:text-3xl md:text-[40px] font-semibold text-gray-900 dark:text-white leading-tight">
            {user
              ? `Hey ${user.user_metadata?.full_name?.split(" ")[0]}, pick a repo`
              : "What do you want to create?"}
          </h1>

          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 px-2">
            {user
              ? "Select a repo below or paste any GitHub URL."
              : "Paste a GitHub repo URL and get a production-ready README instantly."}
          </p>

          {/* ── Repo grid ── */}
          {user && (
            <div className="mt-6 sm:mt-8 text-left">
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
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
            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5 flex-wrap px-4">
              <span className="text-xs sm:text-sm bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full truncate max-w-[240px] sm:max-w-xs">
                {selected.fullName}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white text-xs transition-colors p-1 rounded"
                aria-label="Clear selection"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── URL input ── */}
          <div className="w-full mx-auto mt-5 sm:mt-6 rounded-xl
            bg-white/60 dark:bg-white/5 backdrop-blur-xl
            border border-gray-200 dark:border-gray-700
            shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/40 transition-shadow">
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
              className="w-full p-3 sm:p-4 pb-0 resize-none outline-none bg-transparent
                text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base
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
            <div className="flex justify-between items-center px-3 sm:px-4 pb-3 pt-2">
              <p className="text-xs text-gray-500">
                {user ? "Private repos supported" : "Sign in to access private repos"}
              </p>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleSend}
            disabled={generating || (!selected && !message.trim())}
            className="mt-4 w-full flex items-center justify-center gap-2
              bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-colors
              text-sm sm:text-base active:scale-[0.99]"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating...
              </>
            ) : !user ? (
              <>
                <GitHubIcon className="w-4 h-4 shrink-0" />
                Sign in & Generate →
              </>
            ) : (
              "Generate README →"
            )}
          </button>

          {error && (
            <p className="mt-3 text-red-400 text-xs sm:text-sm px-2 text-center break-words">
              {error}
            </p>
          )}

          {!user && (
            <p className="mt-4 text-xs sm:text-sm text-gray-400">
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