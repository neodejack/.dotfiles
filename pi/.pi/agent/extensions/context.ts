/**
 * /context
 *
 * A dotfiles-owned replacement for mitsupi's context extension. It retains
 * the context-window/resource overview and adds the complete information shown
 * by Pi 0.83.0's built-in /session command.
 *
 * The original context extension is available under the Apache-2.0 license:
 * https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/context.ts
 */

import path from "node:path";
import { homedir } from "node:os";
import {
  DynamicBorder,
  getAgentDir,
  loadProjectContextFiles,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
  type SessionEntry,
  type Theme,
  type ToolResultEvent,
} from "@earendil-works/pi-coding-agent";
import {
  Container,
  Key,
  Text,
  matchesKey,
  type Component,
  type TUI,
} from "@earendil-works/pi-tui";

const SKILL_LOADED_ENTRY = "context:skill_loaded";
const MCP_STATUS_EVENT = "pi-mcp-adapter/status/v1";
const TOOL_TOKEN_FUDGE = 1.5;
const CACHE_MISS_NOISE_FLOOR = 1024;

const MCP_SERVER_STATUSES = new Set([
  "connected",
  "cached",
  "failed",
  "needs-auth",
  "not-connected",
  "disabled",
] as const);

type UsageLike = {
  input?: unknown;
  output?: unknown;
  cacheRead?: unknown;
  cacheWrite?: unknown;
  cost?: unknown;
};

type TokenTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
};

type UsageTotals = Omit<TokenTotals, "total"> & {
  cost: number;
};

type UsageBreakdownEntry = {
  key: string;
  cost: number;
  tokens: number;
};

type CacheWaste = {
  missedTokens: number;
  missedCost: number;
  missCount: number;
};

type SessionStats = {
  name?: string;
  file?: string;
  id: string;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: TokenTotals;
  cost: number;
  usageBreakdown: UsageBreakdownEntry[];
  cacheWaste: CacheWaste;
};

type ContextUsageData = {
  messageTokens: number;
  contextWindow: number;
  effectiveTokens: number;
  percent: number;
  remainingTokens: number;
  systemPromptTokens: number;
  agentTokens: number;
  toolsTokens: number;
};

type ContextViewData = {
  usage: ContextUsageData | null;
  activeTools: string[];
  mcp: McpStatusSnapshot | null;
  agentFiles: string[];
  extensions: string[];
  skills: string[];
  loadedSkills: string[];
  session: SessionStats;
};

type McpServerRuntimeStatus =
  | "connected"
  | "cached"
  | "failed"
  | "needs-auth"
  | "not-connected"
  | "disabled";

type McpServerStatusSnapshot = {
  name: string;
  status: McpServerRuntimeStatus;
  toolCount: number;
  resourceCount?: number;
  failedAgoSeconds?: number;
  disabled: boolean;
};

type McpStatusSnapshot = {
  version: 1;
  servers: McpServerStatusSnapshot[];
  totalTools: number;
  totalResources: number;
  connectedCount: number;
  disabledCount: number;
};

type SkillIndexEntry = {
  name: string;
  skillFilePath: string;
  skillDir: string;
};

type SkillLoadedEntryData = {
  name: string;
  path: string;
};

type PreviousRequest = {
  promptTokens: number;
  timestamp: number;
  reportedCache: boolean;
};

function numeric(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : undefined;
}

function nonNegativeInteger(value: unknown): number {
  return Math.max(0, Math.round(numeric(value)));
}

