alias zshc="nvim ~/.zshrc"
alias ll="ls -l"

rp() {
  realpath "$@" | tee >(pbcopy)
}

# elixir
alias ex="elixir"
alias exdoc="mix hex.docs offline elixir"

#nvim as default
alias vim="nvim"

# kubectl stuff
alias k=kubectl

# lazygit
alias lg="lazygit"

# just global
alias j="just -g"

# plannotator
alias ptt="plannotator"

# kill zen
alias killzen=" pkill -f '/Applications/Zen.app/Contents/MacOS/zen'"

# codex
alias c="codex --dangerously-bypass-approvals-and-sandbox"
alias c_low="codex -c model_reasoning_effort=low"
alias c_paper="codex -c mcp_servers.paper.enabled=true --yolo"
alias c_chrome="codex -c mcp_servers.chrome-devtools=true --yolo"

alias cc="claude"

# Remote Herdr panes intentionally omit TERM_PROGRAM. Pi otherwise disables
# inline images, so advertise a Kitty-compatible terminal only for that case.
pi() {
  if [[ "${HERDR_ENV:-}" == "1" && -z "${TERM_PROGRAM:-}" ]]; then
    TERM_PROGRAM=WezTerm command pi "$@"
  else
    command pi "$@"
  fi
}

# wezterm features
alias tab="wezterm cli set-tab-title"
