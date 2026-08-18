import type { EditorComponent } from "@earendil-works/pi-tui";

const TRACKER = Symbol.for("pi.steer.editorTracker");

type TrackedEditor = EditorComponent & {
  [TRACKER]?: {
    capture: (text: string) => void;
  };
};

export function trackPromptBeforeSteerCommand(
  editor: EditorComponent,
  capture: (text: string) => void,
): EditorComponent {
  const tracked = editor as TrackedEditor;
  const existingTracker = tracked[TRACKER];
  if (existingTracker) {
    existingTracker.capture = capture;
    return editor;
  }

  const tracker = { capture };
  const originalSetText = editor.setText.bind(editor);
  editor.setText = (text: string): void => {
    const currentText = editor.getExpandedText?.() ?? editor.getText();
    if (
      text === "/steer"
      && currentText.trim().length > 0
      && currentText.trim() !== "/steer"
    ) {
      tracker.capture(currentText);
    }
    originalSetText(text);
  };
  tracked[TRACKER] = tracker;
  return editor;
}
