# Upstream provenance

- Project: [`ssdiwu/pi-autoname`](https://github.com/ssdiwu/pi-autoname)
- Package: `pi-autoname`
- Version used: `0.6.8`
- Tag commit: `6cb20af3fd5a0b766347ba53ab2b015f70ff345b`
- License: MIT; retained in `LICENSE`

The local implementation was derived from upstream `extensions/index.ts`,
`extensions/controller.ts`, `extensions/lib.ts`, and their tests. The privacy
redaction, dialogue extraction, title validation, bounded request handling,
cancellation, and explicit `/autoname` command were retained and adapted.

## Intentional differences

- Only genuinely new sessions receive one automatic naming attempt.
- Periodic renaming and cooldown configuration are removed.
- Manual or externally assigned names always suppress a pending initial attempt.
- `/autoname` asks for a fresh title rather than preserving a fitting old one.
- `reasoningEffort` is configured and validated exactly.
- Fallback models, session-model fallback, and local extraction fallback are removed.
- Names are always English; upstream language detection and locale integration are removed.
- Configuration is strict and never auto-generated.
- The modern provider `streamSimple` path is used instead of the deprecated
  global `@earendil-works/pi-ai/compat` completion function.
- Debug output never includes conversation excerpts or generated titles.

## Updating

Do not overwrite this directory blindly. Review upstream changes to the copied
privacy patterns, title validation, Pi lifecycle events, and provider APIs. Port
useful changes deliberately, adapt the tests and README, then update the version
and commit above.
