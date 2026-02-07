add_next() {
  gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to add 'next' label" | awk '{print $1}' | xargs -I {} gh issue edit {} --add-label next
}

remove_next() {
  gh issue list --label next --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to remove 'next' label" | awk '{print $1}' | xargs -I {} gh issue edit {} --remove-label next
}

view_i() {
  gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
    fzf --header "Select issue to view" | awk '{print $1}' | xargs -I {} gh issue view {}
}
