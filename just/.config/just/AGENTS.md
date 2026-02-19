# Justfile Conventions

This is a **global justfile** (`just -g`) for commands available everywhere, aliased as `j`.
It is managed via GNU Stow from `~/.dotfiles/just/` and symlinked to `~/.config/just/justfile`.

## Recipe Rules

- Use `[script]` attribute instead of `#!/usr/bin/env bash` shebangs — the shell is set globally via `set shell`.
- Always add `set -euo pipefail` as the first line of every `[script]` recipe.
- Always add `[no-cd]` — global recipes should run in the caller's working directory.
- Always add `[group('name')]` to organize recipes in `just -g --list` output.
- Prefix internal helper recipes with `_` and mark them `[private]`.
- Add a comment above each recipe — it appears in `--list` output as documentation.
- Use `[no-exit-message]` on helper recipes that may exit non-zero intentionally (e.g. user cancellation).

## Structure

- `[default]` recipe runs `just -g --list` so bare `j` shows available commands.
- Recipes calling other global recipes must use `just -g <recipe>` (not plain `just`).
- Stack attributes above the recipe name, one per line: `[no-cd]`, `[group]`, `[script]`, etc.
- Use `mod <name>` in the root justfile to create subcommand groups (e.g. `j next add`).
- Module files are named `<name>.just` and live alongside the root justfile.
- Each module should have a `[default]` list recipe matching the root's `--list-heading` and `--list-prefix` styling.
- Shared helper recipes used by multiple modules stay in the root justfile as `[private]`.

## Do Not

- Do not use `#!/usr/bin/env bash` shebangs — use `[script]` attribute instead.
- Do not create local/project justfiles here — this is exclusively for global recipes.
