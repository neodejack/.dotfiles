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
