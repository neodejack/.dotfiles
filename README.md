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
1. install tmux and go into it  using command `tmux new`
2. install the plugins by `<prefix> + I`, note that the default <prefix> is `Ctrl + b`
3. source the config file by
```bash
tmux source ~/.config/tmux/tmux.conf
```

### neovim
somehow after using the following command it worked (took this command from the packer github repo README.md)
```bash
nvim --headless -c 'autocmd User PackerComplete quitall' -c 'PackerSync'
```

## useful tools
1. glow

this is to easily read README.md file in the terminal

2. softserve

git



