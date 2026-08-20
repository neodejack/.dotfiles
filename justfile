set shell := ["bash", "-uc"]

exclude := ".git"
no_folding := "herdr pi sesame"
ignore := "(^|/)node_modules($|/)"

# List available recipes
[default]
list:
    @just --list

# Dry-run stow against all packages
[script('bash')]
test:
    set -euo pipefail
    all_dirs=()
    while IFS= read -r dir; do
        all_dirs+=("$dir")
    done < <(find . -maxdepth 1 -mindepth 1 -type d ! -name '{{ exclude }}' | sed 's|^\./||' | sort)
    read -r -a no_folding <<< "{{ no_folding }}"
    regular=()
    for dir in "${all_dirs[@]}"; do
        if [[ " ${no_folding[*]} " != *" $dir "* ]]; then
            regular+=("$dir")
        fi
    done
    echo "Packages: ${regular[*]}"
    ((${#regular[@]} == 0)) || stow -nvt ~ --ignore='{{ ignore }}' "${regular[@]}"
    echo "Packages (no folding): ${no_folding[*]}"
    stow -nRvt ~ --no-folding --ignore='{{ ignore }}' "${no_folding[@]}"

# Stow all packages into ~
[script('bash')]
apply:
    set -euo pipefail
    all_dirs=()
    while IFS= read -r dir; do
        all_dirs+=("$dir")
    done < <(find . -maxdepth 1 -mindepth 1 -type d ! -name '{{ exclude }}' | sed 's|^\./||' | sort)
    read -r -a no_folding <<< "{{ no_folding }}"
    regular=()
    for dir in "${all_dirs[@]}"; do
        if [[ " ${no_folding[*]} " != *" $dir "* ]]; then
            regular+=("$dir")
        fi
    done
    echo "Packages: ${regular[*]}"
    ((${#regular[@]} == 0)) || stow -vt ~ --ignore='{{ ignore }}' "${regular[@]}"
    echo "Packages (no folding): ${no_folding[*]}"
    stow -Rvt ~ --no-folding --ignore='{{ ignore }}' "${no_folding[@]}"

# Unstow a package from ~
unstow pkg:
    stow -Dvt ~ "{{ pkg }}"