export function parseMcpStatusSnapshot(value: unknown): McpStatusSnapshot | null {
  const snapshot = asRecord(value);
  if (snapshot?.version !== 1 || !Array.isArray(snapshot.servers)) {
    return null;
  }

  const servers: McpServerStatusSnapshot[] = [];
  for (const item of snapshot.servers) {
    const server = asRecord(item);
    if (
      !server
      || typeof server.name !== "string"
      || !MCP_SERVER_STATUSES.has(server.status as McpServerRuntimeStatus)
    ) {
      return null;
    }

    const status = server.status as McpServerRuntimeStatus;
    const resourceCount = server.resourceCount === undefined
      ? undefined
      : nonNegativeInteger(server.resourceCount);
    const failedAgoSeconds = server.failedAgoSeconds === undefined
      ? undefined
      : nonNegativeInteger(server.failedAgoSeconds);
    servers.push({
      name: server.name,
      status,
      toolCount: nonNegativeInteger(server.toolCount),
      ...(resourceCount !== undefined ? { resourceCount } : {}),
      ...(failedAgoSeconds !== undefined ? { failedAgoSeconds } : {}),
      disabled: server.disabled === true || status === "disabled",
    });
  }

  return {
    version: 1,
    servers,
    totalTools: servers.reduce((total, server) => total + (server.disabled ? 0 : server.toolCount), 0),
    totalResources: servers.reduce((total, server) => total + (server.disabled ? 0 : server.resourceCount ?? 0), 0),
    connectedCount: servers.filter((server) => !server.disabled && server.status === "connected").length,
    disabledCount: servers.filter((server) => server.disabled).length,
  };
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function mcpStatusLabel(server: McpServerStatusSnapshot): string {
  if (server.status === "failed" && server.failedAgoSeconds !== undefined) {
    return `failed ${server.failedAgoSeconds}s ago`;
  }
  return server.status;
}

function mcpSummary(snapshot: McpStatusSnapshot): string {
  const enabledCount = snapshot.servers.length - snapshot.disabledCount;
  const parts = [
    `${countLabel(enabledCount, "server")} enabled`,
    `${snapshot.connectedCount} connected`,
    countLabel(snapshot.totalTools, "tool"),
    countLabel(snapshot.totalResources, "resource"),
  ];
  if (snapshot.disabledCount > 0) {
    parts.push(`${snapshot.disabledCount} disabled`);
  }
  return parts.join(" · ");
}

function usageCost(usage: UsageLike | undefined): number {
  const cost = usage?.cost;
  if (typeof cost === "number" || typeof cost === "string") {
    return numeric(cost);
  }
  return numeric(asRecord(cost)?.total);
}

function usageCostPart(usage: UsageLike, part: string): number {
  return numeric(asRecord(usage.cost)?.[part]);
}

function createUsageTotals(): UsageTotals {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
  };
}

function addUsage(totals: UsageTotals, usage: UsageLike | undefined): void {
  if (!usage) {
    return;
  }
  totals.input += numeric(usage.input);
  totals.output += numeric(usage.output);
  totals.cacheRead += numeric(usage.cacheRead);
  totals.cacheWrite += numeric(usage.cacheWrite);
  totals.cost += usageCost(usage);
}

function estimateTextTokens(text: string): number {
  return Math.max(0, Math.ceil(text.length / 4));
}

