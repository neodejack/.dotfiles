try() {
  local out
  out=$(/usr/bin/env ruby '/opt/homebrew/bin/try' exec --path "$HOME/code/tries" "$@" 2>/dev/tty)
  if [ $? -eq 0 ]; then
    eval "$out"
  else
    echo "$out"
  fi
}
