import { type Component, Text } from "@earendil-works/pi-tui";

export interface EditRenderState {
  callComponent?: Component;
}

export type EditCallComponent = Text;

export interface TextContentBlock {
  type: string;
  text?: string;
}

export interface RenderableToolResult {
  content: TextContentBlock[];
}

export interface EditRenderContext<TArgs> {
  args: TArgs;
  cwd: string;
  lastComponent?: Component;
  state: EditRenderState;
  isError: boolean;
  isPartial: boolean;
}

export function getCallComponent(
  state: EditRenderState,
  lastComponent: Component | undefined,
): EditCallComponent {
  if (lastComponent instanceof Text) {
    state.callComponent = lastComponent;
    return lastComponent;
  }
  if (state.callComponent) {
    if (state.callComponent instanceof Text) {
      return state.callComponent;
    }
  }
  const component = new Text("", 0, 0);
  state.callComponent = component;
  return component;
}

export function extractTextOutput(
  result: RenderableToolResult,
): string {
  return result.content
    .filter((content) => content.type === "text")
    .map((content) => content.text ?? "")
    .filter(Boolean)
    .join("\n");
}

export function summarizeDiff(diff: string): {
  additions: number;
  removals: number;
} {
  let additions = 0;
  let removals = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removals++;
    }
  }
  return { additions, removals };
}
