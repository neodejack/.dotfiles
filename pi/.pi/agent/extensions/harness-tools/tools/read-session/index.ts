import { realpathSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import type { AssistantMessage, Usage } from "@earendil-works/pi-ai";
import {
  createAgentSession,
  defineTool,
  getAgentDir,
  getMarkdownTheme,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { Markdown, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { getSubagentModelPreferences } from "../../lib/agent-kit/model-config";
import {
  createSubagentModelRuntime,
  rankModels,
} from "../../lib/agent-kit/models";
import { SubagentResourceLoader } from "../../lib/agent-kit/resources/loader";
import {
  getSessionsDir,
  resolveSessionPathById,
} from "../../lib/session-store";
import { buildPrompt, SYSTEM_PROMPT } from "./prompt";
import { createSessionQueryTools } from "./session-query-tools";

const ReadSessionParams = Type.Object({
  targetSessionId: Type.String({
    description: "Session UUID, unambiguous UUID prefix, or validated Pi session .jsonl path.",
  }),
  goal: Type.String({
    description:
      "Specific extraction goal with known names, dates, projects, topics, files, decisions, commands, and desired output format.",
  }),
});

interface ReadSessionDetails {
  status: "running" | "success";
  targetSessionId: string;
  resolvedSessionId: string;
  model: string;
  activeTool?: string;
  toolCalls: string[];
  answer?: string;
}

type ResolvedTarget = { id: string; path: string };

function validateSessionPath(path: string): ResolvedTarget {
  if (!isAbsolute(path)) {
    throw new Error("Session file paths must be absolute");
  }
  const target = realpathSync(path);
  const sessionsDir = realpathSync(getSessionsDir());
  const rel = relative(sessionsDir, target);
  if (
    rel === "" ||
    rel.startsWith("..") ||
    isAbsolute(rel) ||
    !target.endsWith(".jsonl")
  ) {
    throw new Error("Session path must be an existing .jsonl file inside Pi's sessions directory");
  }
  const session = SessionManager.open(target);
  return { id: session.getSessionId(), path: target };
}

function resolveTarget(input: string): ResolvedTarget {
  if (input.includes("/") || input.endsWith(".jsonl")) {
    return validateSessionPath(input);
  }
  const resolved = resolveSessionPathById(input);
  const validated = validateSessionPath(resolved.path);
  if (validated.id !== resolved.id) {
    throw new Error("Sesame session metadata does not match the target session file");
  }
  return validated;
}

function emptyUsage(): Usage {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function addUsage(current: Usage, next: Usage): Usage {
  return {
    input: current.input + next.input,
    output: current.output + next.output,
    cacheRead: current.cacheRead + next.cacheRead,
    cacheWrite: current.cacheWrite + next.cacheWrite,
    totalTokens: current.totalTokens + next.totalTokens,
    cost: {
      input: current.cost.input + next.cost.input,
      output: current.cost.output + next.cost.output,
      cacheRead: current.cost.cacheRead + next.cost.cacheRead,
      cacheWrite: current.cost.cacheWrite + next.cost.cacheWrite,
      total: current.cost.total + next.cost.total,
    },
  };
}

function isAssistant(message: unknown): message is AssistantMessage {
  return Boolean(
    message &&
      typeof message === "object" &&
      "role" in message &&
      message.role === "assistant" &&
      "usage" in message,
  );
}

export const readSessionTool = defineTool({
  name: "read_session",
  label: "Read Session",
  description: `Zero-shot past-session extractor. Provide a session ID/path plus a specific extraction goal with names, dates, topics, and expected output.

The specialist has only bounded session-query tools. It cites exact entry/checkpoint IDs and returns "not found" rather than inferring unsupported facts. Do not use for the current session or general codebase search.`,
  promptSnippet:
    "Extract specific facts, decisions, summaries, or cited evidence from one past Pi session",
  promptGuidelines: [
    "read_session: Use to extract specific information from a past Pi coding session by UUID, UUID prefix, or session .jsonl path.",
    "read_session: Do not use for the current session or general codebase search.",
    "read_session: Provide a narrow, self-contained goal with known names, dates, projects, topics, files, decisions, or tool names plus the expected output shape.",
    "read_session: Ask for cited evidence when exact decisions, commands, or implementation details matter; require 'not found' for missing facts.",
  ],
  parameters: ReadSessionParams,

  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    const goal = params.goal.trim();
    if (!goal) throw new Error("read_session requires a non-empty goal");
    const target = resolveTarget(params.targetSessionId.trim());
    if (target.id === ctx.sessionManager.getSessionId()) {
      throw new Error("read_session cannot inspect the current session");
    }

    const preferences = await getSubagentModelPreferences("read_session");
    if (!preferences?.length) {
      throw new Error("Read Session subagent has no configured model roster");
    }
    const ranking = rankModels(ctx.modelRegistry, preferences);
    for (const skipped of ranking.skipped) {
      ctx.ui.notify(
        `[model] skipped ${skipped.preference.provider}/${skipped.preference.model}: ${skipped.reason}`,
        "warning",
      );
    }
    const choice = ranking.candidates[0];
    if (!choice) throw new Error("No model available for Read Session subagent");

    const queryTools = createSessionQueryTools(target.path);
    const resourceLoader = new SubagentResourceLoader(
      ctx.cwd,
      SYSTEM_PROMPT,
      [],
      [],
      getAgentDir(),
      [],
    );
    await resourceLoader.reload();
    const modelRuntime = await createSubagentModelRuntime(
      ctx.modelRegistry,
      choice.model,
    );
    const settingsManager = SettingsManager.inMemory({
      compaction: { enabled: false },
    });
    const subagentDir = `${getAgentDir()}/subagents`;
    const { session } = await createAgentSession({
      cwd: ctx.cwd,
      agentDir: subagentDir,
      model: choice.model,
      thinkingLevel: choice.thinking,
      modelRuntime,
      settingsManager,
      sessionManager: SessionManager.create(ctx.cwd, subagentDir),
      resourceLoader,
      tools: queryTools.map((tool) => tool.name),
      customTools: queryTools,
    });

    const model = `${choice.preference.provider}/${choice.preference.model}`;
    const toolCalls: string[] = [];
    let activeTool: string | undefined;
    let usage = emptyUsage();
    const emitUpdate = () => {
      const details: ReadSessionDetails = {
        status: "running",
        targetSessionId: params.targetSessionId,
        resolvedSessionId: target.id,
        model,
        activeTool,
        toolCalls: [...toolCalls],
      };
      onUpdate?.({
        content: [{
          type: "text",
          text: activeTool ? `Reading session · ${activeTool}` : "Reading session…",
        }],
        details,
      });
    };
    const unsubscribe = session.subscribe((event) => {
      if (event.type === "tool_execution_start") {
        activeTool = event.toolName;
        toolCalls.push(event.toolName);
        emitUpdate();
      } else if (event.type === "tool_execution_end") {
        activeTool = undefined;
        emitUpdate();
      } else if (event.type === "message_end" && isAssistant(event.message)) {
        usage = addUsage(usage, event.message.usage);
      }
    });
    const abort = () => void session.abort();
    signal?.addEventListener("abort", abort, { once: true });

    try {
      emitUpdate();
      await session.prompt(buildPrompt(target.id, goal));
      signal?.throwIfAborted();
      const answer = session.getLastAssistantText()?.trim();
      if (!answer) throw new Error("Read Session subagent produced no answer");
      const boundedAnswer = answer.length > 50_000
        ? `${answer.slice(0, 49_900)}\n\n[Answer truncated at 50,000 characters]`
        : answer;
      const details: ReadSessionDetails = {
        status: "success",
        targetSessionId: params.targetSessionId,
        resolvedSessionId: target.id,
        model,
        toolCalls,
        answer: boundedAnswer,
      };
      return {
        content: [{ type: "text" as const, text: boundedAnswer }],
        details,
        usage,
      };
    } finally {
      signal?.removeEventListener("abort", abort);
      unsubscribe();
      session.dispose();
    }
  },

  renderCall(args, theme) {
    const target = args.targetSessionId || "?";
    return new Text(
      `${theme.fg("toolTitle", theme.bold("read_session"))} ${theme.fg("accent", target)} ${theme.fg("muted", args.goal ?? "")}`,
      0,
      0,
    );
  },

  renderResult(result, { isPartial }, theme) {
    const details = result.details as ReadSessionDetails | undefined;
    if (isPartial) {
      const status = details?.activeTool
        ? `reading · ${details.activeTool}`
        : "reading session…";
      return new Text(theme.fg("muted", status), 0, 0);
    }
    if (!details?.answer) {
      return new Text(theme.fg("error", "Session extraction failed"), 0, 0);
    }
    return new Markdown(details.answer, 0, 0, getMarkdownTheme());
  },
});
