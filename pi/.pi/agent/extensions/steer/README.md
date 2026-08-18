# Pi steer command

Adds a `/steer` extension command that sends a user message with Pi's
`deliverAs: "steer"` behavior.

## Command palette usage

1. Type a message in the main prompt editor.
2. Open the command palette with `Ctrl-O`.
3. Select `steer` and press Enter.

The command palette normally replaces the editor text with `/steer` before it
submits the command. This extension composes with Pi's current editor component
and captures the text immediately before that replacement, allowing the command
handler to send the original prompt.

The command can also be invoked directly with an argument:

```text
/steer Focus on the failing test
```

When Pi is streaming, the message is delivered after the current assistant
turn's tool calls and before the next model call. When Pi is idle, it starts a
normal turn immediately.
