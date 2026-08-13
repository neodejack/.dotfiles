import type {
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";

type ThemeBg = Parameters<Theme["bg"]>[0];

const TOOL_RENDERER_THEME = Symbol("ui-tweak.tool-renderer-theme");
const DEFAULT_BACKGROUND = "\u001b[49m";
const RESET_BACKGROUND = "\u001b[49m";
const TRANSPARENT_TOOL_BACKGROUNDS = new Set<ThemeBg>([
  "toolPendingBg",
  "toolSuccessBg",
  "toolErrorBg",
]);

type MarkedTheme = Theme & {
  [TOOL_RENDERER_THEME]?: true;
};

export function isToolRendererTheme(theme: Theme): boolean {
  return (theme as MarkedTheme)[TOOL_RENDERER_THEME] === true;
}

export function createToolRendererTheme(base: Theme): Theme {
  return new Proxy(base, {
    get(target, property) {
      if (property === TOOL_RENDERER_THEME) {
        return true;
      }

      if (property === "bg") {
        return (color: ThemeBg, text: string): string => {
          if (TRANSPARENT_TOOL_BACKGROUNDS.has(color)) {
            return `${DEFAULT_BACKGROUND}${text}${RESET_BACKGROUND}`;
          }
          return target.bg(color, text);
        };
      }

      if (property === "getBgAnsi") {
        return (color: ThemeBg): string =>
          TRANSPARENT_TOOL_BACKGROUNDS.has(color)
            ? DEFAULT_BACKGROUND
            : target.getBgAnsi(color);
      }

      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function ensureToolRendererTheme(ctx: ExtensionContext): void {
  const current = ctx.ui.theme;
  if (isToolRendererTheme(current)) {
    return;
  }

  const currentName = current.name;
  if (!currentName) {
    return;
  }

  const base = ctx.ui.getTheme(currentName);
  if (!base) {
    return;
  }

  ctx.ui.setTheme(createToolRendererTheme(base));
}
