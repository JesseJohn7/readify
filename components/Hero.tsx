"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RepoList from "@/components/RepoList";
import { Repo, Tone } from "@/types";

const tones: Tone[] = ["professional", "casual", "minimal"];

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
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, tone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      sessionStorage.setItem("readify_result", JSON.stringify(data));
      router.push("/generate");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="w-full flex items-center justify-center min-h-screen px-4
      bg-gradient-to-b from-white to-gray-100
      dark:from-black dark:to-gray-900">

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

        {/* URL input box */}
        {!selected && (
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
                  ? "Private repos supported"
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
          className="mt-4 w-full max-w-xl mx-auto block bg-indigo-600 hover:bg-indigo-700
            disabled:opacity-40 disabled:cursor-not-allowed
            text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {generating
            ? "Generating..."
            : !user
            ? "Sign in & Generate →"
            : "Generate README →"}
        </button>

        {error && (
          <p className="mt-3 text-red-400 text-sm">{error}</p>
        )}

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

      </main>
    </section>
  );
}