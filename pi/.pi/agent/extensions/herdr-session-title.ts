/** Publishes Pi's session title as display-only Herdr pane metadata. */
import path from "node:path";
import net from "node:net";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const socketPath = process.env.HERDR_SOCKET_PATH;
const socketEndpoint =
  process.platform === "win32" && socketPath ? `\\\\.\\pipe\\${socketPath}` : socketPath;
const paneId = process.env.HERDR_PANE_ID;
const source = "user:pi-session-title";
const lifecycleSource = "herdr:pi";
const tokenName = "session_title";

let reportSeq = Date.now() * 1000;

function nextReportSeq(): number {
  reportSeq += 1;
  return reportSeq;
}

function normalizeTitle(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized || undefined;
}

function fallbackTitle(cwd: string): string {
  return normalizeTitle(path.basename(cwd)) ?? "pi";
}

function buildTitleMetadataParams(
  title: string | undefined,
  cwd: string,
  seq: number,
) {
  const normalizedTitle = normalizeTitle(title);
  return {
    pane_id: paneId,
    source,
    agent: "pi",
    applies_to_source: lifecycleSource,
    ...(normalizedTitle ? { title: normalizedTitle } : { clear_title: true }),
    tokens: {
      [tokenName]: normalizedTitle ?? fallbackTitle(cwd),
    },
    seq,
  };
}

function buildClearMetadataParams(seq: number) {
  return {
    pane_id: paneId,
    source,
    agent: "pi",
    applies_to_source: lifecycleSource,
    clear_title: true,
    tokens: {
      [tokenName]: null,
    },
    seq,
  };
}

function enabled(): boolean {
  return process.env.HERDR_ENV === "1" && !!socketEndpoint && !!paneId;
}

function sendRequestAttempt(request: unknown, timeoutMs: number): Promise<boolean> {
  if (!enabled()) return Promise.resolve(true);

  return new Promise((resolve) => {
    let done = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const socket = net.createConnection(socketEndpoint!);

    const finish = (delivered: boolean) => {
      if (done) return;
      done = true;
      if (timeout) clearTimeout(timeout);
      socket.destroy();
      resolve(delivered);
    };

    socket.on("error", () => finish(false));
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", () => finish(true));
    socket.on("end", () => finish(false));
    timeout = setTimeout(() => finish(false), timeoutMs);
    timeout.unref?.();
  });
}

async function sendRequest(request: unknown): Promise<void> {
  if (await sendRequestAttempt(request, 500)) return;
  await sendRequestAttempt(request, 1500);
}

function request(params: Record<string, unknown>) {
  return {
    id: `${source}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    method: "pane.report_metadata",
    params,
  };
}

function sessionCwd(ctx: ExtensionContext): string {
  try {
    return ctx.sessionManager.getCwd();
  } catch {
    return process.cwd();
  }
}

export default function extension(pi: ExtensionAPI): void {
  if (!enabled()) return;

  let tuiSessionActive = false;

  const publish = (ctx: ExtensionContext, title = pi.getSessionName()) =>
    sendRequest(request(buildTitleMetadataParams(title, sessionCwd(ctx), nextReportSeq())));

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    tuiSessionActive = true;
    await publish(ctx);
  });

  pi.on("session_info_changed", async (event, ctx) => {
    if (!tuiSessionActive) return;
    await publish(ctx, event.name);
  });

  pi.on("agent_start", async (_event, ctx) => {
    if (!tuiSessionActive) return;
    await publish(ctx);
  });

  pi.on("session_shutdown", async () => {
    if (!tuiSessionActive) return;
    tuiSessionActive = false;
    await sendRequest(request(buildClearMetadataParams(nextReportSeq())));
  });
}
