import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import {
  type SearchOptions,
  type SessionResult,
  searchSessions,
} from "../../lib/session-store";

const FindSessionsParams = Type.Object({
  query: Type.Optional(
    Type.String({
      description:
        "Keyword to search for in sessions. Omit to browse recent sessions.",
    }),
  ),
  cwd: Type.Optional(
    Type.String({ description: "Filter to sessions from this working directory" }),
  ),
  after: Type.Optional(
    Type.String({
      description:
        "Filter to sessions modified after this date (ISO or relative: '7d', '2w', '1m')",
    }),
  ),
  before: Type.Optional(
    Type.String({
      description:
        "Filter to sessions modified before this date (ISO or relative: '7d', '2w', '1m')",
    }),
  ),
  limit: Type.Optional(
    Type.Integer({
      description: "Maximum number of sessions to return (default: 10)",
      minimum: 1,
      maximum: 100,
    }),
  ),
});

interface FindSessionsDetails {
  query?: string;
  filters: { cwd?: string; after?: string; before?: string; limit: number };
  resultCount: number;
  results: SessionResult[];
}

export const findSessionsTool = defineTool({
  name: "find_sessions",
  label: "Find Sessions",
  description: `Search or browse past Pi coding sessions.

Use this to locate previous sessions by topic, title, checkpoint, date, or project. Omit query to browse recent sessions. Results include discovery metadata and match provenance, not complete session evidence. Inspect a selected session with read_session before making claims about its contents. Do not use for the current session or general codebase search.`,
  promptSnippet:
    "Search or browse past sessions by topic, title, checkpoint, date, or project",
  promptGuidelines: [
    "find_sessions: Use when the user asks to find or browse previous sessions by topic, title, checkpoint, date, project, or recent activity.",
    "find_sessions: Omit query to browse recent sessions; use a focused query for a known topic.",
    "find_sessions: Treat snippets as discovery metadata and use read_session for historical evidence.",
    "find_sessions: Do not use for the current session or general codebase search.",
  ],
  parameters: FindSessionsParams,

  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
    const query = params.query?.trim() || undefined;
    const requestedLimit = params.limit ?? 10;
    const searchOptions: SearchOptions = {
      query,
      cwd: params.cwd,
      after: params.after,
      before: params.before,
      // Fetch one extra because the current session is removed below.
      limit: Math.min(100, requestedLimit + 1),
    };
    const currentSessionId = ctx.sessionManager.getSessionId();
    const results = searchSessions(searchOptions)
      .filter((result) => result.id !== currentSessionId)
      .slice(0, requestedLimit);
    const filters = {
      cwd: params.cwd,
      after: params.after,
      before: params.before,
      limit: requestedLimit,
    };
    const payload = { query, resultCount: results.length, results };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      details: { ...payload, filters } satisfies FindSessionsDetails,
    };
  },

  renderCall(args, theme) {
    const target = args.query?.trim() || "recent sessions";
    return new Text(
      `${theme.fg("toolTitle", theme.bold("find_sessions"))} ${theme.fg("accent", target)}`,
      0,
      0,
    );
  },

  renderResult(
    result,
    { isPartial },
    theme,
  ) {
    if (isPartial) return new Text(theme.fg("muted", "searching…"), 0, 0);
    const details = result.details as FindSessionsDetails | undefined;
    if (!details) return new Text(theme.fg("error", "Search failed"), 0, 0);
    if (details.results.length === 0) {
      return new Text(theme.fg("muted", "No matching sessions"), 0, 0);
    }
    const lines = details.results.map((session) => {
      const date = (session.modified || session.created).slice(0, 10);
      return `${theme.fg("success", "•")} ${theme.fg("accent", session.id.slice(0, 8))} ${theme.fg("muted", date)} ${session.name || "(untitled)"} ${theme.fg("muted", `(${session.messageCount} msgs)`)}`;
    });
    return new Text(lines.join("\n"), 0, 0);
  },
});

export default function registerFindSessions(pi: ExtensionAPI): void {
  pi.registerTool(findSessionsTool);
}
