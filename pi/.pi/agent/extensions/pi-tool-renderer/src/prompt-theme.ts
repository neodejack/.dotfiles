import type {
  ExtensionContext,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";

type ThemeBg = Parameters<Theme["bg"]>[0];

const AMP_PROMPT_THEME = Symbol("pi-tool-renderer.amp-prompt-theme");
const GREEN_FOREGROUND = "\u001b[38;5;2m";
const DEFAULT_BACKGROUND = "\u001b[49m";
const RESET_FOREGROUND = "\u001b[39m";
const RESET_BACKGROUND = "\u001b[49m";

type MarkedTheme = Theme & {
  [AMP_PROMPT_THEME]?: true;
};

export function isAmpPromptTheme(theme: Theme): boolean {
  return (theme as MarkedTheme)[AMP_PROMPT_THEME] === true;
}

export function createAmpPromptTheme(base: Theme): Theme {
  return new Proxy(base, {
    get(target, property) {
      if (property === AMP_PROMPT_THEME) {
        return true;
      }

      if (property === "fg") {
        return (color: ThemeColor, text: string): string => {
          if (color === "userMessageText") {
            return `${GREEN_FOREGROUND}${text}${RESET_FOREGROUND}`;
          }
          return target.fg(color, text);
        };
      }

      if (property === "bg") {
        return (color: ThemeBg, text: string): string => {
          if (color === "userMessageBg") {
            return `${DEFAULT_BACKGROUND}${text}${RESET_BACKGROUND}`;
          }
          return target.bg(color, text);
        };
      }

      if (property === "getFgAnsi") {
        return (color: ThemeColor): string =>
          color === "userMessageText"
            ? GREEN_FOREGROUND
            : target.getFgAnsi(color);
      }

      if (property === "getBgAnsi") {
        return (color: ThemeBg): string =>
          color === "userMessageBg"
            ? DEFAULT_BACKGROUND
            : target.getBgAnsi(color);
      }

      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function ensureAmpPromptTheme(ctx: ExtensionContext): void {
  const current = ctx.ui.theme;
  if (isAmpPromptTheme(current)) {
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

  ctx.ui.setTheme(createAmpPromptTheme(base));
}
