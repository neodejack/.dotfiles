import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { EditorComponent } from "@earendil-works/pi-tui";
import { activeIndicatorColor } from "./colors.js";
import {
  registerCommandPaletteShortcut,
  registerPlannotatorLastShortcut,
} from "./command-palette.js";
import {
  buildPromptBorderLabels,
  createPromptChromeState,
  installStatusOnlyFooter,
  updatePromptChromeContext,
} from "./prompt-chrome.js";
import { installRoundedEditor } from "./rounded-editor.js";
import {
  createWorkingIndicatorFrames,
  WORKING_INDICATOR_INTERVAL_MS,
} from "./running-indicator.js";
import {
  stopAllIndicators,
  type TimerRegistry,
} from "./tool-renderer.js";
import { installToolRendererInterceptor } from "./tool-interceptor.js";

export default function piRenderExtension(pi: ExtensionAPI): void {
  const timers: TimerRegistry = new Set();
  const chrome = createPromptChromeState();
  let activeEditor: EditorComponent | undefined;

  registerCommandPaletteShortcut(pi, () => activeEditor);
  registerPlannotatorLastShortcut(pi, () => activeEditor);
  installToolRendererInterceptor(timers);

  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setWorkingIndicator({
      frames: createWorkingIndicatorFrames(activeIndicatorColor),
      intervalMs: WORKING_INDICATOR_INTERVAL_MS,
    });
    ctx.ui.setWorkingMessage("");
    updatePromptChromeContext(chrome, ctx);
    installStatusOnlyFooter(ctx, chrome);
    installRoundedEditor(
      ctx,
      (innerWidth) => buildPromptBorderLabels(chrome, innerWidth),
      undefined,
      (editor) => {
        activeEditor = editor;
      },
    );
  });

  pi.on("message_start", (_event, ctx) => {
    updatePromptChromeContext(chrome, ctx);
  });

  pi.on("message_end", (_event, ctx) => {
    updatePromptChromeContext(chrome, ctx);
  });

  pi.on("turn_end", (_event, ctx) => {
    updatePromptChromeContext(chrome, ctx);
  });

  pi.on("model_select", (_event, ctx) => {
    updatePromptChromeContext(chrome, ctx);
  });

  pi.on("thinking_level_select", (_event, ctx) => {
    updatePromptChromeContext(chrome, ctx);
  });

  pi.on("session_info_changed", (_event, ctx) => {
    updatePromptChromeContext(chrome, ctx);
  });

  pi.on("session_shutdown", () => {
    activeEditor = undefined;
    stopAllIndicators(timers);
  });
}
