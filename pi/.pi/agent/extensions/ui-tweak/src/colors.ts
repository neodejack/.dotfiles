export const ACTIVE_INDICATOR_HEX = "#F0E9E0";

const ACTIVE_INDICATOR_ANSI = "\u001b[38;2;240;233;224m";
const RESET_FOREGROUND_ANSI = "\u001b[39m";

export function activeIndicatorColor(text: string): string {
  return `${ACTIVE_INDICATOR_ANSI}${text}${RESET_FOREGROUND_ANSI}`;
}
