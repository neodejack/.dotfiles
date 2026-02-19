add_next() {
  gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to add 'next' label" | awk '{print $1}' | xargs -I {} gh issue edit {} --add-label next
}

view_next() {
  local issue_number
  issue_number=$(gh issue list --label next --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select a next issue to view" | awk '{print $1}')
  [ -z "$issue_number" ] && return 1
  gh issue view "$issue_number"
}

_close_issue_with_ref() {
  local issue_number="$1"

  echo -n "Close with (p)r or (c)ommit? "
  read -r close_type

  local since_date ref
  since_date=$(date -v-20d +%Y-%m-%d 2>/dev/null || date -d "20 days ago" +%Y-%m-%d)

  if [[ "$close_type" == "p" ]]; then
    ref=$(gh pr list -s all --search "created:>=$since_date" --json number,title \
      -q $'.[] | "#\\(.number)\t\\(.title)"' |
      fzf --header "Select PR that fixed #$issue_number" --delimiter=$'\t' --with-nth=1,2 |
      awk -F$'\t' '{print $1}')
  elif [[ "$close_type" == "c" ]]; then
    ref=$(git log --since="$since_date" --pretty=format:$'%h\t%s' |
      fzf --header "Select commit that fixed #$issue_number" --delimiter=$'\t' --with-nth=1,2 |
      awk -F$'\t' '{print $1}')
  else
    echo "Invalid option"; return 1
  fi

  [ -z "$ref" ] && return 1
  gh issue close "$issue_number" -c "fixed by $ref"
}

remove_next() {
  local issue_number
  issue_number=$(gh issue list --label next --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to remove 'next' label" | awk '{print $1}')
  [ -z "$issue_number" ] && return 1
  gh issue edit "$issue_number" --remove-label next

  echo -n "Close issue #$issue_number? (y/n) "
  read -r answer
  [[ "$answer" != "y" ]] && return 0

  _close_issue_with_ref "$issue_number"
}

close_issue() {
  local issue_number
  issue_number=$(gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to close" | awk '{print $1}')
  [ -z "$issue_number" ] && return 1

  _close_issue_with_ref "$issue_number"

  # Remove 'next' label if present
  local labels
  labels=$(gh issue view "$issue_number" --json labels -q '.labels[].name')
  if echo "$labels" | grep -iqw "next"; then
    gh issue edit "$issue_number" --remove-label next
  fi
}

view_i() {
  gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to view" | awk '{print $1}' | xargs -I {} gh issue view {}
}
