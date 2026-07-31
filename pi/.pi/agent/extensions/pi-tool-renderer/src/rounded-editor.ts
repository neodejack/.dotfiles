import {
  CustomEditor,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  truncateToWidth,
  visibleWidth,
  type EditorComponent,
} from "@earendil-works/pi-tui";

type EditorFactory = NonNullable<
  ReturnType<ExtensionContext["ui"]["getEditorComponent"]>
>;

const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const DECORATED_EDITORS = new WeakSet<EditorComponent>();
const ROUNDED_FACTORIES = new WeakSet<EditorFactory>();

function plainText(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

function isBottomBorder(line: string): boolean {
  const plain = plainText(line);
  return (
    /^─+$/.test(plain)
    || /^─── ↓ \d+ more ─*$/.test(plain)
    || /^─{0,3}(?: ↓(?: \d+(?: more)?)?)?\.{1,3}$/.test(plain)
  );
}

function fitLine(line: string, width: number): string {
  const clipped = truncateToWidth(line, width, "");
  return `${clipped}${" ".repeat(Math.max(0, width - visibleWidth(clipped)))}`;
}

function findBottomBorderIndex(lines: readonly string[]): number | undefined {
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && isBottomBorder(line)) {
      return index;
    }
  }
  return undefined;
}

export function frameEditorLines(
  lines: readonly string[],
  outerWidth: number,
  borderColor: (text: string) => string,
): string[] {
  if (outerWidth < 3 || lines.length === 0) {
    return [...lines];
  }

  const innerWidth = outerWidth - 2;
  const bottomBorderIndex = findBottomBorderIndex(lines);
  if (bottomBorderIndex === undefined) {
    return [...lines];
  }

  return lines.map((line, index) => {
    const fitted = fitLine(line, innerWidth);

    if (index === 0) {
      return `${borderColor("╭")}${fitted}${borderColor("╮")}`;
    }
    if (index === bottomBorderIndex) {
      return `${borderColor("╰")}${fitted}${borderColor("╯")}`;
    }
    if (index < bottomBorderIndex) {
      return `${borderColor("│")}${fitted}${borderColor("│")}`;
    }

    // Autocomplete rows remain outside the frame but align with its contents.
    return ` ${fitted} `;
  });
}

export function decorateEditorRender(
  editor: EditorComponent,
  fallbackBorderColor: (text: string) => string,
): EditorComponent {
  if (DECORATED_EDITORS.has(editor)) {
    return editor;
  }

  const originalRender = editor.render.bind(editor);
  editor.render = (width: number): string[] => {
    if (width < 3) {
      return originalRender(width);
    }

    const lines = originalRender(width - 2);
    const borderColor = editor.borderColor ?? fallbackBorderColor;
    return frameEditorLines(lines, width, borderColor);
  };

  DECORATED_EDITORS.add(editor);
  return editor;
}

export function createRoundedEditorFactory(
  previous: EditorFactory | undefined,
): EditorFactory {
  const factory: EditorFactory = (tui, theme, keybindings) => {
    const editor = previous
      ? previous(tui, theme, keybindings)
      : new CustomEditor(tui, theme, keybindings);
    return decorateEditorRender(editor, theme.borderColor);
  };

  ROUNDED_FACTORIES.add(factory);
  return factory;
}

export function installRoundedEditor(ctx: ExtensionContext): void {
  const previous = ctx.ui.getEditorComponent();
  if (previous && ROUNDED_FACTORIES.has(previous)) {
    return;
  }

  ctx.ui.setEditorComponent(createRoundedEditorFactory(previous));
}
