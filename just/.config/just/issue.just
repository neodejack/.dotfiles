# Recipes for managing issues

# List available issue recipes
[default]
list:
    @just -g --list issue --list-heading $'Hey Mr.Scott whatcha gonna do\n' --list-prefix '~> '

# Close an issue with a reference to a PR or commit
[no-cd]
[group('gh')]
[script]
close:
    set -euo pipefail
    issue_number=$(gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
      fzf --header "Select issue to close" | awk '{print $1}')
    [ -z "$issue_number" ] && exit 1

    just -g _close-issue-with-ref "$issue_number"

    # Remove 'next' label if present
    labels=$(gh issue view "$issue_number" --json labels -q '.labels[].name')
    if echo "$labels" | grep -iqw "next"; then
      gh issue edit "$issue_number" --remove-label next
    fi

# View an issue
[no-cd]
[group('gh')]
[script]
view:
    set -euo pipefail
    gh issue list --json number,title -q '.[] | "\(.number)\t\(.title)"' |
      fzf --header "Select issue to view" | awk '{print $1}' | xargs -I {} gh issue view {}
