"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Icons ─────────────────────────────────────────────────────────────────────
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface RepoInfo {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
  owner: string;
  repoSlug: string;
}

interface StoredResult {
  readme: string;
  repo: RepoInfo;
  tone: string;
  generatedAt: string;
}

type Mode = "preview" | "edit";

export default function GeneratePage() {
  const router = useRouter();
  const supabase = createClient();

  const [data, setData] = useState<StoredResult | null>(null);
  const [savedReadme, setSavedReadme] = useState("");
  const [draftReadme, setDraftReadme] = useState("");
  const [mode, setMode] = useState<Mode>("preview");
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // fileSha: the SHA of the existing README.md on GitHub.
  // Kept in state so re-pushes always send the correct SHA for updates.
  const [fileSha, setFileSha] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitStatus, setCommitStatus] = useState<"idle" | "success" | "error">("idle");
  const [commitMsg, setCommitMsg] = useState("");

  // ── Load from sessionStorage ───────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("readify_result");
    if (!stored) { router.push("/"); return; }
    const parsed: StoredResult = JSON.parse(stored);
    setData(parsed);
    setSavedReadme(parsed.readme);
    setDraftReadme(parsed.readme);
  }, []);

  if (!data) return null;

  const repo: RepoInfo = data.repo;

  // ── Enter edit mode ────────────────────────────────────────────────────────
  function enterEdit() {
    setDraftReadme(savedReadme);
    setHasUnsaved(false);
    setMode("edit");
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    setSavedReadme(draftReadme);
    const stored = sessionStorage.getItem("readify_result");
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.readme = draftReadme;
      sessionStorage.setItem("readify_result", JSON.stringify(parsed));
    }
    setHasUnsaved(false);
    setMode("preview");
  }

  // ── Discard ────────────────────────────────────────────────────────────────
  function handleDiscard() {
    setDraftReadme(savedReadme);
    setHasUnsaved(false);
    setMode("preview");
  }

  // ── Copy ───────────────────────────────────────────────────────────────────
  async function handleCopy() {
    await navigator.clipboard.writeText(savedReadme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download ───────────────────────────────────────────────────────────────
  function handleDownload() {
    const blob = new Blob([savedReadme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Push to GitHub ─────────────────────────────────────────────────────────
  // Always fetches the latest SHA before pushing so repeat pushes always
  // update (not duplicate) the file — even across page reloads.
  async function handleCommit() {
    setCommitting(true);
    setCommitStatus("idle");
    setCommitMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error("No GitHub token found. Please sign in again.");

      const { owner, repoSlug } = repo;

      // Always fetch the latest SHA so repeated pushes update correctly
      let currentSha: string | undefined = fileSha ?? undefined;
      try {
        const checkRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoSlug}/contents/README.md`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          currentSha = existing.sha;
          setFileSha(existing.sha); // keep state in sync
        }
      } catch { /* file doesn't exist yet — first push */ }

      // Encode content as base64 (handles unicode correctly)
      const utf8Bytes = new TextEncoder().encode(savedReadme);
      const base64 = btoa(String.fromCharCode(...Array.from(utf8Bytes)));

      const body: Record<string, unknown> = {
        message: currentSha
          ? "docs: update README.md via Readify"
          : "docs: add README.md via Readify",
        content: base64,
      };
      if (currentSha) body.sha = currentSha;

      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoSlug}/contents/README.md`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!commitRes.ok) {
        const err = await commitRes.json();
        throw new Error(err.message || `GitHub error: ${commitRes.status}`);
      }

      // Store the new SHA returned from GitHub for the next push
      const commitData = await commitRes.json();
      const newSha = commitData?.content?.sha;
      if (newSha) setFileSha(newSha);

      setCommitStatus("success");
      setCommitMsg(currentSha ? "README.md updated on GitHub ✓" : "README.md pushed to GitHub ✓");
    } catch (e: any) {
      setCommitStatus("error");
      setCommitMsg(e.message || "Push failed. Try again.");
    } finally {
      setCommitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4
        bg-gray-950/90 backdrop-blur border-b border-gray-800">

        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {mode === "preview" ? (
            <>
              <button onClick={enterEdit}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                  bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
                <EditIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button onClick={handleDownload}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                  bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
                <DownloadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                  bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
                {copied
                  ? <CheckIcon className="w-4 h-4 text-green-400" />
                  : <CopyIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </button>

              <button onClick={handleCommit} disabled={committing}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                  bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                  text-white transition-colors">
                {committing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span className="hidden sm:inline">Pushing...</span>
                  </>
                ) : (
                  <>
                    <GitHubIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Push to GitHub</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {hasUnsaved && (
                <span className="text-xs text-yellow-400 hidden sm:block">Unsaved changes</span>
              )}
              <button onClick={handleDiscard}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                  bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                Discard
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                  bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
                <SaveIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Unsaved warning banner */}
      {mode === "edit" && hasUnsaved && (
        <div className="px-6 py-2 text-xs text-center bg-yellow-900/30 text-yellow-400 border-b border-yellow-800/50">
          You have unsaved changes — hit <strong>Save</strong> to keep them or <strong>Discard</strong> to revert.
        </div>
      )}

      {/* Commit status banner */}
      {commitStatus !== "idle" && (
        <div className={`px-6 py-3 text-sm text-center font-medium ${
          commitStatus === "success"
            ? "bg-green-900/50 text-green-300 border-b border-green-800"
            : "bg-red-900/50 text-red-300 border-b border-red-800"
        }`}>
          {commitMsg}
          {commitStatus === "success" && (
            
             <a href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline hover:text-white"
            >
              View on GitHub →
            </a>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-7xl w-full mx-auto px-0 lg:px-6 py-6">

        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 px-6 lg:px-0 mb-6 lg:mb-0 lg:pr-6">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <GitHubIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white truncate">{repo.name}</span>
            </div>
            {repo.description && (
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">{repo.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              {repo.language && (
                <span className="bg-gray-800 px-2 py-0.5 rounded">{repo.language}</span>
              )}
              {data.tone && (
                <span className="bg-gray-800 px-2 py-0.5 rounded capitalize">{data.tone}</span>
              )}
              <span className="bg-gray-800 px-2 py-0.5 rounded">⭐ {repo.stars}</span>
            </div>
            
              < a href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              View repo <span>↗</span>
            </a>
            {mode === "preview" && (
              <button onClick={enterEdit}
                className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs
                  text-gray-500 hover:text-indigo-400 transition-colors py-2
                  border border-dashed border-gray-700 hover:border-indigo-500/50 rounded-lg">
                <EditIcon className="w-3 h-3" />
                Edit README
              </button>
            )}
          </div>
        </aside>

        {/* README panel */}
        <div className="flex-1 min-w-0 px-6 lg:px-0">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">

            {/* File tab */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-gray-500 ml-2">README.md</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                mode === "edit"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-gray-800 text-gray-500"
              }`}>
                {mode === "edit" ? "editing" : "preview"}
              </span>
            </div>

            {mode === "edit" ? (
              <textarea
                value={draftReadme}
                onChange={(e) => {
                  setDraftReadme(e.target.value);
                  setHasUnsaved(e.target.value !== savedReadme);
                }}
                spellCheck={false}
                autoFocus
                className="w-full min-h-[70vh] p-6 bg-gray-950 text-sm text-gray-300
                  leading-relaxed font-mono resize-none outline-none"
              />
            ) : (
              <pre className="p-6 text-sm text-gray-300 leading-relaxed overflow-x-auto
                whitespace-pre-wrap font-mono min-h-[70vh]">
                {savedReadme}
              </pre>
            )}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-xs text-gray-600">
              {savedReadme.split(/\s+/).filter(Boolean).length} words · {savedReadme.length} chars
            </span>
            {mode === "edit" && (
              <div className="flex items-center gap-3">
                <button onClick={handleDiscard}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Discard
                </button>
                <button onClick={handleSave}
                  className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors flex items-center gap-1">
                  <SaveIcon className="w-3 h-3" />
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}