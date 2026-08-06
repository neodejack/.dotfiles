# Pi Amp-style tool renderer

A small Pi extension that gives built-in and extension-provided tools,
submitted prompts, and the input editor an Amp-inspired appearance.

## Prompt and editor styling

- Submitted prompts use green text on the terminal background instead of an
  opaque message background.
- The input editor uses a white four-sided border with rounded corners and
  keeps at least three prompt rows visible.
- The editor border is white and carries current context tokens, model, effort,
  working directory, and Git branch in an Amp-style responsive layout.
- The built-in footer is reduced to extension statuses such as MCP connection
  state; those statuses remain visible below the editor.
- `Ctrl-O` opens a centered command palette for built-in, extension, prompt,
  and skill commands. Type to fuzzy-filter command names, use `Ctrl-P`/`Ctrl-N`
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
extension commands run when selected with `Enter`; prompt and skill commands
are inserted into the editor for review. `Tab` always inserts the selected
command so arguments can be added before submission.

## Status markers

| Tools | Running | Success | Failure |
| --- | --- | --- | --- |
| `bash` | Animated accent-colored Braille | Green `$` | Red `$` |
| Every other tool, including `edit` and `web_search` | Animated accent-colored Braille | Green `✓` | Red `×` |

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
pi -e ~/.pi/agent/extensions/pi-tool-renderer/src/index.ts
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

The automated checks cover the spinner state machine, timer cleanup,
family-specific status markers, native-renderer delegation, injected-tool
interception, fallback result rendering, prompt-theme delegation, rounded
editor layout, command-palette behavior, and a guard against package-internal
imports.
