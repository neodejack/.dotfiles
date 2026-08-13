# pi-harness edit extension

Vendored from [`aliou/pi-harness`](https://github.com/aliou/pi-harness), commit `9072cea`.

Source directory: `tools/edit/`

Local adaptations:

- Removed the optional `nvim-pi` undo event integration and its `@harness/events` dependency.
- Inlined `formatDisplayPath` in `kimi/render.ts` to remove the `@harness/utils` workspace dependency.
- Tests are not vendored; upstream owns the test suite.

When refreshing, copy the upstream `tools/edit/` implementation and reapply these adaptations. Review upstream changes before updating because extensions execute with full user permissions.
