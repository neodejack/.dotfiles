import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ensureAmpPromptTheme } from "./prompt-theme.js";
import { registerToolOverrides } from "./register-tools.js";
import { installRoundedEditor } from "./rounded-editor.js";
import {
  stopAllSpinners,
  type TimerRegistry,
} from "./tool-renderer.js";

export default function piRenderExtension(pi: ExtensionAPI): void {
  const timers: TimerRegistry = new Set();

  pi.on("session_start", (_event, ctx) => {
    registerToolOverrides(
      pi,
      process.cwd(),
      timers,
      new Set(pi.getActiveTools()),
    );
    ensureAmpPromptTheme(ctx);
    installRoundedEditor(ctx);
  });

  pi.on("message_start", (event, ctx) => {
    if (event.message.role === "user") {
      ensureAmpPromptTheme(ctx);
    }
  });

  pi.on("session_shutdown", () => {
    stopAllSpinners(timers);
  });
}
