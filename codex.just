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

# Split config.toml back into base (tracked) + local (git-ignored)
[script('bash')]
pull:
    set -euo pipefail
    src="codex/.codex/config.toml"
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    before=$(mktemp)
    trap 'rm -f "$before"' EXIT
    if [[ ! -f "$src" ]]; then
        echo "Error: $src not found" >&2
        exit 1
    fi
    if [[ -f "$base" ]]; then
        cp "$base" "$before"
    else
        : > "$before"
    fi
    bash codex/.repo-tools/codex-config-split.sh "$src" "$base" "$local"
    echo "Split $src"
    echo "  → $base (tracked)"
    echo "  → $local (git-ignored)"
    if ! diff -q "$before" "$base" > /dev/null 2>&1; then
        git add "$base"
        git commit -m "Update codex config base" -- "$base"
    fi

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
    expected=$(mktemp)
    trap 'rm -f "$expected"' EXIT
    if [[ -f "$local" ]]; then
        bash codex/.repo-tools/codex-config-render.sh "$base" "$local" > "$expected"
    else
        cp "$base" "$expected"
    fi
    if diff -q "$expected" "$live" > /dev/null 2>&1; then
        echo "codex config is up to date"
    else
        echo "codex config.toml has diverged. Reconcile with:" >&2
        echo "" >&2
        echo "  just codex pull" >&2
        echo "" >&2
        diff --unified "$expected" "$live" >&2 || true
        exit 1
    fi
