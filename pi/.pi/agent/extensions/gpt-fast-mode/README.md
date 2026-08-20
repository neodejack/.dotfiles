# GPT fast mode

A focused local replacement for `@tunnckocore/pi-gpt-fast-mode`. `/fast`
toggles `service_tier: "priority"` for the configured `openai-codex`
`gpt-5.5` and `gpt-5.6-luna`, `gpt-5.6-sol`, and `gpt-5.6-terra` models. The
extension has no keybindings.

`ui-tweak` consumes the `gpt-fast-mode` status to show the monochrome `ϟ`
indicator in the prompt border. The indicator means that the toggle is on;
requests are only changed when the selected model is supported. Selecting
`/fast` from `ui-tweak`'s command palette preserves any text already in the
prompt editor.

## Configuration

The extension reads, but never writes, one value from Pi's global
`settings.json`:

```json
{
  "pi-gpt-fast-mode": {
    "enabled": true
  }
}
```

Pi's public `getAgentDir()` resolves that file from `PI_CODING_AGENT_DIR` when
set, otherwise from `~/.pi/agent/settings.json`. Missing or invalid
configuration starts Fast mode off. Runtime `/fast` toggles are session-local
and reset to the configured default when a session starts or reloads.

## Development

```sh
pnpm install
pnpm check
```

The implementation is derived from
[`@tunnckocore/pi-gpt-fast-mode`](https://github.com/tunnckoCore/pi-gpt-fast-mode),
version 0.4.0, under the MIT license.
