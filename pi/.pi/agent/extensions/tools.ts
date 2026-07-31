import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";


export default function toolsExtension(pi: ExtensionAPI) {

  pi.registerCommand("tools", {
    description: "Show currently active tools",
    handler: async (_args, ctx) => {
      const activeTools = pi.getActiveTools();
      const message =
        activeTools.length > 0
          ? `Active tools: ${activeTools.join(", ")}`
          : "No tools are currently active.";

      ctx.ui.notify(message, "info");
    },
  });
}
