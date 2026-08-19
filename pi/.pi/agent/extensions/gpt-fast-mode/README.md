# GPT fast mode

A local replacement for `@tunnckocore/pi-gpt-fast-mode`. It preserves the
`/fast` command, configurable shortcut, supported-model checks, and
`service_tier: "priority"` provider payload while publishing the live toggle
state through Pi's extension-status API.

`ui-tweak` consumes the `gpt-fast-mode` status to show the monochrome `ϟ`
indicator in the prompt border. The indicator means that the toggle is on;
requests are only changed when the selected model is supported.

## Development

```sh
pnpm install
pnpm check
```

The implementation is derived from
[`@tunnckocore/pi-gpt-fast-mode`](https://github.com/tunnckoCore/pi-gpt-fast-mode),
version 0.4.0, under the MIT license.
