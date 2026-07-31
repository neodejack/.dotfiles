# Pi Amp-style tool renderer

A small Pi extension that removes colored tool-call backgrounds and adds an
Amp-inspired status marker to selected built-in tools.

## Status markers

| Tools | Running | Success | Failure |
| --- | --- | --- | --- |
| `bash` | Animated accent-colored Braille | Green `$` | Red `$` |
| `read`, `write`, `grep`, `find`, `ls` | Animated accent-colored Braille | Green `✓` | Red `×` |

The extension delegates schemas and execution to Pi's public built-in tool
definitions. It leaves `edit`, apply-patch, and MCP tools unchanged.
It only overrides supported tools that are already active when the session
starts, so installing it does not enable optional tools such as `grep`, `find`,
or `ls`.

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
family-specific status markers, native-renderer delegation, registration scope,
and a guard against package-internal imports.

A fresh, ephemeral Pi session was also used to exercise all six overridden
tools plus an unchanged `edit` call. It was started with `--no-session`; it did
not attach to or modify any existing Pi session.
