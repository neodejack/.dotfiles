export interface SessionResult {
  id: string;
  path: string;
  cwd: string;
  name?: string;
  created: string;
  modified: string;
  messageCount: number;
  matchedSnippet?: string;
  score?: number;
  matchMode: "all" | "any" | "browse";
  matchedType: string | null;
  matchedEntryId: string | null;
  matchedAt: string | null;
}

export interface SessionRef {
  id: string;
  name: string;
  cwd: string;
  created: string;
  modified: string;
}

export interface SearchOptions {
  query?: string;
  cwd?: string;
  after?: string;
  before?: string;
  limit?: number;
}

export interface ListOptions {
  cwd: string;
  limit?: number;
  depth?: number;
}
