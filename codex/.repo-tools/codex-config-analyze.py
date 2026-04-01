#!/usr/bin/env python3
import sys
import tomllib
from pathlib import Path


LOCAL_OWNED_TOP_LEVEL_KEYS = {"projects"}


def load_toml(path: str) -> dict:
    file_path = Path(path)
    if not file_path.exists():
        return {}
    with file_path.open("rb") as handle:
        return tomllib.load(handle)


def split_ownership(data: dict) -> tuple[dict, dict]:
    shared: dict = {}
    local: dict = {}
    for key, value in data.items():
        if key in LOCAL_OWNED_TOP_LEVEL_KEYS:
            local[key] = value
        else:
            shared[key] = value
    return shared, local


def relation(file_value, live_value) -> str:
    if file_value == live_value:
        return "same"
    if extends(file_value, live_value):
        return "file_extends_live"
    if extends(live_value, file_value):
        return "live_extends_file"
    return "conflict"


def extends(candidate, baseline) -> bool:
    if isinstance(candidate, dict) and isinstance(baseline, dict):
        for key, baseline_value in baseline.items():
            if key not in candidate:
                return False
            if not extends(candidate[key], baseline_value):
                return False
        return True
    return candidate == baseline


def choose_action(shared_status: str, local_status: str, in_sync: bool) -> str:
    if in_sync:
        return "none"

    if shared_status == "same":
        if local_status == "live_extends_file":
            return "pull"
        if local_status == "file_extends_live":
            return "gen"
        return "conflict"

    if shared_status == "file_extends_live":
        if local_status in {"same", "file_extends_live"}:
            return "gen"
        if local_status == "live_extends_file":
            return "pull"
        return "conflict"

    if shared_status == "live_extends_file":
        if local_status in {"same", "file_extends_live"}:
            return "promote"
        if local_status == "live_extends_file":
            return "adopt"
        return "conflict"

    return "conflict"


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: codex-config-analyze.py BASE LOCAL LIVE", file=sys.stderr)
        return 1

    base_data = load_toml(sys.argv[1])
    local_data = load_toml(sys.argv[2])
    live_data = load_toml(sys.argv[3])

    live_shared, live_local = split_ownership(live_data)
    expected = {}
    expected.update(base_data)
    expected.update(local_data)

    shared_status = relation(base_data, live_shared)
    local_status = relation(local_data, live_local)
    in_sync = expected == live_data
    action = choose_action(shared_status, local_status, in_sync)

    print(f"in_sync={'true' if in_sync else 'false'}")
    print(f"shared_status={shared_status}")
    print(f"local_status={local_status}")
    print(f"action={action}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
