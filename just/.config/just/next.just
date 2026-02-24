# Recipes for managing 'next' labelled issues

label := "NEXT"

alias a := add
alias rm := remove
alias s := setup
alias v := view

# List available next recipes
[default]
list:
    @just -g --list next --list-heading $'Hey Mr.Scott whatcha gonna do\n' --list-prefix '~> '

# Add 'next' label to an issue
[no-cd]
[group('gh')]
[script]
add:
    set -euo pipefail
    gh issue list --json number,title,labels -q '[.[] | select(all(.labels[]; .name != "{{label}}"))] | .[] | "\(.number)\t\(.title)"' |
      fzf --header "Select issue to add '{{label}}' label" | awk '{print $1}' | xargs -I {} gh issue edit {} --add-label {{label}}

# View a 'next' labelled issue
[no-cd]
[group('gh')]
[script]
view:
    set -euo pipefail
    issue_number=$(gh issue list --label {{label}} --json number,title -q '.[] | "\(.number)\t\(.title)"' |
      fzf --header "Select a {{label}} issue to view" | awk '{print $1}')
    [ -z "$issue_number" ] && exit 1
    gh issue view "$issue_number"

# Remove 'next' label from an issue (optionally close it)
[no-cd]
[group('gh')]
[script]
remove:
    set -euo pipefail
    issue_number=$(gh issue list --label {{label}} --json number,title -q '.[] | "\(.number)\t\(.title)"' |
      fzf --header "Select issue to remove '{{label}}' label" | awk '{print $1}')
    [ -z "$issue_number" ] && exit 1
    gh issue edit "$issue_number" --remove-label {{label}}

    echo -n "Close issue #$issue_number? (y/n) "
    read -r answer
    [[ "$answer" != "y" ]] && exit 0

    just -g _close-issue-with-ref "$issue_number"

# Create the '{{label}}' label in the current repo
[no-cd]
[group('gh')]
[script]
setup:
    set -euo pipefail
    gh label create {{label}} --description "Up next to work on" --color FFA48A 2>/dev/null && echo "Created '{{label}}' label" || echo "'{{label}}' label already exists"
