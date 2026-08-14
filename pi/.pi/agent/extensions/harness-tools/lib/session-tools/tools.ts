import {
  compactEntry,
  entryRole,
  entrySearchText,
  fullEntryContent,
  truncate,
} from "./content";
import type { SessionEntry, SessionTreeNode, SessionView } from "./types";

const MAX_LIMIT = 500;
const boundedLimit = (limit: number | undefined, fallback: number): number =>
  Math.min(Math.max(1, limit ?? fallback), MAX_LIMIT);

const passesFilters = (
  entry: SessionEntry,
  types?: string[],
  roles?: string[],
): boolean => {
  if (types?.length && !types.includes(entry.type)) return false;
  if (roles?.length) {
    const role = entryRole(entry);
    if (!role || !roles.includes(role)) return false;
  }
  return true;
};

const isCheckpoint = (
  entry: SessionEntry,
): entry is Extract<SessionEntry, { type: "compaction" | "branch_summary" }> =>
  entry.type === "compaction" || entry.type === "branch_summary";

const snippetFor = (text: string, query: string): string => {
  const normalized = text.replace(/\s+/g, " ").trim();
  const index = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return normalized.slice(0, 180);
  const start = Math.max(0, index - 60);
  const end = Math.min(normalized.length, index + query.length + 120);
  return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
};

export function getBranchEntries(
  view: SessionView,
  params: {
    leafId?: string;
    fromEnd?: boolean;
    limit?: number;
    types?: string[];
    roles?: string[];
  },
) {
  const limit = boundedLimit(params.limit, 100);
  let entries = view.getBranch(params.leafId);
  const totalBeforeFilters = entries.length;
  if (!params.fromEnd) entries = [...entries].reverse();
  entries = entries
    .filter((entry) => passesFilters(entry, params.types, params.roles))
    .slice(0, limit);
  const mainBranchIds = view.getMainBranchIds();
  return {
    entries: entries.map((entry) =>
      compactEntry(
        entry,
        view.getLabel(entry.id),
        view.getChildren(entry.id).length,
        mainBranchIds.has(entry.id),
      )
    ),
    truncated: totalBeforeFilters > limit,
    limit,
    branchLeafId: params.leafId ?? view.mainLeafId,
  };
}

export function readEntry(
  view: SessionView,
  params: { id: string; maxChars?: number },
) {
  const entry = view.getEntry(params.id);
  if (!entry) throw new Error(`No entry found with id '${params.id}'`);
  const maxChars = Math.min(Math.max(1, params.maxChars ?? 20_000), 100_000);
  const serialized = JSON.stringify(fullEntryContent(entry));
  const contentTruncated = serialized.length > maxChars;
  const mainBranchIds = view.getMainBranchIds();
  return {
    entry: {
      ...compactEntry(
        entry,
        view.getLabel(entry.id),
        view.getChildren(entry.id).length,
        mainBranchIds.has(entry.id),
      ),
      childrenIds: view.getChildren(entry.id).map((child) => child.id),
      content: contentTruncated
        ? `${serialized.slice(0, maxChars - 1)}…`
        : serialized,
      contentEncoding: "json-string" as const,
      contentTruncated,
      contentLength: serialized.length,
      maxChars,
    },
  };
}

export function findEntries(
  view: SessionView,
  params: {
    query: string;
    scope?: "main_branch" | "full_tree";
    leafId?: string;
    limit?: number;
  },
) {
  const entries = params.scope === "full_tree"
    ? view.entries
    : view.getBranch(params.leafId);
  const mainBranchIds = view.getMainBranchIds();
  const limit = boundedLimit(params.limit, 20);
  const matches = entries
    .map((entry) => ({ entry, text: entrySearchText(entry) }))
    .filter(({ text }) => text.toLowerCase().includes(params.query.toLowerCase()))
    .slice(0, limit)
    .map(({ entry, text }) => ({
      ...compactEntry(
        entry,
        view.getLabel(entry.id),
        view.getChildren(entry.id).length,
        mainBranchIds.has(entry.id),
      ),
      snippet: snippetFor(text, params.query),
    }));
  return { matches, limit };
}

export function getEntriesBetween(
  view: SessionView,
  params: {
    startId: string;
    endId?: string;
    limit?: number;
    fromEnd?: boolean;
    types?: string[];
    roles?: string[];
  },
) {
  const endId = params.endId ?? view.mainLeafId;
  if (!endId) throw new Error("Session has no main leaf");
  if (!view.getEntry(endId)) throw new Error(`No entry found with id '${endId}'`);
  const branch = view.getBranch(endId).reverse();
  const startIndex = branch.findIndex((entry) => entry.id === params.startId);
  if (startIndex < 0) {
    throw new Error(`Start entry '${params.startId}' is not on branch '${endId}'`);
  }
  const endIndex = branch.findIndex((entry) => entry.id === endId);
  const limit = boundedLimit(params.limit, 100);
  let entries = branch
    .slice(startIndex, endIndex + 1)
    .filter((entry) => passesFilters(entry, params.types, params.roles));
  const total = entries.length;
  if (params.fromEnd) entries = [...entries].reverse();
  entries = entries.slice(0, limit);
  const mainBranchIds = view.getMainBranchIds();
  return {
    entries: entries.map((entry) =>
      compactEntry(
        entry,
        view.getLabel(entry.id),
        view.getChildren(entry.id).length,
        mainBranchIds.has(entry.id),
      )
    ),
    truncated: total > limit,
    limit,
    branchLeafId: endId,
  };
}

