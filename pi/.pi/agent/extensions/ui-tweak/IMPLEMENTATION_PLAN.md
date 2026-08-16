# Pi UI tweak: implementation notes

## Objective

Apply one Amp-inspired visual contract to every Pi tool execution, including
built-ins such as `edit` and tools injected by packages such as `web_search`:

| Scope | Running | Success | Failure |
| --- | --- | --- | --- |
| Every tool | Blinking `#F0E9E0` `■` | Static `#F0E9E0` `■` | Static theme-error red `■` |

The separate streaming `Working...` row uses the full line/square/random-line
animation in `#F0E9E0`. Its message is blank so only the glyph is visible.

All tool status backgrounds are reset to the terminal default. Native tool
wording, arguments, results, diffs, expansion behavior, schemas, and execution
remain authoritative.

## Constraint

Pi 0.83.0 exposes tool names and schemas through `getAllTools()`, but not the
complete definitions or renderers registered by other extensions. Registering
a second definition is also unsuitable: it changes registry ownership and
cannot safely delegate execution to the hidden original definition.

Pi's interactive TUI does pass the complete definition to each tool-execution
component. That component is attached to the transcript through the public
`Container` class exported by `@earendil-works/pi-tui`.

## Design

`tool-interceptor.ts` installs one idempotent wrapper around
`Container.prototype.addChild()` during extension loading. When the child has
the runtime shape of a Pi tool-execution component, the interceptor:

1. Reads the actual definition already selected by Pi.
2. Replaces only that component's display definition with
   `wrapToolDefinition()`.
3. Clears the component's previous call/result render slots.
4. Rebuilds its display before it is attached to the transcript.

The registry definition is never mutated or re-registered. Its `execute`,
parameters, metadata, and optional compatibility hooks remain unchanged.

`wrapToolDefinition()` sets `renderShell: "self"`, delegates to the native
renderers, and prefixes the call with the animated or settled status marker. If
a tool has no result renderer, the wrapper preserves Pi's normal text-result
fallback. Image rendering remains Pi's responsibility.

## Lifecycle and compatibility

- The interceptor uses only public package entry points; it has no `dist/` or
  `src/` imports from Pi packages.
- Installation is idempotent across extension reloads. The shared interceptor
  adopts the newest timer registry.
- Indicator timers stop on final results and are cleared on session shutdown.
- Runtime shape detection is deliberately narrow: unrelated TUI components are
  left untouched.
- The implementation is tested against Pi 0.83.0.

## Verification

Run:

```sh
pnpm install
pnpm check
```

The suite covers built-in and injected definition decoration, execution
identity preservation, native and fallback result rendering, success/error
markers, indicator cleanup, transparent tool backgrounds, and the public-import
boundary.
