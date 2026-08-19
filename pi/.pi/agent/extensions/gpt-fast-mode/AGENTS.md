# GPT fast-mode agent instructions

## Prompt-chrome status contract

- This extension owns fast-mode state, commands, shortcuts, supported-model
  checks, notifications, and the `service_tier: "priority"` request change.
  It does not render prompt chrome.
- Publish the live toggle through Pi's public status API using key
  `gpt-fast-mode` and value `enabled`. Clear the key with `undefined` when fast
  mode is off.
- Publish after every toggle and on `session_start` after restoring the
  configured default. The status represents the toggle state, even when the
  selected model is unsupported and requests are therefore unchanged.
- `ui-tweak` is an optional consumer of this contract. Do not import it or
  depend on its presence; the fast-mode extension must continue to work by
  itself.
- Preserve the upstream `/fast`, configurable-shortcut, settings-path, and
  provider-payload behavior when changing status publication.
- Test status publication together with request behavior in
  `test/index.test.ts`. Run `pnpm check` after changes.
