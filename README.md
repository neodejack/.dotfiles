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

- Install stow: `brew install stow`
- Clone to `~/.dotfiles` if not already there
- Stow the packages you want into `$HOME`:

```bash
cd ~/.dotfiles
# dry run first (optional)
stow -nvt ~ aerospace wezterm zsh starship markdownlint ripgrep yazi nvim git tmux ideavim

# then apply
stow -vt ~ aerospace wezterm zsh starship markdownlint ripgrep yazi nvim git tmux ideavim
```

Notes:
- If Stow reports conflicts, move/backup the existing files first (see `migration.md`).
- Unstow with `stow -Dvt ~ <pkg>`.

## Package Notes

- iTerm: import `catppuccin-macchiato.itermcolors`.
- zsh: `.zshrc` is provided; it initializes starship/zoxide/atuin.
- tmux: after stowing, start tmux and install plugins with `<prefix> + I` (default prefix is `Ctrl-b` unless changed). Reload with `tmux source-file ~/.tmux.conf`.
- neovim: stowing `nvim` creates `~/.config/nvim` with LazyVim-based config.
- git: stowing `git` creates `~/.gitconfig`.
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
