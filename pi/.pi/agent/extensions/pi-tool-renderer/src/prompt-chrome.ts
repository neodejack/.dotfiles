import { homedir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type {
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from "@earendil-works/pi-coding-agent";
import {
  sliceByColumn,
  truncateToWidth,
  visibleWidth,
  type Component,
  type TUI,
} from "@earendil-works/pi-tui";
import type { PromptBorderLabels } from "./rounded-editor.js";

export interface PromptChromeState {
  context?: ExtensionContext;
  footerData?: ReadonlyFooterDataProvider;
  requestRender?: () => void;
}

const MIN_BORDER_RUN = 6;

export function createPromptChromeState(): PromptChromeState {
  return {};
}

export function updatePromptChromeContext(
  state: PromptChromeState,
  ctx: ExtensionContext,
): void {
  state.context = ctx;
  state.requestRender?.();
}

export function getCurrentContextTokens(ctx: ExtensionContext): number | null {
  return ctx.getContextUsage()?.tokens ?? null;
}

export function formatTokens(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 10_000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  if (count < 1_000_000) {
    return `${Math.round(count / 1000)}k`;
  }
  if (count < 10_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  return `${Math.round(count / 1_000_000)}M`;
}

export function formatCwd(cwd: string, home = homedir()): string {
  if (!home) {
    return cwd;
  }

  const resolvedCwd = resolve(cwd);
  const resolvedHome = resolve(home);
  const relativeToHome = relative(resolvedHome, resolvedCwd);
  const insideHome =
    relativeToHome === ""
    || (
      relativeToHome !== ".."
      && !relativeToHome.startsWith(`..${sep}`)
      && !isAbsolute(relativeToHome)
    );

  if (!insideHome) {
    return cwd;
  }
  return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}

export function truncateLeftToWidth(text: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  if (visibleWidth(text) <= width) {
    return text;
  }
  if (width <= 3) {
    return ".".repeat(width);
  }

  const tailWidth = width - 3;
  const totalWidth = visibleWidth(text);
  return `...${sliceByColumn(text, totalWidth - tailWidth, tailWidth)}`;
}

function chooseFirstFitting(
  candidates: readonly string[],
  width: number,
): string | undefined {
  return candidates.find((candidate) => visibleWidth(candidate) <= width);
}

function buildTopLabel(
  ctx: ExtensionContext,
  availableWidth: number,
  theme: Theme,
): string | undefined {
  const contextTokens = getCurrentContextTokens(ctx);
  const tokens = contextTokens === null
    ? "? tok"
    : `${formatTokens(contextTokens)} tok`;
  const model = ctx.model?.id ?? "no-model";
  const effort = ctx.thinkingLevel ?? "off";
  const coloredEffort = theme.fg("success", effort);
  const modelAndEffort = `${model} ${theme.fg("dim", "•")} ${coloredEffort}`;
  const separator = theme.fg("text", " ─ ");
  return chooseFirstFitting([
    `${tokens}${separator}${modelAndEffort}`,
    `${tokens}${separator}${coloredEffort}`,
    tokens,
  ], availableWidth);
}

function buildBottomLabel(
  ctx: ExtensionContext,
  footerData: ReadonlyFooterDataProvider | undefined,
  availableWidth: number,
  theme: Theme,
): string | undefined {
  if (availableWidth <= 0) {
    return undefined;
  }

  const branch = footerData?.getGitBranch();
  const cwd = formatCwd(ctx.sessionManager.getCwd());
  const value = branch ? `${cwd} (${branch})` : cwd;
  return theme.fg("text", truncateLeftToWidth(value, availableWidth));
}

export function buildPromptBorderLabels(
  state: PromptChromeState,
  innerWidth: number,
): PromptBorderLabels {
  const ctx = state.context;
  if (!ctx) {
    return {};
  }

  const availableWidth = Math.max(0, innerWidth - MIN_BORDER_RUN - 2);
  if (availableWidth < 4) {
    return {};
  }

  return {
    top: buildTopLabel(ctx, availableWidth, ctx.ui.theme),
    bottom: buildBottomLabel(
      ctx,
      state.footerData,
      availableWidth,
      ctx.ui.theme,
    ),
  };
}

function sanitizeStatusText(text: string): string {
  return text
    .replace(/[\r\n\t]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

export class StatusOnlyFooter implements Component {
  private readonly unsubscribeBranch: () => void;

  constructor(
    private readonly state: PromptChromeState,
    private readonly footerData: ReadonlyFooterDataProvider,
    private readonly theme: Theme,
    tui: TUI,
  ) {
    state.footerData = footerData;
    state.requestRender = () => tui.requestRender();
    this.unsubscribeBranch = footerData.onBranchChange(() => tui.requestRender());
  }

  invalidate(): void {}

  render(width: number): string[] {
    const statuses = Array.from(this.footerData.getExtensionStatuses().entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, text]) => sanitizeStatusText(text));

    if (statuses.length === 0) {
      return [];
    }

    return [
      truncateToWidth(
        statuses.join(" "),
        width,
        this.theme.fg("dim", "..."),
      ),
    ];
  }

  dispose(): void {
    this.unsubscribeBranch();
    if (this.state.footerData === this.footerData) {
      this.state.footerData = undefined;
      this.state.requestRender = undefined;
    }
  }
}

export function installStatusOnlyFooter(
  ctx: ExtensionContext,
  state: PromptChromeState,
): void {
  ctx.ui.setFooter((tui, theme, footerData) =>
    new StatusOnlyFooter(state, footerData, theme, tui));
}
