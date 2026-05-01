"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
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
    router.push("/");
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
      px-6 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md
      border-b border-gray-200 dark:border-gray-800">

      <span
        onClick={() => router.push("/")}
        className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer"
      >
        Readify
      </span>

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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user.user_metadata?.full_name?.split(" ")[0]}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <button
            onClick={signIn}
            className="flex items-center gap-2 bg-gray-900 dark:bg-white
              dark:text-black text-white text-sm px-4 py-2 rounded-lg
              hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        )}
      </div>
    </nav>
  );
}