const findNode = (
  roots: SessionTreeNode[],
  id: string,
): SessionTreeNode | undefined => {
  const stack = [...roots];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.entry.id === id) return node;
    for (const child of node.children) stack.push(child);
  }
  return undefined;
};

export function getTreeOutline(
  view: SessionView,
  params: {
    rootId?: string;
    maxDepth?: number;
    limit?: number;
    mainBranchOnly?: boolean;
    fromEnd?: boolean;
  },
) {
  const mainBranch = view.getBranch();
  const mainBranchIds = new Set(mainBranch.map((entry) => entry.id));
  const limit = boundedLimit(params.limit, 200);
  const maxDepth = Math.max(0, params.maxDepth ?? 4);
  if (params.mainBranchOnly) {
    const entries = params.fromEnd
      ? mainBranch.slice(0, limit)
      : [...mainBranch].reverse().slice(0, limit);
    return {
      entries: entries.map((entry, depth) => ({
        ...compactEntry(
          entry,
          view.getLabel(entry.id),
          view.getChildren(entry.id).length,
          true,
        ),
        depth,
        childrenIds: view.getChildren(entry.id).map((child) => child.id),
        truncatedChildren: 0,
      })),
      truncated: mainBranch.length > limit,
      limit,
      maxDepth,
    };
  }
  const roots = view.getTree();
  const startNodes = params.rootId
    ? (() => {
        const node = findNode(roots, params.rootId);
        if (!node) throw new Error(`No entry found with id '${params.rootId}'`);
        return [node];
      })()
    : roots;
  const entries: Array<Record<string, unknown>> = [];
  const stack = [...startNodes].reverse().map((node) => ({ node, depth: 0 }));
  while (stack.length > 0 && entries.length < limit) {
    const item = stack.pop();
    if (!item) continue;
    const { node, depth } = item;
    const canExpand = depth < maxDepth;
    entries.push({
      ...compactEntry(
        node.entry,
        node.label ?? view.getLabel(node.entry.id),
        node.children.length,
        mainBranchIds.has(node.entry.id),
      ),
      depth,
      childrenIds: node.children.map((child) => child.entry.id),
      truncatedChildren: canExpand ? 0 : node.children.length,
    });
    if (canExpand) {
      for (const child of [...node.children].reverse()) {
        stack.push({ node: child, depth: depth + 1 });
      }
    }
  }
  return { entries, truncated: stack.length > 0, limit, maxDepth };
}

export function getCheckpoints(
  view: SessionView,
  params: { fromEnd?: boolean; limit?: number },
) {
  const limit = boundedLimit(params.limit, 100);
  let entries = view.entries.filter(isCheckpoint);
  if (params.fromEnd) entries = [...entries].reverse();
  entries = entries.slice(0, limit);
  const mainBranchIds = view.getMainBranchIds();
  return {
    checkpoints: entries.map((entry) => {
      const details = entry.details && typeof entry.details === "object"
        ? entry.details as { readFiles?: string[]; modifiedFiles?: string[] }
        : undefined;
      return {
        ...compactEntry(
          entry,
          view.getLabel(entry.id),
          view.getChildren(entry.id).length,
          mainBranchIds.has(entry.id),
        ),
        summaryPreview: truncate(entry.summary, 800),
        firstKeptEntryId: entry.type === "compaction" ? entry.firstKeptEntryId : undefined,
        fromId: entry.type === "branch_summary" ? entry.fromId : undefined,
        tokensBefore: entry.type === "compaction" ? entry.tokensBefore : undefined,
        readFiles: details?.readFiles?.slice(0, 20),
        modifiedFiles: details?.modifiedFiles?.slice(0, 20),
      };
    }),
    limit,
  };
}

export function readCheckpoint(view: SessionView, params: { id: string }) {
  const entry = view.getEntry(params.id);
  if (!entry) throw new Error(`No entry found with id '${params.id}'`);
  if (!isCheckpoint(entry)) throw new Error(`Entry '${params.id}' is not a checkpoint`);
  const mainBranchIds = view.getMainBranchIds();
  return {
    checkpoint: {
      ...compactEntry(
        entry,
        view.getLabel(entry.id),
        view.getChildren(entry.id).length,
        mainBranchIds.has(entry.id),
      ),
      firstKeptEntryId: entry.type === "compaction" ? entry.firstKeptEntryId : undefined,
      fromId: entry.type === "branch_summary" ? entry.fromId : undefined,
      tokensBefore: entry.type === "compaction" ? entry.tokensBefore : undefined,
      summary: entry.summary,
      details: entry.details,
    },
  };
}
