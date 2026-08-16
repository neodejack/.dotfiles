import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionStartEvent,
  Theme,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Container, Text, type Component } from "@earendil-works/pi-tui";
import piRenderExtension from "../src/index.js";
import {
  installToolRendererInterceptor,
  styleToolExecution,
} from "../src/tool-interceptor.js";
import type { TimerRegistry } from "../src/tool-renderer.js";

function fakeDefinition(name = "web_search"): ToolDefinition<any, any, any> {
  return {
    name,
    label: "Web Search",
    description: "Search the web",
    parameters: {} as never,
    async execute() {
      return {
        content: [{ type: "text" as const, text: "native execution" }],
        details: {},
      };
    },
    renderCall(_args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("search web")), 0, 0);
    },
    renderResult(_result, _options, theme) {
      return new Text(theme.fg("toolOutput", "native result"), 0, 0);
    },
  };
}

interface FakeExecution extends Component {
  toolName: string;
  toolDefinition: ToolDefinition<any, any, any>;
  callRendererComponent?: Component;
  resultRendererComponent?: Component;
  updateCalls: number;
  updateDisplay(): void;
}

function fakeExecution(
  definition = fakeDefinition(),
): FakeExecution {
  return {
    toolName: definition.name,
    toolDefinition: definition,
    updateCalls: 0,
    updateDisplay() {
      this.updateCalls += 1;
    },
    render() {
      return [];
    },
    invalidate() {},
  };
}

test("styles the actual definition attached to an injected tool execution", () => {
  const original = fakeDefinition();
  const component = fakeExecution(original);
  const timers: TimerRegistry = new Set();

  assert.equal(styleToolExecution(component, timers), true);
  assert.notEqual(component.toolDefinition, original);
  assert.equal(component.toolDefinition.execute, original.execute);
  assert.equal(component.toolDefinition.parameters, original.parameters);
  assert.equal(component.toolDefinition.renderShell, "self");
  assert.equal(component.updateCalls, 1);
  assert.equal(styleToolExecution(component, timers), false);
  assert.equal(component.updateCalls, 1);
});

test("container interception covers future injected tool components", () => {
  const timers: TimerRegistry = new Set();
  installToolRendererInterceptor(timers);
  const parent = new Container();
  const component = fakeExecution();

  parent.addChild(component);

  assert.equal(component.toolDefinition.renderShell, "self");
  assert.equal(component.updateCalls, 1);
});

test("extension does not re-register or execute tools", () => {
  let sessionStart:
    | ((event: SessionStartEvent, ctx: ExtensionContext) => void)
    | undefined;
  let registrations = 0;
  let activeToolReads = 0;
  let workingIndicator: Parameters<
    ExtensionContext["ui"]["setWorkingIndicator"]
  >[0];
  let workingMessage: string | undefined;
  const registeredShortcuts: string[] = [];
  const baseTheme = {
    name: "dark",
    fg: (_color: string, text: string) => text,
    bg: (_color: string, text: string) => text,
    getFgAnsi: () => "",
    getBgAnsi: () => "",
  } as unknown as Theme;
  let editorFactory: ReturnType<
    ExtensionContext["ui"]["getEditorComponent"]
  >;
  const extensionContext = {
    ui: {
      theme: baseTheme,
      getTheme() {
        return baseTheme;
      },
      setTheme() {
        return { success: true };
      },
      setFooter() {},
      setWorkingIndicator(options: typeof workingIndicator) {
        workingIndicator = options;
      },
      setWorkingMessage(message?: string) {
        workingMessage = message;
      },
      getEditorComponent() {
        return editorFactory;
      },
      setEditorComponent(factory: typeof editorFactory) {
        editorFactory = factory;
      },
    },
  } as unknown as ExtensionContext;
  const pi = {
    getActiveTools() {
      activeToolReads += 1;
      return ["read", "bash", "edit", "web_search"];
    },
    on(
      event: string,
      handler: (event: SessionStartEvent, ctx: ExtensionContext) => void,
    ) {
      if (event === "session_start") {
        sessionStart = handler;
      }
    },
    registerTool() {
      registrations += 1;
    },
    registerShortcut(shortcut: string) {
      registeredShortcuts.push(shortcut);
    },
  } as unknown as ExtensionAPI;

  piRenderExtension(pi);
  assert.ok(sessionStart);
  sessionStart(
    { type: "session_start", reason: "startup" },
    extensionContext,
  );

  assert.equal(activeToolReads, 0);
  assert.equal(registrations, 0);
  assert.deepEqual(registeredShortcuts, ["ctrl+o"]);
  assert.equal(workingIndicator?.intervalMs, 50);
  assert.match(
    workingIndicator?.frames?.[0] ?? "",
    /^\u001b\[38;2;240;233;224m▁/,
  );
  assert.equal(workingMessage, "");
});

test("source imports stay on public package entry points", async () => {
  const sourceDirectory = path.resolve("src");
  const sourceFiles = (await readdir(sourceDirectory))
    .filter((file) => file.endsWith(".ts"));

  for (const sourceFile of sourceFiles) {
    const contents = await readFile(path.join(sourceDirectory, sourceFile), "utf8");
    assert.doesNotMatch(
      contents,
      /@earendil-works\/(?:pi-coding-agent|pi-tui)\/(?:dist|src)\//,
      `${sourceFile} imports a package-internal path`,
    );
  }
});
