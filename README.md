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
stow -nvt ~ aerospace wezterm zsh starship markdownlint ripgrep yazi nvim git tmux ideavim lazygit
stow -nvt ~/.codex/  codex_skills

# then apply
stow -vt ~ aerospace wezterm zsh starship markdownlint ripgrep yazi nvim git tmux ideavim lazygit

stow -vt ~/.codex/  codex_skills
```

Notes:

- If Stow reports conflicts, move/backup the existing files first (see `migration.md`).
- Unstow with `stow -Dvt ~ <pkg>`.

## Package Notes

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

elixir, erlang are installed and managed by asdf.
there are some extra things needs to be done before installing erlang to make sure `:observer` works

```bash
brew install wxwidgets@3.2
export WX_CONFIG=/opt/homebrew/Cellar/wxwidgets@3.2/3.2.8.1/bin/wx-config-3.2
export KERL_CONFIGURE_OPTIONS="--with-wx-config=$WX_CONFIG"
asdf install erlang 27.3
```

[resource](https://erlangforums.com/t/kerl-build-of-erlang-problem-with-wx-on-mac/2411/11)
