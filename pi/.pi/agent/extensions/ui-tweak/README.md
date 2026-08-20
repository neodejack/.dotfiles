# Pi UI tweak

A small Pi extension that gives built-in and extension-provided tools and the
input editor an Amp-inspired appearance while preserving Pi's default user
message styling.

## Prompt and editor styling

- Submitted prompts keep the active Pi theme's default text and background.
- The input editor uses a white four-sided border with rounded corners and
  keeps at least three prompt rows visible.
- The editor border is white and carries current context tokens, model, effort,
  working directory, and Git branch in an Amp-style responsive layout.
- When the local `gpt-fast-mode` extension is enabled, the top border prefixes
  that metadata with a monochrome `ϟ ─` indicator. At narrow widths the `ϟ`
  remains visible after the other metadata is removed.
- The built-in footer is reduced to extension statuses such as MCP connection
  state; those statuses remain visible below the editor.
- `Ctrl-O` opens a centered command palette for built-in, extension, and prompt
  commands. Type to fuzzy-filter command names, use `Ctrl-P`/`Ctrl-N`
  or the arrow keys to navigate, press `Enter` to select, or press `Tab` to
  insert without running.
- Other theme colors and editor behavior are delegated to Pi unchanged.

Amp's short `┃` beside submitted prompts is intentionally not included. Pi
0.83.0 does not expose a public renderer hook for built-in user messages;
`registerMessageRenderer()` only applies to custom messages. Intercepting user
input would alter session semantics such as history and `/fork`.

## Command palette keybindings

The dotfiles-managed `keybindings.json` frees `Ctrl-O` for the palette and
moves Pi's context-sensitive display actions together:

| Context | Forward | Backward |
| --- | --- | --- |
| Tool output expansion | `Ctrl-L` | Toggle only |
| Session-tree filters | `Ctrl-L` | `Ctrl-Shift-B` |

Slash-command autocomplete remains available as a fallback. Built-in and
extension commands run when selected with `Enter`; prompt commands are inserted
into the editor for review. `Tab` always inserts the selected
command so arguments can be added before submission. Selecting `/fast` with
`Enter` toggles Fast mode without replacing text already in the editor.

## Status markers

| Tools | Running | Success | Failure |
| --- | --- | --- | --- |
| Every tool, including `bash`, `edit`, and `web_search` | Blinking `#F0E9E0` `■` | Static `#F0E9E0` `■` | Static theme-error red `■` |

Each running tool starts independently with a visible square for 400 ms,
followed by a reserved blank cell for 200 ms. This repeats until the tool
settles without shifting its text. Success immediately becomes a steady warm
white square; failure immediately becomes a steady theme-error red square.

Pi's streaming `Working...` row retains the full line/square/random-height
animation, now colored `#F0E9E0` from its first frame. The extension supplies
it through `ctx.ui.setWorkingIndicator` with a 50 ms base interval, repeating
frames to preserve the animation's variable visible and blank durations. Its
message is explicitly empty, leaving only the animated glyph visible.

The extension styles the actual definition attached to each on-screen tool
execution. It does not re-register tools, change schemas, or replace execution,
so definitions injected by other extensions keep their native call and result
renderers. Tools registered later in the session are covered automatically.

Pi does not currently expose a public hook for decorating definitions owned by
other extensions. The extension therefore intercepts public TUI
`Container.addChild()` calls, recognizes Pi tool-execution components by their
runtime shape, and replaces only the definition used by that component for
rendering. It does not import Pi package internals.

Tested against Pi 0.83.0. The source imports only the public entry points of
`@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui`.

## Development

```sh
pnpm install
pnpm check
```

## Run in a fresh Pi session

From any working directory:

```sh
pi -e ~/.pi/agent/extensions/ui-tweak/src/index.ts
```

The extension is loaded only into that newly started process. This command does
not alter already-running Pi sessions or permanently install the extension.

## Install through dotfiles

This directory belongs to the `pi` GNU Stow package in the dotfiles repository.
From the dotfiles root, apply the package with:

```sh
mise exec -- just apply
```

Stow links `~/.pi/agent/extensions` to the dotfiles-managed extensions
directory, where Pi discovers this extension automatically. Start a new Pi
process or use `/reload` after updating it.

## Verification

The automated checks cover the running-indicator state machine, timer cleanup,
family-specific status markers, native-renderer delegation, injected-tool
interception, fallback result rendering, rounded editor layout,
command-palette behavior, and a guard against package-internal imports.
