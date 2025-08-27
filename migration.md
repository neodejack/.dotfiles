# Dotfiles migration to GNU Stow

This repo has been reorganized into Stow packages. Below are plain commands you can copy/paste to remove old symlinks and then create new ones with GNU Stow.

## Remove old symlinks

```
rm -f ~/.aerospace.toml
rm -f ~/.wezterm.lua
rm -f ~/.zshrc
rm -f ~/.zsh/path.zsh
rm -f ~/.zsh/work.zsh
rm -f ~/.zsh/bat.zsh
rm ~/.zsh
rm -f ~/.claude/settings.local.json
rm ~/.claude
rm -f ~/.config/starship.toml
rm -f ~/.markdownlint-cli2.yaml
rm -f ~/.ripgreprc
rm -f ~/.ideavimrc
rm -f ~/.config/atuin/config.toml
rm -f ~/.tmux.conf
rm ~/.config/yazi
rm ~/.config/nvim
```

## Create new symlinks with Stow

```
cd ~/.dotfiles
stow -vt ~ aerospace
stow -vt ~ wezterm
stow -vt ~ zsh
stow -vt ~ claude
stow -vt ~ starship
stow -vt ~ markdownlint
stow -vt ~ ripgrep
stow -vt ~ ideavim
stow -vt ~ atuin
stow -vt ~ tmux
stow -vt ~ yazi
stow -vt ~ nvim
```

Notes:
- If any path above is not a symlink or does not exist, `rm` will print an error — that’s OK to ignore.
- For safety, the `rm` commands do not remove real directories; they only remove files or directory symlinks.
- Consider `stow -nvt ~ <pkg>` for a dry run before applying.
