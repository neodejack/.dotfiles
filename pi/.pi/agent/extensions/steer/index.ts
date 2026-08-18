import {
  CustomEditor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { trackPromptBeforeSteerCommand } from "./editor-tracker.js";

export default function steerExtension(pi: ExtensionAPI): void {
  let pendingPrompt: string | undefined;

  pi.registerCommand("steer", {
    description: "Send the current prompt as a steering message",
    handler: async (args, ctx) => {
      const capturedPrompt = pendingPrompt;
      pendingPrompt = undefined;
      const message = args.trim().length > 0 ? args : capturedPrompt;

      if (!message?.trim()) {
        ctx.ui.notify("Type a prompt before choosing Steer", "warning");
        return;
      }

      pi.sendUserMessage(message, { deliverAs: "steer" });
    },
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const previousEditorFactory = ctx.ui.getEditorComponent();
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      const editor = previousEditorFactory
        ? previousEditorFactory(tui, theme, keybindings)
        : new CustomEditor(tui, theme, keybindings);
      return trackPromptBeforeSteerCommand(editor, (text) => {
        pendingPrompt = text;
      });
    });
  });

  pi.on("session_shutdown", () => {
    pendingPrompt = undefined;
  });
}
