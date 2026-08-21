import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";
import {
  fuzzyFilter,
  Key,
  matchesKey,
  truncateToWidth,
  visibleWidth,
  type Component,
  type EditorComponent,
  type KeybindingsManager,
  type TUI,
} from "@earendil-works/pi-tui";

const MAX_VISIBLE_COMMANDS = 12;
const MIN_PALETTE_WIDTH = 40;
const SIDE_PADDING = 1;
const TITLE = " Command Palette ";
const PROMPT_PRESERVING_COMMANDS = new Set([
  "fast",
  "plannotator-last",
  "plannotator-review",
  "ship",
  "ship-vm-service",
]);

export interface CommandPaletteItem {
  name: string;
  description?: string;
  source: "builtin" | "extension" | "prompt";
}

export interface CommandPaletteResult {
  command: string;
  action: "insert" | "submit" | "submit-preserving-prompt";
}

// Pi's public getCommands() deliberately omits interactive built-ins. Keep this
// list aligned with BUILTIN_SLASH_COMMANDS in the supported Pi version.
export const BUILTIN_COMMANDS: readonly CommandPaletteItem[] = [
  { name: "settings", description: "Open settings menu", source: "builtin" },
  { name: "model", description: "Select model", source: "builtin" },
  { name: "scoped-models", description: "Configure models used for cycling", source: "builtin" },
  { name: "export", description: "Export the current session", source: "builtin" },
  { name: "import", description: "Import and resume a session", source: "builtin" },
  { name: "share", description: "Share the session as a secret gist", source: "builtin" },
  { name: "copy", description: "Copy the last agent message", source: "builtin" },
  { name: "name", description: "Set the session display name", source: "builtin" },
  { name: "session", description: "Show session information and statistics", source: "builtin" },
  { name: "changelog", description: "Show changelog entries", source: "builtin" },
  { name: "hotkeys", description: "Show keyboard shortcuts", source: "builtin" },
  { name: "fork", description: "Fork from a previous user message", source: "builtin" },
  { name: "clone", description: "Duplicate the current session", source: "builtin" },
  { name: "tree", description: "Navigate the session tree", source: "builtin" },
  { name: "trust", description: "Save the project trust decision", source: "builtin" },
  { name: "login", description: "Configure provider authentication", source: "builtin" },
  { name: "logout", description: "Remove provider authentication", source: "builtin" },
  { name: "new", description: "Start a new session", source: "builtin" },
  { name: "compact", description: "Compact the session context", source: "builtin" },
  { name: "resume", description: "Resume another session", source: "builtin" },
  { name: "reload", description: "Reload Pi configuration and resources", source: "builtin" },
  { name: "quit", description: "Quit Pi", source: "builtin" },
];

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function padVisible(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - visibleWidth(value)))}`;
}

function dedupeCommands(items: readonly CommandPaletteItem[]): CommandPaletteItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) {
      return false;
    }
    seen.add(item.name);
    return true;
  });
}
export function commandPaletteItems(pi: ExtensionAPI): CommandPaletteItem[] {
  return dedupeCommands([
    ...BUILTIN_COMMANDS,
    ...pi.getCommands().flatMap((command): CommandPaletteItem[] => (
      command.source === "skill"
        ? []
        : [{
          name: command.name,
          description: command.description,
          source: command.source,
        }]
    )),
  ]);
}

export function defaultCommandAction(
  item: CommandPaletteItem,
): CommandPaletteResult["action"] {
  if (PROMPT_PRESERVING_COMMANDS.has(item.name)) {
    return "submit-preserving-prompt";
  }
  if (item.source === "prompt") {
    return "insert";
  }
  return "submit";
}

export class CommandPaletteOverlay implements Component {
  private query: string;
  private selectedIndex = 0;
  private scrollOffset = 0;

  constructor(
    private readonly items: readonly CommandPaletteItem[],
    initialQuery: string,
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly keybindings: KeybindingsManager,
    private readonly done: (result: CommandPaletteResult | undefined) => void,
  ) {
    this.query = initialQuery.replace(/^\//, "");
  }

  invalidate(): void {}

  handleInput(data: string): void {
    const filtered = this.filteredItems();

    if (
      this.keybindings.matches(data, "tui.select.cancel")
      || matchesKey(data, Key.escape)
    ) {
      this.done(undefined);
      return;
    }

    if (this.keybindings.matches(data, "tui.select.up")) {
      this.selectedIndex = filtered.length === 0
        ? 0
        : Math.max(0, this.selectedIndex - 1);
      this.ensureSelectionVisible();
      this.tui.requestRender();
      return;
    }

    if (this.keybindings.matches(data, "tui.select.down")) {
      this.selectedIndex = filtered.length === 0
        ? 0
        : Math.min(filtered.length - 1, this.selectedIndex + 1);
      this.ensureSelectionVisible();
      this.tui.requestRender();
      return;
    }

    if (this.keybindings.matches(data, "tui.select.pageUp")) {
      this.selectedIndex = Math.max(
        0,
        this.selectedIndex - MAX_VISIBLE_COMMANDS,
      );
      this.ensureSelectionVisible();
      this.tui.requestRender();
      return;
    }

    if (this.keybindings.matches(data, "tui.select.pageDown")) {
      this.selectedIndex = filtered.length === 0
        ? 0
        : Math.min(
          filtered.length - 1,
          this.selectedIndex + MAX_VISIBLE_COMMANDS,
        );
      this.ensureSelectionVisible();
      this.tui.requestRender();
      return;
    }

    if (
      this.keybindings.matches(data, "tui.input.tab")
      || matchesKey(data, Key.tab)
    ) {
      const selected = filtered[this.selectedIndex];
      this.done(selected
        ? { command: selected.name, action: "insert" }
        : undefined);
      return;
    }

    if (this.keybindings.matches(data, "tui.select.confirm")) {
      const selected = filtered[this.selectedIndex];
      this.done(selected
        ? { command: selected.name, action: defaultCommandAction(selected) }
        : undefined);
      return;
    }

    if (this.isClearQuery(data)) {
      this.query = "";
      this.resetSelection();
      return;
    }

    if (
      this.keybindings.matches(data, "tui.editor.deleteCharBackward")
      || matchesKey(data, Key.backspace)
    ) {
      this.query = this.query.slice(0, -1);
      this.resetSelection();
      return;
    }

    if (data.length === 1 && data >= " " && data !== "\x7f") {
      this.query += data;
      this.resetSelection();
    }
  }

  render(width: number): string[] {
    const boxWidth = Math.max(MIN_PALETTE_WIDTH, width);
    const contentWidth = Math.max(1, boxWidth - 2 - SIDE_PADDING * 2);
    const filtered = this.filteredItems();
    this.selectedIndex = filtered.length === 0
      ? 0
      : Math.min(this.selectedIndex, filtered.length - 1);
    this.ensureSelectionVisible();

    const rows = filtered
      .slice(this.scrollOffset, this.scrollOffset + MAX_VISIBLE_COMMANDS)
      .map((item, index) => this.renderItem(
        item,
        this.scrollOffset + index === this.selectedIndex,
        contentWidth,
      ));

    if (rows.length === 0) {
      rows.push(this.theme.fg("warning", "No commands match"));
    }

    return [
      this.topBorder(boxWidth),
      this.wrapContent(
        `${this.theme.fg("dim", "> ")}${this.theme.fg("text", this.query)}`,
        boxWidth,
      ),
      this.wrapContent("", boxWidth),
      ...rows.map((row) => this.wrapContent(row, boxWidth)),
      this.wrapContent(this.countLabel(filtered.length), boxWidth),
      this.bottomBorder(boxWidth),
    ];
  }

  private filteredItems(): CommandPaletteItem[] {
    const deduped = dedupeCommands(this.items);
    if (!this.query.trim()) {
      return deduped;
    }
    return fuzzyFilter(deduped, this.query, (item) => oneLine(item.name));
  }

  private renderItem(
    item: CommandPaletteItem,
    selected: boolean,
    width: number,
  ): string {
    const sourceWidth = Math.min(10, Math.max(7, Math.floor(width * 0.18)));
    const descriptionWidth = Math.max(0, Math.floor(width * 0.42));
    const nameWidth = Math.max(8, width - sourceWidth - descriptionWidth - 4);
    const marker = selected ? this.theme.fg("accent", "→ ") : "  ";
    const source = this.theme.fg(
      "muted",
      truncateToWidth(item.source, sourceWidth, "…"),
    );
    const name = this.theme.fg(
      selected ? "accent" : "text",
      truncateToWidth(oneLine(item.name), nameWidth, "…"),
    );
    const description = item.description
      ? this.theme.fg(
        selected ? "text" : "muted",
        truncateToWidth(oneLine(item.description), descriptionWidth, "…"),
      )
      : "";

    return truncateToWidth(
      `${padVisible(`${marker}${source}`, sourceWidth + 2)}`
        + `${padVisible(name, nameWidth + 2)}${description}`,
      width,
      "",
      true,
    );
  }

  private countLabel(total: number): string {
    const visible = Math.min(total, MAX_VISIBLE_COMMANDS);
    const label = total > MAX_VISIBLE_COMMANDS
      ? `(${visible}/${total})`
      : `(${total})`;
    return this.theme.fg("dim", label);
  }

  private topBorder(width: number): string {
    const innerWidth = Math.max(0, width - 2);
    const titleWidth = visibleWidth(TITLE);
    if (innerWidth <= titleWidth + 2) {
      return this.theme.fg("accent", `╭${"─".repeat(innerWidth)}╮`);
    }
    const left = Math.floor((innerWidth - titleWidth) / 2);
    const right = innerWidth - titleWidth - left;
    return this.theme.fg("accent", `╭${"─".repeat(left)}`)
      + this.theme.fg("accent", this.theme.bold(TITLE))
      + this.theme.fg("accent", `${"─".repeat(right)}╮`);
  }

  private bottomBorder(width: number): string {
    const hint = " type to filter · tab insert · enter select · esc close ";
    const innerWidth = Math.max(0, width - 2);
    if (visibleWidth(hint) + 1 > innerWidth) {
      return this.theme.fg("accent", `╰${"─".repeat(innerWidth)}╯`);
    }
    const fill = innerWidth - visibleWidth(hint);
    return this.theme.fg("accent", `╰${"─".repeat(fill)}`)
      + this.theme.fg("dim", hint)
      + this.theme.fg("accent", "╯");
  }

  private wrapContent(value: string, width: number): string {
    const innerWidth = Math.max(1, width - 2 - SIDE_PADDING * 2);
    const clipped = truncateToWidth(value, innerWidth, "", true);
    return this.theme.fg("accent", "│")
      + " ".repeat(SIDE_PADDING)
      + padVisible(clipped, innerWidth)
      + " ".repeat(SIDE_PADDING)
      + this.theme.fg("accent", "│");
  }

  private ensureSelectionVisible(): void {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (
      this.selectedIndex >= this.scrollOffset + MAX_VISIBLE_COMMANDS
    ) {
      this.scrollOffset = this.selectedIndex - MAX_VISIBLE_COMMANDS + 1;
    }
  }

  private resetSelection(): void {
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.tui.requestRender();
  }

  private isClearQuery(data: string): boolean {
    return data === "\x15"
      || this.keybindings.matches(data, "tui.editor.deleteToLineStart")
      || matchesKey(data, Key.ctrl("u"));
  }
}

export function applyCommandPaletteResult(
  editor: EditorComponent,
  result: CommandPaletteResult,
): void {
  const commandText = `/${result.command}`;
  if (result.action === "insert") {
    editor.setText(`${commandText} `);
    return;
  }

  const preservedPrompt = result.action === "submit-preserving-prompt"
    ? editor.getExpandedText?.() ?? editor.getText()
    : undefined;
  if (preservedPrompt !== undefined && editor.onSubmit) {
    editor.onSubmit(commandText);
    const currentPrompt = editor.getExpandedText?.() ?? editor.getText();
    if (currentPrompt !== preservedPrompt) {
      editor.setText(preservedPrompt);
    }
    return;
  }

  editor.setText(commandText);
  const submitValue = (editor as EditorComponent & {
    submitValue?: () => void;
  }).submitValue;
  if (typeof submitValue === "function") {
    submitValue.call(editor);
    if (preservedPrompt !== undefined) {
      editor.setText(preservedPrompt);
    }
    return;
  }

  editor.setText("");
  editor.onChange?.("");
  editor.onSubmit?.(commandText);
  if (preservedPrompt !== undefined) {
    editor.setText(preservedPrompt);
  }
}

export function registerCommandPaletteShortcut(
  pi: ExtensionAPI,
  getEditor: () => EditorComponent | undefined,
): void {
  let paletteOpen = false;

  pi.registerShortcut("ctrl+o", {
    description: "Open command palette",
    handler: async (ctx: ExtensionContext) => {
      if (!ctx.hasUI || paletteOpen) {
        return;
      }

      paletteOpen = true;
      try {
        const result = await ctx.ui.custom<CommandPaletteResult | undefined>(
          (tui, theme, keybindings, done) => new CommandPaletteOverlay(
            commandPaletteItems(pi),
            "",
            tui,
            theme,
            keybindings,
            done,
          ),
          {
            overlay: true,
            overlayOptions: {
              anchor: "center",
              width: "90%",
              minWidth: 42,
              maxHeight: "80%",
              margin: 1,
            },
            onHandle: (handle) => handle.focus(),
          },
        );

        if (!result) {
          return;
        }

        const editor = getEditor();
        if (!editor) {
          ctx.ui.notify("Command palette editor is unavailable", "error");
          return;
        }
        applyCommandPaletteResult(editor, result);
      } finally {
        paletteOpen = false;
      }
    },
  });
}
