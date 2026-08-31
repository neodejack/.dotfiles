# Local pi-autoname

This extension is a deliberately simplified local derivative of
[`pi-autoname` 0.6.8](https://github.com/ssdiwu/pi-autoname). It is checked
into the dotfiles so naming behavior is identical across machines.

## Behavior

There are only two naming triggers:

1. **Initial automatic naming** — a genuinely new, unnamed session gets one
   attempt after its first complete user/assistant exchange settles.
2. **Explicit naming** — `/autoname` generates a fresh title from the six most
   recent user/assistant messages.

The initial attempt is consumed whether it succeeds, fails, or is disabled by
configuration. It is never retried automatically. Existing sessions are not
automatically named. Any name assigned by `/name`, RPC, or another extension
before the initial attempt suppresses it.

There is no periodic rename, fallback model, current-session-model fallback,
or local text-extraction fallback.

## Configuration

The extension strictly reads `~/.pi/agent/pi-autoname.json`:

```json
{
  "enabled": true,
  "model": "openai-codex/gpt-5.6-luna",
  "reasoningEffort": "low",
  "debug": false
}
```

`reasoningEffort` accepts `off`, `minimal`, `low`, `medium`, `high`, `xhigh`,
or `max`. Unsupported levels fail instead of being silently clamped. Missing,
malformed, incomplete, or unknown configuration fields disable naming and
produce a warning. The file is re-read when its modification time changes.

Setting `enabled` to `false` disables both initial naming and `/autoname`.

## Lifecycle and state

```text
session_start
  ├─ prior dialogue, existing name, or local marker → initial ineligible
  └─ genuinely empty and unnamed                  → initial pending

agent_settled
  ├─ first exchange incomplete → remain pending
  └─ first exchange complete   → consume attempt → request model once

session_info_changed while pending
  └─ consume attempt without requesting the model

/autoname
  └─ consume a pending initial attempt → request model from recent context
```

Outcomes are persisted as `local-pi-autoname-state` custom session entries.
These markers do not enter model context. Superseded requests and session
shutdown cancel in-flight work so stale results cannot rename another session.

## Model request

The configured model is resolved as `provider/modelId`. The extension verifies
that the exact reasoning effort is supported, resolves Pi's existing provider
authentication, and calls the provider's simple stream API with:

- the configured reasoning effort;
- no prompt-cache retention;
- a 64-token response limit;
- a 12-second attempt timeout inside the upstream 30-second total budget.

No other model is contacted if the request fails.

## Privacy and title validation

Before model submission, the extension redacts common API keys, bearer tokens,
AWS access keys, private keys, and token/secret/password assignments. It sends
only short excerpts (up to 700 characters per selected message). Conversation
text and generated titles are never written to debug logs.

Titles are always English. They use an Amp-style, topic-first keyword phrase of
two to four words (preferably three), omit generic intent framing such as
“audit” and “investigate,” and use lowercase except for canonical product or
identifier casing. Model output must be 3-60 total characters and pass the
quality checks before it can rename the session. Rejected output produces a
specific reason where possible—for example, `Name is too long` for a character
or word-count violation. With debugging enabled, rejected responses log only
privacy-safe metadata such as content-block types, character counts, and the
rejection reason; generated titles are never logged.

## Files

- `index.ts` — Pi lifecycle, command registration, configuration loading
- `controller.ts` — one-shot state machine and request cancellation
- `model.ts` — exact reasoning validation and provider request
- `config.ts` — strict configuration schema
- `lib.ts` — redaction, dialogue, prompt, and title helpers
- `tests/` — pure unit tests requiring no live model
- `UPSTREAM.md` — provenance and deliberate differences

## Verification

```bash
cd ~/.pi/agent/extensions/pi-autoname
npm test
```

For a manual live check, start a new Pi session, complete one exchange, and
confirm it receives one title. Continue chatting and verify the title remains
stable. Run `/name Manual title` and verify it remains unchanged. Finally run
`/autoname` to explicitly regenerate it.
