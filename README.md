# dotfiles

Personal dotfiles managed with GNU Stow. Each top‑level folder here is a Stow “package” that mirrors its target location under `$HOME`.

## how to use

bootstrap by installing homebrew and stuff in brewbundle

```bash
cd ~/.dotfiles
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle
```

then run stow

```bash
# dry run first (optional)
just test

# then apply
just apply

# unstow
just unstow <pkg>
```

- Unstow with `stow -Dvt ~ <pkg>`.

### agents

AI agent skills are in (`~/.agents`). Skills installed via `npx skills`are both managed here.

### codex

Codex uses a split config so machine-specific trusted paths do not get committed:

- `config.base.toml`: tracked shared settings
- `config.local.toml`: git-ignored local paths
- `config.toml`: generated file Codex actually reads

Ownership is explicit:

- `config.base.toml` is the source of truth for shared settings
- `config.local.toml` is the source of truth for local machine state such as `[projects.*]`
- `config.toml` may accumulate live edits made by Codex itself, but those are only adopted when you ask for it

Use:

- `just codex gen` to rebuild `config.toml` from `base + local`
- `just codex pull` to import local-only live changes from `config.toml` into `config.local.toml`, then regenerate
- `just codex promote` to adopt shared live changes from `config.toml` into `config.base.toml`, then regenerate
- `just codex adopt` to adopt both shared and local live changes when `config.toml` has both
- `just codex check` to classify drift and tell you which command to run; this also runs in the `lefthook` pre-commit hook

Typical cases:

- you hand-edit `config.base.toml`: run `just codex gen`
- Codex adds a trusted project to `config.toml`: run `just codex pull`
- Codex adds a shared setting such as `service_tier = "fast"` to `config.toml`: run `just codex promote`
- `config.toml` has both a new trusted project and a new shared setting: run `just codex adopt`

### Atuin special case

Atuin recreates its config directory automatically. If stowing `atuin` fails or nests a symlink incorrectly, do:

```bash
brew uninstall atuin
rm -rf ~/.config/atuin/
cd ~/.dotfiles && stow -vt ~ atuin
brew install atuin
```

## Elixir/Erlang installation

elixir, erlang, python, node are installed and managed by mise

```bash
mise i
```
