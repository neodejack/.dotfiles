import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { dispose } from "./lib/session-store";
import { findSessionsTool } from "./tools/find-sessions";
import { listSessionsTool } from "./tools/list-sessions";

export default function harnessTools(pi: ExtensionAPI): void {
  pi.registerTool(findSessionsTool);
  pi.registerTool(listSessionsTool);

  pi.on("session_shutdown", () => {
    dispose();
  });
}
