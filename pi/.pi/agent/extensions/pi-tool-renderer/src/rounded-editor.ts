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

export interface PromptBorderLabels {
  top?: string;
  bottom?: string;
}

export type BorderLabelProvider = (
  innerWidth: number,
) => PromptBorderLabels;

export type EditorReadyHandler = (editor: EditorComponent) => void;

const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const DECORATED_EDITORS = new WeakSet<EditorComponent>();
const ROUNDED_FACTORIES = new WeakSet<EditorFactory>();

export const MIN_PROMPT_ROWS = 3;

export function whiteBorder(text: string): string {
  return `\u001b[38;5;15m${text}\u001b[39m`;
}

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

export function ensureMinimumPromptRows(
  lines: readonly string[],
  width: number,
  minimumRows: number,
): string[] {
  const bottomBorderIndex = findBottomBorderIndex(lines);
  if (bottomBorderIndex === undefined) {
    return [...lines];
  }

  const currentRows = Math.max(0, bottomBorderIndex - 1);
  const rowsToAdd = Math.max(0, Math.floor(minimumRows) - currentRows);
  if (rowsToAdd === 0) {
    return [...lines];
  }

  const blankRows = Array.from(
    { length: rowsToAdd },
    () => " ".repeat(Math.max(0, width)),
  );
  return [
    ...lines.slice(0, bottomBorderIndex),
    ...blankRows,
    ...lines.slice(bottomBorderIndex),
  ];
}

function addBorderLabel(
  line: string,
  label: string | undefined,
  width: number,
  borderColor: (text: string) => string,
): string {
  const fitted = fitLine(line, width);
  if (!label) {
    return fitted;
  }

  const suffix = `${borderColor(" ")}${label}${borderColor(" ─")}`;
  const suffixWidth = visibleWidth(suffix);
  if (suffixWidth > width) {
    return fitted;
  }

  const prefixWidth = width - suffixWidth;
  return `${truncateToWidth(fitted, prefixWidth, "")}${suffix}`;
}

export function frameEditorLines(
  lines: readonly string[],
  outerWidth: number,
  borderColor: (text: string) => string,
  labels: PromptBorderLabels = {},
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
    const fitted = index === 0
      ? addBorderLabel(line, labels.top, innerWidth, borderColor)
      : index === bottomBorderIndex
        ? addBorderLabel(line, labels.bottom, innerWidth, borderColor)
        : fitLine(line, innerWidth);

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
  getLabels: BorderLabelProvider = () => ({}),
  minimumPromptRows = MIN_PROMPT_ROWS,
): EditorComponent {
  if (DECORATED_EDITORS.has(editor)) {
    return editor;
  }

  const originalRender = editor.render.bind(editor);
  editor.render = (width: number): string[] => {
    if (width < 3) {
      return originalRender(width);
    }

    const originalBorderColor = editor.borderColor;
    let lines: string[];
    try {
      editor.borderColor = whiteBorder;
      lines = originalRender(width - 2);
    } finally {
      editor.borderColor = originalBorderColor;
    }

    return frameEditorLines(
      ensureMinimumPromptRows(lines, width - 2, minimumPromptRows),
      width,
      whiteBorder,
      getLabels(width - 2),
    );
  };

  DECORATED_EDITORS.add(editor);
  return editor;
}

export function createRoundedEditorFactory(
  previous: EditorFactory | undefined,
  getLabels: BorderLabelProvider = () => ({}),
  minimumPromptRows = MIN_PROMPT_ROWS,
  onEditorReady?: EditorReadyHandler,
): EditorFactory {
  const factory: EditorFactory = (tui, theme, keybindings) => {
    const editor = previous
      ? previous(tui, theme, keybindings)
      : new CustomEditor(tui, theme, keybindings);
    const decorated = decorateEditorRender(
      editor,
      theme.borderColor,
      getLabels,
      minimumPromptRows,
    );
    onEditorReady?.(decorated);
    return decorated;
  };

  ROUNDED_FACTORIES.add(factory);
  return factory;
}

export function installRoundedEditor(
  ctx: ExtensionContext,
  getLabels: BorderLabelProvider = () => ({}),
  minimumPromptRows = MIN_PROMPT_ROWS,
  onEditorReady?: EditorReadyHandler,
): void {
  const previous = ctx.ui.getEditorComponent();
  if (previous && ROUNDED_FACTORIES.has(previous)) {
    return;
  }

  ctx.ui.setEditorComponent(createRoundedEditorFactory(
    previous,
    getLabels,
    minimumPromptRows,
    onEditorReady,
  ));
}
