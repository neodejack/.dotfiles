import { StringEnum } from "@earendil-works/pi-ai";
import {
  defineTool,
  SessionManager,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
  compactEntry,
  createSessionViewFromSession,
  findEntries,
  flattenTree,
  getBranchEntries,
  getCheckpoints,
  getEntriesBetween,
  getTreeOutline,
  readCheckpoint,
  readEntry,
} from "../../lib/session-tools";

const withView = <T>(path: string, run: (sm: SessionManager) => T): T =>
  run(SessionManager.open(path));

const jsonResult = (value: unknown, details: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  details,
});

export function createSessionQueryTools(targetPath: string): ToolDefinition[] {
  const overview = defineTool({
    name: "get_session_overview",
    label: "Get Session Overview",
    description: "Get compact session metadata. Does not return full message content.",
    parameters: Type.Object({}),
    execute: async () => withView(targetPath, (sm) => {
      const view = createSessionViewFromSession(sm);
      const tree = view.getTree();
      const mainLeaf = view.mainLeafId ? view.getEntry(view.mainLeafId) : undefined;
      const mainBranchIds = view.getMainBranchIds();
      const leaves = flattenTree(tree).filter(
        (entry) => view.getChildren(entry.id).length === 0,
      );
      const result = {
        id: sm.getSessionId(),
        cwd: sm.getCwd(),
        name: sm.getSessionName(),
        created: sm.getHeader()?.timestamp,
        currentLeafId: sm.getLeafId(),
        mainLeafId: view.mainLeafId,
        mainLeafPreview: mainLeaf
          ? compactEntry(
              mainLeaf,
              view.getLabel(mainLeaf.id),
              view.getChildren(mainLeaf.id).length,
              mainBranchIds.has(mainLeaf.id),
            )
          : undefined,
        entryCount: view.entries.length,
        messageCount: view.entries.filter(
          (entry) => entry.type === "message" || entry.type === "custom_message",
        ).length,
        compactionCount: view.entries.filter((entry) => entry.type === "compaction").length,
        branchCount: leaves.length,
        labelCount: view.entries.filter(
          (entry) => entry.type === "label" && Boolean(view.getLabel(entry.targetId)),
        ).length,
      };
      return jsonResult(result, { overview: result });
    }),
  });

  const branch = defineTool({
    name: "get_branch_entries",
    label: "Get Branch Entries",
    description: "Get bounded compact previews from the main branch or a branch leaf.",
    parameters: Type.Object({
      leafId: Type.Optional(Type.String()),
      fromEnd: Type.Optional(Type.Boolean()),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
      types: Type.Optional(Type.Array(Type.String())),
      roles: Type.Optional(Type.Array(Type.String())),
    }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = getBranchEntries(createSessionViewFromSession(sm), params);
      return jsonResult(result.entries, result);
    }),
  });

  const between = defineTool({
    name: "get_entries_between",
    label: "Get Entries Between",
    description: "Get bounded compact entries between two ids on one branch.",
    parameters: Type.Object({
      startId: Type.String(),
      endId: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
      fromEnd: Type.Optional(Type.Boolean()),
      types: Type.Optional(Type.Array(Type.String())),
      roles: Type.Optional(Type.Array(Type.String())),
    }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = getEntriesBetween(createSessionViewFromSession(sm), params);
      return jsonResult(result.entries, result);
    }),
  });

  const entry = defineTool({
    name: "read_entry",
    label: "Read Entry",
    description: "Read exactly one entry by id; content is bounded and may be truncated.",
    parameters: Type.Object({
      id: Type.String(),
      maxChars: Type.Optional(Type.Integer({ minimum: 1, maximum: 100_000 })),
    }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = readEntry(createSessionViewFromSession(sm), params);
      return jsonResult(result.entry, result);
    }),
  });

  const checkpoints = defineTool({
    name: "get_checkpoints",
    label: "Get Checkpoints",
    description: "List bounded compaction and branch-summary checkpoint previews.",
    parameters: Type.Object({
      fromEnd: Type.Optional(Type.Boolean()),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
    }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = getCheckpoints(createSessionViewFromSession(sm), params);
      return jsonResult(result.checkpoints, result);
    }),
  });

  const checkpoint = defineTool({
    name: "read_checkpoint",
    label: "Read Checkpoint",
    description: "Read the full summary for one compaction or branch-summary checkpoint.",
    parameters: Type.Object({ id: Type.String() }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = readCheckpoint(createSessionViewFromSession(sm), params);
      return jsonResult(result.checkpoint, result);
    }),
  });

  const find = defineTool({
    name: "find_entries",
    label: "Find Entries",
    description: "Search session text and return bounded matching ids and snippets.",
    parameters: Type.Object({
      query: Type.String(),
      scope: Type.Optional(StringEnum(["main_branch", "full_tree"] as const)),
      leafId: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
    }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = findEntries(createSessionViewFromSession(sm), params);
      return jsonResult(result.matches, result);
    }),
  });

  const labels = defineTool({
    name: "get_labels",
    label: "Get Labels",
    description: "Get active labels with compact target previews.",
    parameters: Type.Object({}),
    execute: async () => withView(targetPath, (sm) => {
      const view = createSessionViewFromSession(sm);
      const mainBranchIds = view.getMainBranchIds();
      const seen = new Set<string>();
      const result = view.entries
        .filter((item) => item.type === "label")
        .map((item) => item.targetId)
        .filter((id) => {
          if (seen.has(id) || !view.getLabel(id)) return false;
          seen.add(id);
          return true;
        })
        .map((id) => {
          const target = view.getEntry(id);
          return {
            targetId: id,
            label: view.getLabel(id),
            target: target
              ? compactEntry(
                  target,
                  view.getLabel(id),
                  view.getChildren(id).length,
                  mainBranchIds.has(id),
                )
              : undefined,
          };
        });
      return jsonResult(result, { labels: result });
    }),
  });

  const tree = defineTool({
    name: "get_tree_outline",
    label: "Get Tree Outline",
    description: "Get a bounded flat outline of the session tree with previews.",
    parameters: Type.Object({
      rootId: Type.Optional(Type.String()),
      maxDepth: Type.Optional(Type.Integer({ minimum: 0, maximum: 20 })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
      mainBranchOnly: Type.Optional(Type.Boolean()),
      fromEnd: Type.Optional(Type.Boolean()),
    }),
    execute: async (_id, params) => withView(targetPath, (sm) => {
      const result = getTreeOutline(createSessionViewFromSession(sm), params);
      return jsonResult(result.entries, result);
    }),
  });

  return [overview, branch, between, entry, checkpoints, checkpoint, find, labels, tree];
}
