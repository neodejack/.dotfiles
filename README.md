# dotfiles

Personal dotfiles managed with GNU Stow. Each top‑level folder here is a Stow “package” that mirrors its target location under `$HOME`.

## New machine: configure Git and clone first

Before installing these dotfiles, follow [`git/README.md`](git/README.md) to:

1. create the canonical personal and work directories;
2. configure the personal and work SSH keys;
3. add the public keys to the corresponding GitHub accounts; and
4. clone this repository to `~/code/personal/.dotfiles`.

The remaining setup assumes the repository is at that path.

## Install dependencies and dotfiles

Install Homebrew and the dependencies declared in the repository's `Brewfile`:

```bash
cd ~/code/personal/.dotfiles
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle
```

Then apply the Stow packages. Because `just` is managed by `mise` and the
`mise` shell integration is installed by the `zsh` package, use
`mise exec --` during initial setup:

```bash
# dry run first (optional)
mise exec -- just test

# then apply
mise exec -- just apply

# unstow
mise exec -- just unstow <pkg>
```

- Alternatively, unstow directly with `stow -Dvt ~ <pkg>`.

## Atuin special case

Atuin recreates its config directory automatically. If stowing `atuin` fails or nests a symlink incorrectly, do:

```bash
brew uninstall atuin
rm -rf ~/.config/atuin/
cd ~/code/personal/.dotfiles && stow -vt ~ atuin
brew install atuin
```

## Elixir/Erlang installation

elixir, erlang, python, node are installed and managed by mise

```bash
mise i
```
