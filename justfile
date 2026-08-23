set shell := ["bash", "-uc"]

exclude := ".git"
anchor_dirs := ".pi/agent .config/herdr .config/sesame Library/LaunchAgents"
ignore := "(^|/)node_modules($|/)"

# List available recipes
[default]
list:
    @just --list

# Ensure generated-state boundaries are real directories
[script('bash')]
ensure_dirs:
    set -euo pipefail

    ensure_real_dir() {
        local relative="$1"
        local current="$HOME"
        local parts=()
        local part

        IFS="/" read -r -a parts <<< "$relative"
        for part in "${parts[@]}"; do
            [[ -z "$part" ]] && continue
            current="$current/$part"

            if [[ -L "$current" ]]; then
                echo "Directory boundary must not be a symlink: $current" >&2
                exit 1
            fi
            if [[ -e "$current" && ! -d "$current" ]]; then
                echo "Directory boundary is not a directory: $current" >&2
                exit 1
            fi

            [[ -d "$current" ]] || mkdir "$current"
        done
    }

    read -r -a anchors <<< "{{ anchor_dirs }}"
    for anchor in "${anchors[@]}"; do
        ensure_real_dir "$anchor"
    done

# Dry-run stow against all packages
[script('bash')]
test: ensure_dirs
    set -euo pipefail
    packages=()
    while IFS= read -r dir; do
        packages+=("$dir")
    done < <(find . -maxdepth 1 -mindepth 1 -type d ! -name '{{ exclude }}' | sed 's|^\./||' | sort)
    echo "Packages: ${packages[*]}"
    ((${#packages[@]} == 0)) || stow -nvt "$HOME" --ignore='{{ ignore }}' "${packages[@]}"

# Stow all packages into ~
[script('bash')]
apply: ensure_dirs
    set -euo pipefail
    packages=()
    while IFS= read -r dir; do
        packages+=("$dir")
    done < <(find . -maxdepth 1 -mindepth 1 -type d ! -name '{{ exclude }}' | sed 's|^\./||' | sort)
    echo "Packages: ${packages[*]}"
    ((${#packages[@]} == 0)) || stow -vt "$HOME" --ignore='{{ ignore }}' "${packages[@]}"

# Unstow a package from ~
unstow pkg:
    stow -Dvt ~ "{{ pkg }}"
