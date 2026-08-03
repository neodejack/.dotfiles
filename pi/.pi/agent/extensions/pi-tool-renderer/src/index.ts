import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { EditorComponent } from "@earendil-works/pi-tui";
import { registerCommandPaletteShortcut } from "./command-palette.js";
import {
  buildPromptBorderLabels,
  createPromptChromeState,
  installStatusOnlyFooter,
  updatePromptChromeContext,
} from "./prompt-chrome.js";
import { ensureAmpPromptTheme } from "./prompt-theme.js";
import { installRoundedEditor } from "./rounded-editor.js";
import {
  stopAllSpinners,
  type TimerRegistry,
} from "./tool-renderer.js";
import { installToolRendererInterceptor } from "./tool-interceptor.js";

export default function piRenderExtension(pi: ExtensionAPI): void {
  const timers: TimerRegistry = new Set();
  const chrome = createPromptChromeState();
  let activeEditor: EditorComponent | undefined;

  registerCommandPaletteShortcut(pi, () => activeEditor);
  installToolRendererInterceptor(timers);

  pi.on("session_start", (_event, ctx) => {
    ensureAmpPromptTheme(ctx);
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

  pi.on("message_start", (event, ctx) => {
    if (event.message.role === "user") {
      ensureAmpPromptTheme(ctx);
    }
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
    stopAllSpinners(timers);
  });
}
