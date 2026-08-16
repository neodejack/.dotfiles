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
command so arguments can be added before submission.

## Status markers

| Tools | Running | Success | Failure |
| --- | --- | --- | --- |
| `bash` | Animated accent-colored blinking indicator | Green `$` | Red `$` |
| Every other tool, including `edit` and `web_search` | Animated accent-colored blinking indicator | Green `■` | Red `■` |

Each tool starts its own one-cell animation with four `▁`/blank/`■`/blank
cycles. It then shows four independently randomized horizontal-line heights,
with a blank between each height to preserve the blinking effect. Adjacent
heights may repeat. The sequence pauses briefly and loops while the tool
remains active. Lines and squares retain their original 300/200 ms visible
durations, while ordinary blank transitions last 50 ms for a faster blink.

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
interception, fallback result rendering, tool-theme delegation, rounded
editor layout, command-palette behavior, and a guard against package-internal
imports.
