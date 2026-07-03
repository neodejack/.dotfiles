kf() {
  if ! command -v fzf >/dev/null 2>&1; then
    print -u2 -- "kf: fzf is required but was not found"
    return 1
  fi

  local -a kubeconfigs
  kubeconfigs=("$HOME"/.kube/kf*(N-.))

  if (( ${#kubeconfigs} == 0 )); then
    print -u2 -- "kf: no kubeconfig files found in $HOME/.kube matching kf*"
    return 1
  fi

  local selected
  selected=$(printf '%s\n' "${kubeconfigs[@]}" | fzf --prompt='kubeconfig> ') || return 0
  [[ -n "$selected" ]] || return 0

  export KUBECONFIG="$selected"
  print -r -- "KUBECONFIG=$KUBECONFIG"
}
