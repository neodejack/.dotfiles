if [ -n "${ZSH_DEBUGRC+1}" ]; then
  zmodload zsh/zprof
fi

autoload -Uz compinit
compinit

ZSH_CONFIG_DIR="$HOME/.zsh"
# Load core modules
for module in "$ZSH_CONFIG_DIR"/*.zsh; do
  if [[ -f "$module" ]]; then
    source "$module"
  fi
done

# Enable Ctrl-g to edit command line in $EDITOR
autoload -U edit-command-line
zle -N edit-command-line
bindkey "^G" edit-command-line

# control left and right
bindkey "^[[1;5C" forward-word
bindkey "^[[1;5D" backward-word


#nvim as default
export EDITOR=nvim
export VISUAL=nvim


# rg configuration
export RIPGREP_CONFIG_PATH=$HOME/.ripgreprc

# change lazygit config location https://github.com/jesseduffield/lazygit/blob/master/docs/Config.md#user-config
export XDG_CONFIG_HOME="$HOME/.config"

# iex persistent history
export ERL_AFLAGS='-kernel shell_history enabled'

eval "$(starship init zsh)"
eval "$(zoxide init zsh)"

# export FZF_CTRL_R_OPTS="
#   --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
#   --color header:italic
#   --header 'ctrl-y to copy command'"
# export FZF_CTRL_T_OPTS="
#   --preview 'bat -n --color=always {}'"
#
# source <(fzf --zsh)

## atuin
eval "$(atuin init zsh --disable-up-arrow)"

## direnv
eval "$(direnv hook zsh)"

## mise
eval "$(mise activate zsh)"

if [ -n "${ZSH_DEBUGRC+1}" ]; then
  zprof
fi
