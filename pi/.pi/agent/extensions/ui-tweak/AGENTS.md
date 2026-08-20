# UI tweak agent instructions

## GPT fast-mode prompt integration

- Treat GPT fast mode as an optional integration. `ui-tweak` must continue to
  load and render normally when the fast-mode extension is absent.
- Consume state only through Pi's public extension-status map. The shared
  contract is key `gpt-fast-mode` with value `enabled`; do not import or reach
  into the fast-mode extension.
- When that status is present, prompt chrome renders the plain, uncolored text
  glyph `ϟ`, followed by the normal separator, producing `ϟ ─ <token count>`.
  Do not apply theme or ANSI color styling to the glyph.
- Keep the icon in the responsive fallback when the rest of the top-border
  metadata does not fit. When the status is absent, preserve the ordinary
  prompt border exactly.
- Filter `gpt-fast-mode` from the status-only footer because prompt chrome owns
  its visual representation and it must not appear twice.
- Run the extension command `fast` from the command palette with the
  `submit-preserving-prompt` action. Prompt preservation belongs here because
  this palette owns command insertion; do not require fast mode to wrap Pi's
  editor.
- Cover enabled, absent, narrow-width, uncolored-glyph, and footer-filtering
  behavior in `test/prompt-chrome.test.ts`. Run `pnpm check` after changes.
