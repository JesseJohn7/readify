"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HistoryList from "@/components/HistoryList";
import { ReadmeRecord } from "@/types";

export default function HistoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const [history, setHistory] = useState<ReadmeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/"); return; }
      fetch("/api/history")
        .then((r) => r.json())
        .then((d) => setHistory(d.history || []))
        .finally(() => setLoading(false));
    });
  }, []);

  async function handleDelete(id: string) {
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your READMEs</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>
      {loading ? (
        <p className="text-gray-400 text-center py-10">Loading...</p>
      ) : (
        <HistoryList history={history} onDelete={handleDelete} />
      )}
    </main>
  );
}