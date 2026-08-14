/**
 * Codex-aware edit tool.
 *
 * Activates the V4A `apply_patch` interface for `openai-codex` models and
 * removes the built-in `edit` and `write` tools. If a non-Codex model is ever
 * selected, the built-in tools are restored.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createApplyPatchToolDefinition } from "./apply-patch/tool";
import {
  type EditToolChoice,
  pickEditTool,
  resolveActiveTools,
} from "./router";

let currentChoice: EditToolChoice | null = null;
let removedByUs: string[] = [];

/** Swap the active edit interface to match the active model. */
function routeEditTool(pi: ExtensionAPI, model: unknown): void {
  const desired = pickEditTool(model as Parameters<typeof pickEditTool>[0]);
  if (desired === currentChoice) return;

  const { active, removedByUs: nextRemoved } = resolveActiveTools(
    pi.getActiveTools(),
    desired,
    removedByUs,
  );
  pi.setActiveTools(active);
  removedByUs = nextRemoved;
  currentChoice = desired;
}

export default function editTool(pi: ExtensionAPI): void {
  currentChoice = null;
  removedByUs = [];

  pi.registerTool(createApplyPatchToolDefinition(process.cwd()));

  pi.on("session_start", (_event, ctx) => {
    routeEditTool(pi, ctx.model);
  });

  pi.on("model_select", (event) => {
    routeEditTool(pi, event.model);
  });

  // Backstop: ensure routing is correct before the first turn even if
  // `session_start` ran before a model was selected.
  pi.on("agent_start", (_event, ctx) => {
    routeEditTool(pi, ctx.model);
  });
}
