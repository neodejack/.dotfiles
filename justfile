set shell := ["bash", "-uc"]

exclude := ".git"

# List available recipes
[default]
list:
    @just --list

# Dry-run stow against all packages
[script]
test:
    set -euo pipefail
    dirs=$(find . -maxdepth 1 -mindepth 1 -type d ! -name '{{exclude}}' | sed 's|^\./||' | sort | tr '\n' ' ')
    echo "Packages: $dirs"
    stow -nvt ~ $dirs

# Stow all packages into ~
[script]
apply:
    set -euo pipefail
    dirs=$(find . -maxdepth 1 -mindepth 1 -type d ! -name '{{exclude}}' | sed 's|^\./||' | sort | tr '\n' ' ')
    echo "Packages: $dirs"
    stow -vt ~ $dirs

# Unstow a package from ~
unstow pkg:
    stow -Dvt ~ {{pkg}}

