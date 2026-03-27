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
        cat "$base" <(echo) "$local" > "$out"
    fi
    echo "Generated $out"

# Split config.toml back into base (tracked) + local (git-ignored)
[script('bash')]
pull:
    set -euo pipefail
    src="codex/.codex/config.toml"
    base="codex/.codex/config.base.toml"
    local="codex/.codex/config.local.toml"
    if [[ ! -f "$src" ]]; then
        echo "Error: $src not found" >&2
        exit 1
    fi
    awk '
    BEGIN { dest = "base" }
    /^\[projects\./ { dest = "local"; }
    /^\[/ && !/^\[projects\./ { dest = "base"; }
    { print >> (dest == "base" ? "'"$base"'" : "'"$local"'") }
    ' <(: > "$base") <(: > "$local") "$src"
    echo "Split $src"
    echo "  → $base (tracked)"
    echo "  → $local (git-ignored)"
