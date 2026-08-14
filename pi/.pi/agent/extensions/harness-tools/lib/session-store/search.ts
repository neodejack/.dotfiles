import { resolve } from "node:path";
import {
  parseRelativeDate,
  type SearchOptions as SesameSearchOptions,
  type SearchResult as SesameSearchResult,
  search,
} from "@aliou/sesame";
import { getDb } from "./db";
import type {
  ListOptions,
  SearchOptions,
  SessionRef,
  SessionResult,
} from "./types";

function toSesameDate(input?: string): string | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input;
  const parsed = parseRelativeDate(input);
  if (!parsed) return undefined;
  return parsed.length >= 10 ? parsed.slice(0, 10) : parsed;
}

function toSesameOptions(options: SearchOptions): SesameSearchOptions {
  return {
    cwd: options.cwd,
    after: toSesameDate(options.after),
    before: toSesameDate(options.before),
    limit: options.limit,
  };
}

function toSessionResult(result: SesameSearchResult): SessionResult {
  return {
    id: result.sessionId,
    path: result.path,
    cwd: result.cwd ?? "",
    name: result.name ?? undefined,
    created: result.createdAt ?? result.modifiedAt ?? "",
    modified: result.modifiedAt ?? result.createdAt ?? "",
    messageCount: 0,
    matchedSnippet: result.matchedSnippet || undefined,
    score: result.score || undefined,
    matchMode: result.matchMode,
    matchedType: result.matchedType,
    matchedEntryId: result.matchedEntryId,
    matchedAt: result.matchedAt,
  };
}

function fillMessageCounts(results: SessionResult[]): void {
  if (results.length === 0) return;
  const placeholders = results.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT id, message_count FROM sessions WHERE id IN (${placeholders})`,
    )
    .all(...results.map((result) => result.id)) as Array<{
    id: string;
    message_count: number;
  }>;
  const counts = new Map(rows.map((row) => [row.id, row.message_count]));
  for (const result of results) {
    result.messageCount = counts.get(result.id) ?? 0;
  }
}

export function searchSessions(options: SearchOptions): SessionResult[] {
  const results = search(getDb(), options.query, toSesameOptions(options)).map(
    toSessionResult,
  );
  fillMessageCounts(results);
  return results;
}

type SessionRow = {
  id: string;
  path: string;
  cwd: string | null;
  name: string | null;
  created_at: string | null;
  modified_at: string | null;
  message_count: number;
};

function browseResult(row: SessionRow): SessionResult {
  return {
    id: row.id,
    path: row.path,
    cwd: row.cwd ?? "",
    name: row.name ?? undefined,
    created: row.created_at ?? row.modified_at ?? "",
    modified: row.modified_at ?? row.created_at ?? "",
    messageCount: row.message_count ?? 0,
    matchMode: "browse",
    matchedType: null,
    matchedEntryId: null,
    matchedAt: null,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function listSessions(options: ListOptions): SessionResult[] {
  const { limit = 20, depth = 0 } = options;
  const cwd = resolve(options.cwd);
  if (depth === 0) {
    const rows = getDb()
      .prepare(
        `SELECT id, path, cwd, name, created_at, modified_at, message_count
         FROM sessions WHERE cwd = ? ORDER BY modified_at DESC LIMIT ?`,
      )
      .all(cwd, limit) as SessionRow[];
    return rows.map(browseResult);
  }

  const prefix = `${cwd}/`;
  const rows = getDb()
    .prepare(
      `SELECT id, path, cwd, name, created_at, modified_at, message_count
       FROM sessions
       WHERE cwd = ? OR cwd LIKE ? ESCAPE '\\'
       ORDER BY modified_at DESC LIMIT ?`,
    )
    .all(cwd, `${escapeLike(prefix)}%`, limit * 4) as SessionRow[];
  return rows
    .filter((row) => {
      if (!row.cwd) return false;
      if (row.cwd === cwd) return true;
      const relative = row.cwd.slice(prefix.length);
      return relative.length > 0 && relative.split("/").length <= depth;
    })
    .slice(0, limit)
    .map(browseResult);
}

export function resolveSessionRef(sessionId: string): SessionRef | null {
  const row = getDb()
    .prepare(
      `SELECT id, cwd, name, created_at, modified_at
       FROM sessions WHERE id = ?`,
    )
    .get(sessionId) as
    | {
        id: string;
        cwd: string | null;
        name: string | null;
        created_at: string | null;
        modified_at: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || "(untitled)",
    cwd: row.cwd || "",
    created: row.created_at || "",
    modified: row.modified_at || "",
  };
}

export function resolveSessionPathById(
  sessionIdOrPrefix: string,
): { id: string; path: string } {
  const exact = getDb()
    .prepare("SELECT id, path FROM sessions WHERE id = ?")
    .get(sessionIdOrPrefix) as { id: string; path: string } | undefined;
  if (exact) return exact;

  const matches = getDb()
    .prepare(
      `SELECT id, path FROM sessions
       WHERE id LIKE ? ESCAPE '\\'
       ORDER BY modified_at DESC LIMIT 2`,
    )
    .all(`${escapeLike(sessionIdOrPrefix)}%`) as Array<{
      id: string;
      path: string;
    }>;
  if (matches.length === 0) {
    throw new Error(`No session found with id matching '${sessionIdOrPrefix}'`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous session id '${sessionIdOrPrefix}'. Provide a longer prefix.`,
    );
  }
  return matches[0] as { id: string; path: string };
}
