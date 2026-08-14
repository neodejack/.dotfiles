# apply_patch extension

Vendored from [`aliou/pi-harness`](https://github.com/aliou/pi-harness), commit `9072cea`.

Source directory: `tools/edit/`

Local adaptations:

- Kept only the Codex `apply_patch` path; removed Anthropic, Kimi, and native-edit wrappers.
- Removed the optional `nvim-pi` undo event integration and its `@harness/events` dependency.
- Tests are not vendored; upstream owns the test suite.

When refreshing, copy the upstream `tools/edit/` implementation and reapply these adaptations. Review upstream changes before updating because extensions execute with full user permissions.
