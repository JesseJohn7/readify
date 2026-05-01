"use client";
import { Repo } from "@/types";

interface Props {
  repos: Repo[];
  selected: Repo | null;
  onSelect: (repo: Repo) => void;
}

export default function RepoList({ repos, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
      {repos.map((repo) => (
        <button
          key={repo.fullName}
          onClick={() => onSelect(repo)}
          className={`text-left p-3 rounded-xl border transition-all ${
            selected?.fullName === repo.fullName
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-white/40 dark:bg-white/5"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {repo.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {repo.private && (
                <span className="text-xs text-gray-400 border border-gray-600 px-1.5 rounded">
                  private
                </span>
              )}
              {repo.language && (
                <span className="text-xs text-indigo-400">{repo.language}</span>
              )}
            </div>
          </div>
          {repo.description && (
            <p className="text-xs text-gray-400 mt-1 truncate">{repo.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}