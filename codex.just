# List available recipes
[default]
list:
    @just --list codex

# Generate config.toml from base + local
[script('bash')]
gen:
    set -euo pipefail
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    out="codex/.codex/config.toml"
    if [[ ! -f "$base" ]]; then
        echo "Error: $base not found" >&2
        exit 1
    fi
    if [[ ! -f "$local" ]]; then
        echo "Warning: $local not found, generating from base only" >&2
        cp "$base" "$out"
    else
        bash codex/.repo-tools/codex-config-render.sh "$base" "$local" > "$out"
    fi
    echo "Generated $out"

# Import local-only settings from config.toml into config.local.toml, then regenerate
[script('bash')]
pull:
    set -euo pipefail
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    src="codex/.codex/config.toml"
    tmp_base=$(mktemp)
    tmp_local=$(mktemp)
    trap 'rm -f "$tmp_base" "$tmp_local"' EXIT
    if [[ ! -f "$src" ]]; then
        echo "Error: $src not found" >&2
        exit 1
    fi
    eval "$(codex/.repo-tools/codex-config-analyze.py "$base" "$local" "$src")"
    case "$action" in
        none)
            echo "codex config is already up to date"
            exit 0
            ;;
        pull)
            ;;
        gen)
            echo "config.toml should be regenerated from config.base.toml + config.local.toml" >&2
            echo "Run: just codex gen" >&2
            exit 1
            ;;
        promote)
            echo "config.toml contains shared setting changes. Pull will discard them." >&2
            echo "Run: just codex promote" >&2
            exit 1
            ;;
        adopt)
            echo "config.toml contains both local and shared live changes." >&2
            echo "Run: just codex adopt" >&2
            exit 1
            ;;
        *)
            echo "config.toml has conflicting changes. Resolve manually." >&2
            exit 1
            ;;
    esac
    bash codex/.repo-tools/codex-config-split.sh "$src" "$tmp_base" "$tmp_local"
    if [[ -f "$tmp_local" ]]; then
        cp "$tmp_local" "$local"
    else
        : > "$local"
    fi
    bash codex/.repo-tools/codex-config-render.sh "$base" "$local" > "$src"
    echo "Imported local settings from $src"
    echo "  → $local (git-ignored)"
    echo "Regenerated $src from split config"

# Promote shared settings from config.toml into config.base.toml, then regenerate
[script('bash')]
promote:
    set -euo pipefail
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    src="codex/.codex/config.toml"
    tmp_base=$(mktemp)
    tmp_local=$(mktemp)
    trap 'rm -f "$tmp_base" "$tmp_local"' EXIT
    if [[ ! -f "$src" ]]; then
        echo "Error: $src not found" >&2
        exit 1
    fi
    eval "$(codex/.repo-tools/codex-config-analyze.py "$base" "$local" "$src")"
    case "$action" in
        none)
            echo "codex config is already up to date"
            exit 0
            ;;
        promote)
            ;;
        gen)
            echo "config.base.toml is ahead of config.toml. Promote will overwrite it." >&2
            echo "Run: just codex gen" >&2
            exit 1
            ;;
        pull)
            echo "config.toml contains local-only changes. Promote will discard them." >&2
            echo "Run: just codex pull" >&2
            exit 1
            ;;
        adopt)
            echo "config.toml contains both local and shared live changes." >&2
            echo "Run: just codex adopt" >&2
            exit 1
            ;;
        *)
            echo "config.toml has conflicting shared changes. Resolve manually." >&2
            exit 1
            ;;
    esac
    bash codex/.repo-tools/codex-config-split.sh "$src" "$tmp_base" "$tmp_local"
    cp "$tmp_base" "$base"
    bash codex/.repo-tools/codex-config-render.sh "$base" "$local" > "$src"
    echo "Promoted shared settings from $src"
    echo "  → $base (tracked)"
    echo "Regenerated $src from split config"

# Adopt both shared and local live changes from config.toml into split config, then regenerate
[script('bash')]
adopt:
    set -euo pipefail
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    src="codex/.codex/config.toml"
    tmp_base=$(mktemp)
    tmp_local=$(mktemp)
    trap 'rm -f "$tmp_base" "$tmp_local"' EXIT
    if [[ ! -f "$src" ]]; then
        echo "Error: $src not found" >&2
        exit 1
    fi
    eval "$(codex/.repo-tools/codex-config-analyze.py "$base" "$local" "$src")"
    case "$action" in
        none)
            echo "codex config is already up to date"
            exit 0
            ;;
        adopt)
            ;;
        pull)
            echo "config.toml only has local live changes." >&2
            echo "Run: just codex pull" >&2
            exit 1
            ;;
        promote)
            echo "config.toml only has shared live changes." >&2
            echo "Run: just codex promote" >&2
            exit 1
            ;;
        gen)
            echo "config.toml should be regenerated from the split config." >&2
            echo "Run: just codex gen" >&2
            exit 1
            ;;
        *)
            echo "config.toml has conflicting changes. Resolve manually." >&2
            exit 1
            ;;
    esac
    bash codex/.repo-tools/codex-config-split.sh "$src" "$tmp_base" "$tmp_local"
    cp "$tmp_base" "$base"
    cp "$tmp_local" "$local"
    bash codex/.repo-tools/codex-config-render.sh "$base" "$local" > "$src"
    echo "Adopted shared and local settings from $src"
    echo "  → $base (tracked)"
    echo "  → $local (git-ignored)"
    echo "Regenerated $src from split config"

# Check if config.toml has diverged from base + local
[script('bash'), no-exit-message]
check:
    set -euo pipefail
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    live="codex/.codex/config.toml"
    if [[ ! -f "$live" ]]; then
        echo "Error: $live not found" >&2
        exit 1
    fi
    eval "$(codex/.repo-tools/codex-config-analyze.py "$base" "$local" "$live")"
    case "$action" in
        none)
            echo "codex config is up to date"
            ;;
        gen)
            if [[ "$shared_status" == "file_extends_live" || "$local_status" == "file_extends_live" ]]; then
                echo "config.base.toml and/or config.local.toml are ahead of config.toml" >&2
            fi
            echo "Run: just codex gen" >&2
            exit 1
            ;;
        pull)
            if [[ "$shared_status" == "file_extends_live" ]]; then
                echo "config.base.toml is ahead, and config.toml also contains local project updates" >&2
                echo "Run: just codex pull" >&2
                exit 1
            fi
            echo "config.toml contains local project updates not yet stored in config.local.toml" >&2
            echo "Run: just codex pull" >&2
            exit 1
            ;;
        promote)
            echo "config.toml contains shared setting changes not yet stored in config.base.toml" >&2
            echo "Run: just codex promote to adopt them" >&2
            echo "Run: just codex gen to discard them" >&2
            exit 1
            ;;
        adopt)
            echo "config.toml contains both local project updates and shared setting changes" >&2
            echo "Run: just codex adopt to store both" >&2
            echo "Run: just codex gen to discard the live-only changes" >&2
            exit 1
            ;;
        *)
            echo "codex config has conflicting drift and needs manual review" >&2
            echo "shared status: $shared_status" >&2
            echo "local status: $local_status" >&2
            exit 1
            ;;
    esac
