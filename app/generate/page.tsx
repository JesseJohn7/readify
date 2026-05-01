"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReadmeOutput from "@/components/ReadmeOutput";
import { GenerateResult } from "@/types";

export default function GeneratePage() {
  const [data, setData] = useState<GenerateResult | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("readify_result");
    if (!stored) { router.push("/"); return; }
    setData(JSON.parse(stored));
  }, []);

  if (!data) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10 max-w-4xl mx-auto">
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-400 hover:text-white transition-colors mb-8 block"
      >
        ← Generate another
      </button>
      <ReadmeOutput
        readme={data.readme}
        repoName={data.repoName}
        description={data.description}
      />
    </main>
  );
}