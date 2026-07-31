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
import piRenderExtension from "../src/index.js";
import { registerToolOverrides } from "../src/register-tools.js";

test("registers exactly the active supported public built-ins", () => {
  const registered: ToolDefinition[] = [];
  const pi = {
    registerTool(definition: ToolDefinition) {
      registered.push(definition);
    },
  } as ExtensionAPI;

  registerToolOverrides(
    pi,
    process.cwd(),
    new Set(),
    new Set(["bash", "read", "write", "grep", "find", "ls"]),
  );

  assert.deepEqual(
    registered.map((definition) => definition.name),
    ["bash", "read", "write", "grep", "find", "ls"],
  );
  assert.ok(registered.every((definition) => definition.renderShell === "self"));
  assert.ok(registered.every((definition) => typeof definition.execute === "function"));
  assert.ok(!registered.some((definition) => definition.name === "edit"));
});

test("does not register inactive optional built-ins", () => {
  const registered: ToolDefinition[] = [];
  const pi = {
    registerTool(definition: ToolDefinition) {
      registered.push(definition);
    },
  } as ExtensionAPI;

  registerToolOverrides(
    pi,
    process.cwd(),
    new Set(),
    new Set(["read", "bash", "edit", "write"]),
  );

  assert.deepEqual(
    registered.map((definition) => definition.name),
    ["bash", "read", "write"],
  );
});

test("waits for session_start before reading and overriding active tools", () => {
  const registered: ToolDefinition[] = [];
  let sessionStart:
    | ((event: SessionStartEvent, ctx: ExtensionContext) => void)
    | undefined;
  let activeToolReads = 0;
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
      return ["read", "bash", "edit", "write"];
    },
    on(
      event: string,
      handler: (event: SessionStartEvent, ctx: ExtensionContext) => void,
    ) {
      if (event === "session_start") {
        sessionStart = handler;
      }
    },
    registerTool(definition: ToolDefinition) {
      registered.push(definition);
    },
  } as ExtensionAPI;

  piRenderExtension(pi);

  assert.equal(activeToolReads, 0);
  assert.equal(registered.length, 0);

  assert.ok(sessionStart);
  sessionStart(
    { type: "session_start", reason: "startup" },
    extensionContext,
  );

  assert.equal(activeToolReads, 1);
  assert.deepEqual(
    registered.map((definition) => definition.name),
    ["bash", "read", "write"],
  );
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
