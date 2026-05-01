"use client";
import { ReadmeRecord } from "@/types";
import { useRouter } from "next/navigation";

interface Props {
  history: ReadmeRecord[];
  onDelete: (id: string) => void;
}

export default function HistoryList({ history, onDelete }: Props) {
  const router = useRouter();

  function view(record: ReadmeRecord) {
    sessionStorage.setItem("readify_result", JSON.stringify({
      readme: record.readme,
      repoName: record.repo_name,
      repoUrl: record.repo_url,
      description: record.description,
    }));
    router.push("/generate");
  }

  if (history.length === 0) {
    return (
      <p className="text-gray-400 text-center py-10">
        No READMEs yet.{" "}
        <a href="/" className="text-indigo-400 hover:underline">Generate your first →</a>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((record) => (
        <div key={record.id} className="flex items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-xl">
          <div className="min-w-0">
            <p className="text-white font-medium truncate">{record.repo_name}</p>
            <p className="text-gray-400 text-xs mt-0.5 truncate">{record.description}</p>
            <p className="text-gray-500 text-xs mt-1">
              {new Date(record.created_at).toLocaleDateString()} · {record.tone}
            </p>
          </div>
          <div className="flex gap-3 ml-4 shrink-0">
            <button onClick={() => view(record)} className="text-sm text-indigo-400 hover:text-indigo-300">View</button>
            <button onClick={() => onDelete(record.id)} className="text-sm text-red-400 hover:text-red-300">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}