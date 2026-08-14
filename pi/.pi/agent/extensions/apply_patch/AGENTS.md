# apply_patch extension

This Pi extension gives models served by the `openai-codex` provider the V4A
`apply_patch` tool they were trained to use.

## Behavior

- Register `apply_patch` during extension startup.
- For `openai-codex` models, deactivate Pi's built-in `edit` and `write` tools
  and activate `apply_patch`.
- For non-Codex models, deactivate `apply_patch` and restore only the built-in
  tools that this extension previously removed.
- Support V4A add, update, delete, and move operations across multiple files.
- Serialize mutations for every affected path with Pi's
  `withFileMutationQueue()`.
- Report partial application when an earlier hunk committed before a later
  hunk failed; patch application is deliberately non-transactional.

## Code map

- `index.ts`: Pi registration, lifecycle hooks, and active-tool routing.
- `router.ts`: pure provider detection and active-tool set transitions.
- `apply-patch/tool.ts`: tool schema, model instructions, execution, and result
  details.
- `apply-patch/parser.ts`: V4A parser.
- `apply-patch/apply.ts`: filesystem mutation and partial-failure handling.
- `apply-patch/seek.ts`: progressively relaxed context matching.
- `apply-patch/render.ts`: patch summaries and expanded diff rendering.
- `apply-patch/types.ts`: parser and application types.
- `shared/render.ts`: minimal rendering helpers shared by the patch renderer.
- `UPSTREAM.md`: vendoring provenance and local adaptations.

## Invariants

- Keep Codex detection provider-based (`openai-codex`), not model-ID-based.
- Do not replace or wrap Pi's built-in `edit`; non-Codex models must retain the
  native implementation.
- Keep file mutations inside the mutation queue for the complete
  read-modify-write window.
- Preserve explicit partial-apply errors. Never imply rollback after a hunk has
  reached disk.
- Keep the public tool name and input shape as `apply_patch` with one `input`
  string containing the complete V4A patch.
- The extension's renderer owns patch summaries and diffs. `ui-tweak` may
  decorate it with status indicators but must continue delegating to these
  native render functions; extension import order does not matter.

## Verification

After changes, validate that Pi can load the extension without contacting the
network:

```sh
PI_OFFLINE=1 pi --list-models gpt-5.6
```

Use `/reload` in an existing Pi session before manually checking that Codex
exposes `apply_patch` while a non-Codex model exposes the built-in `edit` and
`write` tools.
