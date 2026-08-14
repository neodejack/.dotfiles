import { homedir } from "node:os";
import { isAbsolute, join, relative } from "node:path";

export function collapseHomePath(path: string): string {
  const home = homedir();
  if (home && path.startsWith(home)) return `~${path.slice(home.length)}`;
  return path;
}

export function formatDisplayPath(path: string, cwd: string): string {
  if (!path) return path;
  const abs = isAbsolute(path) ? path : join(cwd, path);
  const rel = relative(cwd, abs);
  if (rel === "") return ".";
  if (!rel.startsWith("..") && !isAbsolute(rel)) return rel;
  return collapseHomePath(abs);
}
