import type { Api, ImageContent, Model } from "@earendil-works/pi-ai";
import type {
  AgentSession,
  ExtensionContext,
  Skill,
  Theme,
  ToolDefinition,
  ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import type { Static, TSchema } from "typebox";
import type { SubagentModelPreference } from "./models";

export type SubagentRenderOptions = Pick<
  ToolRenderResultOptions,
  "expanded" | "isPartial"
>;

export interface SubagentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: "running" | "completed" | "error";
  result?: string;
}

export type SubagentToolRenderer = (
  toolCall: SubagentToolCall,
  options: SubagentRenderOptions,
  theme: Theme,
  cwd: string,
) => Component;

export type SubagentToolSpec =
  | { name: string; type: "native"; render?: SubagentToolRenderer }
  | {
      name: string;
      type: "custom";
      spec: (cwd: string) => ToolDefinition;
      render?: SubagentToolRenderer;
    };

export interface SubagentPromptResult {
  text: string;
  images?: ImageContent[];
}

export type SubagentToolsResolver<Params extends TSchema = TSchema> = (
  params: Static<Params>,
  ctx: ExtensionContext,
) => SubagentToolSpec[] | Promise<SubagentToolSpec[]>;

export type SubagentAgentsFile = { path: string; content: string };

export type SubagentAgentsFilesResolver<Params extends TSchema = TSchema> = (
  params: Static<Params>,
  ctx: ExtensionContext,
) => SubagentAgentsFile[] | Promise<SubagentAgentsFile[]>;

export type SubagentCwdResolver<Params extends TSchema = TSchema> = (
  params: Static<Params>,
  ctx: ExtensionContext,
) => string | undefined | Promise<string | undefined>;

export interface SubagentConfig<Params extends TSchema = TSchema> {
  name: string;
  label: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  systemPrompt: string;
  tools: SubagentToolSpec[] | SubagentToolsResolver<Params>;
  skills?: Skill[];
  extensionPaths?: string[];
  modelPreferences:
    | SubagentModelPreference[]
    | (() => Promise<SubagentModelPreference[] | undefined>);
  resumable?: boolean;
  maxToolCalls?: number;
  parameters: Params;
  buildPrompt(
    params: Static<Params>,
    ctx: ExtensionContext,
    model: Model<Api>,
  ): SubagentPromptResult | Promise<SubagentPromptResult>;
  resolveAgentsFiles?(
    params: Static<Params>,
    ctx: ExtensionContext,
  ): SubagentAgentsFile[] | Promise<SubagentAgentsFile[]>;
  resolveCwd?(
    params: Static<Params>,
    ctx: ExtensionContext,
  ): string | undefined | Promise<string | undefined>;
  resolveSkills?(params: Static<Params>, ctx: ExtensionContext): Skill[];
  beforeExecute?(
    params: Static<Params>,
    session: AgentSession,
    ctx: ExtensionContext,
  ): Promise<void>;
}

export type ResolvedSubagentConfig<Params extends TSchema = TSchema> = Omit<
  SubagentConfig<Params>,
  "modelPreferences"
> & {
  modelPreferences: SubagentModelPreference[];
  configured: boolean;
};
