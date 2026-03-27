#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
    echo "usage: $0 SRC BASE_OUT LOCAL_OUT" >&2
    exit 1
fi

src=$1
base_out=$2
local_out=$3

if [[ ! -f "$src" ]]; then
    echo "Error: $src not found" >&2
    exit 1
fi

tmp_base=$(mktemp)
tmp_local=$(mktemp)
cleanup() {
    rm -f "$tmp_base" "$tmp_local"
}
trap cleanup EXIT

: > "$tmp_base"
: > "$tmp_local"

awk -v base_path="$tmp_base" -v local_path="$tmp_local" '
BEGIN {
    dest = "base"
}
/^\[projects\./ {
    dest = "local"
}
/^\[/ && !/^\[projects\./ {
    dest = "base"
}
{
    print >> (dest == "base" ? base_path : local_path)
}
' "$src"

awk '
BEGIN {
    started = 0
}
{
    if (!started && $0 == "") {
        next
    }
    started = 1
    print
}
' "$tmp_base" > "$base_out"

awk '
BEGIN {
    started = 0
}
{
    if (!started && $0 == "") {
        next
    }
    started = 1
    print
}
' "$tmp_local" > "$local_out"
