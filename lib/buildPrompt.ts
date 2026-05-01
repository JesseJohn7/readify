import { Tone } from "@/types";

const toneMap: Record<Tone, string> = {
  professional: "Professional and formal.",
  casual: "Friendly and casual, like a cool open source project.",
  minimal: "Minimal. Essential sections only. No fluff.",
};

interface PromptData {
  owner: string;
  repo: string;
  packageJson: string | null;
  envExample: string | null;
  entryFile: string | null;
  folderStructure: string;
  tone: Tone;
}

export function buildReadmePrompt(data: PromptData): string {
  return `
You are a senior developer writing a README.md file.
Tone: ${toneMap[data.tone]}
Repository: ${data.owner}/${data.repo}

package.json: ${data.packageJson || "Not available"}
.env.example: ${data.envExample || "Not found — skip env section"}
Entry file: ${data.entryFile?.slice(0, 600) || "Not found"}
Folder structure: ${data.folderStructure}

Write a complete README.md. Sections: project name + description, tech stack, getting started, usage, folder structure, license.
Return ONLY raw markdown. No code fences. No explanations.
`.trim();
}

export function buildDescriptionPrompt(owner: string, repo: string, packageJson: string | null): string {
  return `
Write one punchy sentence (max 15 words) describing this project: ${owner}/${repo}.
Context: ${packageJson?.slice(0, 300) || "No package.json"}
Return only the sentence. No quotes. No period.
`.trim();
}