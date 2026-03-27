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

Codex's `~/.codex/config.toml` mixes host-agnostic settings (model, features, plugins) with host-specific settings (trusted project paths). To avoid committing machine-specific paths, the config is split into two source files:

- `config.base.toml` — **tracked** — shared settings across all machines
- `config.local.toml` — **git-ignored** — host-specific `[projects.*]` entries

Stow only symlinks the generated `config.toml`; the source files are excluded via `.stow-local-ignore`.

| Scenario | Command |
|---|---|
| Setting up a new machine | Create `codex/.codex/config.local.toml` with your local project paths, then `just codex gen` |
| After pulling dotfile updates | `just codex gen` to rebuild `config.toml` |
| Codex changed a shared setting (e.g. model) | `just codex pull` then commit `config.base.toml` |
| Codex added a new trusted path | `just codex pull` — the path stays in `config.local.toml` (git-ignored) |

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
