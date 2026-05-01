"use client";
import { useState } from "react";

interface Props {
  readme: string;
  repoName: string;
  description: string;
}

export default function ReadmeOutput({ readme, repoName, description }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([readme], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "README.md";
    a.click();
  }

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">{repoName}</h1>
        <p className="text-indigo-400 text-sm mt-1">{description}</p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">README.md</span>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            onClick={download}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
          >
            Download .md
          </button>
        </div>
      </div>

      <textarea
        readOnly
        value={readme}
        className="w-full h-[600px] bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm font-mono text-gray-200 resize-none focus:outline-none"
      />
    </div>
  );
}