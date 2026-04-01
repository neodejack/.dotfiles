#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

assert_contains() {
    local haystack=$1
    local needle=$2
    if [[ "$haystack" != *"$needle"* ]]; then
        echo "expected output to contain: $needle" >&2
        echo "--- output ---" >&2
        echo "$haystack" >&2
        exit 1
    fi
}

assert_file_contains() {
    local file=$1
    local needle=$2
    if ! grep -Fq "$needle" "$file"; then
        echo "expected $file to contain: $needle" >&2
        echo "--- file ---" >&2
        cat "$file" >&2
        exit 1
    fi
}

setup_fixture() {
    local dir
    dir=$(mktemp -d)
    mkdir -p "$dir/codex/.codex" "$dir/codex/.repo-tools"
    cp "$ROOT/codex.just" "$dir/codex.just"
    cp "$ROOT/codex/.repo-tools/codex-config-render.sh" "$dir/codex/.repo-tools/"
    cp "$ROOT/codex/.repo-tools/codex-config-split.sh" "$dir/codex/.repo-tools/"
    cp "$ROOT/codex/.repo-tools/codex-config-analyze.py" "$dir/codex/.repo-tools/"
    cat > "$dir/justfile" <<'EOF'
set shell := ["bash", "-uc"]
mod codex 'codex.just'
EOF
    printf '%s\n' "$dir"
}

run_just() {
    local dir=$1
    shift
    (
        cd "$dir"
        JUST_UNSTABLE=1 just "$@"
    )
}

test_base_ahead_suggests_gen() {
    local dir
    dir=$(setup_fixture)
    trap 'rm -rf "$dir"' RETURN

    cat > "$dir/codex/.codex/config.base.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "fast"
EOF
    cat > "$dir/codex/.codex/config.local.toml" <<'EOF'
[projects."/tmp/demo"]
trust_level = "trusted"
EOF
    cat > "$dir/codex/.codex/config.toml" <<'EOF'
model = "gpt-5.4"

[projects."/tmp/demo"]
trust_level = "trusted"
EOF

    local output
    output=$(run_just "$dir" codex check 2>&1 || true)
    assert_contains "$output" "Run: just codex gen"
}

test_promote_shared_live_change() {
    local dir
    dir=$(setup_fixture)
    trap 'rm -rf "$dir"' RETURN

    cat > "$dir/codex/.codex/config.base.toml" <<'EOF'
model = "gpt-5.4"
EOF
    cat > "$dir/codex/.codex/config.local.toml" <<'EOF'
[projects."/tmp/demo"]
trust_level = "trusted"
EOF
    cat > "$dir/codex/.codex/config.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "fast"

[projects."/tmp/demo"]
trust_level = "trusted"
EOF

    run_just "$dir" codex promote >/dev/null
    assert_file_contains "$dir/codex/.codex/config.base.toml" 'service_tier = "fast"'
}

test_pull_preserves_base_and_imports_projects() {
    local dir
    dir=$(setup_fixture)
    trap 'rm -rf "$dir"' RETURN

    cat > "$dir/codex/.codex/config.base.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "fast"
EOF
    cat > "$dir/codex/.codex/config.local.toml" <<'EOF'
[projects."/tmp/demo"]
trust_level = "trusted"
EOF
    cat > "$dir/codex/.codex/config.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "fast"

[projects."/tmp/demo"]
trust_level = "trusted"

[projects."/tmp/extra"]
trust_level = "trusted"
EOF

    run_just "$dir" codex pull >/dev/null
    assert_file_contains "$dir/codex/.codex/config.base.toml" 'service_tier = "fast"'
    assert_file_contains "$dir/codex/.codex/config.local.toml" '[projects."/tmp/extra"]'
}

test_adopt_mixed_live_changes() {
    local dir
    dir=$(setup_fixture)
    trap 'rm -rf "$dir"' RETURN

    cat > "$dir/codex/.codex/config.base.toml" <<'EOF'
model = "gpt-5.4"
EOF
    cat > "$dir/codex/.codex/config.local.toml" <<'EOF'
[projects."/tmp/demo"]
trust_level = "trusted"
EOF
    cat > "$dir/codex/.codex/config.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "fast"

[projects."/tmp/demo"]
trust_level = "trusted"

[projects."/tmp/extra"]
trust_level = "trusted"
EOF

    run_just "$dir" codex adopt >/dev/null
    assert_file_contains "$dir/codex/.codex/config.base.toml" 'service_tier = "fast"'
    assert_file_contains "$dir/codex/.codex/config.local.toml" '[projects."/tmp/extra"]'
}

test_conflict_stops_with_manual_review() {
    local dir
    dir=$(setup_fixture)
    trap 'rm -rf "$dir"' RETURN

    cat > "$dir/codex/.codex/config.base.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "default"
EOF
    cat > "$dir/codex/.codex/config.local.toml" <<'EOF'
[projects."/tmp/demo"]
trust_level = "trusted"
EOF
    cat > "$dir/codex/.codex/config.toml" <<'EOF'
model = "gpt-5.4"
service_tier = "fast"

[projects."/tmp/demo"]
trust_level = "trusted"
EOF

    local output
    output=$(run_just "$dir" codex check 2>&1 || true)
    assert_contains "$output" "needs manual review"
    assert_contains "$output" "Shared config diff"
    assert_contains "$output" 'service_tier = "default"'
    assert_contains "$output" 'service_tier = "fast"'
}

test_base_ahead_suggests_gen
test_promote_shared_live_change
test_pull_preserves_base_and_imports_projects
test_adopt_mixed_live_changes
test_conflict_stops_with_manual_review

echo "codex config flow tests passed"
