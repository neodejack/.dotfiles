# dotfiles

this repo keeps a track of how i change my setup
(mainly neovim)

## here is how to set up a new dev box

rename this directory from `~/.dotfiles` to `~/.config`

### iterm

import the color theme `catppuccin-macchiato.itermcolors`

### oh my zsh

install oh my zsh

throw the following line in `~/.zshrc`

```bash
eval "$(starship init zsh)"
```

### tmux

1. install tmux and go into it using command `tmux new`
2. install the plugins by `<prefix> + I`, note that the default <prefix> is `Ctrl + b`
3. source the config file by

```bash
tmux source ~/.config/tmux/tmux.conf
```

### neovim

use lazyvim. install lazyvim first. read their offical document to intsall

then copy the nvim/lua file in this repo to the nvim/lua of the new nvim install

be careful of the `lazy.lua` file. maybe we need to preserve the original file.

## useful tools

1. glow

this is to easily read README.md file in the terminal

2. softserve

git

## symlink dotfiles

ln -s ~/.dotfiles/.wezterm.lua ~/.wezterm.lua
ln -s ~/.dotfiles/.aerospace.toml ~/.aerospace.toml
ln -s ~/.dotfiles/.ripgreprc ~/.ripgreprc
ln -s ~/.dotfiles/nvim ~/.config/nvim
ln -s ~/.dotfiles/starship.toml ~/.config/starship.toml
ln -s ~/.dotfiles/.markdownlint-cli2.yaml ~/.config/.markdownlint-cli2.yaml
ln -s ~/.dotfiles/yazi ~/.config/yazi
ln -s ~/.dotfiles/atuin ~/.config/atuin

- [!] atuin symlink is a bit weird. after intsallation the atuin daemon will make sure that the ~/.config/atuin directory exists (creating one instantly if it's removed), so using the above symlink won't work (it will create a sysmlink inside the existing ~/.config/atuin/ dir). what i did just now is to uninstall the atuin altogother, create the sysmlink, then intsalling it again
