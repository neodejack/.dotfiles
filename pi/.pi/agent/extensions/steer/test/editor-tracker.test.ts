import assert from "node:assert/strict";
import { test } from "node:test";
import type { EditorComponent } from "@earendil-works/pi-tui";
import { trackPromptBeforeSteerCommand } from "../editor-tracker.js";

function fakeEditor(initialText: string): EditorComponent {
  let text = initialText;
  return {
    getText: () => text,
    setText: (value) => { text = value; },
    handleInput() {},
    invalidate() {},
    render: () => [],
  };
}

test("captures the prompt before a palette replaces it with /steer", () => {
  const captured: string[] = [];
  const editor = trackPromptBeforeSteerCommand(
    fakeEditor("Focus on the failing test"),
    (text) => captured.push(text),
  );

  editor.setText("/steer");

  assert.deepEqual(captured, ["Focus on the failing test"]);
  assert.equal(editor.getText(), "/steer");
});

test("does not capture unrelated editor replacements", () => {
  const captured: string[] = [];
  const editor = trackPromptBeforeSteerCommand(
    fakeEditor("Keep this"),
    (text) => captured.push(text),
  );

  editor.setText("/model");

  assert.deepEqual(captured, []);
});

test("updates the capture callback instead of wrapping an editor twice", () => {
  const oldCaptures: string[] = [];
  const newCaptures: string[] = [];
  const editor = trackPromptBeforeSteerCommand(
    fakeEditor("Original prompt"),
    (text) => oldCaptures.push(text),
  );
  trackPromptBeforeSteerCommand(editor, (text) => newCaptures.push(text));

  editor.setText("/steer");

  assert.deepEqual(oldCaptures, []);
  assert.deepEqual(newCaptures, ["Original prompt"]);
});
