if [ -n "${ZSH_DEBUGRC+1}" ]; then
    zmodload zsh/zprof
fi


ZSH_CONFIG_DIR="$HOME/.zsh"
# Load core modules
for module in "$ZSH_CONFIG_DIR"/*.zsh; do
  if [[ -f "$module" ]]; then
    source "$module"
  fi
done

# Enable Ctrl-x-e to edit command line in $EDITOR
autoload -U edit-command-line
zle -N edit-command-line
bindkey "^X^E" edit-command-line  # Try Ctrl+X followed by Ctrl+E

# control left and right
bindkey "^[[1;5C" forward-word
bindkey "^[[1;5D" backward-word

# aliases
alias zshc="nvim ~/.zshrc"
alias ll="ls -l"
alias ex="elixir"

#nvim as default
alias vim="nvim"
alias EDITOR="nvim"
export VISUAL=nvim

# gopath
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# rg configuration
export RIPGREP_CONFIG_PATH=$HOME/.ripgreprc

# view the json in clipboard using jless
alias j="pbpaste | jless"

alias lg="lazygit"

# .nvm stuff. disable to debug slow start up time
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" --no-use # This loads nvm

eval "$(starship init zsh)"
eval "$(zoxide init --cmd cd zsh)"

export FZF_CTRL_R_OPTS="
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --color header:italic
  --header 'ctrl-y to copy command'"
export FZF_CTRL_T_OPTS="
  --preview 'bat -n --color=always {}'"

source <(fzf --zsh)
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export PATH="/opt/homebrew/opt/mysql-client@8.4/bin:$PATH"


## zsh-syntax-highlighting
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
if [ -n "${ZSH_DEBUGRC+1}" ]; then
    zprof
fi