function formatUsd(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) {
    return "$0.00";
  }
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  }
  if (cost >= 0.1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(4)}`;
}

function formatTokens(count: number): string {
  if (count < 1_000) {
    return count.toString();
  }
  if (count < 10_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  if (count < 1_000_000) {
    return `${Math.round(count / 1_000)}k`;
  }
  return `${(count / 1_000_000).toFixed(1)}M`;
}

function normalizeReadPath(inputPath: string, cwd: string): string {
  let resolvedPath = inputPath.startsWith("@")
    ? inputPath.slice(1)
    : inputPath;
  if (resolvedPath === "~") {
    resolvedPath = homedir();
  } else if (resolvedPath.startsWith("~/")) {
    resolvedPath = path.join(homedir(), resolvedPath.slice(2));
  }
  return path.resolve(cwd, resolvedPath);
}

function shortenPath(filePath: string, cwd: string): string {
  const resolvedPath = path.resolve(filePath);
  const resolvedCwd = path.resolve(cwd);
  if (resolvedPath === resolvedCwd) {
    return ".";
  }
  if (resolvedPath.startsWith(`${resolvedCwd}${path.sep}`)) {
    return `./${resolvedPath.slice(resolvedCwd.length + 1)}`;
  }
  if (resolvedPath === homedir()) {
    return "~";
  }
  if (resolvedPath.startsWith(`${homedir()}${path.sep}`)) {
    return `~/${resolvedPath.slice(homedir().length + 1)}`;
  }
  return resolvedPath;
}

function normalizeSkillName(name: string): string {
  return name.startsWith("skill:") ? name.slice("skill:".length) : name;
}

function buildSkillIndex(pi: ExtensionAPI, cwd: string): SkillIndexEntry[] {
  return pi.getCommands()
    .filter((command) => command.source === "skill")
    .map((command) => {
      const skillFilePath = command.sourceInfo?.path
        ? normalizeReadPath(command.sourceInfo.path, cwd)
        : "";
      return {
        name: normalizeSkillName(command.name),
        skillFilePath,
        skillDir: skillFilePath ? path.dirname(skillFilePath) : "",
      };
    })
    .filter((skill) => skill.name.length > 0 && skill.skillDir.length > 0);
}

function getLoadedSkills(ctx: ExtensionContext): Set<string> {
  const loaded = new Set<string>();
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type !== "custom" || entry.customType !== SKILL_LOADED_ENTRY) {
      continue;
    }
    const data = entry.data as SkillLoadedEntryData | undefined;
    if (data?.name) {
      loaded.add(data.name);
    }
  }
  return loaded;
}

function getUsageFromEntry(entry: SessionEntry): UsageLike | undefined {
  if ((entry.type === "compaction" || entry.type === "branch_summary") && entry.usage) {
    return entry.usage as UsageLike;
  }
  if (entry.type !== "message") {
    return undefined;
  }
  const message = entry.message as unknown as Record<string, unknown>;
  return asRecord(message.usage) as UsageLike | undefined;
}

function collectUsageBreakdown(entries: readonly SessionEntry[]): UsageBreakdownEntry[] {
  const totalsByKey = new Map<string, UsageTotals>();

  for (const entry of entries) {
    let key: string | undefined;
    let usage: UsageLike | undefined;

    if (entry.type === "message") {
      const message = entry.message as unknown as Record<string, unknown>;
      if (message.role === "assistant") {
        key = `${String(message.provider)}/${String(message.responseModel ?? message.model)}`;
        usage = asRecord(message.usage) as UsageLike | undefined;
      } else if (message.role === "toolResult" && message.usage) {
        key = "Tools/summaries";
        usage = asRecord(message.usage) as UsageLike | undefined;
      }
    } else if (
      (entry.type === "compaction" || entry.type === "branch_summary")
      && entry.usage
    ) {
      key = "Tools/summaries";
      usage = entry.usage as UsageLike;
    }

    if (!key || !usage) {
      continue;
    }
    const totals = totalsByKey.get(key) ?? createUsageTotals();
    addUsage(totals, usage);
    totalsByKey.set(key, totals);
  }

  return Array.from(totalsByKey, ([key, totals]) => ({
    key,
    cost: totals.cost,
    tokens: totals.input + totals.output + totals.cacheRead + totals.cacheWrite,
  }))
    .filter((entry) => entry.cost > 0 || entry.tokens > 0)
    .sort((left, right) => right.cost - left.cost);
}

function promptTokens(usage: UsageLike): number {
  return numeric(usage.input) + numeric(usage.cacheRead) + numeric(usage.cacheWrite);
}

function collectCacheWaste(
  entries: readonly SessionEntry[],
  ctx: ExtensionContext,
): CacheWaste {
  let previous: PreviousRequest | undefined;
  const totals: CacheWaste = {
    missedTokens: 0,
    missedCost: 0,
    missCount: 0,
  };

  for (const entry of entries) {
    if (entry.type === "compaction" || entry.type === "branch_summary") {
      previous = undefined;
      continue;
    }
    if (entry.type !== "message") {
      continue;
    }

    const message = entry.message as unknown as Record<string, unknown>;
    if (message.role !== "assistant") {
      continue;
    }
    const usage = asRecord(message.usage) as UsageLike | undefined;
    if (!usage) {
      continue;
    }

    const currentPromptTokens = promptTokens(usage);
    const cacheRead = numeric(usage.cacheRead);
    const cacheWrite = numeric(usage.cacheWrite);
    const reportedCache = cacheRead + cacheWrite > 0;

    if (
      previous
      && currentPromptTokens > 0
      && (reportedCache || previous.reportedCache)
    ) {
      const missedTokens = Math.min(previous.promptTokens, currentPromptTokens) - cacheRead;
      if (missedTokens > CACHE_MISS_NOISE_FLOOR) {
        const paidTokens = numeric(usage.input) + cacheWrite;
        const paidPerToken = paidTokens > 0
          ? (usageCostPart(usage, "input") + usageCostPart(usage, "cacheWrite")) / paidTokens
          : 0;
        const provider = String(message.provider ?? "");
        const modelId = String(message.model ?? "");
        const model = provider && modelId
          ? ctx.modelRegistry.find(provider, modelId)
          : undefined;
        const readPerToken = cacheRead > 0
          ? usageCostPart(usage, "cacheRead") / cacheRead
          : numeric(model?.cost.cacheRead) / 1_000_000;

        totals.missedTokens += missedTokens;
        totals.missedCost += missedTokens * Math.max(0, paidPerToken - readPerToken);
        totals.missCount += 1;
      }
    }

    if (currentPromptTokens > 0) {
      previous = {
        promptTokens: currentPromptTokens,
        timestamp: numeric(message.timestamp),
        reportedCache: previous?.reportedCache === true || reportedCache,
      };
    }
  }

  return totals;
}

export function collectSessionStats(ctx: ExtensionContext): SessionStats {
  const entries = ctx.sessionManager.getEntries();
  const usageTotals = createUsageTotals();
  let userMessages = 0;
  let assistantMessages = 0;
  let toolResults = 0;
  let totalMessages = 0;
  let toolCalls = 0;

  for (const entry of entries) {
    if (entry.type === "compaction" || entry.type === "branch_summary") {
      addUsage(usageTotals, getUsageFromEntry(entry));
    }
    if (entry.type !== "message") {
      continue;
    }

    totalMessages += 1;
    const message = entry.message as unknown as Record<string, unknown>;
    if (message.role === "user") {
      userMessages += 1;
    } else if (message.role === "toolResult") {
      toolResults += 1;
      addUsage(usageTotals, getUsageFromEntry(entry));
    } else if (message.role === "assistant") {
      assistantMessages += 1;
      const content = Array.isArray(message.content) ? message.content : [];
      toolCalls += content.filter((part) => asRecord(part)?.type === "toolCall").length;
      addUsage(usageTotals, getUsageFromEntry(entry));
    }
  }

  const totalTokens = usageTotals.input
    + usageTotals.output
    + usageTotals.cacheRead
    + usageTotals.cacheWrite;

  return {
    name: ctx.sessionManager.getSessionName(),
    file: ctx.sessionManager.getSessionFile(),
    id: ctx.sessionManager.getSessionId(),
    userMessages,
    assistantMessages,
    toolCalls,
    toolResults,
    totalMessages,
    tokens: {
      input: usageTotals.input,
      output: usageTotals.output,
      cacheRead: usageTotals.cacheRead,
      cacheWrite: usageTotals.cacheWrite,
      total: totalTokens,
    },
    cost: usageTotals.cost,
    usageBreakdown: collectUsageBreakdown(entries),
    cacheWaste: collectCacheWaste(entries, ctx),
  };
}

function renderUsageBar(
  theme: Theme,
  parts: { system: number; tools: number; conversation: number; remaining: number },
  total: number,
  width: number,
): string {
  if (total <= 0) {
    return "";
  }

  const barWidth = Math.max(10, width);
  const toColumns = (value: number) => Math.round((value / total) * barWidth);
  let systemColumns = toColumns(parts.system);
  let toolColumns = toColumns(parts.tools);
  let conversationColumns = toColumns(parts.conversation);
  let remainingColumns = Math.max(
    0,
    barWidth - systemColumns - toolColumns - conversationColumns,
  );

  while (systemColumns + toolColumns + conversationColumns + remainingColumns < barWidth) {
    remainingColumns += 1;
  }
  while (
    systemColumns + toolColumns + conversationColumns + remainingColumns > barWidth
    && remainingColumns > 0
  ) {
    remainingColumns -= 1;
  }

  const block = "█";
  return [
    theme.fg("accent", block.repeat(systemColumns)),
    theme.fg("warning", block.repeat(toolColumns)),
    theme.fg("success", block.repeat(conversationColumns)),
    theme.fg("dim", block.repeat(remainingColumns)),
  ].join("");
}

function sessionLines(
  session: SessionStats,
  theme: Theme,
): string[] {
  const dim = (text: string) => theme.fg("dim", text);
  const lines: string[] = [theme.bold("Session Info"), ""];

  if (session.name) {
    lines.push(`${dim("Name:")} ${session.name}`);
  }
  lines.push(`${dim("File:")} ${session.file ?? "In-memory"}`);
  lines.push(`${dim("ID:")} ${session.id}`);
  lines.push("");
  lines.push(theme.bold("Messages"));
  lines.push(`${dim("Total:")} ${session.totalMessages}`);
  lines.push(`${dim("User:")} ${session.userMessages}`);
  lines.push(`${dim("Assistant:")} ${session.assistantMessages}`);
  lines.push(`${dim("Tools:")} ${session.toolCalls} calls, ${session.toolResults} results`);
  lines.push("");
  lines.push(theme.bold("Tokens"));

  const promptTotal = session.tokens.input
    + session.tokens.cacheRead
    + session.tokens.cacheWrite;
  lines.push(`${dim("Input:")} ${promptTotal.toLocaleString()}`);
  if (promptTotal > 0 && (session.tokens.cacheRead > 0 || session.tokens.cacheWrite > 0)) {
    const hitRate = ((session.tokens.cacheRead / promptTotal) * 100).toFixed(1);
    lines.push(`  ${dim("Cached:")} ${session.tokens.cacheRead.toLocaleString()} ${dim(`(${hitRate}%)`)}`);
    const cacheWrite = session.tokens.cacheWrite > 0
      ? ` ${dim(`(${session.tokens.cacheWrite.toLocaleString()} written to cache)`)}`
      : "";
    lines.push(`  ${dim("Uncached:")} ${(session.tokens.input + session.tokens.cacheWrite).toLocaleString()}${cacheWrite}`);
  }
  lines.push(`${dim("Output:")} ${session.tokens.output.toLocaleString()}`);
  lines.push(`${dim("Total:")} ${session.tokens.total.toLocaleString()}`);

  if (session.cost > 0 || session.cacheWaste.missedTokens > 0) {
    lines.push("");
    lines.push(theme.bold("Cost"));
    lines.push(`${dim("Total:")} $${session.cost.toFixed(3)}`);
    if (session.usageBreakdown.length > 1) {
      for (const entry of session.usageBreakdown) {
        lines.push(`  ${dim(`${entry.key}:`)} $${entry.cost.toFixed(3)} ${dim(`(${formatTokens(entry.tokens)} tokens)`)}`);
      }
    }
    if (session.cacheWaste.missedTokens > 0) {
      const missLabel = session.cacheWaste.missCount === 1
        ? "1 miss"
        : `${session.cacheWaste.missCount} misses`;
      const detail = `${session.cacheWaste.missedTokens.toLocaleString()} tokens, ${missLabel}`;
      const value = session.cacheWaste.missedCost >= 0.0001
        ? `$${session.cacheWaste.missedCost.toFixed(3)} ${dim(`(${detail})`)}`
        : detail;
      lines.push(`${dim("Cache Re-billed:")} ${value}`);
    }
  }

  return lines;
}

function plainSessionLines(session: SessionStats): string[] {
  const lines: string[] = ["Session Info", ""];
  if (session.name) {
    lines.push(`Name: ${session.name}`);
  }
  lines.push(`File: ${session.file ?? "In-memory"}`);
  lines.push(`ID: ${session.id}`);
  lines.push("");
  lines.push("Messages");
  lines.push(`Total: ${session.totalMessages}`);
  lines.push(`User: ${session.userMessages}`);
  lines.push(`Assistant: ${session.assistantMessages}`);
  lines.push(`Tools: ${session.toolCalls} calls, ${session.toolResults} results`);
  lines.push("");
  lines.push("Tokens");

  const promptTotal = session.tokens.input
    + session.tokens.cacheRead
    + session.tokens.cacheWrite;
  lines.push(`Input: ${promptTotal.toLocaleString()}`);
  if (promptTotal > 0 && (session.tokens.cacheRead > 0 || session.tokens.cacheWrite > 0)) {
    lines.push(`  Cached: ${session.tokens.cacheRead.toLocaleString()} (${((session.tokens.cacheRead / promptTotal) * 100).toFixed(1)}%)`);
    const cacheWrite = session.tokens.cacheWrite > 0
      ? ` (${session.tokens.cacheWrite.toLocaleString()} written to cache)`
      : "";
    lines.push(`  Uncached: ${(session.tokens.input + session.tokens.cacheWrite).toLocaleString()}${cacheWrite}`);
  }
  lines.push(`Output: ${session.tokens.output.toLocaleString()}`);
  lines.push(`Total: ${session.tokens.total.toLocaleString()}`);

  if (session.cost > 0 || session.cacheWaste.missedTokens > 0) {
    lines.push("");
    lines.push("Cost");
    lines.push(`Total: $${session.cost.toFixed(3)}`);
    if (session.usageBreakdown.length > 1) {
      for (const entry of session.usageBreakdown) {
        lines.push(`  ${entry.key}: $${entry.cost.toFixed(3)} (${formatTokens(entry.tokens)} tokens)`);
      }
    }
    if (session.cacheWaste.missedTokens > 0) {
      const misses = session.cacheWaste.missCount === 1
        ? "1 miss"
        : `${session.cacheWaste.missCount} misses`;
      const detail = `${session.cacheWaste.missedTokens.toLocaleString()} tokens, ${misses}`;
      lines.push(
        session.cacheWaste.missedCost >= 0.0001
          ? `Cache Re-billed: $${session.cacheWaste.missedCost.toFixed(3)} (${detail})`
          : `Cache Re-billed: ${detail}`,
      );
    }
  }
  return lines;
}

class ContextView implements Component {
  private readonly container = new Container();
  private readonly body = new Text("", 1, 0);
  private bodyLines: string[] = [];
  private scrollOffset = 0;
  private cachedWidth?: number;
  private cachedRows?: number;

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly data: ContextViewData,
    private readonly onDone: () => void,
  ) {
    this.container.addChild(new DynamicBorder((text) => theme.fg("accent", text)));
    this.container.addChild(new Text(
      theme.fg("accent", theme.bold("Context"))
        + theme.fg("dim", "  (Esc/q/Enter to close, ↑/↓ to scroll)"),
      1,
      0,
    ));
    this.container.addChild(new Text("", 1, 0));
    this.container.addChild(this.body);
    this.container.addChild(new Text("", 1, 0));
    this.container.addChild(new DynamicBorder((text) => theme.fg("accent", text)));
  }

  private buildBodyLines(width: number): string[] {
    const muted = (text: string) => this.theme.fg("muted", text);
    const dim = (text: string) => this.theme.fg("dim", text);
    const normal = (text: string) => this.theme.fg("text", text);
    const lines: string[] = [];

    if (!this.data.usage) {
      lines.push(`${muted("Window: ")}${dim("(unknown)")}`);
    } else {
      const usage = this.data.usage;
      lines.push(
        muted("Window: ")
          + normal(`~${usage.effectiveTokens.toLocaleString()} / ${usage.contextWindow.toLocaleString()}`)
          + muted(`  (${usage.percent.toFixed(1)}% used, ~${usage.remainingTokens.toLocaleString()} left)`),
      );
      const systemInMessages = Math.min(usage.systemPromptTokens, usage.messageTokens);
      const conversationInMessages = Math.max(0, usage.messageTokens - systemInMessages);
      const bar = renderUsageBar(
        this.theme,
        {
          system: systemInMessages,
          tools: usage.toolsTokens,
          conversation: conversationInMessages,
          remaining: usage.remainingTokens,
        },
        usage.contextWindow,
        Math.max(10, Math.min(36, width - 10)),
      );
      lines.push(
        `${bar} ${dim("sys")}${this.theme.fg("accent", "█")}`
          + ` ${dim("tools")}${this.theme.fg("warning", "█")}`
          + ` ${dim("convo")}${this.theme.fg("success", "█")}`
          + ` ${dim("free")}${this.theme.fg("dim", "█")}`,
      );
      lines.push("");
      lines.push(
        muted("System: ")
          + normal(`~${usage.systemPromptTokens.toLocaleString()} tok`)
          + muted(` (AGENTS ~${usage.agentTokens.toLocaleString()})`),
      );
      lines.push(
        muted("Tools: ")
          + normal(`~${usage.toolsTokens.toLocaleString()} tok`)
          + muted(` (${this.data.activeTools.length} active)`),
      );
    }

    lines.push(
      muted(`Active tools (${this.data.activeTools.length}): `)
        + normal(this.data.activeTools.length > 0
          ? this.data.activeTools.join(", ")
          : "(none)"),
    );

    if (this.data.mcp) {
      lines.push("");
      lines.push(muted("MCP: ") + normal(mcpSummary(this.data.mcp)));
      for (const server of this.data.mcp.servers) {
        const statusColor = server.status === "connected"
          ? "success"
          : server.status === "failed" || server.status === "needs-auth"
            ? "warning"
            : "muted";
        const details = [
          this.theme.fg(statusColor, mcpStatusLabel(server)),
          countLabel(server.toolCount, "tool"),
          ...(server.resourceCount === undefined
            ? []
            : [countLabel(server.resourceCount, "resource")]),
        ];
        lines.push(`  ${normal(server.name)}${muted(": ")}${details.join(muted(" · "))}`);
      }
    }

    lines.push(
      muted(`AGENTS (${this.data.agentFiles.length}): `)
        + normal(this.data.agentFiles.length > 0 ? this.data.agentFiles.join(", ") : "(none)"),
    );
    lines.push("");
    lines.push(
      muted(`Extensions (${this.data.extensions.length}): `)
        + normal(this.data.extensions.length > 0 ? this.data.extensions.join(", ") : "(none)"),
    );

    const loadedSkills = new Set(this.data.loadedSkills);
    const renderedSkills = this.data.skills.length > 0
      ? this.data.skills.map((skill) => loadedSkills.has(skill)
        ? this.theme.fg("success", skill)
        : this.theme.fg("muted", skill))
        .join(this.theme.fg("muted", ", "))
      : "(none)";
    lines.push(muted(`Skills (${this.data.skills.length}): `) + renderedSkills);
    lines.push("");
    lines.push(...sessionLines(this.data.session, this.theme));
    return lines;
  }

  private pageSize(): number {
    return Math.max(8, this.tui.terminal.rows - 10);
  }

  private rebuild(width: number): void {
    this.bodyLines = this.buildBodyLines(width);
    const pageSize = this.pageSize();
    const contentSize = Math.max(1, pageSize - 2);
    const maxOffset = Math.max(0, this.bodyLines.length - contentSize);
    this.scrollOffset = Math.min(this.scrollOffset, maxOffset);

    if (maxOffset === 0) {
      this.body.setText(this.bodyLines.join("\n"));
    } else {
      const visible = this.bodyLines.slice(
        this.scrollOffset,
        this.scrollOffset + contentSize,
      );
      const above = this.scrollOffset > 0
        ? this.theme.fg("dim", `↑ ${this.scrollOffset} more`)
        : "";
      const belowCount = Math.max(
        0,
        this.bodyLines.length - this.scrollOffset - contentSize,
      );
      const below = belowCount > 0
        ? this.theme.fg("dim", `↓ ${belowCount} more`)
        : "";
      this.body.setText([above, ...visible, below].join("\n"));
    }

    this.cachedWidth = width;
    this.cachedRows = this.tui.terminal.rows;
  }

  private scroll(delta: number): void {
    const contentSize = Math.max(1, this.pageSize() - 2);
    const maxOffset = Math.max(0, this.bodyLines.length - contentSize);
    const nextOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset + delta));
    if (nextOffset !== this.scrollOffset) {
      this.scrollOffset = nextOffset;
      this.cachedWidth = undefined;
      this.tui.requestRender();
    }
  }

  handleInput(data: string): void {
    if (
      matchesKey(data, Key.escape)
      || matchesKey(data, Key.ctrl("c"))
      || matchesKey(data, Key.enter)
      || data.toLowerCase() === "q"
    ) {
      this.onDone();
      return;
    }
    if (matchesKey(data, Key.up) || data.toLowerCase() === "k") {
      this.scroll(-1);
      return;
    }
    if (matchesKey(data, Key.down) || data.toLowerCase() === "j") {
      this.scroll(1);
      return;
    }
    if (matchesKey(data, Key.pageUp)) {
      this.scroll(-Math.max(1, this.pageSize() - 3));
      return;
    }
    if (matchesKey(data, Key.pageDown)) {
      this.scroll(Math.max(1, this.pageSize() - 3));
    }
  }

  invalidate(): void {
    this.container.invalidate();
    this.cachedWidth = undefined;
  }

  render(width: number): string[] {
    if (this.cachedWidth !== width || this.cachedRows !== this.tui.terminal.rows) {
      this.rebuild(width);
    }
    return this.container.render(width);
  }
}

async function collectContextData(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  mcp: McpStatusSnapshot | null,
): Promise<ContextViewData> {
  const commands = pi.getCommands();
  const extensionPaths = new Set(
    commands
      .filter((command) => command.source === "extension")
      .map((command) => command.sourceInfo?.path ?? "<unknown>"),
  );
  const extensions = Array.from(extensionPaths)
    .map((extensionPath) => extensionPath === "<unknown>"
      ? extensionPath
      : path.basename(extensionPath))
    .sort((left, right) => left.localeCompare(right));

  const skills = commands
    .filter((command) => command.source === "skill")
    .map((command) => normalizeSkillName(command.name))
    .sort((left, right) => left.localeCompare(right));

  const agentFiles = loadProjectContextFiles({
    cwd: ctx.cwd,
    agentDir: getAgentDir(),
  });
  const agentFilePaths = agentFiles.map((file) => shortenPath(file.path, ctx.cwd));
  const agentTokens = agentFiles.reduce(
    (total, file) => total + estimateTextTokens(file.content),
    0,
  );

  const systemPromptTokens = estimateTextTokens(ctx.getSystemPrompt() ?? "");
  const currentUsage = ctx.getContextUsage();
  const messageTokens = currentUsage?.tokens ?? 0;
  const contextWindow = currentUsage?.contextWindow ?? 0;
  const activeToolNames = pi.getActiveTools();
  const toolsByName = new Map(pi.getAllTools().map((tool) => [tool.name, tool]));
  let toolsTokens = 0;
  for (const toolName of activeToolNames) {
    const tool = toolsByName.get(toolName);
    toolsTokens += estimateTextTokens(`${toolName}\n${tool?.description ?? ""}`);
  }
  toolsTokens = Math.round(toolsTokens * TOOL_TOKEN_FUDGE);

  const effectiveTokens = messageTokens + toolsTokens;
  const percent = contextWindow > 0 ? (effectiveTokens / contextWindow) * 100 : 0;
  const remainingTokens = contextWindow > 0
    ? Math.max(0, contextWindow - effectiveTokens)
    : 0;

  return {
    usage: currentUsage
      ? {
        messageTokens,
        contextWindow,
        effectiveTokens,
        percent,
        remainingTokens,
        systemPromptTokens,
        agentTokens,
        toolsTokens,
      }
      : null,
    activeTools: activeToolNames,
    mcp,
    agentFiles: agentFilePaths,
    extensions,
    skills,
    loadedSkills: Array.from(getLoadedSkills(ctx)).sort((left, right) => left.localeCompare(right)),
    session: collectSessionStats(ctx),
  };
}

function plainContext(data: ContextViewData): string {
  const lines = ["Context"];
  if (data.usage) {
    lines.push(
      `Window: ~${data.usage.effectiveTokens.toLocaleString()} / ${data.usage.contextWindow.toLocaleString()}`
        + ` (${data.usage.percent.toFixed(1)}% used, ~${data.usage.remainingTokens.toLocaleString()} left)`,
    );
    lines.push(`System: ~${data.usage.systemPromptTokens.toLocaleString()} tok (AGENTS ~${data.usage.agentTokens.toLocaleString()})`);
    lines.push(`Tools: ~${data.usage.toolsTokens.toLocaleString()} tok (${data.activeTools.length} active)`);
  } else {
    lines.push("Window: (unknown)");
  }
  lines.push(`Active tools (${data.activeTools.length}): ${data.activeTools.length > 0 ? data.activeTools.join(", ") : "(none)"}`);
  if (data.mcp) {
    lines.push("");
    lines.push(`MCP: ${mcpSummary(data.mcp)}`);
    for (const server of data.mcp.servers) {
      const details = [
        mcpStatusLabel(server),
        countLabel(server.toolCount, "tool"),
        ...(server.resourceCount === undefined
          ? []
          : [countLabel(server.resourceCount, "resource")]),
      ];
      lines.push(`  ${server.name}: ${details.join(" · ")}`);
    }
  }
  lines.push(`AGENTS (${data.agentFiles.length}): ${data.agentFiles.length > 0 ? data.agentFiles.join(", ") : "(none)"}`);
  lines.push(`Extensions (${data.extensions.length}): ${data.extensions.length > 0 ? data.extensions.join(", ") : "(none)"}`);
  lines.push(`Skills (${data.skills.length}): ${data.skills.length > 0 ? data.skills.join(", ") : "(none)"}`);
  lines.push("");
  lines.push(...plainSessionLines(data.session));
  return lines.join("\n");
}

export default function contextExtension(pi: ExtensionAPI): void {
  let lastSessionId: string | undefined;
  let loadedSkills = new Set<string>();
  let skillIndex: SkillIndexEntry[] = [];
  let mcpStatus: McpStatusSnapshot | null = null;

  pi.events.on(MCP_STATUS_EVENT, (snapshot) => {
    mcpStatus = parseMcpStatusSnapshot(snapshot);
  });

  const refreshSkillCaches = (ctx: ExtensionContext): void => {
    const sessionId = ctx.sessionManager.getSessionId();
    if (sessionId !== lastSessionId) {
      lastSessionId = sessionId;
      loadedSkills = getLoadedSkills(ctx);
      skillIndex = buildSkillIndex(pi, ctx.cwd);
    } else if (skillIndex.length === 0) {
      skillIndex = buildSkillIndex(pi, ctx.cwd);
    }
  };

  pi.on("tool_result", (event: ToolResultEvent, ctx: ExtensionContext) => {
    if (event.toolName !== "read" || event.isError) {
      return;
    }
    const inputPath = typeof event.input.path === "string" ? event.input.path : "";
    if (!inputPath) {
      return;
    }

    refreshSkillCaches(ctx);
    const absolutePath = normalizeReadPath(inputPath, ctx.cwd);
    const matchingSkill = skillIndex
      .filter((skill) => absolutePath === skill.skillFilePath
        || absolutePath.startsWith(`${skill.skillDir}${path.sep}`))
      .sort((left, right) => right.skillDir.length - left.skillDir.length)[0];

    if (matchingSkill && !loadedSkills.has(matchingSkill.name)) {
      loadedSkills.add(matchingSkill.name);
      pi.appendEntry<SkillLoadedEntryData>(SKILL_LOADED_ENTRY, {
        name: matchingSkill.name,
        path: absolutePath,
      });
    }
  });

  pi.registerCommand("context", {
    description: "Show context and session information",
    handler: async (_args, ctx) => {
      const data = await collectContextData(pi, ctx, mcpStatus);
      if (!ctx.hasUI || ctx.mode !== "tui") {
        pi.sendMessage(
          {
            customType: "context",
            content: plainContext(data),
            display: true,
          },
          { triggerTurn: false },
        );
        return;
      }

      await ctx.ui.custom<void>((tui, theme, _keybindings, done) =>
        new ContextView(tui, theme, data, done));
    },
  });
}
