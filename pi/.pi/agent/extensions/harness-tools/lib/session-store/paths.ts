import { isAbsolute, join, relative, resolve } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

export function getSessionsDir(): string {
  return join(getAgentDir(), "sessions");
}

export function encodeCwd(cwd: string): string {
  const resolved = resolve(cwd);
  const stripped = resolved.replace(/^[/\\]/, "");
  return `--${stripped.replace(/[/\\]/g, "-")}--`;
}

export function decodeCwd(encoded: string): string {
  const stripped = encoded.replace(/^--/, "").replace(/--$/, "");
  return `/${stripped.replace(/-/g, "/")}`;
}

export function isInSessionsDir(path: string): boolean {
  const absolutePath = resolve(path);
  const rel = relative(getSessionsDir(), absolutePath);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}
