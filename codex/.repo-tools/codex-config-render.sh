#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "usage: $0 BASE [LOCAL]" >&2
    exit 1
fi

base=$1
local=${2-}

if [[ ! -f "$base" ]]; then
    echo "Error: $base not found" >&2
    exit 1
fi

if [[ -z "$local" || ! -f "$local" ]]; then
    cat "$base"
    exit 0
fi

awk '
NR == FNR {
    base_lines[++base_count] = $0
    next
}
{
    local_lines[++local_count] = $0
}
END {
    while (base_count > 0 && base_lines[base_count] == "") {
        base_count--
    }

    local_start = 1
    while (local_start <= local_count && local_lines[local_start] == "") {
        local_start++
    }

    for (i = 1; i <= base_count; i++) {
        print base_lines[i]
    }

    for (i = local_start; i <= local_count; i++) {
        print local_lines[i]
    }
}
' "$base" "$local"
