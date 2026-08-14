import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import {
  listSessions,
  type SessionResult,
} from "../../lib/session-store";

const ListSessionsParams = Type.Object({
  cwd: Type.String({ description: "Directory to list sessions for" }),
  limit: Type.Optional(
    Type.Integer({
      description: "Maximum number of sessions to return (default: 20)",
      minimum: 1,
      maximum: 100,
    }),
  ),
  depth: Type.Optional(
    Type.Integer({
      description:
        "How many levels of child directories to include (default: 0, exact match only)",
      minimum: 0,
      maximum: 5,
    }),
  ),
});

interface ListSessionsDetails {
  cwd: string;
  limit: number;
  depth: number;
  resultCount: number;
  results: SessionResult[];
}

export const listSessionsTool = defineTool({
  name: "list_sessions",
  label: "List Sessions",
  description: `Browse recent Pi coding sessions for a directory.

Use this to see sessions associated with an exact project directory, optionally including a bounded number of child-directory levels. Results are newest first. Use find_sessions for keyword search and read_session to establish historical evidence.`,
  promptSnippet:
    "Browse recent sessions for an exact directory or bounded child depth",
  promptGuidelines: [
    "list_sessions: Use to browse recent sessions for a specific directory without keyword search.",
    "list_sessions: Keep depth at 0 unless child projects are relevant.",
    "list_sessions: Use read_session after selecting a session; do not infer content from metadata.",
    "list_sessions: Use find_sessions instead for keyword search.",
  ],
  parameters: ListSessionsParams,

  async execute(_toolCallId, params) {
    const limit = params.limit ?? 20;
    const depth = params.depth ?? 0;
    const results = listSessions({ cwd: params.cwd, limit, depth });
    const details: ListSessionsDetails = {
      cwd: params.cwd,
      limit,
      depth,
      resultCount: results.length,
      results,
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(details) }],
      details,
    };
  },

  renderCall(args, theme) {
    return new Text(
      `${theme.fg("toolTitle", theme.bold("list_sessions"))} ${theme.fg("accent", args.cwd)}`,
      0,
      0,
    );
  },

  renderResult(
    result,
    { isPartial },
    theme,
  ) {
    if (isPartial) return new Text(theme.fg("muted", "loading…"), 0, 0);
    const details = result.details as ListSessionsDetails | undefined;
    if (!details) return new Text(theme.fg("error", "Listing failed"), 0, 0);
    if (details.results.length === 0) {
      return new Text(theme.fg("muted", "No sessions for this directory"), 0, 0);
    }
    const lines = details.results.map((session) => {
      const date = (session.modified || session.created).slice(0, 10);
      return `${theme.fg("success", "•")} ${theme.fg("accent", session.id.slice(0, 8))} ${theme.fg("muted", date)} ${session.name || "(untitled)"} ${theme.fg("muted", `(${session.messageCount} msgs)`)}`;
    });
    return new Text(lines.join("\n"), 0, 0);
  },
});

export default function registerListSessions(pi: ExtensionAPI): void {
  pi.registerTool(listSessionsTool);
}
