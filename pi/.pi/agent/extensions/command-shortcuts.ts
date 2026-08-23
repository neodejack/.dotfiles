import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const COMMAND_SHORTCUTS = [
  {
    key: "alt+l",
    command: "plannotator-last",
    description: "Annotate the last assistant message",
  },
] as const;

export default function commandShortcutsExtension(pi: ExtensionAPI): void {
  for (const shortcut of COMMAND_SHORTCUTS) {
    pi.registerShortcut(shortcut.key, {
      description: shortcut.description,
      handler: (ctx) => {
        const commandAvailable = pi.getCommands().some(
          (command) => command.name === shortcut.command,
        );
        if (!commandAvailable) {
          ctx.ui.notify(`Command /${shortcut.command} is unavailable`, "error");
          return;
        }

        pi.sendUserMessage(`/${shortcut.command}`, {
          expandPromptTemplates: true,
        });
      },
    });
  }
}
