export type Tone = "professional" | "casual" | "minimal";

export interface Repo {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  url: string;
  private: boolean;
  updatedAt: string;
}

export interface GenerateResult {
  readme: string;
  repoName: string;
  repoUrl: string;
  description: string;
}

export interface ReadmeRecord {
  id: string;
  repo_url: string;
  repo_name: string;
  description: string;
  readme: string;
  tone: string;
  created_at: string;
}