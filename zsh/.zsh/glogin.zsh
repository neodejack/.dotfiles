# gcloud daily auth -----------------------------------------------------------
# Org policy requires re-running `gcloud auth login` ~once a day. `glogin`
# records the date on success; the startup check nudges when it wasn't today.
# `strftime` (zsh/datetime) gives the date with no `date` fork, keeping startup free.
_GLOGIN_STAMP="${XDG_CACHE_HOME:-$HOME/.cache}/glogin_last"
zmodload -i zsh/datetime

glogin() {
  gcloud auth login && gcloud auth application-default login || return
  local today; strftime -s today '%F' $EPOCHSECONDS
  mkdir -p "${_GLOGIN_STAMP:h}"
  print -r -- "$today" >| "$_GLOGIN_STAMP"
  print -P "%F{green}✔ gcloud auth refreshed for ${today}.%f"
}

# Passive reminder on each new interactive shell if the last glogin wasn't today.
_glogin_check() {
  [[ -o interactive ]] || return
  local last="" today
  strftime -s today '%F' $EPOCHSECONDS
  [[ -f "$_GLOGIN_STAMP" ]] && last=$(<"$_GLOGIN_STAMP")
  if [[ "$last" != "$today" ]]; then
    print -P "%F{yellow}⚠️  gcloud auth is stale (last login: ${last:-never}).%f"
    print -P "%F{yellow}   Run %Bglogin%b to refresh.%f"
  fi
}
_glogin_check
