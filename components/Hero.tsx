"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RepoList from "@/components/RepoList";
import { Repo } from "@/types";

declare const puter: any;

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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Safely decode a GitHub base64 file response.
 * BUG FIX: The old escape(atob(...)) pattern crashes on non-latin characters.
 * We now use TextDecoder which handles all UTF-8 correctly.
 */
function decodeBase64(encoded: string): string {
  try {
    const binary = atob(encoded.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

/** Fetch and decode a single file from the GitHub Contents API */
async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  token: string | undefined,
  maxChars = 3000
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers }
    );
    if (!res.ok) return null;

    const data = await res.json();
    // GitHub returns content as base64 with newlines
    if (!data.content || data.encoding !== "base64") return null;

    const decoded = decodeBase64(data.content);
    return decoded.slice(0, maxChars) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch visible text from a live URL.
 * BUG FIX: AbortSignal.timeout() is not available in all environments.
 * Using AbortController + setTimeout instead for wider compatibility.
 */
async function fetchLiveSiteText(
  url: string,
  maxChars = 3000
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: controller.signal });
    if (!res.ok) return null;

    const json = await res.json();
    const html: string = json.contents ?? "";
    if (!html) return null;

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, maxChars) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Ordered priority list — checked against the actual file tree before fetching
const SOURCE_FILE_CANDIDATES = [
  // Package manifests (read first — gives deps, scripts, version)
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "requirements.txt",
  "composer.json",
  "build.gradle",
  "pom.xml",
  "Gemfile",
  "mix.exs",
  "pubspec.yaml",
  // Entry points
  "src/index.ts",
  "src/index.js",
  "src/main.ts",
  "src/main.js",
  "src/app.ts",
  "src/app.js",
  "app/page.tsx",
  "app/layout.tsx",
  "main.py",
  "app.py",
  "index.py",
  "cli.py",
  "server.py",
  "main.go",
  "main.rs",
  "src/lib.rs",
  "lib.rs",
  "index.js",
  "index.ts",
  "server.js",
  "server.ts",
  // Extra docs
  "CHANGELOG.md",
  "CONTRIBUTING.md",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Hero() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Repo | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // BUG FIX: supabase client was being recreated on every render.
  // Moved inside useEffect to avoid stale closure / infinite loop issues.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRepos() {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to load repos");
      const data = await res.json();
      setRepos(data.repos ?? []);
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
    setStatus("Fetching repo info...");

    try {
      // BUG FIX: regex was not stripping trailing .git from clone URLs
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#.]+)/);
      if (!match) {
        throw new Error(
          "Invalid GitHub URL — should look like github.com/owner/repo"
        );
      }
      const [, owner, repo] = match;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.provider_token ?? undefined;

      // Build headers once — reused for all GitHub API calls
      const ghHeaders: Record<string, string> = {
        Accept: "application/vnd.github+json",
      };
      if (token) ghHeaders.Authorization = `Bearer ${token}`;

      // ── Step 1: Repo metadata ─────────────────────────────────────────────
      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers: ghHeaders }
      );

      if (!ghRes.ok) {
        throw new Error(
          ghRes.status === 404
            ? "Repo not found. Is it private? Sign in with GitHub to access private repos."
            : `GitHub API error ${ghRes.status}`
        );
      }

      const ghData = await ghRes.json();

      // ── Step 2: File tree ─────────────────────────────────────────────────
      setStatus("Reading file structure...");
      let fileTree: string[] = [];

      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
          { headers: ghHeaders }
        );
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          // BUG FIX: treeData.tree can be undefined if repo is empty
          fileTree = ((treeData.tree as any[]) ?? [])
            .filter((f) => f.type === "blob")
            .map((f) => f.path as string)
            .filter(
              (p) =>
                !p.startsWith("node_modules/") &&
                !p.startsWith(".git/") &&
                !p.startsWith("dist/") &&
                !p.startsWith(".next/") &&
                !p.startsWith("__pycache__/") &&
                !p.startsWith("vendor/") &&
                !p.startsWith("target/")
            );
        }
      } catch {
        /* tree fetch failing is non-fatal */
      }

      // ── Step 3: Read source files ─────────────────────────────────────────
      setStatus("Reading source code...");

      // Only fetch files that actually exist in the tree
      const priorityFiles = SOURCE_FILE_CANDIDATES.filter((f) =>
        fileTree.includes(f)
      );

      // Also grab up to 3 source files from src/ lib/ app/ not already in list
      const extraSources = fileTree
        .filter(
          (p) =>
            (p.startsWith("src/") ||
              p.startsWith("lib/") ||
              p.startsWith("app/")) &&
            /\.(ts|tsx|js|jsx|py|go|rs|rb|java|swift|kt)$/.test(p) &&
            !priorityFiles.includes(p)
        )
        .slice(0, 3);

      // Cap at 10 files total to avoid rate limiting
      const filesToFetch = [...priorityFiles, ...extraSources].slice(0, 10);

      // BUG FIX: Promise.all with no error boundary — any single rejection
      // would crash the whole thing. Now each fetch is individually guarded.
      const fileEntries = await Promise.all(
        filesToFetch.map(async (filePath) => {
          const content = await fetchFileContent(owner, repo, filePath, token);
          return content ? ([filePath, content] as [string, string]) : null;
        })
      );

      const fileContents: Record<string, string> = {};
      for (const entry of fileEntries) {
        if (entry) fileContents[entry[0]] = entry[1];
      }

      // ── Step 4: Live site ─────────────────────────────────────────────────
      let liveSiteText = "";
      const homepage = (ghData.homepage as string | null)?.trim();

      if (homepage && /^https?:\/\//.test(homepage)) {
        setStatus("Reading live site...");
        const siteText = await fetchLiveSiteText(homepage);
        if (siteText) {
          liveSiteText = `\n\n### Live site content scraped from ${homepage}:\n${siteText}`;
        }
      }

      // ── Step 5: Build prompt & generate ──────────────────────────────────
      setStatus("Generating README...");

      const fileContentBlock = Object.entries(fileContents)
        .map(([p, c]) => `### ${p}\n\`\`\`\n${c}\n\`\`\``)
        .join("\n\n");

      const prompt = `
You are an expert open-source technical writer with deep software engineering knowledge.
Read the actual source code and live site content below, understand what this project truly does, and write the most accurate and useful README.md for it.

Base everything on the real code and content provided. Do NOT make things up.

---

## Repository Metadata

Name: ${ghData.name}
Full name: ${ghData.full_name}
Description: ${ghData.description ?? "No description provided"}
Primary language: ${ghData.language ?? "Unknown"}
Topics: ${(ghData.topics as string[])?.join(", ") || "none"}
Stars: ${ghData.stargazers_count} | Forks: ${ghData.forks_count}
License: ${ghData.license?.name ?? "Not specified"}
Homepage: ${homepage ?? "none"}
Default branch: ${ghData.default_branch}
Last pushed: ${ghData.pushed_at}

## File Tree (${fileTree.length} files, trimmed):
${fileTree.slice(0, 100).join("\n") || "Not available"}

## Source Files Read
${fileContentBlock || "No source files could be fetched."}
${liveSiteText}

---

## Instructions

1. Read the code carefully. Determine:
   - What this project actually does (from the code, not just the description)
   - Project type: CLI tool, library, web app, API, framework, script, game, etc.
   - Exact tech stack from imports and config files
   - Real install steps based on the detected package manager
   - Real usage examples: actual commands, API calls, or code snippets from the source
   - Target audience

2. If a live site was scraped, use it to understand how the project presents its value proposition.

3. Write a README that a developer reading the source code would recognize as accurate. Every claim must come from something you saw.

4. Decide which sections to include based on what's real:
   - Always include: title, badges, description, installation, usage
   - Only include if genuinely applicable: features, API reference, config options, contributing, roadmap, demo link, screenshots, FAQ
   - Skip any section you'd have to invent content for

5. Match the tone to the project type. A serious infrastructure tool gets a professional tone. A fun side project gets a lighter tone. Infer from the code.

## Output rules
- Return ONLY the raw markdown content. No explanation text before or after. No triple backtick fence wrapping the whole file.
- Badges: use real shields.io URLs built from the actual metadata above.
- Install commands must match the detected package manager exactly.
- Code examples must reflect the actual API or CLI surface from the source code.
`.trim();

      // BUG FIX: puter.ai.chat response shape varies by model/version.
      // Exhaustively check all known shapes before giving up.
      const response = await puter.ai.chat(prompt, { model: "gpt-4o-mini" });

      const readme: string =
        response?.message?.content?.[0]?.text ??
        response?.message?.content ??
        response?.text ??
        (typeof response === "string" ? response : "") ??
        "";

      if (!readme || readme.trim().length < 10) {
        throw new Error("AI returned an empty response. Please try again.");
      }

      sessionStorage.setItem(
        "readify_result",
        JSON.stringify({
          readme,
          repo: {
            name: ghData.name,
            fullName: ghData.full_name,
            description: ghData.description ?? null,
            language: ghData.language ?? null,
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
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
      setStatus("");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-black dark:to-gray-900">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
        px-4 sm:px-6 py-3 sm:py-4
        bg-white/80 dark:bg-black/80 backdrop-blur-md
        border-b border-gray-200 dark:border-gray-800">

        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white tracking-tight">
          Readify
        </span>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* BUG FIX: add width/height to avoid layout shift while image loads */}
            <img
              src={user.user_metadata?.avatar_url ?? ""}
              alt="avatar"
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
              {user.user_metadata?.full_name ?? ""}
            </span>
            <button
              onClick={signOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOutIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGitHub}
            className="flex items-center gap-1.5 sm:gap-2
              px-3 sm:px-4 py-2 rounded-lg
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              text-xs sm:text-sm font-medium
              hover:opacity-90 active:scale-95 transition-all"
          >
            <GitHubIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Sign in
          </button>
        )}
      </nav>

      {/* Main */}
      <section className="flex items-start justify-center min-h-screen px-4 pt-20 sm:pt-28 pb-16">
        <main className="w-full max-w-3xl text-center">

          <h1 className="text-2xl sm:text-3xl md:text-[40px] font-semibold leading-tight
            text-gray-900 dark:text-white">
            {user
              ? `Hey ${user.user_metadata?.full_name?.split(" ")[0] ?? "there"}, pick a repo`
              : "What do you want to create?"}
          </h1>

          <p className="mt-2 sm:mt-3 px-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {user
              ? "Select a repo below or paste any GitHub URL."
              : "Paste a GitHub repo URL — we'll read the code and write an accurate README."}
          </p>

          {/* Repo list */}
          {user && (
            <div className="mt-6 sm:mt-8 text-left">
              {loadingRepos ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
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
                  onSelect={(r) => {
                    setSelected(r);
                    setMessage("");
                    setError("");
                  }}
                />
              ) : (
                <p className="py-4 text-sm text-gray-400 text-center">
                  No repos found. Paste a URL below.
                </p>
              )}
            </div>
          )}

          {/* Selected pill */}
          {selected && (
            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5 flex-wrap px-4">
              <span className="text-xs sm:text-sm bg-indigo-500/20 text-indigo-400
                px-3 py-1 rounded-full truncate max-w-[240px] sm:max-w-xs">
                {selected.fullName}
              </span>
              <button
                onClick={() => { setSelected(null); setError(""); }}
                aria-label="Clear selection"
                className="p-1 rounded text-gray-400 hover:text-white text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* URL input */}
          <div className="mt-5 sm:mt-6 rounded-xl
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
              disabled={!!selected || generating}
              rows={3}
              className="w-full p-3 sm:p-4 pb-0 bg-transparent resize-none outline-none
                text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400
                disabled:opacity-40 disabled:cursor-not-allowed"
              placeholder={
                selected
                  ? `Using: ${selected.fullName}`
                  : user
                  ? "Or paste a GitHub URL here..."
                  : "https://github.com/username/repo"
              }
            />
            <p className="px-3 sm:px-4 pb-3 pt-1.5 text-xs text-gray-500 text-left">
              {user
                ? "Reads your source code + live site for an accurate README"
                : "Sign in to access private repos"}
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleSend}
            disabled={generating || (!selected && !message.trim())}
            className="mt-4 w-full flex items-center justify-center gap-2
              py-3 sm:py-3.5 rounded-xl
              bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
              text-white text-sm sm:text-base font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors active:scale-[0.99]"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="truncate">{status || "Generating..."}</span>
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

          {/* Error */}
          {error && (
            <p className="mt-3 px-2 text-xs sm:text-sm text-red-400 text-center break-words">
              {error}
            </p>
          )}

          {/* Sign-in nudge */}
          {!user && (
            <p className="mt-4 text-xs sm:text-sm text-gray-400">
              <button
                onClick={signInWithGitHub}
                className="text-indigo-400 hover:underline"
              >
                Sign in with GitHub
              </button>{" "}
              to browse your repos.
            </p>
          )}

          {/* Footer */}
          {user && (
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-600">
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
    </div>
  );
}