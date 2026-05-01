const BASE = "https://api.github.com";

function headers(token?: string) {
  return {
    Accept: "application/vnd.github.v3+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const clean = url.trim().replace(/\.git$/, "");
  const match = clean.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export async function fetchUserRepos(token: string) {
  const res = await fetch(`${BASE}/user/repos?sort=updated&per_page=20&type=all`, {
    headers: headers(token),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((r: any) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    url: r.html_url,
    private: r.private,
    updatedAt: r.updated_at,
  }));
}

export async function fetchFile(owner: string, repo: string, path: string, token?: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: headers(token),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.encoding === "base64")
      return Buffer.from(data.content, "base64").toString("utf-8");
    return null;
  } catch { return null; }
}

export async function fetchTree(owner: string, repo: string, token?: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
      headers: headers(token),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tree?.map((f: { path: string }) => f.path) || [];
  } catch { return []; }
}

export async function fetchRepoData(owner: string, repo: string, token?: string) {
  const [packageJson, envExample, tree] = await Promise.all([
    fetchFile(owner, repo, "package.json", token),
    fetchFile(owner, repo, ".env.example", token),
    fetchTree(owner, repo, token),
  ]);

  const entryPaths = [
    "app/page.tsx", "src/app/page.tsx",
    "index.ts", "index.js",
    "src/index.ts", "src/index.js",
  ];

  let entryFile: string | null = null;
  for (const p of entryPaths) {
    if (tree.includes(p)) {
      entryFile = await fetchFile(owner, repo, p, token);
      if (entryFile) break;
    }
  }

  const folderStructure = [...new Set(tree.map((p) => p.split("/")[0]))]
    .filter((p) => !p.startsWith("."))
    .join("\n");

  return { packageJson, envExample, entryFile, folderStructure };
}