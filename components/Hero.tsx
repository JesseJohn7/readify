"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RepoList from "@/components/RepoList";
import { Repo, Tone } from "@/types";

const tones: Tone[] = ["professional", "casual", "minimal"];

export default function HeroInput() {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session) loadRepos();
      else { setRepos([]); setSelected(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRepos() {
    setLoadingRepos(true);
    const res = await fetch("/api/repos");
    const data = await res.json();
    setRepos(data.repos || []);
    setLoadingRepos(false);
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
    setUser(null);
    setRepos([]);
    setSelected(null);
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

        {/* Nav */}
        <div className="flex items-center justify-between mb-12">
          <span className="text-xl font-bold text-gray-900 dark:text-white">Readify</span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => router.push("/history")}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  History
                </button>
                <img
                  src={user.user_metadata?.avatar_url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGitHub}
                className="flex items-center gap-2 bg-gray-900 dark:bg-white dark:text-black text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Sign in with GitHub
              </button>
            )}
          </div>
        </div>

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
              <p className="text-sm text-gray-400 text-center py-4">Loading your repos...</p>
            ) : (
              <RepoList
                repos={repos}
                selected={selected}
                onSelect={(r) => { setSelected(r); setMessage(""); }}
              />
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

        {/* Input box */}
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
              placeholder={user ? "Or paste a GitHub URL here..." : "https://github.com/username/repo"}
              rows={3}
            />

            <div className="flex justify-between items-center px-3 pb-3 pt-2">
              <p className="text-xs text-gray-500">
                {user ? "Private repos supported" : "Sign in to access private repos"}
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

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={generating || (!selected && !message.trim())}
          className="mt-4 w-full max-w-xl mx-auto block bg-indigo-600 hover:bg-indigo-700
            disabled:opacity-40 disabled:cursor-not-allowed
            text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {generating ? "Generating..." : !user ? "Sign in & Generate →" : "Generate README →"}
        </button>

        {error && (
          <p className="mt-3 text-red-400 text-sm">{error}</p>
        )}

        {/* Guest nudge */}
        {!user && (
          <p className="mt-4 text-sm text-gray-400">
            <button onClick={signInWithGitHub} className="text-indigo-400 hover:underline">
              Sign in with GitHub
            </button>{" "}
            to browse your repos and save history.
          </p>
        )}

      </main>
    </section>
  );
}