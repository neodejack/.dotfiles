try() {
  local out
  out=$(ruby '/opt/homebrew/Cellar/try/1.9.3/libexec/gems/try-cli-1.9.3/try.rb' exec --path "$HOME/code/personal/tries" "$@" 2>/dev/tty)
  if [ $? -eq 0 ]; then
    eval "$out"
  else
    echo "$out"
  fi
}
