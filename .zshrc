if [ -n "${ZSH_DEBUGRC+1}" ]; then
    zmodload zsh/zprof
fi

## zsh-syntax-highlighting
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

ZSH_CONFIG_DIR="../.zsh"
# Load core modules
for module in "$ZSH_CONFIG_DIR"/work.zsh; do
  if [[ -f "$module" ]]; then
    source "$module"
  fi
done

# aliases
alias zshc="nvim ~/.zshrc"
alias ll="ls -l"

#nvim as default
alias vim="nvim"
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
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
# [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

eval "$(starship init zsh)"
eval "$(zoxide init --cmd cd zsh)"


[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export PATH="/opt/homebrew/opt/mysql-client@8.4/bin:$PATH"


if [ -n "${ZSH_DEBUGRC+1}" ]; then
    zprof
fi
