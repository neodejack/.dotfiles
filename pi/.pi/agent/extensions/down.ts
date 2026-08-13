import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";

type ScrollableFullscreenTui = TUI & {
  scrollToBottom(): void;
};

function canScrollTranscript(tui: TUI): tui is ScrollableFullscreenTui {
  return tui.mode === "fullscreen" && "scrollToBottom" in tui
    && typeof tui.scrollToBottom === "function";
}

const emptyComponent: Component = {
  render: () => [],
  invalidate: () => {},
};

export default function (pi: ExtensionAPI): void {
  pi.registerCommand("down", {
    description: "Scroll the fullscreen transcript to the bottom",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") return;

      await ctx.ui.custom<void>((tui, _theme, _keybindings, done) => {
        if (canScrollTranscript(tui)) {
          tui.scrollToBottom();
        } else {
          ctx.ui.notify("/down requires fullscreen TUI mode", "warning");
        }

        done();
        return emptyComponent;
      });
    },
  });
}
