# gcloud daily auth -----------------------------------------------------------
# Org policy requires re-running `gcloud auth login` ~once a day. `glogin`
# records the date on success; the startup check nudges when it wasn't today.
# `strftime` (zsh/datetime) gives the date with no `date` fork, keeping startup free.
# Keep both the command and its reminder off personal machines. Strip `.local`
# so the allowlist works whether macOS returns the short or mDNS hostname.
case "${HOST%.local}" in
  zilis-MacBook-Pro|zilis-Mac-mini) ;;
  *) return ;;
esac

_GLOGIN_STAMP="${XDG_CACHE_HOME:-$HOME/.cache}/glogin_last"
zmodload -i zsh/datetime

glogin() {
  local -a browser_args=()
  if [[ -n "$SSH_CONNECTION" || -n "$AMP_RUNNER_PORTALS_RUNNER_ID" ]]; then
    browser_args=(--no-launch-browser)
  elif [[ -n "$REX_SESSION" && -n "$REX_BLOCK" ]]; then
    # Check this pane's current owner, not other clients viewing the session.
    # Only a confirmed local connection should launch a browser on this host.
    local transport
    transport=$(rex --autostart=false --timeout 2s session inspect "$REX_SESSION" --json 2>/dev/null |
      jq -r --arg block "$REX_BLOCK" '
        ([.windows[].layers[].blocks[] | select(.block_id == $block) | .owner][0]) as $owner
        | .clients[] | select(.client_id == $owner) | .principal.transport
      ' 2>/dev/null)
    [[ "$transport" == unix || "$transport" == named_pipe ]] || browser_args=(--no-launch-browser)
  fi

  gcloud auth login "${browser_args[@]}" &&
    gcloud auth application-default login "${browser_args[@]}" || return
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
