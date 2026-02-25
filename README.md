# dotfiles

Personal dotfiles managed with GNU Stow. Each top‑level folder here is a Stow “package” that mirrors its target location under `$HOME`.

## Bootstrap (Brewfile)

- Install Homebrew (if needed): `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Install packages from `Brewfile`:

```bash
cd ~/.dotfiles
brew bundle   # installs taps, brew formulas, and casks
```

Note:

- Stow is required for the steps below. If it isn’t in your Brewfile, run `brew install stow`.

## Quick Start (new machine)

- Clone to `~/.dotfiles` if not already there
- Stow the packages you want into `$HOME`:

```bash
cd ~/.dotfiles
# dry run first (optional)
stow -nvt ~ aerospace wezterm zsh starship markdownlint ripgrep yazi nvim git tmux ideavim lazygit mise codex just agents

# then apply
stow -vt ~ aerospace wezterm zsh starship markdownlint ripgrep yazi nvim git tmux ideavim lazygit mise codex just agents
```

Notes:

- If Stow reports conflicts, move/backup the existing files first (see `migration.md`).
- Unstow with `stow -Dvt ~ <pkg>`.

## Package Notes

### agents

AI agent skills (`~/.agents`). Skills installed via `npx skills` and custom skills are both managed here. Because stow folds the directory into a single symlink, any new skills installed by `npx skills` are automatically written into this dotfiles repo.

**On a fresh machine:** stow `agents` before running `npx skills install`, otherwise npx creates a real `~/.agents/` directory and stow will conflict.

- zsh: `.zshrc` is provided; it initializes starship/zoxide/atuin.
- raycast: add `~/.dotfiles/raycast-scripts` in Raycast settings if you want those scripts.

### Atuin special case

Atuin recreates its config directory automatically. If stowing `atuin` fails or nests a symlink incorrectly, do:

```bash
brew uninstall atuin
rm -rf ~/.config/atuin/
cd ~/.dotfiles && stow -vt ~ atuin
brew install atuin
```

## Maintenance

- Add new files in the corresponding package mirroring the target path (e.g., put `~/.wezterm.lua` under `wezterm/.wezterm.lua`).
- Use `stow -nvt ~ <pkg>` to preview changes; `stow -Dvt ~ <pkg>` to remove symlinks.
- See `migration.md` for the one‑time migration steps and more details.

## Elixir/Erlang installation

elixir, erlang, python, node are installed and managed by mise

```bash
mise i
```
